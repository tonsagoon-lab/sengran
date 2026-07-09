"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  Loader2,
  LocateFixed,
  MapPin,
  X,
} from "lucide-react";
import type { MapListing } from "@/lib/db/listings";

// Province center coordinates (lat, lng)
const PROVINCE_CENTERS: Record<string, [number, number]> = {
  "กรุงเทพมหานคร": [13.7563, 100.5018],
  "เชียงใหม่": [18.7883, 98.9853],
  "เชียงราย": [19.9105, 99.8406],
  "ภูเก็ต": [7.8804, 98.3923],
  "ขอนแก่น": [16.4322, 102.8236],
  "นครราชสีมา": [14.9799, 102.0978],
  "อุดรธานี": [17.4138, 102.7872],
  "สุราษฎร์ธานี": [9.1382, 99.3217],
  "หาดใหญ่": [7.0061, 100.4747],
  "สงขลา": [7.1756, 100.6136],
  "นนทบุรี": [13.8621, 100.5144],
  "ปทุมธานี": [14.0208, 100.5250],
  "สมุทรปราการ": [13.5990, 100.5998],
  "นครปฐม": [13.8199, 100.0624],
  "ระยอง": [12.6814, 101.2816],
  "ชลบุรี": [13.3611, 100.9847],
  "พัทยา": [12.9236, 100.8825],
  "เพชรบุรี": [13.1119, 99.9399],
  "ประจวบคีรีขันธ์": [11.8126, 99.7957],
  "ลำปาง": [18.2888, 99.4927],
  "ลำพูน": [18.5744, 99.0087],
  "แม่ฮ่องสอน": [19.3020, 97.9654],
  "พะเยา": [19.1664, 99.9019],
  "น่าน": [18.7756, 100.7930],
  "แพร่": [18.1446, 100.1400],
  "อุตรดิตถ์": [17.6200, 100.0993],
  "สุโขทัย": [17.0072, 99.8231],
  "พิษณุโลก": [16.8211, 100.2659],
  "กำแพงเพชร": [16.4827, 99.5226],
  "พิจิตร": [16.4436, 100.3487],
  "นครสวรรค์": [15.7030, 100.1378],
  "อุทัยธานี": [15.3835, 100.0248],
  "ชัยนาท": [15.1852, 100.1253],
  "สิงห์บุรี": [14.8897, 100.3968],
  "อ่างทอง": [14.5896, 100.4551],
  "พระนครศรีอยุธยา": [14.3695, 100.5877],
  "สระบุรี": [14.5289, 100.9101],
  "ลพบุรี": [14.7995, 100.6534],
  "นครนายก": [14.2069, 101.2131],
  "ฉะเชิงเทรา": [13.6904, 101.0779],
  "ปราจีนบุรี": [14.0519, 101.3701],
  "สระแก้ว": [13.8236, 102.0641],
  "จันทบุรี": [12.6113, 102.1034],
  "ตราด": [12.2428, 102.5177],
  "นครพนม": [17.3925, 104.7697],
  "มุกดาหาร": [16.5432, 104.7236],
  "อำนาจเจริญ": [15.8656, 104.6257],
  "ยโสธร": [15.7928, 104.1453],
  "ร้อยเอ็ด": [16.0538, 103.6520],
  "มหาสารคาม": [16.1851, 103.3009],
  "กาฬสินธุ์": [16.4314, 103.5059],
  "สกลนคร": [17.1554, 104.1348],
  "หนองคาย": [17.8782, 102.7420],
  "บึงกาฬ": [18.3609, 103.6521],
  "หนองบัวลำภู": [17.2042, 102.4412],
  "เลย": [17.4861, 101.7223],
  "ชัยภูมิ": [15.8068, 102.0317],
  "บุรีรัมย์": [14.9951, 103.1116],
  "สุรินทร์": [14.8820, 103.4937],
  "ศรีสะเกษ": [15.1185, 104.3220],
  "อุบลราชธานี": [15.2287, 104.8561],
  "กาญจนบุรี": [14.0023, 99.5328],
  "ราชบุรี": [13.5361, 99.8173],
  "สมุทรสาคร": [13.5475, 100.2747],
  "สมุทรสงคราม": [13.4098, 100.0022],
  "สุพรรณบุรี": [14.4744, 100.1177],
  "ชุมพร": [10.4930, 99.1800],
  "ระนอง": [9.9529, 98.6084],
  "พังงา": [8.4509, 98.5255],
  "กระบี่": [8.0863, 98.9063],
  "ตรัง": [7.5591, 99.6114],
  "พัทลุง": [7.6167, 100.0746],
  "สตูล": [6.6238, 100.0674],
  "ปัตตานี": [6.8690, 101.2499],
  "ยะลา": [6.5415, 101.2804],
  "นราธิวาส": [6.4255, 101.8253],
  "นครศรีธรรมราช": [8.4313, 99.9637],
};

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

type MapMode =
  | { type: "nearby"; lat: number; lng: number }
  | { type: "province"; name: string };

const MODE_KEY = "map_default_mode_web";

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "ทั้งหมด" },
  { value: "sale", label: "เซ้ง" },
  { value: "rent", label: "ให้เช่า" },
  { value: "both", label: "เซ้ง+เช่า" },
];

const TIME_OPTIONS: { value: string; label: string; months: number | null }[] = [
  { value: "", label: "ทั้งหมด", months: null },
  { value: "12m", label: "12 เดือน", months: 12 },
  { value: "6m", label: "6 เดือน", months: 6 },
  { value: "3m", label: "3 เดือน", months: 3 },
  { value: "1m", label: "1 เดือน", months: 1 },
];

interface Category {
  id: number;
  name_th: string;
  slug: string;
}

interface MapLoaderProps {
  listings: MapListing[];
  categories: Category[];
}

export function MapLoader({ listings, categories }: MapLoaderProps) {
  const [typeFilter, setTypeFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState("");

  const [mode, setMode] = useState<MapMode | null>(null);
  const [modeReady, setModeReady] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const [typeSheetOpen, setTypeSheetOpen] = useState(false);
  const [catSheetOpen, setCatSheetOpen] = useState(false);
  const [timeSheetOpen, setTimeSheetOpen] = useState(false);
  const [provinceSheetOpen, setProvinceSheetOpen] = useState(false);

  // Restore mode from localStorage on first mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(MODE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as MapMode;
        if (saved?.type === "nearby" && typeof saved.lat === "number") {
          setMode(saved);
        } else if (saved?.type === "province" && typeof saved.name === "string") {
          setMode(saved);
        } else {
          setShowIntro(true);
        }
      } else {
        setShowIntro(true);
      }
    } catch {
      setShowIntro(true);
    } finally {
      setModeReady(true);
    }
  }, []);

  const saveMode = useCallback((m: MapMode) => {
    setMode(m);
    try {
      localStorage.setItem(MODE_KEY, JSON.stringify(m));
    } catch {}
  }, []);

  const pickNearby = useCallback(() => {
    if (!navigator.geolocation) {
      setProvinceSheetOpen(true);
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        saveMode({ type: "nearby", lat: pos.coords.latitude, lng: pos.coords.longitude });
        setShowIntro(false);
        setGpsLoading(false);
      },
      () => {
        setGpsLoading(false);
        setProvinceSheetOpen(true);
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  }, [saveMode]);

  const pickProvince = useCallback(
    (name: string) => {
      saveMode({ type: "province", name });
      setShowIntro(false);
      setProvinceSheetOpen(false);
    },
    [saveMode]
  );

  const filtered = useMemo(() => {
    const cutoff = (() => {
      const entry = TIME_OPTIONS.find((t) => t.value === timeFilter);
      return entry?.months != null ? Date.now() - entry.months * 30 * 24 * 3600 * 1000 : null;
    })();
    const provinceName = mode?.type === "province" ? mode.name : "";
    return listings.filter((l) => {
      if (typeFilter && l.listing_type !== typeFilter) return false;
      if (catFilter && l.categories?.slug !== catFilter) return false;
      if (provinceName && l.provinces?.name_th !== provinceName) return false;
      if (cutoff != null) {
        if (!l.published_at) return false;
        if (Date.parse(l.published_at) < cutoff) return false;
      }
      return true;
    });
  }, [listings, typeFilter, catFilter, timeFilter, mode]);

  const userLocation: [number, number] | null =
    mode?.type === "nearby" ? [mode.lat, mode.lng] : null;
  const targetCenter: [number, number] | null =
    mode?.type === "province" ? PROVINCE_CENTERS[mode.name] ?? null : null;

  const modeLabel =
    mode?.type === "nearby"
      ? "ใกล้ตัวคุณ"
      : mode?.type === "province"
      ? mode.name
      : "เลือกตำแหน่ง";

  const typeLabel = TYPE_OPTIONS.find((t) => t.value === typeFilter)?.label ?? "ทั้งหมด";
  const catLabel =
    catFilter === "" ? "ทุกหมวด" : categories.find((c) => c.slug === catFilter)?.name_th ?? "ทุกหมวด";
  const timeLabel = TIME_OPTIONS.find((t) => t.value === timeFilter)?.label ?? "ทั้งหมด";

  const typeActive = typeFilter !== "";
  const catActive = catFilter !== "";
  const timeActive = timeFilter !== "";

  return (
    <div className="relative h-full">
      {/* Map — clipped to rounded container on desktop, edge-to-edge on mobile */}
      <div className="absolute inset-0 sm:rounded-2xl overflow-hidden">
        <MapView
          listings={filtered}
          userLocation={userLocation}
          targetCenter={targetCenter}
          autoLocate={modeReady && !mode}
        />
      </div>

      {/* Top row: Back + Mode pill */}
      <div className="pointer-events-none absolute top-3 left-3 right-3 z-[1000] flex items-center gap-2">
        <Link
          href="/listings"
          className="pointer-events-auto flex h-10 items-center gap-1.5 rounded-full bg-white px-3.5 text-sm font-semibold text-neutral-700 shadow-lg border border-neutral-200 hover:bg-neutral-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">กลับ</span>
        </Link>

        <button
          onClick={() => setShowIntro(true)}
          className="pointer-events-auto flex flex-1 sm:flex-none h-10 items-center justify-center gap-1.5 rounded-full bg-orange-500 px-4 text-sm font-bold text-white shadow-lg shadow-orange-500/40 hover:bg-orange-600 transition-colors max-w-[240px]"
        >
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="truncate">{modeLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        </button>
      </div>

      {/* Filter chip row */}
      <div className="pointer-events-none absolute top-16 left-0 right-0 z-[999]">
        <div className="pointer-events-auto flex gap-2 overflow-x-auto no-scrollbar px-3 py-2">
          <FilterChip
            label={`ประเภท: ${typeLabel}`}
            active={typeActive}
            onClick={() => setTypeSheetOpen(true)}
          />
          <FilterChip
            label={`หมวด: ${catLabel}`}
            active={catActive}
            onClick={() => setCatSheetOpen(true)}
          />
          <FilterChip
            label={`เวลา: ${timeLabel}`}
            active={timeActive}
            onClick={() => setTimeSheetOpen(true)}
          />
          {(typeActive || catActive || timeActive) && (
            <button
              onClick={() => {
                setTypeFilter("");
                setCatFilter("");
                setTimeFilter("");
              }}
              className="shrink-0 flex items-center gap-1 h-9 rounded-full bg-white px-3 text-xs font-semibold text-neutral-500 border border-neutral-200 shadow hover:text-red-500 hover:border-red-200 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              ล้าง
            </button>
          )}
        </div>
      </div>

      {/* Locate-me FAB (bottom-right, above zoom controls) */}
      {mode?.type !== "province" && (
        <button
          onClick={pickNearby}
          disabled={gpsLoading}
          className="absolute bottom-24 right-3 z-[1000] flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-60 transition-colors"
          aria-label="ตำแหน่งของฉัน"
        >
          {gpsLoading ? (
            <Loader2 className="h-5 w-5 text-neutral-500 animate-spin" />
          ) : (
            <LocateFixed className="h-5 w-5 text-neutral-700" />
          )}
        </button>
      )}

      {/* Intro modal — nearby or province */}
      {modeReady && showIntro && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/55 p-6">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-1 text-center text-4xl">📍</div>
            <h2 className="text-center text-lg font-bold text-neutral-900">
              ค้นหาร้านในแผนที่
            </h2>
            <p className="mb-5 mt-1 text-center text-sm text-neutral-500">
              เลือกดูร้านใกล้ตัว หรือดูตามจังหวัดที่สนใจ
            </p>
            <button
              onClick={pickNearby}
              disabled={gpsLoading}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-70 transition-colors"
            >
              {gpsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LocateFixed className="h-4 w-4" />
              )}
              ใกล้ตัวฉัน
            </button>
            <button
              onClick={() => setProvinceSheetOpen(true)}
              disabled={gpsLoading}
              className="mb-1 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-orange-500 bg-white py-3 text-sm font-bold text-orange-500 hover:bg-orange-50 transition-colors"
            >
              <MapPin className="h-4 w-4" />
              เลือกจังหวัด
            </button>
            {mode && (
              <button
                onClick={() => setShowIntro(false)}
                className="mt-2 w-full py-2 text-center text-xs text-neutral-400 hover:text-neutral-600"
              >
                ยกเลิก
              </button>
            )}
          </div>
        </div>
      )}

      {/* Type sheet */}
      <BottomSheet
        open={typeSheetOpen}
        title="เลือกประเภท"
        onClose={() => setTypeSheetOpen(false)}
      >
        {TYPE_OPTIONS.map((opt) => (
          <SheetRow
            key={opt.value}
            label={opt.label}
            active={typeFilter === opt.value}
            onClick={() => {
              setTypeFilter(opt.value);
              setTypeSheetOpen(false);
            }}
          />
        ))}
      </BottomSheet>

      {/* Category sheet */}
      <BottomSheet
        open={catSheetOpen}
        title="เลือกหมวดหมู่"
        onClose={() => setCatSheetOpen(false)}
      >
        <SheetRow
          label="ทุกหมวด"
          active={catFilter === ""}
          onClick={() => {
            setCatFilter("");
            setCatSheetOpen(false);
          }}
        />
        {categories.map((c) => (
          <SheetRow
            key={c.id}
            label={c.name_th}
            active={catFilter === c.slug}
            onClick={() => {
              setCatFilter(c.slug);
              setCatSheetOpen(false);
            }}
          />
        ))}
      </BottomSheet>

      {/* Time sheet */}
      <BottomSheet
        open={timeSheetOpen}
        title="ช่วงเวลาที่ประกาศ"
        onClose={() => setTimeSheetOpen(false)}
      >
        {TIME_OPTIONS.map((opt) => (
          <SheetRow
            key={opt.value}
            label={opt.label}
            active={timeFilter === opt.value}
            onClick={() => {
              setTimeFilter(opt.value);
              setTimeSheetOpen(false);
            }}
          />
        ))}
      </BottomSheet>

      {/* Province sheet */}
      <BottomSheet
        open={provinceSheetOpen}
        title="เลือกจังหวัด"
        onClose={() => setProvinceSheetOpen(false)}
      >
        {Object.keys(PROVINCE_CENTERS)
          .sort((a, b) => a.localeCompare(b, "th"))
          .map((name) => (
            <SheetRow
              key={name}
              label={name}
              active={mode?.type === "province" && mode.name === name}
              onClick={() => pickProvince(name)}
            />
          ))}
      </BottomSheet>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 flex items-center gap-1 h-9 rounded-full border px-3.5 text-xs font-semibold shadow transition-colors ${
        active
          ? "bg-orange-500 border-orange-500 text-white"
          : "bg-white border-neutral-200 text-neutral-700 hover:border-orange-300"
      }`}
    >
      <span className="max-w-[140px] truncate">{label}</span>
      <ChevronDown className={`h-3.5 w-3.5 ${active ? "text-white" : "text-neutral-400"}`} />
    </button>
  );
}

function BottomSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[1100] flex items-end justify-center bg-slate-900/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[75vh] flex flex-col animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <h3 className="text-base font-bold text-neutral-900">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
            aria-label="ปิด"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto pb-4">{children}</div>
      </div>
    </div>
  );
}

function SheetRow({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between px-5 py-3.5 text-left text-[15px] border-b border-neutral-50 last:border-b-0 hover:bg-neutral-50 transition-colors ${
        active ? "text-orange-600 font-semibold" : "text-neutral-700"
      }`}
    >
      <span>{label}</span>
      {active && <span className="text-orange-500 text-lg">✓</span>}
    </button>
  );
}
