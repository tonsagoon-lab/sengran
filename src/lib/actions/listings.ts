"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { listingSchema } from "@/lib/schemas/listing";

export type ListingActionResult =
  | { error: string; success?: never }
  | { success: true; listingId: string; error?: never }
  | undefined;

export async function createListingAction(
  _prevState: ListingActionResult,
  formData: FormData
): Promise<ListingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const raw = Object.fromEntries(formData.entries());
  const parsed = listingSchema.safeParse(raw);
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
    description: d.description,
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
    contact_name: d.contact_name,
    contact_mobile: d.contact_mobile,
    contact_line: d.contact_line || null,
    video_url: d.video_url || null,
    slug,
    status: "published",
    published_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (insertError) return { error: `เกิดข้อผิดพลาด: ${insertError.message}` };

  // Insert image rows from hidden inputs
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
  return { success: true, listingId };
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

  const raw = Object.fromEntries(formData.entries());
  const parsed = listingSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const d = parsed.data;
  const { error: updateError } = await supabase
    .from("listings")
    .update({
      title: d.title,
      description: d.description,
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
      contact_name: d.contact_name,
      contact_mobile: d.contact_mobile,
      contact_line: d.contact_line || null,
      video_url: d.video_url || null,
    })
    .eq("id", listingId)
    .eq("user_id", user.id);

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

  revalidatePath(`/my-listings`);
  revalidatePath(`/listing`);
  return { success: true, listingId };
}

export async function deleteListingAction(listingId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  // Get images to delete from storage
  const { data: images } = await supabase
    .from("listing_images")
    .select("storage_path")
    .eq("listing_id", listingId);

  if (images && images.length > 0) {
    await supabase.storage
      .from("listings")
      .remove(images.map((i) => i.storage_path));
  }

  const { error } = await supabase
    .from("listings")
    .delete()
    .eq("id", listingId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/my-listings");
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

  revalidatePath(`/listing`);
  return {};
}
