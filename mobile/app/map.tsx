import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  Linking,
  Platform,
  ScrollView,
} from "react-native";
import MapView, { Marker, Callout, Region } from "react-native-maps";
import * as Location from "expo-location";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { resolveImageUrl } from "../lib/image-url";
import type { Listing } from "../lib/types";

const fmt = new Intl.NumberFormat("th-TH");

const THAILAND: Region = {
  latitude: 13.0,
  longitude: 101.5,
  latitudeDelta: 12,
  longitudeDelta: 10,
};

const TYPE_COLOR: Record<string, string> = {
  sale: "#1d4ed8",
  rent: "#15803d",
  both: "#7c3aed",
};

function priceLabel(item: Listing): string {
  if (item.listing_type === "rent" && item.rent_price)
    return `฿${fmt.format(item.rent_price)}/ด.`;
  if (item.sale_price) return `฿${fmt.format(item.sale_price)}`;
  return "ติดต่อ";
}

type FilterType = "all" | "sale" | "rent" | "both";

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [filterType, setFilterType] = useState<FilterType>("all");

  useEffect(() => {
    fetchListings();
    centerOnUser();
  }, []);

  async function fetchListings() {
    const { data } = await supabase
      .from("listings")
      .select(`
        id, slug, title, listing_type, sale_price, rent_price,
        latitude, longitude, district, published_at,
        listing_images(storage_path, display_order),
        provinces(name_th),
        categories(name_th, slug)
      `)
      .eq("status", "published")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .order("published_at", { ascending: false })
      .limit(300);
    setListings((data ?? []) as unknown as Listing[]);
    setLoading(false);
  }

  async function centerOnUser() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    mapRef.current?.animateToRegion({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.15,
      longitudeDelta: 0.15,
    }, 800);
  }

  const filtered = listings.filter((l) => {
    if (filterType === "all") return true;
    if (filterType === "sale") return l.listing_type === "sale" || l.listing_type === "both";
    if (filterType === "rent") return l.listing_type === "rent" || l.listing_type === "both";
    return l.listing_type === filterType;
  });

  const cover = selected?.listing_images
    ?.slice()
    .sort((a, b) => a.display_order - b.display_order)[0];
  const coverUrl = cover ? resolveImageUrl(cover.storage_path) : null;

  function openMaps() {
    if (!selected) return;
    const url = Platform.OS === "ios"
      ? `maps:?q=${selected.latitude},${selected.longitude}`
      : `geo:${selected.latitude},${selected.longitude}?q=${selected.latitude},${selected.longitude}`;
    Linking.openURL(url);
  }

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: "all", label: "ทั้งหมด" },
    { key: "sale", label: "เซ้ง" },
    { key: "rent", label: "เช่า" },
    { key: "both", label: "เซ้ง+เช่า" },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </Pressable>
        <Text style={styles.headerTitle}>แผนที่เซ้ง</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.pill, filterType === f.key && styles.pillActive]}
            onPress={() => setFilterType(f.key)}
          >
            <Text style={[styles.pillText, filterType === f.key && styles.pillTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Map */}
      <View style={styles.mapWrap}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#f97316" size="large" />
          </View>
        )}
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={THAILAND}
          showsUserLocation
          showsMyLocationButton={false}
          onPress={() => setSelected(null)}
        >
          {filtered.map((l) => {
            if (!l.latitude || !l.longitude) return null;
            const color = TYPE_COLOR[l.listing_type] ?? "#f97316";
            return (
              <Marker
                key={l.id}
                coordinate={{ latitude: l.latitude, longitude: l.longitude }}
                onPress={() => setSelected(l)}
                tracksViewChanges={false}
              >
                <View style={[styles.pin, { backgroundColor: color }]}>
                  <Text style={styles.pinText}>{priceLabel(l)}</Text>
                </View>
              </Marker>
            );
          })}
        </MapView>

        {/* My location button */}
        <Pressable style={styles.locBtn} onPress={centerOnUser}>
          <Ionicons name="locate" size={20} color="#374151" />
        </Pressable>
      </View>

      {/* Bottom card when marker selected */}
      {selected && (
        <View style={styles.card}>
          <Pressable
            style={styles.cardInner}
            onPress={() => router.push(`/listing/${selected.slug}`)}
          >
            <View style={styles.cardImg}>
              {coverUrl ? (
                <Image source={{ uri: coverUrl }} style={styles.cardImgInner} />
              ) : (
                <View style={[styles.cardImgInner, styles.cardImgPlaceholder]}>
                  <Text style={{ fontSize: 24 }}>🏪</Text>
                </View>
              )}
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardPrice}>{priceLabel(selected)}</Text>
              <Text style={styles.cardTitle} numberOfLines={2}>{selected.title}</Text>
              {(selected.district || (selected as any).provinces?.name_th) && (
                <View style={styles.cardLoc}>
                  <Ionicons name="location-outline" size={11} color="#9ca3af" />
                  <Text style={styles.cardLocText} numberOfLines={1}>
                    {[selected.district, (selected as any).provinces?.name_th].filter(Boolean).join(", ")}
                  </Text>
                </View>
              )}
            </View>
            <Pressable style={styles.navBtn} onPress={openMaps}>
              <Ionicons name="navigate" size={18} color="#fff" />
            </Pressable>
          </Pressable>
          <Pressable style={styles.closeBtn} onPress={() => setSelected(null)}>
            <Ionicons name="close" size={16} color="#6b7280" />
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  pillActive: { backgroundColor: "#f97316", borderColor: "#f97316" },
  pillText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  pillTextActive: { color: "#fff" },
  mapWrap: { flex: 1 },
  map: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  locBtn: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  pin: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  pinText: { color: "#fff", fontSize: 11, fontWeight: "700", letterSpacing: -0.3 },
  card: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  cardInner: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  cardImg: { width: 72, height: 72, borderRadius: 10, overflow: "hidden" },
  cardImgInner: { width: 72, height: 72 },
  cardImgPlaceholder: { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1, gap: 2 },
  cardPrice: { fontSize: 15, fontWeight: "700", color: "#f97316" },
  cardTitle: { fontSize: 13, color: "#374151", lineHeight: 18 },
  cardLoc: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  cardLocText: { fontSize: 11, color: "#9ca3af", flex: 1 },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
});
