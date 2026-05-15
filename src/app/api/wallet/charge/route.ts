import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const OMISE_SECRET_KEY = process.env.OMISE_SECRET_KEY!;
const OMISE_BASE = "https://api.omise.co";

const PACKAGES = [
  { baht: 500, coins: 550 },
  { baht: 1000, coins: 1100 },
  { baht: 1500, coins: 1650 },
  { baht: 2000, coins: 2200 },
  { baht: 5000, coins: 5500 },
  { baht: 10000, coins: 11000 },
];

function omiseFetch(path: string, options?: RequestInit) {
  const auth = Buffer.from(`${OMISE_SECRET_KEY}:`).toString("base64");
  return fetch(`${OMISE_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(options?.headers ?? {}),
    },
  });
}

function calculateCoins(baht: number): number {
  const pkg = PACKAGES.find((p) => p.baht === baht);
  return pkg ? pkg.coins : baht; // no bonus for custom amount
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { paymentMethod, baht, tokenId } = body as {
    paymentMethod: "promptpay" | "card";
    baht: number;
    tokenId?: string;
  };

  if (!baht || baht < 100) {
    return NextResponse.json({ error: "จำนวนขั้นต่ำ 100 บาท" }, { status: 400 });
  }

  if (paymentMethod === "card" && !tokenId) {
    return NextResponse.json({ error: "tokenId required for card payment" }, { status: 400 });
  }

  const coins = calculateCoins(baht);
  const satang = baht * 100;

  // Build form body for Omise
  let formBody: string;
  if (paymentMethod === "promptpay") {
    formBody = new URLSearchParams({
      amount: String(satang),
      currency: "thb",
      "source[type]": "promptpay",
    }).toString();
  } else {
    formBody = new URLSearchParams({
      amount: String(satang),
      currency: "thb",
      card: tokenId!,
    }).toString();
  }

  const omiseRes = await omiseFetch("/charges", {
    method: "POST",
    body: formBody,
  });

  const charge = await omiseRes.json();

  if (!omiseRes.ok) {
    return NextResponse.json({ error: charge.message ?? "Omise error" }, { status: 502 });
  }

  // Insert pending transaction
  const admin = createAdminClient();
  const { error: insertError } = await admin.from("wallet_transactions").insert({
    user_id: user.id,
    amount: coins,
    type: "topup",
    description: `เติม coin ${coins} coins (${baht} บาท)`,
    omise_charge_id: charge.id,
    status: "pending",
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const qrImageUrl =
    paymentMethod === "promptpay"
      ? charge.source?.scannable_code?.image?.download_uri ?? null
      : null;

  // If card payment is already successful, update immediately
  if (paymentMethod === "card" && charge.status === "successful") {
    await admin
      .from("wallet_transactions")
      .update({ status: "success" })
      .eq("omise_charge_id", charge.id);

    await admin.rpc("increment_wallet_balance", {
      p_user_id: user.id,
      p_amount: coins,
    });
  }

  return NextResponse.json({
    chargeId: charge.id,
    qrImageUrl,
    status: charge.status,
    coins,
  });
}
