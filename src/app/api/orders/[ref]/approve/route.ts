import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BOOST_PACKAGES, QUOTA_PACKAGES, type BoostPackageKey, type QuotaPackageKey } from "@/lib/payment-packages";
import { sendTelegramNotification } from "@/lib/telegram";

function getPackageLabel(packageKey: string): string {
  if (packageKey in BOOST_PACKAGES) return BOOST_PACKAGES[packageKey as BoostPackageKey].label;
  if (packageKey in QUOTA_PACKAGES) return QUOTA_PACKAGES[packageKey as QuotaPackageKey].label;
  return packageKey;
}

function htmlPage(title: string, body: string): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><title>${title}</title>` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5;}` +
    `.card{background:white;border-radius:16px;padding:40px;text-align:center;max-width:400px;box-shadow:0 4px 24px rgba(0,0,0,.08);}` +
    `h1{font-size:48px;margin:0 0 12px;}p{color:#555;line-height:1.6;}</style></head>` +
    `<body><div class="card">${body}</div></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  try {
    const { ref } = await params;
    const token = req.nextUrl.searchParams.get("token");
    if (!token) return htmlPage("Error", "<h1>❌</h1><p>Token missing</p>");

    const admin = createAdminClient();
    const { data: order } = await admin
      .from("payment_orders")
      .select("id, reference, approve_token, user_id, listing_id, order_type, package_key, amount_baht, status")
      .eq("reference", ref)
      .single();

    if (!order) return htmlPage("Error", "<h1>❌</h1><p>Order not found</p>");
    if (order.approve_token !== token) return htmlPage("Error", "<h1>❌</h1><p>Invalid token</p>");

    if (order.status === "approved") {
      return htmlPage("Already Approved", `<h1>✅</h1><p>Order <b>${order.reference}</b> ได้รับการอนุมัติแล้ว</p>`);
    }

    const pkgLabel = getPackageLabel(order.package_key);
    const now = new Date();

    if (order.order_type === "boost_premium" && order.listing_id) {
      const pkg = BOOST_PACKAGES[order.package_key as BoostPackageKey];
      const days = pkg?.days ?? 0;

      const { data: lst } = await admin
        .from("listings")
        .select("is_featured, featured_until")
        .eq("id", order.listing_id)
        .single();

      const currentUntil = lst?.featured_until ? new Date(lst.featured_until) : now;
      const base = currentUntil > now ? currentUntil : now;
      const newUntil = new Date(base.getTime() + days * 86400000);

      await admin.from("listings").update({
        is_featured: true,
        featured_until: newUntil.toISOString(),
      }).eq("id", order.listing_id);

      await admin.from("listing_boosts").insert({
        listing_id: order.listing_id,
        user_id: order.user_id,
        type: "premium",
        package_key: order.package_key,
        coins_spent: order.amount_baht,
        duration_days: days,
        expires_at: newUntil.toISOString(),
        status: "active",
      });
    } else if (order.order_type === "boost_facebook" && order.listing_id) {
      const pkg = BOOST_PACKAGES[order.package_key as BoostPackageKey];
      const days = pkg?.days ?? 0;

      await admin.from("listing_boosts").insert({
        listing_id: order.listing_id,
        user_id: order.user_id,
        type: "facebook",
        package_key: order.package_key,
        coins_spent: order.amount_baht,
        duration_days: days,
        expires_at: new Date(now.getTime() + days * 86400000).toISOString(),
        status: "pending",
      });
    } else if (order.order_type === "quota") {
      const pkg = QUOTA_PACKAGES[order.package_key as QuotaPackageKey];
      const listingsToAdd = pkg?.listings ?? 0;

      const { data: profile } = await admin
        .from("profiles")
        .select("listing_quota")
        .eq("id", order.user_id)
        .single();

      const currentQuota = Number(profile?.listing_quota ?? 0);
      await admin.from("profiles").update({
        listing_quota: currentQuota + listingsToAdd,
      }).eq("id", order.user_id);
    }

    // Mark approved
    await admin.from("payment_orders").update({
      status: "approved",
      processed_at: now.toISOString(),
    }).eq("id", order.id);

    // Notify admin on Telegram
    await sendTelegramNotification(`✅ Approved ${order.reference} - ${pkgLabel}`);

    return htmlPage(
      "Approved",
      `<h1>✅</h1><p>Approved! <b>${order.reference}</b> สำเร็จ</p><p style="font-size:14px;color:#888;">${pkgLabel}</p>`
    );
  } catch (err) {
    console.error("[approve] error:", err);
    return htmlPage("Error", "<h1>❌</h1><p>เกิดข้อผิดพลาด</p>");
  }
}
