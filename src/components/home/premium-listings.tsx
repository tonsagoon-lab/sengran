import Link from "next/link";
import { Star } from "lucide-react";
import { getFeaturedListings } from "@/lib/db/listings";
import { BrowseCard } from "@/components/listings/browse-card";

export async function PremiumListings({ supabaseUrl }: { supabaseUrl: string }) {
  const listings = await getFeaturedListings();
  if (listings.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-orange-500">
            <Star className="h-3.5 w-3.5 text-white fill-white" />
          </div>
          <h2 className="font-semibold text-neutral-800 text-lg">ประกาศแนะนำ</h2>
        </div>
        <Link href="/listings?featured=1" className="text-sm text-orange-600 hover:underline">
          ดูทั้งหมด →
        </Link>
      </div>

      {/* Horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-4 md:overflow-visible scrollbar-hide">
        {listings.map((listing, i) => (
          <div key={listing.id} className="min-w-[160px] md:min-w-0 flex-shrink-0 md:flex-shrink relative">
            {/* Premium badge */}
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              <Star className="h-2.5 w-2.5 fill-white" />
              Premium
            </div>
            <BrowseCard
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
