import { Suspense } from "react";
import { getAllCategories, getAllProvinces, getAllAmenities, getTotalListingCount } from "@/lib/db/listings";
import { FilterBar } from "./filter-bar";
import { ListingsGrid } from "./listings-grid";
import { FeaturedStrip } from "./featured-strip";
import { SearchBox } from "./search-box";
import type { SearchParams } from "@/lib/db/listings";
import { Skeleton } from "@/components/ui/skeleton";

interface BrowsePageProps {
  searchParams: SearchParams;
  heroTitle?: string;
  heroSubtitle?: string;
  lockedProvince?: string;
  lockedCategory?: string;
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col rounded-xl border bg-white overflow-hidden">
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export async function BrowsePage({
  searchParams,
  heroTitle,
  heroSubtitle,
  lockedProvince,
  lockedCategory,
}: BrowsePageProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const mergedParams: SearchParams = {
    ...searchParams,
    ...(lockedProvince ? { province: lockedProvince } : {}),
    ...(lockedCategory ? { cat: lockedCategory } : {}),
  };

  const isGpsMode = Boolean(searchParams.lat && searchParams.lng);
  const radiusKm = searchParams.radius ?? "10";

  const [categories, provinces, amenities, total] = await Promise.all([
    getAllCategories(),
    getAllProvinces(),
    getAllAmenities(),
    !heroSubtitle && !isGpsMode ? getTotalListingCount() : Promise.resolve(0),
  ]);

  const defaultTitle = isGpsMode
    ? `📍 ร้านใกล้คุณ (ภายใน ${radiusKm} กม.)`
    : "ค้นหาร้านเซ้ง ร้านให้เช่า ทั่วประเทศไทย";
  const resolvedTitle = heroTitle ?? defaultTitle;
  const subtitle = heroSubtitle ?? (isGpsMode
    ? "ร้านค้าที่อยู่ใกล้พิกัดของคุณ เรียงตามระยะทาง"
    : `พบร้านค้าทำเลดี ราคาโดน กว่า ${total.toLocaleString("th-TH")} รายการ`);

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-orange-50 to-white border-b">
        <div className="mx-auto max-w-3xl px-4 py-8 text-center space-y-3">
          <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">{resolvedTitle}</h1>
          <p className="text-sm text-neutral-500">{subtitle}</p>
          <SearchBox defaultValue={searchParams.q ?? ""} />
        </div>
      </section>

      {/* Filter bar */}
      <FilterBar categories={categories} provinces={provinces} amenities={amenities} lockedCategory={lockedCategory} lockedProvince={lockedProvince} />

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-8">
        {/* Featured strip — only on page 1, no locked filters, no search */}
        {!lockedProvince && !lockedCategory && !searchParams.q && (!searchParams.page || searchParams.page === "1") && (
          <Suspense fallback={null}>
            <FeaturedStrip supabaseUrl={supabaseUrl} />
          </Suspense>
        )}

        {/* Main grid */}
        <Suspense fallback={<GridSkeleton />}>
          <ListingsGrid searchParams={mergedParams} supabaseUrl={supabaseUrl} />
        </Suspense>
      </main>
    </>
  );
}
