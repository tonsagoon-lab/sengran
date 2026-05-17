import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { omiseFetch } from "@/lib/omise/execute-action";
import { sendTelegramNotification } from "@/lib/telegram";

const QUOTA_PACKAGES = {
  quota_20: { label: "เพิ่ม 20 ประกาศ/ปี", baht: 300, listings: 20 },
  quota_50: { label: "เพิ่ม 50 ประกาศ/ปี", baht: 500, listings: 50 },
  quota_1200: { label: "เพิ่ม 120 ประกาศ/ปี", baht: 1000, listings: 120 },
} as const;

type PackageKey = keyof typeof QUOTA_PACKAGES;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { packageKey, paymentMethod, tokenId } = await req.json() as {
      packageKey: PackageKey;
      paymentMethod: "card" | "promptpay";
      tokenId?: string;
    };

    const pkg = QUOTA_PACKAGES[packageKey];
    if (!pkg) return NextResponse.json({ error: "Invalid package" }, { status: 400 });
    if (!process.env.OMISE_SECRET_KEY) return NextResponse.json({ error: "ระบบ payment ยังไม่พร้อม" }, { status: 500 });

    const { data: profile } = await supabase.from("profiles").select("listing_quota").eq("id", user.id).single();
    const currentQuota = Number(profile?.listing_quota ?? 0);
    const admin = createAdminClient();

    if (paymentMethod === "promptpay") {
      const params = new URLSearchParams({
        amount: String(pkg.baht * 100),
        currency: "thb",
        "source[type]": "promptpay",
        "metadata[action]": "quota_upgrade",
        "metadata[user_id]": user.id,
        "metadata[listings_to_add]": String(pkg.listings),
        "metadata[label]": pkg.label,
      });
      const omiseRes = await omiseFetch("/charges", { method: "POST", body: params.toString() });
      const charge = await omiseRes.json();
      if (!omiseRes.ok) return NextResponse.json({ error: charge.message ?? "Omise error" }, { status: 502 });

      await admin.from("wallet_transactions").insert({
        user_id: user.id,
        amount: pkg.baht,
        type: "spend",
        description: pkg.label,
        omise_charge_id: charge.id,
        status: "pending",
      });

      const qrImageUrl: string | null = charge.source?.scannable_code?.image?.download_uri ?? null;
      return NextResponse.json({ chargeId: charge.id, qrImageUrl });
    }

    // Card payment
    if (!tokenId) return NextResponse.json({ error: "tokenId required" }, { status: 400 });
    const omiseRes = await omiseFetch("/charges", {
      method: "POST",
      body: new URLSearchParams({ amount: String(pkg.baht * 100), currency: "thb", card: tokenId }).toString(),
    });
    const charge = await omiseRes.json();
    if (!omiseRes.ok || charge.status !== "successful") {
      return NextResponse.json({ error: charge.message ?? "การชำระเงินไม่สำเร็จ" }, { status: 502 });
    }

    await admin.from("profiles").update({ listing_quota: currentQuota + pkg.listings }).eq("id", user.id);
    await admin.from("wallet_transactions").insert({
      user_id: user.id,
      amount: pkg.baht,
      type: "spend",
      description: pkg.label,
      omise_charge_id: charge.id,
      status: "success",
    });

    await sendTelegramNotification(
      `💰 <b>คำสั่งซื้อใหม่</b>\n` +
      `📦 เพิ่มโควต้าประกาศ (บัตรเครดิต)\n` +
      `➕ จำนวน: ${pkg.listings} ประกาศ\n` +
      `💵 ยอด: ${pkg.baht.toLocaleString("th-TH")} บาท\n` +
      `🔖 Charge: ${charge.id}`
    );

    return NextResponse.json({ success: true, newQuota: currentQuota + pkg.listings });
  } catch (err) {
    console.error("[quota-upgrade] error:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
