"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RichTextDisplay } from "@/components/rich-text-display";
import { generateListingDescriptionAction } from "@/lib/actions/ai-description";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  categoryName: string;
  listingType: "sale" | "rent" | "both";
  salePrice?: string;
  rentPrice?: string;
  onAccept: (html: string) => void;
}

export function AIDescriptionHelper({
  open,
  onOpenChange,
  title,
  categoryName,
  listingType,
  salePrice,
  rentPrice,
  onAccept,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [area, setArea] = useState("");
  const [features, setFeatures] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = title.trim().length >= 3 && categoryName.trim().length > 0;

  function generate() {
    setError(null);
    startTransition(async () => {
      const res = await generateListingDescriptionAction({
        title,
        category_name: categoryName,
        listing_type: listingType,
        sale_price: salePrice,
        rent_price: rentPrice,
        area_sqm: area.trim() || undefined,
        key_features: features.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      if (res.ok && res.html) {
        setResult(res.html);
      } else {
        setError(res.error ?? "เกิดข้อผิดพลาด");
      }
    });
  }

  function accept() {
    if (!result) return;
    onAccept(result);
    reset();
    onOpenChange(false);
  }

  function reset() {
    setResult(null);
    setError(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            AI ช่วยเขียนคำอธิบาย
          </DialogTitle>
          <DialogDescription>
            บอกข้อมูลสั้นๆ 2-3 บรรทัด แล้ว AI จะเขียนคำอธิบายให้ (แก้ได้ทีหลัง)
          </DialogDescription>
        </DialogHeader>

        {!canGenerate && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            กรุณากรอก <strong>ชื่อประกาศ</strong> และเลือก <strong>หมวดหมู่</strong> ก่อนใช้ AI
          </div>
        )}

        {canGenerate && !result && (
          <div className="space-y-4">
            <div className="rounded-lg bg-neutral-50 p-3 text-xs space-y-1">
              <p className="text-neutral-500">AI จะใช้ข้อมูลนี้:</p>
              <p><strong>ชื่อ:</strong> {title}</p>
              <p><strong>หมวดหมู่:</strong> {categoryName}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-area" className="text-sm">
                ขนาดพื้นที่ (ตร.ม.) <span className="text-neutral-400">— ไม่บังคับ</span>
              </Label>
              <Input
                id="ai-area"
                inputMode="decimal"
                value={area}
                onChange={(e) => setArea(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="เช่น 25"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-features" className="text-sm">
                จุดเด่น <span className="text-neutral-400">— ไม่บังคับ แต่ยิ่งใส่ AI ยิ่งเขียนดี</span>
              </Label>
              <Textarea
                id="ai-features"
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                placeholder="เช่น ทำเลติดถนนใหญ่, ลูกค้าประจำแน่น, มีอุปกรณ์ครบพร้อมเปิดต่อได้เลย, ใกล้ BTS อโศก 300 ม."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-neutral-400 text-right">{features.length}/500</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-notes" className="text-sm">
                หมายเหตุเพิ่มเติม <span className="text-neutral-400">— ไม่บังคับ</span>
              </Label>
              <Textarea
                id="ai-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="เช่น เซ้งเพราะย้ายไปทำงานต่างประเทศ, สัญญาเช่าเหลือ 2 ปี, ค่าเช่ารายเดือน 15,000"
                rows={2}
                maxLength={300}
              />
              <p className="text-xs text-neutral-400 text-right">{notes.length}/300</p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              onClick={generate}
              disabled={pending}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังเขียน...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  ให้ AI เขียนให้
                </>
              )}
            </Button>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="rounded-lg border border-neutral-200 bg-white p-4 max-h-[45vh] overflow-y-auto">
              <RichTextDisplay html={result} />
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
              💡 ตรวจดูก่อนใช้ — AI อาจมีข้อมูลผิดพลาด แก้ไขได้หลังจากคลิก &ldquo;ใช้ข้อความนี้&rdquo;
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => { setResult(null); }}
                disabled={pending}
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                เขียนใหม่
              </Button>
              <Button
                onClick={accept}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                <Check className="mr-2 h-4 w-4" />
                ใช้ข้อความนี้
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
