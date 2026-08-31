import Link from "next/link";
import { getPromoListings } from "@/lib/db/listings";
import { BrowseCard } from "@/components/listings/browse-card";

interface PromoListingsProps {
  supabaseUrl: string;
}

export async function PromoListings({ supabaseUrl }: PromoListingsProps) {
  const listings = await getPromoListings(8);
  if (listings.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-neutral-800 text-lg">🔥 โปรโมชั่นล่าสุด</h2>
        <Link
          href="/listings?promo=1"
          className="text-sm text-orange-600 hover:underline"
        >
          ดูทั้งหมด →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {listings.map((listing, i) => (
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
