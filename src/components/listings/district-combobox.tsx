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

export type District = { id: number; name_th: string; name_en: string };

interface DistrictComboboxProps {
  provinceName: string | null;
  value: { id: number | null; name: string };
  onChange: (val: { id: number | null; name: string }) => void;
  error?: string;
  placeholder?: string;
}

export function DistrictCombobox({ provinceName, value, onChange, error, placeholder = "เลือกเขต/อำเภอ" }: DistrictComboboxProps) {
  const [open, setOpen] = useState(false);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!provinceName) { setDistricts([]); return; }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/thai-admin/districts?province=${encodeURIComponent(provinceName)}`)
      .then((r) => r.json())
      .then((data: District[]) => { if (!cancelled) setDistricts(data); })
      .catch(() => { if (!cancelled) setDistricts([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [provinceName]);

  const disabled = !provinceName;
  const displayText = value.name || (disabled ? "เลือกจังหวัดก่อน" : placeholder);

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
            <CommandInput placeholder="ค้นหาเขต/อำเภอ..." />
            <CommandList className="max-h-60">
              <CommandEmpty>ไม่พบ</CommandEmpty>
              <CommandGroup>
                {districts.map((d) => (
                  <CommandItem
                    key={d.id}
                    value={d.name_th}
                    onSelect={() => {
                      onChange({ id: d.id, name: d.name_th });
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value.id === d.id ? "opacity-100" : "opacity-0")} />
                    {d.name_th}
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
