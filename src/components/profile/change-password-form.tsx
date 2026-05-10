"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new_password">รหัสผ่านใหม่</Label>
        <Input id="new_password" name="new_password" type="password" placeholder="อย่างน้อย 6 ตัวอักษร" minLength={6} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm_password">ยืนยันรหัสผ่านใหม่</Label>
        <Input id="confirm_password" name="confirm_password" type="password" placeholder="พิมพ์รหัสผ่านอีกครั้ง" minLength={6} required />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}
      <Button type="submit" disabled={pending} className="bg-orange-500 hover:bg-orange-600">
        {pending ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
      </Button>
    </form>
  );
}
