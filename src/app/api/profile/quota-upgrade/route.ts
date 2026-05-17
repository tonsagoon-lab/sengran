import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const QUOTA_PACKAGES = {
  quota_20: { label: "เพิ่ม 20 ประกาศ/ปี", baht: 300, listings: 20 },
  quota_50: { label: "เพิ่ม 50 ประกาศ/ปี", baht: 500, listings: 50 },
  quota_1200: { label: "เพิ่ม 1,200 ประกาศ/ปี", baht: 1000, listings: 1200 },
} as const;

type PackageKey = keyof typeof QUOTA_PACKAGES;

const OMISE_SECRET_KEY = process.env.OMISE_SECRET_KEY!;

function omiseFetch(path: string, options?: RequestInit) {
  const auth = Buffer.from(`${OMISE_SECRET_KEY}:`).toString("base64");
  return fetch(`https://api.omise.co${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(options?.headers ?? {}),
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { packageKey, tokenId } = await req.json() as { packageKey: PackageKey; tokenId: string };

    const pkg = QUOTA_PACKAGES[packageKey];
    if (!pkg) return NextResponse.json({ error: "Invalid package" }, { status: 400 });
    if (!tokenId) return NextResponse.json({ error: "tokenId required" }, { status: 400 });
    if (!OMISE_SECRET_KEY) return NextResponse.json({ error: "ระบบ payment ยังไม่พร้อม" }, { status: 500 });

    const { data: profile } = await supabase.from("profiles").select("listing_quota").eq("id", user.id).single();
    const currentQuota = Number(profile?.listing_quota ?? 0);

    // Charge via Omise
    const omiseRes = await omiseFetch("/charges", {
      method: "POST",
      body: new URLSearchParams({
        amount: String(pkg.baht * 100),
        currency: "thb",
        card: tokenId,
      }).toString(),
    });
    const charge = await omiseRes.json();
    if (!omiseRes.ok || charge.status !== "successful") {
      return NextResponse.json({ error: charge.message ?? "การชำระเงินไม่สำเร็จ" }, { status: 502 });
    }

    const admin = createAdminClient();

    await admin.from("wallet_transactions").insert({
      user_id: user.id,
      amount: pkg.baht,
      type: "spend",
      description: pkg.label,
      omise_charge_id: charge.id,
      status: "success",
    });

    await admin.from("profiles").update({ listing_quota: currentQuota + pkg.listings }).eq("id", user.id);

    return NextResponse.json({ success: true, newQuota: currentQuota + pkg.listings });
  } catch (err) {
    console.error("[quota-upgrade] error:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
