import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { resolveImageUrl } from "../../lib/image-url";
import type { Category, Listing } from "../../lib/types";

const PAGE_SIZE = 20;
type FilterType = "all" | "sale" | "rent" | "both";

// ─── Helpers ────────────────────────────────────────────────
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
function TypeBadge({ type }: { type: BadgeType }) {
  const cfg = {
    sale: { bg: "#dbeafe", border: "#bfdbfe", text: "#1d4ed8", label: "เซ้ง" },
    rent: { bg: "#dcfce7", border: "#bbf7d0", text: "#15803d", label: "ให้เช่า" },
    both: { bg: "#f3e8ff", border: "#e9d5ff", text: "#7e22ce", label: "เซ้ง+เช่า" },
  }[type];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Row card (horizontal layout) ───────────────────────────
function ListingRow({ item, onPress }: { item: Listing; onPress: () => void }) {
  const cover = item.listing_images
    .slice()
    .sort((a, b) => a.display_order - b.display_order)[0];
  const imageUrl = cover ? resolveImageUrl(cover.storage_path) : null;
  const [imgError, setImgError] = useState(false);

  const postedDate = item.published_at
    ? new Date(item.published_at).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
      })
    : "";

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowImgWrap}>
        {imageUrl && !imgError ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.rowImg}
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={[styles.rowImg, styles.rowImgPlaceholder]}>
            <Text style={{ fontSize: 22 }}>🏪</Text>
          </View>
        )}
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <TypeBadge type={item.listing_type} />
          {item.is_featured && (
            <View style={styles.featuredPill}>
              <Text style={styles.featuredPillText}>⭐ แนะนำ</Text>
            </View>
          )}
          <Text style={styles.rowDate}>{postedDate}</Text>
        </View>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {item.title}
        </Text>
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
          {priceUnit(item) ? (
            <Text style={styles.rowPriceUnit}>{priceUnit(item)}</Text>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#d1d5db" style={styles.rowChevron} />
    </Pressable>
  );
}

// ─── Browse screen ───────────────────────────────────────────
export default function BrowseScreen() {
  const params = useLocalSearchParams<{ type?: string; cat?: string; q?: string }>();

  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState(params.q ?? "");
  const [filterType, setFilterType] = useState<FilterType>(
    (params.type as FilterType) ?? "all"
  );
  const [filterCat, setFilterCat] = useState<number | null>(
    params.cat ? Number(params.cat) : null
  );
  const [resultCount, setResultCount] = useState(0);
  const page = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  useEffect(() => {
    resetAndLoad();
  }, [filterType, filterCat, debouncedSearch]);

  async function loadCategories() {
    const { data } = await supabase
      .from("categories")
      .select("id, name_th, slug")
      .eq("is_active", true)
      .order("display_order");
    setCategories(data ?? []);
  }

  function buildQuery(from: number, to: number) {
    let q = supabase
      .from("listings")
      .select(
        `id, slug, title, listing_type, sale_price, rent_price, district, is_featured, published_at,
         listing_images(id, storage_path, display_order),
         categories(name_th, slug), provinces(name_th, slug)`,
        { count: "exact" }
      )
      .eq("status", "published")
      .order("boost_rank", { ascending: false })
      .order("published_at", { ascending: false })
      .range(from, to);

    if (filterType === "sale") q = q.in("listing_type", ["sale", "both"]);
    else if (filterType === "rent") q = q.in("listing_type", ["rent", "both"]);
    else if (filterType === "both") q = q.eq("listing_type", "both");
    if (filterCat) q = q.eq("category_id", filterCat);
    if (debouncedSearch.trim()) q = q.ilike("title", `%${debouncedSearch.trim()}%`);
    return q;
  }

  async function resetAndLoad() {
    page.current = 0;
    setLoading(true);
    setHasMore(true);
    const { data, count } = await buildQuery(0, PAGE_SIZE - 1);
    setListings((data ?? []) as unknown as Listing[]);
    setResultCount(count ?? 0);
    setHasMore((data ?? []).length === PAGE_SIZE);
    setLoading(false);
  }

  async function loadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    page.current += 1;
    const from = page.current * PAGE_SIZE;
    const { data } = await buildQuery(from, from + PAGE_SIZE - 1);
    const newItems = (data ?? []) as unknown as Listing[];
    setListings((prev) => [...prev, ...newItems]);
    setHasMore(newItems.length === PAGE_SIZE);
    setLoadingMore(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await resetAndLoad();
    setRefreshing(false);
  }

  const renderItem = useCallback(
    ({ item }: { item: Listing }) => (
      <ListingRow item={item} onPress={() => router.push(`/listing/${item.slug}`)} />
    ),
    []
  );

  const TYPE_FILTERS: { key: FilterType; label: string }[] = [
    { key: "all", label: "ทั้งหมด" },
    { key: "sale", label: "เซ้ง" },
    { key: "rent", label: "ให้เช่า" },
    { key: "both", label: "ทั้งสองแบบ" },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>ประกาศทั้งหมด</Text>
          {!loading && (
            <Text style={styles.topBarSub}>
              พบ {resultCount.toLocaleString("th-TH")} รายการ
            </Text>
          )}
        </View>
        <Ionicons name="options-outline" size={22} color="#374151" />
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={17} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="ค้นหาร้าน..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color="#9ca3af" />
          </Pressable>
        )}
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterRowContent}
      >
        {TYPE_FILTERS.map((f) => (
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
        {categories.map((cat) => (
          <Pressable
            key={cat.id}
            style={[styles.pill, filterCat === cat.id && styles.pillActive]}
            onPress={() => setFilterCat(filterCat === cat.id ? null : cat.id)}
          >
            <Text
              style={[styles.pillText, filterCat === cat.id && styles.pillTextActive]}
            >
              {cat.name_th}
            </Text>
            {filterCat !== cat.id && (
              <Ionicons name="chevron-down" size={12} color="#9ca3af" />
            )}
          </Pressable>
        ))}
      </ScrollView>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loadingText}>กำลังโหลด...</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          style={{ backgroundColor: "#f9fafb" }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#f97316"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="search-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyTitle}>ไม่พบประกาศ</Text>
              <Text style={styles.emptySub}>ลองเปลี่ยนคำค้นหาหรือตัวกรอง</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color="#f97316" />
              </View>
            ) : null
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

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },

  filterRow: { maxHeight: 44, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  filterRowContent: { paddingHorizontal: 16, gap: 8, alignItems: "center", paddingVertical: 6 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  pillActive: { backgroundColor: "#f97316", borderColor: "#f97316" },
  pillText: { fontSize: 13, fontWeight: "500", color: "#6b7280" },
  pillTextActive: { color: "#fff", fontWeight: "600" },

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: "#9ca3af", fontSize: 14 },

  listContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 10 },

  // Row card
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
  rowImgWrap: {
    borderRadius: 10,
    overflow: "hidden",
    flexShrink: 0,
  },
  rowImg: { width: 100, height: 100, resizeMode: "cover" },
  rowImgPlaceholder: {
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: { flex: 1, gap: 4 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowDate: { fontSize: 10, color: "#9ca3af", marginLeft: "auto" },
  featuredPill: {
    backgroundColor: "#fef3c7",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  featuredPillText: { fontSize: 10, color: "#92400e" },
  rowTitle: { fontSize: 14, fontWeight: "600", color: "#111827", lineHeight: 20 },
  rowLoc: { flexDirection: "row", alignItems: "center", gap: 3 },
  rowLocText: { fontSize: 11, color: "#9ca3af", flex: 1 },
  rowBottom: { flexDirection: "row", alignItems: "baseline", gap: 3, marginTop: 2 },
  rowPrice: { fontSize: 16, fontWeight: "700", color: "#f97316" },
  rowPriceUnit: { fontSize: 11, color: "#9ca3af" },
  rowChevron: { marginTop: 4, flexShrink: 0 },

  // Badge
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },

  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#374151" },
  emptySub: { fontSize: 14, color: "#9ca3af" },

  footerLoader: { padding: 20, alignItems: "center" },
});
