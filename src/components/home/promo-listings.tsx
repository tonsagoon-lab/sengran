import Link from "next/link";
import { getPromoListings } from "@/lib/db/listings";
import { BrowseCard } from "@/components/listings/browse-card";

interface PromoListingsProps {
  supabaseUrl: string;
}

export async function PromoListings({ supabaseUrl }: PromoListingsProps) {
  const listings = await getPromoListings(60);
  if (listings.length === 0) return null;

  const shuffled = [...listings].sort(() => Math.random() - 0.5);
  const visible = shuffled.slice(0, 4);
  const hasMore = listings.length > 4;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-neutral-800 text-lg">🔥 โปรโมชั่นล่าสุด</h2>
        {hasMore && (
          <Link
            href="/promotions"
            className="text-sm text-orange-600 hover:underline"
          >
            ดูทั้งหมด ({listings.length}) →
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {visible.map((listing, i) => (
          <BrowseCard
            key={listing.id}
            listing={listing}
            supabaseUrl={supabaseUrl}
            priority={i < 4}
          />
        ))}
      </div>
    </section>
  );
}
