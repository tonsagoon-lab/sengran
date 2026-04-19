import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SearchListing } from "@/lib/db/listings";

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  sale: { label: "เซ้ง", className: "bg-blue-100 text-blue-700 border-blue-200" },
  rent: { label: "ให้เช่า", className: "bg-green-100 text-green-700 border-green-200" },
  both: { label: "เซ้ง+เช่า", className: "bg-purple-100 text-purple-700 border-purple-200" },
};

const fmt = new Intl.NumberFormat("th-TH");

function PriceDisplay({ listing }: { listing: SearchListing }) {
  const { listing_type, sale_price, rent_price } = listing;
  if (listing_type === "sale" && sale_price) {
    return <span className="text-base font-bold text-neutral-900">฿{fmt.format(sale_price)}</span>;
  }
  if (listing_type === "rent" && rent_price) {
    return (
      <span className="text-base font-bold text-neutral-900">
        ฿{fmt.format(rent_price)}<span className="text-xs font-normal text-neutral-500">/เดือน</span>
      </span>
    );
  }
  if (listing_type === "both") {
    return (
      <span className="text-sm font-bold text-neutral-900">
        {sale_price ? `฿${fmt.format(sale_price)}` : "—"}
        {rent_price && (
          <span className="ml-1 text-xs font-normal text-neutral-500">
            · เช่า ฿{fmt.format(rent_price)}/ด.
          </span>
        )}
      </span>
    );
  }
  return <span className="text-sm text-neutral-400">ติดต่อสอบถาม</span>;
}

interface BrowseCardProps {
  listing: SearchListing;
  supabaseUrl: string;
  priority?: boolean;
}

export function BrowseCard({ listing, supabaseUrl, priority = false }: BrowseCardProps) {
  const cover = listing.listing_images
    .slice()
    .sort((a, b) => a.display_order - b.display_order)[0];
  const coverUrl = cover
    ? `${supabaseUrl}/storage/v1/object/public/listings/${cover.storage_path}`
    : null;

  const typeBadge = TYPE_BADGE[listing.listing_type];
  const location = [listing.district, listing.provinces?.name_th].filter(Boolean).join(", ");

  return (
    <Link
      href={`/listing/${listing.slug}`}
      className="group flex flex-col rounded-xl border bg-white overflow-hidden hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-neutral-100 shrink-0">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={listing.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
            priority={priority}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-neutral-300 text-sm">
            ไม่มีรูปภาพ
          </div>
        )}
        {/* Type badge top-left */}
        <div className="absolute top-2 left-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
              typeBadge.className
            )}
          >
            {listing.is_featured && <span className="mr-1">⭐</span>}
            {typeBadge.label}
          </span>
        </div>
        {/* Featured badge top-right (placeholder heart for Phase 5) */}
        <div className="absolute top-2 right-2">
          <button
            onClick={(e) => e.preventDefault()}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-neutral-400 hover:text-red-500 transition-colors"
            aria-label="บันทึกรายการโปรด"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 p-3 flex-1">
        <PriceDisplay listing={listing} />

        <p className="line-clamp-2 text-sm font-medium text-neutral-800 leading-snug">
          {listing.title}
        </p>

        {location && (
          <div className="flex items-center gap-1 text-xs text-neutral-500">
            <MapPin className="h-3 w-3 shrink-0" />
            <Link
              href={listing.provinces?.slug ? `/province/${listing.provinces.slug}` : "#"}
              onClick={(e) => e.stopPropagation()}
              className="truncate hover:text-orange-600"
            >
              {location}
            </Link>
          </div>
        )}

        {listing.categories && (
          <Link
            href={`/category/${listing.categories.slug}`}
            onClick={(e) => e.stopPropagation()}
            className="mt-auto text-xs text-neutral-400 hover:text-orange-600 truncate"
          >
            {listing.categories.name_th}
          </Link>
        )}
      </div>
    </Link>
  );
}
