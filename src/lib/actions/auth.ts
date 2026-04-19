"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string; success?: string } | undefined;

// ── Error message mapping ─────────────────────────────────────
function toThaiError(message: string): string {
  if (message.includes("Invalid login credentials"))
    return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  if (message.includes("Email not confirmed"))
    return "กรุณายืนยันอีเมลของคุณก่อนเข้าสู่ระบบ";
  if (message.includes("User already registered"))
    return "อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น";
  if (message.includes("Password should be at least"))
    return "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
  if (message.includes("rate limit"))
    return "ลองใหม่อีกครั้งในภายหลัง (ทำรายการบ่อยเกินไป)";
  if (message.includes("invalid email"))
    return "รูปแบบอีเมลไม่ถูกต้อง";
  return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
}

// ── Login ─────────────────────────────────────────────────────
export async function loginAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "กรุณากรอกอีเมลและรหัสผ่าน" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: toThaiError(error.message) };

  redirect("/");
}

// ── Register ──────────────────────────────────────────────────
export async function registerAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const display_name = formData.get("display_name") as string;
  const mobile = formData.get("mobile") as string;

  if (!email || !password || !display_name || !mobile) {
    return { error: "กรุณากรอกข้อมูลให้ครบทุกช่อง" };
  }

  if (password.length < 6) {
    return { error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name, mobile },
    },
  });

  if (error) return { error: toThaiError(error.message) };

  return { success: "สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยัน" };
}

// ── Forgot Password ───────────────────────────────────────────
export async function forgotPasswordAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const email = formData.get("email") as string;

  if (!email) return { error: "กรุณากรอกอีเมล" };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=/reset-password`,
  });

  if (error) return { error: toThaiError(error.message) };

  return { success: "ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว" };
}

// ── Reset Password ────────────────────────────────────────────
export async function resetPasswordAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm_password") as string;

  if (!password || !confirm) return { error: "กรุณากรอกรหัสผ่านให้ครบ" };
  if (password !== confirm) return { error: "รหัสผ่านไม่ตรงกัน" };
  if (password.length < 6) return { error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: toThaiError(error.message) };

  redirect("/login?reset=success");
}

// ── Logout ────────────────────────────────────────────────────
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// ── Update Profile ────────────────────────────────────────────
export async function updateProfileAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const display_name = formData.get("display_name") as string;
  const mobile = formData.get("mobile") as string;
  const line_id = formData.get("line_id") as string;

  if (!display_name || !mobile) {
    return { error: "กรุณากรอกชื่อและเบอร์โทรศัพท์" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "กรุณาเข้าสู่ระบบก่อน" };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name, mobile, line_id: line_id || null })
    .eq("id", user.id);

  if (error) return { error: "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };

  return { success: "บันทึกข้อมูลสำเร็จ" };
}
