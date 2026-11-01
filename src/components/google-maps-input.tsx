"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin, X, CheckCircle2, XCircle, Hand } from "lucide-react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveGoogleMapsUrl } from "@/lib/actions/maps";
import type { Coords } from "@/lib/utils/google-maps";

const LocationPickerMap = dynamic(
  () => import("./location-picker-map").then((m) => m.LocationPickerMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-56 w-full rounded-lg border bg-neutral-100 flex items-center justify-center text-xs text-neutral-400">
        กำลังโหลดแผนที่…
      </div>
    ),
  }
);

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

type InputStatus = "idle" | "searching" | "resolving" | "linkError";

function isUrlLike(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (/^https?:\/\//i.test(t)) return true;
  return /maps\.app\.goo\.gl|goo\.gl\/maps|google\.[a-z.]+\/maps/i.test(t);
}

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
  const [coords, setCoords] = useState<Coords | null>(initialCoords ?? null);
  const [locationName, setLocationName] = useState<string | null>(null);

  // Unified input state
  const [inputValue, setInputValue] = useState("");
  const [status, setStatus] = useState<InputStatus>("idle");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // ── Link resolution ────────────────────────────────────────
  const resolveLink = useCallback(async (url: string) => {
    const result = await resolveGoogleMapsUrl(url);
    if (result) {
      setCoords(result);
      setLocationName(null);
      setStatus("idle");
      setSuggestions([]);
      onChange(result);
    } else {
      setStatus("linkError");
    }
  }, [onChange]);

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

  // ── Search: Nominatim (fallback, via server proxy) ─────────
  async function searchNominatim(input: string): Promise<Suggestion[]> {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(input)}`);
    if (!res.ok) return [];
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

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInputValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = val.trim();
    if (!trimmed) { setSuggestions([]); setStatus("idle"); return; }

    if (isUrlLike(trimmed)) {
      setSuggestions([]);
      setStatus("resolving");
      debounceRef.current = setTimeout(() => resolveLink(trimmed), 500);
      return;
    }

    setStatus("searching");
    debounceRef.current = setTimeout(async () => {
      try {
        const results = GOOGLE_API_KEY
          ? await searchGooglePlaces(trimmed)
          : await searchNominatim(trimmed);
        setSuggestions(results);
      } catch (err) {
        console.error("[places] search failed", err);
        if (GOOGLE_API_KEY) {
          try {
            setSuggestions(await searchNominatim(trimmed));
          } catch { setSuggestions([]); }
        } else {
          setSuggestions([]);
        }
      } finally { setStatus("idle"); }
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
        setInputValue("");
        setSuggestions([]);
        setStatus("idle");
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
      setInputValue("");
      setSuggestions([]);
      setStatus("idle");
      onChange(newCoords);
    }
  }

  // ── Clear ──────────────────────────────────────────────────
  function handleClear() {
    setCoords(null);
    setLocationName(null);
    setInputValue("");
    setSuggestions([]);
    setStatus("idle");
    onChange(null);
  }

  function handleMapDrag(c: Coords) {
    setCoords(c);
    setLocationName(null);
    setStatus("idle");
    onChange(c);
  }

  return (
    <div className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50/60 to-white p-4 space-y-3 shadow-sm">
      <div className="flex items-start gap-2">
        <MapPin className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <Label className="text-base font-bold text-neutral-900">
            ตำแหน่งที่ตั้งบนแผนที่
          </Label>
          <p className="text-xs text-neutral-500 mt-0.5">
            <span className="font-medium text-orange-600">แนะนำให้ปักหมุด</span> เพื่อให้ผู้ซื้อเห็นทำเลชัดเจน — พิมพ์ค้นหา วางลิงก์ Google Maps หรือลากหมุดบนแผนที่ก็ได้
          </p>
        </div>
      </div>

      {/* Unified input */}
      <div ref={containerRef} className="relative z-[500]">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
          <Input
            value={inputValue}
            onChange={handleInput}
            placeholder="พิมพ์ค้นหาสถานที่ หรือวางลิงก์ Google Maps"
            className="pl-9 pr-8"
          />
          {(status === "searching" || status === "resolving") && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-neutral-400" />
          )}
          {inputValue && status !== "searching" && status !== "resolving" && (
            <button
              type="button"
              onClick={() => { setInputValue(""); setSuggestions([]); setStatus("idle"); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {suggestions.length > 0 && (
          <ul className="absolute z-[1000] mt-1 w-full rounded-lg border bg-white shadow-lg overflow-hidden">
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

        {status === "resolving" && (
          <p className="flex items-center gap-1.5 text-xs text-neutral-500 mt-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            กำลังตรวจสอบลิงก์...
          </p>
        )}
        {status === "linkError" && (
          <p className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
            <XCircle className="h-3 w-3" />
            ดึงตำแหน่งจากลิงก์ไม่ได้ ลองค้นหาด้วยชื่อสถานที่แทน
          </p>
        )}
        {status !== "resolving" && status !== "linkError" && status !== "searching" && inputValue.trim().length > 1 && suggestions.length === 0 && !isUrlLike(inputValue) && (
          <p className="text-xs text-neutral-400 mt-1">ไม่พบสถานที่ ลองพิมพ์ชื่ออื่นหรือเป็นภาษาอังกฤษ</p>
        )}
      </div>

      {/* Selected location pill */}
      {coords && (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          <span className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {locationName ?? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`}
            </span>
          </span>
          <button type="button" onClick={handleClear} className="ml-2 shrink-0 text-green-600 hover:text-green-800 text-xs">
            ล้าง
          </button>
        </div>
      )}

      {/* Interactive draggable-pin map */}
      <div className="relative">
        <LocationPickerMap
          coords={coords}
          onCoordsChange={handleMapDrag}
          className="h-56 md:h-64 w-full rounded-lg border overflow-hidden"
        />
        <div className="pointer-events-none absolute left-2 bottom-2 z-[400] flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-medium text-neutral-700 shadow ring-1 ring-black/5">
          <Hand className="h-3 w-3" />
          ลากหมุดเพื่อปรับตำแหน่ง
        </div>
      </div>
    </div>
  );
}
