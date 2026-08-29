import { createClient } from "@/lib/supabase/server";
import type { ListingImage, EquipmentCondition } from "@/lib/types/database";

// ── Types ─────────────────────────────────────────────────────

export type EquipmentCategory = {
  id: number;
  name_th: string;
  slug: string;
  icon: string | null;
  display_order: number;
};

export type EquipmentListing = {
  id: string;
  title: string;
  slug: string;
  listing_type: "equipment";
  sale_price: number | null;
  condition: EquipmentCondition | null;
  status: "draft" | "published" | "sold" | "expired" | "hidden" | "reserved";
  is_featured: boolean;
  featured_until: string | null;
  district: string | null;
  province_id: number | null;
  view_count: number;
  published_at: string | null;
  shop_type_ids: number[] | null;
  listing_images: Array<{ id: string; storage_path: string; display_order: number }>;
  categories: { name_th: string; slug: string } | null;
  provinces: { name_th: string; slug: string } | null;
};

export type EquipmentListingWithDetails = {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description: string;
  listing_type: "equipment";
  sale_price: number | null;
  condition: EquipmentCondition | null;
  status: "draft" | "published" | "sold" | "expired" | "hidden" | "reserved";
  is_featured: boolean;
  featured_until: string | null;
  district: string | null;
  address: string | null;
  category_id: number | null;
  shop_type_ids: number[] | null;
  province_id: number | null;
  latitude: number | null;
  longitude: number | null;
  video_url: string | null;
  view_count: number;
  view_count_seed: number | null;
  published_at: string | null;
  expires_at: string | null;
  contact_name: string;
  contact_mobile: string;
  contact_line: string | null;
  listing_images: ListingImage[];
  categories: { name_th: string; slug: string } | null;
  provinces: { name_th: string; slug: string } | null;
  profiles: {
    display_name: string | null;
    mobile: string | null;
    line_id: string | null;
    avatar_url: string | null;
    phone_verified: boolean;
  } | null;
};

export interface EquipmentSearchParams {
  q?: string;
  cat?: string;
  province?: string;
  condition?: string;
  min_price?: string;
  max_price?: string;
  sort?: string;
  page?: string;
}

const EQUIPMENT_CARD_SELECT = `
  id, title, slug, listing_type, sale_price, condition, status,
  is_featured, featured_until, district, province_id, view_count, published_at, shop_type_ids,
  listing_images(id, storage_path, display_order),
  categories(name_th, slug),
  provinces(name_th, slug)
`.trim();

// ── Fetch equipment categories ─────────────────────────────────

export async function getEquipmentCategories(): Promise<EquipmentCategory[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name_th, slug, icon, display_order")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .eq("category_type" as any, "shop")
    .eq("is_active", true)
    .neq("slug", "space-only")
    .order("display_order");
  return (data ?? []) as EquipmentCategory[];
}

// ── Search equipment listings ──────────────────────────────────

export async function searchEquipment(params: EquipmentSearchParams): Promise<{
  listings: EquipmentListing[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const supabase = await createClient();
  const page = Math.max(1, parseInt(params.page ?? "1") || 1);
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  // Category pre-filter (slug → id)
  let categoryId: number | null = null;
  if (params.cat) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", params.cat)
      .single();
    if (!cat) return { listings: [], total: 0, page, pageSize };
    categoryId = cat.id;
  }

  // Province pre-filter (slug → id)
  let provinceId: number | null = null;
  if (params.province) {
    const { data: prov } = await supabase
      .from("provinces")
      .select("id")
      .eq("slug", params.province)
      .single();
    if (!prov) return { listings: [], total: 0, page, pageSize };
    provinceId = prov.id;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("listings")
    .select(EQUIPMENT_CARD_SELECT, { count: "exact" })
    .eq("listing_type", "equipment")
    .in("status", ["published", "reserved", "sold"]);

  if (categoryId) query = query.filter("shop_type_ids", "cs", `{${categoryId}}`);
  if (provinceId) query = query.eq("province_id", provinceId);

  // Condition filter
  if (params.condition && ["new", "used"].includes(params.condition)) {
    query = query.eq("condition", params.condition);
  }

  // Price range
  const min = params.min_price ? Number(params.min_price) : null;
  const max = params.max_price ? Number(params.max_price) : null;
  if (min) query = query.gte("sale_price", min);
  if (max) query = query.lte("sale_price", max);

  // Text search
  if (params.q?.trim()) {
    const q = params.q.trim();
    query = query.or(`title.ilike.%${q}%,district.ilike.%${q}%`);
  }

  // Sort
  query = query.order("boost_rank", { ascending: false });
  const sort = params.sort ?? "latest";
  if (sort === "latest") {
    query = query.order("published_at", { ascending: false });
  } else if (sort === "price_asc") {
    query = query.order("sale_price", { ascending: true, nullsFirst: false });
  } else if (sort === "price_desc") {
    query = query.order("sale_price", { ascending: false, nullsFirst: false });
  } else if (sort === "views") {
    query = query.order("view_count", { ascending: false });
  }

  query = query.range(offset, offset + pageSize - 1);

  const { data, count } = await query;
  return {
    listings: (data ?? []) as unknown as EquipmentListing[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

// ── Get single equipment listing by slug ──────────────────────

export async function getEquipmentBySlug(slug: string): Promise<EquipmentListingWithDetails | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select(
      `*, listing_images(id, storage_path, display_order, alt_text),
       categories(name_th, slug), provinces(name_th, slug),
       profiles!listings_user_id_fkey(display_name, mobile, line_id, avatar_url, phone_verified)`
    )
    .eq("slug", slug)
    .eq("listing_type", "equipment")
    .in("status", ["published", "reserved", "sold", "expired"])
    .single();

  return data as EquipmentListingWithDetails | null;
}

// ── Latest equipment for homepage section ─────────────────────

export async function getLatestEquipment(limit = 8): Promise<EquipmentListing[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select(EQUIPMENT_CARD_SELECT)
    .eq("listing_type", "equipment")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as EquipmentListing[];
}

// ── Related equipment listings ────────────────────────────────

export async function getRelatedEquipment(
  currentSlug: string,
  categoryId: number | null,
  provinceId: number | null,
  limit = 3
): Promise<EquipmentListing[]> {
  const supabase = await createClient();

  if (categoryId) {
    const { data } = await supabase
      .from("listings")
      .select(EQUIPMENT_CARD_SELECT)
      .eq("listing_type", "equipment")
      .eq("status", "published")
      .eq("category_id", categoryId)
      .neq("slug", currentSlug)
      .order("published_at", { ascending: false })
      .limit(limit);
    if (data && data.length >= limit) return data as unknown as EquipmentListing[];
  }

  if (provinceId) {
    const { data } = await supabase
      .from("listings")
      .select(EQUIPMENT_CARD_SELECT)
      .eq("listing_type", "equipment")
      .eq("status", "published")
      .eq("province_id", provinceId)
      .neq("slug", currentSlug)
      .order("published_at", { ascending: false })
      .limit(limit);
    if (data && data.length > 0) return data as unknown as EquipmentListing[];
  }

  const { data } = await supabase
    .from("listings")
    .select(EQUIPMENT_CARD_SELECT)
    .eq("listing_type", "equipment")
    .eq("status", "published")
    .neq("slug", currentSlug)
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as EquipmentListing[];
}
