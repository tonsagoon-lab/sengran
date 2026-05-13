"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { MapPin, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrowseCard } from "@/components/listings/browse-card";
import { getNearMeListings } from "@/lib/actions/listings";
import type { SearchListing } from "@/lib/db/listings";

interface Province { id: number; name_th: string; slug: string }

interface NearMeSectionProps {
  provinces: Province[];
  supabaseUrl: string;
}

type LocationState =
  | { type: "gps"; lat: number; lng: number; radiusKm: number }
  | { type: "province"; provinceId: number; provinceName: string; slug: string };

type Status = "init" | "prompt" | "gps-loading" | "province-select" | "fetching" | "loaded" | "empty";

const STORAGE_KEY = "user_location";
const DENIED_KEY = "user_location_denied";

export function NearMeSection({ provinces, supabaseUrl }: NearMeSectionProps) {
  const [status, setStatus] = useState<Status>("init");
  const [location, setLocation] = useState<LocationState | null>(null);
  const [listings, setListings] = useState<SearchListing[]>([]);
  const [total, setTotal] = useState(0);

  const fetchListings = useCallback(async (loc: LocationState) => {
    setStatus("fetching");
    try {
      const result = await getNearMeListings(
        // GPS mode: skip distance RPC, show latest listings instead
        loc.type === "gps"
          ? { type: "latest" }
          : { type: "province", provinceId: loc.provinceId }
      );
      if (result.listings.length > 0) {
        setListings(result.listings);
        setTotal(result.total);
        setStatus("loaded");
      } else {
        setListings([]);
        setTotal(0);
        setStatus("empty");
      }
    } catch {
      setStatus("province-select");
    }
  }, []);

  const applyLocation = useCallback(
    (loc: LocationState) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
      setLocation(loc);
      fetchListings(loc);
    },
    [fetchListings]
  );

  // On mount: check localStorage
  useEffect(() => {
    try {
      localStorage.removeItem(DENIED_KEY); // clear old denied flag
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as LocationState;
        setLocation(parsed);
        fetchListings(parsed);
        return;
      }
    } catch {
      // ignore storage errors
    }
    setStatus("prompt");
  }, [fetchListings]);

  const requestGPS = () => {
    if (!navigator.geolocation) {
      setStatus("province-select");
      return;
    }
    setStatus("gps-loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc: LocationState = {
          type: "gps",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          radiusKm: 10,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
        setLocation(loc);
        // Skip distance RPC (no coords on most listings); show latest instead
        setStatus("fetching");
        try {
          const result = await getNearMeListings({ type: "latest" });
          if (result.listings.length > 0) {
            setListings(result.listings);
            setTotal(result.total);
            setStatus("loaded");
          } else {
            setListings([]);
            setTotal(0);
            setStatus("empty");
          }
        } catch {
          setStatus("province-select");
        }
      },
      () => {
        setStatus("province-select");
      },
      { timeout: 10000 }
    );
  };

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DENIED_KEY);
    setLocation(null);
    setListings([]);
    setStatus("prompt");
  };

  // "init" — brief flash before useEffect runs; render nothing
  if (status === "init") return null;

  // ── Prompt card ───────────────────────────────────────────
  if (status === "prompt" || status === "gps-loading") {
    return (
      <section className="py-6">
        <div className="mx-auto max-w-sm rounded-2xl border bg-orange-50 p-6 text-center shadow-sm space-y-3">
          <div className="text-4xl">📍</div>
          <h2 className="font-semibold text-neutral-800">ค้นหาร้านใกล้ตัวคุณ</h2>
          <p className="text-sm text-neutral-500">
            อนุญาตให้เว็บเข้าถึงตำแหน่งเพื่อดูร้านใกล้คุณ หรือเลือกจังหวัด
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              onClick={requestGPS}
              disabled={status === "gps-loading"}
              className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
            >
              {status === "gps-loading" ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> กำลังระบุตำแหน่ง...</>
              ) : (
                <><MapPin className="h-4 w-4" /> อนุญาต GPS</>
              )}
            </Button>
            <Button variant="outline" onClick={() => setStatus("province-select")}>
              เลือกจังหวัดเอง
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // ── Province picker ───────────────────────────────────────
  if (status === "province-select") {
    return (
      <section className="py-6">
        <div className="mx-auto max-w-sm rounded-2xl border bg-white p-6 shadow-sm space-y-3">
          <h2 className="font-semibold text-neutral-800 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-orange-500" /> เลือกจังหวัดของคุณ
          </h2>
          <select
            defaultValue=""
            onChange={(e) => {
              const prov = provinces.find((p) => String(p.id) === e.target.value);
              if (!prov) return;
              applyLocation({
                type: "province",
                provinceId: prov.id,
                provinceName: prov.name_th,
                slug: prov.slug,
              });
            }}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="" disabled>เลือกจังหวัด...</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>{p.name_th}</option>
            ))}
          </select>
        </div>
      </section>
    );
  }

  // ── Loading listings ──────────────────────────────────────
  if (status === "fetching") {
    return (
      <section className="py-6 space-y-3">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
          <span className="text-sm text-neutral-500">กำลังโหลด...</span>
        </div>
      </section>
    );
  }

  // ── Section title ─────────────────────────────────────────
  const title =
    location?.type === "province"
      ? `📍 ร้านใน${location.provinceName}`
      : "🆕 ประกาศล่าสุด";

  const seeAllHref =
    location?.type === "province"
      ? `/city/${location.slug}`
      : location?.type === "gps"
      ? `/listings?lat=${location.lat}&lng=${location.lng}&radius=${location.radiusKm}`
      : "/listings";

  return (
    <section className="py-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-semibold text-neutral-800">{title}</h2>
        <button onClick={reset} className="text-xs text-neutral-400 hover:text-neutral-600 flex items-center gap-1">
          <X className="h-3 w-3" /> เปลี่ยนตำแหน่ง
        </button>
      </div>

      {/* Empty state */}
      {status === "empty" && (
        <div className="rounded-xl border bg-neutral-50 py-8 text-center space-y-2">
          <p className="text-sm text-neutral-600">ยังไม่มีประกาศในจังหวัดนี้</p>
          <Link href="/listings/new" className="text-sm text-orange-600 hover:underline">
            ลงประกาศแรก →
          </Link>
        </div>
      )}

      {/* Listing grid */}
      {status === "loaded" && listings.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {listings.map((listing) => (
              <BrowseCard key={listing.id} listing={listing} supabaseUrl={supabaseUrl} />
            ))}
          </div>
          <Link
            href={seeAllHref}
            className="flex items-center justify-center gap-2 w-full rounded-xl border-2 border-orange-400 bg-orange-50 hover:bg-orange-100 text-orange-600 font-semibold py-3 text-sm transition-colors"
          >
            <MapPin className="h-4 w-4" />
            ดูร้านใกล้เคียงเพิ่มเติม →
          </Link>
        </>
      )}
    </section>
  );
}
