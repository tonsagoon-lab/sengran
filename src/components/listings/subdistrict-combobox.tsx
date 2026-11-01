"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type Subdistrict = { id: number; name_th: string; name_en: string; zip_code: number };

interface SubdistrictComboboxProps {
  districtId: number | null;
  value: { id: number | null; name: string };
  onChange: (val: { id: number | null; name: string; zip_code: number | null }) => void;
  error?: string;
  placeholder?: string;
}

export function SubdistrictCombobox({ districtId, value, onChange, error, placeholder = "เลือกตำบล/แขวง" }: SubdistrictComboboxProps) {
  const [open, setOpen] = useState(false);
  const [subdistricts, setSubdistricts] = useState<Subdistrict[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!districtId) { setSubdistricts([]); return; }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/thai-admin/subdistricts?districtId=${districtId}`)
      .then((r) => r.json())
      .then((data: Subdistrict[]) => { if (!cancelled) setSubdistricts(data); })
      .catch(() => { if (!cancelled) setSubdistricts([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [districtId]);

  const disabled = !districtId;
  const displayText = value.name || (disabled ? "เลือกเขต/อำเภอก่อน" : placeholder);

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal",
              !value.name && "text-neutral-400",
              error && "border-red-500"
            )}
          >
            {displayText}
            {loading ? <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" /> : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[1000]" align="start">
          <Command>
            <CommandInput placeholder="ค้นหาตำบล/แขวง..." />
            <CommandList className="max-h-60">
              <CommandEmpty>ไม่พบ</CommandEmpty>
              <CommandGroup>
                {subdistricts.map((s) => (
                  <CommandItem
                    key={s.id}
                    value={s.name_th}
                    onSelect={() => {
                      onChange({ id: s.id, name: s.name_th, zip_code: s.zip_code });
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value.id === s.id ? "opacity-100" : "opacity-0")} />
                    <span className="flex-1">{s.name_th}</span>
                    {s.zip_code > 0 && <span className="text-xs text-neutral-400 ml-2">{s.zip_code}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
