"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { listingSchema } from "@/lib/schemas/listing";
import { stripHtmlTags } from "@/lib/utils/html";
import { rateLimit } from "@/lib/rate-limit";
import type { SearchListing } from "@/lib/db/listings";

const NEAR_ME_SELECT = `
  id, title, slug, listing_type, sale_price, rent_price,
  is_featured, featured_until, district, province_id, view_count, published_at,
  listing_images(id, storage_path, display_order),
  categories(name_th, slug),
  provinces(name_th, slug)
`.trim();

export async function getNearMeListings(
  params:
    | { type: "gps"; lat: number; lng: number; radiusKm?: number }
    | { type: "province"; provinceId: number }
    | { type: "latest" }
): Promise<{ listings: SearchListing[]; total: number }> {
  const supabase = await createClient();

  if (params.type === "latest") {
    const { data, count } = await supabase
      .from("listings")
      .select(NEAR_ME_SELECT, { count: "exact" })
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(4);
    return { listings: (data ?? []) as unknown as SearchListing[], total: count ?? 0 };
  }

  if (params.type === "gps") {
    const { lat, lng, radiusKm = 10 } = params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: nearIds } = await (supabase as any).rpc("listings_within_distance", {
      center_lat: lat,
      center_lng: lng,
      radius_km: radiusKm,
    });

    if (!nearIds || nearIds.length === 0) {
      return { listings: [], total: 0 };
    }

    const ids = (nearIds as unknown as { id: string; distance_km: number }[])
      .slice(0, 4)
      .map((r) => r.id);

    const { data: rawData } = await supabase
      .from("listings")
      .select(NEAR_ME_SELECT)
      .in("id", ids)
      .eq("status", "published");

    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const data = ((rawData ?? []) as unknown as SearchListing[]).filter(
      (l) => l.published_at && new Date(l.published_at).getTime() > oneYearAgo
    );

    // Preserve distance order
    const byId = new Map(data.map((l) => [l.id, l]));
    const ordered = ids.map((id) => byId.get(id)).filter((x): x is SearchListing => !!x);

    return {
      listings: ordered,
      total: (nearIds as unknown[]).length,
    };
  } else {
    const { data, count } = await supabase
      .from("listings")
      .select(NEAR_ME_SELECT, { count: "exact" })
      .eq("province_id", params.provinceId)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(4);

    const oneYearAgo2 = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const filtered = ((data ?? []) as unknown as SearchListing[]).filter(
      (l) => l.published_at && new Date(l.published_at).getTime() > oneYearAgo2
    );
    return {
      listings: filtered,
      total: count ?? 0,
    };
  }
}

export type ListingActionResult =
  | { error: string; success?: never }
  | { success: true; listingId: string; error?: never }
  | undefined;

async function getProfileContact(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("display_name, mobile, line_id")
    .eq("id", userId)
    .single();
  return data;
}

export async function createListingAction(
  _prevState: ListingActionResult,
  formData: FormData
): Promise<ListingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 5 listings per hour per user
  const { allowed } = await rateLimit(`listing:${user.id}`, 5, 3600);
  if (!allowed) return { error: "ลงประกาศถี่เกินไป กรุณารอสักครู่" };

  const profile = await getProfileContact(supabase, user.id);
  if (!profile?.display_name || !profile?.mobile) {
    return { error: "กรุณากรอกชื่อและเบอร์โทรในโปรไฟล์ก่อนลงประกาศ" };
  }

  const raw = Object.fromEntries(formData.entries());

  // Validate description as plain text (strip HTML first)
  const descHtml = raw.description as string;
  const descText = stripHtmlTags(descHtml);
  const rawForValidation = { ...raw, description: descText };

  const parsed = listingSchema.safeParse(rawForValidation);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { error: firstError.message };
  }

  const d = parsed.data;
  const listingId = (raw.listing_id as string) || crypto.randomUUID();
  const slug = await generateUniqueSlug(d.title);

  const { error: insertError } = await supabase.from("listings").insert({
    id: listingId,
    user_id: user.id,
    title: d.title,
    description: descHtml, // store raw HTML
    listing_type: d.listing_type,
    sale_price: d.sale_price ? Number(d.sale_price) : null,
    rent_price: d.rent_price ? Number(d.rent_price) : null,
    deposit_months: d.deposit_months ? Number(d.deposit_months) : null,
    price_note: d.price_note || null,
    category_id: d.category_id ? Number(d.category_id) : null,
    province_id: Number(d.province_id),
    district: d.district || null,
    address: d.address || null,
    area_sqm: d.area_sqm ? Number(d.area_sqm) : null,
    latitude: d.latitude ? Number(d.latitude) : null,
    longitude: d.longitude ? Number(d.longitude) : null,
    contact_name: profile.display_name,
    contact_mobile: profile.mobile,
    contact_line: profile.line_id || null,
    video_url: d.video_url || null,
    slug,
    status: (raw.status as "published" | "draft") ?? "published",
    published_at: raw.status !== "draft" ? new Date().toISOString() : null,
    expires_at: raw.status !== "draft"
      ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      : null,
  });

  if (insertError) return { error: `เกิดข้อผิดพลาด: ${insertError.message}` };

  // Insert amenities
  const amenityIds = formData.getAll("amenity_ids[]") as string[];
  if (amenityIds.length > 0) {
    await supabase.from("listing_amenities").insert(
      amenityIds.map((aid) => ({ listing_id: listingId, amenity_id: Number(aid) }))
    );
  }

  // Insert image rows
  const imagePaths = formData.getAll("image_paths[]") as string[];
  if (imagePaths.length > 0) {
    await supabase.from("listing_images").insert(
      imagePaths.map((path, idx) => ({
        listing_id: listingId,
        storage_path: path,
        display_order: idx,
      }))
    );
  }

  revalidatePath("/my-listings");
  revalidatePath("/");
  revalidatePath("/listings");
  return { success: true, listingId };
}

function isPrivileged(email: string | undefined): boolean {
  if (!email) return false;
  const admin = process.env.ADMIN_EMAIL ?? "";
  const staff = (process.env.STAFF_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  return email === admin || staff.includes(email);
}

export async function updateListingAction(
  _prevState: ListingActionResult,
  formData: FormData
): Promise<ListingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const listingId = formData.get("listing_id") as string;
  if (!listingId) return { error: "ไม่พบประกาศ" };

  const privileged = isPrivileged(user.email ?? undefined);

  // Admin/staff: use service role client to bypass RLS; keep original owner's contact
  const updateClient = privileged
    ? (await import("@/lib/supabase/admin")).createAdminClient()
    : supabase;

  let contactFields: Record<string, string | null | undefined> = {};
  if (!privileged) {
    const profile = await getProfileContact(supabase, user.id);
    contactFields = {
      contact_name: profile?.display_name ?? undefined,
      contact_mobile: profile?.mobile ?? undefined,
      contact_line: profile?.line_id ?? undefined,
    };
  }

  const raw = Object.fromEntries(formData.entries());
  const descHtml = raw.description as string;
  const descText = stripHtmlTags(descHtml);
  const rawForValidation = { ...raw, description: descText };

  const parsed = listingSchema.safeParse(rawForValidation);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const d = parsed.data;
  let query = updateClient
    .from("listings")
    .update({
      title: d.title,
      description: descHtml,
      listing_type: d.listing_type,
      sale_price: d.sale_price ? Number(d.sale_price) : null,
      rent_price: d.rent_price ? Number(d.rent_price) : null,
      deposit_months: d.deposit_months ? Number(d.deposit_months) : null,
      price_note: d.price_note || null,
      category_id: d.category_id ? Number(d.category_id) : null,
      province_id: Number(d.province_id),
      district: d.district || null,
      address: d.address || null,
      area_sqm: d.area_sqm ? Number(d.area_sqm) : null,
      latitude: d.latitude ? Number(d.latitude) : null,
      longitude: d.longitude ? Number(d.longitude) : null,
      video_url: d.video_url || null,
      ...contactFields,
    })
    .eq("id", listingId);

  // Non-privileged users can only edit their own listings
  if (!privileged) query = (query as typeof query).eq("user_id", user.id);

  const { error: updateError } = await query;
  if (updateError) return { error: `เกิดข้อผิดพลาด: ${updateError.message}` };

  // Add new images
  const newImagePaths = formData.getAll("new_image_paths[]") as string[];
  if (newImagePaths.length > 0) {
    const { data: existing } = await supabase
      .from("listing_images")
      .select("display_order")
      .eq("listing_id", listingId)
      .order("display_order", { ascending: false })
      .limit(1);
    const nextOrder = (existing?.[0]?.display_order ?? -1) + 1;
    await supabase.from("listing_images").insert(
      newImagePaths.map((path, idx) => ({
        listing_id: listingId,
        storage_path: path,
        display_order: nextOrder + idx,
      }))
    );
  }

  revalidatePath("/my-listings");
  revalidatePath("/listings");
  revalidatePath("/");
  return { success: true, listingId };
}

export async function deleteListingAction(listingId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const { data: images } = await supabase
    .from("listing_images")
    .select("storage_path")
    .eq("listing_id", listingId);

  if (images && images.length > 0) {
    await supabase.storage.from("listings").remove(images.map((i) => i.storage_path));
  }

  const { error } = await supabase
    .from("listings")
    .delete()
    .eq("id", listingId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/my-listings");
  revalidatePath("/listings");
  revalidatePath("/");
  return {};
}

export async function updateListingStatusAction(
  listingId: string,
  status: "published" | "hidden" | "sold"
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const { error } = await supabase
    .from("listings")
    .update({ status })
    .eq("id", listingId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/my-listings");
  revalidatePath("/listings");
  revalidatePath("/");
  return {};
}

export async function deleteListingImageAction(
  imageId: string,
  storagePath: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  await supabase.storage.from("listings").remove([storagePath]);
  const { error } = await supabase.from("listing_images").delete().eq("id", imageId);
  if (error) return { error: error.message };
  return {};
}

export async function incrementViewCountAction(slug: string): Promise<void> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).rpc("increment_listing_view_count", { listing_slug: slug });
}

export async function toggleFavoriteAction(listingId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" };

  const { data: existing } = await supabase
    .from("favorites")
    .select("listing_id")
    .eq("user_id", user.id)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (existing) {
    await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", listingId);
  } else {
    await supabase.from("favorites").insert({ user_id: user.id, listing_id: listingId });
  }

  revalidatePath(`/property`);
  return {};
}
