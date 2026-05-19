import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { resolveImageUrl } from "../../lib/image-url";
import type { Category, Listing } from "../../lib/types";

const PAGE_SIZE = 20;
type FilterType = "all" | "sale" | "rent";

function formatPrice(n: number | null): string {
  if (!n) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function ListingCard({ item, onPress }: { item: Listing; onPress: () => void }) {
  const cover = item.listing_images
    .slice()
    .sort((a, b) => a.display_order - b.display_order)[0];
  const imageUrl = cover ? resolveImageUrl(cover.storage_path) : null;
  const [imgError, setImgError] = useState(false);

  const typeBadge =
    item.listing_type === "sale" ? "เซ้ง" :
    item.listing_type === "rent" ? "ให้เช่า" : "เซ้ง+เช่า";

  const price =
    item.listing_type === "sale" ? item.sale_price :
    item.listing_type === "rent" ? item.rent_price :
    item.sale_price ?? item.rent_price;

  const priceLabel =
    item.listing_type === "rent" || (!item.sale_price && item.rent_price)
      ? `฿${formatPrice(price)}/ด.`
      : `฿${formatPrice(price)}`;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {imageUrl && !imgError ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.cardImage}
          onError={() => setImgError(true)}
        />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
          <Text style={{ fontSize: 32 }}>🏪</Text>
        </View>
      )}

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, item.listing_type === "sale" ? styles.badgeSale : styles.badgeRent]}>
            <Text style={styles.badgeText}>{typeBadge}</Text>
          </View>
          {item.categories && (
            <View style={styles.badgeCat}>
              <Text style={styles.badgeCatText}>{item.categories.name_th}</Text>
            </View>
          )}
        </View>

        {(item.district || item.provinces) && (
          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText} numberOfLines={1}>
              {[item.district, item.provinces?.name_th].filter(Boolean).join(", ")}
            </Text>
          </View>
        )}

        {price ? (
          <Text style={styles.price}>{priceLabel}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function BrowseScreen() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterCat, setFilterCat] = useState<number | null>(null);
  const [resultCount, setResultCount] = useState(0);
  const page = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => { loadCategories(); }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  useEffect(() => { resetAndLoad(); }, [filterType, filterCat, debouncedSearch]);

  async function loadCategories() {
    const { data } = await supabase
      .from("categories").select("id, name_th, slug")
      .eq("is_active", true).order("display_order");
    setCategories(data ?? []);
  }

  function buildQuery(from: number, to: number) {
    let q = supabase
      .from("listings")
      .select(
        `id, slug, title, listing_type, sale_price, rent_price, district,
         listing_images(id, storage_path, display_order),
         categories(name_th, slug), provinces(name_th, slug)`,
        { count: "exact" }
      )
      .eq("status", "published")
      .order("boost_rank", { ascending: false })
      .order("published_at", { ascending: false })
      .range(from, to);

    if (filterType === "sale") q = q.in("listing_type", ["sale", "both"]);
    if (filterType === "rent") q = q.in("listing_type", ["rent", "both"]);
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
      <ListingCard item={item} onPress={() => router.push(`/listing/${item.slug}`)} />
    ), []
  );

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>เซ้งร้าน</Text>
          <Text style={styles.headerSub}>ซื้อ ขาย เช่า ร้านค้าทั่วไทย</Text>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="ค้นหาร้านค้า..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Text style={styles.clearBtn}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {([["all", "ทั้งหมด", "🏪"], ["sale", "เซ้ง", "🏷️"], ["rent", "ให้เช่า", "🔑"]] as [FilterType, string, string][]).map(
          ([val, label, icon]) => (
            <Pressable
              key={val}
              style={[styles.filterChip, filterType === val && styles.filterChipActive]}
              onPress={() => setFilterType(val)}
            >
              <Text style={styles.filterChipIcon}>{icon}</Text>
              <Text style={[styles.filterChipText, filterType === val && styles.filterChipTextActive]}>
                {label}
              </Text>
            </Pressable>
          )
        )}
        <View style={styles.filterDivider} />
        {categories.map((cat) => (
          <Pressable
            key={cat.id}
            style={[styles.filterChip, filterCat === cat.id && styles.filterChipActive]}
            onPress={() => setFilterCat(filterCat === cat.id ? null : cat.id)}
          >
            <Text style={[styles.filterChipText, filterCat === cat.id && styles.filterChipTextActive]}>
              {cat.name_th}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Result count */}
      {!loading && (
        <View style={styles.resultRow}>
          <Text style={styles.resultCount}>{resultCount.toLocaleString()} ประกาศ</Text>
        </View>
      )}

      {/* Listings */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loadingText}>กำลังโหลด...</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>ไม่พบประกาศ</Text>
              <Text style={styles.emptyText}>ลองเปลี่ยนคำค้นหาหรือตัวกรอง</Text>
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

const CARD_RADIUS = 16;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fb" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#111827", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: "#9ca3af", marginTop: 1 },

  searchContainer: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, color: "#111827" },
  clearBtn: { fontSize: 13, color: "#9ca3af", paddingHorizontal: 4 },

  filterScroll: { maxHeight: 48 },
  filterContainer: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
    paddingVertical: 4,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  filterChipActive: { backgroundColor: "#f97316", borderColor: "#f97316" },
  filterChipIcon: { fontSize: 13 },
  filterChipText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  filterChipTextActive: { color: "#fff" },
  filterDivider: { width: 1, height: 20, backgroundColor: "#e5e7eb", marginHorizontal: 4 },

  resultRow: { paddingHorizontal: 20, paddingVertical: 8 },
  resultCount: { fontSize: 13, fontWeight: "600", color: "#6b7280" },

  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#9ca3af", fontSize: 14 },

  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImage: {
    width: 120,
    height: 120,
    resizeMode: "cover",
  },
  cardImagePlaceholder: {
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    padding: 12,
    gap: 5,
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 20,
  },
  badgeRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeSale: { backgroundColor: "#fff7ed", borderWidth: 1, borderColor: "#fed7aa" },
  badgeRent: { backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe" },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#374151" },
  badgeCat: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  badgeCatText: { fontSize: 11, fontWeight: "600", color: "#15803d" },

  locationRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  locationIcon: { fontSize: 11 },
  locationText: { fontSize: 12, color: "#6b7280", flex: 1 },

  price: { fontSize: 15, fontWeight: "800", color: "#f97316", marginTop: 2 },

  emptyState: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#374151" },
  emptyText: { fontSize: 14, color: "#9ca3af" },

  footerLoader: { padding: 20, alignItems: "center" },
});
