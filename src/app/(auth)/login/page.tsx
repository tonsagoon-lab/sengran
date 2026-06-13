import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthForm } from "@/components/shared/auth-form";
import { GoogleLoginButton } from "@/components/shared/google-login-button";
import { LineLoginButton } from "@/components/shared/line-login-button";
import { loginAction } from "@/lib/actions/auth";

export const metadata = { title: "เข้าสู่ระบบ — เซ้งร้าน.com", robots: { index: false, follow: false } };

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; error?: string }>;
}) {
  // searchParams is async in Next.js 15+; we pass it through but don't await here
  // (we use URL params only for info banners — not critical path)
  void searchParams;

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
            <CardTitle className="text-xl">เข้าสู่ระบบ</CardTitle>
            <CardDescription>กรอกอีเมลและรหัสผ่านของคุณ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GoogleLoginButton />
            <LineLoginButton />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-neutral-400">หรือ</span>
              </div>
            </div>
            <AuthForm action={loginAction} submitLabel="เข้าสู่ระบบ">
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">รหัสผ่าน</Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-neutral-500 hover:text-neutral-900"
                  >
                    ลืมรหัสผ่าน?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </AuthForm>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-neutral-500">
              ยังไม่มีบัญชี?{" "}
              <Link href="/register" className="font-medium text-neutral-900 hover:underline">
                สมัครสมาชิกฟรี
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
