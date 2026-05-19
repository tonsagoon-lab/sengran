import { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { resolveImageUrl } from "../../lib/image-url";
import { SessionContext } from "../_layout";

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
  if (status === "published") return { text: "เผยแพร่", color: "#15803d", bg: "#dcfce7" };
  if (status === "draft") return { text: "แบบร่าง", color: "#92400e", bg: "#fef3c7" };
  return { text: status, color: "#6b7280", bg: "#f3f4f6" };
}

export default function MyListingsScreen() {
  const session = useContext(SessionContext);
  const [listings, setListings] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadListings();
  }, []);

  async function loadListings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("listings")
      .select(`id, slug, title, listing_type, sale_price, rent_price, status, published_at, updated_at,
        listing_images(id, storage_path, display_order)`)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    setListings((data ?? []) as MyListing[]);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    Alert.alert("ลบประกาศ", "ยืนยันการลบประกาศนี้?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("listings").delete().eq("id", id);
          if (!error) {
            setListings((prev) => prev.filter((l) => l.id !== id));
          }
        },
      },
    ]);
  }

  const renderItem = useCallback(({ item }: { item: MyListing }) => {
    const cover = item.listing_images.slice().sort((a, b) => a.display_order - b.display_order)[0];
    const imageUrl = cover ? resolveImageUrl(cover.storage_path) : null;
    const st = statusLabel(item.status);

    return (
      <View style={styles.card}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Text style={{ fontSize: 28 }}>🏪</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
            <Text style={[styles.statusText, { color: st.color }]}>{st.text}</Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => router.push(`/listing/${item.slug}`)}
          >
            <Text style={styles.actionBtnText}>ดู</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDelete(item.id)}
          >
            <Text style={[styles.actionBtnText, styles.deleteBtnText]}>ลบ</Text>
          </Pressable>
        </View>
      </View>
    );
  }, []);

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ flex: 1 }} size="large" color="#f97316" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ประกาศของฉัน</Text>
        <Pressable style={styles.newBtn} onPress={() => router.push("/(tabs)/create")}>
          <Text style={styles.newBtnText}>+ ลงประกาศ</Text>
        </Pressable>
      </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  newBtn: { backgroundColor: "#f97316", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  newBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  list: { padding: 12, gap: 12, paddingBottom: 24 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    overflow: "hidden",
  },
  thumb: { width: 90, height: 90 },
  thumbPlaceholder: { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1, padding: 12, justifyContent: "center", gap: 6 },
  cardTitle: { fontSize: 13, fontWeight: "600", color: "#111827", lineHeight: 18 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  statusText: { fontSize: 11, fontWeight: "700" },
  cardActions: { justifyContent: "center", gap: 8, padding: 10 },
  actionBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: "center",
  },
  actionBtnText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  deleteBtn: { borderColor: "#fecaca" },
  deleteBtnText: { color: "#dc2626" },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, color: "#9ca3af" },
  emptyBtn: { backgroundColor: "#f97316", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  emptyBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  guestContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  loginBtn: { backgroundColor: "#f97316", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 48, width: "100%", alignItems: "center" },
  loginBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
