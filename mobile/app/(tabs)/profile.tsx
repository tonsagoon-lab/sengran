import { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { supabase } from "../../lib/supabase";
import { resolveImageUrl } from "../../lib/image-url";
import { SessionContext, UnreadCountsContext } from "../_layout";
import type { Listing } from "../../lib/types";

type TabKey = "saved" | "messages" | "notifications" | "edit";

type UserProfile = {
  display_name: string | null;
  mobile: string | null;
  line_id: string | null;
  avatar_url: string | null;
};

type Conversation = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  updated_at: string;
  listings: { title: string; slug: string } | null;
};

type AppNotification = {
  id: string;
  read_at: string | null;
  created_at: string;
  listing_id: string | null;
  listings: {
    slug: string;
    title: string;
    listing_type: string;
    listing_images: { storage_path: string; display_order: number }[];
    provinces: { name_th: string } | null;
  } | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "เมื่อกี้";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} วันที่แล้ว`;
  return new Date(dateStr).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

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

function priceUnit(item: Listing): string {
  if (item.listing_type === "rent") return "/ด.";
  if (item.listing_type === "both" && !item.sale_price && item.rent_price) return "/ด.";
  return "";
}

const TYPE_CFG = {
  sale: { bg: "#dbeafe", border: "#bfdbfe", text: "#1d4ed8", label: "เซ้ง" },
  rent: { bg: "#dcfce7", border: "#bbf7d0", text: "#15803d", label: "ให้เช่า" },
  both: { bg: "#f3e8ff", border: "#e9d5ff", text: "#7e22ce", label: "เซ้ง+เช่า" },
};

// ─── Saved Tab ────────────────────────────────────────────────────────────────

type SavedFilter = "all" | "sale" | "rent";

function SavedRow({ item, onPress, onUnsave }: { item: Listing; onPress: () => void; onUnsave: () => void }) {
  const cover = item.listing_images.slice().sort((a, b) => a.display_order - b.display_order)[0];
  const [imgErr, setImgErr] = useState(false);
  const cfg = TYPE_CFG[item.listing_type];

  return (
    <Pressable style={ss.row} onPress={onPress}>
      <View style={ss.imgWrap}>
        {cover && !imgErr ? (
          <Image source={{ uri: resolveImageUrl(cover.storage_path) }} style={ss.img} onError={() => setImgErr(true)} />
        ) : (
          <View style={[ss.img, ss.imgPlaceholder]}><Text style={{ fontSize: 22 }}>🏪</Text></View>
        )}
      </View>
      <View style={ss.body}>
        <View style={ss.topRow}>
          <View style={[ss.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            <Text style={[ss.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
          </View>
          <Text style={ss.date}>{item.published_at ? new Date(item.published_at).toLocaleDateString("th-TH", { day: "numeric", month: "short" }) : ""}</Text>
        </View>
        <Text style={ss.title} numberOfLines={2}>{item.title}</Text>
        {(item.district || item.provinces) && (
          <View style={ss.loc}>
            <Ionicons name="location-outline" size={11} color="#9ca3af" />
            <Text style={ss.locText} numberOfLines={1}>{[item.district, item.provinces?.name_th].filter(Boolean).join(", ")}</Text>
          </View>
        )}
        <View style={ss.priceRow}>
          <Text style={ss.price}>{priceText(item)}</Text>
          {priceUnit(item) ? <Text style={ss.priceUnit}>{priceUnit(item)}</Text> : null}
        </View>
      </View>
      <Pressable style={ss.heartBtn} onPress={onUnsave}>
        <Ionicons name="heart" size={20} color="#ef4444" />
      </Pressable>
    </Pressable>
  );
}

function SavedTab() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<SavedFilter>("all");

  useFocusEffect(useCallback(() => { loadSaved(); }, []));

  async function loadSaved() {
    setLoading(true);
    const { data } = await supabase
      .from("favorites")
      .select(`listing_id, listings(
        id, slug, title, listing_type, sale_price, rent_price, district,
        is_featured, published_at,
        listing_images(id, storage_path, display_order),
        categories(name_th, slug), provinces(name_th, slug)
      )`)
      .order("created_at", { ascending: false });
    setListings(((data ?? []).map((f: any) => f.listings).filter(Boolean)) as unknown as Listing[]);
    setLoading(false);
  }

  async function unsave(id: string) {
    setListings((prev) => prev.filter((l) => l.id !== id));
    await supabase.from("favorites").delete().eq("listing_id", id);
  }

  const filtered = filter === "all" ? listings : listings.filter((l) =>
    filter === "sale" ? l.listing_type === "sale" || l.listing_type === "both"
    : l.listing_type === "rent" || l.listing_type === "both"
  );

  const FILTERS: { key: SavedFilter; label: string }[] = [
    { key: "all", label: "ทั้งหมด" },
    { key: "sale", label: "เซ้ง" },
    { key: "rent", label: "ให้เช่า" },
  ];

  if (loading) return <View style={ss.center}><ActivityIndicator size="large" color="#f97316" /></View>;

  return (
    <View style={{ flex: 1 }}>
      <View style={ss.filterRow}>
        {FILTERS.map((f) => {
          const count = f.key === "all" ? listings.length
            : listings.filter((l) => f.key === "sale"
              ? l.listing_type === "sale" || l.listing_type === "both"
              : l.listing_type === "rent" || l.listing_type === "both").length;
          const active = filter === f.key;
          return (
            <Pressable key={f.key} style={[ss.fTab, active && ss.fTabActive]} onPress={() => setFilter(f.key)}>
              <Text style={[ss.fTabText, active && ss.fTabTextActive]}>{f.label}</Text>
              {count > 0 && (
                <View style={[ss.fCount, active && ss.fCountActive]}>
                  <Text style={[ss.fCountText, active && ss.fCountTextActive]}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SavedRow item={item} onPress={() => router.push(`/listing/${item.slug}`)} onUnsave={() => unsave(item.id)} />
        )}
        contentContainerStyle={ss.listContent}
        style={{ backgroundColor: "#f9fafb" }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadSaved(); setRefreshing(false); }} tintColor="#f97316" />}
        ListEmptyComponent={
          <View style={ss.empty}>
            <Ionicons name="bookmark-outline" size={48} color="#d1d5db" />
            <Text style={ss.emptyTitle}>ยังไม่มีประกาศที่บันทึก</Text>
            <Pressable onPress={() => router.push("/(tabs)/browse")}>
              <Text style={ss.emptyLink}>เริ่มค้นหา →</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

// ─── Messages Tab ─────────────────────────────────────────────────────────────

function MessagesTab({ userId }: { userId: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadConversations(); }, [userId]));

  async function loadConversations() {
    setLoading(true);
    const { data, error } = await supabase
      .from("conversations")
      .select("id, listing_id, buyer_id, seller_id, created_at, updated_at, listings(title, slug)")
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order("updated_at", { ascending: false });
    if (error) console.error("conversations:", error.message);
    setConversations((data ?? []) as unknown as Conversation[]);
    setLoading(false);
  }

  if (loading) return <View style={ms.center}><ActivityIndicator size="large" color="#f97316" /></View>;

  return (
    <FlatList
      data={conversations}
      keyExtractor={(c) => c.id}
      style={{ backgroundColor: "#f9fafb" }}
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadConversations(); setRefreshing(false); }} tintColor="#f97316" />}
      ListEmptyComponent={
        <View style={ms.empty}>
          <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
          <Text style={ms.emptyTitle}>ยังไม่มีข้อความ</Text>
          <Text style={ms.emptySub}>เริ่มสนทนากับผู้ขายจากหน้าประกาศ</Text>
        </View>
      }
      renderItem={({ item }) => {
        const isMe = item.buyer_id === userId;
        const role = isMe ? "ฉัน (ผู้สนใจ)" : "ผู้สนใจ";
        const initial = item.listings?.title?.charAt(0)?.toUpperCase() ?? "?";
        return (
          <Pressable
            style={ms.row}
            onPress={() => router.push({ pathname: `/messages/${item.listing_id}`, params: { convId: item.id } })}
          >
            <View style={ms.avatar}><Text style={ms.avatarText}>{initial}</Text></View>
            <View style={ms.body}>
              <Text style={ms.convTitle} numberOfLines={2}>{item.listings?.title ?? "ประกาศ"}</Text>
              <Text style={ms.role}>{role}</Text>
            </View>
            <View style={ms.right}>
              <Text style={ms.date}>{timeAgo(item.updated_at)}</Text>
              <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
            </View>
          </Pressable>
        );
      }}
    />
  );
}

// ─── Alert Preferences ───────────────────────────────────────────────────────

type AlertPref = {
  id: string | null;
  is_active: boolean;
  listing_type: string | null;
  category_id: number | null;
  province_ids: number[];
  min_price: number | null;
  max_price: number | null;
  center_lat: number | null;
  center_lng: number | null;
  radius_km: number | null;
};

type Province = { id: number; name_th: string };
type Category = { id: number; name_th: string };

const EMPTY_FORM: Omit<AlertPref, "id"> = {
  is_active: true,
  listing_type: null,
  category_id: null,
  province_ids: [],
  min_price: null,
  max_price: null,
  center_lat: null,
  center_lng: null,
  radius_km: null,
};

const TYPE_OPTS: { key: string | null; label: string }[] = [
  { key: null, label: "ทุกประเภท" },
  { key: "sale", label: "เซ้ง" },
  { key: "rent", label: "ให้เช่า" },
  { key: "both", label: "เซ้งและให้เช่า" },
];

const RADIUS_OPTS = [5, 10, 25, 50];

function prefSummary(pref: AlertPref, provinces: Province[], categories: Category[]): string {
  const parts: string[] = [];
  if (pref.center_lat !== null && pref.radius_km !== null) {
    parts.push(`ใกล้ฉัน ${pref.radius_km} กม.`);
  } else if (pref.province_ids.length === 0) {
    parts.push("ทุกจังหวัด");
  } else {
    parts.push(pref.province_ids.map((id) => provinces.find((p) => p.id === id)?.name_th ?? "?").join(", "));
  }
  if (pref.category_id) {
    const cat = categories.find((c) => c.id === pref.category_id);
    if (cat) parts.push(cat.name_th);
  }
  const typeLabel = TYPE_OPTS.find((t) => t.key === pref.listing_type)?.label;
  if (pref.listing_type !== null && typeLabel) parts.push(typeLabel);
  if (pref.max_price) parts.push(`ไม่เกิน ${pref.max_price.toLocaleString("th-TH")} บาท`);
  else if (pref.min_price) parts.push(`ตั้งแต่ ${pref.min_price.toLocaleString("th-TH")} บาท`);
  return parts.join(" • ");
}

function AlertFormModal({
  visible,
  initial,
  provinces,
  categories,
  onClose,
  onSave,
}: {
  visible: boolean;
  initial: Omit<AlertPref, "id">;
  provinces: Province[];
  categories: Category[];
  onClose: () => void;
  onSave: (form: Omit<AlertPref, "id">) => void;
}) {
  const [form, setForm] = useState<Omit<AlertPref, "id">>(initial);
  const [locMode, setLocMode] = useState<"province" | "nearby">(
    initial.center_lat !== null ? "nearby" : "province"
  );
  const [provinceSearch, setProvinceSearch] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [minStr, setMinStr] = useState(initial.min_price ? String(initial.min_price) : "");
  const [maxStr, setMaxStr] = useState(initial.max_price ? String(initial.max_price) : "");
  const [catOpen, setCatOpen] = useState(false);

  useEffect(() => {
    setForm(initial);
    setLocMode(initial.center_lat !== null ? "nearby" : "province");
    setMinStr(initial.min_price ? String(initial.min_price) : "");
    setMaxStr(initial.max_price ? String(initial.max_price) : "");
    setProvinceSearch("");
  }, [visible]);

  const filteredProvinces = provinceSearch.trim()
    ? provinces.filter((p) => p.name_th.includes(provinceSearch.trim()))
    : provinces;

  function toggleProvince(id: number) {
    setForm((f) => ({
      ...f,
      province_ids: f.province_ids.includes(id)
        ? f.province_ids.filter((x) => x !== id)
        : [...f.province_ids, id],
    }));
  }

  async function fetchGPS() {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { Alert.alert("ไม่สามารถเข้าถึงตำแหน่ง"); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setForm((f) => ({
        ...f,
        center_lat: loc.coords.latitude,
        center_lng: loc.coords.longitude,
        radius_km: f.radius_km ?? 10,
        province_ids: [],
      }));
    } catch {
      Alert.alert("ไม่สามารถดึงตำแหน่งได้ ลองอีกครั้ง");
    } finally {
      setGpsLoading(false);
    }
  }

  function handleSave() {
    const minPrice = minStr.trim() ? parseInt(minStr.replace(/,/g, ""), 10) : null;
    const maxPrice = maxStr.trim() ? parseInt(maxStr.replace(/,/g, ""), 10) : null;
    const final: Omit<AlertPref, "id"> = {
      ...form,
      min_price: isNaN(minPrice as number) ? null : minPrice,
      max_price: isNaN(maxPrice as number) ? null : maxPrice,
      ...(locMode === "province"
        ? { center_lat: null, center_lng: null, radius_km: null }
        : { province_ids: [] }),
    };
    onSave(final);
  }

  const selectedCat = categories.find((c) => c.id === form.category_id);

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={af.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end" }}>
          <View style={af.sheet}>
            {/* Header */}
            <View style={af.sheetHeader}>
              <Text style={af.sheetTitle}>เงื่อนไขการแจ้งเตือน</Text>
              <Pressable onPress={onClose} style={af.closeBtn}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={af.sheetBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {/* Location mode tabs */}
              <Text style={af.sectionLabel}>ตำแหน่ง <Text style={af.sectionHint}>(ไม่เลือก = ทุกจังหวัด)</Text></Text>
              <View style={af.locTabs}>
                <Pressable
                  style={[af.locTab, locMode === "province" && af.locTabActive]}
                  onPress={() => setLocMode("province")}
                >
                  <Ionicons name="map-outline" size={14} color={locMode === "province" ? "#c2410c" : "#6b7280"} />
                  <Text style={[af.locTabText, locMode === "province" && af.locTabTextActive]}>เลือกจังหวัด</Text>
                </Pressable>
                <Pressable
                  style={[af.locTab, locMode === "nearby" && af.locTabActive]}
                  onPress={() => setLocMode("nearby")}
                >
                  <Ionicons name="navigate-outline" size={14} color={locMode === "nearby" ? "#c2410c" : "#6b7280"} />
                  <Text style={[af.locTabText, locMode === "nearby" && af.locTabTextActive]}>ใกล้ฉัน</Text>
                </Pressable>
              </View>

              {locMode === "province" ? (
                <View style={af.provinceBox}>
                  <TextInput
                    style={af.searchInput}
                    placeholder="ค้นหาจังหวัด..."
                    value={provinceSearch}
                    onChangeText={setProvinceSearch}
                    placeholderTextColor="#9ca3af"
                  />
                  <ScrollView style={af.provinceList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {filteredProvinces.map((p) => {
                      const checked = form.province_ids.includes(p.id);
                      return (
                        <Pressable key={p.id} style={af.checkRow} onPress={() => toggleProvince(p.id)}>
                          <View style={[af.checkbox, checked && af.checkboxChecked]}>
                            {checked && <Ionicons name="checkmark" size={13} color="#fff" />}
                          </View>
                          <Text style={af.checkLabel}>{p.name_th}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  {form.province_ids.length > 0 && (
                    <Pressable onPress={() => setForm((f) => ({ ...f, province_ids: [] }))}>
                      <Text style={af.clearText}>ล้างทั้งหมด ({form.province_ids.length} จังหวัด)</Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <View style={af.nearbyBox}>
                  <View style={af.radiusPills}>
                    {RADIUS_OPTS.map((r) => {
                      const active = form.radius_km === r;
                      return (
                        <Pressable
                          key={r}
                          style={[af.radiusPill, active && af.radiusPillActive]}
                          onPress={() => setForm((f) => ({ ...f, radius_km: r }))}
                        >
                          <Text style={[af.radiusPillText, active && af.radiusPillTextActive]}>{r} กม.</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Pressable style={af.gpsBtn} onPress={fetchGPS} disabled={gpsLoading}>
                    {gpsLoading
                      ? <ActivityIndicator size="small" color="#f97316" />
                      : <Ionicons name="locate-outline" size={16} color="#f97316" />
                    }
                    <Text style={af.gpsBtnText}>
                      {form.center_lat !== null ? "อัปเดตตำแหน่ง" : "ดึงตำแหน่งปัจจุบัน"}
                    </Text>
                  </Pressable>
                  {form.center_lat !== null && (
                    <Text style={af.coordText}>
                      ตำแหน่ง: {form.center_lat.toFixed(4)}, {form.center_lng?.toFixed(4)}
                    </Text>
                  )}
                </View>
              )}

              {/* Category */}
              <Text style={[af.sectionLabel, { marginTop: 16 }]}>หมวดหมู่ร้าน <Text style={af.sectionHint}>(ไม่เลือก = ทุกหมวด)</Text></Text>
              <Pressable style={af.catSelect} onPress={() => setCatOpen((v) => !v)}>
                <Text style={[af.catSelectText, !selectedCat && { color: "#9ca3af" }]}>
                  {selectedCat?.name_th ?? "ทุกหมวดหมู่"}
                </Text>
                <Ionicons name={catOpen ? "chevron-up" : "chevron-down"} size={16} color="#6b7280" />
              </Pressable>
              {catOpen && (
                <View style={af.catDropdown}>
                  <Pressable
                    style={[af.catOption, form.category_id === null && af.catOptionActive]}
                    onPress={() => { setForm((f) => ({ ...f, category_id: null })); setCatOpen(false); }}
                  >
                    <Text style={[af.catOptionText, form.category_id === null && af.catOptionTextActive]}>ทุกหมวดหมู่</Text>
                  </Pressable>
                  {categories.map((c) => (
                    <Pressable
                      key={c.id}
                      style={[af.catOption, form.category_id === c.id && af.catOptionActive]}
                      onPress={() => { setForm((f) => ({ ...f, category_id: c.id })); setCatOpen(false); }}
                    >
                      <Text style={[af.catOptionText, form.category_id === c.id && af.catOptionTextActive]}>{c.name_th}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Listing type */}
              <Text style={[af.sectionLabel, { marginTop: 16 }]}>ประเภทประกาศ</Text>
              <View style={af.typePills}>
                {TYPE_OPTS.map((t) => {
                  const active = form.listing_type === t.key;
                  return (
                    <Pressable
                      key={String(t.key)}
                      style={[af.typePill, active && af.typePillActive]}
                      onPress={() => setForm((f) => ({ ...f, listing_type: t.key }))}
                    >
                      <Text style={[af.typePillText, active && af.typePillTextActive]}>{t.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Price range */}
              <Text style={[af.sectionLabel, { marginTop: 16 }]}>ช่วงราคา <Text style={af.sectionHint}>(ไม่กรอก = ไม่จำกัด)</Text></Text>
              <View style={af.priceRow}>
                <TextInput
                  style={af.priceInput}
                  placeholder="ราคาต่ำสุด"
                  value={minStr}
                  onChangeText={setMinStr}
                  keyboardType="numeric"
                  placeholderTextColor="#9ca3af"
                />
                <Text style={af.priceDash}>—</Text>
                <TextInput
                  style={af.priceInput}
                  placeholder="ราคาสูงสุด"
                  value={maxStr}
                  onChangeText={setMaxStr}
                  keyboardType="numeric"
                  placeholderTextColor="#9ca3af"
                />
                <Text style={af.priceUnit}>บาท</Text>
              </View>

            </ScrollView>

            {/* Save button */}
            <View style={af.sheetFooter}>
              <Pressable style={af.saveBtn} onPress={handleSave}>
                <Text style={af.saveBtnText}>เพิ่มเงื่อนไข</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function AlertPrefsCard({ userId }: { userId: string }) {
  const [prefs, setPrefs] = useState<AlertPref[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPref, setEditingPref] = useState<AlertPref | null>(null);

  useEffect(() => { loadAll(); }, [userId]);

  async function loadAll() {
    const [prefsRes, provRes, catRes] = await Promise.all([
      supabase.from("alert_preferences")
        .select("id, is_active, listing_type, category_id, province_ids, min_price, max_price, center_lat, center_lng, radius_km")
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
      supabase.from("provinces").select("id, name_th").order("name_th"),
      supabase.from("categories").select("id, name_th").order("name_th"),
    ]);
    setPrefs((prefsRes.data ?? []) as unknown as AlertPref[]);
    setProvinces((provRes.data ?? []) as Province[]);
    setCategories((catRes.data ?? []) as Category[]);
    setLoaded(true);
  }

  async function toggleActive(pref: AlertPref) {
    setPrefs((prev) => prev.map((p) => p.id === pref.id ? { ...p, is_active: !p.is_active } : p));
    await supabase.from("alert_preferences").update({ is_active: !pref.is_active }).eq("id", pref.id);
  }

  async function deletePref(id: string) {
    Alert.alert("ลบเงื่อนไข", "ต้องการลบเงื่อนไขนี้ใช่ไหม?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ", style: "destructive",
        onPress: async () => {
          setPrefs((prev) => prev.filter((p) => p.id !== id));
          await supabase.from("alert_preferences").delete().eq("id", id);
        },
      },
    ]);
  }

  async function savePref(form: Omit<AlertPref, "id">) {
    if (editingPref?.id) {
      const { data } = await supabase.from("alert_preferences")
        .update({ ...form })
        .eq("id", editingPref.id)
        .select("id, is_active, listing_type, category_id, province_ids, min_price, max_price, center_lat, center_lng, radius_km")
        .single();
      if (data) setPrefs((prev) => prev.map((p) => p.id === editingPref.id ? data as unknown as AlertPref : p));
    } else {
      const { data } = await supabase.from("alert_preferences")
        .insert({ user_id: userId, ...form })
        .select("id, is_active, listing_type, category_id, province_ids, min_price, max_price, center_lat, center_lng, radius_km")
        .single();
      if (data) setPrefs((prev) => [...prev, data as unknown as AlertPref]);
    }
    setModalVisible(false);
    setEditingPref(null);
  }

  if (!loaded) return <View style={{ height: 80, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color="#f97316" /></View>;

  const formInitial = editingPref
    ? { is_active: editingPref.is_active, listing_type: editingPref.listing_type, category_id: editingPref.category_id, province_ids: editingPref.province_ids, min_price: editingPref.min_price, max_price: editingPref.max_price, center_lat: editingPref.center_lat, center_lng: editingPref.center_lng, radius_km: editingPref.radius_km }
    : EMPTY_FORM;

  return (
    <View style={ap.section}>
      {/* Header */}
      <View style={ap.sectionHeader}>
        <View style={ap.sectionLeft}>
          <Ionicons name="notifications" size={20} color="#f97316" />
          <View>
            <Text style={ap.sectionTitle}>แจ้งเตือนร้านเซ้ง</Text>
            <Text style={ap.sectionSub}>แจ้งเตือนเมื่อมีประกาศใหม่ที่ตรงกับที่คุณสนใจ</Text>
          </View>
        </View>
        <Pressable style={ap.addBtn} onPress={() => { setEditingPref(null); setModalVisible(true); }}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={ap.addBtnText}>เพิ่มเงื่อนไข</Text>
        </Pressable>
      </View>

      {/* Pref list */}
      {prefs.length > 0 && (
        <View style={ap.prefList}>
          {prefs.map((pref) => (
            <View key={pref.id ?? "new"} style={ap.prefRow}>
              <Switch
                value={pref.is_active}
                onValueChange={() => toggleActive(pref)}
                trackColor={{ false: "#e5e7eb", true: "#f97316" }}
                thumbColor="#fff"
              />
              <View style={{ flex: 1 }}>
                <Text style={ap.prefSummary} numberOfLines={2}>{prefSummary(pref, provinces, categories)}</Text>
                <Text style={ap.prefStatus}>{pref.is_active ? "รับการแจ้งเตือน" : "หยุดรับการแจ้งเตือน"}</Text>
              </View>
              <View style={ap.prefActions}>
                <Pressable style={ap.actionBtn} onPress={() => { setEditingPref(pref); setModalVisible(true); }}>
                  <Ionicons name="pencil-outline" size={16} color="#6b7280" />
                </Pressable>
                <Pressable style={ap.actionBtn} onPress={() => deletePref(pref.id!)}>
                  <Ionicons name="trash-outline" size={16} color="#6b7280" />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={ap.divider} />
      <Text style={ap.notifHeader}><Ionicons name="notifications-outline" size={14} /> การแจ้งเตือน</Text>

      <AlertFormModal
        visible={modalVisible}
        initial={formInitial}
        provinces={provinces}
        categories={categories}
        onClose={() => { setModalVisible(false); setEditingPref(null); }}
        onSave={savePref}
      />
    </View>
  );
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

function NotificationsTab({ userId, onRead }: { userId: string; onRead: () => void }) {
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [userId])
  );

  async function loadNotifications() {
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select(`
        id, read_at, created_at, listing_id,
        listings(
          slug, title, listing_type,
          listing_images(storage_path, display_order),
          provinces(name_th)
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    setNotifs((data ?? []) as unknown as AppNotification[]);
    setLoading(false);

    const hasUnread = (data ?? []).some((n: any) => !n.read_at);
    if (hasUnread) {
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("read_at", null);
      onRead();
    }
  }

  if (loading) return <View style={ns.center}><ActivityIndicator size="large" color="#f97316" /></View>;

  return (
    <FlatList
      data={notifs}
      keyExtractor={(n) => n.id}
      style={{ backgroundColor: "#f9fafb" }}
      contentContainerStyle={{ flexGrow: 1 }}
      ListHeaderComponent={<AlertPrefsCard userId={userId} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadNotifications(); setRefreshing(false); }} tintColor="#f97316" />}
      ListEmptyComponent={
        <View style={ns.empty}>
          <Ionicons name="notifications-outline" size={48} color="#d1d5db" />
          <Text style={ns.emptyTitle}>ยังไม่มีการแจ้งเตือน</Text>
          <Text style={ns.emptySub}>เมื่อมีประกาศใหม่ที่คุณสนใจ จะแจ้งเตือนที่นี่</Text>
        </View>
      }
      renderItem={({ item }) => {
        const isUnread = !item.read_at;
        const listing = item.listings;
        const cover = listing?.listing_images
          ?.slice()
          ?.sort((a, b) => a.display_order - b.display_order)[0];
        const cfg = listing ? TYPE_CFG[listing.listing_type as keyof typeof TYPE_CFG] : null;

        return (
          <Pressable
            style={[ns.row, isUnread && ns.rowUnread]}
            onPress={() => listing && router.push(`/listing/${listing.slug}`)}
          >
            {isUnread && <View style={ns.unreadDot} />}
            <View style={ns.imgWrap}>
              {cover ? (
                <Image source={{ uri: resolveImageUrl(cover.storage_path) }} style={ns.img} />
              ) : (
                <View style={[ns.img, ns.imgPlaceholder]}><Text style={{ fontSize: 20 }}>🏪</Text></View>
              )}
            </View>
            <View style={ns.body}>
              <Text style={ns.label}>มีประกาศใหม่ที่น่าสนใจ</Text>
              <Text style={ns.title} numberOfLines={2}>{listing?.title ?? "ประกาศ"}</Text>
              <View style={ns.metaRow}>
                {cfg && (
                  <View style={[ns.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                    <Text style={[ns.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
                  </View>
                )}
                {listing?.provinces && (
                  <View style={ns.locRow}>
                    <Ionicons name="location-outline" size={11} color="#9ca3af" />
                    <Text style={ns.locText}>{listing.provinces.name_th}</Text>
                  </View>
                )}
              </View>
              <Text style={ns.time}>{timeAgo(item.created_at)}</Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

// ─── Edit Profile Tab ─────────────────────────────────────────────────────────

function EditTab({ initialProfile, email, onSaved }: { initialProfile: UserProfile | null; email: string; onSaved: (p: UserProfile) => void }) {
  const [displayName, setDisplayName] = useState(initialProfile?.display_name ?? "");
  const [mobile, setMobile] = useState(initialProfile?.mobile ?? "");
  const [lineId, setLineId] = useState(initialProfile?.line_id ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialProfile) {
      setDisplayName(initialProfile.display_name ?? "");
      setMobile(initialProfile.mobile ?? "");
      setLineId(initialProfile.line_id ?? "");
    }
  }, [initialProfile]);

  async function handleSave() {
    if (!displayName.trim() || !mobile.trim()) { Alert.alert("กรุณากรอก", "ชื่อที่แสดงและเบอร์โทร"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const updates = { display_name: displayName.trim(), mobile: mobile.trim(), line_id: lineId.trim() || null };
    const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
    setSaving(false);
    if (error) Alert.alert("เกิดข้อผิดพลาด", error.message);
    else { Alert.alert("บันทึกแล้ว", "อัปเดตข้อมูลโปรไฟล์เรียบร้อย"); onSaved({ ...initialProfile, ...updates } as UserProfile); }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={es.content} keyboardShouldPersistTaps="handled">
        <View style={es.emailBox}><Text style={es.emailText}>{email}</Text></View>
        <Text style={es.label}>ชื่อที่แสดง *</Text>
        <TextInput style={es.input} placeholder="ชื่อร้านหรือชื่อผู้ติดต่อ" value={displayName} onChangeText={setDisplayName} />
        <Text style={es.label}>เบอร์โทร *</Text>
        <TextInput style={es.input} placeholder="0812345678" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
        <Text style={es.label}>LINE ID</Text>
        <TextInput style={es.input} placeholder="yourlineid" value={lineId} onChangeText={setLineId} autoCapitalize="none" />
        <Pressable style={[es.saveBtn, saving && es.btnDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={es.saveBtnText}>บันทึก</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const session = useContext(SessionContext);
  const { counts, refresh: refreshCounts } = useContext(UnreadCountsContext);
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("saved");
  const [userId, setUserId] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    if (session) loadProfile();
    // สลับ tab ถ้ามี param ส่งมา
    if (tabParam === "notifications" || tabParam === "messages" || tabParam === "edit" || tabParam === "saved") {
      setActiveTab(tabParam as TabKey);
    }
  }, [session, tabParam]));

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setProfileLoading(false); return; }
    setUserId(user.id);
    setEmail(user.email ?? "");
    const { data } = await supabase.from("profiles").select("display_name, mobile, line_id, avatar_url").eq("id", user.id).single();
    if (data) setProfile(data);
    setProfileLoading(false);
  }

  async function handleLogout() {
    Alert.alert("ออกจากระบบ", "ยืนยันการออกจากระบบ?", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ออกจากระบบ", style: "destructive", onPress: () => supabase.auth.signOut() },
    ]);
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.guestContainer}>
          <Text style={styles.guestEmoji}>👤</Text>
          <Text style={styles.guestTitle}>ยังไม่ได้เข้าสู่ระบบ</Text>
          <Text style={styles.guestSub}>เข้าสู่ระบบเพื่อลงประกาศและจัดการโปรไฟล์</Text>
          <Pressable style={styles.loginBtn} onPress={() => router.push("/auth/login")}>
            <Text style={styles.loginBtnText}>เข้าสู่ระบบ</Text>
          </Pressable>
          <Pressable style={styles.registerBtn} onPress={() => router.push("/auth/register")}>
            <Text style={styles.registerBtnText}>สมัครสมาชิก</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (profileLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ActivityIndicator style={{ flex: 1 }} size="large" color="#f97316" />
      </SafeAreaView>
    );
  }

  const initial = profile?.display_name?.charAt(0)?.toUpperCase() ?? email.charAt(0).toUpperCase();

  type TabDef = { key: TabKey; label: string; icon: string; badge?: number };
  const TABS: TabDef[] = [
    { key: "saved",         label: "บันทึก",          icon: "bookmark-outline" },
    { key: "messages",      label: "ข้อความ",          icon: "chatbubble-outline",   badge: counts.messages },
    { key: "notifications", label: "แจ้งเตือน",        icon: "notifications-outline", badge: counts.notifications },
    { key: "edit",          label: "แก้ไขโปรไฟล์",    icon: "create-outline" },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* User header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.displayName} numberOfLines={1}>{profile?.display_name ?? "ผู้ใช้"}</Text>
            <Text style={styles.emailSub} numberOfLines={1}>{email}</Text>
          </View>
        </View>
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#dc2626" />
          <Text style={styles.logoutText}>ออก</Text>
        </Pressable>
      </View>

      {/* Inner tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((t) => {
          const active = activeTab === t.key;
          const hasBadge = (t.badge ?? 0) > 0;
          return (
            <Pressable key={t.key} style={[styles.tabItem, active && styles.tabItemActive]} onPress={() => setActiveTab(t.key)}>
              <View style={styles.tabIconWrap}>
                <Ionicons name={t.icon as any} size={16} color={active ? "#f97316" : "#9ca3af"} />
                {hasBadge && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{(t.badge ?? 0) > 9 ? "9+" : t.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Tab content */}
      {activeTab === "saved" && <SavedTab />}
      {activeTab === "messages" && userId && <MessagesTab userId={userId} />}
      {activeTab === "notifications" && userId && (
        <NotificationsTab userId={userId} onRead={refreshCounts} />
      )}
      {activeTab === "edit" && (
        <EditTab initialProfile={profile} email={email} onSaved={(p) => setProfile(p)} />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6", backgroundColor: "#fff",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#ffedd5", alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#fed7aa", flexShrink: 0,
  },
  avatarInitial: { fontSize: 18, fontWeight: "700", color: "#ea580c" },
  displayName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  emailSub: { fontSize: 12, color: "#9ca3af", marginTop: 1 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fff5f5", flexShrink: 0,
  },
  logoutText: { color: "#dc2626", fontSize: 13, fontWeight: "600" },

  tabBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f3f4f6", backgroundColor: "#fff" },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 10 },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: "#f97316" },
  tabIconWrap: { position: "relative" },
  tabBadge: {
    position: "absolute", top: -4, right: -8,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center",
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: "#fff",
  },
  tabBadgeText: { color: "#fff", fontSize: 8, fontWeight: "700" },
  tabLabel: { fontSize: 10, fontWeight: "500", color: "#9ca3af" },
  tabLabelActive: { color: "#f97316", fontWeight: "700" },

  guestContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  guestEmoji: { fontSize: 64, marginBottom: 8 },
  guestTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  guestSub: { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 22, marginBottom: 8 },
  loginBtn: { backgroundColor: "#f97316", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 48, width: "100%", alignItems: "center" },
  loginBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  registerBtn: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 48, width: "100%", alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb" },
  registerBtnText: { color: "#374151", fontSize: 16, fontWeight: "600" },
});

// Saved
const ss = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  filterRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f3f4f6", paddingHorizontal: 16, backgroundColor: "#fff" },
  fTab: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 10, paddingHorizontal: 4, marginRight: 16 },
  fTabActive: { borderBottomWidth: 2, borderBottomColor: "#f97316" },
  fTabText: { fontSize: 13, fontWeight: "500", color: "#6b7280" },
  fTabTextActive: { color: "#f97316", fontWeight: "700" },
  fCount: { backgroundColor: "#f3f4f6", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  fCountActive: { backgroundColor: "#fff7ed" },
  fCountText: { fontSize: 11, fontWeight: "600", color: "#6b7280" },
  fCountTextActive: { color: "#f97316" },
  listContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  row: { flexDirection: "row", gap: 12, padding: 12, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#f3f4f6", alignItems: "flex-start", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  imgWrap: { borderRadius: 10, overflow: "hidden", flexShrink: 0 },
  img: { width: 90, height: 90, resizeMode: "cover" },
  imgPlaceholder: { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 4 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  date: { fontSize: 10, color: "#9ca3af", marginLeft: "auto" },
  title: { fontSize: 13, fontWeight: "600", color: "#111827", lineHeight: 19 },
  loc: { flexDirection: "row", alignItems: "center", gap: 3 },
  locText: { fontSize: 11, color: "#9ca3af", flex: 1 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  price: { fontSize: 15, fontWeight: "700", color: "#f97316" },
  priceUnit: { fontSize: 11, color: "#9ca3af" },
  heartBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  badge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#374151" },
  emptyLink: { fontSize: 14, color: "#f97316", fontWeight: "600" },
});

// Messages
const ms = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#fff7ed", borderWidth: 1, borderColor: "#fed7aa", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#ea580c" },
  body: { flex: 1 },
  convTitle: { fontSize: 14, fontWeight: "600", color: "#111827", lineHeight: 20 },
  role: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  right: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 0 },
  date: { fontSize: 11, color: "#9ca3af" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#374151" },
  emptySub: { fontSize: 13, color: "#9ca3af" },
});

// Notifications
const ns = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  rowUnread: { backgroundColor: "#fff7ed" },
  unreadDot: { position: "absolute", left: 6, top: 18, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#f97316" },
  imgWrap: { borderRadius: 10, overflow: "hidden", flexShrink: 0 },
  img: { width: 70, height: 70, resizeMode: "cover" },
  imgPlaceholder: { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 4 },
  label: { fontSize: 11, color: "#9a3412", fontWeight: "600", backgroundColor: "#fff7ed", alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  title: { fontSize: 13, fontWeight: "600", color: "#111827", lineHeight: 19 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: "600" },
  locRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  locText: { fontSize: 11, color: "#9ca3af" },
  time: { fontSize: 11, color: "#9ca3af" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#374151" },
  emptySub: { fontSize: 13, color: "#9ca3af", textAlign: "center" },
});

// Alert Preferences card
const ap = StyleSheet.create({
  section: { backgroundColor: "#fff" },
  sectionHeader: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14, gap: 10,
  },
  sectionLeft: { flexDirection: "row", alignItems: "flex-start", gap: 10, flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  sectionSub: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#f97316", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, flexShrink: 0,
  },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  prefList: { paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  prefRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1, borderColor: "#e5e7eb",
    paddingHorizontal: 12, paddingVertical: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  prefSummary: { fontSize: 13, fontWeight: "600", color: "#111827", lineHeight: 19 },
  prefStatus: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  prefActions: { flexDirection: "row", gap: 4, flexShrink: 0 },
  actionBtn: { width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center", justifyContent: "center" },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginHorizontal: 16, marginTop: 8, marginBottom: 12 },
  notifHeader: { fontSize: 15, fontWeight: "700", color: "#111827", paddingHorizontal: 16, paddingBottom: 10 },
});

// Alert form modal
const af = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: "92%",
    shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
  },
  sheetHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  closeBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  sheetBody: { padding: 20, paddingBottom: 8, gap: 0 },
  sheetFooter: { padding: 16, borderTopWidth: 1, borderTopColor: "#f3f4f6" },

  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 8 },
  sectionHint: { fontSize: 12, fontWeight: "400", color: "#9ca3af" },

  locTabs: { flexDirection: "row", gap: 8, marginBottom: 10 },
  locTab: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb",
  },
  locTabActive: { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
  locTabText: { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  locTabTextActive: { color: "#c2410c", fontWeight: "700" },

  provinceBox: { borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", overflow: "hidden", marginBottom: 4 },
  searchInput: {
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14,
    borderBottomWidth: 1, borderBottomColor: "#e5e7eb", color: "#111827", backgroundColor: "#fff",
  },
  provinceList: { maxHeight: 200, backgroundColor: "#fff" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: "#d1d5db", alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: "#f97316", borderColor: "#f97316" },
  checkLabel: { fontSize: 14, color: "#374151", flex: 1 },
  clearText: { fontSize: 12, color: "#f97316", fontWeight: "600", padding: 10, textAlign: "center" },

  nearbyBox: { gap: 10, marginBottom: 4 },
  radiusPills: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  radiusPill: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999,
    borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb",
  },
  radiusPillActive: { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
  radiusPillText: { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  radiusPillTextActive: { color: "#c2410c", fontWeight: "700" },
  gpsBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderColor: "#fed7aa", borderRadius: 10,
    backgroundColor: "#fff7ed", paddingVertical: 11, paddingHorizontal: 16, alignSelf: "flex-start",
  },
  gpsBtnText: { fontSize: 14, color: "#c2410c", fontWeight: "600" },
  coordText: { fontSize: 11, color: "#9ca3af" },

  catSelect: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#fff",
  },
  catSelectText: { fontSize: 14, color: "#374151" },
  catDropdown: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, marginTop: 4, overflow: "hidden" },
  catOption: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
  catOptionActive: { backgroundColor: "#fff7ed" },
  catOptionText: { fontSize: 14, color: "#374151" },
  catOptionTextActive: { color: "#c2410c", fontWeight: "600" },

  typePills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typePill: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999,
    borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb",
  },
  typePillActive: { backgroundColor: "#f97316", borderColor: "#f97316" },
  typePillText: { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  typePillTextActive: { color: "#fff", fontWeight: "700" },

  priceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  priceInput: {
    flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: "#111827", backgroundColor: "#fff",
  },
  priceDash: { fontSize: 16, color: "#9ca3af" },
  priceUnit: { fontSize: 13, color: "#6b7280" },

  saveBtn: { backgroundColor: "#f97316", borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

// Edit
const es = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 4 },
  emailBox: { backgroundColor: "#f9fafb", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 8 },
  emailText: { fontSize: 13, color: "#6b7280", textAlign: "center" },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: "#e5e7eb", color: "#111827" },
  saveBtn: { backgroundColor: "#f97316", borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 24 },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
