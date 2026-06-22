"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SlidersHorizontal, X, Check, ChevronsUpDown, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { EquipmentCategory } from "@/lib/db/equipment";

interface Province { id: number; name_th: string; slug: string; region: string }

interface EquipmentFilterBarProps {
  categories: EquipmentCategory[];
  provinces: Province[];
  lockedCategory?: string;
}

const CONDITION_OPTIONS = [
  { value: "",          label: "ทุกสภาพ" },
  { value: "excellent", label: "ดีมาก" },
  { value: "good",      label: "ดี" },
  { value: "fair",      label: "พอใช้" },
];

const SORT_OPTIONS = [
  { value: "latest",     label: "ล่าสุด" },
  { value: "price_asc",  label: "ราคาต่ำ→สูง" },
  { value: "price_desc", label: "ราคาสูง→ต่ำ" },
  { value: "views",      label: "ดูมากที่สุด" },
];

export function EquipmentFilterBar({ categories, provinces, lockedCategory }: EquipmentFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentCat = lockedCategory ?? (searchParams.get("cat") ?? "");
  const currentProvince = searchParams.get("province") ?? "";
  const currentCondition = searchParams.get("condition") ?? "";
  const currentSort = searchParams.get("sort") ?? "latest";
  const currentMinPrice = searchParams.get("min_price") ?? "";
  const currentMaxPrice = searchParams.get("max_price") ?? "";

  const [minPrice, setMinPrice] = useState(currentMinPrice);
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice);
  const [provinceOpen, setProvinceOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => { setMinPrice(currentMinPrice); }, [currentMinPrice]);
  useEffect(() => { setMaxPrice(currentMaxPrice); }, [currentMaxPrice]);

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

  const activeFilterCount = [
    currentCat, currentProvince, currentCondition,
    currentMinPrice, currentMaxPrice,
  ].filter(Boolean).length;

  const clearAll = () => router.push(pathname);

  const selectedProvince = provinces.find((p) => p.slug === currentProvince);

  return (
    <div className="sticky top-0 z-20 border-b bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4">
        {/* Desktop filter row */}
        <div className="hidden md:flex items-center gap-2 py-2 flex-wrap">
          {/* Condition pills */}
          <div className="flex items-center rounded-lg border overflow-hidden shrink-0">
            {CONDITION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateURL({ condition: opt.value || null })}
                className={cn(
                  "px-3 py-1.5 text-sm transition-colors",
                  currentCondition === opt.value
                    ? "bg-orange-500 text-white font-medium"
                    : "text-neutral-600 hover:bg-neutral-50"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Category select */}
          {!lockedCategory && (
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
          )}

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

          {/* Price range */}
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

          {activeFilterCount > 0 && (
            <button onClick={clearAll} className="flex items-center gap-1 text-sm text-orange-600 hover:underline shrink-0">
              <X className="h-3.5 w-3.5" /> ล้างตัวกรอง
            </button>
          )}
        </div>

        {/* Mobile filter row */}
        <div className="flex md:hidden flex-col gap-2 py-2">
          {/* Condition pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {CONDITION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateURL({ condition: opt.value || null })}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-sm transition-colors",
                  currentCondition === opt.value
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
              <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
                <SheetHeader><SheetTitle>กรองอุปกรณ์</SheetTitle></SheetHeader>
                <div className="mt-4 space-y-5 pb-6">
                  {!lockedCategory && (
                    <div>
                      <p className="mb-2 text-sm font-medium">หมวดหมู่</p>
                      <select value={currentCat} onChange={(e) => { updateURL({ cat: e.target.value || null }); setSheetOpen(false); }}
                        className="w-full rounded-lg border px-3 py-2 text-sm">
                        <option value="">ทุกหมวดหมู่</option>
                        {categories.map((c) => <option key={c.id} value={c.slug}>{c.name_th}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <p className="mb-2 text-sm font-medium">จังหวัด</p>
                    <select value={currentProvince} onChange={(e) => updateURL({ province: e.target.value || null })}
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
                    <p className="mb-2 text-sm font-medium">เรียงโดย</p>
                    <select value={currentSort} onChange={(e) => updateURL({ sort: e.target.value })}
                      className="w-full rounded-lg border px-3 py-2 text-sm">
                      {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <Button onClick={() => { applyPrice(minPrice, maxPrice); setSheetOpen(false); }}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                    ดูผลการค้นหา
                  </Button>
                </div>
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
          </div>
        </div>
      </div>
    </div>
  );
}
