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
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] bg-neutral-100 overflow-hidden">
      <TopMenuBar />
      <div
        className="flex-1 min-h-0 px-0 sm:px-4 pt-0 sm:pt-3 sm:pb-[10px]"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
      >
        <div className="relative h-full sm:rounded-2xl sm:shadow-lg sm:border sm:border-neutral-200 overflow-hidden">
          <MapLoader listings={listings} categories={categories} />
        </div>
      </div>
    </div>
  );
}
