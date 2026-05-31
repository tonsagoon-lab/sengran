import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { getEditorialPicks } from "@/lib/db/editorial-picks";
import { resolveImageUrl } from "@/lib/utils/image-url";

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  sale: { label: "เซ้ง", className: "bg-blue-100 text-blue-700" },
  rent: { label: "ให้เช่า", className: "bg-green-100 text-green-700" },
  both: { label: "เซ้ง+เช่า", className: "bg-purple-100 text-purple-700" },
};

const fmt = new Intl.NumberFormat("th-TH");

interface EditorialPicksProps {
  supabaseUrl: string;
}

export async function EditorialPicks({ supabaseUrl }: EditorialPicksProps) {
  const picks = await getEditorialPicks();
  if (picks.length === 0) return null;

  const shuffled = [...picks].sort(() => Math.random() - 0.5);
  const visible = shuffled.slice(0, 4);
  const hasMore = picks.length > 4;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">⭐</span>
          <h2 className="font-semibold text-neutral-800 text-lg">ฝากเซ้ง-ประเมินราคาแล้ว</h2>
        </div>
        {hasMore && (
          <Link href="/editorial-picks" className="text-sm text-orange-600 hover:underline">
            ดูทั้งหมด ({picks.length}) →
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
        {visible.map((pick) => {
          const listing = pick.listings;
          const cover = listing.listing_images
            .slice()
            .sort((a, b) => a.display_order - b.display_order)[0];
          const coverUrl = cover ? resolveImageUrl(cover.storage_path) : null;
          const badge = TYPE_BADGE[listing.listing_type] ?? TYPE_BADGE.sale;
          const location = [listing.district, listing.provinces?.name_th].filter(Boolean).join(", ");

          let priceText = "ติดต่อสอบถาม";
          if (listing.listing_type === "sale" && listing.sale_price)
            priceText = `฿${fmt.format(listing.sale_price)}`;
          else if (listing.listing_type === "rent" && listing.rent_price)
            priceText = `฿${fmt.format(listing.rent_price)}/ด.`;
          else if (listing.listing_type === "both" && listing.sale_price)
            priceText = `฿${fmt.format(listing.sale_price)}`;

          return (
            <Link
              key={pick.listing_id}
              href={`/property/${listing.slug}`}
              className="group flex flex-col rounded-lg border bg-white overflow-hidden hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
            >
              {/* Image — smaller aspect ratio */}
              <div className="relative aspect-[4/3] bg-neutral-100 shrink-0">
                {coverUrl ? (
                  <Image
                    src={coverUrl}
                    alt={listing.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-neutral-300 text-xs">ไม่มีรูป</div>
                )}
                <span className={`absolute top-1.5 left-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}>
                  {badge.label}
                </span>
                <span className="absolute top-1.5 right-1.5 rounded-full bg-orange-500 text-white px-1.5 py-0.5 text-[10px] font-medium">
                  แนะนำ
                </span>
              </div>

              {/* Info — compact */}
              <div className="flex flex-col gap-0.5 p-2 flex-1">
                <p className="text-xs font-bold text-neutral-900">{priceText}</p>
                <p className="text-xs font-medium text-neutral-800 line-clamp-2 leading-snug">
                  {listing.title}
                </p>
                {location && (
                  <div className="flex items-center gap-1 text-[10px] text-neutral-500">
                    <MapPin className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">{location}</span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
