"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface QuickFiltersProps {
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

export function QuickFilters({ categories, provinces }: QuickFiltersProps) {
  const router = useRouter();
  const [type, setType] = useState("");
  const [cat, setCat] = useState("");
  const [province, setProvince] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  function handleSearch() {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (cat) params.set("cat", cat);
    if (province) params.set("province", province);
    if (minPrice) params.set("min_price", minPrice);
    if (maxPrice) params.set("max_price", maxPrice);
    router.push(`/listings?${params.toString()}`);
  }

  const selectCls = "rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700 focus:outline-none focus:border-orange-400 cursor-pointer";
  const inputCls = "rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700 focus:outline-none focus:border-orange-400 w-28 text-center";

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

      {/* ช่วงราคา — dropdown */}
      <div className="flex items-center gap-1">
        <select value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className={selectCls}>
          {PRICE_OPTIONS.map((o) => (
            <option key={o.label} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="text-xs text-neutral-400">–</span>
        <select value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className={selectCls}>
          {PRICE_MAX_OPTIONS.map((o) => (
            <option key={o.label} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

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
