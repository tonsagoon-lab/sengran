"use client";

import dynamic from "next/dynamic";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, SlidersHorizontal, X, ChevronDown,
  MapPin, Navigation, Loader2, LocateFixed,
} from "lucide-react";
import { resolveImageUrl } from "@/lib/utils/image-url";
import {
  loadMapListingsByDistance,
  loadMapListingsByProvince,
} from "@/lib/actions/map";
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

type LocationMode = "asking" | "gps" | "province";

interface Category { id: number; name_th: string; slug: string }
interface Province { id: number; name_th: string; slug: string }

interface MapLoaderProps {
  categories: Category[];
  provinces: Province[];
}

export function MapLoader({ categories, provinces }: MapLoaderProps) {
  const [mode, setMode] = useState<LocationMode>("asking");
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedProvince, setSelectedProvince] = useState("");

  const [allListings, setAllListings] = useState<MapListing[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [typeFilter, setTypeFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const autoGpsFired = useRef(false);

  // fetch listings based on mode
  const fetchListings = useCallback(async (
    currentMode: LocationMode,
    loc: { lat: number; lng: number } | null,
    province: string,
    currentOffset: number,
    reset = false
  ) => {
    if (loading) return;
    setLoading(true);
    try {
      let data: MapListing[] = [];
      if (currentMode === "gps" && loc) {
        data = await loadMapListingsByDistance(loc.lat, loc.lng, currentOffset);
      } else if (currentMode === "province" && province) {
        data = await loadMapListingsByProvince(province, currentOffset);
      }
      if (reset) {
        setAllListings(data);
        setOffset(data.length);
      } else {
        setAllListings((prev) => {
          const ids = new Set(prev.map((l) => l.id));
          return [...prev, ...data.filter((l) => !ids.has(l.id))];
        });
        setOffset((prev) => prev + data.length);
      }
      setHasMore(data.length === 10);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Auto GPS from MapView (fires once on map load)
  const onUserLocation = useCallback(async (lat: number, lng: number) => {
    if (autoGpsFired.current) return;
    autoGpsFired.current = true;
    const loc = { lat, lng };
    setUserLoc(loc);
    setMode("gps");
    setAllListings([]);
    setLoading(true);
    const data = await loadMapListingsByDistance(lat, lng, 0);
    setAllListings(data);
    setOffset(data.length);
    setHasMore(data.length === 10);
    setLoading(false);
  }, []);

  // GPS button (manual retry)
  const requestGPS = useCallback(() => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLoc(loc);
        setMode("gps");
        setOffset(0);
        setHasMore(true);
        setAllListings([]);
        setGpsLoading(false);
        await fetchListings("gps", loc, "", 0, true);
      },
      () => {
        setGpsLoading(false);
        setMode("province");
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  }, [fetchListings]);

  // Province select
  const handleProvinceSelect = useCallback(async (name: string) => {
    setSelectedProvince(name);
    setMode("province");
    setOffset(0);
    setHasMore(true);
    setAllListings([]);
    await fetchListings("province", null, name, 0, true);
  }, [fetchListings]);

  // Infinite scroll sentinel
  useEffect(() => {
    if (!sentinelRef.current || mode === "asking") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || loading || !hasMore) return;
        fetchListings(mode, userLoc, selectedProvince, offset, false);
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [mode, userLoc, selectedProvince, offset, loading, hasMore, fetchListings]);

  // Client-side filters on top of fetched listings
  const filtered = useMemo(() => {
    return allListings.filter((l) => {
      if (typeFilter && l.listing_type !== typeFilter) return false;
      if (catFilter && l.categories?.slug !== catFilter) return false;
      const price = l.listing_type === "rent" ? l.rent_price : l.sale_price;
      if (minPrice && (price ?? 0) < Number(minPrice)) return false;
      if (maxPrice && (price ?? 0) > Number(maxPrice)) return false;
      return true;
    });
  }, [allListings, typeFilter, catFilter, minPrice, maxPrice]);

  const activeFilterCount = [typeFilter, catFilter, minPrice, maxPrice].filter(Boolean).length;

  return (
    <div className="flex h-full">
      {/* ── Left: Map ── */}
      <div className="relative flex-1 min-w-0">
        <MapView
          listings={filtered}
          onUserLocation={onUserLocation}
          onGpsDenied={() => { if (!autoGpsFired.current) setMode("province"); }}
        />

        {/* Back */}
        <div className="absolute top-3 left-3 z-[1000]">
          <Link
            href="/listings"
            className="flex items-center gap-1.5 h-9 rounded-full bg-white px-3 text-sm font-medium text-neutral-700 shadow-lg border border-neutral-200 hover:bg-neutral-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับ
          </Link>
        </div>

        {/* Filter button */}
        <div className="absolute top-3 right-3 z-[1000]">
          <button
            onClick={() => setPanelOpen((v) => !v)}
            className={`flex items-center gap-2 h-10 rounded-full px-4 text-sm font-bold shadow-lg border-2 transition-all ${
              activeFilterCount > 0 || panelOpen
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-white text-orange-500 border-orange-400 hover:bg-orange-50"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            กรอง{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>

          {panelOpen && (
            <div className="absolute top-12 right-0 w-72 rounded-2xl bg-white shadow-2xl border border-neutral-200 p-5 space-y-5 z-50">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-neutral-800">กรองประกาศ</p>
                <button onClick={() => setPanelOpen(false)}>
                  <X className="h-4 w-4 text-neutral-400 hover:text-neutral-700" />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">ประเภท</p>
                <div className="grid grid-cols-2 gap-2">
                  {TYPE_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => setTypeFilter(opt.value)}
                      className={`rounded-xl py-2.5 text-sm font-semibold border-2 transition-all ${
                        typeFilter === opt.value
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-white text-neutral-600 border-neutral-200 hover:border-orange-400"
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">ประเภทร้าน</p>
                <div className="relative">
                  <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
                    className="w-full appearance-none rounded-xl border-2 border-neutral-200 bg-neutral-50 py-2.5 pl-3 pr-8 text-sm focus:outline-none focus:border-orange-400">
                    <option value="">ทุกประเภท</option>
                    {categories.map((c) => <option key={c.id} value={c.slug}>{c.name_th}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">ราคา (บาท)</p>
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="ต่ำสุด" value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full rounded-xl border-2 border-neutral-200 bg-neutral-50 py-2 px-3 text-sm focus:outline-none focus:border-orange-400" />
                  <span className="text-neutral-400 shrink-0">–</span>
                  <input type="number" placeholder="สูงสุด" value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full rounded-xl border-2 border-neutral-200 bg-neutral-50 py-2 px-3 text-sm focus:outline-none focus:border-orange-400" />
                </div>
              </div>

              {activeFilterCount > 0 && (
                <button onClick={() => { setTypeFilter(""); setCatFilter(""); setMinPrice(""); setMaxPrice(""); }}
                  className="w-full rounded-xl border-2 border-neutral-200 py-2.5 text-sm font-medium text-neutral-500 hover:text-red-500 hover:border-red-300 transition-colors">
                  ล้างตัวกรองทั้งหมด
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="w-80 xl:w-96 shrink-0 flex flex-col border-l bg-white overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b bg-orange-500 shrink-0">
          <p className="text-sm font-bold text-white">
            {mode === "gps" ? "ใกล้คุณที่สุด" : mode === "province" ? selectedProvince : "เลือกตำแหน่ง"}
          </p>
        </div>

        {/* Location prompt */}
        {mode === "asking" && (
          <div className="flex flex-col items-center justify-center flex-1 gap-5 p-6">
            <LocateFixed className="h-10 w-10 text-orange-400" />
            <p className="text-sm font-semibold text-neutral-700 text-center">ค้นหาประกาศใกล้คุณ</p>

            <button
              onClick={requestGPS}
              disabled={gpsLoading}
              className="flex items-center gap-2 w-full justify-center rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60 transition-colors"
            >
              {gpsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
              ใช้ตำแหน่งปัจจุบัน
            </button>

            <div className="w-full space-y-2">
              <p className="text-xs text-neutral-500 text-center">หรือเลือกจังหวัด</p>
              <div className="relative">
                <select
                  value={selectedProvince}
                  onChange={(e) => e.target.value && handleProvinceSelect(e.target.value)}
                  className="w-full appearance-none rounded-xl border-2 border-neutral-200 bg-neutral-50 py-2.5 pl-3 pr-8 text-sm text-neutral-700 focus:outline-none focus:border-orange-400"
                >
                  <option value="">เลือกจังหวัด…</option>
                  {provinces.map((p) => <option key={p.id} value={p.name_th}>{p.name_th}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              </div>
            </div>
          </div>
        )}

        {/* Province picker when GPS denied */}
        {mode === "province" && (
          <div className="px-4 pt-3 pb-2 border-b shrink-0">
            <div className="relative">
              <select
                value={selectedProvince}
                onChange={(e) => e.target.value && handleProvinceSelect(e.target.value)}
                className="w-full appearance-none rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-3 pr-8 text-sm text-neutral-700 focus:outline-none focus:border-orange-400"
              >
                <option value="">เลือกจังหวัด…</option>
                {provinces.map((p) => <option key={p.id} value={p.name_th}>{p.name_th}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            </div>
          </div>
        )}

        {/* Listings */}
        {mode !== "asking" && (
          <div className="flex-1 overflow-y-auto divide-y">
            {filtered.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center h-40 text-neutral-400 text-sm gap-2">
                <MapPin className="h-8 w-8 text-neutral-300" />
                ไม่มีประกาศในพื้นที่นี้
              </div>
            ) : (
              filtered.map((l) => {
                const cover = l.listing_images.slice().sort((a, b) => a.display_order - b.display_order)[0];
                const coverUrl = cover ? resolveImageUrl(cover.storage_path) : null;
                const dist = userLoc ? distanceKm(userLoc.lat, userLoc.lng, l.latitude, l.longitude) : null;
                const badge = TYPE_COLOR[l.listing_type] ?? "bg-blue-100 text-blue-700";
                const typeLabel = l.listing_type === "sale" ? "เซ้ง" : l.listing_type === "rent" ? "ให้เช่า" : "เซ้ง+เช่า";
                const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${l.latitude},${l.longitude}`;

                return (
                  <div key={l.id} className="p-3 hover:bg-orange-50 transition-colors">
                    <Link href={`/property/${l.slug}`} className="flex gap-3">
                      <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-neutral-100">
                        {coverUrl
                          ? <Image src={coverUrl} alt={l.title} fill className="object-cover" sizes="80px" />
                          : <div className="flex h-full items-center justify-center text-neutral-300 text-xs">ไม่มีรูป</div>
                        }
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge}`}>{typeLabel}</span>
                          {dist !== null && <span className="text-[10px] text-neutral-500">{fmtDist(dist)}</span>}
                        </div>
                        <p className="text-sm font-bold text-neutral-900">{priceText(l)}</p>
                        <p className="text-xs text-neutral-700 line-clamp-2 leading-snug">{l.title}</p>
                        {l.provinces?.name_th && (
                          <p className="text-[10px] text-neutral-400">{l.district ? `${l.district}, ` : ""}{l.provinces.name_th}</p>
                        )}
                      </div>
                    </Link>
                    <a href={navUrl} target="_blank" rel="noopener noreferrer"
                      className="mt-2 flex items-center justify-center gap-1.5 w-full rounded-lg bg-orange-50 border border-orange-200 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-100 transition-colors">
                      <Navigation className="h-3 w-3" />
                      นำทาง
                    </a>
                  </div>
                );
              })
            )}

            {/* Sentinel */}
            <div ref={sentinelRef} className="py-4 flex items-center justify-center">
              {loading && <Loader2 className="h-5 w-5 animate-spin text-orange-400" />}
              {!hasMore && allListings.length > 0 && (
                <p className="text-xs text-neutral-400">แสดงทั้งหมดแล้ว</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
