"use client";

import { useState, useTransition } from "react";
import { createAlertAction, updateAlertAction } from "@/lib/actions/alerts";
import type { AlertPreference } from "@/lib/db/alerts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  provinces: { id: number; name_th: string }[];
  categories: { id: number; name_th: string }[];
  editing?: AlertPreference;
  onDone?: () => void;
  trigger?: React.ReactNode;
}

const TYPE_OPTIONS = [
  { value: "", label: "ทุกประเภท" },
  { value: "sale", label: "เซ้ง" },
  { value: "rent", label: "ให้เช่า" },
  { value: "both", label: "เซ้งและให้เช่า" },
];

export function AlertForm({ provinces, categories, editing, onDone, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedProvinces, setSelectedProvinces] = useState<number[]>(editing?.province_ids ?? []);
  const [provinceSearch, setProvinceSearch] = useState("");

  function toggleProvince(id: number) {
    setSelectedProvinces((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  const filtered = provinces.filter((p) =>
    p.name_th.includes(provinceSearch)
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    selectedProvinces.forEach((id) => fd.append("province_ids", String(id)));

    startTransition(async () => {
      const result = editing
        ? await updateAlertAction(editing.id, fd)
        : await createAlertAction(fd);

      if (result?.error) { setError(result.error); return; }
      setOpen(false);
      onDone?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="bg-orange-500 hover:bg-orange-600 gap-2">
            <Plus className="h-4 w-4" /> เพิ่มเงื่อนไข
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "แก้ไขเงื่อนไข" : "เพิ่มแจ้งเตือนร้านเซ้ง"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Province multiselect */}
          <div className="space-y-2">
            <Label>จังหวัด <span className="text-neutral-400 font-normal">(ไม่เลือก = ทุกจังหวัด)</span></Label>
            <Input
              placeholder="ค้นหาจังหวัด..."
              value={provinceSearch}
              onChange={(e) => setProvinceSearch(e.target.value)}
              className="text-sm"
            />
            <div className="max-h-40 overflow-y-auto rounded-lg border p-2 space-y-0.5">
              {filtered.map((p) => (
                <label key={p.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-neutral-50 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={selectedProvinces.includes(p.id)}
                    onChange={() => toggleProvince(p.id)}
                    className="accent-orange-500"
                  />
                  {p.name_th}
                </label>
              ))}
            </div>
            {selectedProvinces.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedProvinces.map((id) => {
                  const p = provinces.find((x) => x.id === id);
                  return p ? (
                    <span key={id} className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-xs text-orange-700">
                      {p.name_th}
                      <button type="button" onClick={() => toggleProvince(id)} className="hover:text-orange-900">×</button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>หมวดหมู่ร้าน <span className="text-neutral-400 font-normal">(ไม่เลือก = ทุกหมวด)</span></Label>
            <select
              name="category_id"
              defaultValue={editing?.category_id ?? ""}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
            >
              <option value="">ทุกหมวดหมู่</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name_th}</option>
              ))}
            </select>
          </div>

          {/* Listing type */}
          <div className="space-y-1.5">
            <Label>ประเภทประกาศ</Label>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((t) => (
                <label key={t.value} className="cursor-pointer">
                  <input type="radio" name="listing_type" value={t.value}
                    defaultChecked={(editing?.listing_type ?? "") === t.value}
                    className="sr-only peer" />
                  <span className={cn(
                    "inline-block rounded-full border px-3 py-1 text-sm transition-colors",
                    "peer-checked:bg-orange-500 peer-checked:text-white peer-checked:border-orange-500",
                    "hover:border-orange-300"
                  )}>
                    {t.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div className="space-y-1.5">
            <Label>ช่วงราคา <span className="text-neutral-400 font-normal">(ไม่กรอก = ไม่จำกัด)</span></Label>
            <div className="flex items-center gap-2">
              <Input name="min_price" type="number" placeholder="ราคาต่ำสุด" min={0}
                defaultValue={editing?.min_price ?? ""} className="text-sm" />
              <span className="text-neutral-400 shrink-0">–</span>
              <Input name="max_price" type="number" placeholder="ราคาสูงสุด" min={0}
                defaultValue={editing?.max_price ?? ""} className="text-sm" />
              <span className="text-neutral-400 shrink-0 text-sm">บาท</span>
            </div>
          </div>

          <Button type="submit" disabled={pending} className="w-full bg-orange-500 hover:bg-orange-600">
            {pending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {editing ? "บันทึก" : "เพิ่มเงื่อนไข"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
