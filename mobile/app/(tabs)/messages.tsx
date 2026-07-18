import { useContext, useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { SessionContext } from "../_layout";

type Thread = {
  id: string;
  listing_id: string;
  other_user_id: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  listings: { title: string; slug: string; listing_images: { storage_path: string }[] } | null;
  other_profile: { display_name: string | null; avatar_url: string | null } | null;
};

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";

function resolveUrl(path: string) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/listings/${path}`;
}

export default function MessagesScreen() {
  const session = useContext(SessionContext);
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session?.user) { setLoading(false); return; }
    const uid = session.user.id;

    const { data } = await supabase
      .from("message_threads")
      .select(`
        id, listing_id, last_message, last_message_at, unread_count,
        buyer_id, seller_id,
        listings(title, slug, listing_images(storage_path)),
        buyer:profiles!buyer_id(display_name, avatar_url),
        seller:profiles!seller_id(display_name, avatar_url)
      `)
      .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`)
      .order("last_message_at", { ascending: false })
      .limit(50);

    const mapped = (data ?? []).map((t: Record<string, unknown>) => {
      const isBuyer = t.buyer_id === uid;
      return {
        id: t.id as string,
        listing_id: t.listing_id as string,
        other_user_id: (isBuyer ? t.seller_id : t.buyer_id) as string,
        last_message: t.last_message as string | null,
        last_message_at: t.last_message_at as string | null,
        unread_count: (t.unread_count as number) ?? 0,
        listings: t.listings as Thread["listings"],
        other_profile: (isBuyer ? t.seller : t.buyer) as Thread["other_profile"],
      };
    });
    setThreads(mapped);
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => { load(); }, [load]);

  if (!session) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.empty}>กรุณาเข้าสู่ระบบเพื่อดูข้อความ</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ข้อความ</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#f97316" />
      ) : threads.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubble-outline" size={48} color="#d1d5db" />
          <Text style={styles.empty}>ยังไม่มีข้อความ</Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => {
            const cover = item.listings?.listing_images?.[0]?.storage_path;
            const coverUrl = cover ? resolveUrl(cover) : null;
            const name = item.other_profile?.display_name ?? "ผู้ใช้";
            const time = item.last_message_at
              ? new Date(item.last_message_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
              : "";
            return (
              <Pressable
                onPress={() => router.push(`/messages/${item.id}` as never)}
                style={[styles.item, item.unread_count > 0 && styles.itemUnread]}
              >
                {coverUrl ? (
                  <ExpoImage source={{ uri: coverUrl }} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" transition={150} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Ionicons name="storefront-outline" size={20} color="#9ca3af" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={styles.row}>
                    <Text style={styles.name} numberOfLines={1}>{name}</Text>
                    <Text style={styles.time}>{time}</Text>
                  </View>
                  <Text style={styles.listing} numberOfLines={1}>{item.listings?.title ?? ""}</Text>
                  <Text style={[styles.preview, item.unread_count > 0 && styles.previewBold]} numberOfLines={1}>
                    {item.last_message ?? ""}
                  </Text>
                </View>
                {item.unread_count > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unread_count > 9 ? "9+" : item.unread_count}</Text>
                  </View>
                )}
              </Pressable>
            );
          }}
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
  item: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  itemUnread: { backgroundColor: "#fff7ed" },
  avatar: { width: 48, height: 48, borderRadius: 8, backgroundColor: "#f3f4f6" },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 14, fontWeight: "600", color: "#111827", flex: 1 },
  time: { fontSize: 11, color: "#9ca3af", marginLeft: 8 },
  listing: { fontSize: 12, color: "#f97316", marginTop: 1 },
  preview: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  previewBold: { fontWeight: "600", color: "#111827" },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  sep: { height: 1, backgroundColor: "#f3f4f6" },
});
