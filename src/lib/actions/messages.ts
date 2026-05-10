"use server";

import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;
import { redirect } from "next/navigation";
import { getOrCreateConversation } from "@/lib/db/messages";
import { rateLimit } from "@/lib/rate-limit";

export async function sendMessageAction(
  conversationId: string,
  body: string
): Promise<{ error?: string }> {
  const supabase = await createClient() as AnyClient;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" };

  // 30 messages per minute per user
  const { allowed } = await rateLimit(`msg:${user.id}`, 30, 60);
  if (!allowed) return { error: "ส่งข้อความถี่เกินไป กรุณารอสักครู่" };

  const trimmed = body.trim();
  if (!trimmed) return { error: "กรุณาพิมพ์ข้อความ" };

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body: trimmed,
  });

  if (error) return { error: error.message };
  return {};
}

export async function startConversationAction(
  listingId: string,
  sellerId: string
): Promise<void> {
  const supabase = await createClient() as AnyClient;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = await getOrCreateConversation(listingId, sellerId);
  if (!id) redirect("/login");

  redirect(`/messages/${id}`);
}
