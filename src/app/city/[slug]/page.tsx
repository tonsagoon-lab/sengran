import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllProvinces, getAllProvincesPublic } from "@/lib/db/listings";
import { BrowsePage } from "@/components/listings/browse-page";
import { TopMenuBar } from "@/components/top-menu-bar";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateStaticParams() {
  const provinces = await getAllProvincesPublic();
  return provinces.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const provinces = await getAllProvinces();
  const prov = provinces.find((p) => p.slug === slug);
  if (!prov) return { title: "ไม่พบจังหวัด" };

  const title = `เซ้งร้านใน${prov.name_th} ขายกิจการ และให้เช่า — เซ้งร้าน.com`;
  const description = `ประกาศเซ้งร้าน ขายกิจการ รับโอนกิจการ และร้านให้เช่าใน${prov.name_th} ทำเลดีราคาโดนใจ ติดต่อเจ้าของได้เลย`;

  return {
    title,
    description,
    openGraph: { title, description },
    alternates: { canonical: `/city/${slug}` },
  };
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.xn--72ch7bybxexd0cc.com";

export default async function ProvincePage({ params, searchParams }: Props) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const provinces = await getAllProvinces();
  const prov = provinces.find((p) => p.slug === slug);
  if (!prov) notFound();

  const rawParams = await searchParams;
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawParams)) {
    if (typeof v === "string") flat[k] = v;
    else if (Array.isArray(v) && v[0]) flat[k] = v[0];
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "หน้าแรก", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "ประกาศทั้งหมด", item: `${BASE_URL}/listings` },
      { "@type": "ListItem", position: 3, name: `ประกาศร้านใน${prov.name_th}`, item: `${BASE_URL}/city/${slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <TopMenuBar />
      <BrowsePage
        searchParams={flat}
        lockedProvince={slug}
        heroTitle={`ประกาศร้านใน${prov.name_th}`}
        heroSubtitle={`ร้านเซ้งและให้เช่าใน${prov.name_th} ราคาโดนใจ ทำเลดี`}
      />
    </>
  );
}
