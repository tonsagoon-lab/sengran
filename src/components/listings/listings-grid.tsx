import { searchListings } from "@/lib/db/listings";
import { BrowseCard } from "./browse-card";
import { BrowsePagination } from "./browse-pagination";
import type { SearchParams } from "@/lib/db/listings";

interface ListingsGridProps {
  searchParams: SearchParams;
  supabaseUrl: string;
}

export async function ListingsGrid({ searchParams, supabaseUrl }: ListingsGridProps) {
  const { listings, total, page, pageSize } = await searchListings(searchParams);
  const totalPages = Math.ceil(total / pageSize);

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-lg font-semibold text-neutral-700">ไม่พบประกาศที่ตรงกับเงื่อนไข</h3>
        <p className="mt-1 text-sm text-neutral-500">ลองปรับตัวกรองหรือดูประกาศทั้งหมด</p>
        <a
          href="/listings"
          className="mt-4 inline-flex items-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          ดูประกาศทั้งหมด
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>พบ {total.toLocaleString("th-TH")} รายการ</span>
        {totalPages > 1 && (
          <span>หน้า {page} จาก {totalPages}</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {listings.map((listing, i) => (
          <BrowseCard
            key={listing.id}
            listing={listing}
            supabaseUrl={supabaseUrl}
            priority={i < 4}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <BrowsePagination page={page} totalPages={totalPages} />
      )}
    </div>
  );
}
