import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BOOST_PACKAGES, QUOTA_PACKAGES, type BoostPackageKey, type QuotaPackageKey } from "@/lib/payment-packages";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.xn--72ch7bybxexd0cc.com";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function getPackageLabel(packageKey: string): string {
  if (packageKey in BOOST_PACKAGES) return BOOST_PACKAGES[packageKey as BoostPackageKey].label;
  if (packageKey in QUOTA_PACKAGES) return QUOTA_PACKAGES[packageKey as QuotaPackageKey].label;
  return packageKey;
}

async function sendTelegramPhoto(photoUrl: string, caption: string): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, photo: photoUrl, caption, parse_mode: "HTML" }),
    });
  } catch {
    // ไม่ block flow หลักถ้า Telegram ล้มเหลว
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  try {
    const { ref } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify order belongs to user
    const admin = createAdminClient();
    const { data: order } = await admin
      .from("payment_orders")
      .select("id, reference, approve_token, package_key, amount_baht, status")
      .eq("reference", ref)
      .eq("user_id", user.id)
      .single();

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.status === "approved") return NextResponse.json({ error: "Order already approved" }, { status: 400 });

    const formData = await req.formData();
    const slip = formData.get("slip") as File | null;
    if (!slip) return NextResponse.json({ error: "slip file required" }, { status: 400 });

    const ext = slip.name.split(".").pop() ?? "jpg";
    const timestamp = Date.now();
    const storagePath = `payment-slips/${ref}/${timestamp}.${ext}`;

    const arrayBuffer = await slip.arrayBuffer();
    const { error: uploadError } = await admin.storage
      .from("listings")
      .upload(storagePath, arrayBuffer, { contentType: slip.type, upsert: true });

    if (uploadError) {
      console.error("[slip] upload error:", uploadError);
      return NextResponse.json({ error: "อัปโหลดสลิปไม่สำเร็จ" }, { status: 500 });
    }

    // Update order status
    await admin.from("payment_orders").update({
      slip_storage_path: storagePath,
      status: "slip_submitted",
    }).eq("id", order.id);

    // Build approve URL and slip public URL
    const approveUrl = `${SITE_URL}/api/orders/${ref}/approve?token=${order.approve_token}`;
    const slipPublicUrl = `${SUPABASE_URL}/storage/v1/object/public/listings/${storagePath}`;
    const pkgLabel = getPackageLabel(order.package_key);

    const caption =
      `📥 สลิปใหม่: ${order.reference}\n` +
      `📦 ${pkgLabel}\n` +
      `💵 ${order.amount_baht.toLocaleString("th-TH")} บาท\n` +
      `🔗 Approve: ${approveUrl}`;

    await sendTelegramPhoto(slipPublicUrl, caption);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[slip] error:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
