"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, MapPin, X, CheckCircle2, XCircle, Link2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveGoogleMapsUrl } from "@/lib/actions/maps";
import type { Coords } from "@/lib/utils/google-maps";

interface GoogleMapsInputProps {
  initialCoords?: Coords | null;
  onChange: (coords: Coords | null) => void;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

type Mode = "link" | "search";
type LinkStatus = "idle" | "loading" | "success" | "error";

export function GoogleMapsInput({ initialCoords, onChange }: GoogleMapsInputProps) {
  const [mode, setMode] = useState<Mode>("search");
  const [coords, setCoords] = useState<Coords | null>(initialCoords ?? null);
  const [locationName, setLocationName] = useState<string | null>(null);

  // Link mode state
  const [linkValue, setLinkValue] = useState("");
  const [linkStatus, setLinkStatus] = useState<LinkStatus>(initialCoords ? "success" : "idle");
  const linkDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search mode state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSearchResults([]);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Link mode ──────────────────────────────────────────────
  const resolveLink = useCallback(async (url: string) => {
    if (!url.trim()) { setLinkStatus("idle"); setCoords(null); onChange(null); return; }
    setLinkStatus("loading");
    const result = await resolveGoogleMapsUrl(url);
    if (result) {
      setCoords(result);
      setLocationName(null);
      setLinkStatus("success");
      onChange(result);
    } else {
      setCoords(null);
      setLinkStatus("error");
      onChange(null);
    }
  }, [onChange]);

  function handleLinkChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setLinkValue(val);
    if (linkDebounceRef.current) clearTimeout(linkDebounceRef.current);
    linkDebounceRef.current = setTimeout(() => resolveLink(val), 500);
  }

  // ── Search mode ────────────────────────────────────────────
  function handleSearchInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!val.trim()) { setSearchResults([]); setSearchLoading(false); return; }
    setSearchLoading(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=6&accept-language=th,en&countrycodes=th`,
          { headers: { "Accept-Language": "th" } }
        );
        const data: NominatimResult[] = await res.json();
        setSearchResults(data);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 500);
  }

  function handleSelectPlace(place: NominatimResult) {
    const newCoords: Coords = { lat: parseFloat(place.lat), lng: parseFloat(place.lon) };
    setCoords(newCoords);
    setLocationName(place.display_name.split(",").slice(0, 2).join(", "));
    setSearchQuery("");
    setSearchResults([]);
    onChange(newCoords);
  }

  // ── Clear ──────────────────────────────────────────────────
  function handleClear() {
    setCoords(null);
    setLocationName(null);
    setLinkValue("");
    setLinkStatus("idle");
    setSearchQuery("");
    setSearchResults([]);
    onChange(null);
  }

  const embedUrl = coords
    ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}&z=17&output=embed`
    : null;

  return (
    <div className="space-y-2">
      <Label>
        ตำแหน่งที่ตั้ง{" "}
        <span className="text-neutral-400 font-normal">(ไม่บังคับ)</span>
      </Label>

      {/* Mode tabs */}
      <div className="flex rounded-lg border overflow-hidden text-sm">
        <button
          type="button"
          onClick={() => setMode("search")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${
            mode === "search"
              ? "bg-orange-50 text-orange-700 font-medium"
              : "bg-white text-neutral-500 hover:bg-neutral-50"
          }`}
        >
          <Search className="h-3.5 w-3.5" />
          ค้นหาสถานที่
        </button>
        <button
          type="button"
          onClick={() => setMode("link")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 border-l transition-colors ${
            mode === "link"
              ? "bg-orange-50 text-orange-700 font-medium"
              : "bg-white text-neutral-500 hover:bg-neutral-50"
          }`}
        >
          <Link2 className="h-3.5 w-3.5" />
          วาง Google Maps link
        </button>
      </div>

      {/* Search mode */}
      {mode === "search" && (
        <div ref={containerRef} className="relative">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={handleSearchInput}
              placeholder="เช่น ลาดพร้าว, เซ็นทรัลเวิลด์, บางนา..."
              className="pl-9 pr-8"
            />
            {searchLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-neutral-400" />
            )}
            {searchQuery && !searchLoading && (
              <button
                type="button"
                onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {searchResults.length > 0 && (
            <ul className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow-lg overflow-hidden">
              {searchResults.map((place) => {
                const parts = place.display_name.split(",");
                return (
                  <li key={place.place_id}>
                    <button
                      type="button"
                      onMouseDown={() => handleSelectPlace(place)}
                      className="w-full text-left px-3 py-2.5 hover:bg-orange-50 transition-colors border-b last:border-0"
                    >
                      <p className="text-sm font-medium text-neutral-800 truncate">{parts[0]}</p>
                      {parts[1] && <p className="text-xs text-neutral-400 truncate mt-0.5">{parts.slice(1, 3).join(",").trim()}</p>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {!searchLoading && searchQuery.length > 1 && searchResults.length === 0 && (
            <p className="text-xs text-neutral-400 mt-1">ไม่พบสถานที่ ลองพิมพ์ชื่อเป็นภาษาอังกฤษ</p>
          )}
        </div>
      )}

      {/* Link mode */}
      {mode === "link" && (
        <div>
          <div className="relative">
            <Input
              value={linkValue}
              onChange={handleLinkChange}
              placeholder="วาง Google Maps link ที่นี่"
              className="pr-8"
            />
            {linkValue && (
              <button
                type="button"
                onClick={() => { setLinkValue(""); setLinkStatus("idle"); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Google Maps → ค้นหาร้าน → กด &quot;แชร์&quot; → &quot;คัดลอกลิงก์&quot;
          </p>
          {linkStatus === "loading" && (
            <div className="flex items-center gap-2 text-sm text-neutral-500 mt-1.5">
              <Loader2 className="h-4 w-4 animate-spin" />
              กำลังตรวจสอบลิงก์...
            </div>
          )}
          {linkStatus === "error" && (
            <div className="flex items-center gap-2 text-sm text-red-500 mt-1.5">
              <XCircle className="h-4 w-4" />
              ดึงตำแหน่งไม่ได้ กรุณาตรวจสอบลิงก์
            </div>
          )}
        </div>
      )}

      {/* Selected location pill */}
      {coords && (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          <span className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {locationName ?? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`}
            </span>
          </span>
          <button type="button" onClick={handleClear} className="ml-2 shrink-0 text-green-600 hover:text-green-800 text-xs">
            เปลี่ยน
          </button>
        </div>
      )}

      {/* Map preview */}
      {embedUrl && (
        <iframe
          src={embedUrl}
          className="w-full h-48 rounded-lg border"
          loading="lazy"
          title="แผนที่"
        />
      )}
    </div>
  );
}
