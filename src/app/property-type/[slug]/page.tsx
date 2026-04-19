import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllCategories, getAllCategoriesPublic } from "@/lib/db/listings";
import { BrowsePage } from "@/components/listings/browse-page";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateStaticParams() {
  const categories = await getAllCategoriesPublic();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const categories = await getAllCategories();
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) return { title: "ไม่พบหมวดหมู่" };

  const title = `ร้าน${cat.name_th} เซ้งและให้เช่า — เซ้งร้าน.com`;
  const description = `ค้นหาร้าน${cat.name_th} เซ้งและให้เช่าทั่วประเทศไทย ราคาโดนใจ ติดต่อได้ทันที`;

  return {
    title,
    description,
    openGraph: { title, description },
    alternates: { canonical: `/property-type/${slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const categories = await getAllCategories();
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) notFound();

  const rawParams = await searchParams;
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawParams)) {
    if (typeof v === "string") flat[k] = v;
    else if (Array.isArray(v) && v[0]) flat[k] = v[0];
  }

  return (
    <BrowsePage
      searchParams={flat}
      lockedCategory={slug}
      heroTitle={`ร้าน${cat.name_th} เซ้งและให้เช่า`}
      heroSubtitle={`เซ้งร้าน${cat.name_th} และร้านให้เช่า ทั่วประเทศไทย`}
    />
  );
}
