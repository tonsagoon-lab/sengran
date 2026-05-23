import { useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { UnreadCountsContext } from "../_layout";

type Message = {
  id: string;
  sender_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

export default function MessageScreen() {
  const { id: listingId, convId } = useLocalSearchParams<{ id: string; convId?: string }>();
  const router = useRouter();
  const { refresh: refreshCounts } = useContext(UnreadCountsContext);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [listingTitle, setListingTitle] = useState("");
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    init();
  }, []);

  // Realtime subscription — fires once conversationId is known
  useEffect(() => {
    if (!conversationId || !myId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Mark as read immediately if it's from the other person
          if (newMsg.sender_id !== myId) {
            supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", newMsg.id)
              .then(() => refreshCounts());
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, myId]);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/auth/login"); return; }
    setMyId(user.id);

    const { data: listing } = await supabase
      .from("listings")
      .select("title, user_id")
      .eq("id", listingId)
      .maybeSingle();
    if (listing) setListingTitle(listing.title);

    // convId passed from inbox = open directly, otherwise find/create as buyer
    let resolvedConvId = convId ?? null;

    if (!resolvedConvId) {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("listing_id", listingId)
        .eq("buyer_id", user.id)
        .maybeSingle();

      resolvedConvId = existing?.id ?? null;

      if (!resolvedConvId && listing) {
        const { data: created } = await supabase
          .from("conversations")
          .insert({ listing_id: listingId, seller_id: listing.user_id, buyer_id: user.id })
          .select("id")
          .single();
        resolvedConvId = created?.id ?? null;
      }
    }

    if (resolvedConvId) {
      setConversationId(resolvedConvId);
      await loadMessages(resolvedConvId, user.id);
    }
    setLoading(false);
  }

  async function loadMessages(convId: string, userId: string) {
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, body, is_read, created_at")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setMessages((data ?? []) as Message[]);

    // Mark unread messages from other person as read
    const unread = (data ?? []).filter(
      (m: any) => !m.is_read && m.sender_id !== userId
    );
    if (unread.length > 0) {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", convId)
        .neq("sender_id", userId)
        .eq("is_read", false);
      refreshCounts();
    }
  }

  async function sendMessage() {
    if (!body.trim() || !conversationId || !myId) return;
    setSending(true);
    const text = body.trim();
    setBody("");
    const { data: newMsg } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: myId, body: text })
      .select("id, sender_id, body, is_read, created_at")
      .single();
    if (newMsg) {
      setMessages((prev) => [...prev, newMsg as Message]);
    }
    setSending(false);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>ข้อความ</Text>
          {listingTitle ? (
            <Text style={styles.headerSub} numberOfLines={1}>{listingTitle}</Text>
          ) : null}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>ยังไม่มีข้อความ{"\n"}เริ่มสนทนากับผู้ขายได้เลย</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = item.sender_id === myId;
            const time = new Date(item.created_at).toLocaleTimeString("th-TH", {
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                  <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextOther]}>
                    {item.body}
                  </Text>
                </View>
                <View style={[styles.msgMeta, isMe ? styles.msgMetaMe : styles.msgMetaOther]}>
                  <Text style={styles.msgTime}>{time}</Text>
                  {isMe && (
                    <Ionicons
                      name={item.is_read ? "checkmark-done" : "checkmark"}
                      size={12}
                      color={item.is_read ? "#f97316" : "#9ca3af"}
                    />
                  )}
                </View>
              </View>
            );
          }}
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={body}
            onChangeText={setBody}
            placeholder="พิมพ์ข้อความ..."
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={500}
          />
          <Pressable
            style={[styles.sendBtn, (!body.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!body.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 8,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#f9fafb",
    alignItems: "center", justifyContent: "center",
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  headerSub: { fontSize: 12, color: "#9ca3af", marginTop: 1 },

  msgList: { padding: 16, gap: 6, flexGrow: 1 },

  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, color: "#9ca3af", textAlign: "center", lineHeight: 22 },

  msgRow: { gap: 2 },
  msgRowMe: { alignItems: "flex-end" },
  msgRowOther: { alignItems: "flex-start" },

  bubble: { maxWidth: "75%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { backgroundColor: "#f97316", borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: "#f3f4f6", borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextMe: { color: "#fff" },
  bubbleTextOther: { color: "#111827" },

  msgMeta: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 1 },
  msgMetaMe: { justifyContent: "flex-end" },
  msgMetaOther: { justifyContent: "flex-start" },
  msgTime: { fontSize: 10, color: "#9ca3af" },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: "#f9fafb",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#f97316",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  sendBtnDisabled: { backgroundColor: "#d1d5db" },
});
