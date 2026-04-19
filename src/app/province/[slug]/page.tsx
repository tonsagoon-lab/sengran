import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllProvinces, getAllProvincesPublic } from "@/lib/db/listings";
import { BrowsePage } from "@/components/listings/browse-page";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateStaticParams() {
  const provinces = await getAllProvincesPublic();
  return provinces.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const provinces = await getAllProvinces();
  const prov = provinces.find((p) => p.slug === slug);
  if (!prov) return { title: "ไม่พบจังหวัด" };

  const title = `ประกาศร้านใน${prov.name_th} เซ้งและให้เช่า — เซ้งร้าน.com`;
  const description = `ค้นหาร้านเซ้งและให้เช่าใน${prov.name_th} ราคาโดนใจ ทำเลดี ติดต่อได้ทันที`;

  return {
    title,
    description,
    openGraph: { title, description },
    alternates: { canonical: `/province/${slug}` },
  };
}

export default async function ProvincePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const provinces = await getAllProvinces();
  const prov = provinces.find((p) => p.slug === slug);
  if (!prov) notFound();

  const rawParams = await searchParams;
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawParams)) {
    if (typeof v === "string") flat[k] = v;
    else if (Array.isArray(v) && v[0]) flat[k] = v[0];
  }

  return (
    <BrowsePage
      searchParams={flat}
      lockedProvince={slug}
      heroTitle={`ประกาศร้านใน${prov.name_th}`}
      heroSubtitle={`ร้านเซ้งและให้เช่าใน${prov.name_th} ราคาโดนใจ ทำเลดี`}
    />
  );
}
