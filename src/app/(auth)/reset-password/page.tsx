import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthForm } from "@/components/shared/auth-form";
import { resetPasswordAction } from "@/lib/actions/auth";

export const metadata = { title: "ตั้งรหัสผ่านใหม่ — เซ้งร้าน.com" };

export default function ResetPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center min-h-screen bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold text-neutral-900">
            เซ้งร้าน.com
          </Link>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">ตั้งรหัสผ่านใหม่</CardTitle>
            <CardDescription>กรอกรหัสผ่านใหม่ของคุณ</CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm action={resetPasswordAction} submitLabel="บันทึกรหัสผ่านใหม่">
              <div className="space-y-2">
                <Label htmlFor="password">รหัสผ่านใหม่</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">ยืนยันรหัสผ่านใหม่</Label>
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>
            </AuthForm>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
