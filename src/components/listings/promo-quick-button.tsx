"use client";

import { useState, useTransition } from "react";
import { Sparkles, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { togglePromoAction } from "@/lib/actions/listings";

interface Props {
  listingId: string;
  salePrice: number | null;
  currentPromoType: "percent" | "amount" | null;
  currentPromoValue: number | null;
}

export function PromoQuickButton({
  listingId,
  salePrice,
  currentPromoType,
  currentPromoValue,
}: Props) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(!!currentPromoType);
  const [promoType, setPromoType] = useState<"percent" | "amount">(
    currentPromoType ?? "percent"
  );
  const [promoValue, setPromoValue] = useState<string>(
    currentPromoValue != null ? String(currentPromoValue) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const numericValue = Number(promoValue.replace(/,/g, ""));
  const previewSale = salePrice ?? 0;
  const validPreview =
    enabled &&
    numericValue > 0 &&
    (promoType === "percent" ? numericValue < 100 : previewSale > 0 && numericValue < previewSale);
  const newPrice = !validPreview
    ? null
    : promoType === "percent"
      ? Math.max(0, Math.round(previewSale - (previewSale * numericValue) / 100))
      : Math.max(0, previewSale - numericValue);

  function handleSave() {
    setError(null);
    if (enabled) {
      if (!numericValue || numericValue <= 0) {
        setError("กรุณากรอกส่วนลดที่มากกว่า 0");
        return;
      }
      if (promoType === "percent" && numericValue >= 100) {
        setError("เปอร์เซ็นต์ต้องน้อยกว่า 100");
        return;
      }
      if (promoType === "amount" && salePrice && numericValue >= salePrice) {
        setError("ส่วนลดต้องน้อยกว่าราคาเซ้ง");
        return;
      }
    }

    startTransition(async () => {
      const result = await togglePromoAction(
        listingId,
        enabled ? { type: promoType, value: numericValue } : null
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  const hasPromo = !!currentPromoType;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className={`h-8 px-2 ${
            hasPromo ? "text-orange-600 border-orange-300 bg-orange-50" : "text-orange-500"
          }`}
          title="ลดราคา"
        >
          <Tag className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange-500" />
            โปรโมชั่นลดราคา
          </DialogTitle>
          <DialogDescription>
            เมื่อเปิดใช้งาน ประกาศจะแสดงในหมวด &ldquo;โปรโมชั่นล่าสุด&rdquo; หน้าแรก
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-neutral-300 accent-orange-500"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <div>
              <div className="text-sm font-medium">เปิดใช้งานโปรโมชั่น</div>
              <p className="text-xs text-neutral-500 mt-0.5">คุณต้องมาปิดเอง</p>
            </div>
          </label>

          {enabled && (
            <div className="space-y-3 pl-7">
              <div className="space-y-1.5">
                <Label className="text-xs">รูปแบบส่วนลด</Label>
                <div className="flex gap-2">
                  <Select
                    value={promoType}
                    onValueChange={(v: "percent" | "amount") => setPromoType(v)}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">ส่วนลด %</SelectItem>
                      <SelectItem value="amount">ลดเป็นบาท</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative flex-1">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={promoValue}
                      onChange={(e) => setPromoValue(e.target.value)}
                      placeholder={promoType === "percent" ? "เช่น 10" : "เช่น 5,000"}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">
                      {promoType === "percent" ? "%" : "฿"}
                    </span>
                  </div>
                </div>
              </div>

              {newPrice != null && (
                <p className="text-sm">
                  ราคาหลังหักส่วนลด:{" "}
                  <span className="line-through text-neutral-400">
                    ฿{previewSale.toLocaleString("th-TH")}
                  </span>{" "}
                  <span className="font-semibold text-orange-600">
                    ฿{newPrice.toLocaleString("th-TH")}
                  </span>
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            ยกเลิก
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isPending ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
