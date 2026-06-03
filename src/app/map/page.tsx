import { getAllCategoriesPublic, getAllProvincesPublic } from "@/lib/db/listings";
import { TopMenuBar } from "@/components/top-menu-bar";
import { MapLoader } from "@/components/map/map-loader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "แผนที่ประกาศเซ้งร้าน — เซ้งร้าน.com",
  robots: { index: false, follow: false },
};

export const revalidate = 120;

export default async function MapPage() {
  const [categories, provinces] = await Promise.all([
    getAllCategoriesPublic(),
    getAllProvincesPublic(),
  ]);

  return (
    <div className="flex flex-col h-screen">
      <TopMenuBar />
      <div className="flex-1 min-h-0 relative">
        <MapLoader categories={categories} provinces={provinces} />
      </div>
    </div>
  );
}
