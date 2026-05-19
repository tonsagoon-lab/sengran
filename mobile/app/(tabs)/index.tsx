import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { resolveImageUrl } from "../../lib/image-url";
import type { Category, Listing } from "../../lib/types";

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
function TypeBadge({ type, featured }: { type: BadgeType; featured?: boolean | null }) {
  const cfg = {
    sale: { bg: "#dbeafe", border: "#bfdbfe", text: "#1d4ed8", label: "เซ้ง" },
    rent: { bg: "#dcfce7", border: "#bbf7d0", text: "#15803d", label: "ให้เช่า" },
    both: { bg: "#f3e8ff", border: "#e9d5ff", text: "#7e22ce", label: "เซ้ง+เช่า" },
  }[type];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      {featured && <Text style={styles.badgeStar}>⭐</Text>}
      <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Vertical card (featured strip + latest grid) ─────────
function ListingCardV({
  item,
  width,
  onPress,
}: {
  item: Listing;
  width?: number;
  onPress: () => void;
}) {
  const cover = (item.listing_images ?? [])
    .slice()
    .sort((a, b) => a.display_order - b.display_order)[0];
  const imageUrl = cover ? resolveImageUrl(cover.storage_path) : null;
  const [imgError, setImgError] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.cardV, width ? { width } : undefined]}
    >
      <View style={styles.cardVImageWrap}>
        {imageUrl && !imgError ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.cardVImage}
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={[styles.cardVImage, styles.cardVImagePlaceholder]}>
            <Text style={{ fontSize: 28 }}>🏪</Text>
          </View>
        )}
        <View style={styles.cardVBadgeWrap}>
          <TypeBadge type={item.listing_type} featured={item.is_featured} />
        </View>
      </View>
      <View style={styles.cardVBody}>
        <View style={styles.cardVPriceRow}>
          <Text style={styles.cardVPrice}>{priceText(item)}</Text>
          {priceUnit(item) ? (
            <Text style={styles.cardVPriceUnit}>{priceUnit(item)}</Text>
          ) : null}
        </View>
        <Text style={styles.cardVTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {(item.district || item.provinces) && (
          <View style={styles.cardVLoc}>
            <Ionicons name="location-outline" size={11} color="#9ca3af" />
            <Text style={styles.cardVLocText} numberOfLines={1}>
              {[item.district, item.provinces?.name_th].filter(Boolean).join(", ")}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ─── Section header ──────────────────────────────────────
function SectionHeader({
  title,
  linkLabel,
  onLink,
}: {
  title: string;
  linkLabel?: string;
  onLink?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {linkLabel && (
        <Pressable onPress={onLink}>
          <Text style={styles.sectionLink}>{linkLabel} ›</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Category icons ──────────────────────────────────────
const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  UtensilsCrossed: "restaurant-outline",
  Coffee: "cafe-outline",
  Scissors: "cut-outline",
  Sparkles: "sparkles-outline",
  ShoppingBasket: "basket-outline",
  Car: "car-outline",
  Store: "storefront-outline",
  Music: "musical-notes-outline",
  WashingMachine: "water-outline",
  Layers: "layers-outline",
  Home: "home-outline",
  Building: "business-outline",
};

function getCatIcon(iconName: string | null): keyof typeof Ionicons.glyphMap {
  if (!iconName) return "storefront-outline";
  return CATEGORY_ICONS[iconName] ?? "storefront-outline";
}

const SCREEN_W = Dimensions.get("window").width;
const CAT_ITEM_W = Math.floor((SCREEN_W - 32 - 24) / 4); // 4 cols, 3 gaps of 8
const CARD_W = Math.floor((SCREEN_W - 32 - 10) / 2); // 2 cols, 1 gap of 10

// ─── Home screen ─────────────────────────────────────────
export default function HomeScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Listing[]>([]);
  const [latest, setLatest] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      // Load categories
      const catsRes = await supabase
        .from("categories")
        .select("id, name_th, slug, icon")
        .eq("is_active", true)
        .order("display_order")
        .limit(8);

      if (catsRes.error) {
        console.error("categories error:", catsRes.error.message);
      } else {
        setCategories((catsRes.data ?? []) as Category[]);
      }

      const listingsRes = await supabase
        .from("listings")
        .select(
          `id, slug, title, listing_type, sale_price, rent_price, district, is_featured,
           published_at,
           listing_images(id, storage_path, display_order),
           categories(name_th, slug), provinces(name_th, slug)`
        )
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(20);

      if (listingsRes.error) {
        setErrorMsg("listings: " + listingsRes.error.message);
      } else {
        const listings = (listingsRes.data ?? []) as unknown as Listing[];
        setFeatured(listings.filter((l) => l.is_featured).slice(0, 4));
        setLatest(listings.slice(0, 8));
      }
    } catch (e: any) {
      console.error("loadAll error:", e);
      setErrorMsg(String(e));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Debug error — remove after fixing */}
        {errorMsg && (
          <View style={{ margin: 16, padding: 12, backgroundColor: "#fef2f2", borderRadius: 8, borderWidth: 1, borderColor: "#fca5a5" }}>
            <Text style={{ color: "#dc2626", fontSize: 12 }}>Error: {errorMsg}</Text>
          </View>
        )}
        {/* Location header */}
        <View style={styles.locationHeader}>
          <View>
            <Text style={styles.locationLabel}>ตำแหน่งปัจจุบัน</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color="#f97316" />
              <Text style={styles.locationCity}>ทั่วประเทศไทย</Text>
              <Ionicons name="chevron-down" size={14} color="#9ca3af" />
            </View>
          </View>
          <View style={styles.headerIcons}>
            <Pressable style={styles.iconBtn} onPress={() => router.push("/browse")}>
              <Ionicons name="notifications-outline" size={22} color="#374151" />
            </Pressable>
            <Pressable style={styles.iconBtn}>
              <Ionicons name="chatbubble-outline" size={22} color="#374151" />
            </Pressable>
          </View>
        </View>

        {/* Search bar */}
        <Pressable
          style={styles.searchBar}
          onPress={() => router.push("/(tabs)/browse")}
        >
          <Ionicons name="search-outline" size={18} color="#9ca3af" />
          <Text style={styles.searchPlaceholder}>ค้นหาร้าน...</Text>
          <Ionicons name="options-outline" size={18} color="#9ca3af" />
        </Pressable>

        {/* Type pills */}
        <View style={styles.typePills}>
          {(
            [
              { key: "sale", label: "เซ้ง" },
              { key: "rent", label: "ให้เช่า" },
              { key: "both", label: "ทั้งคู่" },
            ] as const
          ).map((t, i) => (
            <Pressable
              key={t.key}
              style={[styles.typePill, i === 0 && styles.typePillActive]}
              onPress={() => router.push(`/(tabs)/browse?type=${t.key}`)}
            >
              <Text style={[styles.typePillText, i === 0 && styles.typePillTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Categories */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="หมวดหมู่"
              linkLabel="ดูทั้งหมด"
              onLink={() => router.push("/(tabs)/browse")}
            />
            <View style={styles.catGrid}>
              {categories.slice(0, 8).map((cat) => (
                <Pressable
                  key={cat.id}
                  style={styles.catItem}
                  onPress={() => router.push(`/(tabs)/browse?cat=${cat.id}`)}
                >
                  <View style={styles.catBubble}>
                    <Ionicons name={getCatIcon(cat.icon)} size={20} color="#ea580c" />
                  </View>
                  <Text style={styles.catLabel} numberOfLines={2}>
                    {cat.name_th}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Featured — horizontal scroll */}
        {featured.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="ประกาศแนะนำ"
              linkLabel="ดูทั้งหมด"
              onLink={() => router.push("/(tabs)/browse")}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredScroll}
            >
              {featured.map((item) => (
                <ListingCardV
                  key={item.id}
                  item={item}
                  width={192}
                  onPress={() => router.push(`/listing/${item.slug}`)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Latest — 2-col grid */}
        {latest.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="🆕 ประกาศล่าสุด"
              linkLabel="ดูทั้งหมด"
              onLink={() => router.push("/(tabs)/browse")}
            />
            <View style={styles.latestGrid}>
              {latest.slice(0, 8).map((item) => (
                <ListingCardV
                  key={item.id}
                  item={item}
                  onPress={() => router.push(`/listing/${item.slug}`)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Free listing CTA */}
        <Pressable
          style={styles.ctaBanner}
          onPress={() => router.push("/(tabs)/create")}
        >
          <View style={styles.ctaIcon}>
            <Ionicons name="add" size={22} color="#fff" />
          </View>
          <View style={styles.ctaText}>
            <Text style={styles.ctaTitle}>ลงประกาศฟรี!</Text>
            <Text style={styles.ctaSub}>เซ้ง / ให้เช่าร้านของคุณ ไม่มีค่าใช้จ่าย</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Location header
  locationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  locationLabel: { fontSize: 11, color: "#9ca3af" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  locationCity: { fontSize: 16, fontWeight: "700", color: "#111827" },
  headerIcons: { flexDirection: "row", gap: 4 },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchPlaceholder: { flex: 1, fontSize: 14, color: "#9ca3af" },

  // Type pills
  typePills: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  typePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  typePillActive: { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
  typePillText: { fontSize: 13, fontWeight: "500", color: "#6b7280" },
  typePillTextActive: { color: "#c2410c", fontWeight: "600" },

  // Section
  section: { marginTop: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  sectionLink: { fontSize: 12, color: "#c2410c", fontWeight: "500" },

  // Category grid
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
  },
  catItem: {
    width: CAT_ITEM_W,
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 4,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  catBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffedd5",
    alignItems: "center",
    justifyContent: "center",
  },
  catLabel: {
    fontSize: 11,
    color: "#374151",
    textAlign: "center",
    lineHeight: 14,
  },

  // Featured scroll
  featuredScroll: { paddingLeft: 16, paddingRight: 8, gap: 10, paddingBottom: 4 },

  // Latest grid
  latestGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 10,
  },

  // Vertical card
  cardV: {
    flex: 0,
    width: CARD_W,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  cardVImageWrap: { position: "relative" },
  cardVImage: { width: "100%", aspectRatio: 4 / 3, resizeMode: "cover" },
  cardVImagePlaceholder: {
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  cardVBadgeWrap: { position: "absolute", top: 6, left: 6 },
  cardVBody: { padding: 10, gap: 3 },
  cardVPriceRow: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  cardVPrice: { fontSize: 15, fontWeight: "700", color: "#111827" },
  cardVPriceUnit: { fontSize: 11, color: "#9ca3af" },
  cardVTitle: { fontSize: 13, fontWeight: "500", color: "#374151", lineHeight: 18 },
  cardVLoc: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  cardVLocText: { fontSize: 11, color: "#9ca3af", flex: 1 },

  // Badge
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeStar: { fontSize: 9 },
  badgeText: { fontSize: 10, fontWeight: "600" },

  // CTA banner
  ctaBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    backgroundColor: "#fff7ed",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  ctaIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  ctaText: { flex: 1 },
  ctaTitle: { fontSize: 14, fontWeight: "700", color: "#c2410c" },
  ctaSub: { fontSize: 12, color: "#9ca3af", marginTop: 1 },
});
