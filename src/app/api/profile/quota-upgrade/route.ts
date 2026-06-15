import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { QUOTA_PACKAGES, generateReference, type QuotaPackageKey } from "@/lib/payment-packages";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { packageKey } = await req.json() as { packageKey: QuotaPackageKey };

    const pkg = QUOTA_PACKAGES[packageKey];
    if (!pkg) return NextResponse.json({ error: "Invalid package" }, { status: 400 });

    const reference = generateReference();
    const admin = createAdminClient();

    const { data: order, error } = await admin.from("payment_orders").insert({
      reference,
      user_id: user.id,
      listing_id: null,
      order_type: "quota",
      package_key: packageKey,
      amount_baht: pkg.baht,
    }).select("reference, amount_baht").single();

    if (error) {
      console.error("[quota-upgrade] insert error:", error);
      return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
    }

    return NextResponse.json({ reference: order.reference, amount_baht: order.amount_baht });
  } catch (err) {
    console.error("[quota-upgrade] error:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
