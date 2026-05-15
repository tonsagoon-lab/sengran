import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const OMISE_SECRET_KEY = process.env.OMISE_SECRET_KEY!;
const OMISE_BASE = "https://api.omise.co";

function omiseFetch(path: string) {
  const auth = Buffer.from(`${OMISE_SECRET_KEY}:`).toString("base64");
  return fetch(`${OMISE_BASE}${path}`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chargeId: string }> }
) {
  const { chargeId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch charge from Omise
  const omiseRes = await omiseFetch(`/charges/${chargeId}`);
  const charge = await omiseRes.json();

  if (!omiseRes.ok) {
    return NextResponse.json({ error: charge.message ?? "Omise error" }, { status: 502 });
  }

  const admin = createAdminClient();

  // Find the transaction
  const { data: transaction } = await admin
    .from("wallet_transactions")
    .select("id, user_id, amount, status")
    .eq("omise_charge_id", chargeId)
    .eq("user_id", user.id)
    .single();

  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const qrImageUrl: string | null = charge.source?.scannable_code?.image?.download_uri ?? null;

  // If successful and still pending, update
  if (charge.status === "successful" && transaction.status === "pending") {
    await admin
      .from("wallet_transactions")
      .update({ status: "success" })
      .eq("id", transaction.id);

    await admin.rpc("increment_wallet_balance", {
      p_user_id: transaction.user_id,
      p_amount: transaction.amount,
    });

    return NextResponse.json({
      status: "successful",
      coins: transaction.amount,
      qrImageUrl,
    });
  }

  if (charge.status === "failed" && transaction.status === "pending") {
    await admin
      .from("wallet_transactions")
      .update({ status: "failed" })
      .eq("id", transaction.id);
  }

  return NextResponse.json({
    status: charge.status,
    coins: transaction.amount,
    qrImageUrl,
  });
}
