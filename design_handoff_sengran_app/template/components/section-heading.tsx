// components/section-heading.tsx — reusable section header
import Link from "next/link";

export function SectionHeading({
  title,
  linkHref,
  linkLabel = "ดูทั้งหมด",
}: {
  title: string;
  linkHref?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between px-4">
      <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
      {linkHref && (
        <Link href={linkHref} className="text-xs font-medium text-orange-600 transition-colors hover:text-orange-700">
          {linkLabel} ›
        </Link>
      )}
    </div>
  );
}
