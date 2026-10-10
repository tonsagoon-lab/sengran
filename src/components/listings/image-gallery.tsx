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

  const thumb = (path: string) => resolveImageUrl(path, 128, 65, "cover");
  const main = (path: string) => resolveImageUrl(path, 800, 75, "contain");

  const prev = () => setActive((a) => (a - 1 + validImages.length) % validImages.length);
  const next = () => setActive((a) => (a + 1) % validImages.length);

  return (
    <div className="space-y-2">
      {/* Main image */}
      <div className="relative w-full aspect-[4/3] md:aspect-[16/9] md:max-h-96 rounded-xl overflow-hidden bg-neutral-100 group">
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="absolute inset-0 w-full h-full cursor-zoom-in"
          aria-label="ขยายรูป"
        >
          <Image
            src={main(validImages[safeActive].storage_path)}
            alt={validImages[safeActive].alt_text ?? `รูปที่ ${safeActive + 1}`}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 800px"
            priority
            onError={() => handleError(validImages[safeActive].storage_path)}
          />
        </button>

        {/* Prev / Next buttons */}
        {validImages.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-md"
              aria-label="รูปก่อนหน้า"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-md"
              aria-label="รูปถัดไป"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs rounded-full px-2 py-0.5 pointer-events-none">
              {safeActive + 1}/{validImages.length}
            </div>
          </>
        )}

        {/* Expand hint (always visible on mobile, hover-fade on desktop) */}
        <div
          className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity pointer-events-none shadow-md"
          aria-hidden="true"
        >
          <Expand className="h-4 w-4" />
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => setLightbox(false)}
        >
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 text-white hover:text-neutral-300 bg-black/40 rounded-full p-2 z-10"
            aria-label="ปิด"
          >
            <X className="h-6 w-6" />
          </button>

          {validImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-3 z-10 shadow-md"
                aria-label="รูปก่อนหน้า"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-3 z-10 shadow-md"
                aria-label="รูปถัดไป"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div
            className="relative w-full h-full flex items-center justify-center px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={resolveImageUrl(validImages[safeActive].storage_path, 1600, 85, "contain")}
              alt={validImages[safeActive].alt_text ?? `รูปที่ ${safeActive + 1}`}
              className="max-w-full max-h-[90vh] object-contain select-none"
              style={{ touchAction: "pinch-zoom" }}
              draggable={false}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs rounded-full px-3 py-1 pointer-events-none">
              {safeActive + 1} / {validImages.length}
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
                src={thumb(img.storage_path)}
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
