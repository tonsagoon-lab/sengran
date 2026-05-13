import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const LISTING_PICK_SELECT = `
  id, listing_id, display_order,
  listings!inner(
    id, title, slug, listing_type, sale_price, rent_price,
    is_featured, featured_until, district, province_id, view_count, published_at, status,
    listing_images(id, storage_path, display_order),
    categories(name_th, slug),
    provinces(name_th, slug)
  )
`;

export async function getEditorialPicks() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("editorial_picks")
    .select(LISTING_PICK_SELECT)
    .order("display_order", { ascending: true })
    .limit(8);
  return (data ?? []) as unknown as EditorialPickRow[];
}

export async function getEditorialPickIds(): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("editorial_picks")
    .select("listing_id")
    .order("display_order");
  return (data ?? []).map((r: { listing_id: string }) => r.listing_id);
}

export async function addEditorialPick(listingId: string, addedBy: string) {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("editorial_picks")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) >= 8) throw new Error("สูงสุด 8 โพสแนะนำ");

  const maxOrder = await supabase
    .from("editorial_picks")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1);
  const nextOrder = ((maxOrder.data?.[0] as { display_order: number } | undefined)?.display_order ?? 0) + 1;

  const { error } = await supabase.from("editorial_picks").insert({
    listing_id: listingId,
    display_order: nextOrder,
    added_by: addedBy,
  });
  if (error) throw error;
}

export async function removeEditorialPick(listingId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("editorial_picks")
    .delete()
    .eq("listing_id", listingId);
  if (error) throw error;
}

export async function reorderEditorialPicks(ids: string[]) {
  const supabase = createAdminClient();
  await Promise.all(
    ids.map((listingId, i) =>
      supabase
        .from("editorial_picks")
        .update({ display_order: i })
        .eq("listing_id", listingId)
    )
  );
}

export async function searchListingsForPicks(q: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select("id, title, slug, status, categories(name_th), provinces(name_th)")
    .eq("status", "published")
    .ilike("title", `%${q}%`)
    .limit(10);
  return (data ?? []) as unknown as SearchPickListing[];
}

export type EditorialPickRow = {
  id: number;
  listing_id: string;
  display_order: number;
  listings: {
    id: string; title: string; slug: string; listing_type: string;
    sale_price: number | null; rent_price: number | null;
    is_featured: boolean; featured_until: string | null;
    district: string | null; province_id: number | null;
    view_count: number | null; published_at: string | null; status: string;
    listing_images: { id: string; storage_path: string; display_order: number }[];
    categories: { name_th: string; slug: string } | null;
    provinces: { name_th: string; slug: string } | null;
  };
};

export type SearchPickListing = {
  id: string; title: string; slug: string; status: string;
  categories: { name_th: string } | null;
  provinces: { name_th: string } | null;
};
