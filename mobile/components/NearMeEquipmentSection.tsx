import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { resolveImageUrl } from "../lib/image-url";
import type { Listing } from "../lib/types";

const LOCATION_KEY = "user_location";
const DENIED_KEY = "user_location_denied";
const RADIUS_OPTIONS = [5, 10, 25, 50];
const INITIAL_RADIUS = 10;

type State =
  | { phase: "prompt" }
  | { phase: "loading" }
  | { phase: "results"; listings: Listing[]; radius: number; lat: number; lng: number }
  | { phase: "empty"; lat: number; lng: number }
  | { phase: "denied" };

function priceText(price: number | null): string {
  if (!price) return "";
  return `฿${price.toLocaleString("th-TH")}`;
}

function EquipmentNearCard({ item }: { item: Listing }) {
  const cover = (item.listing_images ?? []).slice().sort((a, b) => a.display_order - b.display_order)[0];
  const imageUrl = cover ? resolveImageUrl(cover.storage_path) : null;
  const [imgError, setImgError] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const condition = (item as any).condition as string | null;
  const isNew = condition === "new";

  return (
    <Pressable style={s.card} onPress={() => router.push(`/listing/${item.slug}`)}>
      <View style={s.cardImgWrap}>
        {imageUrl && !imgError ? (
          <Image source={{ uri: imageUrl }} style={s.cardImg} onError={() => setImgError(true)} />
        ) : (
          <View style={[s.cardImg, s.cardImgPlaceholder]}>
            <Text style={{ fontSize: 24 }}>🛒</Text>
          </View>
        )}
        <View style={s.cardBadge}>
          <Text style={[s.cardBadgeText, { color: isNew ? "#15803d" : "#1d4ed8" }]}>
            {isNew ? "มือ 1" : "มือ 2"}
          </Text>
        </View>
      </View>
      <View style={s.cardBody}>
        <Text style={s.cardPrice}>{priceText(item.sale_price)}</Text>
        <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
        {(item.district || item.provinces) && (
          <View style={s.cardLoc}>
            <Ionicons name="location-outline" size={11} color="#9ca3af" />
            <Text style={s.cardLocText} numberOfLines={1}>
              {[item.district, item.provinces?.name_th].filter(Boolean).join(", ")}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const SELECT = `id, slug, title, listing_type, sale_price, condition, district, published_at,
  listing_images(id, storage_path, display_order),
  provinces(name_th, slug)`;

export function NearMeEquipmentSection() {
  const [state, setState] = useState<State>({ phase: "prompt" });
  const [refreshing, setRefreshing] = useState(false);
  const [promptRadius, setPromptRadius] = useState(INITIAL_RADIUS);

  useEffect(() => { checkCachedLocation(); }, []);

  async function checkCachedLocation() {
    const denied = await AsyncStorage.getItem(DENIED_KEY);
    if (denied) { setState({ phase: "denied" }); return; }
    const cached = await AsyncStorage.getItem(LOCATION_KEY);
    if (cached) {
      const { lat, lng } = JSON.parse(cached);
      await fetchNearby(lat, lng, INITIAL_RADIUS);
    }
  }

  async function requestLocation(radius = promptRadius) {
    setState({ phase: "loading" });
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        await AsyncStorage.setItem(DENIED_KEY, "1");
        setState({ phase: "denied" }); return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = loc.coords;
      await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify({ lat, lng }));
      await fetchNearby(lat, lng, radius);
    } catch { setState({ phase: "denied" }); }
  }

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setState({ phase: "denied" }); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude: lat, longitude: lng } = loc.coords;
      await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify({ lat, lng }));
      const cur = state;
      await fetchNearby(lat, lng, cur.phase === "results" ? cur.radius : INITIAL_RADIUS);
    } catch { setState({ phase: "denied" }); }
    finally { setRefreshing(false); }
  }

  async function fetchNearby(lat: number, lng: number, radius: number) {
    setState({ phase: "loading" });
    const timeout = <T,>(ms: number): Promise<T> =>
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));

    try {
      // 1. GPS RPC
      const rpcResult = await Promise.race([
        supabase.rpc("listings_within_distance", { center_lat: lat, center_lng: lng, radius_km: radius }),
        timeout<never>(10_000),
      ]);
      const { data: nearby } = rpcResult as { data: unknown; error: unknown };

      if (nearby && (nearby as { id: string }[]).length > 0) {
        const ids = (nearby as { id: string }[]).slice(0, 12).map((r) => r.id);
        const { data } = await Promise.race([
          supabase.from("listings").select(SELECT)
            .in("id", ids).eq("listing_type", "equipment").eq("status", "published"),
          timeout<never>(10_000),
        ]);
        if (data && data.length > 0) {
          const idOrder = new Map(ids.map((id, i) => [id, i]));
          const sorted = [...(data as unknown as Listing[])].sort((a, b) => (idOrder.get(a.id) ?? 99) - (idOrder.get(b.id) ?? 99));
          setState({ phase: "results", listings: sorted.slice(0, 8), radius, lat, lng });
          return;
        }
      }

      // 2. Fallback: reverse geocode → province
      let provinceId: number | null = null;
      try {
        const [geo] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        const regionName = geo?.region ?? geo?.city ?? null;
        if (regionName) {
          const { data: prov } = await supabase.from("provinces").select("id").ilike("name_th", `%${regionName}%`).limit(1);
          provinceId = (prov as { id: number }[] | null)?.[0]?.id ?? null;
        }
      } catch { /* silent */ }

      if (provinceId) {
        const { data } = await Promise.race([
          supabase.from("listings").select(SELECT)
            .eq("province_id", provinceId).eq("status", "published").eq("listing_type", "equipment")
            .order("published_at", { ascending: false }).limit(8),
          timeout<never>(10_000),
        ]);
        if (data && data.length > 0) {
          setState({ phase: "results", listings: data as unknown as Listing[], radius, lat, lng });
          return;
        }
      }

      setState({ phase: "empty", lat, lng });
    } catch { setState({ phase: "empty", lat, lng }); }
  }

  async function clearDenied() {
    await AsyncStorage.removeItem(DENIED_KEY);
    await AsyncStorage.removeItem(LOCATION_KEY);
    setState({ phase: "prompt" });
  }

  return (
    <View style={s.section}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Ionicons name="location" size={16} color="#f97316" />
          <Text style={s.headerTitle}>อุปกรณ์ใกล้เคียง</Text>
        </View>
        {(state.phase === "results" || state.phase === "empty") && (
          <Pressable style={s.refreshBtn} onPress={handleRefresh} disabled={refreshing}>
            {refreshing
              ? <ActivityIndicator size="small" color="#f97316" style={{ width: 16, height: 16 }} />
              : <Ionicons name="locate-outline" size={16} color="#f97316" />}
          </Pressable>
        )}
      </View>

      {(state.phase === "results" || state.phase === "empty") && (
        <View style={s.radiusRow}>
          <Text style={s.radiusLabel}>ระยะ:</Text>
          {RADIUS_OPTIONS.map((r) => {
            const active = state.phase === "results" && state.radius === r;
            const { lat, lng } = state as { lat: number; lng: number };
            return (
              <Pressable key={r} style={[s.radiusPill, active && s.radiusPillActive]} onPress={() => fetchNearby(lat, lng, r)}>
                <Text style={[s.radiusPillText, active && s.radiusPillTextActive]}>{r} กม.</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {state.phase === "prompt" && (
        <View style={s.promptCard}>
          <View style={s.promptTop}>
            <View style={s.promptIcon}><Ionicons name="navigate" size={18} color="#f97316" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.promptTitle}>ค้นหาอุปกรณ์ใกล้คุณ</Text>
              <Text style={s.promptSub}>เลือกรัศมีที่ต้องการ</Text>
            </View>
          </View>
          <View style={s.promptRadiusPills}>
            {RADIUS_OPTIONS.map((r) => (
              <Pressable key={r} style={[s.radiusPill, promptRadius === r && s.radiusPillActive]} onPress={() => setPromptRadius(r)}>
                <Text style={[s.radiusPillText, promptRadius === r && s.radiusPillTextActive]}>{r} กม.</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={s.promptBtn} onPress={() => requestLocation(promptRadius)}>
            <Ionicons name="locate" size={15} color="#fff" />
            <Text style={s.promptBtnText}>ค้นหาอุปกรณ์ใกล้คุณ</Text>
          </Pressable>
        </View>
      )}

      {state.phase === "loading" && (
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#f97316" />
          <Text style={s.loadingText}>กำลังหาอุปกรณ์ใกล้คุณ...</Text>
        </View>
      )}

      {state.phase === "results" && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.scroll}>
          {state.listings.map((item) => <EquipmentNearCard key={item.id} item={item} />)}
        </ScrollView>
      )}

      {state.phase === "empty" && (
        <View style={s.emptyWrap}>
          <Text style={s.emptyText}>ไม่พบอุปกรณ์ในรัศมีที่เลือก ลองเพิ่มระยะด้านบน</Text>
        </View>
      )}

      {state.phase === "denied" && (
        <Pressable style={s.deniedWrap} onPress={clearDenied}>
          <Ionicons name="location-outline" size={20} color="#9ca3af" />
          <Text style={s.deniedText}>เปิดใช้ตำแหน่งอีกครั้ง</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  section: { marginTop: 8, marginBottom: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 10 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  refreshBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#fff7ed", borderWidth: 1, borderColor: "#fed7aa", alignItems: "center", justifyContent: "center" },

  radiusRow: { flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap", paddingHorizontal: 16, marginBottom: 10 },
  radiusLabel: { fontSize: 12, color: "#9ca3af", fontWeight: "500" },
  radiusPill: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb" },
  radiusPillActive: { backgroundColor: "#f97316", borderColor: "#f97316" },
  radiusPillText: { fontSize: 11, color: "#6b7280", fontWeight: "500" },
  radiusPillTextActive: { color: "#fff", fontWeight: "700", fontSize: 11 },

  promptCard: { marginHorizontal: 16, padding: 14, gap: 12, backgroundColor: "#fff7ed", borderRadius: 14, borderWidth: 1, borderColor: "#fed7aa" },
  promptTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  promptIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#ffedd5", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  promptTitle: { fontSize: 14, fontWeight: "700", color: "#c2410c" },
  promptSub: { fontSize: 12, color: "#9ca3af", marginTop: 1 },
  promptRadiusPills: { flexDirection: "row", gap: 7 },
  promptBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#f97316", borderRadius: 10, paddingVertical: 11 },
  promptBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  loadingWrap: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  loadingText: { fontSize: 14, color: "#9ca3af" },

  scroll: { paddingLeft: 16, paddingRight: 8, gap: 10, paddingBottom: 4 },

  card: { width: 160, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb", overflow: "hidden" },
  cardImgWrap: { position: "relative" },
  cardImg: { width: "100%", aspectRatio: 4 / 3, resizeMode: "cover" },
  cardImgPlaceholder: { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  cardBadge: { position: "absolute", bottom: 6, left: 6, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  cardBadgeText: { fontSize: 10, fontWeight: "700" },
  cardBody: { padding: 10, gap: 3 },
  cardPrice: { fontSize: 14, fontWeight: "700", color: "#f97316" },
  cardTitle: { fontSize: 12, fontWeight: "500", color: "#374151", lineHeight: 17 },
  cardLoc: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  cardLocText: { fontSize: 11, color: "#9ca3af", flex: 1 },

  emptyWrap: { paddingHorizontal: 16 },
  emptyText: { fontSize: 13, color: "#9ca3af" },

  deniedWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, padding: 12, backgroundColor: "#f9fafb", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb" },
  deniedText: { fontSize: 13, color: "#6b7280" },
});
