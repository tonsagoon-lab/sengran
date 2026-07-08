import { createClient } from "@/lib/supabase/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export interface Conversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  updated_at: string;
  created_at: string;
  listings: { title: string; slug: string; contact_mobile: string | null; contact_line: string | null; contact_name: string | null } | null;
  buyer: { display_name: string; avatar_url: string | null } | null;
  seller: { display_name: string; avatar_url: string | null } | null;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export async function getMyConversations(): Promise<Conversation[]> {
  const supabase = await createClient() as AnyClient;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("conversations")
    .select(`
      id, listing_id, buyer_id, seller_id, updated_at, created_at,
      listings(title, slug, contact_mobile, contact_line, contact_name),
      buyer:profiles!conversations_buyer_id_fkey(display_name, avatar_url),
      seller:profiles!conversations_seller_id_fkey(display_name, avatar_url)
    `)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("updated_at", { ascending: false });

  if (!data) return [];

  // Count unread messages per conversation
  const ids = data.map((c: { id: string }) => c.id);
  const { data: unreadData } = await supabase
    .from("messages")
    .select("conversation_id")
    .in("conversation_id", ids)
    .eq("is_read", false)
    .neq("sender_id", user.id);

  const unreadMap: Record<string, number> = {};
  for (const m of unreadData ?? []) {
    unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] ?? 0) + 1;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((c: any) => ({
    ...c,
    listings: Array.isArray(c.listings) ? c.listings[0] ?? null : c.listings,
    buyer: Array.isArray(c.buyer) ? c.buyer[0] ?? null : c.buyer,
    seller: Array.isArray(c.seller) ? c.seller[0] ?? null : c.seller,
    unread_count: unreadMap[c.id] ?? 0,
  })) as Conversation[];
}

export async function getConversationWithMessages(
  conversationId: string
): Promise<{ conversation: Conversation; messages: Message[] } | null> {
  const supabase = await createClient() as AnyClient;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: conv } = await supabase
    .from("conversations")
    .select(`
      id, listing_id, buyer_id, seller_id, updated_at, created_at,
      listings(title, slug, contact_mobile, contact_line, contact_name),
      buyer:profiles!conversations_buyer_id_fkey(display_name, avatar_url),
      seller:profiles!conversations_seller_id_fkey(display_name, avatar_url)
    `)
    .eq("id", conversationId)
    .single();

  if (!conv) return null;

  const { data: msgs } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, is_read, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  // Mark messages as read
  await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .eq("is_read", false)
    .neq("sender_id", user.id);

  const conversation = {
    ...conv,
    listings: Array.isArray(conv.listings) ? conv.listings[0] ?? null : conv.listings,
    buyer: Array.isArray(conv.buyer) ? conv.buyer[0] ?? null : conv.buyer,
    seller: Array.isArray(conv.seller) ? conv.seller[0] ?? null : conv.seller,
  } as Conversation;

  return { conversation, messages: (msgs ?? []) as Message[] };
}

export async function getOrCreateConversation(
  listingId: string,
  sellerId: string
): Promise<string | null> {
  const supabase = await createClient() as AnyClient;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id === sellerId) return null;

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", user.id)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created } = await supabase
    .from("conversations")
    .insert({ listing_id: listingId, buyer_id: user.id, seller_id: sellerId })
    .select("id")
    .maybeSingle();

  return created?.id ?? null;
}

export async function getUnreadMessageCount(): Promise<number> {
  const supabase = await createClient() as AnyClient;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data: convs } = await supabase
    .from("conversations")
    .select("id")
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

  if (!convs || convs.length === 0) return 0;

  const ids = convs.map((c: { id: string }) => c.id);
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", ids)
    .eq("is_read", false)
    .neq("sender_id", user.id);

  return count ?? 0;
}
