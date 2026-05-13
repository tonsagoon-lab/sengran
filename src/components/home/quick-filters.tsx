"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface QuickFiltersProps {
  categories: { id: number; name_th: string; slug: string }[];
  provinces: { id: number; name_th: string; slug: string }[];
}

const PRICE_RANGES = [
  { label: "ไม่เกิน 50,000", value: "0-50000" },
  { label: "50,000–200,000", value: "50000-200000" },
  { label: "200,000–500,000", value: "200000-500000" },
  { label: "500,000 ขึ้นไป", value: "500000-" },
];

const TYPES = [
  { label: "เซ้ง", value: "sale" },
  { label: "ให้เช่า", value: "rent" },
  { label: "เซ้ง+เช่า", value: "both" },
];

export function QuickFilters({ categories, provinces }: QuickFiltersProps) {
  const router = useRouter();
  const [type, setType] = useState("");
  const [cat, setCat] = useState("");
  const [province, setProvince] = useState("");
  const [price, setPrice] = useState("");

  function handleSearch() {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (cat) params.set("cat", cat);
    if (province) params.set("province", province);
    if (price) {
      const [min, max] = price.split("-");
      if (min) params.set("min_price", min);
      if (max) params.set("max_price", max);
    }
    router.push(`/listings?${params.toString()}`);
  }

  const selectCls = "rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700 focus:outline-none focus:border-orange-400 cursor-pointer";

  return (
    <div className="flex flex-wrap justify-center gap-2 pt-2">
      {/* ประเภท */}
      <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
        <option value="">ประเภท</option>
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {/* หมวดหมู่ */}
      <select value={cat} onChange={(e) => setCat(e.target.value)} className={selectCls}>
        <option value="">หมวดหมู่</option>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>{c.name_th}</option>
        ))}
      </select>

      {/* จังหวัด */}
      <select value={province} onChange={(e) => setProvince(e.target.value)} className={selectCls}>
        <option value="">จังหวัด</option>
        {provinces.map((p) => (
          <option key={p.slug} value={p.slug}>{p.name_th}</option>
        ))}
      </select>

      {/* ช่วงราคา */}
      <select value={price} onChange={(e) => setPrice(e.target.value)} className={selectCls}>
        <option value="">ช่วงราคา</option>
        {PRICE_RANGES.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>

      {/* ปุ่มค้นหา */}
      <button
        onClick={handleSearch}
        className="rounded-full bg-orange-500 hover:bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors"
      >
        ค้นหา
      </button>
    </div>
  );
}
