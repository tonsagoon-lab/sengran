// components/home/home-screen.tsx — Client component that composes
// the full Home layout from sub-components. Owns no data fetching —
// receives everything as props from the server component above.

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, ChevronDown, Bell, MessageCircle, Search, SlidersHorizontal, Plus, ChevronRight } from "lucide-react";

import type { Listing, Category } from "@/lib/types";
import { LocationHeader }    from "./location-header";
import { TypePills }         from "./type-pills";
import { CategoryGrid }      from "./category-grid";
import { ListingCard }       from "@/components/listing-card";
import { SectionHeading }    from "@/components/section-heading";
import { BottomNav }         from "@/components/bottom-nav";

type Props = {
  categories: Category[];
  featured:   Listing[];
  latest:     Listing[];
};

export function HomeScreen({ categories, featured, latest }: Props) {
  const router = useRouter();

  return (
    <main className="flex min-h-svh flex-col bg-white pb-[68px]">
      <LocationHeader location="กรุงเทพมหานคร" />

      {/* Search input — taps route to /listings */}
      <div className="px-4 pt-3 pb-1">
        <button
          onClick={() => router.push("/listings")}
          className="flex w-full items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-left transition-colors hover:border-orange-300 hover:bg-orange-50/40"
        >
          <Search className="size-[18px] text-neutral-500" />
          <span className="flex-1 text-sm text-neutral-500">ค้นหาร้าน...</span>
          <SlidersHorizontal className="size-[18px] text-neutral-500" />
        </button>
      </div>

      <TypePills onSelect={(type) => router.push(`/listings?type=${type}`)} />

      {/* Categories */}
      <section className="mt-4">
        <SectionHeading title="หมวดหมู่" linkHref="/listings" linkLabel="ดูทั้งหมด" />
        <CategoryGrid categories={categories} />
      </section>

      {/* Featured — horizontal scroller */}
      <section className="mt-5">
        <SectionHeading title="ประกาศแนะนำ" linkHref="/listings?featured=1" linkLabel="ดูทั้งหมด" />
        <div className="scrollbar-hide flex gap-3 overflow-x-auto px-4 pt-1 pb-2">
          {featured.map((l) => (
            <div key={l.id} className="w-[200px] shrink-0">
              <ListingCard listing={l} />
            </div>
          ))}
        </div>
      </section>

      {/* Latest — 2-col grid */}
      <section className="mt-5">
        <SectionHeading title="🆕 ประกาศล่าสุด" linkHref="/listings" linkLabel="ดูทั้งหมด" />
        <div className="grid grid-cols-2 gap-3 px-4">
          {latest.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      </section>

      {/* Free listing banner */}
      <section className="px-4 pt-5 pb-6">
        <Link
          href="/listings/new"
          className="flex items-center gap-3.5 rounded-xl border border-orange-200 bg-orange-50 p-4 transition-all hover:border-orange-300 hover:bg-orange-100/60"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-orange-500 text-white shadow-sm">
            <Plus className="size-[22px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-[14px] text-orange-700">ลงประกาศฟรี!</span>
            <span className="mt-0.5 block text-xs text-neutral-500">เซ้ง / ให้เช่าร้านของคุณ ไม่มีค่าใช้จ่าย</span>
          </span>
          <ChevronRight className="size-[18px] text-neutral-500" />
        </Link>
      </section>

      <BottomNav active="home" />
    </main>
  );
}
