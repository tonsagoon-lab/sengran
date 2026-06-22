"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { generateUniqueSlug } from "@/lib/utils/slug";

export type EquipmentActionResult =
  | { error: string; success?: never }
  | { success: true; listingId: string; error?: never }
  | undefined;

// ── Create equipment listing ───────────────────────────────────

export async function createEquipmentListingAction(
  _prevState: EquipmentActionResult,
  formData: FormData
): Promise<EquipmentActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get profile contact info
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, mobile, line_id")
    .eq("id", user.id)
    .single();

  if (!profile?.display_name || !profile?.mobile) {
    return { error: "กรุณากรอกชื่อและเบอร์โทรในโปรไฟล์ก่อนลงประกาศ" };
  }

  const title = formData.get("title") as string;
  const shopTypeIdsRaw = formData.get("shop_type_ids") as string;
  const shopTypeIds: number[] = shopTypeIdsRaw ? JSON.parse(shopTypeIdsRaw) : [];
  const condition = formData.get("condition") as string;
  const price = formData.get("price") as string;
  const description = formData.get("description") as string;
  const provinceId = formData.get("province_id") as string;
  const district = formData.get("district") as string | null;
  const address = formData.get("address") as string | null;
  const latitude = formData.get("latitude") as string | null;
  const longitude = formData.get("longitude") as string | null;
  const status = (formData.get("status") as "published" | "draft") ?? "published";
  const listingId = (formData.get("listing_id") as string) || crypto.randomUUID();

  if (!title?.trim()) return { error: "กรุณากรอกชื่อสินค้า" };
  if (!shopTypeIds.length || shopTypeIds.length > 4) return { error: "กรุณาเลือกประเภทร้านอย่างน้อย 1 และไม่เกิน 4 ประเภท" };
  if (!condition || !["new", "used"].includes(condition)) {
    return { error: "กรุณาเลือกสภาพสินค้า" };
  }
  if (!price || isNaN(Number(price))) return { error: "กรุณาระบุราคาที่ถูกต้อง" };
  if (!description?.trim()) return { error: "กรุณาอธิบายสินค้า" };
  if (!provinceId) return { error: "กรุณาเลือกจังหวัด" };

  // Get IP address for fraud tracking
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    null;

  const slug = await generateUniqueSlug(title);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertData: any = {
    id: listingId,
    user_id: user.id,
    title: title.trim(),
    description: description.trim(),
    listing_type: "equipment",
    sale_price: Number(price),
    rent_price: null,
    condition: condition as "new" | "used",
    category_id: null,
    shop_type_ids: shopTypeIds,
    province_id: Number(provinceId),
    district: district || null,
    address: address || null,
    latitude: latitude ? Number(latitude) : null,
    longitude: longitude ? Number(longitude) : null,
    contact_name: profile.display_name,
    contact_mobile: profile.mobile,
    contact_line: profile.line_id ?? null,
    posted_ip: ip,
    slug,
    status,
    published_at: status !== "draft" ? new Date().toISOString() : null,
    expires_at:
      status !== "draft"
        ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        : null,
  };
  const { error: insertError } = await supabase.from("listings").insert(insertData);

  if (insertError) return { error: `เกิดข้อผิดพลาด: ${insertError.message}` };

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

  // Log activity
  await logActivityAction({
    action: "equipment_listing_created",
    metadata: { listing_id: listingId, status },
  });

  revalidatePath("/equipment");
  revalidatePath("/my-listings");
  revalidatePath("/");

  return { success: true, listingId: slug };
}

// ── Update equipment status ────────────────────────────────────

export async function updateEquipmentStatusAction(
  listingId: string,
  status: "published" | "reserved" | "sold" | "hidden" | "draft"
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" };

  const { error } = await supabase
    .from("listings")
    .update({ status })
    .eq("id", listingId)
    .eq("user_id", user.id)
    .eq("listing_type", "equipment");

  if (error) return { error: error.message };

  revalidatePath("/equipment");
  revalidatePath("/my-listings");
  return { success: true };
}

// ── Renew equipment listing ────────────────────────────────────

export async function renewEquipmentListingAction(
  listingId: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" };

  const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("listings")
    .update({
      expires_at: newExpiresAt,
      status: "published",
      published_at: new Date().toISOString(),
    })
    .eq("id", listingId)
    .eq("user_id", user.id)
    .eq("listing_type", "equipment");

  if (error) return { error: error.message };

  revalidatePath("/equipment");
  revalidatePath("/my-listings");
  return { success: true };
}

// ── Admin delete equipment listing ────────────────────────────

export async function adminDeleteEquipmentListingAction(
  listingId: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" };

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";
  const STAFF_EMAILS = (process.env.STAFF_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  if (user.email !== ADMIN_EMAIL && !STAFF_EMAILS.includes(user.email ?? "")) {
    return { error: "ไม่มีสิทธิ์" };
  }

  // Use admin client to bypass RLS
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminClient = createAdminClient();

  await adminClient.from("listing_images").delete().eq("listing_id", listingId);

  const { error } = await adminClient
    .from("listings")
    .delete()
    .eq("id", listingId)
    .eq("listing_type", "equipment");

  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/equipment");
  return { success: true };
}

// ── Log user activity ──────────────────────────────────────────

export async function logActivityAction(params: {
  action: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const headerList = await headers();
    const ip =
      headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerList.get("x-real-ip") ??
      null;
    const userAgent = headerList.get("user-agent") ?? null;

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminClient = createAdminClient();
    await adminClient.from("user_activity_logs").insert({
      user_id: user?.id ?? null,
      action: params.action,
      ip_address: ip,
      user_agent: userAgent,
      metadata: params.metadata ?? null,
    });
  } catch {
    // Fire and forget — never throw
  }
}
