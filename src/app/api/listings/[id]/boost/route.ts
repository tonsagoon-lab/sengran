import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const BOOST_PACKAGES = {
  homepage: { label: "ดันโพสหน้าแรก", type: "homepage", coins: 20, days: 7 },
  premium_10: { label: "Premium 10 วัน", type: "premium", coins: 300, days: 10 },
  premium_20: { label: "Premium 20 วัน", type: "premium", coins: 500, days: 20 },
  facebook_7: { label: "โฆษณา Facebook 7 วัน", type: "facebook", coins: 1500, days: 7 },
  facebook_15: { label: "โฆษณา Facebook 15 วัน", type: "facebook", coins: 3000, days: 15 },
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

    const { packageKey } = await req.json() as { packageKey: PackageKey };
    const pkg = BOOST_PACKAGES[packageKey];
    if (!pkg) return NextResponse.json({ error: "Invalid package" }, { status: 400 });

    // Verify listing belongs to user
    const { data: listing } = await supabase
      .from("listings")
      .select("id, status, boost_rank, is_featured, featured_until, boost_until")
      .eq("id", listingId)
      .eq("user_id", user.id)
      .single();
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

    // Check coin balance
    const { data: profile } = await supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", user.id)
      .single();
    const balance = Math.floor(Number(profile?.wallet_balance ?? 0));
    if (balance < pkg.coins) {
      return NextResponse.json({ error: "coin ไม่พอ", balance }, { status: 400 });
    }

    const admin = createAdminClient();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + pkg.days * 24 * 60 * 60 * 1000);

    // Update listing based on type
    if (pkg.type === "homepage") {
      // Extend boost_until from now or current expiry (whichever is later)
      const currentBoostUntil = listing.boost_until ? new Date(listing.boost_until) : now;
      const baseDate = currentBoostUntil > now ? currentBoostUntil : now;
      const newBoostUntil = new Date(baseDate.getTime() + pkg.days * 24 * 60 * 60 * 1000);

      await admin
        .from("listings")
        .update({ boost_rank: (listing.boost_rank ?? 0) + 1, boost_until: newBoostUntil.toISOString() })
        .eq("id", listingId);
    } else if (pkg.type === "premium") {
      // Extend featured_until from now or current expiry (whichever is later)
      const currentFeaturedUntil = listing.featured_until ? new Date(listing.featured_until) : now;
      const baseDate = currentFeaturedUntil > now ? currentFeaturedUntil : now;
      const newFeaturedUntil = new Date(baseDate.getTime() + pkg.days * 24 * 60 * 60 * 1000);

      await admin
        .from("listings")
        .update({ is_featured: true, featured_until: newFeaturedUntil.toISOString() })
        .eq("id", listingId);
    }
    // facebook type: just record the order, admin handles manually

    // Deduct coins
    await admin.rpc("increment_wallet_balance", {
      p_user_id: user.id,
      p_amount: -pkg.coins,
    });

    // Record transaction
    await admin.from("wallet_transactions").insert({
      user_id: user.id,
      amount: pkg.coins,
      type: "spend",
      description: `${pkg.label} — ประกาศ ${listingId.slice(0, 8)}...`,
      status: "success",
    });

    // Record boost
    await admin.from("listing_boosts").insert({
      listing_id: listingId,
      user_id: user.id,
      type: pkg.type,
      package_key: packageKey,
      coins_spent: pkg.coins,
      duration_days: pkg.days,
      expires_at: pkg.type !== "homepage" ? expiresAt.toISOString() : null,
      status: pkg.type === "facebook" ? "pending" : "active",
    });

    return NextResponse.json({ success: true, coinsSpent: pkg.coins });
  } catch (err) {
    console.error("[boost] error:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
