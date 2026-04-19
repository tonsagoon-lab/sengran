import { createClient } from "@/lib/supabase/server";
import type { Listing, ListingImage } from "@/lib/types/database";

export type ListingWithImages = Listing & { listing_images: ListingImage[] };

export type ListingWithDetails = Listing & {
  listing_images: ListingImage[];
  categories: { name_th: string; slug: string } | null;
  provinces: { name_th: string; slug: string } | null;
  profiles: { display_name: string | null; mobile: string | null; line_id: string | null } | null;
};

export async function getPublishedListings(options?: {
  categorySlug?: string;
  provinceSlug?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const supabase = await createClient();
  const { categorySlug, provinceSlug, search, page = 1, limit = 20 } = options ?? {};
  const offset = (page - 1) * limit;

  let query = supabase
    .from("listings")
    .select(
      `*, listing_images(id, storage_path, display_order, alt_text),
       categories(name_th, slug), provinces(name_th, slug)`,
      { count: "exact" }
    )
    .eq("status", "published")
    .order("boost_rank", { ascending: false })
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (categorySlug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", categorySlug)
      .single();
    if (cat) query = query.eq("category_id", cat.id);
  }

  if (provinceSlug) {
    const { data: prov } = await supabase
      .from("provinces")
      .select("id")
      .eq("slug", provinceSlug)
      .single();
    if (prov) query = query.eq("province_id", prov.id);
  }

  if (search) {
    query = query.textSearch("title", search, { config: "simple" });
  }

  return query;
}

export async function getListingBySlug(slug: string): Promise<ListingWithDetails | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select(
      `*, listing_images(id, storage_path, display_order, alt_text),
       categories(name_th, slug), provinces(name_th, slug),
       profiles(display_name, mobile, line_id)`
    )
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  return data as ListingWithDetails | null;
}

export async function getMyListings(userId: string): Promise<ListingWithImages[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select(`*, listing_images(id, storage_path, display_order, alt_text)`)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  return (data ?? []) as ListingWithImages[];
}

export async function getListingForEdit(
  listingId: string,
  userId: string
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select(
      `*, listing_images(id, storage_path, display_order, alt_text),
       listing_amenities(amenity_id),
       categories(name_th, slug), provinces(name_th, slug)`
    )
    .eq("id", listingId)
    .eq("user_id", userId)
    .single();

  return data as (ListingWithImages & {
    listing_amenities: { amenity_id: number }[];
    categories: { name_th: string; slug: string } | null;
    provinces: { name_th: string; slug: string } | null;
  }) | null;
}

export async function getAllAmenities() {
  const supabase = await createClient();
  const { data } = await supabase.from("amenities").select("id, name_th, slug").order("name_th");
  return data ?? [];
}

export async function getAllCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name_th, slug")
    .eq("is_active", true)
    .order("display_order");
  return data ?? [];
}

export async function getAllProvinces() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("provinces")
    .select("id, name_th, slug, region")
    .order("name_th");
  return data ?? [];
}
