"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils/image-url";

interface ImageGalleryProps {
  images: { storage_path: string; alt_text?: string | null }[];
  supabaseUrl: string;
}

export function ImageGallery({ images, supabaseUrl }: ImageGalleryProps) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [failedPaths, setFailedPaths] = useState<Set<string>>(new Set());

  const validImages = images.filter((img) => !failedPaths.has(img.storage_path));
  const safeActive = Math.min(active, Math.max(0, validImages.length - 1));

  const handleError = (path: string) => {
    setFailedPaths((prev) => {
      const next = new Set(prev);
      next.add(path);
      return next;
    });
  };

  if (validImages.length === 0) {
    return (
      <div className="w-full aspect-[4/3] rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-400">
        ไม่มีรูปภาพ
      </div>
    );
  }

  const url = (path: string) => resolveImageUrl(path);

  const prev = () => setActive((a) => (a - 1 + validImages.length) % validImages.length);
  const next = () => setActive((a) => (a + 1) % validImages.length);

  return (
    <div className="space-y-2">
      {/* Main image */}
      <div className="relative w-full aspect-[16/9] max-h-96 rounded-xl overflow-hidden bg-neutral-100 group">
        <Image
          src={url(validImages[safeActive].storage_path)}
          alt={validImages[safeActive].alt_text ?? `รูปที่ ${safeActive + 1}`}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 800px"
          priority
          onError={() => handleError(validImages[safeActive].storage_path)}
        />

        {/* Prev / Next buttons */}
        {validImages.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="รูปก่อนหน้า"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="รูปถัดไป"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs rounded-full px-2 py-0.5">
              {safeActive + 1}/{validImages.length}
            </div>
          </>
        )}

        {/* Expand button */}
        <button
          onClick={() => setLightbox(true)}
          className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="ขยายรูป"
        >
          <Expand className="h-4 w-4" />
        </button>

        {images.length > 1 && (
          <>
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-neutral-300"
            aria-label="ปิด"
          >
            <X className="h-7 w-7" />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3"
                aria-label="รูปก่อนหน้า"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3"
                aria-label="รูปถัดไป"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div
            className="relative w-full max-w-4xl max-h-[90vh] mx-8"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={url(images[active].storage_path)}
              alt={images[active].alt_text ?? `รูปที่ ${active + 1}`}
              className="w-full h-full object-contain max-h-[90vh]"
            />
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs rounded-full px-3 py-1">
              {active + 1} / {images.length}
            </div>
          </div>
        </div>
      )}

      {/* Thumbnails */}
      {validImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {validImages.map((img, idx) => (
            <button
              key={img.storage_path}
              onClick={() => setActive(idx)}
              className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                idx === safeActive
                  ? "border-orange-500"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <Image
                src={url(img.storage_path)}
                alt={img.alt_text ?? `รูปที่ ${idx + 1}`}
                fill
                className="object-cover"
                sizes="64px"
                onError={() => handleError(img.storage_path)}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
