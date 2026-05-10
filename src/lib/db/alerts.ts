import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AlertPreference {
  id: string;
  user_id: string;
  province_ids: number[];
  category_id: number | null;
  listing_type: "sale" | "rent" | "both" | null;
  min_price: number | null;
  max_price: number | null;
  is_active: boolean;
  created_at: string;
  // joined
  categories?: { name_th: string } | null;
  provinces_list?: { id: number; name_th: string }[];
}

export interface Notification {
  id: string;
  user_id: string;
  listing_id: string | null;
  read_at: string | null;
  created_at: string;
  listings?: {
    title: string;
    slug: string;
    sale_price: number | null;
    rent_price: number | null;
    listing_type: string;
    provinces?: { name_th: string } | null;
    listing_images?: { storage_path: string }[];
  } | null;
}

export async function getUserAlerts() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("alert_preferences")
    .select("*, categories(name_th)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (data ?? []) as AlertPreference[];
}

export async function getUserNotifications(limit = 30) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("notifications")
    .select(`
      id, listing_id, read_at, created_at,
      listings (
        title, slug, sale_price, rent_price, listing_type,
        provinces ( name_th ),
        listing_images ( storage_path, display_order )
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Notification[];
}

export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase as any)
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);
  return count ?? 0;
}

export async function getAllProvincesForAlert() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (createAdminClient() as any)
    .from("provinces")
    .select("id, name_th")
    .order("name_th");
  return (data ?? []) as { id: number; name_th: string }[];
}
