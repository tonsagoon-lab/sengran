// components/listing-card.tsx — vertical card used in featured strip + latest grid
// Hover: shadow-md + scale-[1.02]. Tap opens detail.

import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";

import type { Listing } from "@/lib/types";
import { priceText, priceUnit } from "@/lib/format";
import { TypeBadge } from "./type-badge";
import { HeartBtn } from "./heart-btn";
import { ListingPhoto } from "./listing-photo";

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link
      href={`/property/${listing.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full">
        <ListingPhoto listing={listing} sizes="(max-width: 640px) 50vw, 200px" />
        <div className="absolute left-2 top-2">
          <TypeBadge type={listing.type} featured={listing.featured} />
        </div>
        <HeartBtn listingId={listing.id} />
      </div>

      <div className="flex flex-col gap-1 p-3">
        <div className="flex flex-wrap items-baseline gap-1">
          <span className="text-[15px] font-bold text-neutral-900">{priceText(listing)}</span>
          {priceUnit(listing) && (
            <span className="text-[11px] text-neutral-500">{priceUnit(listing)}</span>
          )}
        </div>
        <p className="line-clamp-2 text-[13px] font-medium leading-snug text-neutral-700">
          {listing.title}
        </p>
        <div className="flex items-center gap-1 text-[11px] text-neutral-500">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate">
            {listing.area_label}, {listing.province}
          </span>
        </div>
      </div>
    </Link>
  );
}
