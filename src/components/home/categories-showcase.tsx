import Link from "next/link";
import { getCategoriesWithListings } from "@/lib/db/listings";
import { BrowseCard } from "@/components/listings/browse-card";

interface CategoriesShowcaseProps {
  supabaseUrl: string;
}

export async function CategoriesShowcase({ supabaseUrl }: CategoriesShowcaseProps) {
  const rows = await getCategoriesWithListings();
  if (rows.length === 0) return null;

  return (
    <section className="space-y-8">
      <h2 className="font-semibold text-neutral-800 text-lg">🏷️ ประกาศตามหมวดหมู่</h2>
      {rows.map(({ category, listings }) => (
        <div key={category.id} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-neutral-700">
              {category.icon ? `${category.icon} ` : ""}{category.name_th}
            </h3>
            <Link
              href={`/category/${category.slug}`}
              className="text-sm text-orange-600 hover:underline"
            >
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {listings.map((listing) => (
              <BrowseCard
                key={listing.id}
                listing={listing}
                supabaseUrl={supabaseUrl}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
