import Image from "next/image";
import { getAllCategories, getAllProvinces } from "@/lib/db/listings";
import { SearchBox } from "@/components/listings/search-box";
import { FilterSheet } from "@/components/home/filter-sheet";

export async function HeroSearch() {
  const [categories, provinces] = await Promise.all([
    getAllCategories(),
    getAllProvinces(),
  ]);

  return (
    <section className="relative border-b overflow-hidden">
      {/* Background photo */}
      <Image
        src="/hero-market.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      {/* Dark overlay for text contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/55" />

      {/* Content */}
      <div className="relative mx-auto max-w-3xl px-4 py-14 sm:py-20 text-center space-y-4">
        <h1 className="text-2xl font-bold text-white sm:text-3xl drop-shadow-md">
          ค้นหาร้านเซ้ง ร้านให้เช่า ทั่วประเทศไทย
        </h1>
        <p className="text-sm text-white/90 drop-shadow">
          รวมเซ้งร้าน ร้านให้เช่า ทำเลดี มากกว่า{" "}
          <span className="font-semibold text-amber-300">10,000+</span>{" "}
          รายการ ทั่วประเทศ กว่า 10 ปี
        </p>

        <div className="mx-auto flex w-full max-w-xl items-stretch gap-2 rounded-2xl bg-white/95 backdrop-blur p-2 shadow-xl ring-1 ring-black/5">
          <div className="flex-1 min-w-0">
            <SearchBox targetPath="/listings" />
          </div>
          <FilterSheet categories={categories} provinces={provinces} />
        </div>
      </div>
    </section>
  );
}
