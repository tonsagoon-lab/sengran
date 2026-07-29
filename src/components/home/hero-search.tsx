import { getAllCategories, getAllProvinces } from "@/lib/db/listings";
import { SearchBox } from "@/components/listings/search-box";
import { FilterSheet } from "@/components/home/filter-sheet";

export async function HeroSearch() {
  const [categories, provinces] = await Promise.all([
    getAllCategories(),
    getAllProvinces(),
  ]);

  return (
    <section className="bg-gradient-to-b from-orange-50 to-white border-b">
      <div className="mx-auto max-w-3xl px-4 py-10 text-center space-y-4">
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
          ค้นหาร้านเซ้ง ร้านให้เช่า ทั่วประเทศไทย
        </h1>
        <p className="text-sm text-neutral-500">
          รวมเซ้งร้าน ร้านให้เช่า ทำเลดี มากกว่า{" "}
          <span className="font-semibold text-orange-600">10,000+</span>{" "}
          รายการ ทั่วประเทศ กว่า 10 ปี
        </p>

        <div className="mx-auto flex w-full max-w-xl items-stretch gap-2">
          <div className="flex-1 min-w-0">
            <SearchBox targetPath="/listings" />
          </div>
          <FilterSheet categories={categories} provinces={provinces} />
        </div>
      </div>
    </section>
  );
}
