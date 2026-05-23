// components/home/type-pills.tsx — three pill buttons (เซ้ง · ให้เช่า · ทั้งคู่)
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Type = "sale" | "rent" | "both";
const PILLS: { key: Type; label: string }[] = [
  { key: "sale", label: "เซ้ง" },
  { key: "rent", label: "ให้เช่า" },
  { key: "both", label: "ทั้งคู่" },
];

export function TypePills({ onSelect }: { onSelect: (type: Type) => void }) {
  const [active, setActive] = useState<Type | null>(null);

  return (
    <div className="flex gap-2 px-4 pt-2.5 pb-1">
      {PILLS.map((p) => {
        const on = active === p.key;
        return (
          <button
            key={p.key}
            onClick={() => { setActive(p.key); onSelect(p.key); }}
            className={cn(
              "flex-1 rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors",
              on
                ? "border-orange-200 bg-orange-50 text-orange-700"
                : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-orange-300 hover:bg-orange-50",
            )}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
