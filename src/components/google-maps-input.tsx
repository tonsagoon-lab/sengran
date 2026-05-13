"use client";

import { useState, useCallback, useRef } from "react";
import { Loader2, CheckCircle2, XCircle, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveGoogleMapsUrl } from "@/lib/actions/maps";
import type { Coords } from "@/lib/utils/google-maps";

interface GoogleMapsInputProps {
  initialCoords?: Coords | null;
  onChange: (coords: Coords | null) => void;
}

type Status = "idle" | "loading" | "success" | "error";

export function GoogleMapsInput({ initialCoords, onChange }: GoogleMapsInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [status, setStatus] = useState<Status>(initialCoords ? "success" : "idle");
  const [coords, setCoords] = useState<Coords | null>(initialCoords ?? null);
  const [showSaved, setShowSaved] = useState(!!initialCoords);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolve = useCallback(
    async (url: string) => {
      if (!url.trim()) {
        setStatus("idle");
        setCoords(null);
        onChange(null);
        return;
      }
      setStatus("loading");
      const result = await resolveGoogleMapsUrl(url);
      if (result) {
        setCoords(result);
        setStatus("success");
        onChange(result);
      } else {
        setCoords(null);
        setStatus("error");
        onChange(null);
      }
    },
    [onChange]
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInputValue(val);
    setShowSaved(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => resolve(val), 500);
  }

  function handleClear() {
    setInputValue("");
    setStatus("idle");
    setCoords(null);
    setShowSaved(false);
    onChange(null);
  }

  const embedUrl =
    coords
      ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}&z=17&output=embed`
      : null;

  return (
    <div className="space-y-2">
      <Label>ลิงก์ Google Maps <span className="text-neutral-400 font-normal">(ไม่บังคับ)</span></Label>

      {showSaved && coords && !inputValue ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              ตำแหน่งที่บันทึกไว้: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </span>
            <button type="button" onClick={handleClear} className="ml-2 text-green-600 hover:text-green-800">
              เปลี่ยนตำแหน่ง
            </button>
          </div>
          {embedUrl && (
            <iframe
              src={embedUrl}
              className="w-full h-48 rounded-lg border"
              loading="lazy"
              title="แผนที่"
            />
          )}
        </div>
      ) : (
        <>
          <div className="relative">
            <Input
              value={inputValue}
              onChange={handleChange}
              placeholder="วาง Google Maps ลิงก์ที่นี่"
              className="pr-8"
            />
            {inputValue && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <p className="text-xs text-neutral-400">
            ไปที่ Google Maps → ค้นหาร้าน → กด &quot;แชร์&quot; → &quot;คัดลอกลิงก์&quot;
          </p>

          {status === "loading" && (
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              กำลังตรวจสอบลิงก์...
            </div>
          )}

          {status === "success" && coords && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                ตรวจพบตำแหน่ง: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </div>
              {embedUrl && (
                <iframe
                  src={embedUrl}
                  className="w-full h-48 rounded-lg border"
                  loading="lazy"
                  title="แผนที่"
                />
              )}
            </div>
          )}

          {status === "error" && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <XCircle className="h-4 w-4" />
              ไม่สามารถดึงตำแหน่งจากลิงก์นี้ได้ กรุณาตรวจสอบอีกครั้ง
            </div>
          )}
        </>
      )}
    </div>
  );
}
