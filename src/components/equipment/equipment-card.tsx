"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { MapPin, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/utils/image-url";
import type { EquipmentListing } from "@/lib/db/equipment";

const CONDITION_BADGE: Record<string, { label: string; className: string }> = {
  excellent: { label: "ดีมาก", className: "bg-green-100 text-green-700 border-green-200" },
  good:      { label: "ดี",     className: "bg-blue-100 text-blue-700 border-blue-200" },
  fair:      { label: "พอใช้",  className: "bg-gray-100 text-gray-600 border-gray-200" },
};

const STATUS_OVERLAY: Record<string, { label: string; className: string } | undefined> = {
  reserved: { label: "จองแล้ว", className: "bg-yellow-500/90" },
  sold:     { label: "ขายแล้ว", className: "bg-neutral-700/90" },
};

const fmt = new Intl.NumberFormat("th-TH");

function getAgeSuffix(publishedAt: string | null): string | null {
  if (!publishedAt) return null;
  const days = Math.floor((Date.now() - new Date(publishedAt).getTime()) / 86_400_000);
  if (days <= 10) return `${days === 0 ? 1 : days} วัน`;
  if (days <= 30) return "ใหม่";
  return null;
}

interface EquipmentCardProps {
  listing: EquipmentListing;
  priority?: boolean;
  sellerVerified?: boolean;
}

export function EquipmentCard({ listing, priority = false, sellerVerified = false }: EquipmentCardProps) {
  const [imgError, setImgError] = useState(false);

  const cover = listing.listing_images
    .slice()
    .sort((a, b) => a.display_order - b.display_order)[0];
  const coverUrl = cover ? resolveImageUrl(cover.storage_path, 400, 65, "cover", 225) : null;

  const conditionBadge = listing.condition ? CONDITION_BADGE[listing.condition] : null;
  const statusOverlay = STATUS_OVERLAY[listing.status];
  const ageSuffix = getAgeSuffix(listing.published_at ?? null);
  const location = [listing.district, listing.provinces?.name_th].filter(Boolean).join(", ");

  return (
    <Link
      href={`/equipment/${listing.slug}`}
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

        {/* Status overlay */}
        {statusOverlay && (
          <div className={cn(
            "absolute inset-0 flex items-center justify-center",
            statusOverlay.className
          )}>
            <span className="text-white font-bold text-lg">{statusOverlay.label}</span>
          </div>
        )}

        {/* Condition badge top-left */}
        {conditionBadge && (
          <div className="absolute top-2 left-2">
            <span className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
              conditionBadge.className
            )}>
              {conditionBadge.label}
              {ageSuffix && <span className="ml-1 opacity-70">· {ageSuffix}</span>}
            </span>
          </div>
        )}

        {/* Verified badge top-right */}
        {sellerVerified && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-0.5 rounded-full bg-white/90 border border-green-200 px-2 py-0.5 text-xs font-medium text-green-700">
              <CheckCircle2 className="h-3 w-3" />
              ยืนยันแล้ว
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 p-3 flex-1">
        {/* Price */}
        {listing.sale_price != null ? (
          <span className="text-base font-bold text-neutral-900">
            ฿{fmt.format(listing.sale_price)}
          </span>
        ) : (
          <span className="text-sm text-neutral-400">ติดต่อสอบถาม</span>
        )}

        {/* Title */}
        <p className="line-clamp-2 text-sm font-medium text-neutral-800 leading-snug">
          {listing.title}
        </p>

        {/* Location */}
        {location && (
          <div className="flex items-center gap-1 text-xs text-neutral-500">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        )}

        {/* Footer */}
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
