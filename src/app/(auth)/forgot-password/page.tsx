import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthForm } from "@/components/shared/auth-form";
import { forgotPasswordAction } from "@/lib/actions/auth";

export const metadata = { title: "ลืมรหัสผ่าน — เซ้งร้าน.com", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
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
            <CardTitle className="text-xl">ลืมรหัสผ่าน</CardTitle>
            <CardDescription>
              กรอกอีเมลของคุณ เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm action={forgotPasswordAction} submitLabel="ส่งลิงก์รีเซ็ต">
              <div className="space-y-2">
                <Label htmlFor="email">อีเมล</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="example@email.com"
                  autoComplete="email"
                  required
                />
              </div>
            </AuthForm>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href="/login" className="text-sm text-neutral-500 hover:text-neutral-900">
              ← กลับไปหน้าเข้าสู่ระบบ
            </Link>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
