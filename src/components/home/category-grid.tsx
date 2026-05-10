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

export async function CategoryGrid() {
  const categories = await getAllCategoriesPublic();
  if (categories.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-5">
      <div className="grid grid-cols-5 gap-3 sm:grid-cols-5 md:grid-cols-10">
        {categories.map((cat) => {
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
      </div>
    </section>
  );
}
