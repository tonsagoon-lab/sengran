import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BOOST_PACKAGES, QUOTA_PACKAGES, type BoostPackageKey, type QuotaPackageKey } from "@/lib/payment-packages";
import { sendTelegramNotification } from "@/lib/telegram";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";
const STAFF_EMAILS = (process.env.STAFF_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || (user.email !== ADMIN_EMAIL && !STAFF_EMAILS.includes(user.email ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ref } = await params;
  const { action, note } = await req.json() as { action: "approve" | "reject"; note?: string };
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order } = await (admin as any)
    .from("payment_orders")
    .select("id, reference, approve_token, user_id, listing_id, order_type, package_key, amount_baht, status")
    .eq("reference", ref)
    .single();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status === "approved") return NextResponse.json({ error: "Already approved" }, { status: 400 });

  const now = new Date();

  if (action === "reject") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("payment_orders").update({
      status: "rejected",
      notes: note ?? null,
      processed_at: now.toISOString(),
    }).eq("id", order.id);
    await sendTelegramNotification(`❌ Rejected ${order.reference}${note ? ` — ${note}` : ""}`);
    return NextResponse.json({ success: true });
  }

  // approve
  if (order.order_type === "boost_premium" && order.listing_id) {
    const pkg = BOOST_PACKAGES[order.package_key as BoostPackageKey];
    const days = pkg?.days ?? 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: lst } = await (admin as any).from("listings").select("featured_until").eq("id", order.listing_id).single();
    const currentUntil = lst?.featured_until ? new Date(lst.featured_until) : now;
    const base = currentUntil > now ? currentUntil : now;
    const newUntil = new Date(base.getTime() + days * 86400000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("listings").update({ is_featured: true, featured_until: newUntil.toISOString() }).eq("id", order.listing_id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("listing_boosts").insert({
      listing_id: order.listing_id, user_id: order.user_id, type: "premium",
      package_key: order.package_key, coins_spent: order.amount_baht,
      duration_days: days, expires_at: newUntil.toISOString(), status: "active",
    });
  } else if (order.order_type === "boost_facebook" && order.listing_id) {
    const pkg = BOOST_PACKAGES[order.package_key as BoostPackageKey];
    const days = pkg?.days ?? 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("listing_boosts").insert({
      listing_id: order.listing_id, user_id: order.user_id, type: "facebook",
      package_key: order.package_key, coins_spent: order.amount_baht,
      duration_days: days, expires_at: new Date(now.getTime() + days * 86400000).toISOString(), status: "pending",
    });
  } else if (order.order_type === "quota") {
    const pkg = QUOTA_PACKAGES[order.package_key as QuotaPackageKey];
    const listingsToAdd = pkg?.listings ?? 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (admin as any).from("profiles").select("listing_quota").eq("id", order.user_id).single();
    const currentQuota = Number(profile?.listing_quota ?? 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("profiles").update({ listing_quota: currentQuota + listingsToAdd }).eq("id", order.user_id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from("payment_orders").update({
    status: "approved",
    notes: note ?? null,
    processed_at: now.toISOString(),
  }).eq("id", order.id);

  await sendTelegramNotification(`✅ Approved ${order.reference}${note ? ` — ${note}` : ""}`);
  return NextResponse.json({ success: true });
}
