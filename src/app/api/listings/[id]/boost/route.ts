import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { omiseFetch } from "@/lib/omise/execute-action";

export const BOOST_PACKAGES = {
  premium_15: { label: "Premium หน้าแรก 15 วัน", type: "premium", baht: 300, days: 15 },
  premium_30: { label: "Premium หน้าแรก 30 วัน", type: "premium", baht: 500, days: 30 },
  facebook_10: { label: "โฆษณา Facebook 10 วัน", type: "facebook", baht: 1500, days: 10 },
  facebook_20: { label: "โฆษณา Facebook 20 วัน", type: "facebook", baht: 2990, days: 20 },
} as const;

export type PackageKey = keyof typeof BOOST_PACKAGES;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { packageKey, contactInfo, paymentMethod, tokenId } = await req.json() as {
      packageKey: PackageKey;
      contactInfo?: string;
      paymentMethod: "card" | "promptpay";
      tokenId?: string;
    };

    const pkg = BOOST_PACKAGES[packageKey];
    if (!pkg) return NextResponse.json({ error: "Invalid package" }, { status: 400 });

    const { data: listing } = await supabase
      .from("listings").select("id").eq("id", listingId).eq("user_id", user.id).single();
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

    if (!process.env.OMISE_SECRET_KEY) return NextResponse.json({ error: "ระบบ payment ยังไม่พร้อม" }, { status: 500 });

    const admin = createAdminClient();

    if (paymentMethod === "promptpay") {
      const params = new URLSearchParams({
        amount: String(pkg.baht * 100),
        currency: "thb",
        "source[type]": "promptpay",
        "metadata[action]": "boost",
        "metadata[pkg_type]": pkg.type,
        "metadata[listing_id]": listingId,
        "metadata[package_key]": packageKey,
        "metadata[user_id]": user.id,
        "metadata[days]": String(pkg.days),
        "metadata[label]": pkg.label,
        "metadata[contact_info]": contactInfo ?? "",
      });
      const omiseRes = await omiseFetch("/charges", { method: "POST", body: params.toString() });
      const charge = await omiseRes.json();
      if (!omiseRes.ok) return NextResponse.json({ error: charge.message ?? "Omise error" }, { status: 502 });

      // Record pending transaction
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

    // Execute boost action immediately
    const now = new Date();
    if (pkg.type === "premium") {
      const { data: lst } = await supabase.from("listings").select("is_featured, featured_until").eq("id", listingId).single();
      const currentUntil = lst?.featured_until ? new Date(lst.featured_until) : now;
      const base = currentUntil > now ? currentUntil : now;
      const newUntil = new Date(base.getTime() + pkg.days * 86400000);
      await admin.from("listings").update({ is_featured: true, featured_until: newUntil.toISOString() }).eq("id", listingId);
    }

    await admin.from("listing_boosts").insert({
      listing_id: listingId,
      user_id: user.id,
      type: pkg.type,
      package_key: packageKey,
      coins_spent: pkg.baht,
      duration_days: pkg.days,
      expires_at: new Date(now.getTime() + pkg.days * 86400000).toISOString(),
      status: pkg.type === "facebook" ? "pending" : "active",
      contact_info: contactInfo ?? null,
    });

    await admin.from("wallet_transactions").insert({
      user_id: user.id,
      amount: pkg.baht,
      type: "spend",
      description: pkg.label,
      omise_charge_id: charge.id,
      status: "success",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[boost] error:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
