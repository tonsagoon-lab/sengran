"use client";

import { useEffect, useCallback, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Banner } from "@/lib/db/listings";

interface BannerSliderClientProps {
  banners: Banner[];
}

export function BannerSliderClient({ banners }: BannerSliderClientProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  // Track active dot
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  // Autoplay every 5 seconds
  useEffect(() => {
    if (!emblaApi || banners.length <= 1) return;
    const timer = setInterval(() => emblaApi.scrollNext(), 5000);
    return () => clearInterval(timer);
  }, [emblaApi, banners.length]);

  if (banners.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {banners.map((banner) => {
            const inner = (
              <div className="relative w-full aspect-[3/2] shrink-0 flex-none bg-neutral-100">
                <Image
                  src={banner.image_url}
                  alt={banner.title ?? "ประกาศ"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 1280px"
                  priority
                />
              </div>
            );
            return (
              <div key={banner.id} className="min-w-0 flex-[0_0_100%]">
                {banner.link_url ? (
                  <a href={banner.link_url} aria-label={banner.title ?? undefined}>
                    {inner}
                  </a>
                ) : (
                  inner
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Arrows (desktop only) */}
      {banners.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 hidden md:flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-neutral-700 shadow hover:bg-white"
            aria-label="ก่อนหน้า"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-neutral-700 shadow hover:bg-white"
            aria-label="ถัดไป"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === selectedIndex ? "bg-white w-4" : "bg-white/50 w-1.5"
              }`}
              aria-label={`สไลด์ ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
