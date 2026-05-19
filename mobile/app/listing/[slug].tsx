import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import { resolveImageUrl } from "../../lib/image-url";
import type { ListingDetail } from "../../lib/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function formatPrice(n: number | null): string {
  if (!n) return "-";
  return n.toLocaleString("th-TH");
}

function listingTypeBadge(type: string): string {
  if (type === "sale") return "เซ้ง";
  if (type === "rent") return "ให้เช่า";
  return "เซ้งและให้เช่า";
}

export default function ListingDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!slug) return;
    fetchListing();
  }, [slug]);

  async function fetchListing() {
    const { data } = await supabase
      .from("listings")
      .select(
        `id, slug, title, description, listing_type, sale_price, rent_price, deposit, district,
         area_sqm, video_url, latitude, longitude, view_count, published_at, status,
         category_id, province_id,
         listing_images(id, storage_path, display_order),
         categories(name_th, slug), provinces(name_th, slug),
         profiles!listings_user_id_fkey(display_name, mobile, line_id, avatar_url)`
      )
      .eq("slug", slug)
      .in("status", ["published", "expired"])
      .single();

    setListing(data as unknown as ListingDetail | null);
    setLoading(false);

    // increment view count
    if (data) {
      supabase.rpc("increment_listing_view_count", { listing_slug: slug }).then(() => {});
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>ไม่พบประกาศนี้</Text>
      </View>
    );
  }

  const sortedImages = listing.listing_images
    .slice()
    .sort((a, b) => a.display_order - b.display_order)
    .filter((img) => !failedImages.has(img.storage_path));

  function handleCall() {
    if (!listing?.profiles?.mobile) return;
    const num = listing.profiles.mobile.replace(/[^0-9+]/g, "");
    Linking.openURL(`tel:${num}`);
  }

  function handleLine() {
    if (!listing?.profiles?.line_id) return;
    Linking.openURL(`https://line.me/R/ti/p/~${listing.profiles.line_id}`);
  }

  const stripHtml = (html: string) =>
    html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView>
        {/* Image gallery */}
        {sortedImages.length > 0 ? (
          <View>
            <FlatList
              data={sortedImages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(img) => img.id}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setActiveImage(idx);
              }}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: resolveImageUrl(item.storage_path) }}
                  style={styles.galleryImage}
                  onError={() =>
                    setFailedImages((prev) => new Set([...prev, item.storage_path]))
                  }
                />
              )}
            />
            {sortedImages.length > 1 && (
              <View style={styles.dotsRow}>
                {sortedImages.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === activeImage && styles.dotActive]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noImagePlaceholder}>
            <Text style={{ fontSize: 48 }}>🏪</Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Type badge */}
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{listingTypeBadge(listing.listing_type)}</Text>
            </View>
            {listing.categories && (
              <View style={[styles.badge, styles.badgeCat]}>
                <Text style={[styles.badgeText, styles.badgeTextCat]}>
                  {listing.categories.name_th}
                </Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={styles.title}>{listing.title}</Text>

          {/* Location */}
          {(listing.district || listing.provinces) && (
            <Text style={styles.location}>
              📍 {[listing.district, listing.provinces?.name_th].filter(Boolean).join(", ")}
            </Text>
          )}

          {/* Prices */}
          <View style={styles.priceBox}>
            {listing.sale_price ? (
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>ราคาเซ้ง</Text>
                <Text style={styles.priceValue}>฿{formatPrice(listing.sale_price)}</Text>
              </View>
            ) : null}
            {listing.rent_price ? (
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>ค่าเช่า/เดือน</Text>
                <Text style={styles.priceValue}>฿{formatPrice(listing.rent_price)}</Text>
              </View>
            ) : null}
            {listing.deposit ? (
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>เงินมัดจำ</Text>
                <Text style={styles.priceValue}>฿{formatPrice(listing.deposit)}</Text>
              </View>
            ) : null}
          </View>

          {/* Description */}
          {listing.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>รายละเอียด</Text>
              <Text style={styles.description}>{stripHtml(listing.description)}</Text>
            </View>
          ) : null}

          {/* Stats */}
          <Text style={styles.stats}>👁 {listing.view_count.toLocaleString()} ครั้ง</Text>
        </View>
      </ScrollView>

      {/* Contact sticky bar */}
      {listing.profiles && (
        <View style={styles.stickyBar}>
          {listing.profiles.mobile && (
            <Pressable style={[styles.contactBtn, styles.callBtn]} onPress={handleCall}>
              <Text style={styles.contactBtnText}>📞 โทร</Text>
            </Pressable>
          )}
          {listing.profiles.line_id && (
            <Pressable style={[styles.contactBtn, styles.lineBtn]} onPress={handleLine}>
              <Text style={styles.contactBtnText}>💬 LINE</Text>
            </Pressable>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 16, color: "#9ca3af" },
  galleryImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.75, resizeMode: "cover" },
  noImagePlaceholder: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 6, paddingVertical: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#d1d5db" },
  dotActive: { backgroundColor: "#f97316", width: 18 },
  content: { padding: 16 },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  badge: { backgroundColor: "#f97316", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  badgeCat: { backgroundColor: "#f3f4f6" },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  badgeTextCat: { color: "#6b7280" },
  title: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 8, lineHeight: 28 },
  location: { fontSize: 14, color: "#6b7280", marginBottom: 14 },
  priceBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    backgroundColor: "#fff7ed",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  priceItem: { flex: 1, minWidth: 120 },
  priceLabel: { fontSize: 12, color: "#9a3412", marginBottom: 2 },
  priceValue: { fontSize: 18, fontWeight: "700", color: "#f97316" },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 8 },
  description: { fontSize: 14, color: "#374151", lineHeight: 22 },
  stats: { fontSize: 12, color: "#9ca3af", marginTop: 8 },
  stickyBar: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 20 : 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  contactBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  callBtn: { backgroundColor: "#f97316" },
  lineBtn: { backgroundColor: "#06c755" },
  contactBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
