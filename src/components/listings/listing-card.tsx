import Link from "next/link";
import Image from "next/image";
import { MapPin, Eye, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteListingButton } from "./delete-listing-button";
import { ListingStatusButtons } from "./listing-status-buttons";
import { PromoteButtons } from "./promote-button";
import type { ListingWithImages } from "@/lib/db/listings";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  published: { label: "เผยแพร่แล้ว", variant: "default" },
  draft: { label: "แบบร่าง", variant: "secondary" },
  sold: { label: "เซ้งแล้ว/เช่าแล้ว", variant: "outline" },
  expired: { label: "หมดอายุ", variant: "destructive" },
  hidden: { label: "ซ่อน", variant: "secondary" },
};

const TYPE_LABELS: Record<string, string> = {
  sale: "เซ้ง",
  rent: "เช่า",
  both: "เซ้ง/เช่า",
};

function formatPrice(price: number | null) {
  if (price == null) return null;
  return price.toLocaleString("th-TH");
}

interface ListingCardProps {
  listing: ListingWithImages;
}

export function ListingCard({ listing }: ListingCardProps) {
  const coverImage = listing.listing_images.sort((a, b) => a.display_order - b.display_order)[0];
  const coverUrl = coverImage
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listings/${coverImage.storage_path}`
    : null;

  const status = STATUS_LABELS[listing.status] ?? { label: listing.status, variant: "secondary" as const };

  return (
    <div className="border rounded-xl bg-white hover:shadow-sm transition-shadow overflow-hidden">
      {/* Top row: image + info + actions */}
      <div className="flex gap-3 p-4">
        {/* Cover image */}
        <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-neutral-100">
          {coverUrl ? (
            <Image src={coverUrl} alt={listing.title} fill className="object-cover" sizes="80px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
              ไม่มีรูป
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/property/${listing.slug}`}
              className="font-medium text-sm line-clamp-2 hover:text-orange-600"
            >
              {listing.title}
            </Link>
            <Badge variant={status.variant} className="shrink-0 text-xs">
              {status.label}
            </Badge>
          </div>

          <div className="flex items-center gap-1 text-xs text-neutral-500">
            <MapPin className="h-3 w-3" />
            <span>{listing.district || "—"}</span>
          </div>

          <div className="flex gap-2 text-xs font-medium text-neutral-700">
            <span className="text-neutral-400">{TYPE_LABELS[listing.listing_type]}</span>
            {listing.sale_price != null && (
              <span>{formatPrice(listing.sale_price)} บาท</span>
            )}
            {listing.rent_price != null && (
              <span>{formatPrice(listing.rent_price)} บาท/เดือน</span>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs text-neutral-400">
            <Eye className="h-3 w-3" />
            <span>{listing.view_count} ครั้ง</span>
          </div>
        </div>

        {/* Action buttons (edit/delete/status) */}
        <div className="flex flex-col gap-1.5 shrink-0 items-end">
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" asChild className="h-8 px-2">
              <Link href={`/listings/${listing.id}/edit`}>
                <Pencil className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <DeleteListingButton listingId={listing.id} />
          </div>
          <ListingStatusButtons listingId={listing.id} currentStatus={listing.status} />
        </div>
      </div>

      {/* Promote buttons — แสดงเฉพาะประกาศที่ publish แล้ว */}
      {listing.status === "published" && (
        <div className="px-4 pb-3 border-t pt-2.5 bg-neutral-50">
          <p className="text-[10px] text-neutral-400 mb-1.5 font-medium uppercase tracking-wide">โปรโมทประกาศ</p>
          <PromoteButtons
            listingId={listing.id}
            listingTitle={listing.title}
          />
        </div>
      )}
    </div>
  );
}
