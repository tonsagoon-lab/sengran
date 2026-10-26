import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getHomeFeaturedPicks } from "@/lib/db/home-featured";
import { CompactBrowseCard } from "@/components/listings/compact-browse-card";
import type { SearchListing } from "@/lib/db/listings";

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
      </div>
    </section>
  );
}
