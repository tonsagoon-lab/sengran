import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const BOOST_PACKAGES = {
  premium_15: { label: "Premium หน้าแรก 15 วัน", type: "premium", baht: 300, days: 15 },
  premium_30: { label: "Premium หน้าแรก 30 วัน", type: "premium", baht: 500, days: 30 },
  facebook_10: { label: "โฆษณา Facebook 10 วัน", type: "facebook", baht: 1500, days: 10 },
  facebook_20: { label: "โฆษณา Facebook 20 วัน", type: "facebook", baht: 2990, days: 20 },
} as const;

export type PackageKey = keyof typeof BOOST_PACKAGES;

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { packageKey, contactInfo, tokenId } = await req.json() as {
      packageKey: PackageKey;
      contactInfo?: string;
      tokenId: string;
    };

    const pkg = BOOST_PACKAGES[packageKey];
    if (!pkg) return NextResponse.json({ error: "Invalid package" }, { status: 400 });
    if (!tokenId) return NextResponse.json({ error: "tokenId required" }, { status: 400 });
    if (!OMISE_SECRET_KEY) return NextResponse.json({ error: "ระบบ payment ยังไม่พร้อม" }, { status: 500 });

    // Verify listing belongs to user
    const { data: listing } = await supabase
      .from("listings")
      .select("id, boost_rank, is_featured, featured_until")
      .eq("id", listingId)
      .eq("user_id", user.id)
      .single();
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

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

    // Record purchase
    await admin.from("wallet_transactions").insert({
      user_id: user.id,
      amount: pkg.baht,
      type: "spend",
      description: `${pkg.label}`,
      omise_charge_id: charge.id,
      status: "success",
    });

    // Execute boost action
    const now = new Date();
    if (pkg.type === "premium") {
      const currentFeaturedUntil = listing.featured_until ? new Date(listing.featured_until) : now;
      const baseDate = currentFeaturedUntil > now ? currentFeaturedUntil : now;
      const newFeaturedUntil = new Date(baseDate.getTime() + pkg.days * 24 * 60 * 60 * 1000);
      await admin.from("listings").update({ is_featured: true, featured_until: newFeaturedUntil.toISOString() }).eq("id", listingId);
    }

    const expiresAt = new Date(now.getTime() + pkg.days * 24 * 60 * 60 * 1000);
    await admin.from("listing_boosts").insert({
      listing_id: listingId,
      user_id: user.id,
      type: pkg.type,
      package_key: packageKey,
      coins_spent: pkg.baht,
      duration_days: pkg.days,
      expires_at: expiresAt.toISOString(),
      status: pkg.type === "facebook" ? "pending" : "active",
      contact_info: contactInfo ?? null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[boost] error:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
