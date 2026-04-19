import type { Metadata } from "next";
import { Suspense } from "react";
import { HeroSearch } from "@/components/home/hero-search";
import { NearMeSection } from "@/components/home/near-me-section";
import { getAllProvinces } from "@/lib/db/listings";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "เซ้งร้าน.com - ตลาดซื้อขาย เซ้ง และเช่าร้านค้า ทั่วประเทศไทย",
  description:
    "ค้นหาร้านเซ้ง ร้านให้เช่า ทำเลดีราคาโดนใจทั่วประเทศไทย ซื้อขายเซ้งร้านค้า คาเฟ่ ร้านอาหาร พื้นที่เชิงพาณิชย์",
  openGraph: {
    title: "เซ้งร้าน.com - ตลาดซื้อขายเซ้งร้านค้า ให้เช่า",
    description:
      "รวมร้านค้าทำเลดีทั่วประเทศไทย เซ้งและให้เช่า ราคาโดนใจ ติดต่อได้ทันที",
  },
};

function HeroSkeleton() {
  return (
    <div className="bg-gradient-to-b from-orange-50 to-white border-b py-10 text-center space-y-3 px-4">
      <Skeleton className="h-9 w-80 mx-auto" />
      <Skeleton className="h-5 w-56 mx-auto" />
      <Skeleton className="h-12 w-full max-w-xl mx-auto" />
    </div>
  );
}

export default async function HomePage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const provinces = await getAllProvinces();

  return (
    <div className="flex flex-col">
      {/* Hero + search */}
      <Suspense fallback={<HeroSkeleton />}>
        <HeroSearch />
      </Suspense>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 space-y-12">
        {/* Near me */}
        <NearMeSection provinces={provinces} supabaseUrl={supabaseUrl} />

        {/* More sections added in subsequent commits */}
      </div>
    </div>
  );
}
