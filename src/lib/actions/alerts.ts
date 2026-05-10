"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createAlertAction(formData: FormData) {
  const { supabase, user } = await getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" };

  const province_ids = formData.getAll("province_ids").map(Number).filter(Boolean);
  const category_id = formData.get("category_id") ? Number(formData.get("category_id")) : null;
  const listing_type = (formData.get("listing_type") as string) || null;
  const min_price = formData.get("min_price") ? Number(formData.get("min_price")) : null;
  const max_price = formData.get("max_price") ? Number(formData.get("max_price")) : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("alert_preferences").insert({
    user_id: user.id,
    province_ids,
    category_id,
    listing_type,
    min_price,
    max_price,
  });

  if (error) return { error: error.message };
  revalidatePath("/alerts");
  return { success: true };
}

export async function updateAlertAction(id: string, formData: FormData) {
  const { supabase, user } = await getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" };

  const province_ids = formData.getAll("province_ids").map(Number).filter(Boolean);
  const category_id = formData.get("category_id") ? Number(formData.get("category_id")) : null;
  const listing_type = (formData.get("listing_type") as string) || null;
  const min_price = formData.get("min_price") ? Number(formData.get("min_price")) : null;
  const max_price = formData.get("max_price") ? Number(formData.get("max_price")) : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("alert_preferences")
    .update({ province_ids, category_id, listing_type, min_price, max_price })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/alerts");
  return { success: true };
}

export async function toggleAlertAction(id: string, is_active: boolean) {
  const { supabase, user } = await getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("alert_preferences")
    .update({ is_active })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/alerts");
}

export async function deleteAlertAction(id: string) {
  const { supabase, user } = await getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("alert_preferences")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/alerts");
}

export async function deleteNotificationAction(id: string) {
  const { supabase, user } = await getUser();
  if (!user) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
}

export async function markNotificationsReadAction(ids: string[]) {
  const { supabase, user } = await getUser();
  if (!user) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids)
    .eq("user_id", user.id);
}
