import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllCategories, getAllCategoriesPublic } from "@/lib/db/listings";
import { BrowsePage } from "@/components/listings/browse-page";
import { TopMenuBar } from "@/components/top-menu-bar";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateStaticParams() {
  const categories = await getAllCategoriesPublic();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const categories = await getAllCategories();
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) return { title: "ไม่พบหมวดหมู่" };

  const title = `เซ้ง${cat.name_th} ขายกิจการ และให้เช่า — เซ้งร้าน.com`;
  const description = `ประกาศเซ้ง${cat.name_th} ขายกิจการ รับโอนกิจการ และให้เช่าทั่วประเทศไทย หาทำเลดีราคาโดนใจ ติดต่อเจ้าของได้เลย`;

  return {
    title,
    description,
    openGraph: { title, description },
    alternates: { canonical: `/property-type/${slug}` },
  };
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.xn--72ch7bybxexd0cc.com";

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const categories = await getAllCategories();
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) notFound();

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
      { "@type": "ListItem", position: 3, name: `${cat.name_th} เซ้งและให้เช่า`, item: `${BASE_URL}/property-type/${slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <TopMenuBar />
      <BrowsePage
        searchParams={flat}
        lockedCategory={slug}
        heroTitle={`${cat.name_th} เซ้งและให้เช่า`}
        heroSubtitle={`เซ้ง${cat.name_th} และให้เช่า ทั่วประเทศไทย`}
      />
    </>
  );
}
