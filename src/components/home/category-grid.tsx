import Link from "next/link";
import {
  UtensilsCrossed, Coffee, Scissors, Sparkles, ShoppingBasket,
  WashingMachine, Car, Store, Music, LayoutGrid, type LucideIcon,
} from "lucide-react";
import { getAllCategoriesPublic } from "@/lib/db/listings";

const ICON_MAP: Record<string, LucideIcon> = {
  UtensilsCrossed,
  Coffee,
  Scissors,
  Sparkles,
  ShoppingBasket,
  WashingMachine,
  Car,
  Store,
  Music,
  LayoutGrid,
};

// คีย์เวิร์ดใน name_th ที่อยากโชว์หน้าแรก — เรียงตามลำดับที่ต้องการ
const FEATURED_KEYWORDS = [
  "ร้านอาหาร",
  "คาเฟ่",
  "เสริมสวย",
  "คลินิก",
  "เหล้า",
  "หอพัก",
  "ซักอบรีด",
];

export async function CategoryGrid() {
  const categories = await getAllCategoriesPublic();
  if (categories.length === 0) return null;

  const featured = FEATURED_KEYWORDS
    .map((kw) => categories.find((c) => c.name_th.includes(kw)))
    .filter((c): c is NonNullable<typeof c> => !!c);

  const visible = featured.length >= 3 ? featured : categories.slice(0, 7);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-5">
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
        {visible.map((cat) => {
          const Icon = (cat.icon && ICON_MAP[cat.icon]) ? ICON_MAP[cat.icon] : Store;
          return (
            <Link
              key={cat.id}
              href={`/property-type/${cat.slug}`}
              className="flex flex-col items-center gap-2 rounded-xl border bg-white px-2 py-3 text-center hover:border-orange-300 hover:bg-orange-50 transition-colors"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100">
                <Icon className="h-5 w-5 text-orange-500" />
              </div>
              <span className="text-xs text-neutral-700 leading-tight line-clamp-2">
                {cat.name_th}
              </span>
            </Link>
          );
        })}

        {/* ปุ่มหมวดหมู่อื่นๆ */}
        <Link
          href="/listings"
          className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-2 py-3 text-center hover:border-orange-300 hover:bg-orange-50 transition-colors"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100">
            <LayoutGrid className="h-5 w-5 text-neutral-400" />
          </div>
          <span className="text-xs text-neutral-500 leading-tight">หมวดหมู่อื่นๆ</span>
        </Link>
      </div>
    </section>
  );
}
