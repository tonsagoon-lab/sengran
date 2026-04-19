"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SlidersHorizontal, X, Check, ChevronsUpDown, ChevronDown } from "lucide-react";
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
interface Amenity { id: number; name_th: string; slug: string }

interface FilterBarProps {
  categories: Category[];
  provinces: Province[];
  amenities: Amenity[];
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

export function FilterBar({ categories, provinces, amenities }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Current filter values from URL
  const currentType = searchParams.get("type") ?? "";
  const currentCat = searchParams.get("cat") ?? "";
  const currentProvince = searchParams.get("province") ?? "";
  const currentSort = searchParams.get("sort") ?? "latest";
  const currentMinPrice = searchParams.get("min_price") ?? "";
  const currentMaxPrice = searchParams.get("max_price") ?? "";
  const currentAmenities = searchParams.get("amenities") ?? "";
  const currentVideo = searchParams.get("video") ?? "";
  const currentLocation = searchParams.get("location") ?? "";

  // Local input state (debounced before URL update)
  const [minPrice, setMinPrice] = useState(currentMinPrice);
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice);
  const [provinceOpen, setProvinceOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Amenity checkboxes in sheet
  const [sheetAmenities, setSheetAmenities] = useState<Set<string>>(
    () => new Set(currentAmenities ? currentAmenities.split(",") : [])
  );
  const [sheetVideo, setSheetVideo] = useState(currentVideo === "1");
  const [sheetLocation, setSheetLocation] = useState(currentLocation === "1");

  // Sync local price state when URL changes (e.g. "ล้างตัวกรอง")
  useEffect(() => { setMinPrice(currentMinPrice); }, [currentMinPrice]);
  useEffect(() => { setMaxPrice(currentMaxPrice); }, [currentMaxPrice]);
  useEffect(() => {
    setSheetAmenities(new Set(currentAmenities ? currentAmenities.split(",") : []));
    setSheetVideo(currentVideo === "1");
    setSheetLocation(currentLocation === "1");
  }, [currentAmenities, currentVideo, currentLocation]);

  const updateURL = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "" || v === "latest") next.delete(k);
        else next.set(k, v);
      }
      next.delete("page"); // reset to page 1 on any filter change
      router.push(`${pathname}?${next.toString()}`);
    },
    [searchParams, router, pathname]
  );

  // Debounce price inputs
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

  const activeFilterCount = [
    currentType,
    currentCat,
    currentProvince,
    currentMinPrice,
    currentMaxPrice,
    currentAmenities,
    currentVideo,
    currentLocation,
  ].filter(Boolean).length;

  const clearAll = () => {
    router.push(pathname);
  };

  // Apply sheet filters
  const applySheet = () => {
    updateURL({
      amenities: sheetAmenities.size > 0 ? [...sheetAmenities].join(",") : null,
      video: sheetVideo ? "1" : null,
      location: sheetLocation ? "1" : null,
    });
    setSheetOpen(false);
  };

  const selectedProvince = provinces.find((p) => p.slug === currentProvince);
  const selectedCat = categories.find((c) => c.slug === currentCat);

  return (
    <div className="sticky top-0 z-20 border-b bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4">
        {/* Desktop filter row */}
        <div className="hidden md:flex items-center gap-2 py-2 flex-wrap">
          {/* Type pills */}
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

          {/* Category select */}
          <select
            value={currentCat}
            onChange={(e) => updateURL({ cat: e.target.value || null })}
            className="h-9 rounded-lg border bg-white px-3 text-sm text-neutral-700 hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="">ทุกหมวดหมู่</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.name_th}</option>
            ))}
          </select>

          {/* Province combobox */}
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
                    <CommandItem
                      value=""
                      onSelect={() => { updateURL({ province: null }); setProvinceOpen(false); }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", !currentProvince ? "opacity-100" : "opacity-0")} />
                      ทุกจังหวัด
                    </CommandItem>
                    {provinces.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={p.name_th}
                        onSelect={() => { updateURL({ province: p.slug }); setProvinceOpen(false); }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", currentProvince === p.slug ? "opacity-100" : "opacity-0")} />
                        {p.name_th}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Price range popover */}
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
                <Input
                  type="number"
                  placeholder="ต่ำสุด"
                  value={minPrice}
                  onChange={(e) => { setMinPrice(e.target.value); applyPrice(e.target.value, maxPrice); }}
                  className="h-8 text-sm"
                />
                <span className="text-neutral-400 text-xs shrink-0">–</span>
                <Input
                  type="number"
                  placeholder="สูงสุด"
                  value={maxPrice}
                  onChange={(e) => { setMaxPrice(e.target.value); applyPrice(minPrice, e.target.value); }}
                  className="h-8 text-sm"
                />
              </div>
              {(currentMinPrice || currentMaxPrice) && (
                <button
                  onClick={() => { setMinPrice(""); setMaxPrice(""); updateURL({ min_price: null, max_price: null }); }}
                  className="text-xs text-orange-600 hover:underline"
                >
                  ล้างราคา
                </button>
              )}
            </PopoverContent>
          </Popover>

          {/* Sort */}
          <select
            value={currentSort}
            onChange={(e) => updateURL({ sort: e.target.value })}
            className="h-9 rounded-lg border bg-white px-3 text-sm text-neutral-700 hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-orange-400 ml-auto"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Advanced filters sheet trigger */}
          <AdvancedSheet
            amenities={amenities}
            sheetOpen={sheetOpen}
            setSheetOpen={setSheetOpen}
            sheetAmenities={sheetAmenities}
            setSheetAmenities={setSheetAmenities}
            sheetVideo={sheetVideo}
            setSheetVideo={setSheetVideo}
            sheetLocation={sheetLocation}
            setSheetLocation={setSheetLocation}
            onApply={applySheet}
            activeCount={[currentAmenities, currentVideo, currentLocation].filter(Boolean).length}
          />

          {activeFilterCount > 0 && (
            <button onClick={clearAll} className="flex items-center gap-1 text-sm text-orange-600 hover:underline shrink-0">
              <X className="h-3.5 w-3.5" />
              ล้างตัวกรอง
            </button>
          )}
        </div>

        {/* Mobile filter row */}
        <div className="flex md:hidden items-center gap-2 py-2">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <SlidersHorizontal className="h-4 w-4" />
                ตัวกรอง{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>กรองประกาศ</SheetTitle>
              </SheetHeader>
              <MobileFilters
                categories={categories}
                provinces={provinces}
                amenities={amenities}
                currentType={currentType}
                currentCat={currentCat}
                currentProvince={currentProvince}
                currentSort={currentSort}
                minPrice={minPrice}
                maxPrice={maxPrice}
                sheetAmenities={sheetAmenities}
                sheetVideo={sheetVideo}
                sheetLocation={sheetLocation}
                setMinPrice={setMinPrice}
                setMaxPrice={setMaxPrice}
                setSheetAmenities={setSheetAmenities}
                setSheetVideo={setSheetVideo}
                setSheetLocation={setSheetLocation}
                onUpdate={updateURL}
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
            <button onClick={clearAll} className="text-sm text-orange-600 shrink-0">
              ล้าง
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Advanced filters sheet (desktop) ────────────────────────

interface AdvancedSheetProps {
  amenities: Amenity[];
  sheetOpen: boolean;
  setSheetOpen: (v: boolean) => void;
  sheetAmenities: Set<string>;
  setSheetAmenities: (v: Set<string>) => void;
  sheetVideo: boolean;
  setSheetVideo: (v: boolean) => void;
  sheetLocation: boolean;
  setSheetLocation: (v: boolean) => void;
  onApply: () => void;
  activeCount: number;
}

function AdvancedSheet({
  amenities, sheetOpen, setSheetOpen,
  sheetAmenities, setSheetAmenities,
  sheetVideo, setSheetVideo,
  sheetLocation, setSheetLocation,
  onApply, activeCount,
}: AdvancedSheetProps) {
  const toggleAmenity = (id: string) => {
    const next = new Set(sheetAmenities);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSheetAmenities(next);
  };

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 h-9">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          กรองเพิ่ม{activeCount > 0 ? ` (${activeCount})` : ""}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>ตัวกรองเพิ่มเติม</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">สิ่งอำนวยความสะดวก</p>
            <div className="grid grid-cols-2 gap-2">
              {amenities.map((a) => (
                <div key={a.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`a-${a.id}`}
                    checked={sheetAmenities.has(String(a.id))}
                    onCheckedChange={() => toggleAmenity(String(a.id))}
                  />
                  <Label htmlFor={`a-${a.id}`} className="text-sm cursor-pointer">{a.name_th}</Label>
                </div>
              ))}
            </div>
          </div>
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
  amenities: Amenity[];
  currentType: string;
  currentCat: string;
  currentProvince: string;
  currentSort: string;
  minPrice: string;
  maxPrice: string;
  sheetAmenities: Set<string>;
  sheetVideo: boolean;
  sheetLocation: boolean;
  setMinPrice: (v: string) => void;
  setMaxPrice: (v: string) => void;
  setSheetAmenities: (v: Set<string>) => void;
  setSheetVideo: (v: boolean) => void;
  setSheetLocation: (v: boolean) => void;
  onUpdate: (updates: Record<string, string | null>) => void;
  onClose: () => void;
}

function MobileFilters({
  categories, provinces, amenities,
  currentType, currentCat, currentProvince, currentSort,
  minPrice, maxPrice,
  sheetAmenities, sheetVideo, sheetLocation,
  setMinPrice, setMaxPrice, setSheetAmenities, setSheetVideo, setSheetLocation,
  onUpdate, onClose,
}: MobileFiltersProps) {
  const toggleAmenity = (id: string) => {
    const next = new Set(sheetAmenities);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSheetAmenities(next);
  };

  const apply = () => {
    onUpdate({
      amenities: sheetAmenities.size > 0 ? [...sheetAmenities].join(",") : null,
      video: sheetVideo ? "1" : null,
      location: sheetLocation ? "1" : null,
      min_price: minPrice || null,
      max_price: maxPrice || null,
    });
    onClose();
  };

  return (
    <div className="mt-4 space-y-5 pb-6">
      {/* Type */}
      <div>
        <p className="mb-2 text-sm font-medium">ประเภท</p>
        <div className="flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onUpdate({ type: opt.value || null })}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                currentType === opt.value
                  ? "bg-orange-500 text-white border-orange-500"
                  : "border-neutral-300 text-neutral-600"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <p className="mb-2 text-sm font-medium">หมวดหมู่</p>
        <select
          value={currentCat}
          onChange={(e) => onUpdate({ cat: e.target.value || null })}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">ทุกหมวดหมู่</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.name_th}</option>
          ))}
        </select>
      </div>

      {/* Province */}
      <div>
        <p className="mb-2 text-sm font-medium">จังหวัด</p>
        <select
          value={currentProvince}
          onChange={(e) => onUpdate({ province: e.target.value || null })}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">ทุกจังหวัด</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.slug}>{p.name_th}</option>
          ))}
        </select>
      </div>

      {/* Price */}
      <div>
        <p className="mb-2 text-sm font-medium">ช่วงราคา (บาท)</p>
        <div className="flex gap-2 items-center">
          <Input type="number" placeholder="ต่ำสุด" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="text-sm" />
          <span className="text-neutral-400 shrink-0">–</span>
          <Input type="number" placeholder="สูงสุด" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="text-sm" />
        </div>
      </div>

      {/* Sort */}
      <div>
        <p className="mb-2 text-sm font-medium">เรียงโดย</p>
        <select
          value={currentSort}
          onChange={(e) => onUpdate({ sort: e.target.value })}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Amenities */}
      <div>
        <p className="mb-2 text-sm font-medium">สิ่งอำนวยความสะดวก</p>
        <div className="grid grid-cols-2 gap-2">
          {amenities.map((a) => (
            <div key={a.id} className="flex items-center gap-2">
              <Checkbox
                id={`ma-${a.id}`}
                checked={sheetAmenities.has(String(a.id))}
                onCheckedChange={() => toggleAmenity(String(a.id))}
              />
              <Label htmlFor={`ma-${a.id}`} className="text-sm cursor-pointer">{a.name_th}</Label>
            </div>
          ))}
        </div>
      </div>

      {/* Extra */}
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
