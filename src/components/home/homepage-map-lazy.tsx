"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MapPin, ArrowRight, Maximize2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { MapListing } from "@/lib/db/listings";

const MapView = dynamic(
  () => import("@/components/map/map-view").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-neutral-100">
        <Skeleton className="h-full w-full" />
      </div>
    ),
  }
);

interface HomepageMapLazyProps {
  listings: MapListing[];
}

export function HomepageMapLazy({ listings }: HomepageMapLazyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView || !containerRef.current) return;
    const el = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView]);

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-neutral-900 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-500" />
            แผนที่ประกาศเซ้ง
          </h2>
          <p className="text-sm text-neutral-500 mt-0.5">
            เลือกดูร้านตามทำเลบนแผนที่ทั่วไทย
          </p>
        </div>
        <Link
          href="/map"
          className="shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700"
        >
          ดูแผนที่ทั้งหมด
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div
        ref={containerRef}
        className="relative h-[320px] md:h-[420px] w-full overflow-hidden rounded-2xl border bg-neutral-100 shadow-sm"
      >
        {inView ? (
          <MapView
            listings={listings}
            autoLocate={false}
            initialCenter={[13.75, 100.55]}
            initialZoom={10}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200">
            <div className="flex flex-col items-center gap-2 text-neutral-500">
              <MapPin className="h-8 w-8" />
              <span className="text-sm">กำลังโหลดแผนที่…</span>
            </div>
          </div>
        )}

        <Link
          href="/map"
          aria-label="เปิดแผนที่เต็มจอ"
          className="absolute right-3 top-3 z-[500] inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow ring-1 ring-black/5 hover:bg-white"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          <span>เต็มจอ</span>
        </Link>
      </div>
    </section>
  );
}
