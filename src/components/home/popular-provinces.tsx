import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getPopularProvinces, getAllProvincesPublic } from "@/lib/db/listings";
import { AllProvincesDrawer } from "./all-provinces-drawer";

export async function PopularProvinces() {
  const [popular, allProvinces] = await Promise.all([
    getPopularProvinces(12),
    getAllProvincesPublic(),
  ]);

  if (popular.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="font-semibold text-neutral-800 text-lg">🗺️ ประกาศตามจังหวัด</h2>

      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
        {popular.map((prov) => (
          <Link
            key={prov.province_id}
            href={`/province/${prov.slug}`}
            className="flex flex-col items-start rounded-xl border bg-white p-3 hover:border-orange-300 hover:shadow-sm transition-all group"
          >
            <span className="font-medium text-sm text-neutral-800 group-hover:text-orange-600 truncate w-full">
              {prov.name_th}
            </span>
            <span className="text-xs text-neutral-400 mt-0.5">
              {prov.listing_count.toLocaleString("th-TH")} รายการ
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-neutral-300 mt-1 self-end group-hover:text-orange-400" />
          </Link>
        ))}
      </div>

      <AllProvincesDrawer provinces={allProvinces} />
    </section>
  );
}
