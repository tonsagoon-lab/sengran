import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
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
import * as Location from "expo-location";
import { supabase } from "../../lib/supabase";
import { resolveImageUrl } from "../../lib/image-url";
import type { Category, Listing, Province } from "../../lib/types";

const PAGE_SIZE = 20;
const RADIUS_OPTIONS = [5, 10, 25, 50];
type FilterType = "all" | "sale" | "rent" | "both";
type SortKey = "newest" | "price_asc" | "price_desc";

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

function getAgeBadge(published_at: string | null | undefined): string | null {
  if (!published_at) return null;
  const days = Math.floor((Date.now() - new Date(published_at).getTime()) / 86_400_000);
  if (days <= 10) return `ลงได้ ${Math.max(days, 1)} วัน`;
  if (days <= 30) return "ประกาศใหม่";
  return null;
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

function ListingRow({ item, onPress }: { item: Listing; onPress: () => void }) {
  const cover = (item.listing_images ?? [])
    .slice()
    .sort((a, b) => a.display_order - b.display_order)[0];
  const imageUrl = cover ? resolveImageUrl(cover.storage_path) : null;
  const [imgError, setImgError] = useState(false);
  const ageBadge = getAgeBadge(item.published_at);
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
          {ageBadge && (
            <View style={styles.ageBadge}>
              <Text style={styles.ageBadgeText}>{ageBadge}</Text>
            </View>
          )}
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
      <Ionicons name="chevron-forward" size={16} color="#d1d5db" style={styles.rowChevron} />
    </Pressable>
  );
}

// ─── OptionPill helper ───────────────────────────────────────
function OptionPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.optionPill, active && styles.optionPillActive]} onPress={onPress}>
      <Text style={[styles.optionPillText, active && styles.optionPillTextActive]}>{label}</Text>
    </Pressable>
  );
}

// ─── Browse screen ───────────────────────────────────────────
export default function BrowseScreen() {
  const params = useLocalSearchParams<{ type?: string; cat?: string; q?: string }>();

  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState(params.q ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(params.q ?? "");
  const [filterType, setFilterType] = useState<FilterType>((params.type as FilterType) ?? "all");
  const [filterCat, setFilterCat] = useState<number | null>(params.cat ? Number(params.cat) : null);
  const [filterProvince, setFilterProvince] = useState<number | null>(null);
  const [filterRadius, setFilterRadius] = useState<number | null>(null);
  const [nearbyIds, setNearbyIds] = useState<string[] | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [provinceSearch, setProvinceSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [resultCount, setResultCount] = useState(0);
  const [showFilter, setShowFilter] = useState(false);
  const [activePicker, setActivePicker] = useState<null | "type" | "cat" | "province">(null);

  const page = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => { loadMeta(); }, []);

  // Sync params when navigating from another tab (tab screens stay mounted)
  useEffect(() => {
    setFilterCat(params.cat ? Number(params.cat) : null);
  }, [params.cat]);

  useEffect(() => {
    setFilterType((params.type as FilterType) ?? "all");
  }, [params.type]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  useEffect(() => { resetAndLoad(); }, [filterType, filterCat, filterProvince, nearbyIds, debouncedSearch, sortKey, minPrice, maxPrice]);

  async function loadMeta() {
    const [catsRes, provRes] = await Promise.all([
      supabase.from("categories").select("id, name_th, slug").eq("is_active", true).order("display_order"),
      supabase.from("provinces").select("id, name_th, slug").order("name_th"),
    ]);
    setCategories(catsRes.data ?? []);
    setProvinces(provRes.data ?? []);
  }

  async function requestGPS(radius: number) {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setGpsLoading(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = loc.coords;

      const { data: nearby } = await supabase.rpc("listings_within_distance", {
        center_lat: lat, center_lng: lng, radius_km: radius,
      });
      const ids = (nearby ?? []).map((r: any) => r.id) as string[];
      setNearbyIds(ids);
      setFilterRadius(radius);
      setFilterProvince(null);
    } catch {
      // ignore
    }
    setGpsLoading(false);
  }

  function clearDistance() {
    setNearbyIds(null);
    setFilterRadius(null);
  }

  function buildQuery(from: number, to: number) {
    let q = supabase
      .from("listings")
      .select(
        `id, slug, title, listing_type, sale_price, rent_price, district, is_featured, featured_until, published_at,
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
    if (filterProvince) q = q.eq("province_id", filterProvince);
    if (nearbyIds) q = q.in("id", nearbyIds.length > 0 ? nearbyIds : ["_none_"]);
    if (debouncedSearch.trim()) q = q.ilike("title", `%${debouncedSearch.trim()}%`);

    const min = minPrice ? Number(minPrice.replace(/,/g, "")) : null;
    const max = maxPrice ? Number(maxPrice.replace(/,/g, "")) : null;
    const priceCol = filterType === "rent" ? "rent_price" : "sale_price";
    if (min) q = q.gte(priceCol, min);
    if (max) q = q.lte(priceCol, max);

    if (sortKey === "price_asc") q = q.order(priceCol, { ascending: true, nullsFirst: false });
    else if (sortKey === "price_desc") q = q.order(priceCol, { ascending: false, nullsFirst: false });
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
    setListings((prev) => [...prev, ...(data ?? []) as unknown as Listing[]]);
    setHasMore((data ?? []).length === PAGE_SIZE);
    setLoadingMore(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await resetAndLoad();
    setRefreshing(false);
  }

  function resetFilters() {
    setFilterType("all");
    setFilterCat(null);
    setFilterProvince(null);
    setSortKey("newest");
    setMinPrice("");
    setMaxPrice("");
    clearDistance();
  }

  const hasActiveFilter = filterType !== "all" || filterCat !== null || filterProvince !== null || filterRadius !== null || sortKey !== "newest" || !!minPrice || !!maxPrice;

  const filteredProvinces = provinces.filter((p) =>
    provinceSearch ? p.name_th.includes(provinceSearch) : true
  );

  const TYPE_FILTERS: { key: FilterType; label: string }[] = [
    { key: "all", label: "ทั้งหมด" },
    { key: "sale", label: "เซ้ง" },
    { key: "rent", label: "ให้เช่า" },
    { key: "both", label: "เซ้ง+เช่า" },
  ];

  const renderItem = useCallback(
    ({ item }: { item: Listing }) => (
      <ListingRow item={item} onPress={() => router.push(`/listing/${item.slug}`)} />
    ), []
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>ประกาศทั้งหมด</Text>
          {!loading && (
            <Text style={styles.topBarSub}>พบ {resultCount.toLocaleString("th-TH")} รายการ</Text>
          )}
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable style={styles.filterIconBtn} onPress={() => router.push("/map")}>
            <Ionicons name="map-outline" size={22} color="#374151" />
          </Pressable>
          <Pressable style={styles.filterIconBtn} onPress={() => setShowFilter(true)}>
            <Ionicons name="options-outline" size={22} color={hasActiveFilter ? "#f97316" : "#374151"} />
            {hasActiveFilter && <View style={styles.filterDot} />}
          </Pressable>
        </View>
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

      {/* Filter chips */}
      <View style={styles.chipRow}>
        <Pressable
          style={[styles.filterChip, filterType !== "all" && styles.filterChipActive]}
          onPress={() => setActivePicker("type")}
        >
          <Text style={[styles.filterChipText, filterType !== "all" && styles.filterChipTextActive]} numberOfLines={1}>
            {filterType === "all" ? "ประเภทประกาศ" : TYPE_FILTERS.find(f => f.key === filterType)?.label}
          </Text>
          <Ionicons name="chevron-down" size={12} color={filterType !== "all" ? "#c2410c" : "#6b7280"} />
        </Pressable>
        <Pressable
          style={[styles.filterChip, filterCat !== null && styles.filterChipActive]}
          onPress={() => setActivePicker("cat")}
        >
          <Text style={[styles.filterChipText, filterCat !== null && styles.filterChipTextActive]} numberOfLines={1}>
            {filterCat !== null ? categories.find(c => c.id === filterCat)?.name_th ?? "หมวดหมู่" : "หมวดหมู่"}
          </Text>
          <Ionicons name="chevron-down" size={12} color={filterCat !== null ? "#c2410c" : "#6b7280"} />
        </Pressable>
        <Pressable
          style={[styles.filterChip, filterProvince !== null && styles.filterChipActive]}
          onPress={() => setActivePicker("province")}
        >
          <Text style={[styles.filterChipText, filterProvince !== null && styles.filterChipTextActive]} numberOfLines={1}>
            {filterProvince !== null ? provinces.find(p => p.id === filterProvince)?.name_th ?? "จังหวัด" : "จังหวัด"}
          </Text>
          <Ionicons name="chevron-down" size={12} color={filterProvince !== null ? "#c2410c" : "#6b7280"} />
        </Pressable>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#f97316" />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="search-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyTitle}>ไม่พบประกาศ</Text>
              <Text style={styles.emptySub}>ลองเปลี่ยนคำค้นหาหรือตัวกรอง</Text>
            </View>
          }
          ListFooterComponent={loadingMore ? <View style={styles.footerLoader}><ActivityIndicator color="#f97316" /></View> : null}
        />
      )}

      {/* Mini picker modal */}
      <Modal visible={activePicker !== null} transparent animationType="slide" onRequestClose={() => setActivePicker(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setActivePicker(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            {activePicker === "type" && (
              <>
                <Text style={styles.modalTitle}>ประเภทประกาศ</Text>
                {TYPE_FILTERS.map((f) => (
                  <Pressable
                    key={f.key}
                    style={[styles.pickerRow, filterType === f.key && styles.pickerRowActive]}
                    onPress={() => { setFilterType(f.key); setActivePicker(null); }}
                  >
                    <Text style={[styles.pickerRowText, filterType === f.key && styles.pickerRowTextActive]}>{f.label}</Text>
                    {filterType === f.key && <Ionicons name="checkmark" size={18} color="#f97316" />}
                  </Pressable>
                ))}
              </>
            )}
            {activePicker === "cat" && (
              <>
                <Text style={styles.modalTitle}>หมวดหมู่</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
                  <Pressable
                    style={[styles.pickerRow, filterCat === null && styles.pickerRowActive]}
                    onPress={() => { setFilterCat(null); setActivePicker(null); }}
                  >
                    <Text style={[styles.pickerRowText, filterCat === null && styles.pickerRowTextActive]}>ทุกหมวดหมู่</Text>
                    {filterCat === null && <Ionicons name="checkmark" size={18} color="#f97316" />}
                  </Pressable>
                  {categories.map((cat) => (
                    <Pressable
                      key={cat.id}
                      style={[styles.pickerRow, filterCat === cat.id && styles.pickerRowActive]}
                      onPress={() => { setFilterCat(cat.id); setActivePicker(null); }}
                    >
                      <Text style={[styles.pickerRowText, filterCat === cat.id && styles.pickerRowTextActive]}>{cat.name_th}</Text>
                      {filterCat === cat.id && <Ionicons name="checkmark" size={18} color="#f97316" />}
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
            {activePicker === "province" && (
              <>
                <Text style={styles.modalTitle}>จังหวัด</Text>
                <View style={styles.pickerSearch}>
                  <Ionicons name="search-outline" size={16} color="#9ca3af" />
                  <TextInput
                    style={styles.pickerSearchInput}
                    placeholder="ค้นหาจังหวัด..."
                    placeholderTextColor="#9ca3af"
                    value={provinceSearch}
                    onChangeText={setProvinceSearch}
                    autoFocus
                  />
                </View>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
                  <Pressable
                    style={[styles.pickerRow, filterProvince === null && styles.pickerRowActive]}
                    onPress={() => { setFilterProvince(null); setProvinceSearch(""); setActivePicker(null); }}
                  >
                    <Text style={[styles.pickerRowText, filterProvince === null && styles.pickerRowTextActive]}>ทุกจังหวัด</Text>
                    {filterProvince === null && <Ionicons name="checkmark" size={18} color="#f97316" />}
                  </Pressable>
                  {filteredProvinces.map((p) => (
                    <Pressable
                      key={p.id}
                      style={[styles.pickerRow, filterProvince === p.id && styles.pickerRowActive]}
                      onPress={() => { setFilterProvince(p.id); setProvinceSearch(""); setActivePicker(null); }}
                    >
                      <Text style={[styles.pickerRowText, filterProvince === p.id && styles.pickerRowTextActive]}>{p.name_th}</Text>
                      {filterProvince === p.id && <Ionicons name="checkmark" size={18} color="#f97316" />}
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Filter modal */}
      <Modal visible={showFilter} transparent animationType="slide" onRequestClose={() => setShowFilter(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowFilter(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>กรองการค้นหา</Text>

              {/* Sort */}
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>เรียงตาม</Text>
                <View style={styles.optionRow}>
                  {([{ key: "newest", label: "ล่าสุด" }, { key: "price_asc", label: "ราคา ต่ำ→สูง" }, { key: "price_desc", label: "ราคา สูง→ต่ำ" }] as { key: SortKey; label: string }[]).map((s) => (
                    <OptionPill key={s.key} label={s.label} active={sortKey === s.key} onPress={() => setSortKey(s.key)} />
                  ))}
                </View>
              </View>

              {/* Price range */}
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>ช่วงราคา (บาท)</Text>
                <View style={styles.priceRow}>
                  <View style={styles.priceInputWrap}>
                    <Text style={styles.pricePrefix}>฿</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="ต่ำสุด"
                      placeholderTextColor="#9ca3af"
                      value={minPrice}
                      onChangeText={setMinPrice}
                      keyboardType="numeric"
                    />
                  </View>
                  <Text style={styles.priceSep}>—</Text>
                  <View style={styles.priceInputWrap}>
                    <Text style={styles.pricePrefix}>฿</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="สูงสุด"
                      placeholderTextColor="#9ca3af"
                      value={maxPrice}
                      onChangeText={setMaxPrice}
                      keyboardType="numeric"
                    />
                  </View>
                  {(minPrice || maxPrice) && (
                    <Pressable onPress={() => { setMinPrice(""); setMaxPrice(""); }}>
                      <Ionicons name="close-circle" size={20} color="#9ca3af" />
                    </Pressable>
                  )}
                </View>
                <View style={styles.pricePresets}>
                  {[
                    { label: "< 100K", min: "", max: "100000" },
                    { label: "100K–500K", min: "100000", max: "500000" },
                    { label: "500K–1M", min: "500000", max: "1000000" },
                    { label: "> 1M", min: "1000000", max: "" },
                  ].map((p) => (
                    <Pressable
                      key={p.label}
                      style={[styles.presetPill, minPrice === p.min && maxPrice === p.max && styles.presetPillActive]}
                      onPress={() => { setMinPrice(p.min); setMaxPrice(p.max); }}
                    >
                      <Text style={[styles.presetPillText, minPrice === p.min && maxPrice === p.max && styles.presetPillTextActive]}>
                        {p.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Category */}
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>หมวดหมู่</Text>
                <View style={styles.optionRow}>
                  <OptionPill label="ทั้งหมด" active={filterCat === null} onPress={() => setFilterCat(null)} />
                  {categories.map((cat) => (
                    <OptionPill key={cat.id} label={cat.name_th} active={filterCat === cat.id} onPress={() => setFilterCat(filterCat === cat.id ? null : cat.id)} />
                  ))}
                </View>
              </View>

              {/* Province */}
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>จังหวัด</Text>
                <View style={styles.provinceInputWrap}>
                  <Ionicons name="search-outline" size={15} color="#9ca3af" />
                  <TextInput
                    style={styles.provinceSearch}
                    placeholder="พิมพ์ชื่อจังหวัด..."
                    placeholderTextColor="#9ca3af"
                    value={provinceSearch}
                    onChangeText={setProvinceSearch}
                  />
                  {(provinceSearch.length > 0 || filterProvince !== null) && (
                    <Pressable onPress={() => { setProvinceSearch(""); setFilterProvince(null); clearDistance(); }}>
                      <Ionicons name="close-circle" size={16} color="#9ca3af" />
                    </Pressable>
                  )}
                </View>
                {filterProvince !== null && provinceSearch === "" && (
                  <View style={styles.provinceSelected}>
                    <Ionicons name="location" size={13} color="#f97316" />
                    <Text style={styles.provinceSelectedText}>
                      {provinces.find((p) => p.id === filterProvince)?.name_th}
                    </Text>
                    <Pressable onPress={() => { setFilterProvince(null); clearDistance(); }}>
                      <Ionicons name="close" size={14} color="#9ca3af" />
                    </Pressable>
                  </View>
                )}
                {provinceSearch.length > 0 && (
                  <View style={styles.provinceDropdown}>
                    {filteredProvinces.length === 0 ? (
                      <Text style={styles.provinceNoResult}>ไม่พบจังหวัด</Text>
                    ) : (
                      filteredProvinces.slice(0, 8).map((prov) => (
                        <Pressable
                          key={prov.id}
                          style={[styles.provinceItem, filterProvince === prov.id && styles.provinceItemActive]}
                          onPress={() => { setFilterProvince(prov.id); setProvinceSearch(""); clearDistance(); }}
                        >
                          <Text style={[styles.provinceItemText, filterProvince === prov.id && styles.provinceItemTextActive]}>
                            {prov.name_th}
                          </Text>
                          {filterProvince === prov.id && <Ionicons name="checkmark" size={14} color="#f97316" />}
                        </Pressable>
                      ))
                    )}
                  </View>
                )}
              </View>

              {/* Distance */}
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>ระยะทาง (จากตำแหน่งปัจจุบัน)</Text>
                {gpsLoading ? (
                  <View style={styles.gpsLoading}>
                    <ActivityIndicator size="small" color="#f97316" />
                    <Text style={styles.gpsLoadingText}>กำลังหาตำแหน่ง...</Text>
                  </View>
                ) : (
                  <View style={styles.optionRow}>
                    <OptionPill label="ปิด" active={filterRadius === null} onPress={clearDistance} />
                    {RADIUS_OPTIONS.map((r) => (
                      <OptionPill key={r} label={`${r} กม.`} active={filterRadius === r} onPress={() => { requestGPS(r); setFilterProvince(null); }} />
                    ))}
                  </View>
                )}
              </View>

              <View style={{ height: 8 }} />
            </ScrollView>

            <Pressable style={styles.modalApplyBtn} onPress={() => setShowFilter(false)}>
              <Text style={styles.modalApplyText}>ดูผลลัพธ์ {resultCount.toLocaleString()} รายการ</Text>
            </Pressable>
            <Pressable style={styles.modalResetBtn} onPress={resetFilters}>
              <Text style={styles.modalResetText}>ล้างตัวกรองทั้งหมด</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6,
  },
  topBarTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  topBarSub: { fontSize: 12, color: "#9ca3af", marginTop: 1 },
  filterIconBtn: { padding: 8, position: "relative" },
  filterDot: {
    position: "absolute", top: 6, right: 6,
    width: 8, height: 8, borderRadius: 4, backgroundColor: "#f97316",
  },

  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: "#f9fafb", borderRadius: 12,
    borderWidth: 1, borderColor: "#e5e7eb",
    paddingHorizontal: 12, paddingVertical: 11,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },

  chipRow: {
    flexDirection: "row", gap: 8,
    paddingHorizontal: 16, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  filterChip: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    paddingVertical: 9, paddingHorizontal: 10,
    borderRadius: 999, backgroundColor: "#fff",
    borderWidth: 1, borderColor: "#e5e7eb",
  },
  filterChipActive: { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
  filterChipText: { fontSize: 12, fontWeight: "500", color: "#6b7280", flexShrink: 1 },
  filterChipTextActive: { color: "#c2410c", fontWeight: "600" },

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 10 },

  row: {
    flexDirection: "row", gap: 12, padding: 12,
    backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1, borderColor: "#f3f4f6",
    alignItems: "flex-start",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  rowImgWrap: { borderRadius: 10, overflow: "hidden", flexShrink: 0 },
  rowImg: { width: 100, height: 100, resizeMode: "cover" },
  rowImgPlaceholder: { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1, gap: 4 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowDate: { fontSize: 10, color: "#9ca3af", marginLeft: "auto" },
  ageBadge: {
    backgroundColor: "#fff7ed",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: "auto",
  },
  ageBadgeText: { fontSize: 9, fontWeight: "600", color: "#ea580c" },
  rowTitle: { fontSize: 14, fontWeight: "600", color: "#111827", lineHeight: 20 },
  rowLoc: { flexDirection: "row", alignItems: "center", gap: 3 },
  rowLocText: { fontSize: 11, color: "#9ca3af", flex: 1 },
  rowBottom: { flexDirection: "row", alignItems: "baseline", gap: 3, marginTop: 2 },
  rowPrice: { fontSize: 16, fontWeight: "700", color: "#f97316" },
  rowPriceUnit: { fontSize: 11, color: "#9ca3af" },
  rowChevron: { marginTop: 4, flexShrink: 0 },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: "600" },

  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#374151" },
  emptySub: { fontSize: 14, color: "#9ca3af" },
  footerLoader: { padding: 20, alignItems: "center" },

  pickerRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: "#f9fafb",
  },
  pickerRowActive: { },
  pickerRowText: { fontSize: 15, color: "#374151" },
  pickerRowTextActive: { color: "#f97316", fontWeight: "600" },
  pickerSearch: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#f9fafb", borderRadius: 10,
    borderWidth: 1, borderColor: "#e5e7eb",
    paddingHorizontal: 12, paddingVertical: 9, marginBottom: 8,
  },
  pickerSearchInput: { flex: 1, fontSize: 14, color: "#111827" },

  // Filter modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingBottom: 24, maxHeight: "85%",
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: "#e5e7eb",
    alignSelf: "center", marginTop: 12, marginBottom: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 16 },
  modalSection: { marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: "600", color: "#6b7280", marginBottom: 10 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionPill: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb",
  },
  optionPillActive: { backgroundColor: "#f97316", borderColor: "#f97316" },
  optionPillText: { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  optionPillTextActive: { color: "#fff", fontWeight: "700" },

  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  priceInputWrap: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#f9fafb", borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb",
    paddingHorizontal: 10, paddingVertical: 10,
  },
  pricePrefix: { fontSize: 14, color: "#9ca3af" },
  priceInput: { flex: 1, fontSize: 14, color: "#111827" },
  priceSep: { fontSize: 14, color: "#9ca3af" },
  pricePresets: { flexDirection: "row", gap: 8 },
  presetPill: {
    flex: 1, alignItems: "center", paddingVertical: 7,
    borderRadius: 999, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb",
  },
  presetPillActive: { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
  presetPillText: { fontSize: 11, color: "#6b7280", fontWeight: "500" },
  presetPillTextActive: { color: "#c2410c", fontWeight: "700" },

  provinceInputWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#f9fafb", borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb",
    paddingHorizontal: 12, paddingVertical: 10,
  },
  provinceSearch: { flex: 1, fontSize: 14, color: "#111827" },
  provinceSelected: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 8, paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: "#fff7ed", borderRadius: 10,
    borderWidth: 1, borderColor: "#fed7aa",
  },
  provinceSelectedText: { flex: 1, fontSize: 14, fontWeight: "600", color: "#c2410c" },
  provinceDropdown: {
    marginTop: 6, borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb",
    backgroundColor: "#fff", overflow: "hidden",
  },
  provinceItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  provinceItemActive: { backgroundColor: "#fff7ed" },
  provinceItemText: { fontSize: 14, color: "#374151" },
  provinceItemTextActive: { color: "#c2410c", fontWeight: "600" },
  provinceNoResult: { fontSize: 13, color: "#9ca3af", textAlign: "center", paddingVertical: 12 },

  gpsLoading: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  gpsLoadingText: { fontSize: 13, color: "#9ca3af" },

  modalApplyBtn: {
    backgroundColor: "#f97316", borderRadius: 12,
    paddingVertical: 14, alignItems: "center", marginTop: 8,
  },
  modalApplyText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  modalResetBtn: { alignItems: "center", paddingVertical: 12 },
  modalResetText: { fontSize: 13, color: "#9ca3af" },
});
