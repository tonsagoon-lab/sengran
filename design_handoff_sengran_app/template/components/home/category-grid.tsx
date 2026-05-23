// components/home/category-grid.tsx — 4×2 icon-bubble grid
import Link from "next/link";
import * as Icons from "lucide-react";
import type { Category } from "@/lib/types";

// Resolve the icon name string from the DB to a Lucide component.
// Defaults to `Store` if the name doesn't match — guards against
// CMS edits introducing typos.
function getIcon(name: string): React.ComponentType<{ className?: string }> {
  const Comp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  return Comp ?? Icons.Store;
}

export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <div className="grid grid-cols-4 gap-2 px-4">
      {categories.map((c) => {
        const Icon = getIcon(c.icon_name);
        return (
          <Link
            key={c.id}
            href={`/category/${c.slug}`}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-1 py-3 transition-all hover:border-orange-300 hover:bg-orange-50/40 hover:shadow-sm"
          >
            <span className="grid size-10 place-items-center rounded-full bg-orange-100 text-orange-600">
              <Icon className="size-5" />
            </span>
            <span className="line-clamp-2 text-center text-[11px] leading-tight text-neutral-700">
              {c.name_th}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
