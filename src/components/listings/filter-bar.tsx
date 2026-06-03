"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SlidersHorizontal, X, Check, ChevronsUpDown, ChevronDown, Map } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface Category { id: number; name_th: string; slug: string }
interface Province { id: number; name_th: string; slug: string; region: string }

interface FilterBarProps {
  categories: Category[];
  provinces: Province[];
  amenities: unknown[];
  lockedCategory?: string;
  lockedProvince?: string;
}

const TYPE_OPTIONS = [
  { value: "", label: "ทั้งหมด" },
  { value: "sale", label: "เซ้ง" },
  { value: "rent", label: "ให้เช่า" },
  { value: "both", label: "ทั้งคู่" },
];

const SORT_OPTIONS = [
  { value: "latest", label: "ล่าสุด" },
  { value: "price_asc", label: "ราคาต่ำ→สูง" },
  { value: "price_desc", label: "ราคาสูง→ต่ำ" },
  { value: "views", label: "ดูมากที่สุด" },
];

const RADIUS_OPTIONS = [5, 10, 15, 20, 30, 50, 100];

export function FilterBar({ categories, provinces, lockedCategory, lockedProvince }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentType = searchParams.get("type") ?? "";
  const currentCat = lockedCategory ?? (searchParams.get("cat") ?? "");
  const currentProvince = lockedProvince ?? (searchParams.get("province") ?? "");
  const currentSort = searchParams.get("sort") ?? "latest";
  const currentMinPrice = searchParams.get("min_price") ?? "";
  const currentMaxPrice = searchParams.get("max_price") ?? "";
  const currentVideo = searchParams.get("video") ?? "";
  const currentLocation = searchParams.get("location") ?? "";
  const currentLat = searchParams.get("lat") ?? "";
  const currentLng = searchParams.get("lng") ?? "";
  const currentRadius = searchParams.get("radius") ?? "";

  const [minPrice, setMinPrice] = useState(currentMinPrice);
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice);
  const [provinceOpen, setProvinceOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetVideo, setSheetVideo] = useState(currentVideo === "1");
  const [sheetLocation, setSheetLocation] = useState(currentLocation === "1");
  const [sheetRadius, setSheetRadius] = useState(currentRadius);

  useEffect(() => { setMinPrice(currentMinPrice); }, [currentMinPrice]);
  useEffect(() => { setMaxPrice(currentMaxPrice); }, [currentMaxPrice]);
  useEffect(() => {
    setSheetVideo(currentVideo === "1");
    setSheetLocation(currentLocation === "1");
    setSheetRadius(currentRadius);
  }, [currentVideo, currentLocation, currentRadius]);

  const updateURL = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "" || v === "latest") next.delete(k);
        else next.set(k, v);
      }
      next.delete("page");
      router.push(`${pathname}?${next.toString()}`);
    },
    [searchParams, router, pathname]
  );

  const priceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applyPrice = useCallback(
    (min: string, max: string) => {
      if (priceTimer.current) clearTimeout(priceTimer.current);
      priceTimer.current = setTimeout(() => {
        updateURL({ min_price: min || null, max_price: max || null });
      }, 400);
    },
    [updateURL]
  );

  const hasGPS = !!(currentLat && currentLng);

  const activeFilterCount = [
    currentType, currentCat, currentProvince,
    currentMinPrice, currentMaxPrice,
    currentVideo, currentLocation, currentRadius,
  ].filter(Boolean).length;

  const clearAll = () => router.push(pathname);

  const applySheet = () => {
    updateURL({
      video: sheetVideo ? "1" : null,
      location: sheetLocation ? "1" : null,
      radius: hasGPS && sheetRadius ? sheetRadius : null,
    });
    setSheetOpen(false);
  };

  const handleCategoryChange = useCallback((slug: string) => {
    if (lockedCategory) {
      // on a locked category page → navigate to that category page (or /listings if cleared)
      if (!slug) router.push("/listings");
      else router.push(`/property-type/${slug}`);
    } else {
      updateURL({ cat: slug || null });
    }
  }, [lockedCategory, router, updateURL]);

  const selectedProvince = provinces.find((p) => p.slug === currentProvince);

  return (
    <div className="sticky top-0 z-20 border-b bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4">
        {/* Desktop filter row */}
        <div className="hidden md:flex items-center gap-2 py-2 flex-wrap">
          <div className="flex items-center rounded-lg border overflow-hidden shrink-0">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateURL({ type: opt.value || null })}
                className={cn(
                  "px-3 py-1.5 text-sm transition-colors",
                  currentType === opt.value
                    ? "bg-orange-500 text-white font-medium"
                    : "text-neutral-600 hover:bg-neutral-50"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <select
            value={currentCat}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="h-9 rounded-lg border bg-white px-3 text-sm text-neutral-700 hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="">ทุกหมวดหมู่</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.name_th}</option>
            ))}
          </select>

          <Popover open={provinceOpen} onOpenChange={setProvinceOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 gap-1 text-sm font-normal">
                {selectedProvince?.name_th ?? "ทุกจังหวัด"}
                <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-0" align="start">
              <Command>
                <CommandInput placeholder="ค้นหาจังหวัด..." />
                <CommandList className="max-h-56">
                  <CommandEmpty>ไม่พบจังหวัด</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="" onSelect={() => { updateURL({ province: null }); setProvinceOpen(false); }}>
                      <Check className={cn("mr-2 h-4 w-4", !currentProvince ? "opacity-100" : "opacity-0")} />
                      ทุกจังหวัด
                    </CommandItem>
                    {provinces.map((p) => (
                      <CommandItem key={p.id} value={p.name_th} onSelect={() => { updateURL({ province: p.slug }); setProvinceOpen(false); }}>
                        <Check className={cn("mr-2 h-4 w-4", currentProvince === p.slug ? "opacity-100" : "opacity-0")} />
                        {p.name_th}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Popover open={priceOpen} onOpenChange={setPriceOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 gap-1 text-sm font-normal">
                {currentMinPrice || currentMaxPrice
                  ? `฿${currentMinPrice || "0"} – ฿${currentMaxPrice || "∞"}`
                  : "ราคา"}
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3 space-y-2" align="start">
              <p className="text-xs font-medium text-neutral-500">ช่วงราคา (บาท)</p>
              <div className="flex gap-2 items-center">
                <Input type="number" placeholder="ต่ำสุด" value={minPrice}
                  onChange={(e) => { setMinPrice(e.target.value); applyPrice(e.target.value, maxPrice); }}
                  className="h-8 text-sm" />
                <span className="text-neutral-400 text-xs shrink-0">–</span>
                <Input type="number" placeholder="สูงสุด" value={maxPrice}
                  onChange={(e) => { setMaxPrice(e.target.value); applyPrice(minPrice, e.target.value); }}
                  className="h-8 text-sm" />
              </div>
              {(currentMinPrice || currentMaxPrice) && (
                <button onClick={() => { setMinPrice(""); setMaxPrice(""); updateURL({ min_price: null, max_price: null }); }}
                  className="text-xs text-orange-600 hover:underline">ล้างราคา</button>
              )}
            </PopoverContent>
          </Popover>

          <select
            value={currentSort}
            onChange={(e) => updateURL({ sort: e.target.value })}
            className="h-9 rounded-lg border bg-white px-3 text-sm text-neutral-700 hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-orange-400 ml-auto"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <AdvancedSheet
            hasGPS={hasGPS}
            sheetOpen={sheetOpen}
            setSheetOpen={setSheetOpen}
            sheetVideo={sheetVideo}
            setSheetVideo={setSheetVideo}
            sheetLocation={sheetLocation}
            setSheetLocation={setSheetLocation}
            sheetRadius={sheetRadius}
            setSheetRadius={setSheetRadius}
            onApply={applySheet}
            activeCount={[currentVideo, currentLocation, currentRadius].filter(Boolean).length}
          />

          {activeFilterCount > 0 && (
            <button onClick={clearAll} className="flex items-center gap-1 text-sm text-orange-600 hover:underline shrink-0">
              <X className="h-3.5 w-3.5" /> ล้างตัวกรอง
            </button>
          )}

          <Link
            href="/map"
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-orange-300 hover:text-orange-600 transition-colors shrink-0"
          >
            <Map className="h-4 w-4" />
            แผนที่
          </Link>
        </div>

        {/* Mobile filter row */}
        <div className="flex md:hidden flex-col gap-2 py-2">
          {/* Type tabs on mobile */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateURL({ type: opt.value || null })}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-sm transition-colors",
                  currentType === opt.value
                    ? "bg-orange-500 text-white border-orange-500 font-medium"
                    : "border-neutral-300 text-neutral-600 bg-white"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <SlidersHorizontal className="h-4 w-4" />
                ตัวกรอง{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
              <SheetHeader><SheetTitle>กรองประกาศ</SheetTitle></SheetHeader>
              <MobileFilters
                categories={categories}
                provinces={provinces}
                hasGPS={hasGPS}
                currentType={currentType}
                currentCat={currentCat}
                currentProvince={currentProvince}
                currentSort={currentSort}
                minPrice={minPrice}
                maxPrice={maxPrice}
                sheetVideo={sheetVideo}
                sheetLocation={sheetLocation}
                sheetRadius={sheetRadius}
                setMinPrice={setMinPrice}
                setMaxPrice={setMaxPrice}
                setSheetVideo={setSheetVideo}
                setSheetLocation={setSheetLocation}
                setSheetRadius={setSheetRadius}
                onUpdate={updateURL}
                onCategoryChange={handleCategoryChange}
                onClose={() => setSheetOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <select
            value={currentSort}
            onChange={(e) => updateURL({ sort: e.target.value })}
            className="ml-auto h-9 rounded-lg border bg-white px-2 text-sm text-neutral-700 focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {activeFilterCount > 0 && (
            <button onClick={clearAll} className="text-sm text-orange-600 shrink-0">ล้าง</button>
          )}
          <Link href="/map" className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm font-medium text-neutral-700 hover:border-orange-300 hover:text-orange-600 transition-colors shrink-0">
            <Map className="h-4 w-4" />
          </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Advanced filters sheet (desktop) ────────────────────────

interface AdvancedSheetProps {
  hasGPS: boolean;
  sheetOpen: boolean;
  setSheetOpen: (v: boolean) => void;
  sheetVideo: boolean;
  setSheetVideo: (v: boolean) => void;
  sheetLocation: boolean;
  setSheetLocation: (v: boolean) => void;
  sheetRadius: string;
  setSheetRadius: (v: string) => void;
  onApply: () => void;
  activeCount: number;
}

function AdvancedSheet({
  hasGPS, sheetOpen, setSheetOpen,
  sheetVideo, setSheetVideo,
  sheetLocation, setSheetLocation,
  sheetRadius, setSheetRadius,
  onApply, activeCount,
}: AdvancedSheetProps) {
  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 h-9">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          กรองเพิ่ม{activeCount > 0 ? ` (${activeCount})` : ""}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 overflow-y-auto">
        <SheetHeader><SheetTitle>ตัวกรองเพิ่มเติม</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-5">
          {/* Radius */}
          <div>
            <p className="mb-2 text-sm font-medium">ระยะทาง</p>
            {hasGPS ? (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSheetRadius("")}
                  className={cn("rounded-full border px-3 py-1 text-sm",
                    !sheetRadius ? "bg-orange-500 text-white border-orange-500" : "border-neutral-300 text-neutral-600"
                  )}
                >
                  ทั้งหมด
                </button>
                {RADIUS_OPTIONS.map((km) => (
                  <button
                    key={km}
                    onClick={() => setSheetRadius(String(km))}
                    className={cn("rounded-full border px-3 py-1 text-sm",
                      sheetRadius === String(km) ? "bg-orange-500 text-white border-orange-500" : "border-neutral-300 text-neutral-600"
                    )}
                  >
                    {km} กม.
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400">ค้นหาโดยใช้ GPS ก่อนเพื่อใช้ตัวกรองนี้</p>
            )}
          </div>

          {/* Extra */}
          <div className="space-y-2">
            <p className="text-sm font-medium">อื่นๆ</p>
            <div className="flex items-center gap-2">
              <Checkbox id="has-video" checked={sheetVideo} onCheckedChange={(c) => setSheetVideo(!!c)} />
              <Label htmlFor="has-video" className="text-sm cursor-pointer">มีวิดีโอ</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="has-location" checked={sheetLocation} onCheckedChange={(c) => setSheetLocation(!!c)} />
              <Label htmlFor="has-location" className="text-sm cursor-pointer">ระบุพิกัดแผนที่</Label>
            </div>
          </div>

          <Button onClick={onApply} className="w-full bg-orange-500 hover:bg-orange-600">
            ใช้ตัวกรอง
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Mobile full-sheet filters ────────────────────────────────

interface MobileFiltersProps {
  categories: Category[];
  provinces: Province[];
  hasGPS: boolean;
  currentType: string;
  currentCat: string;
  currentProvince: string;
  currentSort: string;
  minPrice: string;
  maxPrice: string;
  sheetVideo: boolean;
  sheetLocation: boolean;
  sheetRadius: string;
  setMinPrice: (v: string) => void;
  setMaxPrice: (v: string) => void;
  setSheetVideo: (v: boolean) => void;
  setSheetLocation: (v: boolean) => void;
  setSheetRadius: (v: string) => void;
  onUpdate: (updates: Record<string, string | null>) => void;
  onCategoryChange: (slug: string) => void;
  onClose: () => void;
}

function MobileFilters({
  categories, provinces, hasGPS,
  currentType, currentCat, currentProvince, currentSort,
  minPrice, maxPrice,
  sheetVideo, sheetLocation, sheetRadius,
  setMinPrice, setMaxPrice, setSheetVideo, setSheetLocation, setSheetRadius,
  onUpdate, onCategoryChange, onClose,
}: MobileFiltersProps) {
  const apply = () => {
    onUpdate({
      video: sheetVideo ? "1" : null,
      location: sheetLocation ? "1" : null,
      radius: hasGPS && sheetRadius ? sheetRadius : null,
      min_price: minPrice || null,
      max_price: maxPrice || null,
    });
    onClose();
  };

  return (
    <div className="mt-4 space-y-5 pb-6">
      <div>
        <p className="mb-2 text-sm font-medium">ประเภท</p>
        <div className="flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => onUpdate({ type: opt.value || null })}
              className={cn("rounded-full border px-3 py-1 text-sm",
                currentType === opt.value ? "bg-orange-500 text-white border-orange-500" : "border-neutral-300 text-neutral-600"
              )}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">หมวดหมู่</p>
        <select value={currentCat} onChange={(e) => { onCategoryChange(e.target.value); onClose(); }}
          className="w-full rounded-lg border px-3 py-2 text-sm">
          <option value="">ทุกหมวดหมู่</option>
          {categories.map((c) => <option key={c.id} value={c.slug}>{c.name_th}</option>)}
        </select>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">จังหวัด</p>
        <select value={currentProvince} onChange={(e) => onUpdate({ province: e.target.value || null })}
          className="w-full rounded-lg border px-3 py-2 text-sm">
          <option value="">ทุกจังหวัด</option>
          {provinces.map((p) => <option key={p.id} value={p.slug}>{p.name_th}</option>)}
        </select>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">ช่วงราคา (บาท)</p>
        <div className="flex gap-2 items-center">
          <Input type="number" placeholder="ต่ำสุด" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="text-sm" />
          <span className="text-neutral-400 shrink-0">–</span>
          <Input type="number" placeholder="สูงสุด" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="text-sm" />
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">ระยะทาง</p>
        {hasGPS ? (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSheetRadius("")}
              className={cn("rounded-full border px-3 py-1 text-sm",
                !sheetRadius ? "bg-orange-500 text-white border-orange-500" : "border-neutral-300 text-neutral-600"
              )}>
              ทั้งหมด
            </button>
            {RADIUS_OPTIONS.map((km) => (
              <button key={km} onClick={() => setSheetRadius(String(km))}
                className={cn("rounded-full border px-3 py-1 text-sm",
                  sheetRadius === String(km) ? "bg-orange-500 text-white border-orange-500" : "border-neutral-300 text-neutral-600"
                )}>
                {km} กม.
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-400">ค้นหาโดยใช้ GPS ก่อนเพื่อใช้ตัวกรองนี้</p>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">เรียงโดย</p>
        <select value={currentSort} onChange={(e) => onUpdate({ sort: e.target.value })}
          className="w-full rounded-lg border px-3 py-2 text-sm">
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox id="m-video" checked={sheetVideo} onCheckedChange={(c) => setSheetVideo(!!c)} />
          <Label htmlFor="m-video" className="text-sm cursor-pointer">มีวิดีโอ</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="m-location" checked={sheetLocation} onCheckedChange={(c) => setSheetLocation(!!c)} />
          <Label htmlFor="m-location" className="text-sm cursor-pointer">ระบุพิกัดแผนที่</Label>
        </div>
      </div>

      <Button onClick={apply} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
        ดูผลการค้นหา
      </Button>
    </div>
  );
}
