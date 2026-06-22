"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Heart, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleFavoriteAction } from "@/lib/actions/listings";
import type { SearchListing } from "@/lib/db/listings";
import { resolveImageUrl } from "@/lib/utils/image-url";

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  sale: { label: "เซ้ง", className: "bg-blue-100 text-blue-700 border-blue-200" },
  rent: { label: "ให้เช่า", className: "bg-green-100 text-green-700 border-green-200" },
  both: { label: "เซ้ง+เช่า", className: "bg-purple-100 text-purple-700 border-purple-200" },
};

const fmt = new Intl.NumberFormat("th-TH");

function getAgeSuffix(publishedAt: string | null): string | null {
  if (!publishedAt) return null;
  const days = Math.floor((Date.now() - new Date(publishedAt).getTime()) / 86_400_000);
  if (days <= 10) return `ลงได้ ${days === 0 ? 1 : days} วัน`;
  if (days <= 30) return "ประกาศใหม่";
  return null;
}

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
  isFavorited?: boolean;
}

export function BrowseCard({ listing, supabaseUrl, priority = false, isFavorited = false }: BrowseCardProps) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(isFavorited);
  const [pending, setPending] = useState(false);
  const [imgError, setImgError] = useState(false);

  async function handleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    setPending(true);
    const result = await toggleFavoriteAction(listing.id);
    if (result?.error === "กรุณาเข้าสู่ระบบ") {
      router.push("/login");
    } else {
      setFavorited((prev) => !prev);
    }
    setPending(false);
  }
  const cover = listing.listing_images
    .slice()
    .sort((a, b) => a.display_order - b.display_order)[0];
  const coverUrl = cover ? resolveImageUrl(cover.storage_path, 400, 65, "cover", 225) : null;

  const typeBadge = TYPE_BADGE[listing.listing_type] ?? TYPE_BADGE.sale;
  const ageSuffix = getAgeSuffix(listing.published_at ?? null);
  const location = [listing.district, listing.provinces?.name_th].filter(Boolean).join(", ");

  return (
    <Link
      href={`/property/${listing.slug}`}
      className="group flex flex-col rounded-xl border bg-white overflow-hidden hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
    >
      {/* Image */}
      <div className="relative aspect-video bg-neutral-100 shrink-0">
        {coverUrl && !imgError ? (
          <Image
            src={coverUrl}
            alt={listing.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
            priority={priority}
            onError={() => setImgError(true)}
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
            {listing.is_featured && (!listing.featured_until || new Date(listing.featured_until) > new Date()) && <span className="mr-1">⭐</span>}
            {typeBadge.label}
            {ageSuffix && <span className="ml-1 opacity-80">· {ageSuffix}</span>}
          </span>
        </div>
        {/* Favorite button */}
        <div className="absolute top-2 right-2">
          <button
            onClick={handleFavorite}
            disabled={pending}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 transition-colors hover:bg-white disabled:opacity-60"
            aria-label={favorited ? "เอาออกจากรายการโปรด" : "บันทึกรายการโปรด"}
          >
            <Heart
              className={cn("h-4 w-4 transition-colors", favorited ? "fill-red-500 text-red-500" : "text-neutral-400 hover:text-red-400")}
            />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 p-3 flex-1">
        <PriceDisplay listing={listing} />
        {listing.revenue_amount && (
          <p className="text-[11px] text-green-600">
            รายได้ {fmt.format(listing.revenue_amount)} บ.{" "}
            <span className="text-green-500">
              {listing.revenue_period === "yearly" ? "ต่อปี" : listing.revenue_period === "quarterly_avg" ? "เฉลี่ย 3 เดือน" : "เดือนล่าสุด"}
            </span>
          </p>
        )}

        <p className="line-clamp-2 text-sm font-medium text-neutral-800 leading-snug">
          {listing.title}
        </p>

        {location && (
          <div className="flex items-center gap-1 text-xs text-neutral-500">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-1">
          {listing.categories && (
            <span className="text-xs text-neutral-400 truncate">
              {listing.categories.name_th}
            </span>
          )}
          {listing.published_at && (
            <div className="flex items-center gap-0.5 text-[10px] text-neutral-400 shrink-0">
              <Clock className="h-2.5 w-2.5" />
              <span>
                {new Date(listing.published_at).toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "short",
                  year: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
