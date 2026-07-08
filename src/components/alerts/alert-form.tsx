"use client";

import { useState, useTransition } from "react";
import { createAlertAction, updateAlertAction } from "@/lib/actions/alerts";
import type { AlertPreference } from "@/lib/db/alerts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, MapPin, Navigation, LocateFixed } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  provinces: { id: number; name_th: string }[];
  categories: { id: number; name_th: string }[];
  editing?: AlertPreference;
  onDone?: () => void;
  trigger?: React.ReactNode;
}

const TYPE_OPTIONS = [
  { value: "", label: "ทุกประเภท" },
  { value: "sale", label: "เซ้ง" },
  { value: "rent", label: "ให้เช่า" },
  { value: "both", label: "เซ้งและให้เช่า" },
];

const RADIUS_OPTIONS = [5, 10, 15, 25, 50];
const DEFAULT_RADIUS = 15;

// New alerts default to "nearby". Existing alerts open in whichever mode they were saved in.
function defaultLocMode(editing?: AlertPreference): "province" | "nearby" {
  if (!editing) return "nearby";
  return editing.center_lat != null ? "nearby" : "province";
}

export function AlertForm({ provinces, categories, editing, onDone, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Location mode
  const [locMode, setLocMode] = useState<"province" | "nearby">(defaultLocMode(editing));
  const [selectedProvinces, setSelectedProvinces] = useState<number[]>(editing?.province_ids ?? []);
  const [provinceSearch, setProvinceSearch] = useState("");
  const [centerLat, setCenterLat] = useState<number | null>(editing?.center_lat ?? null);
  const [centerLng, setCenterLng] = useState<number | null>(editing?.center_lng ?? null);
  const [radiusKm, setRadiusKm] = useState<number>(editing?.radius_km ?? DEFAULT_RADIUS);
  const [gpsLoading, setGpsLoading] = useState(false);

  function resetForm() {
    setLocMode(defaultLocMode(editing));
    setSelectedProvinces(editing?.province_ids ?? []);
    setProvinceSearch("");
    setCenterLat(editing?.center_lat ?? null);
    setCenterLng(editing?.center_lng ?? null);
    setRadiusKm(editing?.radius_km ?? DEFAULT_RADIUS);
    setError(null);
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (v) resetForm();
  }

  function toggleProvince(id: number) {
    setSelectedProvinces((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function fetchGPS() {
    if (!navigator.geolocation) {
      setError("เบราว์เซอร์ไม่รองรับ ระบบระบุตำแหน่ง กรุณาเลือกจังหวัดแทน");
      setLocMode("province");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenterLat(pos.coords.latitude);
        setCenterLng(pos.coords.longitude);
        setGpsLoading(false);
        setError(null);
      },
      () => {
        // GPS denied/failed → fall back to province picker so user can still save a rule
        setGpsLoading(false);
        setLocMode("province");
        setError("ไม่สามารถเข้าถึงตำแหน่งได้ กรุณาเลือกจังหวัดแทน");
      }
    );
  }

  const filtered = provinces.filter((p) => p.name_th.includes(provinceSearch));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    fd.set("loc_mode", locMode);
    if (locMode === "province") {
      selectedProvinces.forEach((id) => fd.append("province_ids", String(id)));
    } else {
      if (centerLat == null || centerLng == null) {
        setError("กรุณาดึงตำแหน่งก่อน");
        return;
      }
      fd.set("center_lat", String(centerLat));
      fd.set("center_lng", String(centerLng));
      fd.set("radius_km", String(radiusKm));
    }

    startTransition(async () => {
      const result = editing
        ? await updateAlertAction(editing.id, fd)
        : await createAlertAction(fd);

      if (result?.error) { setError(result.error); return; }
      setOpen(false);
      onDone?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="bg-orange-500 hover:bg-orange-600 gap-2">
            <Plus className="h-4 w-4" /> เพิ่มเงื่อนไข
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "แก้ไขเงื่อนไข" : "เพิ่มแจ้งเตือนร้านเซ้ง"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Location section */}
          <div className="space-y-2">
            <Label>ตำแหน่ง <span className="text-neutral-400 font-normal">(ไม่เลือก = ทุกจังหวัด)</span></Label>

            {/* Mode tabs */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLocMode("province")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  locMode === "province"
                    ? "bg-orange-50 border-orange-300 text-orange-700 font-medium"
                    : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
                )}
              >
                <MapPin className="h-3.5 w-3.5" />
                เลือกจังหวัด
              </button>
              <button
                type="button"
                onClick={() => setLocMode("nearby")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  locMode === "nearby"
                    ? "bg-orange-50 border-orange-300 text-orange-700 font-medium"
                    : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
                )}
              >
                <Navigation className="h-3.5 w-3.5" />
                ใกล้ฉัน
              </button>
            </div>

            {locMode === "province" ? (
              <>
                <Input
                  placeholder="ค้นหาจังหวัด..."
                  value={provinceSearch}
                  onChange={(e) => setProvinceSearch(e.target.value)}
                  className="text-sm"
                />
                <div className="max-h-40 overflow-y-auto rounded-lg border p-2 space-y-0.5">
                  {filtered.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-neutral-50 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={selectedProvinces.includes(p.id)}
                        onChange={() => toggleProvince(p.id)}
                        className="accent-orange-500"
                      />
                      {p.name_th}
                    </label>
                  ))}
                </div>
                {selectedProvinces.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedProvinces.map((id) => {
                      const p = provinces.find((x) => x.id === id);
                      return p ? (
                        <span key={id} className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-xs text-orange-700">
                          {p.name_th}
                          <button type="button" onClick={() => toggleProvince(id)} className="hover:text-orange-900">×</button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3 rounded-lg border p-4 bg-neutral-50">
                {/* Radius pills */}
                <div>
                  <p className="text-xs text-neutral-500 mb-2">รัศมี</p>
                  <div className="flex flex-wrap gap-2">
                    {RADIUS_OPTIONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRadiusKm(r)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-sm transition-colors",
                          radiusKm === r
                            ? "bg-orange-500 text-white border-orange-500 font-medium"
                            : "bg-white border-neutral-200 text-neutral-600 hover:border-orange-300"
                        )}
                      >
                        {r} กม.
                      </button>
                    ))}
                  </div>
                </div>

                {/* GPS button */}
                <button
                  type="button"
                  onClick={fetchGPS}
                  disabled={gpsLoading}
                  className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm text-orange-700 hover:bg-orange-100 transition-colors disabled:opacity-60"
                >
                  {gpsLoading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <LocateFixed className="h-4 w-4" />
                  }
                  {centerLat != null ? "อัปเดตตำแหน่งปัจจุบัน" : "ดึงตำแหน่งปัจจุบัน"}
                </button>

                {centerLat != null && (
                  <p className="text-xs text-neutral-400">
                    ตำแหน่ง: {centerLat.toFixed(5)}, {centerLng?.toFixed(5)} · รัศมี {radiusKm} กม.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>หมวดหมู่ร้าน <span className="text-neutral-400 font-normal">(ไม่เลือก = ทุกหมวด)</span></Label>
            <select
              name="category_id"
              defaultValue={editing?.category_id ?? ""}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
            >
              <option value="">ทุกหมวดหมู่</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name_th}</option>
              ))}
            </select>
          </div>

          {/* Listing type */}
          <div className="space-y-1.5">
            <Label>ประเภทประกาศ</Label>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((t) => (
                <label key={t.value} className="cursor-pointer">
                  <input type="radio" name="listing_type" value={t.value}
                    defaultChecked={(editing?.listing_type ?? "") === t.value}
                    className="sr-only peer" />
                  <span className={cn(
                    "inline-block rounded-full border px-3 py-1 text-sm transition-colors",
                    "peer-checked:bg-orange-500 peer-checked:text-white peer-checked:border-orange-500",
                    "hover:border-orange-300"
                  )}>
                    {t.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div className="space-y-1.5">
            <Label>ช่วงราคา <span className="text-neutral-400 font-normal">(ไม่กรอก = ไม่จำกัด)</span></Label>
            <div className="flex items-center gap-2">
              <Input name="min_price" type="number" placeholder="ราคาต่ำสุด" min={0}
                defaultValue={editing?.min_price ?? ""} className="text-sm" />
              <span className="text-neutral-400 shrink-0">–</span>
              <Input name="max_price" type="number" placeholder="ราคาสูงสุด" min={0}
                defaultValue={editing?.max_price ?? ""} className="text-sm" />
              <span className="text-neutral-400 shrink-0 text-sm">บาท</span>
            </div>
          </div>

          <Button type="submit" disabled={pending} className="w-full bg-orange-500 hover:bg-orange-600">
            {pending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {editing ? "บันทึก" : "เพิ่มเงื่อนไข"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
