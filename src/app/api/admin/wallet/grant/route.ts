import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function isPrivileged(email: string | undefined): boolean {
  if (!email) return false;
  const admin = process.env.ADMIN_EMAIL ?? "";
  const staff = (process.env.STAFF_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  return email === admin || staff.includes(email);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isPrivileged(user.email ?? undefined)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, amount, description } = await req.json() as {
    userId: string;
    amount: number;
    description?: string;
  };

  if (!userId || !amount || amount <= 0) {
    return NextResponse.json({ error: "userId and positive amount required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error: insertError } = await admin.from("wallet_transactions").insert({
    user_id: userId,
    amount,
    type: "admin_grant",
    description: description ?? `เพิ่ม coin โดย admin (${amount} coins)`,
    status: "success",
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { error: rpcError } = await admin.rpc("increment_wallet_balance", {
    p_user_id: userId,
    p_amount: amount,
  });

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
