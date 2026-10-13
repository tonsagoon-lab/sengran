"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleFavoriteAction } from "@/lib/actions/listings";
import type { SearchListing } from "@/lib/db/listings";
import { resolveImageUrl } from "@/lib/utils/image-url";

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  sale: { label: "เซ้ง", className: "bg-blue-100 text-blue-700" },
  rent: { label: "ให้เช่า", className: "bg-green-100 text-green-700" },
  both: { label: "เซ้ง+เช่า", className: "bg-purple-100 text-purple-700" },
};

const fmt = new Intl.NumberFormat("th-TH");

function getAgeSuffix(publishedAt: string | null): string | null {
  if (!publishedAt) return null;
  const days = Math.floor((Date.now() - new Date(publishedAt).getTime()) / 86_400_000);
  if (days > 30) return null;
  return `ลงได้ ${days === 0 ? 1 : days} วัน`;
}

function getPromoAgeSuffix(promoActivatedAt: string | null): string | null {
  if (!promoActivatedAt) return null;
  const days = Math.floor((Date.now() - new Date(promoActivatedAt).getTime()) / 86_400_000);
  if (days > 10) return null;
  return `ลดมา ${days === 0 ? 1 : days} วัน`;
}

function computeDiscountedPrice(listing: SearchListing): number | null {
  if (
    listing.listing_type !== "sale" ||
    !listing.promo_type ||
    !listing.promo_value ||
    !listing.sale_price
  ) {
    return null;
  }
  const sale = Number(listing.sale_price);
  const v = Number(listing.promo_value);
  if (listing.promo_type === "percent") {
    if (v <= 0 || v >= 100) return null;
    return Math.max(0, Math.round(sale - (sale * v) / 100));
  }
  if (v <= 0 || v >= sale) return null;
  return Math.max(0, sale - v);
}

function PriceDisplay({ listing }: { listing: SearchListing }) {
  const { listing_type, sale_price, rent_price } = listing;
  const discounted = computeDiscountedPrice(listing);

  if (listing_type === "sale" && sale_price) {
    if (discounted != null) {
      return (
        <div className="flex items-baseline gap-1 flex-wrap">
          <span className="text-xs font-bold text-orange-600">
            ฿{fmt.format(discounted)}
          </span>
          <span className="text-[10px] line-through text-neutral-400">
            ฿{fmt.format(sale_price)}
          </span>
        </div>
      );
    }
    return <span className="text-xs font-bold text-neutral-900">฿{fmt.format(sale_price)}</span>;
  }
  if (listing_type === "rent" && rent_price) {
    return (
      <span className="text-xs font-bold text-neutral-900">
        ฿{fmt.format(rent_price)}
        <span className="text-[10px] font-normal text-neutral-500">/ด.</span>
      </span>
    );
  }
  if (listing_type === "both") {
    return (
      <span className="text-xs font-bold text-neutral-900">
        {sale_price ? `฿${fmt.format(sale_price)}` : "—"}
        {rent_price && (
          <span className="ml-1 text-[10px] font-normal text-neutral-500">
            · เช่า ฿{fmt.format(rent_price)}/ด.
          </span>
        )}
      </span>
    );
  }
  return <span className="text-xs text-neutral-400">ติดต่อสอบถาม</span>;
}

interface CompactBrowseCardProps {
  listing: SearchListing;
  supabaseUrl: string;
  priority?: boolean;
  isFavorited?: boolean;
}

export function CompactBrowseCard({ listing, priority = false, isFavorited = false }: CompactBrowseCardProps) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(isFavorited);
  const [pending, setPending] = useState(false);
  const [imgError, setImgError] = useState(false);

  async function handleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    setPending(true);
    const result = await toggleFavoriteAction(listing.id);
    if (result?.error === "กรุณาเข้าสู่ระบบ") {
      const returnTo = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
      router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
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
  const hasActivePromo = !!(listing.promo_type && listing.promo_value != null);
  const ageSuffix = hasActivePromo
    ? getPromoAgeSuffix(listing.promo_activated_at ?? null) ?? getAgeSuffix(listing.published_at ?? null)
    : getAgeSuffix(listing.published_at ?? null);
  const location = [listing.district, listing.provinces?.name_th].filter(Boolean).join(", ");

  return (
    <Link
      href={`/property/${listing.slug}`}
      className="group flex flex-col rounded-lg border bg-white overflow-hidden hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-neutral-100 shrink-0">
        {coverUrl && !imgError ? (
          <Image
            src={coverUrl}
            alt={listing.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-neutral-300 text-xs">
            ไม่มีรูป
          </div>
        )}
        {/* Badges top-left */}
        <div className="absolute top-1.5 left-1.5 flex flex-wrap items-center gap-1">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              typeBadge.className
            )}
          >
            {listing.is_featured && (!listing.featured_until || new Date(listing.featured_until) > new Date()) && <span className="mr-0.5">⭐</span>}
            {typeBadge.label}
            {ageSuffix && <span className="ml-1 opacity-80">· {ageSuffix}</span>}
          </span>
          {listing.promo_type && listing.promo_value != null && (
            <span className="inline-flex items-center rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {listing.promo_type === "percent"
                ? `-${Number(listing.promo_value)}%`
                : `-฿${fmt.format(Number(listing.promo_value))}`}
            </span>
          )}
          {listing.view_count >= 100 && (
            <span className="inline-flex items-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
              🔥 ฮิต
            </span>
          )}
        </div>
        {/* Favorite button */}
        <div className="absolute top-1.5 right-1.5">
          <button
            onClick={handleFavorite}
            disabled={pending}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80 transition-colors hover:bg-white disabled:opacity-60"
            aria-label={favorited ? "เอาออกจากรายการโปรด" : "บันทึกรายการโปรด"}
          >
            <Heart
              className={cn("h-3 w-3 transition-colors", favorited ? "fill-red-500 text-red-500" : "text-neutral-400 hover:text-red-400")}
            />
          </button>
        </div>
      </div>

      {/* Info — compact */}
      <div className="flex flex-col gap-0.5 p-2 flex-1">
        <PriceDisplay listing={listing} />
        {listing.revenue_amount && (
          <p className="text-[11px] text-green-600">
            รายได้ {fmt.format(listing.revenue_amount)} บ.{" "}
            <span className="text-green-500">
              {listing.revenue_period === "yearly" ? "ต่อปี" : listing.revenue_period === "quarterly_avg" ? "เฉลี่ย 3 เดือน" : "เดือนล่าสุด"}
            </span>
          </p>
        )}
        <p className="text-xs font-medium text-neutral-800 line-clamp-2 leading-snug">
          {listing.title}
        </p>
        {(location || listing.distance_km != null) && (
          <div className="flex items-center gap-1 text-[10px] text-neutral-500">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{location}</span>
            {listing.distance_km != null && (
              <span className="shrink-0 rounded-full bg-orange-100 text-orange-700 px-1 py-px text-[9px] font-semibold">
                {listing.distance_km < 1
                  ? `${Math.round(listing.distance_km * 1000)} ม.`
                  : `${listing.distance_km.toFixed(1)} กม.`}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
