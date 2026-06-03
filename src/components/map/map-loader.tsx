"use client";

import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import type { MapListing } from "@/lib/db/listings";

const MapView = dynamic(
  () => import("./map-view").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-neutral-400 text-sm">
        กำลังโหลดแผนที่…
      </div>
    ),
  }
);

const TYPE_OPTIONS = [
  { value: "", label: "ทั้งหมด" },
  { value: "sale", label: "เซ้ง" },
  { value: "rent", label: "ให้เช่า" },
  { value: "both", label: "เซ้ง+เช่า" },
];

interface Category { id: number; name_th: string; slug: string }

interface MapLoaderProps {
  listings: MapListing[];
  categories: Category[];
}

export function MapLoader({ listings, categories }: MapLoaderProps) {
  const [typeFilter, setTypeFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (typeFilter && l.listing_type !== typeFilter) return false;
      if (catFilter && l.categories?.slug !== catFilter) return false;
      return true;
    });
  }, [listings, typeFilter, catFilter]);

  const activeCount = [typeFilter, catFilter].filter(Boolean).length;

  function clearAll() {
    setTypeFilter("");
    setCatFilter("");
  }

  return (
    <div className="relative flex-1 h-full">
      {/* Map — full screen */}
      <MapView listings={filtered} />

      {/* Top-left: Back + count */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2">
        <Link
          href="/listings"
          className="flex items-center gap-1.5 h-9 rounded-full bg-white px-3 text-sm font-medium text-neutral-700 shadow-md hover:bg-neutral-50 transition-colors border border-neutral-200"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับ
        </Link>
        <div className="h-9 flex items-center rounded-full bg-white px-3 text-xs font-semibold text-neutral-600 shadow-md border border-neutral-200">
          {filtered.length} ประกาศ
        </div>
      </div>

      {/* Top-right: Filter button */}
      <div className="absolute top-3 right-3 z-[1000]">
        <button
          onClick={() => setPanelOpen((v) => !v)}
          className={`flex items-center gap-2 h-9 rounded-full px-4 text-sm font-semibold shadow-md border transition-all ${
            activeCount > 0 || panelOpen
              ? "bg-orange-500 text-white border-orange-500"
              : "bg-white text-neutral-700 border-neutral-200 hover:border-orange-400"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          กรอง{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>

        {/* Filter panel popup */}
        {panelOpen && (
          <div className="absolute top-11 right-0 w-64 rounded-2xl bg-white shadow-xl border border-neutral-200 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-neutral-800">กรองประกาศ</p>
              <button onClick={() => setPanelOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-neutral-500">ประเภท</p>
              <div className="grid grid-cols-2 gap-1.5">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTypeFilter(opt.value)}
                    className={`rounded-lg py-2 text-sm font-medium transition-all border ${
                      typeFilter === opt.value
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:border-orange-400"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-neutral-500">ประเภทร้าน</p>
              <div className="relative">
                <select
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-3 pr-8 text-sm text-neutral-700 focus:outline-none focus:border-orange-400"
                >
                  <option value="">ทุกประเภท</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>{c.name_th}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              </div>
            </div>

            {/* Clear */}
            {activeCount > 0 && (
              <button
                onClick={clearAll}
                className="w-full rounded-lg border border-neutral-200 py-2 text-sm text-neutral-500 hover:text-red-500 hover:border-red-300 transition-colors"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
