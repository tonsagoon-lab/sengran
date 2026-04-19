import Link from "next/link";
import { getTotalListingCount } from "@/lib/db/listings";
import { SearchBox } from "@/components/listings/search-box";

const QUICK_CHIPS = [
  { label: "เซ้ง", href: "/listings?type=sale" },
  { label: "ให้เช่า", href: "/listings?type=rent" },
  { label: "ในกรุงเทพ", href: "/listings?province=bangkok" },
  { label: "ร้านอาหาร", href: "/listings?cat=restaurant" },
  { label: "คาเฟ่", href: "/listings?cat=cafe" },
];

export async function HeroSearch() {
  const count = await getTotalListingCount();

  return (
    <section className="bg-gradient-to-b from-orange-50 to-white border-b">
      <div className="mx-auto max-w-3xl px-4 py-10 text-center space-y-4">
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
          ค้นหาร้านเซ้ง ร้านให้เช่า ทั่วประเทศไทย
        </h1>
        <p className="text-sm text-neutral-500">
          รวมร้านค้าทำเลดี กว่า{" "}
          <span className="font-semibold text-orange-600">
            {count.toLocaleString("th-TH")}
          </span>{" "}
          รายการ ทั่วประเทศ
        </p>

        <SearchBox targetPath="/listings" />

        {/* Quick chips */}
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          {QUICK_CHIPS.map((chip) => (
            <Link
              key={chip.href}
              href={chip.href}
              className="inline-flex items-center rounded-full border border-orange-200 bg-white px-3 py-1 text-xs text-orange-700 hover:bg-orange-50 transition-colors"
            >
              {chip.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
