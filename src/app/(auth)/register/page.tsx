import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthForm } from "@/components/shared/auth-form";
import { GoogleLoginButton } from "@/components/shared/google-login-button";
import { registerAction } from "@/lib/actions/auth";

export const metadata = { title: "สมัครสมาชิก — เซ้งร้าน.com" };

export default function RegisterPage() {
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
            <CardTitle className="text-xl">สมัครสมาชิก</CardTitle>
            <CardDescription>สร้างบัญชีเพื่อลงประกาศฟรี</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GoogleLoginButton />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-neutral-400">หรือสมัครด้วยอีเมล</span>
              </div>
            </div>
            <AuthForm action={registerAction} submitLabel="สมัครสมาชิก">
              <div className="space-y-2">
                <Label htmlFor="display_name">ชื่อที่แสดง</Label>
                <Input
                  id="display_name"
                  name="display_name"
                  type="text"
                  placeholder="ชื่อ-นามสกุล หรือชื่อร้าน"
                  autoComplete="name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">เบอร์โทรศัพท์</Label>
                <Input
                  id="mobile"
                  name="mobile"
                  type="tel"
                  placeholder="0812345678"
                  autoComplete="tel"
                  required
                />
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="password">รหัสผ่าน</Label>
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
            </AuthForm>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-neutral-500">
              มีบัญชีอยู่แล้ว?{" "}
              <Link href="/login" className="font-medium text-neutral-900 hover:underline">
                เข้าสู่ระบบ
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
