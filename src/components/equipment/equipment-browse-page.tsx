import { Suspense } from "react";
import { getAllProvinces } from "@/lib/db/listings";
import { getEquipmentCategories, searchEquipment } from "@/lib/db/equipment";
import { EquipmentFilterBar } from "./equipment-filter-bar";
import { EquipmentCard } from "./equipment-card";
import { SearchBox } from "@/components/listings/search-box";
import { BrowsePagination } from "@/components/listings/browse-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import type { EquipmentSearchParams } from "@/lib/db/equipment";

interface EquipmentBrowsePageProps {
  searchParams: EquipmentSearchParams;
  lockedCategory?: string;
  heroTitle?: string;
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col rounded-xl border bg-white overflow-hidden">
          <Skeleton className="aspect-video w-full rounded-none" />
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

async function EquipmentGrid({
  searchParams,
}: {
  searchParams: EquipmentSearchParams;
}) {
  const { listings, total, page, pageSize } = await searchEquipment(searchParams);
  const totalPages = Math.ceil(total / pageSize);

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-6xl mb-4">🔧</div>
        <h3 className="text-lg font-semibold text-neutral-700">ไม่พบอุปกรณ์ที่ตรงกับเงื่อนไข</h3>
        <p className="mt-1 text-sm text-neutral-500">ลองปรับตัวกรองหรือดูอุปกรณ์ทั้งหมด</p>
        <a
          href="/equipment"
          className="mt-4 inline-flex items-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          ดูทั้งหมด
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>พบ {total.toLocaleString("th-TH")} รายการ</span>
        {totalPages > 1 && <span>หน้า {page} จาก {totalPages}</span>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {listings.map((listing, i) => (
          <EquipmentCard
            key={listing.id}
            listing={listing}
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

export async function EquipmentBrowsePage({
  searchParams,
  lockedCategory,
  heroTitle = "ของมือสอง อุปกรณ์ร้านค้า ราคาดี",
}: EquipmentBrowsePageProps) {
  const mergedParams: EquipmentSearchParams = {
    ...searchParams,
    ...(lockedCategory ? { cat: lockedCategory } : {}),
  };

  const [categories, provinces] = await Promise.all([
    getEquipmentCategories(),
    getAllProvinces(),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-orange-50 to-white border-b">
        <div className="mx-auto max-w-3xl px-4 py-8 text-center space-y-3">
          <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">{heroTitle}</h1>
          <p className="text-sm text-neutral-500">
            เลือกซื้ออุปกรณ์ร้านค้ามือสองคุณภาพดี ราคาถูก จากผู้ขายทั่วประเทศ
          </p>
          <SearchBox defaultValue={searchParams.q ?? ""} />
          <a
            href="/equipment/new"
            className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-orange-600 transition-colors"
          >
            + ลงขายอุปกรณ์ฟรี
          </a>
        </div>
      </section>

      {/* Category pills */}
      {!lockedCategory && categories.length > 0 && (
        <div className="border-b bg-white">
          <div className="mx-auto max-w-7xl px-4 py-2">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <a
                href="/equipment"
                className="shrink-0 rounded-full border px-3 py-1 text-sm transition-colors border-neutral-300 text-neutral-600 bg-white hover:border-orange-400 hover:text-orange-600"
              >
                ทั้งหมด
              </a>
              {categories.map((cat) => (
                <a
                  key={cat.id}
                  href={`/equipment?cat=${cat.slug}`}
                  className="shrink-0 rounded-full border px-3 py-1 text-sm transition-colors border-neutral-300 text-neutral-600 bg-white hover:border-orange-400 hover:text-orange-600"
                >
                  {cat.name_th}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <EquipmentFilterBar
        categories={categories}
        provinces={provinces}
        lockedCategory={lockedCategory}
      />

      <main className="mx-auto max-w-7xl px-4 py-6">
        <Suspense fallback={<GridSkeleton />}>
          <EquipmentGrid searchParams={mergedParams} />
        </Suspense>
      </main>
    </>
  );
}
