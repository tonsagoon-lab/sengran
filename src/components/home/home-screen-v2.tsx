"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, SlidersHorizontal, Plus, ChevronRight } from "lucide-react";

import { LocationHeader } from "./location-header";
import { TypePills } from "./type-pills";
import { CategoryGridV2 } from "./category-grid-v2";
import { ListingCardV2 } from "@/components/listings/listing-card-v2";
import { SectionHeading } from "@/components/shared/section-heading";
import { BottomNav } from "@/components/shared/bottom-nav";

type Category = {
  id: number;
  slug: string;
  name_th: string;
  icon: string | null;
};

type CardListing = {
  id: string;
  slug: string;
  title: string;
  listing_type: "sale" | "rent" | "both";
  sale_price: number | null;
  rent_price: number | null;
  district: string | null;
  is_featured: boolean | null;
  listing_images: { storage_path: string; display_order: number }[];
  categories: { slug: string; name_th: string } | null;
  provinces: { name_th: string } | null;
};

type Props = {
  categories: Category[];
  featured: CardListing[];
  latest: CardListing[];
};

export function HomeScreenV2({ categories, featured, latest }: Props) {
  const router = useRouter();

  return (
    <main className="flex min-h-svh flex-col bg-white pb-[68px]">
      <LocationHeader location="ทั่วประเทศไทย" />

      {/* Search bar */}
      <div className="px-4 pt-3 pb-1">
        <button
          onClick={() => router.push("/listings")}
          className="flex w-full items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-left transition-colors hover:border-orange-300 hover:bg-orange-50/40"
        >
          <Search className="size-[18px] shrink-0 text-neutral-400" />
          <span className="flex-1 text-sm text-neutral-400">ค้นหาร้าน...</span>
          <SlidersHorizontal className="size-[18px] shrink-0 text-neutral-400" />
        </button>
      </div>

      {/* Type pills */}
      <TypePills onSelect={(type) => router.push(`/listings?type=${type}`)} />

      {/* Categories */}
      <section className="mt-4">
        <SectionHeading title="หมวดหมู่" linkHref="/listings" linkLabel="ดูทั้งหมด" />
        <CategoryGridV2 categories={categories} />
      </section>

      {/* Featured — horizontal scroller */}
      {featured.length > 0 && (
        <section className="mt-5">
          <SectionHeading title="ประกาศแนะนำ" linkHref="/listings?featured=1" linkLabel="ดูทั้งหมด" />
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 pt-1">
            {featured.map((l, i) => (
              <div key={l.id} className="w-[200px] shrink-0">
                <ListingCardV2 listing={l} priority={i < 2} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Latest — 2-col grid */}
      {latest.length > 0 && (
        <section className="mt-5">
          <SectionHeading title="🆕 ประกาศล่าสุด" linkHref="/listings" linkLabel="ดูทั้งหมด" />
          <div className="grid grid-cols-2 gap-3 px-4">
            {latest.map((l, i) => (
              <ListingCardV2 key={l.id} listing={l} priority={i < 2} />
            ))}
          </div>
        </section>
      )}

      {/* Free listing CTA */}
      <section className="px-4 pb-6 pt-5">
        <Link
          href="/listings/new"
          className="flex items-center gap-3.5 rounded-xl border border-orange-200 bg-orange-50 p-4 transition-all hover:border-orange-300 hover:bg-orange-100/60"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-orange-500 text-white shadow-sm">
            <Plus className="size-[22px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold text-orange-700">ลงประกาศฟรี!</span>
            <span className="mt-0.5 block text-xs text-neutral-500">เซ้ง / ให้เช่าร้านของคุณ ไม่มีค่าใช้จ่าย</span>
          </span>
          <ChevronRight className="size-[18px] shrink-0 text-neutral-400" />
        </Link>
      </section>

      <BottomNav active="home" />
    </main>
  );
}
