"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/hooks/use-favorites";

export function HeartBtn({
  listingId,
  floating = true,
}: {
  listingId: string;
  floating?: boolean;
}) {
  const { isFavorited, toggle, isPending } = useFavorites(listingId);

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(); }}
      disabled={isPending}
      aria-label={isFavorited ? "เลิกบันทึก" : "บันทึก"}
      aria-pressed={isFavorited}
      className={cn(
        "grid size-8 place-items-center rounded-full transition-colors",
        floating && "absolute right-2 top-2 bg-white/90 shadow-sm backdrop-blur-sm",
        isFavorited ? "text-red-500" : "text-neutral-500 hover:text-red-500",
      )}
    >
      <Heart className="size-4" fill={isFavorited ? "currentColor" : "none"} strokeWidth={isFavorited ? 0 : 2} />
    </button>
  );
}
