import { useContext, useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { SessionContext, UnreadCountsContext } from "../_layout";

type Notif = {
  id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  listing_id: string | null;
  listings: { title: string; slug: string } | null;
};

export default function AlertsScreen() {
  const session = useContext(SessionContext);
  const { refresh } = useContext(UnreadCountsContext);
  const router = useRouter();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session?.user) { setLoading(false); return; }
    const { data } = await supabase
      .from("notifications")
      .select("id, message, is_read, created_at, listing_id, listings(title, slug)")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data ?? []) as unknown as Notif[]);
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => { load(); }, [load]);

  async function markRead(id: string, slug: string | null) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    refresh();
    if (slug) router.push(`/listing/${slug}` as never);
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.empty}>กรุณาเข้าสู่ระบบเพื่อดูการแจ้งเตือน</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>การแจ้งเตือน</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#f97316" />
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-outline" size={48} color="#d1d5db" />
          <Text style={styles.empty}>ยังไม่มีการแจ้งเตือน</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => markRead(item.id, item.listings?.slug ?? null)}
              style={[styles.item, !item.is_read && styles.itemUnread]}
            >
              <View style={styles.dot}>
                {!item.is_read && <View style={styles.dotInner} />}
              </View>
              <View style={{ flex: 1 }}>
                {item.listings?.title && (
                  <Text style={styles.listingTitle} numberOfLines={1}>{item.listings.title}</Text>
                )}
                <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
                <Text style={styles.time}>
                  {new Date(item.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  title: { fontSize: 20, fontWeight: "700", color: "#111827" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  empty: { fontSize: 14, color: "#9ca3af", marginTop: 8 },
  item: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#fff" },
  itemUnread: { backgroundColor: "#fef9c3", borderLeftWidth: 3, borderLeftColor: "#facc15" },
  dot: { width: 10, height: 10, marginTop: 5, alignItems: "center", justifyContent: "center" },
  dotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444" },
  listingTitle: { fontSize: 13, fontWeight: "600", color: "#111827", marginBottom: 2 },
  message: { fontSize: 13, color: "#374151", lineHeight: 18 },
  time: { fontSize: 11, color: "#9ca3af", marginTop: 4 },
  sep: { height: 1, backgroundColor: "#f3f4f6" },
});
