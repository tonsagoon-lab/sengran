"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateProfileAction } from "@/lib/actions/auth";

interface ContactInfoDialogProps {
  defaultName?: string;
  defaultMobile?: string;
  defaultLineId?: string;
}

export function ContactInfoDialog({ defaultName, defaultMobile, defaultLineId }: ContactInfoDialogProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateProfileAction, undefined);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state?.success, router]);

  return (
    <Dialog open>
      <DialogContent
        className="sm:max-w-md max-h-[85vh] overflow-y-auto top-[8%] translate-y-0 sm:top-[50%] sm:-translate-y-1/2"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>ข้อมูลติดต่อ</DialogTitle>
          <DialogDescription>
            กรอกชื่อและเบอร์โทรก่อนลงประกาศ
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="ci_name">ชื่อที่แสดง <span className="text-red-500">*</span></Label>
            <Input
              id="ci_name"
              name="display_name"
              type="text"
              defaultValue={defaultName ?? ""}
              placeholder="ชื่อ-นามสกุล หรือชื่อร้าน"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ci_mobile">เบอร์โทรศัพท์ <span className="text-red-500">*</span></Label>
            <Input
              id="ci_mobile"
              name="mobile"
              type="tel"
              defaultValue={defaultMobile ?? ""}
              placeholder="0812345678"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ci_line">LINE ID <span className="text-neutral-400 font-normal text-xs">(ไม่บังคับ)</span></Label>
            <Input
              id="ci_line"
              name="line_id"
              type="text"
              defaultValue={defaultLineId ?? ""}
              placeholder="@yourlineid"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "กำลังบันทึก…" : "บันทึกและดำเนินการต่อ"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
