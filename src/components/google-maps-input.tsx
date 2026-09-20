"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, MapPin, X, CheckCircle2, XCircle, Link2, Search } from "lucide-react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveGoogleMapsUrl } from "@/lib/actions/maps";
import type { Coords } from "@/lib/utils/google-maps";

interface GoogleMapsInputProps {
  initialCoords?: Coords | null;
  onChange: (coords: Coords | null) => void;
}

interface Suggestion {
  id: string;
  mainText: string;
  secondaryText: string;
  // For Google Places
  placePrediction?: google.maps.places.PlacePrediction;
  // For Nominatim fallback
  nominatim?: { lat: string; lon: string };
}

type Mode = "link" | "search";
type LinkStatus = "idle" | "loading" | "success" | "error";

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Shared loader (only one script tag ever loaded)
let placesLibraryPromise: Promise<google.maps.PlacesLibrary> | null = null;
function loadPlacesLibrary(): Promise<google.maps.PlacesLibrary> {
  if (!GOOGLE_API_KEY) return Promise.reject(new Error("no key"));
  if (!placesLibraryPromise) {
    setOptions({
      key: GOOGLE_API_KEY,
      v: "weekly",
      language: "th",
      region: "TH",
    });
    placesLibraryPromise = importLibrary("places");
  }
  return placesLibraryPromise;
}

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
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Google Places session token — rotates after each pick
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSuggestions([]);
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

  // ── Search: Google Places (primary) ────────────────────────
  async function searchGooglePlaces(input: string): Promise<Suggestion[]> {
    const places = await loadPlacesLibrary();
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new places.AutocompleteSessionToken();
    }
    const { suggestions: raw } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input,
      sessionToken: sessionTokenRef.current,
      includedRegionCodes: ["th"],
      language: "th",
    });
    return raw
      .filter((s) => s.placePrediction)
      .map((s) => {
        const p = s.placePrediction!;
        return {
          id: p.placeId,
          mainText: p.mainText?.text ?? p.text.text,
          secondaryText: p.secondaryText?.text ?? "",
          placePrediction: p,
        };
      });
  }

  // ── Search: Nominatim (fallback) ───────────────────────────
  async function searchNominatim(input: string): Promise<Suggestion[]> {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input)}&format=json&limit=6&accept-language=th,en&countrycodes=th`,
      { headers: { "Accept-Language": "th" } }
    );
    const data: Array<{ place_id: number; display_name: string; lat: string; lon: string }> = await res.json();
    return data.map((r) => {
      const parts = r.display_name.split(",");
      return {
        id: String(r.place_id),
        mainText: parts[0] ?? r.display_name,
        secondaryText: parts.slice(1, 3).join(",").trim(),
        nominatim: { lat: r.lat, lon: r.lon },
      };
    });
  }

  function handleSearchInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!val.trim()) { setSuggestions([]); setSearchLoading(false); return; }
    setSearchLoading(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = GOOGLE_API_KEY
          ? await searchGooglePlaces(val)
          : await searchNominatim(val);
        setSuggestions(results);
      } catch (err) {
        console.error("[places] search failed", err);
        // If Google Places fails (quota, network), fall back once to Nominatim
        if (GOOGLE_API_KEY) {
          try {
            setSuggestions(await searchNominatim(val));
          } catch { setSuggestions([]); }
        } else {
          setSuggestions([]);
        }
      } finally { setSearchLoading(false); }
    }, 300);
  }

  async function handleSelectPlace(s: Suggestion) {
    // Google Places path
    if (s.placePrediction) {
      try {
        const place = s.placePrediction.toPlace();
        await place.fetchFields({ fields: ["location", "displayName", "formattedAddress"] });
        const loc = place.location;
        if (!loc) return;
        const newCoords: Coords = { lat: loc.lat(), lng: loc.lng() };
        setCoords(newCoords);
        setLocationName(place.displayName ?? s.mainText);
        setSearchQuery("");
        setSuggestions([]);
        onChange(newCoords);
        // Rotate session token after successful pick
        sessionTokenRef.current = null;
        return;
      } catch (err) {
        console.error("[places] fetch details failed", err);
        return;
      }
    }
    // Nominatim path
    if (s.nominatim) {
      const newCoords: Coords = { lat: parseFloat(s.nominatim.lat), lng: parseFloat(s.nominatim.lon) };
      setCoords(newCoords);
      setLocationName(s.mainText);
      setSearchQuery("");
      setSuggestions([]);
      onChange(newCoords);
    }
  }

  // ── Clear ──────────────────────────────────────────────────
  function handleClear() {
    setCoords(null);
    setLocationName(null);
    setLinkValue("");
    setLinkStatus("idle");
    setSearchQuery("");
    setSuggestions([]);
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
                onClick={() => { setSearchQuery(""); setSuggestions([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {suggestions.length > 0 && (
            <ul className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow-lg overflow-hidden">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onMouseDown={() => handleSelectPlace(s)}
                    className="w-full text-left px-3 py-2.5 hover:bg-orange-50 transition-colors border-b last:border-0"
                  >
                    <p className="text-sm font-medium text-neutral-800 truncate">{s.mainText}</p>
                    {s.secondaryText && (
                      <p className="text-xs text-neutral-400 truncate mt-0.5">{s.secondaryText}</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!searchLoading && searchQuery.length > 1 && suggestions.length === 0 && (
            <p className="text-xs text-neutral-400 mt-1">ไม่พบสถานที่ ลองพิมพ์ชื่ออื่นหรือเป็นภาษาอังกฤษ</p>
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
