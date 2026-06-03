"use server";

import { createClient } from "@/lib/supabase/server";
import { getMapListings } from "@/lib/db/listings";
import type { MapListing } from "@/lib/db/listings";

export async function loadMapListingsByDistance(
  lat: number,
  lng: number,
  offset: number
): Promise<MapListing[]> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("map_listings_by_distance", {
    user_lat: lat,
    user_lng: lng,
    p_offset: offset,
    p_limit: 10,
  });
  if (error) throw error;
  return (data as MapListing[]) ?? [];
}

export async function loadMapListingsByProvince(
  provinceNameTh: string,
  offset: number
): Promise<MapListing[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select(`
      id, slug, title, listing_type, sale_price, rent_price, latitude, longitude, district,
      listing_images(storage_path, display_order),
      provinces!inner(name_th),
      categories(name_th, slug)
    `)
    .eq("status", "published")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .eq("provinces.name_th", provinceNameTh)
    .order("published_at", { ascending: false })
    .range(offset, offset + 9);
  return (data ?? []) as unknown as MapListing[];
}

export async function loadMoreMapListings(offset: number): Promise<MapListing[]> {
  return getMapListings(offset, 10);
}
