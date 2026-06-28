import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { resolveImageUrl } from "../../lib/image-url";
import { NearMeEquipmentSection } from "../../components/NearMeEquipmentSection";
import type { Category, Listing, Province } from "../../lib/types";

const CARD_WIDTH = (Dimensions.get("window").width - 16 * 2 - 10) / 2;

const PAGE_SIZE = 20;
type SortKey = "newest" | "price_asc" | "price_desc";

function priceText(price: number | null): string {
  if (!price) return "";
  if (price >= 1_000_000) return `฿${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `฿${Math.round(price / 1000)}K`;
  return `฿${price.toLocaleString("th-TH")}`;
}

function getAgeBadge(published_at: string | null | undefined): string | null {
  if (!published_at) return null;
  const days = Math.floor((Date.now() - new Date(published_at).getTime()) / 86_400_000);
  if (days <= 10) return `ใหม่ ${Math.max(days, 1)} วัน`;
  return null;
}

function ConditionBadge({ condition }: { condition: string | null }) {
  const isNew = condition === "new";
  return (
    <View style={[styles.badge, { backgroundColor: isNew ? "#dcfce7" : "#dbeafe", borderColor: isNew ? "#bbf7d0" : "#bfdbfe" }]}>
      <Text style={[styles.badgeText, { color: isNew ? "#15803d" : "#1d4ed8" }]}>{isNew ? "มือ 1" : "มือ 2"}</Text>
    </View>
  );
}

function ListingCard({ item, onPress }: { item: Listing; onPress: () => void }) {
  const cover = (item.listing_images ?? [])
    .slice()
    .sort((a, b) => a.display_order - b.display_order)[0];
  const imageUrl = cover ? resolveImageUrl(cover.storage_path) : null;
  const [imgError, setImgError] = useState(false);
  const ageBadge = getAgeBadge(item.published_at);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const condition = (item as any).condition as string | null;
  const isNew = condition === "new";
  return (
    <Pressable style={[styles.card, { width: CARD_WIDTH }]} onPress={onPress}>
      <View style={styles.cardImgWrap}>
        {imageUrl && !imgError ? (
          <Image source={{ uri: imageUrl }} style={styles.cardImg} onError={() => setImgError(true)} />
        ) : (
          <View style={[styles.cardImg, styles.cardImgPlaceholder]}>
            <Text style={{ fontSize: 28 }}>🛒</Text>
          </View>
        )}
        <View style={styles.cardBadgeRow}>
          <View style={[styles.condBadge, { backgroundColor: isNew ? "#dcfce7" : "#dbeafe", borderColor: isNew ? "#bbf7d0" : "#bfdbfe" }]}>
            <Text style={[styles.condBadgeText, { color: isNew ? "#15803d" : "#1d4ed8" }]}>{isNew ? "มือ 1" : "มือ 2"}</Text>
          </View>
          {ageBadge && (
            <View style={styles.ageBadge}>
              <Text style={styles.ageBadgeText}>{ageBadge}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardPrice}>{priceText(item.sale_price)}</Text>
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

function OptionPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.optionPill, active && styles.optionPillActive]} onPress={onPress}>
      <Text style={[styles.optionPillText, active && styles.optionPillTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function BrowseScreen() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterShopType, setFilterShopType] = useState<number | null>(null);
  const [filterProvince, setFilterProvince] = useState<number | null>(null);
  const [filterCondition, setFilterCondition] = useState<"all" | "new" | "used">("all");
  const [provinceSearch, setProvinceSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [resultCount, setResultCount] = useState(0);
  const [showFilter, setShowFilter] = useState(false);
  const [activePicker, setActivePicker] = useState<null | "cat" | "province">(null);

  const page = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => { loadMeta(); }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  useEffect(() => { resetAndLoad(); }, [filterShopType, filterProvince, filterCondition, debouncedSearch, sortKey, minPrice, maxPrice]);

  async function loadMeta() {
    const [catsRes, provRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("categories").select("id, name_th, slug").eq("category_type", "shop").eq("is_active", true).neq("slug", "space-only").order("display_order"),
      supabase.from("provinces").select("id, name_th, slug").order("name_th"),
    ]);
    setCategories(catsRes.data ?? []);
    setProvinces(provRes.data ?? []);
  }

  function buildQuery(from: number, to: number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase as any)
      .from("listings")
      .select(
        `id, slug, title, listing_type, sale_price, condition, district, published_at,
         listing_images(id, storage_path, display_order),
         provinces(name_th, slug)`,
        { count: "exact" }
      )
      .eq("listing_type", "equipment")
      .in("status", ["published", "reserved"])
      .order("published_at", { ascending: false })
      .range(from, to);

    if (filterShopType) q = q.filter("shop_type_ids", "cs", `{${filterShopType}}`);
    if (filterProvince) q = q.eq("province_id", filterProvince);
    if (filterCondition !== "all") q = q.eq("condition", filterCondition);
    if (debouncedSearch.trim()) q = q.ilike("title", `%${debouncedSearch.trim()}%`);

    const min = minPrice ? Number(minPrice.replace(/,/g, "")) : null;
    const max = maxPrice ? Number(maxPrice.replace(/,/g, "")) : null;
    if (min) q = q.gte("sale_price", min);
    if (max) q = q.lte("sale_price", max);

    if (sortKey === "price_asc") q = q.order("sale_price", { ascending: true, nullsFirst: false });
    else if (sortKey === "price_desc") q = q.order("sale_price", { ascending: false, nullsFirst: false });
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
    setFilterShopType(null);
    setFilterProvince(null);
    setFilterCondition("all");
    setSortKey("newest");
    setMinPrice("");
    setMaxPrice("");
    setProvinceSearch("");
  }

  const hasActiveFilter = filterShopType !== null || filterProvince !== null || filterCondition !== "all" || sortKey !== "newest" || !!minPrice || !!maxPrice;

  const filteredProvinces = provinces.filter((p) =>
    provinceSearch ? p.name_th.includes(provinceSearch) : true
  );

  const renderItem = useCallback(
    ({ item }: { item: Listing }) => (
      <ListingCard item={item} onPress={() => router.push(`/listing/${item.slug}`)} />
    ), []
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>ขายอุปกรณ์</Text>
          {!loading && (
            <Text style={styles.topBarSub}>พบ {resultCount.toLocaleString("th-TH")} รายการ</Text>
          )}
        </View>
        <Pressable style={styles.filterIconBtn} onPress={() => setShowFilter(true)}>
          <Ionicons name="options-outline" size={22} color={hasActiveFilter ? "#f97316" : "#374151"} />
          {hasActiveFilter && <View style={styles.filterDot} />}
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={17} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="ค้นหาอุปกรณ์..."
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
          style={[styles.filterChip, filterCondition !== "all" && styles.filterChipActive]}
          onPress={() => {
            const next = filterCondition === "all" ? "new" : filterCondition === "new" ? "used" : "all";
            setFilterCondition(next);
          }}
        >
          <Text style={[styles.filterChipText, filterCondition !== "all" && styles.filterChipTextActive]} numberOfLines={1}>
            {filterCondition === "all" ? "สภาพ" : filterCondition === "new" ? "มือ 1" : "มือ 2"}
          </Text>
          <Ionicons name="chevron-down" size={12} color={filterCondition !== "all" ? "#c2410c" : "#6b7280"} />
        </Pressable>
        <Pressable
          style={[styles.filterChip, filterShopType !== null && styles.filterChipActive]}
          onPress={() => setActivePicker("cat")}
        >
          <Text style={[styles.filterChipText, filterShopType !== null && styles.filterChipTextActive]} numberOfLines={1}>
            {filterShopType !== null ? categories.find(c => c.id === filterShopType)?.name_th ?? "ประเภทร้าน" : "ประเภทร้าน"}
          </Text>
          <Ionicons name="chevron-down" size={12} color={filterShopType !== null ? "#c2410c" : "#6b7280"} />
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
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          style={{ backgroundColor: "#f9fafb" }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />}
          ListHeaderComponent={
            <View>
              <NearMeEquipmentSection />
              <View style={styles.latestHeader}>
                <Text style={styles.latestTitle}>🆕 อุปกรณ์ล่าสุด</Text>
                {!loading && <Text style={styles.latestCount}>{resultCount.toLocaleString("th-TH")} รายการ</Text>}
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={{ fontSize: 40 }}>🛒</Text>
              <Text style={styles.emptyTitle}>ไม่พบอุปกรณ์</Text>
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
            {activePicker === "cat" && (
              <>
                <Text style={styles.modalTitle}>ประเภทร้าน</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
                  <Pressable
                    style={[styles.pickerRow, filterShopType === null && styles.pickerRowActive]}
                    onPress={() => { setFilterShopType(null); setActivePicker(null); }}
                  >
                    <Text style={[styles.pickerRowText, filterShopType === null && styles.pickerRowTextActive]}>ทุกประเภท</Text>
                    {filterShopType === null && <Ionicons name="checkmark" size={18} color="#f97316" />}
                  </Pressable>
                  {categories.map((cat) => (
                    <Pressable
                      key={cat.id}
                      style={[styles.pickerRow, filterShopType === cat.id && styles.pickerRowActive]}
                      onPress={() => { setFilterShopType(cat.id); setActivePicker(null); }}
                    >
                      <Text style={[styles.pickerRowText, filterShopType === cat.id && styles.pickerRowTextActive]}>{cat.name_th}</Text>
                      {filterShopType === cat.id && <Ionicons name="checkmark" size={18} color="#f97316" />}
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

              {/* Condition */}
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>สภาพอุปกรณ์</Text>
                <View style={styles.optionRow}>
                  {(["all", "new", "used"] as const).map((c) => (
                    <OptionPill
                      key={c}
                      label={c === "all" ? "ทั้งหมด" : c === "new" ? "มือ 1" : "มือ 2"}
                      active={filterCondition === c}
                      onPress={() => setFilterCondition(c)}
                    />
                  ))}
                </View>
              </View>

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
                    { label: "< 1K", min: "", max: "1000" },
                    { label: "1K–10K", min: "1000", max: "10000" },
                    { label: "10K–50K", min: "10000", max: "50000" },
                    { label: "> 50K", min: "50000", max: "" },
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

              {/* Shop type */}
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>ประเภทร้าน</Text>
                <View style={styles.optionRow}>
                  <OptionPill label="ทั้งหมด" active={filterShopType === null} onPress={() => setFilterShopType(null)} />
                  {categories.map((cat) => (
                    <OptionPill key={cat.id} label={cat.name_th} active={filterShopType === cat.id} onPress={() => setFilterShopType(filterShopType === cat.id ? null : cat.id)} />
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
                    <Pressable onPress={() => { setProvinceSearch(""); setFilterProvince(null); }}>
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
                    <Pressable onPress={() => setFilterProvince(null)}>
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
                          onPress={() => { setFilterProvince(prov.id); setProvinceSearch(""); }}
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
  listContent: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 20 },
  columnWrapper: { gap: 10, marginBottom: 10 },
  latestHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  latestTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  latestCount: { fontSize: 12, color: "#9ca3af" },

  card: {
    backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1, borderColor: "#e5e7eb", overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardImgWrap: { position: "relative" },
  cardImg: { width: "100%", aspectRatio: 4 / 3, resizeMode: "cover" },
  cardImgPlaceholder: { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  cardBadgeRow: { position: "absolute", bottom: 6, left: 6, right: 6, flexDirection: "row", gap: 4, alignItems: "center" },
  condBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  condBadgeText: { fontSize: 10, fontWeight: "700" },
  ageBadge: { backgroundColor: "#fff7ed", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  ageBadgeText: { fontSize: 9, fontWeight: "600", color: "#ea580c" },
  cardBody: { padding: 10, gap: 3 },
  cardPrice: { fontSize: 15, fontWeight: "700", color: "#f97316" },
  cardTitle: { fontSize: 12, fontWeight: "500", color: "#374151", lineHeight: 17 },
  cardLoc: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  cardLocText: { fontSize: 11, color: "#9ca3af", flex: 1 },

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

  modalApplyBtn: {
    backgroundColor: "#f97316", borderRadius: 12,
    paddingVertical: 14, alignItems: "center", marginTop: 8,
  },
  modalApplyText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  modalResetBtn: { alignItems: "center", paddingVertical: 12 },
  modalResetText: { fontSize: 13, color: "#9ca3af" },
});
