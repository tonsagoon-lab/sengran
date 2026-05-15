import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const payload = await req.json();

  // Only handle charge.complete events
  if (payload.key !== "charge.complete") {
    return NextResponse.json({ ok: true });
  }

  const charge = payload.data;
  if (!charge?.id) return NextResponse.json({ ok: true });

  if (charge.status !== "successful") {
    // Update transaction to failed if applicable
    if (charge.status === "failed") {
      const admin = createAdminClient();
      await admin
        .from("wallet_transactions")
        .update({ status: "failed" })
        .eq("omise_charge_id", charge.id)
        .eq("status", "pending");
    }
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();

  // Find the pending transaction
  const { data: transaction } = await admin
    .from("wallet_transactions")
    .select("id, user_id, amount, status")
    .eq("omise_charge_id", charge.id)
    .single();

  if (!transaction || transaction.status === "success") {
    // Already processed or not found
    return NextResponse.json({ ok: true });
  }

  // Update transaction status
  await admin
    .from("wallet_transactions")
    .update({ status: "success" })
    .eq("id", transaction.id);

  // Add coins to wallet balance
  await admin.rpc("increment_wallet_balance", {
    p_user_id: transaction.user_id,
    p_amount: transaction.amount,
  });

  return NextResponse.json({ ok: true });
}
