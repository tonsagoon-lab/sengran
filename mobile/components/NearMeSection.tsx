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
const EXPANDED_RADIUS = 50;
const MOVE_THRESHOLD_M = 500; // re-fetch ถ้าขยับเกิน 500 เมตร

type State =
  | { phase: "prompt" }
  | { phase: "loading" }
  | { phase: "results"; listings: Listing[]; radius: number; lat: number; lng: number }
  | { phase: "empty"; lat: number; lng: number }
  | { phase: "denied" };

function priceText(item: Listing): string {
  const price =
    item.listing_type === "sale" ? item.sale_price
    : item.listing_type === "rent" ? item.rent_price
    : item.sale_price ?? item.rent_price;
  if (!price) return "";
  if (price >= 1_000_000) return `฿${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `฿${Math.round(price / 1000)}K`;
  return `฿${price.toLocaleString("th-TH")}`;
}

function NearCard({ item }: { item: Listing }) {
  const cover = (item.listing_images ?? []).slice().sort((a, b) => a.display_order - b.display_order)[0];
  const imageUrl = cover ? resolveImageUrl(cover.storage_path) : null;
  const [imgError, setImgError] = useState(false);

  return (
    <Pressable style={styles.card} onPress={() => router.push(`/listing/${item.slug}`)}>
      {imageUrl && !imgError ? (
        <Image source={{ uri: imageUrl }} style={styles.cardImg} onError={() => setImgError(true)} />
      ) : (
        <View style={[styles.cardImg, styles.cardImgPlaceholder]}>
          <Text style={{ fontSize: 24 }}>🏪</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardPrice}>{priceText(item)}</Text>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        {(item.district || item.provinces) && (
          <View style={styles.cardLoc}>
            <Ionicons name="location-outline" size={11} color="#9ca3af" />
            <Text style={styles.cardLocText} numberOfLines={1}>
              {[item.district, item.provinces?.name_th].filter(Boolean).join(", ")}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export function NearMeSection() {
  const [state, setState] = useState<State>({ phase: "prompt" });
  const [refreshing, setRefreshing] = useState(false);
  const [promptRadius, setPromptRadius] = useState(INITIAL_RADIUS);

  useEffect(() => {
    checkCachedLocation();
  }, []);

  // ── เช็ค cache แล้ว silently อัปเดตถ้าขยับ ──────────────
  async function checkCachedLocation() {
    const denied = await AsyncStorage.getItem(DENIED_KEY);
    if (denied) { setState({ phase: "denied" }); return; }

    const cached = await AsyncStorage.getItem(LOCATION_KEY);
    if (cached) {
      const { lat, lng } = JSON.parse(cached);
      // แสดงผลจาก cache ก่อนทันที
      await fetchNearby(lat, lng, INITIAL_RADIUS);
      // จากนั้น silently ดึง GPS ใหม่ถ้าขยับเกิน threshold
      silentRefresh(lat, lng);
    }
  }

  // ── Silent update — ไม่แสดง loading, อัปเดตเฉพาะถ้าขยับ ──
  async function silentRefresh(oldLat: number, oldLng: number) {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude: lat, longitude: lng } = loc.coords;

      const dLat = (lat - oldLat) * 111_000;
      const dLng = (lng - oldLng) * 111_000 * Math.cos((oldLat * Math.PI) / 180);
      const dist = Math.hypot(dLat, dLng);

      if (dist < MOVE_THRESHOLD_M) return; // ยังอยู่ที่เดิม ไม่ต้องโหลดใหม่

      await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify({ lat, lng }));
      await fetchNearby(lat, lng, INITIAL_RADIUS);
    } catch {
      // ล้มเหลวเงียบๆ — ไม่กระทบ UI
    }
  }

  // ── ปุ่ม refresh ที่ผู้ใช้กด ─────────────────────────────
  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        await AsyncStorage.setItem(DENIED_KEY, "1");
        setState({ phase: "denied" });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude: lat, longitude: lng } = loc.coords;
      await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify({ lat, lng }));
      const cur = state;
      await fetchNearby(lat, lng, cur.phase === "results" ? cur.radius : INITIAL_RADIUS);
    } catch {
      setState({ phase: "denied" });
    } finally {
      setRefreshing(false);
    }
  }

  // ── ขอ GPS ครั้งแรก ───────────────────────────────────────
  async function requestLocation(radius = promptRadius) {
    setState({ phase: "loading" });
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        await AsyncStorage.setItem(DENIED_KEY, "1");
        setState({ phase: "denied" });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude: lat, longitude: lng } = loc.coords;
      await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify({ lat, lng }));
      await fetchNearby(lat, lng, radius);
    } catch {
      setState({ phase: "denied" });
    }
  }

  // ── Query ร้านใกล้เคียง ───────────────────────────────────
  async function fetchNearby(lat: number, lng: number, radius: number) {
    setState({ phase: "loading" });
    console.log("[NearMe] fetchNearby start", { lat, lng, radius });

    const timeout = <T,>(ms: number): Promise<T> =>
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));

    const SELECT = `id, slug, title, listing_type, sale_price, rent_price, district, is_featured, published_at,
      listing_images(id, storage_path, display_order),
      categories(name_th, slug), provinces(name_th, slug)`;

    try {
      // 1. GPS ในระยะที่เลือก
      const rpcResult = await Promise.race([
        supabase.rpc("listings_within_distance", { center_lat: lat, center_lng: lng, radius_km: radius }),
        timeout<never>(10_000),
      ]);
      const { data: nearby, error: rpcError } = rpcResult as { data: unknown; error: unknown };
      console.log("[NearMe] rpc result", { count: (nearby as unknown[])?.length, error: rpcError });

      if (nearby && (nearby as { id: string }[]).length > 0) {
        const ids = (nearby as { id: string; distance_km: number }[]).slice(0, 8).map((r) => r.id);
        const { data } = await Promise.race([
          supabase.from("listings").select(SELECT).in("id", ids),
          timeout<never>(10_000),
        ]);
        if (data && data.length > 0) {
          const idOrder = new Map(ids.map((id, i) => [id, i]));
          const sorted = [...(data as unknown as Listing[])].sort(
            (a, b) => (idOrder.get(a.id) ?? 99) - (idOrder.get(b.id) ?? 99)
          );
          setState({ phase: "results", listings: sorted, radius, lat, lng });
          return;
        }
      }

      // 2. Fallback: หา province ที่ใกล้ที่สุดจากรัศมี 200 กม.
      console.log("[NearMe] fallback: wide 200km search");
      const { data: wideIds } = await Promise.race([
        supabase.rpc("listings_within_distance", { center_lat: lat, center_lng: lng, radius_km: 200 }),
        timeout<never>(10_000),
      ]);
      console.log("[NearMe] wide rpc count:", (wideIds as unknown[])?.length);

      if (wideIds && (wideIds as { id: string }[]).length > 0) {
        const nearestId = (wideIds as { id: string }[])[0].id;
        const { data: nearest } = await supabase
          .from("listings").select("province_id").eq("id", nearestId).single();
        const provinceId = (nearest as { province_id: number } | null)?.province_id ?? null;

        if (provinceId) {
          const { data } = await Promise.race([
            supabase.from("listings").select(SELECT)
              .eq("province_id", provinceId).eq("status", "published")
              .order("published_at", { ascending: false }).limit(8),
            timeout<never>(10_000),
          ]);
          if (data && data.length > 0) {
            setState({ phase: "results", listings: data as unknown as Listing[], radius, lat, lng });
            return;
          }
        }
      }

      // 3. Last resort: listing ล่าสุด
      console.log("[NearMe] fallback: latest listings");
      const { data: latest } = await Promise.race([
        supabase.from("listings").select(SELECT)
          .eq("status", "published")
          .order("published_at", { ascending: false }).limit(8),
        timeout<never>(10_000),
      ]);

      console.log("[NearMe] latest count:", latest?.length);
      if (latest && latest.length > 0) {
        setState({ phase: "results", listings: latest as unknown as Listing[], radius, lat, lng });
        return;
      }

      console.log("[NearMe] all fallbacks empty → showing empty state");
      setState({ phase: "empty", lat, lng });
    } catch (err) {
      console.log("[NearMe] caught error:", err);
      setState({ phase: "empty", lat, lng });
    }
  }

  async function clearDenied() {
    await AsyncStorage.removeItem(DENIED_KEY);
    await AsyncStorage.removeItem(LOCATION_KEY);
    setState({ phase: "prompt" });
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="location" size={16} color="#f97316" />
          <Text style={styles.headerTitle}>ร้านใกล้เคียง</Text>
        </View>

        <View style={styles.headerRight}>
          {(state.phase === "results" || state.phase === "empty") && (
            <Pressable style={styles.refreshBtn} onPress={handleRefresh} disabled={refreshing}>
              {refreshing
                ? <ActivityIndicator size="small" color="#f97316" style={{ width: 16, height: 16 }} />
                : <Ionicons name="locate-outline" size={16} color="#f97316" />
              }
            </Pressable>
          )}
        </View>
      </View>

      {/* Radius row — เหมือนเว็บ แสดงระหว่าง header กับ content */}
      {(state.phase === "results" || state.phase === "empty") && (
        <View style={styles.radiusRow}>
          <Text style={styles.radiusRowLabel}>ระยะ:</Text>
          {RADIUS_OPTIONS.map((r) => {
            const active = state.phase === "results" && state.radius === r;
            const { lat, lng } = state as { lat: number; lng: number };
            return (
              <Pressable
                key={r}
                style={[styles.radiusPill, active && styles.radiusPillActive]}
                onPress={() => fetchNearby(lat, lng, r)}
              >
                <Text style={[styles.radiusPillText, active && styles.radiusPillTextActive]}>
                  {r} กม.
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {state.phase === "prompt" && (
        <View style={styles.promptCard}>
          <View style={styles.promptTop}>
            <View style={styles.promptIcon}>
              <Ionicons name="navigate" size={18} color="#f97316" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.promptTitle}>ค้นหาร้านใกล้คุณ</Text>
              <Text style={styles.promptSub}>เลือกรัศมีที่ต้องการ</Text>
            </View>
          </View>
          <View style={styles.promptRadiusPills}>
            {RADIUS_OPTIONS.map((r) => (
              <Pressable
                key={r}
                style={[styles.radiusPill, promptRadius === r && styles.radiusPillActive]}
                onPress={() => setPromptRadius(r)}
              >
                <Text style={[styles.radiusPillText, promptRadius === r && styles.radiusPillTextActive]}>
                  {r} กม.
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.promptBtn} onPress={() => requestLocation(promptRadius)}>
            <Ionicons name="locate" size={15} color="#fff" />
            <Text style={styles.promptBtnText}>ค้นหาร้านใกล้คุณ</Text>
          </Pressable>
        </View>
      )}

      {state.phase === "loading" && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#f97316" />
          <Text style={styles.loadingText}>กำลังหาร้านใกล้คุณ...</Text>
        </View>
      )}

      {state.phase === "results" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {state.listings.map((item) => (
            <NearCard key={item.id} item={item} />
          ))}
        </ScrollView>
      )}

      {state.phase === "empty" && (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>ไม่พบร้านในรัศมีที่เลือก ลองเพิ่มระยะด้านบน</Text>
          <View style={styles.emptyFooter}>
            <Pressable style={styles.refreshBtnSmall} onPress={handleRefresh} disabled={refreshing}>
              <Ionicons name="locate-outline" size={14} color="#6b7280" />
              <Text style={styles.refreshBtnSmallText}>อัปเดตตำแหน่ง</Text>
            </Pressable>
            <Pressable style={styles.browseLinkBtn} onPress={() => router.push("/(tabs)/browse")}>
              <Text style={styles.browseLinkText}>ดูร้านทั้งหมด →</Text>
            </Pressable>
          </View>
        </View>
      )}

      {state.phase === "denied" && (
        <Pressable style={styles.deniedWrap} onPress={clearDenied}>
          <Ionicons name="location-outline" size={20} color="#9ca3af" />
          <Text style={styles.deniedText}>เปิดใช้ตำแหน่งอีกครั้ง</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 20 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, marginBottom: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  radiusRow: {
    flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap",
    paddingHorizontal: 16, marginBottom: 10,
  },
  radiusRowLabel: { fontSize: 12, color: "#9ca3af", fontWeight: "500" },
  radiusPill: {
    paddingHorizontal: 11, paddingVertical: 5,
    borderRadius: 999, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb",
  },
  radiusPillActive: { backgroundColor: "#f97316", borderColor: "#f97316" },
  radiusPillText: { fontSize: 11, color: "#6b7280", fontWeight: "500" },
  radiusPillTextActive: { color: "#fff", fontWeight: "700", fontSize: 11 },
  refreshBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#fff7ed", borderWidth: 1, borderColor: "#fed7aa",
    alignItems: "center", justifyContent: "center",
  },

  promptCard: {
    marginHorizontal: 16, padding: 14, gap: 12,
    backgroundColor: "#fff7ed", borderRadius: 14,
    borderWidth: 1, borderColor: "#fed7aa",
  },
  promptTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  promptIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#ffedd5", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  promptTitle: { fontSize: 14, fontWeight: "700", color: "#c2410c" },
  promptSub: { fontSize: 12, color: "#9ca3af", marginTop: 1 },
  promptRadiusPills: { flexDirection: "row", gap: 7 },
  promptBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: "#f97316", borderRadius: 10, paddingVertical: 11,
  },
  promptBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  loadingWrap: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  loadingText: { fontSize: 14, color: "#9ca3af" },

  scroll: { paddingLeft: 16, paddingRight: 8, gap: 10, paddingBottom: 4 },

  card: {
    width: 160, backgroundColor: "#fff",
    borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb", overflow: "hidden",
  },
  cardImg: { width: "100%", aspectRatio: 4 / 3, resizeMode: "cover" },
  cardImgPlaceholder: { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  cardBody: { padding: 10, gap: 3 },
  cardPrice: { fontSize: 14, fontWeight: "700", color: "#111827" },
  cardTitle: { fontSize: 12, fontWeight: "500", color: "#374151", lineHeight: 17 },
  cardLoc: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  cardLocText: { fontSize: 11, color: "#9ca3af", flex: 1 },

  emptyWrap: { paddingHorizontal: 16, gap: 10 },
  emptyText: { fontSize: 13, color: "#9ca3af" },
  emptyActions: { gap: 8 },
  radiusPillsRow: { flexDirection: "row", gap: 7, flexWrap: "wrap" },
  emptyFooter: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  browseLinkBtn: { paddingVertical: 7, paddingHorizontal: 12 },
  browseLinkText: { fontSize: 13, color: "#f97316", fontWeight: "600" },
  refreshBtnSmall: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb",
  },
  refreshBtnSmallText: { fontSize: 12, color: "#6b7280", fontWeight: "500" },

  deniedWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, padding: 12,
    backgroundColor: "#f9fafb", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb",
  },
  deniedText: { fontSize: 13, color: "#6b7280" },
});
