import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const BOOST_PACKAGES = {
  homepage: { label: "ดันโพสหน้าแรก", type: "homepage", coins: 20, days: 0 },
  premium_10: { label: "Premium 10 วัน", type: "premium", coins: 300, days: 10 },
  premium_20: { label: "Premium 20 วัน", type: "premium", coins: 500, days: 20 },
  facebook_7: { label: "โฆษณา Facebook 7 วัน", type: "facebook", coins: 1500, days: 7 },
  facebook_15: { label: "โฆษณา Facebook 15 วัน", type: "facebook", coins: 3000, days: 15 },
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

    const { packageKey, contactInfo, paymentMethod, tokenId } = await req.json() as {
      packageKey: PackageKey;
      contactInfo?: string;
      paymentMethod?: "coins" | "card";
      tokenId?: string;
    };

    const pkg = BOOST_PACKAGES[packageKey];
    if (!pkg) return NextResponse.json({ error: "Invalid package" }, { status: 400 });

    const method = paymentMethod ?? "coins";

    // Verify listing belongs to user
    const { data: listing } = await supabase
      .from("listings")
      .select("id, status, boost_rank, is_featured, featured_until, boost_until")
      .eq("id", listingId)
      .eq("user_id", user.id)
      .single();
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

    const admin = createAdminClient();

    if (method === "card") {
      // Direct card payment via Omise (1 coin = 1 baht)
      if (!tokenId) return NextResponse.json({ error: "tokenId required" }, { status: 400 });
      if (!OMISE_SECRET_KEY) return NextResponse.json({ error: "ระบบ payment ยังไม่พร้อม" }, { status: 500 });

      const omiseRes = await omiseFetch("/charges", {
        method: "POST",
        body: new URLSearchParams({
          amount: String(pkg.coins * 100), // satang, 1 coin = 1 baht
          currency: "thb",
          card: tokenId,
        }).toString(),
      });
      const charge = await omiseRes.json();
      if (!omiseRes.ok || charge.status !== "successful") {
        return NextResponse.json({ error: charge.message ?? "การชำระเงินไม่สำเร็จ" }, { status: 502 });
      }

      // Record payment transaction
      await admin.from("wallet_transactions").insert({
        user_id: user.id,
        amount: pkg.coins,
        type: "spend",
        description: `${pkg.label} — ชำระด้วยบัตร`,
        omise_charge_id: charge.id,
        status: "success",
      });
    } else {
      // Coin payment — check balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("id", user.id)
        .single();
      const balance = Math.floor(Number(profile?.wallet_balance ?? 0));
      if (balance < pkg.coins) {
        return NextResponse.json({ error: "coin ไม่พอ", balance }, { status: 400 });
      }

      await admin.rpc("increment_wallet_balance", { p_user_id: user.id, p_amount: -pkg.coins });
      await admin.from("wallet_transactions").insert({
        user_id: user.id,
        amount: pkg.coins,
        type: "spend",
        description: `${pkg.label} — ประกาศ ${listingId.slice(0, 8)}...`,
        status: "success",
      });
    }

    // Execute boost action
    const now = new Date();
    if (pkg.type === "homepage") {
      await admin
        .from("listings")
        .update({ boost_rank: (listing.boost_rank ?? 0) + 1, boost_until: now.toISOString() })
        .eq("id", listingId);
    } else if (pkg.type === "premium") {
      const currentFeaturedUntil = listing.featured_until ? new Date(listing.featured_until) : now;
      const baseDate = currentFeaturedUntil > now ? currentFeaturedUntil : now;
      const newFeaturedUntil = new Date(baseDate.getTime() + pkg.days * 24 * 60 * 60 * 1000);
      await admin
        .from("listings")
        .update({ is_featured: true, featured_until: newFeaturedUntil.toISOString() })
        .eq("id", listingId);
    }

    // Record boost
    const expiresAt = new Date(now.getTime() + pkg.days * 24 * 60 * 60 * 1000);
    await admin.from("listing_boosts").insert({
      listing_id: listingId,
      user_id: user.id,
      type: pkg.type,
      package_key: packageKey,
      coins_spent: pkg.coins,
      duration_days: pkg.days,
      expires_at: pkg.type !== "homepage" ? expiresAt.toISOString() : null,
      status: pkg.type === "facebook" ? "pending" : "active",
      contact_info: contactInfo ?? null,
    });

    return NextResponse.json({ success: true, coinsSpent: pkg.coins });
  } catch (err) {
    console.error("[boost] error:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
