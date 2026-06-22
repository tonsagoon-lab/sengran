import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as { phone?: string; code?: string };
    const phone = normalizePhone(body.phone ?? "");
    const code = (body.code ?? "").trim();

    if (!phone || !code) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const now = new Date().toISOString();

    // Find the latest valid OTP for this phone
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: attempt } = await (adminClient as any)
      .from("otp_attempts")
      .select("id, code, verified")
      .eq("phone", phone)
      .eq("user_id", user.id)
      .eq("verified", false)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!attempt) {
      return NextResponse.json(
        { error: "รหัส OTP หมดอายุหรือไม่ถูกต้อง กรุณาขอรหัสใหม่" },
        { status: 400 }
      );
    }

    if (attempt.code !== code) {
      return NextResponse.json({ error: "รหัส OTP ไม่ถูกต้อง" }, { status: 400 });
    }

    // Mark as verified
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from("otp_attempts")
      .update({ verified: true })
      .eq("id", attempt.id);

    // Update profile phone_verified
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({ phone_number: phone, phone_verified: true })
      .eq("id", user.id);

    if (profileError) {
      return NextResponse.json({ error: "เกิดข้อผิดพลาดระบบ" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[OTP verify error]", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
