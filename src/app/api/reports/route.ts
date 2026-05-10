import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  // 5 reports per hour per user
  const { allowed } = await rateLimit(`report:${user.id}`, 5, 3600);
  if (!allowed) return NextResponse.json({ error: "ส่งรายงานบ่อยเกินไป" }, { status: 429 });

  const { listingId, reason, detail } = await req.json();
  if (!listingId || !reason) return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("reports").insert({
    listing_id: listingId,
    reporter_id: user.id,
    reason,
    detail: detail || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
