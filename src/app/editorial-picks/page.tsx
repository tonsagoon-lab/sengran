import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { getEditorialPicks } from "@/lib/db/editorial-picks";
import { resolveImageUrl } from "@/lib/utils/image-url";
import { TopMenuBar } from "@/components/top-menu-bar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ฝากเซ้ง-ประเมินราคาแล้ว — เซ้งร้าน.com",
  robots: { index: true, follow: true },
};

export const revalidate = 60;

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  sale: { label: "เซ้ง", className: "bg-blue-100 text-blue-700" },
  rent: { label: "ให้เช่า", className: "bg-green-100 text-green-700" },
  both: { label: "เซ้ง+เช่า", className: "bg-purple-100 text-purple-700" },
};

const fmt = new Intl.NumberFormat("th-TH");

function getAgeSuffix(publishedAt: string | null): string | null {
  if (!publishedAt) return null;
  const days = Math.floor((Date.now() - new Date(publishedAt).getTime()) / 86_400_000);
  if (days <= 10) return `ลงได้ ${days === 0 ? 1 : days} วัน`;
  if (days <= 30) return "ประกาศใหม่";
  return null;
}

export default async function EditorialPicksPage() {
  const picks = await getEditorialPicks();

  return (
    <>
      <TopMenuBar />
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⭐</span>
          <h1 className="text-xl font-bold text-neutral-900">ฝากเซ้ง-ประเมินราคาแล้ว</h1>
          <span className="text-sm text-neutral-400">({picks.length} ประกาศ)</span>
        </div>

        {picks.length === 0 ? (
          <p className="text-neutral-400 text-sm">ยังไม่มีประกาศในหมวดนี้</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {picks.map((pick) => {
              const listing = pick.listings;
              const cover = listing.listing_images
                .slice()
                .sort((a, b) => a.display_order - b.display_order)[0];
              const coverUrl = cover ? resolveImageUrl(cover.storage_path) : null;
              const badge = TYPE_BADGE[listing.listing_type] ?? TYPE_BADGE.sale;
              const ageSuffix = getAgeSuffix(listing.published_at ?? null);
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
                  className="group flex flex-col rounded-xl border bg-white overflow-hidden hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
                >
                  <div className="relative aspect-[4/3] bg-neutral-100 shrink-0">
                    {coverUrl ? (
                      <Image
                        src={coverUrl}
                        alt={listing.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-neutral-300 text-xs">ไม่มีรูป</div>
                    )}
                    <span className={`absolute top-1.5 left-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}>
                      {badge.label}{ageSuffix && <span className="ml-1 opacity-80">· {ageSuffix}</span>}
                    </span>
                    <span className="absolute top-1.5 right-1.5 rounded-full bg-orange-500 text-white px-1.5 py-0.5 text-[10px] font-medium">
                      ⭐ แนะนำ
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 p-2.5 flex-1">
                    <p className="text-sm font-bold text-neutral-900">{priceText}</p>
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
                    {location && (
                      <div className="flex items-center gap-1 text-[10px] text-neutral-500 mt-auto pt-1">
                        <MapPin className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{location}</span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="pt-4">
          <Link href="/listings" className="text-sm text-orange-600 hover:underline">
            ← ดูประกาศทั้งหมด
          </Link>
        </div>
      </div>
    </>
  );
}
