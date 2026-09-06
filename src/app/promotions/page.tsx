import Link from "next/link";
import type { Metadata } from "next";
import { Flame } from "lucide-react";
import { getPromoListings } from "@/lib/db/listings";
import { BrowseCard } from "@/components/listings/browse-card";
import { TopMenuBar } from "@/components/top-menu-bar";

export const metadata: Metadata = {
  title: "โปรโมชั่นล่าสุด — เซ้งร้าน.com",
  description: "รวมประกาศเซ้งร้านที่กำลังลดราคาพิเศษ",
  robots: { index: true, follow: true },
};

export const revalidate = 60;

export default async function PromotionsPage() {
  const listings = await getPromoListings(96);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  return (
    <>
      <TopMenuBar />
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-2">
          <Flame className="h-6 w-6 text-orange-500" />
          <h1 className="text-xl font-bold text-neutral-900">โปรโมชั่นล่าสุด</h1>
          <span className="text-sm text-neutral-400">({listings.length} ประกาศ)</span>
        </div>

        {listings.length === 0 ? (
          <p className="text-neutral-400 text-sm text-center py-12">
            ยังไม่มีประกาศที่ลดราคาในตอนนี้
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {listings.map((l, i) => (
              <BrowseCard
                key={l.id}
                listing={l}
                supabaseUrl={supabaseUrl}
                priority={i < 4}
              />
            ))}
          </div>
        )}

        <div className="pt-4">
          <Link href="/listings" className="text-sm text-orange-600 hover:underline">
            ← ดูประกาศทั้งหมด
          </Link>
        </div>
      </div>
    </>
  );
}
