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
    return `฿${fmt.format(listing.rent_price)}/ด.`;
  if (listing.sale_price) return `฿${fmt.format(listing.sale_price)}`;
  return "ติดต่อ";
}

const THAILAND = { minLat: 5.5, maxLat: 20.5, minLng: 97.3, maxLng: 105.7 };
const THAILAND_BOUNDS: [[number, number], [number, number]] = [[5.5, 97.3], [20.5, 105.7]];
const BANGKOK: [number, number] = [13.7563, 100.5018];

function inThailand(lat: number, lng: number) {
  return lat >= THAILAND.minLat && lat <= THAILAND.maxLat &&
    lng >= THAILAND.minLng && lng <= THAILAND.maxLng;
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const TYPE_COLOR: Record<string, string> = {
  sale: "#1d4ed8",
  rent: "#15803d",
  both: "#7c3aed",
};

interface MapViewProps {
  listings: MapListing[];
  onUserLocation?: (lat: number, lng: number) => void;
  onGpsDenied?: () => void;
}

export function MapView({ listings, onUserLocation, onGpsDenied }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<import("leaflet").Marker[]>([]);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const [selected, setSelected] = useState<MapListing | null>(null);
  const [ready, setReady] = useState(false);

  // Init map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    async function init() {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      leafletRef.current = L;

      const map = L.map(mapRef.current!, {
        zoomControl: false,
        maxBounds: THAILAND_BOUNDS,
        maxBoundsViscosity: 0.8,
      }).setView(BANGKOK, 6);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
        minZoom: 6,
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);
      setReady(true);
    }

    init();
    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  // GPS centering — run once after map is ready
  useEffect(() => {
    if (!ready || !mapInstanceRef.current || !leafletRef.current) return;
    const map = mapInstanceRef.current;
    const L = leafletRef.current;

    const valid = listings.filter((l) => inThailand(l.latitude, l.longitude));

    function fallbackFit() {
      if (valid.length > 1) {
        const bounds = L.latLngBounds(valid.map((l) => [l.latitude, l.longitude]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
      } else if (valid.length === 1) {
        map.setView([valid[0].latitude, valid[0].longitude], 13);
      } else {
        map.fitBounds(THAILAND_BOUNDS, { padding: [20, 20] });
      }
    }

    function centerOnUser(userLat: number, userLng: number) {
      const RADII = [10, 30, 80, 300];
      for (const r of RADII) {
        const nearby = valid.filter((l) => distanceKm(userLat, userLng, l.latitude, l.longitude) <= r);
        if (nearby.length > 0) {
          if (nearby.length === 1) {
            map.setView([userLat, userLng], r <= 10 ? 13 : r <= 30 ? 11 : 9);
          } else {
            const bounds = L.latLngBounds(nearby.map((l) => [l.latitude, l.longitude]));
            map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
          }
          return;
        }
      }
      fallbackFit();
    }

    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        centerOnUser(pos.coords.latitude, pos.coords.longitude);
        onUserLocation?.(pos.coords.latitude, pos.coords.longitude);
      },
      () => { fallbackFit(); onGpsDenied?.(); },
      { timeout: 5000, enableHighAccuracy: false }
    );
    if (!navigator.geolocation) { fallbackFit(); onGpsDenied?.(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Re-render markers when listings (filter) changes
  useEffect(() => {
    if (!ready || !mapInstanceRef.current || !leafletRef.current) return;
    const map = mapInstanceRef.current;
    const L = leafletRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const valid = listings.filter((l) => inThailand(l.latitude, l.longitude));

    valid.forEach((listing) => {
      const label = priceLabel(listing);
      const color = TYPE_COLOR[listing.listing_type] ?? "#f97316";
      const icon = L.divIcon({
        className: "",
        html: `
          <div class="map-pin-wrap">
            <div class="map-pin-bubble" style="background:${color}">${label}</div>
            <svg class="map-pin-tail" width="14" height="10" viewBox="0 0 14 10" xmlns="http://www.w3.org/2000/svg">
              <polygon points="7,10 0,0 14,0" fill="${color}"/>
            </svg>
          </div>`,
        iconAnchor: [0, 0],
        iconSize: [0, 0],
      });
      const marker = L.marker([listing.latitude, listing.longitude], { icon });
      marker.addTo(map);
      marker.on("click", () => setSelected(listing));
      markersRef.current.push(marker);
    });
  }, [listings, ready]);

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
        .map-pin-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transition: transform 0.12s;
          transform-origin: bottom center;
        }
        .map-pin-wrap:hover { transform: scale(1.12); }
        .map-pin-bubble {
          color: white;
          border-radius: 8px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.28);
          letter-spacing: -0.3px;
          line-height: 1.4;
        }
        .map-pin-tail {
          display: block;
          margin-top: -1px;
          filter: drop-shadow(0 2px 2px rgba(0,0,0,0.15));
        }
        .leaflet-container { font-family: inherit; }
        .leaflet-control-attribution { font-size: 9px !important; }
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
              <div className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-neutral-100">
                {coverUrl ? (
                  <Image src={coverUrl} alt={selected.title} fill className="object-cover" sizes="96px" />
                ) : (
                  <div className="flex h-full items-center justify-center text-neutral-300 text-xs">ไม่มีรูป</div>
                )}
              </div>
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
    </div>
  );
}
