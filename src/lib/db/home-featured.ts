import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MAX_PICKS = 20;

const LISTING_PICK_SELECT = `
  id, listing_id, display_order,
  listings!inner(
    id, title, slug, listing_type, sale_price, rent_price,
    is_featured, featured_until, district, province_id, view_count, published_at, status,
    revenue_amount, revenue_period,
    promo_type, promo_value, promo_activated_at,
    listing_images(id, storage_path, display_order),
    categories(name_th, slug),
    provinces(name_th, slug)
  )
`;

export async function getHomeFeaturedPicks() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("home_featured_picks")
    .select(LISTING_PICK_SELECT)
    .eq("listings.status", "published")
    .order("display_order", { ascending: true })
    .limit(MAX_PICKS);
  return (data ?? []).filter((r: unknown) => (r as HomeFeaturedPickRow).listings !== null) as unknown as HomeFeaturedPickRow[];
}

export async function getHomeFeaturedPickIds(): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("home_featured_picks")
    .select("listing_id")
    .order("display_order");
  return (data ?? []).map((r: { listing_id: string }) => r.listing_id);
}

export async function addHomeFeaturedPick(listingId: string, addedBy: string) {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("home_featured_picks")
    .select("id")
    .eq("listing_id", listingId)
    .maybeSingle();
  if (existing) throw new Error("ประกาศนี้อยู่ในประกาศแนะนำแล้ว");

  const { count } = await supabase
    .from("home_featured_picks")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) >= MAX_PICKS) throw new Error(`สูงสุด ${MAX_PICKS} ประกาศแนะนำ — กรุณาลบบางประกาศก่อนเพิ่มใหม่`);

  const maxOrder = await supabase
    .from("home_featured_picks")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1);
  const nextOrder = ((maxOrder.data?.[0] as { display_order: number } | undefined)?.display_order ?? 0) + 1;

  const { error } = await supabase.from("home_featured_picks").insert({
    listing_id: listingId,
    display_order: nextOrder,
    added_by: addedBy,
  });
  if (error) {
    if (error.code === "23505") throw new Error("ประกาศนี้อยู่ในประกาศแนะนำแล้ว");
    throw error;
  }
}

export async function removeHomeFeaturedPick(listingId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("home_featured_picks")
    .delete()
    .eq("listing_id", listingId);
  if (error) throw error;
}

export async function reorderHomeFeaturedPicks(ids: string[]) {
  const supabase = createAdminClient();
  await Promise.all(
    ids.map((listingId, i) =>
      supabase
        .from("home_featured_picks")
        .update({ display_order: i })
        .eq("listing_id", listingId)
    )
  );
}

export async function searchListingsForHomeFeatured(q: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select("id, title, slug, status, categories(name_th), provinces(name_th)")
    .eq("status", "published")
    .ilike("title", `%${q}%`)
    .limit(10);
  return (data ?? []) as unknown as SearchHomeFeaturedListing[];
}

export const HOME_FEATURED_MAX_PICKS = MAX_PICKS;

export type HomeFeaturedPickRow = {
  id: number;
  listing_id: string;
  display_order: number;
  listings: {
    id: string; title: string; slug: string; listing_type: "sale" | "rent" | "both";
    sale_price: number | null; rent_price: number | null;
    is_featured: boolean; featured_until: string | null;
    district: string | null; province_id: number | null;
    view_count: number | null; published_at: string | null; status: string;
    revenue_amount: number | null; revenue_period: "yearly" | "quarterly_avg" | "monthly_last" | null;
    promo_type: "percent" | "amount" | null;
    promo_value: number | null;
    promo_activated_at: string | null;
    listing_images: { id: string; storage_path: string; display_order: number }[];
    categories: { name_th: string; slug: string } | null;
    provinces: { name_th: string; slug: string } | null;
  };
};

export type SearchHomeFeaturedListing = {
  id: string; title: string; slug: string; status: string;
  categories: { name_th: string } | null;
  provinces: { name_th: string } | null;
};
