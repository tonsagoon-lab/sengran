// components/listing-photo.tsx — wraps next/image with the placeholder
// fallback (gradient + category glyph) so cards always look OK even
// before listings have real photos uploaded.

import Image from "next/image";
import * as Icons from "lucide-react";
import type { Listing } from "@/lib/types";

// Map category slugs to gradient palettes (when no real photo)
const CATEGORY_PLACEHOLDERS: Record<string, { from: string; to: string; icon: keyof typeof Icons }> = {
  restaurant: { from: "#fdba74", to: "#c2410c", icon: "UtensilsCrossed" },
  coffee:     { from: "#d4a574", to: "#7c4a1f", icon: "Coffee" },
  salon:      { from: "#86efac", to: "#15803d", icon: "Scissors" },
  spa:        { from: "#fda4af", to: "#9f1239", icon: "Sparkles" },
  mart:       { from: "#a5b4fc", to: "#4338ca", icon: "ShoppingBasket" },
  laundry:    { from: "#9ca3af", to: "#374151", icon: "WashingMachine" },
  carcare:    { from: "#fcd34d", to: "#92400e", icon: "Car" },
  streetfood: { from: "#9ca3af", to: "#374151", icon: "Store" },
};

export function ListingPhoto({
  listing,
  sizes,
  priority,
}: {
  listing: Listing;
  sizes?: string;
  priority?: boolean;
}) {
  const url = listing.image_urls?.[0];

  if (url) {
    return (
      <Image
        src={url}
        alt={listing.title}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    );
  }

  // Placeholder gradient
  const slug = listing.category?.slug ?? "restaurant";
  const ph = CATEGORY_PLACEHOLDERS[slug] ?? CATEGORY_PLACEHOLDERS.restaurant;
  const IconComp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[ph.icon];

  return (
    <div
      className="grid size-full place-items-center text-white/40"
      style={{ background: `linear-gradient(135deg, ${ph.from} 0%, ${ph.to} 100%)` }}
    >
      <IconComp className="size-12" />
    </div>
  );
}
