"use client";

import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, SlidersHorizontal, X } from "lucide-react";
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

  function clearAll() {
    setTypeFilter("");
    setCatFilter("");
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="shrink-0 bg-white border-b shadow-sm z-10">
        <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto no-scrollbar">
          {/* Back */}
          <Link
            href="/listings"
            className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 shrink-0 mr-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="h-5 w-px bg-neutral-200 shrink-0" />

          {/* Type pills */}
          <div className="flex items-center gap-1.5 shrink-0">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTypeFilter(opt.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                  typeFilter === opt.value
                    ? "bg-orange-500 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-neutral-200 shrink-0" />

          {/* Category select */}
          <div className="flex items-center gap-1 shrink-0">
            <SlidersHorizontal className="h-3.5 w-3.5 text-neutral-400" />
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="h-8 rounded-lg border border-neutral-200 bg-white pl-2 pr-6 text-xs text-neutral-700 focus:outline-none focus:border-orange-400"
            >
              <option value="">ทุกประเภทร้าน</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.name_th}</option>
              ))}
            </select>
          </div>

          {hasFilter && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-xs text-orange-600 hover:underline shrink-0 ml-1"
            >
              <X className="h-3 w-3" />
              ล้าง
            </button>
          )}

          {/* Count badge */}
          <span className="ml-auto shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600 font-medium whitespace-nowrap">
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
