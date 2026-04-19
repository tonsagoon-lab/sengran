import type { Metadata } from "next";
import { BrowsePage } from "@/components/listings/browse-page";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const page = typeof params.page === "string" ? parseInt(params.page) : 1;

  const title = q
    ? `"${q}" — เซ้งร้าน.com`
    : "เซ้งร้าน.com — ตลาดซื้อขายเซ้งร้านค้า ให้เช่า";
  const description = "ค้นหาร้านเซ้ง ร้านให้เช่า ทำเลดีทั่วประเทศไทย พบร้านค้าราคาโดนใจได้ที่นี่";

  return {
    title,
    description,
    openGraph: { title, description },
    ...(page > 1 ? { robots: { index: false } } : {}),
  };
}

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;

  // Flatten string[] to string for searchParams
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string") flat[k] = v;
    else if (Array.isArray(v) && v[0]) flat[k] = v[0];
  }

  return <BrowsePage searchParams={flat} />;
}
