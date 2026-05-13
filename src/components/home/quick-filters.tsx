"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface QuickFiltersProps {
  categories: { id: number; name_th: string; slug: string }[];
  provinces: { id: number; name_th: string; slug: string }[];
}

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

      {/* ช่วงราคา — min/max */}
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          placeholder="ราคาต่ำสุด"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          className={inputCls}
        />
        <span className="text-xs text-neutral-400">–</span>
        <input
          type="number"
          min={0}
          placeholder="ราคาสูงสุด"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className={inputCls}
        />
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
