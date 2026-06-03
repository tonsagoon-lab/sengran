import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getMapListings } from "@/lib/db/listings";
import { TopMenuBar } from "@/components/top-menu-bar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "แผนที่ประกาศเซ้งร้าน — เซ้งร้าน.com",
  robots: { index: false, follow: false },
};

export const revalidate = 120;

const MapView = dynamic(
  () => import("@/components/map/map-view").then((m) => m.MapView),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-neutral-400 text-sm">กำลังโหลดแผนที่…</div> }
);

export default async function MapPage() {
  const listings = await getMapListings();

  return (
    <div className="flex flex-col h-screen">
      <TopMenuBar />

      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-white shrink-0">
        <Link href="/listings" className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          กลับ
        </Link>
        <div className="h-4 w-px bg-neutral-200" />
        <h1 className="text-sm font-semibold text-neutral-800">แผนที่ประกาศ</h1>
        <span className="text-xs text-neutral-400">(เฉพาะที่มีพิกัด)</span>
      </div>

      {/* Map fills remaining height */}
      <div className="flex-1 min-h-0">
        <MapView listings={listings} />
      </div>
    </div>
  );
}
