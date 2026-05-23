// components/type-badge.tsx
// One badge per listing type — colors are fixed by product convention:
//   sale → blue, rent → green, both → purple.

import { cn } from "@/lib/utils";

const STYLES = {
  sale: { cls: "bg-blue-100 text-blue-700 border-blue-200",       label: "เซ้ง" },
  rent: { cls: "bg-green-100 text-green-700 border-green-200",    label: "ให้เช่า" },
  both: { cls: "bg-purple-100 text-purple-700 border-purple-200", label: "เซ้ง+เช่า" },
} as const;

export function TypeBadge({
  type,
  featured,
  size = "sm",
}: {
  type: "sale" | "rent" | "both";
  featured?: boolean;
  size?: "sm" | "md";
}) {
  const s = STYLES[type];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
        s.cls,
      )}
    >
      {featured && <span className="text-[10px]">⭐</span>}
      {s.label}
    </span>
  );
}
