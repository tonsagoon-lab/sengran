import type { Metadata } from "next";
import { TopMenuBar } from "@/components/top-menu-bar";
import { EquipmentBrowsePage } from "@/components/equipment/equipment-browse-page";
import type { EquipmentSearchParams } from "@/lib/db/equipment";

export const revalidate = 60;

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const page = typeof params.page === "string" ? parseInt(params.page) : 1;

  const title = q
    ? `"${q}" — ของมือสอง เซ้งร้าน.com`
    : "ของมือสอง อุปกรณ์ร้านค้า — เซ้งร้าน.com";
  const description =
    "ซื้อขายอุปกรณ์ร้านค้ามือสอง เตาทำอาหาร ตู้แช่ เครื่องชงกาแฟ ราคาดี ทั่วประเทศไทย";

  return {
    title,
    description,
    openGraph: { title, description },
    alternates: { canonical: "/equipment" },
    ...(page > 1 ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function EquipmentPage({ searchParams }: Props) {
  const params = await searchParams;
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string") flat[k] = v;
    else if (Array.isArray(v) && v[0]) flat[k] = v[0];
  }

  return (
    <>
      <TopMenuBar />
      <EquipmentBrowsePage searchParams={flat as EquipmentSearchParams} />
    </>
  );
}
