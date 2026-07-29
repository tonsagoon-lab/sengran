"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface FilterSheetProps {
  categories: { id: number; name_th: string; slug: string }[];
  provinces: { id: number; name_th: string; slug: string }[];
}

const PRICE_OPTIONS = [
  { label: "ราคาต่ำสุด", value: "" },
  { label: "0", value: "0" },
  { label: "100,000", value: "100000" },
  { label: "200,000", value: "200000" },
  { label: "300,000", value: "300000" },
  { label: "500,000", value: "500000" },
  { label: "700,000", value: "700000" },
  { label: "1,000,000", value: "1000000" },
  { label: "2,000,000", value: "2000000" },
  { label: "5,000,000", value: "5000000" },
];

const PRICE_MAX_OPTIONS = [
  { label: "ราคาสูงสุด", value: "" },
  { label: "100,000", value: "100000" },
  { label: "200,000", value: "200000" },
  { label: "300,000", value: "300000" },
  { label: "500,000", value: "500000" },
  { label: "700,000", value: "700000" },
  { label: "1,000,000", value: "1000000" },
  { label: "2,000,000", value: "2000000" },
  { label: "5,000,000", value: "5000000" },
  { label: "ไม่จำกัด", value: "" },
];

const TYPES = [
  { label: "เซ้ง", value: "sale" },
  { label: "ให้เช่า", value: "rent" },
  { label: "เซ้ง+เช่า", value: "both" },
];

export function FilterSheet({ categories, provinces }: FilterSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("");
  const [cat, setCat] = useState("");
  const [province, setProvince] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const activeCount = [type, cat, province, minPrice, maxPrice].filter(Boolean).length;

  function handleSearch() {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (cat) params.set("cat", cat);
    if (province) params.set("province", province);
    if (minPrice) params.set("min_price", minPrice);
    if (maxPrice) params.set("max_price", maxPrice);
    setOpen(false);
    router.push(`/listings?${params.toString()}`);
  }

  function handleClear() {
    setType("");
    setCat("");
    setProvince("");
    setMinPrice("");
    setMaxPrice("");
  }

  const fieldLabel = "text-xs font-medium text-neutral-600";
  const selectCls =
    "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-800 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="relative flex shrink-0 items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3 py-3 text-sm text-neutral-700 shadow-sm hover:border-orange-400 hover:text-orange-600"
          aria-label="ตัวกรอง"
        >
          <SlidersHorizontal className="h-5 w-5" />
          <span className="hidden sm:inline">ตัวกรอง</span>
          {activeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto rounded-t-2xl sm:max-w-md sm:mx-auto"
      >
        <SheetHeader>
          <SheetTitle>ตัวกรอง</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-6">
          <div className="space-y-1.5">
            <label className={fieldLabel}>ประเภท</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
              <option value="">ทุกประเภท</option>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={fieldLabel}>หมวดหมู่</label>
            <select value={cat} onChange={(e) => setCat(e.target.value)} className={selectCls}>
              <option value="">ทุกหมวดหมู่</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name_th}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={fieldLabel}>จังหวัด</label>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className={selectCls}
            >
              <option value="">ทุกจังหวัด</option>
              {provinces.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name_th}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={fieldLabel}>ช่วงราคา</label>
            <div className="flex items-center gap-2">
              <select
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className={selectCls}
              >
                {PRICE_OPTIONS.map((o) => (
                  <option key={o.label} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span className="text-xs text-neutral-400">–</span>
              <select
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className={selectCls}
              >
                {PRICE_MAX_OPTIONS.map((o) => (
                  <option key={o.label} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 rounded-lg border border-neutral-300 bg-white py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              ล้าง
            </button>
            <button
              type="button"
              onClick={handleSearch}
              className="flex-[2] rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600"
            >
              ค้นหา
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
