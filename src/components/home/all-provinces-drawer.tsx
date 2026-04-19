"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface Province {
  id: number;
  name_th: string;
  slug: string;
  region: string;
}

interface AllProvincesDrawerProps {
  provinces: Province[];
}

const REGION_LABELS: Record<string, string> = {
  north: "ภาคเหนือ",
  northeast: "ภาคตะวันออกเฉียงเหนือ",
  central: "ภาคกลาง",
  east: "ภาคตะวันออก",
  west: "ภาคตะวันตก",
  south: "ภาคใต้",
};

export function AllProvincesDrawer({ provinces }: AllProvincesDrawerProps) {
  const [open, setOpen] = useState(false);

  const byRegion = provinces.reduce<Record<string, Province[]>>((acc, p) => {
    const r = p.region || "other";
    if (!acc[r]) acc[r] = [];
    acc[r].push(p);
    return acc;
  }, {});

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="mt-2">
          ดูทุกจังหวัด (77 จังหวัด) →
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>ทุกจังหวัด</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-5 pb-6">
          {Object.entries(byRegion).map(([region, provs]) => (
            <div key={region}>
              <p className="mb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                {REGION_LABELS[region] ?? region}
              </p>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4">
                {provs.map((p) => (
                  <Link
                    key={p.id}
                    href={`/city/${p.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-orange-50 hover:text-orange-700"
                  >
                    {p.name_th}
                    <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
