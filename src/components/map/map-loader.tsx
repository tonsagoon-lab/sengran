"use client";

import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, X } from "lucide-react";
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

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (typeFilter && l.listing_type !== typeFilter) return false;
      if (catFilter && l.categories?.slug !== catFilter) return false;
      return true;
    });
  }, [listings, typeFilter, catFilter]);

  const hasFilter = typeFilter || catFilter;

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="shrink-0 bg-white border-b z-10" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.10)" }}>
        <div className="flex items-center gap-3 px-4 py-3 overflow-x-auto no-scrollbar">

          {/* Back */}
          <Link
            href="/listings"
            className="flex items-center justify-center h-9 w-9 rounded-full border border-neutral-200 text-neutral-500 hover:border-orange-400 hover:text-orange-500 transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          {/* Type pills */}
          <div className="flex items-center gap-2 shrink-0">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTypeFilter(opt.value)}
                className={`h-9 rounded-full px-4 text-sm font-semibold whitespace-nowrap border transition-all ${
                  typeFilter === opt.value
                    ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                    : "bg-white text-neutral-600 border-neutral-300 hover:border-orange-400 hover:text-orange-500"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-neutral-200 shrink-0" />

          {/* Category select */}
          <div className="relative shrink-0">
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className={`h-9 appearance-none rounded-full border pl-4 pr-8 text-sm font-medium focus:outline-none transition-colors cursor-pointer ${
                catFilter
                  ? "border-orange-500 bg-orange-50 text-orange-700"
                  : "border-neutral-300 bg-white text-neutral-600 hover:border-orange-400"
              }`}
            >
              <option value="">ประเภทร้าน</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.name_th}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          </div>

          {/* Clear */}
          {hasFilter && (
            <button
              onClick={() => { setTypeFilter(""); setCatFilter(""); }}
              className="flex items-center gap-1.5 h-9 rounded-full border border-neutral-300 px-3 text-sm text-neutral-500 hover:border-red-300 hover:text-red-500 transition-colors shrink-0"
            >
              <X className="h-3.5 w-3.5" />
              ล้าง
            </button>
          )}

          {/* Count */}
          <span className="ml-auto shrink-0 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-600 whitespace-nowrap border border-neutral-200">
            {filtered.length} ประกาศ
          </span>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 min-h-0">
        <MapView listings={filtered} />
      </div>
    </div>
  );
}
