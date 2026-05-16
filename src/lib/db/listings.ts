import { createClient } from "@/lib/supabase/server";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import type { Listing, ListingImage } from "@/lib/types/database";

export type ListingWithImages = Listing & { listing_images: ListingImage[] };

export type ListingWithDetails = Listing & {
  user_id: string;
  listing_images: ListingImage[];
  categories: { name_th: string; slug: string } | null;
  provinces: { name_th: string; slug: string } | null;
  profiles: { display_name: string | null; mobile: string | null; line_id: string | null; avatar_url: string | null } | null;
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
       profiles!listings_user_id_fkey(display_name, mobile, line_id, avatar_url)`
    )
    .eq("slug", slug)
    .in("status", ["published", "expired"])
    .single();

  return data as ListingWithDetails | null;
}

export async function getMyFavoriteListings(userId: string): Promise<SearchListing[]> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("favorites")
    .select(`listing_id, listings!inner(id, title, slug, listing_type, sale_price, rent_price, is_featured, featured_until, district, province_id, view_count, published_at, listing_images(id, storage_path, display_order), categories(name_th, slug), provinces(name_th, slug))`)
    .eq("user_id", userId)
    .eq("listings.status", "published")
    .order("created_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []).map((r: any) => r.listings)) as unknown as SearchListing[];
}

export async function getMyFavoriteIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("favorites")
    .select("listing_id")
    .eq("user_id", userId);
  return new Set((data ?? []).map((r: { listing_id: string }) => r.listing_id));
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

export async function getListingForEditAdmin(listingId: string) {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("listings")
    .select(
      `*, listing_images(id, storage_path, display_order, alt_text),
       listing_amenities(amenity_id),
       categories(name_th, slug), provinces(name_th, slug)`
    )
    .eq("id", listingId)
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

// ── Search / browse ───────────────────────────────────────────

export type SearchListing = {
  id: string;
  title: string;
  slug: string;
  listing_type: "sale" | "rent" | "both";
  sale_price: number | null;
  rent_price: number | null;
  is_featured: boolean;
  featured_until: string | null;
  district: string | null;
  province_id: number | null;
  view_count: number;
  published_at: string | null;
  listing_images: Array<{ id: string; storage_path: string; display_order: number }>;
  categories: { name_th: string; slug: string } | null;
  provinces: { name_th: string; slug: string } | null;
};

export interface SearchParams {
  q?: string;
  type?: string;
  cat?: string;
  province?: string;
  min_price?: string;
  max_price?: string;
  amenities?: string;
  video?: string;
  location?: string;
  sort?: string;
  page?: string;
  lat?: string;
  lng?: string;
  radius?: string;
}

const LISTING_CARD_SELECT = `
  id, title, slug, listing_type, sale_price, rent_price,
  is_featured, featured_until, district, province_id, view_count, published_at,
  listing_images(id, storage_path, display_order),
  categories(name_th, slug),
  provinces(name_th, slug)
`.trim();

export async function searchListings(params: SearchParams): Promise<{
  listings: SearchListing[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const supabase = await createClient();
  const page = Math.max(1, parseInt(params.page ?? "1") || 1);
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  // GPS mode: use listings_within_distance RPC
  const lat = params.lat ? parseFloat(params.lat) : null;
  const lng = params.lng ? parseFloat(params.lng) : null;
  const radius = params.radius ? parseFloat(params.radius) : 10;
  if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcData } = await (supabase as any).rpc("listings_within_distance", {
      center_lat: lat,
      center_lng: lng,
      radius_km: radius,
    });
    const nearbyIds: string[] = (rpcData ?? []).map((r: { id: string }) => r.id);
    if (nearbyIds.length === 0) return { listings: [], total: 0, page, pageSize };

    const slicedIds = nearbyIds.slice(offset, offset + pageSize);
    const { data } = await supabase
      .from("listings")
      .select(LISTING_CARD_SELECT)
      .in("id", slicedIds)
      .eq("status", "published");

    // Preserve distance order
    const idOrder = new Map(slicedIds.map((id, i) => [id, i]));
    const sorted = ((data ?? []) as unknown as SearchListing[]).sort(
      (a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0)
    );
    return { listings: sorted, total: nearbyIds.length, page, pageSize };
  }

  // Amenity pre-filter (separate query then intersect)
  let amenityListingIds: string[] | null = null;
  const amenityIds = params.amenities
    ? params.amenities.split(",").map(Number).filter(Boolean)
    : [];
  if (amenityIds.length > 0) {
    const { data: rows } = await supabase
      .from("listing_amenities")
      .select("listing_id")
      .in("amenity_id", amenityIds);
    const countMap = new Map<string, number>();
    for (const row of rows ?? []) {
      countMap.set(row.listing_id, (countMap.get(row.listing_id) ?? 0) + 1);
    }
    amenityListingIds = [...countMap.entries()]
      .filter(([, c]) => c >= amenityIds.length)
      .map(([id]) => id);
  }

  // Category pre-filter (slug → id)
  let categoryId: number | null = null;
  if (params.cat) {
    const { data: cat } = await supabase
      .from("categories").select("id").eq("slug", params.cat).single();
    if (!cat) return { listings: [], total: 0, page, pageSize };
    categoryId = cat.id;
  }

  // Province pre-filter (slug → id)
  let provinceId: number | null = null;
  if (params.province) {
    const { data: prov } = await supabase
      .from("provinces").select("id").eq("slug", params.province).single();
    if (!prov) return { listings: [], total: 0, page, pageSize };
    provinceId = prov.id;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("listings")
    .select(LISTING_CARD_SELECT, { count: "exact" })
    .eq("status", "published");

  // Listing type
  if (params.type === "sale") query = query.in("listing_type", ["sale", "both"]);
  else if (params.type === "rent") query = query.in("listing_type", ["rent", "both"]);
  else if (params.type === "both") query = query.eq("listing_type", "both");

  if (categoryId) query = query.eq("category_id", categoryId);
  if (provinceId) query = query.eq("province_id", provinceId);

  // Price range
  const min = params.min_price ? Number(params.min_price) : null;
  const max = params.max_price ? Number(params.max_price) : null;
  if (min || max) {
    if (params.type === "rent") {
      if (min) query = query.gte("rent_price", min);
      if (max) query = query.lte("rent_price", max);
    } else if (params.type === "sale") {
      if (min) query = query.gte("sale_price", min);
      if (max) query = query.lte("sale_price", max);
    } else {
      if (min) query = query.or(`sale_price.gte.${min},rent_price.gte.${min}`);
      if (max) query = query.or(`sale_price.lte.${max},rent_price.lte.${max}`);
    }
  }

  // Text search — title, district, address
  if (params.q?.trim()) {
    const q = params.q.trim();
    query = query.or(
      `title.ilike.%${q}%,district.ilike.%${q}%,address.ilike.%${q}%`
    );
    // Log search query (fire-and-forget)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc("log_search", { q }).then(() => {});
  }

  // Amenity filter
  if (amenityListingIds !== null) {
    query = query.in("id", amenityListingIds.length > 0 ? amenityListingIds : [""]);
  }

  if (params.video === "1") query = query.not("video_url", "is", null);
  if (params.location === "1") query = query.not("latitude", "is", null);

  // Sort
  query = query.order("boost_rank", { ascending: false });
  const sort = params.sort ?? "latest";
  if (sort === "latest") {
    query = query.order("published_at", { ascending: false });
  } else if (sort === "price_asc") {
    const col = params.type === "rent" ? "rent_price" : "sale_price";
    query = query.order(col, { ascending: true, nullsFirst: false });
  } else if (sort === "price_desc") {
    const col = params.type === "rent" ? "rent_price" : "sale_price";
    query = query.order(col, { ascending: false, nullsFirst: false });
  } else if (sort === "views") {
    query = query.order("view_count", { ascending: false });
  }

  query = query.range(offset, offset + pageSize - 1);

  const { data, count } = await query;
  return {
    listings: (data ?? []) as unknown as SearchListing[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getFeaturedListings(): Promise<SearchListing[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select(LISTING_CARD_SELECT)
    .eq("status", "published")
    .eq("is_featured", true)
    .gt("featured_until", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(10);
  return (data ?? []) as unknown as SearchListing[];
}

// Anon-client versions for use in generateStaticParams (no cookie dependency)
async function anonClient() {
  return createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function getAllCategoriesPublic() {
  const supabase = await anonClient();
  const { data } = await supabase
    .from("categories").select("id, name_th, slug, icon").eq("is_active", true).order("display_order");
  return data ?? [];
}

export async function getAllProvincesPublic() {
  const supabase = await anonClient();
  const { data } = await supabase
    .from("provinces").select("id, name_th, slug, region").order("name_th");
  return data ?? [];
}

export async function getRelatedListings(
  currentSlug: string,
  provinceId: number | null,
  categoryId: number | null,
  limit = 3
): Promise<SearchListing[]> {
  const supabase = await createClient();

  // Try same province first, fall back to same category, then latest
  if (provinceId) {
    const { data } = await supabase
      .from("listings")
      .select(LISTING_CARD_SELECT)
      .eq("status", "published")
      .eq("province_id", provinceId)
      .neq("slug", currentSlug)
      .order("published_at", { ascending: false })
      .limit(limit);
    if (data && data.length === limit) return data as unknown as SearchListing[];

    // Pad with same category if province didn't fill slots
    const provinceIds = ((data ?? []) as unknown as { slug: string }[]).map((r) => r.slug);
    const remaining = limit - (data ?? []).length;
    if (categoryId && remaining > 0) {
      const { data: catData } = await supabase
        .from("listings")
        .select(LISTING_CARD_SELECT)
        .eq("status", "published")
        .eq("category_id", categoryId)
        .neq("slug", currentSlug)
        .not("slug", "in", `(${[currentSlug, ...provinceIds].join(",")})`)
        .order("published_at", { ascending: false })
        .limit(remaining);
      return [...(data ?? []), ...(catData ?? [])] as unknown as SearchListing[];
    }
    if ((data ?? []).length > 0) return data as unknown as SearchListing[];
  }

  // Fallback: latest listings
  const { data } = await supabase
    .from("listings")
    .select(LISTING_CARD_SELECT)
    .eq("status", "published")
    .neq("slug", currentSlug)
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as SearchListing[];
}

export async function getLatestListings(limit = 8): Promise<SearchListing[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select(LISTING_CARD_SELECT)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as SearchListing[];
}

export async function getCategoriesWithListings(): Promise<
  { category: { id: number; name_th: string; slug: string; icon: string | null }; listings: SearchListing[] }[]
> {
  const supabase = await createClient();

  const { data: cats } = await supabase
    .from("categories")
    .select("id, name_th, slug, icon")
    .eq("is_active", true)
    .order("display_order");

  if (!cats || cats.length === 0) return [];

  const results = await Promise.all(
    cats.map(async (cat) => {
      const { data } = await supabase
        .from("listings")
        .select(LISTING_CARD_SELECT)
        .eq("category_id", cat.id)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(3);
      return { category: cat, listings: (data ?? []) as unknown as SearchListing[] };
    })
  );

  return results.filter((r) => r.listings.length > 0);
}

export type PopularProvince = {
  province_id: number;
  name_th: string;
  name_en: string;
  slug: string;
  listing_count: number;
};

export const getPopularProvinces = unstable_cache(
  async (limit = 12): Promise<PopularProvince[]> => {
    const supabase = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).rpc("popular_provinces", { limit_n: limit });
    return (data ?? []) as PopularProvince[];
  },
  ["popular-provinces"],
  { revalidate: 600 }
);

export type Banner = {
  id: string;
  title: string | null;
  image_url: string;
  link_url: string | null;
  display_order: number;
};

export async function getActiveBanners(): Promise<Banner[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("banners")
    .select("id, title, image_url, link_url, display_order")
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("display_order");
  return (data ?? []) as Banner[];
}

export const getTotalListingCount = unstable_cache(
  async () => {
    const supabase = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { count } = await supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "published");
    return count ?? 0;
  },
  ["total-listing-count"],
  { revalidate: 300 }
);
