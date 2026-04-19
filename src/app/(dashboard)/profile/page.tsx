import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AuthForm } from "@/components/shared/auth-form";
import { updateProfileAction } from "@/lib/actions/auth";

export const metadata = { title: "โปรไฟล์ — เซ้งร้าน.com" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, mobile, line_id")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">โปรไฟล์ของฉัน</h1>

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
              {new Date(user.created_at).toLocaleDateString("th-TH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Editable profile form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">แก้ไขข้อมูลส่วนตัว</CardTitle>
          <CardDescription>ข้อมูลนี้จะแสดงในประกาศของคุณ</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm action={updateProfileAction} submitLabel="บันทึกการเปลี่ยนแปลง">
            <div className="space-y-2">
              <Label htmlFor="display_name">ชื่อที่แสดง</Label>
              <Input
                id="display_name"
                name="display_name"
                type="text"
                defaultValue={profile?.display_name ?? ""}
                placeholder="ชื่อ-นามสกุล หรือชื่อร้าน"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">เบอร์โทรศัพท์</Label>
              <Input
                id="mobile"
                name="mobile"
                type="tel"
                defaultValue={profile?.mobile ?? ""}
                placeholder="0812345678"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="line_id">LINE ID (ไม่บังคับ)</Label>
              <Input
                id="line_id"
                name="line_id"
                type="text"
                defaultValue={profile?.line_id ?? ""}
                placeholder="@yourlineid"
              />
            </div>
          </AuthForm>
        </CardContent>
      </Card>
    </main>
  );
}
