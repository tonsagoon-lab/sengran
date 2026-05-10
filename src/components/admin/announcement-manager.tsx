"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check } from "lucide-react";

interface Announcement {
  message: string;
  is_active: boolean;
  bg_color: string;
}

const COLOR_OPTIONS = [
  { value: "orange", label: "ส้ม", className: "bg-orange-500" },
  { value: "blue", label: "น้ำเงิน", className: "bg-blue-500" },
  { value: "green", label: "เขียว", className: "bg-green-600" },
  { value: "red", label: "แดง", className: "bg-red-500" },
  { value: "neutral", label: "เทา", className: "bg-neutral-700" },
];

export function AnnouncementManager() {
  const [data, setData] = useState<Announcement>({ message: "", is_active: false, bg_color: "orange" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/announcement")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch("/api/admin/announcement", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const selectedColor = COLOR_OPTIONS.find((c) => c.value === data.bg_color) ?? COLOR_OPTIONS[0];

  if (loading) return <p className="text-sm text-neutral-400">กำลังโหลด...</p>;

  return (
    <div className="space-y-4 max-w-lg">
      {/* Preview */}
      {data.message && (
        <div className={`rounded-lg px-4 py-3 text-white text-sm font-medium ${selectedColor.className}`}>
          {data.message}
        </div>
      )}

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">ข้อความประกาศ</Label>
          <Textarea
            value={data.message}
            onChange={(e) => setData({ ...data, message: e.target.value })}
            placeholder="เช่น ระบบปิดปรุงชั่วคราว วันอาทิตย์ 23:00–02:00 น."
            rows={3}
            className="text-sm resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">สีพื้นหลัง</Label>
          <div className="flex gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.value}
                onClick={() => setData({ ...data, bg_color: c.value })}
                title={c.label}
                className={`h-7 w-7 rounded-full ${c.className} ring-offset-2 transition-all ${data.bg_color === c.value ? "ring-2 ring-neutral-800" : ""}`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.is_active}
              onChange={(e) => setData({ ...data, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-neutral-300 accent-orange-500"
            />
            <span className="text-sm text-neutral-700">เปิดแสดงบนเว็บ</span>
          </label>
        </div>

        <Button onClick={save} disabled={saving} className="bg-orange-500 hover:bg-orange-600 gap-1.5">
          {saved ? <><Check className="h-4 w-4" /> บันทึกแล้ว</> : "บันทึก"}
        </Button>
      </div>
    </div>
  );
}
