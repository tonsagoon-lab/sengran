import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req) => {
  // Called by Supabase Database Webhook when a row is inserted into `notifications`
  const payload = await req.json();
  const record = payload.record; // new notification row

  if (!record?.user_id || !record?.listing_id) {
    return new Response("missing fields", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get push token for user
  const { data: profile } = await supabase
    .from("profiles")
    .select("push_token")
    .eq("id", record.user_id)
    .single();

  if (!profile?.push_token) {
    return new Response("no push token", { status: 200 });
  }

  // Get listing details for notification body
  const { data: listing } = await supabase
    .from("listings")
    .select("title, listing_type, sale_price, rent_price, provinces(name_th)")
    .eq("id", record.listing_id)
    .single();

  if (!listing) {
    return new Response("listing not found", { status: 200 });
  }

  const typeLabel = listing.listing_type === "sale" ? "เซ้ง" : listing.listing_type === "rent" ? "ให้เช่า" : "เซ้ง+เช่า";
  const price = listing.listing_type === "rent" ? listing.rent_price : listing.sale_price;
  const priceText = price ? `฿${Number(price).toLocaleString("th-TH")}` : "";
  const province = (listing.provinces as { name_th: string } | null)?.name_th ?? "";

  const body = [typeLabel, priceText, province].filter(Boolean).join(" • ");

  const pushRes = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: profile.push_token,
      title: `🏪 ${listing.title}`,
      body,
      data: { listing_id: record.listing_id },
      sound: "default",
      badge: 1,
    }),
  });

  const result = await pushRes.json();
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});
