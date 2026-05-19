import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAllCategoriesPublic, getAllProvinces } from "@/lib/db/listings";

// Desktop
import { TopMenuBar } from "@/components/top-menu-bar";
import { HeroSearch } from "@/components/home/hero-search";
import { NearMeSection } from "@/components/home/near-me-section";
import { BannerSection } from "@/components/home/banner-section";
import { CategoryGrid } from "@/components/home/category-grid";
import { LatestListings } from "@/components/home/latest-listings";
import { EditorialPicks } from "@/components/home/editorial-picks";
import { PremiumListings } from "@/components/home/premium-listings";
import { Skeleton } from "@/components/ui/skeleton";

// Mobile V2
import { HomeScreenV2 } from "@/components/home/home-screen-v2";
import { HomeSkeleton } from "@/components/home/home-skeleton";
import { resolveImageUrl } from "@/lib/utils/image-url";

export const metadata: Metadata = {
  title: "เซ้งร้าน.com ประกาศเซ้งร้านฟรี เซ้งร้านกาแฟ เซ้งคาเฟ่ เซ้งร้านอาหาร เซ้งร้านเหล้า เซ้งกิจการต่างๆ",
  description:
    "ประกาศเซ้งร้านฟรี เซ้งร้านกาแฟ เซ้งคาเฟ่ เซ้งร้านอาหาร เซ้งร้านเหล้า เซ้งกิจการทุกประเภท ทำเลดีทั่วประเทศไทย ติดต่อได้ทันที",
  openGraph: {
    title: "เซ้งร้าน.com ประกาศเซ้งร้านฟรี เซ้งร้านกาแฟ เซ้งคาเฟ่ เซ้งร้านอาหาร",
    description:
      "ประกาศเซ้งร้านฟรี เซ้งร้านกาแฟ เซ้งคาเฟ่ เซ้งร้านอาหาร เซ้งร้านเหล้า เซ้งกิจการทุกประเภท ทำเลดีทั่วประเทศไทย",
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

function SectionSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-40" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-white overflow-hidden">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function MobileHome() {
  const supabase = await createClient();
  const [categories, featuredRes, latestRes] = await Promise.all([
    getAllCategoriesPublic(),
    supabase
      .from("listings")
      .select(`id, slug, title, listing_type, sale_price, rent_price, district, is_featured,
        listing_images(storage_path, display_order),
        categories(slug, name_th), provinces(name_th)`)
      .eq("status", "published")
      .eq("is_featured", true)
      .order("boost_rank", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(8),
    supabase
      .from("listings")
      .select(`id, slug, title, listing_type, sale_price, rent_price, district, is_featured,
        listing_images(storage_path, display_order),
        categories(slug, name_th), provinces(name_th)`)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(4),
  ]);

  return (
    <HomeScreenV2
      categories={categories}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      featured={(featuredRes.data ?? []) as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      latest={(latestRes.data ?? []) as any}
    />
  );
}

export default async function HomePage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const provinces = await getAllProvinces();

  return (
    <>
      {/* ── Mobile: new V2 design ── */}
      <div className="md:hidden">
        <Suspense fallback={<HomeSkeleton />}>
          <MobileHome />
        </Suspense>
      </div>

      {/* ── Desktop: existing design ── */}
      <div className="hidden md:flex md:flex-col">
        <TopMenuBar />
        <Suspense fallback={<HeroSkeleton />}>
          <HeroSearch />
        </Suspense>
        <Suspense fallback={null}>
          <CategoryGrid />
        </Suspense>
        <div className="mx-auto w-full max-w-7xl px-4 py-8 space-y-12">
          <div id="near-me">
            <NearMeSection provinces={provinces} supabaseUrl={supabaseUrl} />
          </div>
          <Suspense fallback={null}>
            <EditorialPicks supabaseUrl={supabaseUrl} />
          </Suspense>
          <Suspense fallback={null}>
            <PremiumListings supabaseUrl={supabaseUrl} />
          </Suspense>
          <Suspense fallback={<SectionSkeleton />}>
            <LatestListings supabaseUrl={supabaseUrl} />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <div className="mx-auto w-full max-w-2xl px-4 py-8">
            <BannerSection />
          </div>
        </Suspense>
      </div>
    </>
  );
}
