"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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

interface Province {
  id: number;
  name_th: string;
  slug: string;
  region: string;
}

interface ProvinceComboboxProps {
  provinces: Province[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function ProvinceCombobox({ provinces, value, onChange, error }: ProvinceComboboxProps) {
  const [open, setOpen] = useState(false);

  const selected = provinces.find((p) => String(p.id) === value);

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between font-normal",
              !selected && "text-neutral-400",
              error && "border-red-500"
            )}
          >
            {selected ? selected.name_th : "เลือกจังหวัด"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="ค้นหาจังหวัด..." />
            <CommandList className="max-h-60">
              <CommandEmpty>ไม่พบจังหวัด</CommandEmpty>
              <CommandGroup>
                {provinces.map((province) => (
                  <CommandItem
                    key={province.id}
                    value={province.name_th}
                    onSelect={() => {
                      onChange(String(province.id));
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        String(province.id) === value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {province.name_th}
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
