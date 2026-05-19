import Link from "next/link";
import { MapPin } from "lucide-react";
import { TypeBadge } from "@/components/shared/type-badge";
import { HeartBtn } from "@/components/shared/heart-btn";
import { ListingPhoto } from "./listing-photo";
import { priceText, priceUnit } from "@/lib/format";

type CardListing = {
  id: string;
  slug: string;
  title: string;
  listing_type: "sale" | "rent" | "both";
  sale_price: number | null;
  rent_price: number | null;
  district: string | null;
  is_featured: boolean | null;
  listing_images: { storage_path: string; display_order: number }[];
  categories: { slug: string; name_th: string } | null;
  provinces: { name_th: string } | null;
};

export function ListingCardV2({
  listing,
  priority,
}: {
  listing: CardListing;
  priority?: boolean;
}) {
  const p = { listing_type: listing.listing_type, sale_price: listing.sale_price, rent_price: listing.rent_price };
  const unit = priceUnit(p);

  return (
    <Link
      href={`/property/${listing.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full">
        <ListingPhoto listing={listing} sizes="(max-width: 640px) 50vw, 200px" priority={priority} />
        <div className="absolute left-2 top-2">
          <TypeBadge type={listing.listing_type} featured={listing.is_featured ?? false} />
        </div>
        <HeartBtn listingId={listing.id} />
      </div>

      <div className="flex flex-col gap-1 p-3">
        <div className="flex flex-wrap items-baseline gap-1">
          <span className="text-[15px] font-bold text-neutral-900">{priceText(p)}</span>
          {unit && <span className="text-[11px] text-neutral-500">{unit}</span>}
        </div>
        <p className="line-clamp-2 text-[13px] font-medium leading-snug text-neutral-700">
          {listing.title}
        </p>
        <div className="flex items-center gap-1 text-[11px] text-neutral-500">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate">
            {[listing.district, listing.provinces?.name_th].filter(Boolean).join(", ")}
          </span>
        </div>
      </div>
    </Link>
  );
}
