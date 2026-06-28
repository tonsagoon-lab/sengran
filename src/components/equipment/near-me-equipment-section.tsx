"use client";

import { useEffect, useState, useCallback } from "react";
import { MapPin, Loader2, X, Navigation } from "lucide-react";
import { EquipmentCard } from "./equipment-card";
import { getNearMeEquipment } from "@/lib/actions/equipment";
import type { EquipmentListing } from "@/lib/db/equipment";

interface Province { id: number; name_th: string; slug: string }

const STORAGE_KEY = "user_equipment_location";
const RADIUS_OPTIONS = [5, 10, 25, 50];

type LocationState =
  | { type: "gps"; lat: number; lng: number; radiusKm: number }
  | { type: "province"; provinceId: number; provinceName: string };

type Status = "init" | "prompt" | "gps-loading" | "fetching" | "loaded" | "empty";

interface Props {
  provinces: Province[];
}

export function NearMeEquipmentSection({ provinces }: Props) {
  const [status, setStatus] = useState<Status>("init");
  const [location, setLocation] = useState<LocationState | null>(null);
  const [listings, setListings] = useState<EquipmentListing[]>([]);

  const fetchEquipment = useCallback(async (loc: LocationState) => {
    setStatus("fetching");
    try {
      const result = await getNearMeEquipment(
        loc.type === "gps"
          ? { type: "gps", lat: loc.lat, lng: loc.lng, radiusKm: loc.radiusKm }
          : { type: "province", provinceId: loc.provinceId }
      );
      setListings(result.listings);
      setStatus(result.listings.length > 0 ? "loaded" : "empty");
    } catch {
      setListings([]);
      setStatus("empty");
    }
  }, []);

  const applyLocation = useCallback(
    (loc: LocationState) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
      setLocation(loc);
      fetchEquipment(loc);
    },
    [fetchEquipment]
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as LocationState;
        if (parsed.type === "province") {
          setLocation(parsed);
          fetchEquipment(parsed);
          return;
        }
        if (parsed.type === "gps" && navigator.geolocation) {
          setStatus("gps-loading");
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const loc: LocationState = {
                type: "gps",
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                radiusKm: parsed.radiusKm,
              };
              localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
              setLocation(loc);
              fetchEquipment(loc);
            },
            () => {
              setLocation(parsed);
              fetchEquipment(parsed);
            },
            { timeout: 10000 }
          );
          return;
        }
        setLocation(parsed);
        fetchEquipment(parsed);
        return;
      }
    } catch {
      // ignore
    }
    setStatus("prompt");
  }, [fetchEquipment]);

  const requestGPS = () => {
    if (!navigator.geolocation) {
      setStatus("prompt");
      return;
    }
    setStatus("gps-loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: LocationState = {
          type: "gps",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          radiusKm: 10,
        };
        applyLocation(loc);
      },
      () => setStatus("prompt"),
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const changeRadius = (km: number) => {
    if (!location || location.type !== "gps") return;
    const updated = { ...location, radiusKm: km };
    applyLocation(updated);
  };

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setLocation(null);
    setListings([]);
    setStatus("prompt");
  };

  if (status === "init") return null;

  return (
    <section className="border-b bg-white py-5">
      <div className="mx-auto max-w-7xl px-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 font-semibold text-neutral-800">
            <MapPin className="h-4 w-4 text-orange-500" />
            อุปกรณ์ใกล้เคียง
          </h2>
          {location && (
            <button
              onClick={reset}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-3 w-3" /> เปลี่ยนตำแหน่ง
            </button>
          )}
        </div>

        {/* GPS prompt */}
        {status === "prompt" && (
          <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 space-y-3">
            <p className="text-sm text-neutral-600">ค้นหาอุปกรณ์มือสองใกล้คุณ หรือเลือกจังหวัด</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={requestGPS}
                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 hover:bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors"
              >
                <Navigation className="h-3.5 w-3.5" /> ใช้ GPS
              </button>
              <div className="flex items-center gap-2">
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const prov = provinces.find((p) => String(p.id) === e.target.value);
                    if (!prov) return;
                    applyLocation({ type: "province", provinceId: prov.id, provinceName: prov.name_th });
                  }}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="" disabled>เลือกจังหวัด...</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.id}>{p.name_th}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* GPS loading */}
        {(status === "gps-loading" || (status === "fetching" && !location)) && (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
            <span className="text-sm text-neutral-500">กำลังระบุตำแหน่ง...</span>
          </div>
        )}

        {/* Radius pills — GPS mode only */}
        {location?.type === "gps" && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-neutral-500">ระยะ:</span>
            {RADIUS_OPTIONS.map((km) => (
              <button
                key={km}
                onClick={() => changeRadius(km)}
                disabled={status === "fetching"}
                className={`rounded-full px-3 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                  location.radiusKm === km
                    ? "bg-orange-500 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {km} กม.
              </button>
            ))}
          </div>
        )}

        {/* Fetching spinner for province/radius change */}
        {status === "fetching" && location && (
          <div className="flex items-center gap-2 py-1">
            <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
            <span className="text-sm text-neutral-500">กำลังค้นหาอุปกรณ์ใกล้คุณ...</span>
          </div>
        )}

        {/* Empty state */}
        {status === "empty" && (
          <p className="text-sm text-neutral-500 py-2">
            {location?.type === "gps"
              ? `ไม่พบอุปกรณ์ในรัศมี ${location.radiusKm} กม. ลองเพิ่มระยะด้านบน`
              : "ยังไม่มีอุปกรณ์ในจังหวัดนี้"}
          </p>
        )}

        {/* Equipment cards — horizontal scroll */}
        {status === "loaded" && listings.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {listings.map((listing) => (
              <div key={listing.id} className="flex-none w-44 sm:w-52">
                <EquipmentCard listing={listing} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
