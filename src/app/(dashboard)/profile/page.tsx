import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AuthForm } from "@/components/shared/auth-form";
import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { updateProfileAction } from "@/lib/actions/auth";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "โปรไฟล์ — เซ้งร้าน.com" , robots: { index: false, follow: false } };

interface Props {
  searchParams: Promise<{ reason?: string }>;
}

export default async function ProfilePage({ searchParams }: Props) {
  const { reason } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, mobile, line_id, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">โปรไฟล์ของฉัน</h1>

      {reason === "missing_contact" && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          กรุณากรอกชื่อและเบอร์โทรในโปรไฟล์ก่อนลงประกาศ
        </div>
      )}

      {/* Avatar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">รูปโปรไฟล์</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-4">
          <AvatarUploader
            currentUrl={profile?.avatar_url ?? null}
            displayName={profile?.display_name ?? null}
          />
        </CardContent>
      </Card>

      {/* Account info (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ข้อมูลบัญชี</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-neutral-500 text-xs">อีเมล</Label>
            <p className="text-sm font-medium">{user.email}</p>
          </div>
          <Separator />
          <div className="space-y-1">
            <Label className="text-neutral-500 text-xs">สมาชิกตั้งแต่</Label>
            <p className="text-sm font-medium">
              {new Date(user.created_at).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Editable profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">แก้ไขข้อมูลส่วนตัว</CardTitle>
          <CardDescription>ข้อมูลนี้จะแสดงในประกาศของคุณ</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm action={updateProfileAction} submitLabel="บันทึกการเปลี่ยนแปลง">
            <div className="space-y-2">
              <Label htmlFor="display_name">ชื่อที่แสดง</Label>
              <Input id="display_name" name="display_name" type="text" defaultValue={profile?.display_name ?? ""} placeholder="ชื่อ-นามสกุล หรือชื่อร้าน" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">เบอร์โทรศัพท์</Label>
              <Input id="mobile" name="mobile" type="tel" defaultValue={profile?.mobile ?? ""} placeholder="0812345678" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="line_id">LINE ID (ไม่บังคับ)</Label>
              <Input id="line_id" name="line_id" type="text" defaultValue={profile?.line_id ?? ""} placeholder="@yourlineid" />
            </div>
          </AuthForm>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">เปลี่ยนรหัสผ่าน</CardTitle>
          <CardDescription>ทิ้งว่างไว้หากไม่ต้องการเปลี่ยน</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </main>
  );
}
