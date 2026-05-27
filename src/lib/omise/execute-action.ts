import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramNotification } from "@/lib/telegram";

const OMISE_SECRET_KEY = process.env.OMISE_SECRET_KEY!;

export function omiseFetch(path: string, options?: RequestInit) {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeChargeAction(charge: any): Promise<boolean> {
  const admin = createAdminClient();
  const metadata = charge.metadata ?? {};
  const chargeId: string = charge.id;
  const amountBaht: number = Math.floor(charge.amount / 100);

  // Idempotency: check if already processed
  const { data: existing } = await admin
    .from("wallet_transactions")
    .select("id, status")
    .eq("omise_charge_id", chargeId)
    .maybeSingle();

  if (existing?.status === "success") return true; // already done

  if (metadata.action === "boost") {
    const { listing_id, package_key, user_id, contact_info, label } = metadata;
    if (!listing_id || !package_key || !user_id) return false;

    // Fetch listing
    const { data: listing } = await admin
      .from("listings")
      .select("id, boost_rank, is_featured, featured_until")
      .eq("id", listing_id)
      .single();
    if (!listing) return false;

    const days = Number(metadata.days ?? 0);
    const pkgType: string = metadata.pkg_type ?? "premium";
    const now = new Date();

    if (pkgType === "premium") {
      const currentUntil = listing.featured_until ? new Date(listing.featured_until) : now;
      const base = currentUntil > now ? currentUntil : now;
      const newUntil = new Date(base.getTime() + days * 86400000);
      await admin.from("listings").update({ is_featured: true, featured_until: newUntil.toISOString() }).eq("id", listing_id);
    }

    await admin.from("listing_boosts").insert({
      listing_id,
      user_id,
      type: pkgType,
      package_key,
      coins_spent: amountBaht,
      duration_days: days,
      expires_at: new Date(now.getTime() + days * 86400000).toISOString(),
      status: pkgType === "facebook" ? "pending" : "active",
      contact_info: contact_info || null,
    });

    if (existing) {
      await admin.from("wallet_transactions").update({ status: "success" }).eq("id", existing.id);
    } else {
      await admin.from("wallet_transactions").insert({
        user_id,
        amount: amountBaht,
        type: "spend",
        description: label ?? package_key,
        omise_charge_id: chargeId,
        status: "success",
      });
    }

    const { data: lst } = await admin.from("listings").select("title, slug").eq("id", listing_id).single();
    const typeLabel = pkgType === "facebook" ? "📣 ยิงโฆษณา Facebook" : "⭐ Premium หน้าแรก";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.xn--72ch7bybxexd0cc.com";
    const listingUrl = lst?.slug ? `${siteUrl}/property/${lst.slug}` : null;
    await sendTelegramNotification(
      `💰 <b>คำสั่งซื้อใหม่</b>\n` +
      `${typeLabel}\n` +
      `📋 ประกาศ: ${lst?.title ?? listing_id}\n` +
      (listingUrl ? `🔗 <a href="${listingUrl}">${listingUrl}</a>\n` : "") +
      `⏱ ระยะเวลา: ${metadata.days} วัน\n` +
      `💵 ยอด: ${amountBaht.toLocaleString("th-TH")} บาท\n` +
      `🔖 Charge: ${chargeId}`
    );

    return true;
  }

  if (metadata.action === "quota_upgrade") {
    const { user_id, listings_to_add, label } = metadata;
    if (!user_id || !listings_to_add) return false;

    const { data: profile } = await admin.from("profiles").select("listing_quota").eq("id", user_id).single();
    const currentQuota = Number(profile?.listing_quota ?? 0);
    await admin.from("profiles").update({ listing_quota: currentQuota + Number(listings_to_add) }).eq("id", user_id);

    if (existing) {
      await admin.from("wallet_transactions").update({ status: "success" }).eq("id", existing.id);
    } else {
      await admin.from("wallet_transactions").insert({
        user_id,
        amount: amountBaht,
        type: "spend",
        description: label ?? "เพิ่มจำนวนประกาศ",
        omise_charge_id: chargeId,
        status: "success",
      });
    }

    await sendTelegramNotification(
      `💰 <b>คำสั่งซื้อใหม่</b>\n` +
      `📦 เพิ่มโควต้าประกาศ\n` +
      `➕ จำนวน: ${listings_to_add} ประกาศ\n` +
      `💵 ยอด: ${amountBaht.toLocaleString("th-TH")} บาท\n` +
      `🔖 Charge: ${chargeId}`
    );

    return true;
  }

  return false;
}
