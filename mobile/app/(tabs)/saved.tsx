import { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { resolveImageUrl } from "../../lib/image-url";
import { SessionContext } from "../_layout";
import type { Listing } from "../../lib/types";

type FilterType = "all" | "sale" | "rent" | "both";

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

function priceUnit(item: Listing): string {
  if (item.listing_type === "rent") return "/ด.";
  if (item.listing_type === "both" && !item.sale_price && item.rent_price) return "/ด.";
  return "";
}

type BadgeType = "sale" | "rent" | "both";
function TypeBadge({ type, count }: { type: BadgeType; count?: number }) {
  const cfg = {
    sale: { bg: "#dbeafe", border: "#bfdbfe", text: "#1d4ed8", label: "เซ้ง" },
    rent: { bg: "#dcfce7", border: "#bbf7d0", text: "#15803d", label: "ให้เช่า" },
    both: { bg: "#f3e8ff", border: "#e9d5ff", text: "#7e22ce", label: "เซ้ง+เช่า" },
  }[type];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
      {count !== undefined && (
        <View style={[styles.badgeCount, { backgroundColor: cfg.text }]}>
          <Text style={styles.badgeCountText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

function SavedRow({ item, onPress, onUnsave }: { item: Listing; onPress: () => void; onUnsave: () => void }) {
  const cover = item.listing_images
    .slice()
    .sort((a, b) => a.display_order - b.display_order)[0];
  const imageUrl = cover ? resolveImageUrl(cover.storage_path) : null;
  const [imgError, setImgError] = useState(false);

  const postedDate = item.published_at
    ? new Date(item.published_at).toLocaleDateString("th-TH", { day: "numeric", month: "short" })
    : "";

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowImgWrap}>
        {imageUrl && !imgError ? (
          <Image source={{ uri: imageUrl }} style={styles.rowImg} onError={() => setImgError(true)} />
        ) : (
          <View style={[styles.rowImg, styles.rowImgPlaceholder]}>
            <Text style={{ fontSize: 22 }}>🏪</Text>
          </View>
        )}
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <TypeBadge type={item.listing_type} />
          <Text style={styles.rowDate}>{postedDate}</Text>
        </View>
        <Text style={styles.rowTitle} numberOfLines={2}>{item.title}</Text>
        {(item.district || item.provinces) && (
          <View style={styles.rowLoc}>
            <Ionicons name="location-outline" size={11} color="#9ca3af" />
            <Text style={styles.rowLocText} numberOfLines={1}>
              {[item.district, item.provinces?.name_th].filter(Boolean).join(", ")}
            </Text>
          </View>
        )}
        <View style={styles.rowBottom}>
          <Text style={styles.rowPrice}>{priceText(item)}</Text>
          {priceUnit(item) ? <Text style={styles.rowPriceUnit}>{priceUnit(item)}</Text> : null}
        </View>
      </View>
      <Pressable style={styles.heartBtn} onPress={onUnsave}>
        <Ionicons name="heart" size={20} color="#ef4444" />
      </Pressable>
    </Pressable>
  );
}

export default function SavedScreen() {
  const session = useContext(SessionContext);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterType>("all");

  useEffect(() => {
    if (session) loadSaved();
    else setLoading(false);
  }, [session]);

  async function loadSaved() {
    setLoading(true);
    const { data } = await supabase
      .from("favorites")
      .select(`
        listing_id,
        listings(
          id, slug, title, listing_type, sale_price, rent_price, district, is_featured, published_at,
          listing_images(id, storage_path, display_order),
          categories(name_th, slug), provinces(name_th, slug)
        )
      `)
      .order("created_at", { ascending: false });

    const items = ((data ?? [])
      .map((f: any) => f.listings)
      .filter(Boolean)) as unknown as Listing[];
    setListings(items);
    setLoading(false);
  }

  async function unsave(id: string) {
    setListings((prev) => prev.filter((l) => l.id !== id));
    await supabase.from("favorites").delete().eq("listing_id", id);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadSaved();
    setRefreshing(false);
  }

  const filtered =
    activeTab === "all"
      ? listings
      : listings.filter((l) => {
          if (activeTab === "sale") return l.listing_type === "sale" || l.listing_type === "both";
          if (activeTab === "rent") return l.listing_type === "rent" || l.listing_type === "both";
          return l.listing_type === "both";
        });

  const TAB_FILTERS: { key: FilterType; label: string }[] = [
    { key: "all", label: "ทั้งหมด" },
    { key: "sale", label: "เซ้ง" },
    { key: "rent", label: "ให้เช่า" },
  ];

  const renderItem = useCallback(
    ({ item }: { item: Listing }) => (
      <SavedRow
        item={item}
        onPress={() => router.push(`/listing/${item.slug}`)}
        onUnsave={() => unsave(item.id)}
      />
    ),
    []
  );

  if (!session) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>ประกาศที่บันทึก</Text>
        </View>
        <View style={styles.guestWrap}>
          <Ionicons name="bookmark-outline" size={64} color="#d1d5db" />
          <Text style={styles.guestTitle}>ยังไม่ได้เข้าสู่ระบบ</Text>
          <Text style={styles.guestSub}>เข้าสู่ระบบเพื่อบันทึกประกาศที่สนใจ</Text>
          <Pressable style={styles.loginBtn} onPress={() => router.push("/auth/login")}>
            <Text style={styles.loginBtnText}>เข้าสู่ระบบ</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>ประกาศที่บันทึก</Text>
          {!loading && (
            <Text style={styles.topBarSub}>{listings.length} รายการ</Text>
          )}
        </View>
      </View>

      {/* Tab filters */}
      <View style={styles.tabRow}>
        {TAB_FILTERS.map((f) => {
          const count =
            f.key === "all"
              ? listings.length
              : listings.filter((l) =>
                  f.key === "sale"
                    ? l.listing_type === "sale" || l.listing_type === "both"
                    : l.listing_type === "rent" || l.listing_type === "both"
                ).length;
          const active = activeTab === f.key;
          return (
            <Pressable
              key={f.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveTab(f.key)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{f.label}</Text>
              {count > 0 && (
                <View style={[styles.tabCount, active && styles.tabCountActive]}>
                  <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          style={{ backgroundColor: "#f9fafb" }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="bookmark-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyTitle}>ยังไม่มีประกาศที่บันทึก</Text>
              <Pressable onPress={() => router.push("/(tabs)/browse")}>
                <Text style={styles.emptyLink}>เริ่มค้นหา →</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  topBarTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  topBarSub: { fontSize: 12, color: "#9ca3af", marginTop: 1 },

  // Tabs
  tabRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f3f4f6", paddingHorizontal: 16 },
  tab: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 10, paddingHorizontal: 4, marginRight: 16 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#f97316" },
  tabText: { fontSize: 14, fontWeight: "500", color: "#6b7280" },
  tabTextActive: { color: "#f97316", fontWeight: "700" },
  tabCount: { backgroundColor: "#f3f4f6", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  tabCountActive: { backgroundColor: "#fff7ed" },
  tabCountText: { fontSize: 11, fontWeight: "600", color: "#6b7280" },
  tabCountTextActive: { color: "#f97316" },

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 10 },

  // Row
  row: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  rowImgWrap: { borderRadius: 10, overflow: "hidden", flexShrink: 0 },
  rowImg: { width: 100, height: 100, resizeMode: "cover" },
  rowImgPlaceholder: { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1, gap: 4 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowDate: { fontSize: 10, color: "#9ca3af", marginLeft: "auto" },
  rowTitle: { fontSize: 14, fontWeight: "600", color: "#111827", lineHeight: 20 },
  rowLoc: { flexDirection: "row", alignItems: "center", gap: 3 },
  rowLocText: { fontSize: 11, color: "#9ca3af", flex: 1 },
  rowBottom: { flexDirection: "row", alignItems: "baseline", gap: 3, marginTop: 2 },
  rowPrice: { fontSize: 16, fontWeight: "700", color: "#f97316" },
  rowPriceUnit: { fontSize: 11, color: "#9ca3af" },
  heartBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", flexShrink: 0 },

  // Badge
  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  badgeCount: { borderRadius: 999, paddingHorizontal: 5, paddingVertical: 1 },
  badgeCountText: { fontSize: 10, fontWeight: "700", color: "#fff" },

  // Guest
  guestWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  guestTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  guestSub: { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 22 },
  loginBtn: { backgroundColor: "#f97316", borderRadius: 12, paddingVertical: 13, paddingHorizontal: 48, marginTop: 8 },
  loginBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // Empty
  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#374151" },
  emptyLink: { fontSize: 14, color: "#f97316", fontWeight: "600" },
});
