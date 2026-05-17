import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { omiseFetch, executeChargeAction } from "@/lib/omise/execute-action";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chargeId: string }> }
) {
  const { chargeId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const omiseRes = await omiseFetch(`/charges/${chargeId}`);
  const charge = await omiseRes.json();
  if (!omiseRes.ok) return NextResponse.json({ error: "Charge not found" }, { status: 502 });

  const qrImageUrl: string | null = charge.source?.scannable_code?.image?.download_uri ?? null;

  if (charge.status === "successful") {
    await executeChargeAction(charge);
    return NextResponse.json({ status: "successful", qrImageUrl });
  }

  if (charge.status === "failed" || charge.status === "expired") {
    return NextResponse.json({ status: "failed", qrImageUrl });
  }

  return NextResponse.json({ status: "pending", qrImageUrl });
}
