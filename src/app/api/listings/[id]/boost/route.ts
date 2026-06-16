import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateReference } from "@/lib/payment-packages";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { packageId } = await req.json() as { packageId: number };
    if (!packageId) return NextResponse.json({ error: "Invalid package" }, { status: 400 });

    const admin = createAdminClient();

    // Look up package from DB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pkg } = await (admin as any)
      .from("boost_packages")
      .select("id, name_th, price_thb, duration_days, package_type, is_active")
      .eq("id", packageId)
      .single();

    if (!pkg || !pkg.is_active) return NextResponse.json({ error: "Invalid package" }, { status: 400 });

    const { data: listing } = await supabase
      .from("listings").select("id").eq("id", listingId).eq("user_id", user.id).single();
    if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

    const order_type = pkg.package_type === "premium" ? "boost_premium" : "boost_facebook";
    const reference = generateReference();

    const { data: order, error } = await admin.from("payment_orders").insert({
      reference,
      user_id: user.id,
      listing_id: listingId,
      order_type,
      package_key: String(packageId),
      amount_baht: pkg.price_thb,
    }).select("reference, amount_baht").single();

    if (error) {
      console.error("[boost] insert error:", error);
      return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
    }

    return NextResponse.json({ reference: order.reference, amount_baht: order.amount_baht });
  } catch (err) {
    console.error("[boost] error:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
