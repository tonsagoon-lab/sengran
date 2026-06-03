"use client";

import dynamic from "next/dynamic";
import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, SlidersHorizontal, X, ChevronDown, MapPin, Navigation } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils/image-url";
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

const fmt = new Intl.NumberFormat("th-TH");

function priceText(l: MapListing) {
  if (l.listing_type === "rent" && l.rent_price) return `฿${fmt.format(l.rent_price)}/ด.`;
  if (l.sale_price) return `฿${fmt.format(l.sale_price)}`;
  return "ติดต่อ";
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} ม.` : `${km.toFixed(1)} กม.`;
}

const TYPE_OPTIONS = [
  { value: "", label: "ทั้งหมด" },
  { value: "sale", label: "เซ้ง" },
  { value: "rent", label: "ให้เช่า" },
  { value: "both", label: "เซ้ง+เช่า" },
];

const TYPE_COLOR: Record<string, string> = {
  sale: "bg-blue-100 text-blue-700",
  rent: "bg-green-100 text-green-700",
  both: "bg-purple-100 text-purple-700",
};

interface Category { id: number; name_th: string; slug: string }

interface MapLoaderProps {
  listings: MapListing[];
  categories: Category[];
}

export function MapLoader({ listings, categories }: MapLoaderProps) {
  const [typeFilter, setTypeFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  const onUserLocation = useCallback((lat: number, lng: number) => {
    setUserLoc({ lat, lng });
  }, []);

  // Unique provinces from listings
  const provinces = useMemo(() => {
    const map = new Map<string, string>();
    listings.forEach((l) => {
      if (l.provinces?.name_th) map.set(l.provinces.name_th, l.provinces.name_th);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "th"));
  }, [listings]);

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (typeFilter && l.listing_type !== typeFilter) return false;
      if (catFilter && l.categories?.slug !== catFilter) return false;
      if (provinceFilter && l.provinces?.name_th !== provinceFilter) return false;
      const price = l.listing_type === "rent" ? l.rent_price : l.sale_price;
      if (minPrice && (price ?? 0) < Number(minPrice)) return false;
      if (maxPrice && (price ?? 0) > Number(maxPrice)) return false;
      return true;
    });
  }, [listings, typeFilter, catFilter, provinceFilter, minPrice, maxPrice]);

  const sorted = useMemo(() => {
    if (!userLoc) return filtered;
    return [...filtered].sort((a, b) =>
      distanceKm(userLoc.lat, userLoc.lng, a.latitude, a.longitude) -
      distanceKm(userLoc.lat, userLoc.lng, b.latitude, b.longitude)
    );
  }, [filtered, userLoc]);

  const activeCount = [typeFilter, catFilter, provinceFilter, minPrice, maxPrice].filter(Boolean).length;

  function clearAll() {
    setTypeFilter(""); setCatFilter(""); setProvinceFilter("");
    setMinPrice(""); setMaxPrice("");
  }

  return (
    <div className="flex h-full">
      {/* ── Left: Map ── */}
      <div className="relative flex-1 min-w-0">
        <MapView listings={filtered} onUserLocation={onUserLocation} />

        {/* Floating: Back + count */}
        <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 pointer-events-none">
          <Link
            href="/listings"
            className="pointer-events-auto flex items-center gap-1.5 h-9 rounded-full bg-white px-3 text-sm font-medium text-neutral-700 shadow-lg hover:bg-neutral-50 transition-colors border border-neutral-200"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับ
          </Link>
        </div>

        {/* Floating: Filter button */}
        <div className="absolute top-3 right-3 z-[1000]">
          <button
            onClick={() => setPanelOpen((v) => !v)}
            className={`flex items-center gap-2 h-10 rounded-full px-4 text-sm font-bold shadow-lg border-2 transition-all ${
              activeCount > 0 || panelOpen
                ? "bg-orange-500 text-white border-orange-500 shadow-orange-200"
                : "bg-white text-orange-500 border-orange-400 hover:bg-orange-50"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            กรอง{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>

          {/* Filter popup */}
          {panelOpen && (
            <div className="absolute top-12 right-0 w-72 rounded-2xl bg-white shadow-2xl border border-neutral-200 p-5 space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-neutral-800">กรองประกาศ</p>
                <button onClick={() => setPanelOpen(false)}>
                  <X className="h-4 w-4 text-neutral-400 hover:text-neutral-700" />
                </button>
              </div>

              {/* Type */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">ประเภท</p>
                <div className="grid grid-cols-2 gap-2">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setTypeFilter(opt.value)}
                      className={`rounded-xl py-2.5 text-sm font-semibold transition-all border-2 ${
                        typeFilter === opt.value
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-white text-neutral-600 border-neutral-200 hover:border-orange-400 hover:text-orange-500"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">ประเภทร้าน</p>
                <div className="relative">
                  <select
                    value={catFilter}
                    onChange={(e) => setCatFilter(e.target.value)}
                    className="w-full appearance-none rounded-xl border-2 border-neutral-200 bg-neutral-50 py-2.5 pl-3 pr-8 text-sm text-neutral-700 focus:outline-none focus:border-orange-400"
                  >
                    <option value="">ทุกประเภท</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>{c.name_th}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                </div>
              </div>

              {/* Province */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">จังหวัด</p>
                <div className="relative">
                  <select
                    value={provinceFilter}
                    onChange={(e) => setProvinceFilter(e.target.value)}
                    className="w-full appearance-none rounded-xl border-2 border-neutral-200 bg-neutral-50 py-2.5 pl-3 pr-8 text-sm text-neutral-700 focus:outline-none focus:border-orange-400"
                  >
                    <option value="">ทุกจังหวัด</option>
                    {provinces.map(([name]) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                </div>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">ราคา (บาท)</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="ต่ำสุด"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full rounded-xl border-2 border-neutral-200 bg-neutral-50 py-2 px-3 text-sm focus:outline-none focus:border-orange-400"
                  />
                  <span className="text-neutral-400 shrink-0">–</span>
                  <input
                    type="number"
                    placeholder="สูงสุด"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full rounded-xl border-2 border-neutral-200 bg-neutral-50 py-2 px-3 text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
              </div>

              {activeCount > 0 && (
                <button
                  onClick={clearAll}
                  className="w-full rounded-xl border-2 border-neutral-200 py-2.5 text-sm font-medium text-neutral-500 hover:text-red-500 hover:border-red-300 transition-colors"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Listing panel ── */}
      <div className="w-80 xl:w-96 shrink-0 flex flex-col border-l bg-white overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b bg-orange-500">
          <p className="text-sm font-bold text-white">
            {userLoc ? "เรียงตามระยะทาง" : "ประกาศทั้งหมด"}
          </p>
        </div>

        {/* Cards */}
        <div className="flex-1 overflow-y-auto divide-y">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-neutral-400 text-sm gap-2">
              <MapPin className="h-8 w-8 text-neutral-300" />
              ไม่มีประกาศในพื้นที่นี้
            </div>
          ) : (
            sorted.map((l) => {
              const cover = l.listing_images.slice().sort((a, b) => a.display_order - b.display_order)[0];
              const coverUrl = cover ? resolveImageUrl(cover.storage_path) : null;
              const dist = userLoc ? distanceKm(userLoc.lat, userLoc.lng, l.latitude, l.longitude) : null;
              const typeBadge = TYPE_COLOR[l.listing_type] ?? "bg-blue-100 text-blue-700";
              const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${l.latitude},${l.longitude}`;

              return (
                <div key={l.id} className="p-3 hover:bg-orange-50 transition-colors">
                  <Link href={`/property/${l.slug}`} className="flex gap-3">
                    <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-neutral-100">
                      {coverUrl ? (
                        <Image src={coverUrl} alt={l.title} fill className="object-cover" sizes="80px" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-neutral-300 text-xs">ไม่มีรูป</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeBadge}`}>
                          {l.listing_type === "sale" ? "เซ้ง" : l.listing_type === "rent" ? "ให้เช่า" : "เซ้ง+เช่า"}
                        </span>
                        {dist !== null && (
                          <span className="text-[10px] text-neutral-500">{fmtDist(dist)}</span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-neutral-900">{priceText(l)}</p>
                      <p className="text-xs text-neutral-700 line-clamp-2 leading-snug">{l.title}</p>
                      {l.provinces?.name_th && (
                        <p className="text-[10px] text-neutral-400">{l.district ? `${l.district}, ` : ""}{l.provinces.name_th}</p>
                      )}
                    </div>
                  </Link>
                  <a
                    href={navUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center justify-center gap-1.5 w-full rounded-lg bg-orange-50 border border-orange-200 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-100 transition-colors"
                  >
                    <Navigation className="h-3 w-3" />
                    นำทาง
                  </a>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
