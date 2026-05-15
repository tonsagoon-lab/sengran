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
  try {
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

    if (!OMISE_SECRET_KEY) {
      return NextResponse.json({ error: "ระบบ payment ยังไม่พร้อม กรุณาติดต่อ admin" }, { status: 500 });
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
      return NextResponse.json(
        { error: charge.message ?? `Omise error: ${omiseRes.status}` },
        { status: 502 }
      );
    }

    const admin = createAdminClient();
    const qrImageUrl =
      paymentMethod === "promptpay"
        ? charge.source?.scannable_code?.image?.download_uri ?? null
        : null;

    // For card: charge is already settled — update wallet immediately
    if (paymentMethod === "card" && charge.status === "successful") {
      // Increment balance first (most important)
      const { error: rpcError } = await admin.rpc("increment_wallet_balance", {
        p_user_id: user.id,
        p_amount: coins,
      });
      if (rpcError) {
        console.error("[wallet/charge] increment_wallet_balance error:", rpcError);
        // Still return success to client — charge happened, coins will be reconciled via webhook
      }

      // Record transaction (best-effort)
      const { error: insertError } = await admin.from("wallet_transactions").insert({
        user_id: user.id,
        amount: coins,
        type: "topup",
        description: `เติม coin ${coins} coins (${baht} บาท)`,
        omise_charge_id: charge.id,
        status: "success",
      });
      if (insertError) {
        console.error("[wallet/charge] insert transaction error:", insertError);
      }
    } else if (paymentMethod === "promptpay") {
      // PromptPay: record as pending, webhook/poll will update later
      const { error: insertError } = await admin.from("wallet_transactions").insert({
        user_id: user.id,
        amount: coins,
        type: "topup",
        description: `เติม coin ${coins} coins (${baht} บาท)`,
        omise_charge_id: charge.id,
        status: "pending",
      });
      if (insertError) {
        console.error("[wallet/charge] insert promptpay transaction error:", insertError);
      }
    }

    return NextResponse.json({
      chargeId: charge.id,
      qrImageUrl,
      status: charge.status,
      coins,
    });
  } catch (err) {
    console.error("[wallet/charge] unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
