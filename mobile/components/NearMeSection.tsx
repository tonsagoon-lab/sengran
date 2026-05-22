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
const INITIAL_RADIUS = 10;
const EXPANDED_RADIUS = 50;

type State =
  | { phase: "prompt" }
  | { phase: "loading" }
  | { phase: "results"; listings: Listing[]; radius: number; lat: number; lng: number }
  | { phase: "empty"; lat: number; lng: number }
  | { phase: "denied" };

function priceText(item: Listing): string {
  const price =
    item.listing_type === "sale"
      ? item.sale_price
      : item.listing_type === "rent"
      ? item.rent_price
      : item.sale_price ?? item.rent_price;
  if (!price) return "";
  if (price >= 1_000_000) return `฿${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `฿${Math.round(price / 1000)}K`;
  return `฿${price.toLocaleString("th-TH")}`;
}

function NearCard({ item }: { item: Listing }) {
  const cover = (item.listing_images ?? [])
    .slice()
    .sort((a, b) => a.display_order - b.display_order)[0];
  const imageUrl = cover ? resolveImageUrl(cover.storage_path) : null;
  const [imgError, setImgError] = useState(false);

  return (
    <Pressable style={styles.card} onPress={() => router.push(`/listing/${item.slug}`)}>
      {imageUrl && !imgError ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.cardImg}
          onError={() => setImgError(true)}
        />
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

  useEffect(() => {
    checkCachedLocation();
  }, []);

  async function checkCachedLocation() {
    const denied = await AsyncStorage.getItem(DENIED_KEY);
    if (denied) { setState({ phase: "denied" }); return; }

    const cached = await AsyncStorage.getItem(LOCATION_KEY);
    if (cached) {
      const { lat, lng } = JSON.parse(cached);
      await fetchNearby(lat, lng, INITIAL_RADIUS);
    }
  }

  async function requestLocation() {
    setState({ phase: "loading" });
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        await AsyncStorage.setItem(DENIED_KEY, "1");
        setState({ phase: "denied" });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = loc.coords;
      await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify({ lat, lng }));
      await fetchNearby(lat, lng, INITIAL_RADIUS);
    } catch {
      setState({ phase: "denied" });
    }
  }

  async function fetchNearby(lat: number, lng: number, radius: number) {
    setState({ phase: "loading" });
    const { data, error } = await supabase.rpc("listings_within_distance", {
      lat,
      lng,
      radius_km: radius,
    });

    if (error || !data || data.length === 0) {
      if (radius < EXPANDED_RADIUS) {
        setState({ phase: "empty", lat, lng });
      } else {
        setState({ phase: "denied" });
      }
      return;
    }

    setState({ phase: "results", listings: data as Listing[], radius, lat, lng });
  }

  async function expandRadius() {
    if (state.phase !== "empty") return;
    const { lat, lng } = state;
    await fetchNearby(lat, lng, EXPANDED_RADIUS);
  }

  async function clearDenied() {
    await AsyncStorage.removeItem(DENIED_KEY);
    await AsyncStorage.removeItem(LOCATION_KEY);
    setState({ phase: "prompt" });
  }

  // ── Render ──────────────────────────────────────────────
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="location" size={16} color="#f97316" />
          <Text style={styles.headerTitle}>ร้านใกล้เคียง</Text>
        </View>
        {state.phase === "results" && (
          <Text style={styles.headerSub}>รัศมี {state.radius} กม.</Text>
        )}
      </View>

      {state.phase === "prompt" && (
        <Pressable style={styles.promptCard} onPress={requestLocation}>
          <View style={styles.promptIcon}>
            <Ionicons name="navigate" size={20} color="#f97316" />
          </View>
          <View style={styles.promptText}>
            <Text style={styles.promptTitle}>ค้นหาร้านใกล้คุณ</Text>
            <Text style={styles.promptSub}>กดเพื่ออนุญาตใช้ตำแหน่ง</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
        </Pressable>
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
          <Text style={styles.emptyText}>ไม่พบร้านในรัศมี {INITIAL_RADIUS} กม.</Text>
          <Pressable style={styles.expandBtn} onPress={expandRadius}>
            <Text style={styles.expandBtnText}>ขยายรัศมีเป็น {EXPANDED_RADIUS} กม.</Text>
          </Pressable>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  headerSub: { fontSize: 12, color: "#9ca3af" },

  promptCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    padding: 14,
    backgroundColor: "#fff7ed",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  promptIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffedd5",
    alignItems: "center",
    justifyContent: "center",
  },
  promptText: { flex: 1 },
  promptTitle: { fontSize: 14, fontWeight: "600", color: "#c2410c" },
  promptSub: { fontSize: 12, color: "#9ca3af", marginTop: 2 },

  loadingWrap: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  loadingText: { fontSize: 14, color: "#9ca3af" },

  scroll: { paddingLeft: 16, paddingRight: 8, gap: 10, paddingBottom: 4 },

  card: {
    width: 160,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  cardImg: { width: "100%", aspectRatio: 4 / 3, resizeMode: "cover" },
  cardImgPlaceholder: { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  cardBody: { padding: 10, gap: 3 },
  cardPrice: { fontSize: 14, fontWeight: "700", color: "#111827" },
  cardTitle: { fontSize: 12, fontWeight: "500", color: "#374151", lineHeight: 17 },
  cardLoc: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  cardLocText: { fontSize: 11, color: "#9ca3af", flex: 1 },

  emptyWrap: { paddingHorizontal: 16, gap: 8 },
  emptyText: { fontSize: 13, color: "#9ca3af" },
  expandBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#fff7ed",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#fed7aa",
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  expandBtnText: { fontSize: 13, color: "#c2410c", fontWeight: "600" },

  deniedWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  deniedText: { fontSize: 13, color: "#6b7280" },
});
