import { supabase } from "./supabase";

// expo-notifications push token is not supported in Expo Go SDK 53+
// registerPushToken is a no-op until running in a development build or production build
export async function registerPushToken(): Promise<string | null> {
  return null;
}

export async function getUnreadMessageCount(userId: string): Promise<number> {
  const { data: convs } = await supabase
    .from("conversations")
    .select("id")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
  const convIds = (convs ?? []).map((c: { id: string }) => c.id);
  if (convIds.length === 0) return 0;
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false)
    .neq("sender_id", userId)
    .in("conversation_id", convIds);
  return count ?? 0;
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}
