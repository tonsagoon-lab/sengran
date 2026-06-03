"use client";

import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, SlidersHorizontal, X, ChevronDown } from "lucide-react";
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
  "นครปฐม": [13.8199, 100.0624],
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

const TYPE_OPTIONS = [
  { value: "", label: "ทั้งหมด" },
  { value: "sale", label: "เซ้ง" },
  { value: "rent", label: "ให้เช่า" },
  { value: "both", label: "เซ้ง+เช่า" },
];

interface Category { id: number; name_th: string; slug: string }

interface MapLoaderProps {
  listings: MapListing[];
  categories: Category[];
}

export function MapLoader({ listings, categories }: MapLoaderProps) {
  const [typeFilter, setTypeFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (typeFilter && l.listing_type !== typeFilter) return false;
      if (catFilter && l.categories?.slug !== catFilter) return false;
      if (provinceFilter && l.provinces?.name_th !== provinceFilter) return false;
      return true;
    });
  }, [listings, typeFilter, catFilter, provinceFilter]);

  const targetCenter = useMemo<[number, number] | null>(() => {
    if (!provinceFilter) return null;
    return PROVINCE_CENTERS[provinceFilter] ?? null;
  }, [provinceFilter]);

  const activeCount = [typeFilter, catFilter, provinceFilter].filter(Boolean).length;

  return (
    <div className="relative h-full">
      {/* Map — full screen */}
      <MapView listings={filtered} targetCenter={targetCenter} />

      {/* Top-left: Back */}
      <div className="absolute top-3 left-3 z-[1000]">
        <Link
          href="/listings"
          className="flex items-center gap-1.5 h-9 rounded-full bg-white px-3 text-sm font-medium text-neutral-700 shadow-lg border border-neutral-200 hover:bg-neutral-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับ
        </Link>
      </div>

      {/* Top-right: Filter */}
      <div className="absolute top-3 right-3 z-[1000]">
        <button
          onClick={() => setPanelOpen((v) => !v)}
          className={`flex items-center gap-2 h-10 rounded-full px-4 text-sm font-bold shadow-lg border-2 transition-all ${
            activeCount > 0 || panelOpen
              ? "bg-orange-500 text-white border-orange-500"
              : "bg-white text-orange-500 border-orange-400 hover:bg-orange-50"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          กรอง{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>

        {panelOpen && (
          <div className="absolute top-12 right-0 w-64 rounded-2xl bg-white shadow-2xl border border-neutral-200 p-5 space-y-5">
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
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">จังหวัด</p>
              <div className="relative">
                <select value={provinceFilter} onChange={(e) => setProvinceFilter(e.target.value)}
                  className="w-full appearance-none rounded-xl border-2 border-neutral-200 bg-neutral-50 py-2.5 pl-3 pr-8 text-sm focus:outline-none focus:border-orange-400">
                  <option value="">ทุกจังหวัด</option>
                  {Object.keys(PROVINCE_CENTERS).sort().map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              </div>
            </div>

            {activeCount > 0 && (
              <button onClick={() => { setTypeFilter(""); setCatFilter(""); setProvinceFilter(""); }}
                className="w-full rounded-xl border-2 border-neutral-200 py-2.5 text-sm font-medium text-neutral-500 hover:text-red-500 hover:border-red-300 transition-colors">
                ล้างตัวกรอง
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
