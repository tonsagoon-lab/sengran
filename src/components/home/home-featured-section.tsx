import Link from "next/link";
import { Sparkles, Megaphone } from "lucide-react";
import { getHomeFeaturedPicks } from "@/lib/db/home-featured";
import { CompactBrowseCard } from "@/components/listings/compact-browse-card";
import type { SearchListing } from "@/lib/db/listings";

const LINE_AD_URL = "https://line.me/R/ti/p/@salebiz";

function PromoSlotCard() {
  return (
    <a
      href={LINE_AD_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-lg overflow-hidden bg-gradient-to-br from-orange-500 to-amber-500 text-white hover:shadow-md hover:scale-[1.02] transition-all duration-200"
    >
      <div className="relative aspect-[4/3] flex flex-col items-center justify-center text-center px-2">
        <Megaphone className="h-7 w-7 mb-1.5 drop-shadow-sm" />
        <p className="text-[11px] font-medium opacity-95 leading-tight">ลงประกาศจุดนี้</p>
        <p className="text-xl font-extrabold leading-tight drop-shadow-sm">฿500</p>
        <p className="text-[10px] opacity-90">/เดือน</p>
      </div>
      <div className="flex items-center justify-center gap-1.5 bg-green-500 group-hover:bg-green-600 py-1.5 text-white transition-colors">
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M19.365 9.863c.349 0 .63.285.631.63 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
        </svg>
        <span className="text-[11px] font-semibold">Add LINE</span>
      </div>
    </a>
  );
}

export async function HomeFeaturedSection({ supabaseUrl }: { supabaseUrl: string }) {
  const picks = await getHomeFeaturedPicks();
  if (picks.length === 0) return null;

  const listings: SearchListing[] = picks.map((p) => ({
    id: p.listings.id,
    title: p.listings.title,
    slug: p.listings.slug,
    listing_type: p.listings.listing_type,
    sale_price: p.listings.sale_price,
    rent_price: p.listings.rent_price,
    revenue_amount: p.listings.revenue_amount,
    revenue_period: p.listings.revenue_period,
    is_featured: p.listings.is_featured,
    featured_until: p.listings.featured_until,
    district: p.listings.district,
    province_id: p.listings.province_id,
    view_count: p.listings.view_count ?? 0,
    published_at: p.listings.published_at,
    promo_type: p.listings.promo_type,
    promo_value: p.listings.promo_value,
    promo_activated_at: p.listings.promo_activated_at,
    listing_images: p.listings.listing_images,
    categories: p.listings.categories,
    provinces: p.listings.provinces,
  }));

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-orange-500">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <h2 className="font-semibold text-neutral-800 text-lg">ประกาศแนะนำ</h2>
        </div>
        <Link href="/listings" className="text-sm text-orange-600 hover:underline">
          ดูทั้งหมด →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {listings.map((listing, i) => (
          <div key={listing.id} className="relative">
            <div className="absolute top-1.5 right-1.5 z-10 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
              แนะนำ
            </div>
            <CompactBrowseCard listing={listing} supabaseUrl={supabaseUrl} priority={i < 4} />
          </div>
        ))}
        <PromoSlotCard />
      </div>
    </section>
  );
}
