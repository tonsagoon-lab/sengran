import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getAllProvinces } from "@/lib/db/listings";
import { REGIONS, getRegionBySlug } from "@/lib/utils/regions";
import { TopMenuBar } from "@/components/top-menu-bar";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return REGIONS.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const region = getRegionBySlug(slug);
  if (!region) return { title: "ไม่พบภาค" };

  const title = `ประกาศร้าน${region.name_th} เซ้งและให้เช่า — เซ้งร้าน.com`;
  const description = `ค้นหาร้านเซ้งและให้เช่าใน${region.name_th} ราคาโดนใจ ทำเลดี ติดต่อได้ทันที`;

  return {
    title,
    description,
    openGraph: { title, description },
    alternates: { canonical: `/state/${slug}` },
  };
}

export default async function RegionPage({ params }: Props) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const region = getRegionBySlug(slug);
  if (!region) notFound();

  const allProvinces = await getAllProvinces();
  const regionProvinces = allProvinces.filter((p) => p.region === slug);

  if (regionProvinces.length === 0) notFound();

  return (
    <>
    <TopMenuBar />
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-neutral-800">
          ประกาศร้าน{region.name_th}
        </h1>
        <p className="text-neutral-500 text-sm">
          ร้านเซ้งและให้เช่าใน{region.name_th} — เลือกจังหวัดเพื่อดูประกาศ
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold text-neutral-700">จังหวัดใน{region.name_th}</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {regionProvinces.map((p) => (
            <Link
              key={p.id}
              href={`/city/${p.slug}`}
              className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm hover:border-orange-300 hover:text-orange-700 transition-colors"
            >
              {p.name_th}
              <ChevronRight className="h-3.5 w-3.5 opacity-40" />
            </Link>
          ))}
        </div>
      </section>
    </div>
    </>
  );
}
