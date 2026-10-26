import Link from "next/link";
import { Star } from "lucide-react";
import { getFeaturedListings } from "@/lib/db/listings";
import { CompactBrowseCard } from "@/components/listings/compact-browse-card";

export async function PremiumListings({ supabaseUrl, excludeIds = [] }: { supabaseUrl: string; excludeIds?: string[] }) {
  const listings = await getFeaturedListings(excludeIds);
  if (listings.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-orange-500">
            <Star className="h-3.5 w-3.5 text-white fill-white" />
          </div>
          <h2 className="font-semibold text-neutral-800 text-lg">ประกาศ Premium</h2>
        </div>
        <Link href="/listings?featured=1" className="text-sm text-orange-600 hover:underline">
          ดูทั้งหมด →
        </Link>
      </div>

      {/* Horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-4 md:gap-3 md:overflow-visible scrollbar-hide">
        {listings.map((listing, i) => (
          <div key={listing.id} className="min-w-[140px] md:min-w-0 flex-shrink-0 md:flex-shrink relative">
            {/* Premium badge */}
            <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
              <Star className="h-2.5 w-2.5 fill-white" />
              Premium
            </div>
            <CompactBrowseCard
              listing={listing}
              supabaseUrl={supabaseUrl}
              priority={i < 4}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
