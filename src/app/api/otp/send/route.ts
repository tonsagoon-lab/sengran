import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_PER_HOUR = 5;

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as { phone?: string };
    const phone = normalizePhone(body.phone ?? "");

    if (!phone.match(/^0[0-9]{8,9}$/)) {
      return NextResponse.json({ error: "เบอร์โทรศัพท์ไม่ถูกต้อง" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Rate limit: max 5 OTPs per phone per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (adminClient as any)
      .from("otp_attempts")
      .select("id", { count: "exact", head: true })
      .eq("phone", phone)
      .gte("created_at", oneHourAgo);

    if ((count ?? 0) >= MAX_OTP_PER_HOUR) {
      return NextResponse.json(
        { error: "ส่ง OTP บ่อยเกินไป กรุณารอสักครู่" },
        { status: 429 }
      );
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    // Store OTP attempt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: dbError } = await (adminClient as any)
      .from("otp_attempts")
      .insert({ phone, code, user_id: user.id, expires_at: expiresAt });

    if (dbError) {
      return NextResponse.json({ error: "เกิดข้อผิดพลาดระบบ" }, { status: 500 });
    }

    // Send SMS via Thaibulksms
    const apiKey = process.env.THAIBULKSMS_API_KEY;
    if (apiKey) {
      const message = `รหัส OTP ของคุณคือ ${code} หมดอายุใน ${OTP_EXPIRY_MINUTES} นาที`;
      const smsRes = await fetch("https://www.thaibulksms.com/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: apiKey, msisdn: phone, message }),
      });
      if (!smsRes.ok) {
        return NextResponse.json({ error: "ส่ง SMS ไม่สำเร็จ กรุณาลองใหม่" }, { status: 502 });
      }
    } else {
      // Dev mode: log OTP to console (never in production)
      if (process.env.NODE_ENV !== "production") {
        console.log(`[DEV] OTP for ${phone}: ${code}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[OTP send error]", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
