import Image from "next/image";
import * as Icons from "lucide-react";
import { resolveImageUrl } from "@/lib/utils/image-url";

type PhotoListing = {
  title: string;
  listing_images: { storage_path: string; display_order: number }[];
  categories: { slug: string } | null;
};

const PLACEHOLDERS: Record<string, { from: string; to: string; icon: keyof typeof Icons }> = {
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
  listing: PhotoListing;
  sizes?: string;
  priority?: boolean;
}) {
  const cover = listing.listing_images
    .slice()
    .sort((a, b) => a.display_order - b.display_order)[0];

  if (cover?.storage_path) {
    return (
      <Image
        src={resolveImageUrl(cover.storage_path)}
        alt={listing.title}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    );
  }

  const slug = listing.categories?.slug ?? "restaurant";
  const ph = PLACEHOLDERS[slug] ?? PLACEHOLDERS.restaurant;
  const IconComp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[ph.icon as string];

  return (
    <div
      className="grid size-full place-items-center text-white/40"
      style={{ background: `linear-gradient(135deg, ${ph.from} 0%, ${ph.to} 100%)` }}
    >
      {IconComp && <IconComp className="size-12" />}
    </div>
  );
}
