"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, MapPin, Navigation } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils/image-url";
import type { MapListing } from "@/lib/db/listings";

const fmt = new Intl.NumberFormat("th-TH");

function priceLabel(listing: MapListing): string {
  if (listing.listing_type === "rent" && listing.rent_price)
    return `฿${fmt.format(listing.rent_price)}`;
  if (listing.sale_price) return `฿${fmt.format(listing.sale_price)}`;
  return "ติดต่อ";
}

interface MapViewProps {
  listings: MapListing[];
}

export function MapView({ listings }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import("leaflet").Map | null>(null);
  const [selected, setSelected] = useState<MapListing | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    async function init() {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      const center: [number, number] =
        listings.length > 0
          ? [listings[0].latitude, listings[0].longitude]
          : [13.7563, 100.5018]; // Bangkok default

      const map = L.map(mapRef.current!, { zoomControl: false }).setView(center, 10);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      listings.forEach((listing) => {
        const label = priceLabel(listing);
        const icon = L.divIcon({
          className: "",
          html: `<div class="map-price-marker">${label}</div>`,
          iconAnchor: [0, 0],
        });

        const marker = L.marker([listing.latitude, listing.longitude], { icon });
        marker.addTo(map);
        marker.on("click", () => setSelected(listing));
      });

      if (listings.length > 1) {
        const bounds = L.latLngBounds(listings.map((l) => [l.latitude, l.longitude]));
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }

    init();

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, [listings]);

  const cover = selected?.listing_images
    .slice()
    .sort((a, b) => a.display_order - b.display_order)[0];
  const coverUrl = cover ? resolveImageUrl(cover.storage_path) : null;
  const navUrl = selected
    ? `https://www.google.com/maps/dir/?api=1&destination=${selected.latitude},${selected.longitude}`
    : "#";
  const location = selected
    ? [selected.district, selected.provinces?.name_th].filter(Boolean).join(", ")
    : "";

  return (
    <div className="relative w-full h-full">
      <style>{`
        .map-price-marker {
          background: white;
          border: 2px solid #374151;
          border-radius: 9999px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 700;
          color: #111827;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          cursor: pointer;
          transition: all 0.15s;
        }
        .map-price-marker:hover {
          background: #111827;
          color: white;
          transform: scale(1.08);
        }
        .leaflet-container { font-family: inherit; }
      `}</style>

      <div ref={mapRef} className="w-full h-full" />

      {/* Bottom popup card */}
      {selected && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-[1000]">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow"
            >
              <X className="h-4 w-4 text-neutral-500" />
            </button>

            <Link href={`/property/${selected.slug}`} className="flex gap-3 p-3">
              {/* Image */}
              <div className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-neutral-100">
                {coverUrl ? (
                  <Image src={coverUrl} alt={selected.title} fill className="object-cover" sizes="96px" />
                ) : (
                  <div className="flex h-full items-center justify-center text-neutral-300 text-xs">ไม่มีรูป</div>
                )}
              </div>

              {/* Info */}
              <div className="flex flex-col justify-center gap-1 min-w-0">
                <p className="text-base font-bold text-neutral-900">{priceLabel(selected)}</p>
                <p className="text-sm text-neutral-700 line-clamp-2 leading-snug">{selected.title}</p>
                {location && (
                  <div className="flex items-center gap-1 text-xs text-neutral-500">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{location}</span>
                  </div>
                )}
                {selected.categories && (
                  <span className="text-xs text-neutral-400">{selected.categories.name_th}</span>
                )}
              </div>
            </Link>

            {/* Navigate button */}
            <div className="px-3 pb-3">
              <a
                href={navUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
              >
                <Navigation className="h-4 w-4" />
                นำทางด้วย Google Maps
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Count badge */}
      <div className="absolute top-3 left-3 z-[1000] rounded-full bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow">
        {listings.length} ประกาศ
      </div>
    </div>
  );
}
