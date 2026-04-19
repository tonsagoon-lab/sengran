"use client";

import { useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ImageGalleryProps {
  images: { storage_path: string; alt_text?: string | null }[];
  supabaseUrl: string;
}

export function ImageGallery({ images, supabaseUrl }: ImageGalleryProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: images.length > 1 });

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (images.length === 0) {
    return (
      <div className="w-full aspect-[4/3] rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-400">
        ไม่มีรูปภาพ
      </div>
    );
  }

  return (
    <div className="relative group rounded-xl overflow-hidden">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {images.map((img, idx) => (
            <div key={idx} className="relative flex-[0_0_100%] aspect-[4/3]">
              <Image
                src={`${supabaseUrl}/storage/v1/object/public/listings/${img.storage_path}`}
                alt={img.alt_text ?? `รูปที่ ${idx + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
                priority={idx === 0}
              />
            </div>
          ))}
        </div>
      </div>

      {images.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs rounded-full px-2 py-0.5">
            {images.length} รูป
          </div>
        </>
      )}
    </div>
  );
}
