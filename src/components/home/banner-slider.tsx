"use client";

import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import type { Banner } from "@/lib/db/listings";

interface BannerSliderClientProps {
  banners: Banner[];
}

export function BannerSliderClient({ banners }: BannerSliderClientProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi || banners.length <= 1) return;
    const timer = setInterval(() => emblaApi.scrollNext(), 5000);
    return () => clearInterval(timer);
  }, [emblaApi, banners.length]);

  if (banners.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-2">
      <div ref={emblaRef} className="overflow-hidden rounded-lg">
        <div className="flex">
          {banners.map((banner) => {
            const inner = (
              <div className="relative aspect-[1376/366] w-full shrink-0 flex-none bg-neutral-100">
                <Image
                  src={banner.image_url}
                  alt={banner.title ?? "โฆษณา"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 1024px"
                  quality={90}
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

      {banners.length > 1 && (
        <div className="flex justify-center gap-1">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`h-1 rounded-full transition-all ${
                i === selectedIndex ? "bg-neutral-500 w-3" : "bg-neutral-300 w-1"
              }`}
              aria-label={`สไลด์ ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
