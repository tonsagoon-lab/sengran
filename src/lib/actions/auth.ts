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
  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name, mobile } },
  });

  if (signUpError) return { error: toThaiError(signUpError.message) };

  // Auto-login immediately after register
  const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  if (loginError) return { success: "สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ" };

  redirect("/");
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

// ── Change Password ────────────────────────────────────────────
export async function changePasswordAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const newPassword = formData.get("new_password") as string;
  const confirm = formData.get("confirm_password") as string;

  if (!newPassword || newPassword.length < 6)
    return { error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" };
  if (newPassword !== confirm)
    return { error: "รหัสผ่านไม่ตรงกัน" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: toThaiError(error.message) };
  return { success: "เปลี่ยนรหัสผ่านสำเร็จ" };
}

// ── Upload Avatar ──────────────────────────────────────────────
export async function updateAvatarAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" };

  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) return { error: "กรุณาเลือกรูปภาพ" };
  if (file.size > 2 * 1024 * 1024) return { error: "ขนาดรูปต้องไม่เกิน 2MB" };
  if (!file.type.startsWith("image/")) return { error: "รองรับเฉพาะไฟล์รูปภาพ" };

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { error: "อัปโหลดรูปไม่สำเร็จ" };

  const { data: { publicUrl } } = supabase.storage
    .from("avatars")
    .getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (updateError) return { error: "บันทึกรูปโปรไฟล์ไม่สำเร็จ" };
  return { success: "อัปเดตรูปโปรไฟล์สำเร็จ" };
}
