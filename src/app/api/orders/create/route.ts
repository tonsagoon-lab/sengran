import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BOOST_PACKAGES, QUOTA_PACKAGES, generateReference, type BoostPackageKey, type QuotaPackageKey } from "@/lib/payment-packages";

type PackageKey = BoostPackageKey | QuotaPackageKey;

function getOrderType(packageKey: PackageKey): "boost_premium" | "boost_facebook" | "quota" {
  if (packageKey.startsWith("premium_")) return "boost_premium";
  if (packageKey.startsWith("facebook_")) return "boost_facebook";
  return "quota";
}

function getAmountBaht(packageKey: PackageKey): number | null {
  if (packageKey in BOOST_PACKAGES) return BOOST_PACKAGES[packageKey as BoostPackageKey].baht;
  if (packageKey in QUOTA_PACKAGES) return QUOTA_PACKAGES[packageKey as QuotaPackageKey].baht;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { packageKey, listingId } = await req.json() as {
      packageKey: PackageKey;
      listingId?: string;
    };

    if (!packageKey) return NextResponse.json({ error: "packageKey required" }, { status: 400 });

    const amount_baht = getAmountBaht(packageKey);
    if (amount_baht === null) return NextResponse.json({ error: "Invalid package" }, { status: 400 });

    const order_type = getOrderType(packageKey);

    // For boost orders, verify listing belongs to user
    if (order_type !== "quota") {
      if (!listingId) return NextResponse.json({ error: "listingId required for boost orders" }, { status: 400 });
      const { data: listing } = await supabase
        .from("listings").select("id").eq("id", listingId).eq("user_id", user.id).single();
      if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const admin = createAdminClient();
    const reference = generateReference();

    const { data: order, error } = await admin.from("payment_orders").insert({
      reference,
      user_id: user.id,
      listing_id: listingId ?? null,
      order_type,
      package_key: packageKey,
      amount_baht,
    }).select("reference, amount_baht").single();

    if (error) {
      console.error("[orders/create] insert error:", error);
      return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
    }

    return NextResponse.json({ reference: order.reference, amount_baht: order.amount_baht });
  } catch (err) {
    console.error("[orders/create] error:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
