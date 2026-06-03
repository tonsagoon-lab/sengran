import { getMapListings, getAllCategoriesPublic } from "@/lib/db/listings";
import { TopMenuBar } from "@/components/top-menu-bar";
import { MapLoader } from "@/components/map/map-loader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "แผนที่ประกาศเซ้งร้าน — เซ้งร้าน.com",
  robots: { index: false, follow: false },
};

export const revalidate = 120;

export default async function MapPage() {
  const [listings, categories] = await Promise.all([
    getMapListings(0, 200),
    getAllCategoriesPublic(),
  ]);

  return (
    <div className="flex flex-col min-h-screen bg-neutral-100">
      <TopMenuBar />
      <div className="flex-1 p-3 pb-6">
        <div className="relative h-[68vh] rounded-2xl shadow-lg border border-neutral-200">
          <MapLoader listings={listings} categories={categories} />
        </div>
      </div>
    </div>
  );
}
