import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { resolveImageUrl } from "../../lib/image-url";
import type { ListingDetail } from "../../lib/types";

const { width: W } = Dimensions.get("window");

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function fmtPrice(n: number | null): string {
  if (!n) return "-";
  return n.toLocaleString("th-TH");
}

type BadgeType = "sale" | "rent" | "both";
function TypeBadge({ type }: { type: BadgeType }) {
  const cfg = {
    sale: { bg: "#dbeafe", border: "#bfdbfe", text: "#1d4ed8", label: "เซ้ง" },
    rent: { bg: "#dcfce7", border: "#bbf7d0", text: "#15803d", label: "ให้เช่า" },
    both: { bg: "#f3e8ff", border: "#e9d5ff", text: "#7e22ce", label: "เซ้งและให้เช่า" },
  }[type];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

export default function ListingDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!slug) return;
    fetchListing();
  }, [slug]);

  async function fetchListing() {
    const { data, error } = await supabase
      .from("listings")
      .select(
        `id, slug, title, description, listing_type, sale_price, rent_price, district,
         view_count, published_at, status,
         listing_images(id, storage_path, display_order),
         categories(name_th, slug), provinces(name_th, slug),
         profiles!listings_user_id_fkey(display_name, mobile, line_id, avatar_url)`
      )
      .eq("slug", slug)
      .in("status", ["published", "expired"])
      .maybeSingle();

    if (error) console.error("detail error:", error.message);
    setListing(data as unknown as ListingDetail | null);
    setLoading(false);

    if (data) {
      supabase.rpc("increment_listing_view_count", { listing_slug: slug }).then(() => {});
    }
  }

  function handleCall() {
    if (!listing?.profiles?.mobile) return;
    Linking.openURL(`tel:${listing.profiles.mobile.replace(/[^0-9+]/g, "")}`);
  }

  function handleLine() {
    if (!listing?.profiles?.line_id) return;
    Linking.openURL(`https://line.me/R/ti/p/~${listing.profiles.line_id}`);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#d1d5db" />
        <Text style={styles.errorText}>ไม่พบประกาศนี้</Text>
      </View>
    );
  }

  const sortedImages = listing.listing_images
    .slice()
    .sort((a, b) => a.display_order - b.display_order)
    .filter((img) => !failedImages.has(img.storage_path));

  const sellerInitial = listing.profiles?.display_name?.charAt(0)?.toUpperCase() ?? "?";

  const hasMobile = !!listing.profiles?.mobile;
  const hasLine = !!listing.profiles?.line_id;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["bottom"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero gallery */}
        <View style={styles.galleryWrap}>
          {sortedImages.length > 0 ? (
            <>
              <FlatList
                data={sortedImages}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(img) => img.id}
                onMomentumScrollEnd={(e) =>
                  setActiveImage(Math.round(e.nativeEvent.contentOffset.x / W))
                }
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: resolveImageUrl(item.storage_path) }}
                    style={styles.galleryImg}
                    onError={() =>
                      setFailedImages((prev) => new Set([...prev, item.storage_path]))
                    }
                  />
                )}
              />
              {sortedImages.length > 1 && (
                <View style={styles.pagePill}>
                  <Text style={styles.pagePillText}>
                    {activeImage + 1} / {sortedImages.length}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.noImagePlaceholder}>
              <Text style={{ fontSize: 56 }}>🏪</Text>
            </View>
          )}

          {/* Back button */}
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </Pressable>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Badges */}
          <View style={styles.badgeRow}>
            <TypeBadge type={listing.listing_type} />
            {listing.categories && (
              <View style={styles.catBadge}>
                <Text style={styles.catBadgeText}>{listing.categories.name_th}</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={styles.title}>{listing.title}</Text>

          {/* Location */}
          {(listing.district || listing.provinces) && (
            <View style={styles.locRow}>
              <Ionicons name="location-outline" size={13} color="#9ca3af" />
              <Text style={styles.locText}>
                {[listing.district, listing.provinces?.name_th].filter(Boolean).join(", ")}
              </Text>
            </View>
          )}

          {/* Price block */}
          {(listing.sale_price || listing.rent_price) ? (
            <View style={styles.priceBlock}>
              {listing.sale_price ? (
                <View style={styles.priceRow}>
                  <Ionicons name="storefront-outline" size={16} color="#9a3412" />
                  <Text style={styles.priceLabel}>ราคาเซ้ง:</Text>
                  <Text style={styles.priceValue}>฿{fmtPrice(listing.sale_price)} บาท</Text>
                </View>
              ) : null}
              {listing.rent_price ? (
                <View style={styles.priceRow}>
                  <Ionicons name="layers-outline" size={16} color="#9a3412" />
                  <Text style={styles.priceLabel}>ค่าเช่า:</Text>
                  <Text style={styles.priceValue}>฿{fmtPrice(listing.rent_price)} บาท/เดือน</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Meta */}
          <View style={styles.metaRow}>
            <Ionicons name="eye-outline" size={14} color="#9ca3af" />
            <Text style={styles.metaText}>{listing.view_count.toLocaleString()} ครั้ง</Text>
            {listing.published_at && (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Ionicons name="time-outline" size={14} color="#9ca3af" />
                <Text style={styles.metaText}>
                  {new Date(listing.published_at).toLocaleDateString("th-TH", {
                    day: "numeric",
                    month: "short",
                    year: "2-digit",
                  })}
                </Text>
              </>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description */}
          {listing.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>รายละเอียด</Text>
              <Text style={styles.description}>{stripHtml(listing.description)}</Text>
            </View>
          ) : null}

          {/* Seller */}
          {listing.profiles && (
            <View style={styles.sellerCard}>
              <View style={styles.sellerAvatar}>
                <Text style={styles.sellerInitial}>{sellerInitial}</Text>
              </View>
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerName}>
                  {listing.profiles.display_name ?? "ผู้ขาย"}
                </Text>
                <Text style={styles.sellerMeta}>ผู้ขาย · ตอบเร็ว</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </View>
          )}

          {/* Spacer for sticky bar */}
          <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      {/* Sticky contact bar */}
      {listing.profiles && (hasMobile || hasLine) && (
        <View style={styles.stickyBar}>
          {hasMobile && (
            <Pressable style={[styles.contactBtn, styles.callBtn]} onPress={handleCall}>
              <Ionicons name="call-outline" size={18} color="#fff" />
              <Text style={styles.contactBtnText}>โทร</Text>
            </Pressable>
          )}
          {hasLine && (
            <Pressable style={[styles.contactBtn, styles.lineBtn]} onPress={handleLine}>
              {/* LINE logo */}
              <Text style={styles.lineLogoText}>L</Text>
              <Text style={styles.contactBtnText}>LINE</Text>
            </Pressable>
          )}
          {!hasMobile && !hasLine && (
            <Pressable style={[styles.contactBtn, styles.msgBtn]}>
              <Ionicons name="chatbubble-outline" size={18} color="#374151" />
              <Text style={[styles.contactBtnText, { color: "#374151" }]}>ติดต่อสอบถาม</Text>
            </Pressable>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: "#fff" },
  errorText: { fontSize: 15, color: "#9ca3af" },

  // Gallery
  galleryWrap: { position: "relative" },
  galleryImg: { width: W, height: W * 0.75, resizeMode: "cover" },
  noImagePlaceholder: { width: W, height: W * 0.75, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  pagePill: { position: "absolute", bottom: 10, right: 10, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pagePillText: { color: "#fff", fontSize: 11 },
  backBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 12 : 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },

  // Content
  content: { paddingHorizontal: 16, paddingTop: 16 },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  catBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "#f3f4f6" },
  catBadgeText: { fontSize: 12, color: "#6b7280", fontWeight: "500" },

  title: { fontSize: 19, fontWeight: "700", color: "#111827", lineHeight: 26, marginBottom: 6 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 14 },
  locText: { fontSize: 13, color: "#9ca3af" },

  // Price block
  priceBlock: {
    backgroundColor: "#fff7ed",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#fed7aa",
    gap: 8,
  },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  priceLabel: { fontSize: 13, color: "#9a3412", fontWeight: "500" },
  priceValue: { fontSize: 15, fontWeight: "700", color: "#c2410c" },
  depositText: { fontSize: 12, color: "#9a3412", marginTop: 2 },

  // Meta
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 14 },
  metaText: { fontSize: 12, color: "#9ca3af" },
  metaDot: { fontSize: 12, color: "#d1d5db" },

  divider: { height: 1, backgroundColor: "#f3f4f6", marginBottom: 16 },

  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 8 },
  description: { fontSize: 14, color: "#374151", lineHeight: 22 },

  // Seller card
  sellerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 8,
  },
  sellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffedd5",
    alignItems: "center",
    justifyContent: "center",
  },
  sellerInitial: { fontSize: 16, fontWeight: "700", color: "#ea580c" },
  sellerInfo: { flex: 1 },
  sellerName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  sellerMeta: { fontSize: 12, color: "#9ca3af", marginTop: 2 },

  // Sticky bar
  stickyBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  contactBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  callBtn: { backgroundColor: "#f97316" },
  lineBtn: { backgroundColor: "#06C755" },
  msgBtn: { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb" },
  contactBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  lineLogoText: { color: "#fff", fontSize: 15, fontWeight: "900", fontStyle: "italic" },
});
