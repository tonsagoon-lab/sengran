import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { omiseFetch, executeChargeAction } from "@/lib/omise/execute-action";

const OMISE_WEBHOOK_SECRET = process.env.OMISE_WEBHOOK_SECRET ?? "";

export async function POST(req: NextRequest) {
  const body = await req.text();

  // Verify Omise webhook signature (HMAC-SHA1)
  if (OMISE_WEBHOOK_SECRET) {
    const sig = req.headers.get("x-omise-signature") ?? "";
    const expected = crypto.createHmac("sha1", OMISE_WEBHOOK_SECRET).update(body).digest("hex");
    if (sig !== expected) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const event = JSON.parse(body);

  // Only handle charge.complete events
  if (event.key !== "charge.complete") return NextResponse.json({ ok: true });

  const charge = event.data;
  if (charge.status !== "successful") return NextResponse.json({ ok: true });

  // Re-fetch from Omise to confirm (avoid spoofed webhooks)
  const verifyRes = await omiseFetch(`/charges/${charge.id}`);
  const verified = await verifyRes.json();
  if (!verifyRes.ok || verified.status !== "successful") return NextResponse.json({ ok: true });

  await executeChargeAction(verified);

  return NextResponse.json({ ok: true });
}
