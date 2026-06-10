import type { Metadata } from "next";

export const revalidate = 60;
import { Suspense } from "react";
import { TopMenuBar } from "@/components/top-menu-bar";
import { HeroSearch } from "@/components/home/hero-search";
import { NearMeSection } from "@/components/home/near-me-section";
import { BannerSection } from "@/components/home/banner-section";
import { CategoryGrid } from "@/components/home/category-grid";
import { LatestListings } from "@/components/home/latest-listings";
import { EditorialPicks } from "@/components/home/editorial-picks";
import { PremiumListings } from "@/components/home/premium-listings";
import { getAllProvinces } from "@/lib/db/listings";
import { Skeleton } from "@/components/ui/skeleton";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.xn--72ch7bybxexd0cc.com";

export const metadata: Metadata = {
  title: "เซ้งร้าน.com — ประกาศเซ้งร้านฟรี ขายกิจการ ให้เช่า",
  description:
    "ประกาศเซ้งร้าน ขายกิจการ รับโอนกิจการ เซ้งร้านอาหาร เซ้งคาเฟ่ ร้านให้เช่าทั่วไทย ลงประกาศฟรี ติดต่อเจ้าของได้เลย",
  alternates: { canonical: "/" },
  openGraph: {
    title: "เซ้งร้าน.com — ประกาศเซ้งร้านฟรี ขายกิจการ ให้เช่า",
    description:
      "ประกาศเซ้งร้าน ขายกิจการ รับโอนกิจการ เซ้งร้านอาหาร เซ้งคาเฟ่ ร้านให้เช่าทั่วไทย ลงประกาศฟรี ติดต่อเจ้าของได้เลย",
    url: BASE_URL,
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

const orgJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      name: "เซ้งร้าน.com",
      url: BASE_URL,
      logo: { "@type": "ImageObject", url: `${BASE_URL}/og-image.png` },
      sameAs: ["https://www.facebook.com/sengran"],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        availableLanguage: "Thai",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      url: BASE_URL,
      name: "เซ้งร้าน.com",
      publisher: { "@id": `${BASE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${BASE_URL}/listings?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default async function HomePage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const provinces = await getAllProvinces();

  return (
    <div className="flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <TopMenuBar />
      {/* Hero + search */}
      <Suspense fallback={<HeroSkeleton />}>
        <HeroSearch />
      </Suspense>

      {/* Category grid */}
      <Suspense fallback={null}>
        <CategoryGrid />
      </Suspense>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 space-y-12">
        {/* Near me */}
        <div id="near-me">
          <NearMeSection provinces={provinces} supabaseUrl={supabaseUrl} />
        </div>

        {/* Editorial picks */}
        <Suspense fallback={null}>
          <EditorialPicks supabaseUrl={supabaseUrl} />
        </Suspense>

        {/* Premium listings */}
        <Suspense fallback={null}>
          <PremiumListings supabaseUrl={supabaseUrl} />
        </Suspense>

        {/* Latest listings */}
        <Suspense fallback={<SectionSkeleton />}>
          <LatestListings supabaseUrl={supabaseUrl} />
        </Suspense>

      </div>

      {/* Banner — before footer */}
      <Suspense fallback={null}>
        <div className="mx-auto w-full max-w-2xl px-4 py-8">
          <BannerSection />
        </div>
      </Suspense>
    </div>
  );
}
