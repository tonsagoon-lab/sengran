import { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../../lib/supabase";
import { resolveImageUrl } from "../../lib/image-url";
import { SessionContext } from "../_layout";

const LINE_CTA = "https://line.me/R/ti/p/~salebiz";

type MyListing = {
  id: string;
  slug: string;
  title: string;
  listing_type: string;
  sale_price: number | null;
  rent_price: number | null;
  status: string;
  published_at: string | null;
  updated_at: string;
  listing_images: { id: string; storage_path: string; display_order: number }[];
};

function statusLabel(status: string): { text: string; color: string; bg: string } {
  if (status === "published") return { text: "เผยแพร่แล้ว", color: "#15803d", bg: "#dcfce7" };
  if (status === "draft") return { text: "แบบร่าง", color: "#92400e", bg: "#fef3c7" };
  return { text: status, color: "#6b7280", bg: "#f3f4f6" };
}

export default function MyListingsScreen() {
  const session = useContext(SessionContext);
  const [listings, setListings] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadListings();
    }, [session])
  );

  async function loadListings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("listings")
      .select(`id, slug, title, listing_type, sale_price, rent_price, status, published_at, updated_at,
        listing_images(id, storage_path, display_order)`)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    setListings((data ?? []) as MyListing[]);
    setLoading(false);
  }

  async function handleToggleStatus(item: MyListing) {
    const next = item.status === "published" ? "draft" : "published";
    const label = next === "published" ? "เผยแพร่" : "ยกเลิกการเผยแพร่";
    Alert.alert(`${label}ประกาศ?`, `"${item.title}"`, [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: label,
        onPress: async () => {
          const { error } = await supabase
            .from("listings")
            .update({
              status: next,
              published_at: next === "published" ? new Date().toISOString() : null,
            })
            .eq("id", item.id);
          if (!error) {
            setListings((prev) =>
              prev.map((l) =>
                l.id === item.id
                  ? { ...l, status: next, published_at: next === "published" ? new Date().toISOString() : null }
                  : l
              )
            );
          }
        },
      },
    ]);
  }

  async function handleDelete(id: string) {
    Alert.alert("ลบประกาศ", "ยืนยันการลบประกาศนี้?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("listings").delete().eq("id", id);
          if (!error) setListings((prev) => prev.filter((l) => l.id !== id));
        },
      },
    ]);
  }

  const renderItem = useCallback(({ item }: { item: MyListing }) => {
    const cover = item.listing_images.slice().sort((a, b) => a.display_order - b.display_order)[0];
    const imageUrl = cover ? resolveImageUrl(cover.storage_path) : null;
    const st = statusLabel(item.status);
    const isPublished = item.status === "published";

    return (
      <View style={styles.card}>
        <Pressable onPress={() => router.push(`/listing/${item.slug}`)} style={styles.cardMain}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <Text style={{ fontSize: 24 }}>🏪</Text>
            </View>
          )}
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: st.color }]} />
              <Text style={[styles.statusText, { color: st.color }]}>{st.text}</Text>
            </View>
            {item.sale_price || item.rent_price ? (
              <Text style={styles.priceText}>
                {item.sale_price ? `฿${item.sale_price.toLocaleString("th-TH")}` : ""}
                {item.sale_price && item.rent_price ? "  " : ""}
                {item.rent_price ? `฿${item.rent_price.toLocaleString("th-TH")}/ด.` : ""}
              </Text>
            ) : null}
          </View>
        </Pressable>

        {/* Actions */}
        <View style={styles.cardActions}>
          <Pressable
            style={[styles.actionBtn, styles.editBtn]}
            onPress={() => router.push(`/edit/${item.id}`)}
          >
            <Ionicons name="create-outline" size={13} color="#2563eb" />
            <Text style={[styles.actionBtnText, { color: "#2563eb" }]}>แก้ไข</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, isPublished ? styles.draftBtn : styles.publishBtn]}
            onPress={() => handleToggleStatus(item)}
          >
            <Ionicons
              name={isPublished ? "eye-off-outline" : "eye-outline"}
              size={13}
              color={isPublished ? "#92400e" : "#15803d"}
            />
            <Text style={[styles.actionBtnText, { color: isPublished ? "#92400e" : "#15803d" }]}>
              {isPublished ? "ซ่อน" : "เผยแพร่"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDelete(item.id)}
          >
            <Ionicons name="trash-outline" size={13} color="#dc2626" />
            <Text style={[styles.actionBtnText, { color: "#dc2626" }]}>ลบ</Text>
          </Pressable>
        </View>
      </View>
    );
  }, []);

  if (!session) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.guestContainer}>
          <Text style={{ fontSize: 56, marginBottom: 12 }}>📋</Text>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 8 }}>ประกาศของฉัน</Text>
          <Text style={{ fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 24 }}>เข้าสู่ระบบเพื่อดูและจัดการประกาศของคุณ</Text>
          <Pressable style={styles.loginBtn} onPress={() => router.push("/auth/login")}>
            <Text style={styles.loginBtnText}>เข้าสู่ระบบ</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ประกาศของฉัน</Text>
        <Pressable style={styles.newBtn} onPress={() => router.push("/(tabs)/create")}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.newBtnText}>ลงประกาศ</Text>
        </Pressable>
      </View>

      {/* CTA Banner */}
      <View style={styles.ctaRow}>
        <Pressable style={styles.ctaPackage} onPress={() => Linking.openURL(LINE_CTA)}>
          <Ionicons name="star" size={16} color="#f97316" />
          <Text style={styles.ctaPackageText}>ซื้อแพ็กเกจ</Text>
        </Pressable>
        <Pressable style={styles.ctaLine} onPress={() => Linking.openURL(LINE_CTA)}>
          <Text style={styles.ctaLineL}>L</Text>
          <Text style={styles.ctaLineText}>ฝากเซ้งร้าน</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} size="large" color="#f97316" />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyText}>ยังไม่มีประกาศ</Text>
              <Pressable style={styles.emptyBtn} onPress={() => router.push("/(tabs)/create")}>
                <Text style={styles.emptyBtnText}>ลงประกาศแรก</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f97316",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  newBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // CTA row
  ctaRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  ctaPackage: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#f97316",
    backgroundColor: "#fff7ed",
  },
  ctaPackageText: { fontSize: 14, fontWeight: "700", color: "#f97316" },
  ctaLine: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: "#06C755",
  },
  ctaLineL: { fontSize: 15, fontWeight: "900", fontStyle: "italic", color: "#fff" },
  ctaLineText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  // List
  list: { padding: 12, gap: 10, paddingBottom: 32 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  cardMain: { flexDirection: "row" },
  thumb: { width: 88, height: 88 },
  thumbPlaceholder: { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1, padding: 10, justifyContent: "center", gap: 5 },
  cardTitle: { fontSize: 13, fontWeight: "600", color: "#111827", lineHeight: 18 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },
  priceText: { fontSize: 12, color: "#6b7280" },

  cardActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
  },
  actionBtnText: { fontSize: 12, fontWeight: "600" },
  editBtn: { backgroundColor: "#eff6ff", borderRightWidth: 1, borderRightColor: "#f3f4f6" },
  draftBtn: { backgroundColor: "#fefce8", borderRightWidth: 1, borderRightColor: "#f3f4f6" },
  publishBtn: { backgroundColor: "#f0fdf4", borderRightWidth: 1, borderRightColor: "#f3f4f6" },
  deleteBtn: { backgroundColor: "#fff5f5" },

  emptyState: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, color: "#9ca3af" },
  emptyBtn: {
    backgroundColor: "#f97316",
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  emptyBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  guestContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  loginBtn: {
    backgroundColor: "#f97316",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
    width: "100%",
    alignItems: "center",
  },
  loginBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
