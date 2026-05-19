import Link from "next/link";
import * as Icons from "lucide-react";

type Category = {
  id: number;
  slug: string;
  name_th: string;
  icon: string | null;
};

function getIcon(name: string | null): React.ComponentType<{ className?: string }> {
  if (!name) return Icons.Store;
  const Comp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  return Comp ?? Icons.Store;
}

export function CategoryGridV2({ categories }: { categories: Category[] }) {
  return (
    <div className="grid grid-cols-4 gap-2 px-4">
      {categories.slice(0, 8).map((c) => {
        const Icon = getIcon(c.icon);
        return (
          <Link
            key={c.id}
            href={`/property-type/${c.slug}`}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-1 py-3 transition-all hover:border-orange-300 hover:bg-orange-50/40 hover:shadow-sm active:scale-95"
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
