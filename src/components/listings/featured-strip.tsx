import { getFeaturedListings } from "@/lib/db/listings";
import { BrowseCard } from "./browse-card";

interface FeaturedStripProps {
  supabaseUrl: string;
}

export async function FeaturedStrip({ supabaseUrl }: FeaturedStripProps) {
  const listings = await getFeaturedListings();
  if (listings.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-neutral-800">⭐ ประกาศแนะนำ</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory">
        {listings.map((listing) => (
          <div key={listing.id} className="w-56 shrink-0 snap-start md:w-64">
            <BrowseCard listing={listing} supabaseUrl={supabaseUrl} priority />
          </div>
        ))}
      </div>
    </div>
  );
}
