"use client";

import { useEffect, useRef } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import type { Coords } from "@/lib/utils/google-maps";

interface LocationPickerMapProps {
  coords: Coords | null;
  onCoordsChange: (c: Coords) => void;
  className?: string;
}

const BANGKOK = { lat: 13.7563, lng: 100.5018 };
const THAILAND_BOUNDS = {
  north: 20.5,
  south: 5.5,
  east: 105.7,
  west: 97.3,
};

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

let mapsLibraryPromise: Promise<google.maps.MapsLibrary> | null = null;
function loadMapsLibrary(): Promise<google.maps.MapsLibrary> {
  if (!GOOGLE_API_KEY) return Promise.reject(new Error("no key"));
  if (!mapsLibraryPromise) {
    setOptions({
      key: GOOGLE_API_KEY,
      v: "weekly",
      language: "th",
      region: "TH",
    });
    mapsLibraryPromise = importLibrary("maps");
  }
  return mapsLibraryPromise;
}

const PIN_SVG =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 0C7.2 0 0 7.2 0 16c0 11.2 16 24 16 24s16-12.8 16-24C32 7.2 24.8 0 16 0z" fill="#f97316" stroke="#fff" stroke-width="2"/>
      <circle cx="16" cy="16" r="5" fill="#fff"/>
    </svg>`
  );

export function LocationPickerMap({ coords, onCoordsChange, className }: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const onChangeRef = useRef(onCoordsChange);

  useEffect(() => { onChangeRef.current = onCoordsChange; });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let mounted = true;
    const target = containerRef.current;

    (async () => {
      try {
        const maps = await loadMapsLibrary();
        if (!mounted) return;

        const initial = coords ?? BANGKOK;
        const map = new maps.Map(target, {
          center: initial,
          zoom: coords ? 16 : 6,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: true,
          restriction: {
            latLngBounds: THAILAND_BOUNDS,
            strictBounds: false,
          },
          gestureHandling: "greedy",
        });
        mapRef.current = map;

        const marker = new google.maps.Marker({
          map,
          position: initial,
          draggable: true,
          icon: {
            url: PIN_SVG,
            scaledSize: new google.maps.Size(32, 40),
            anchor: new google.maps.Point(16, 40),
          },
        });
        markerRef.current = marker;

        marker.addListener("dragend", () => {
          const p = marker.getPosition();
          if (!p) return;
          onChangeRef.current({ lat: p.lat(), lng: p.lng() });
        });

        map.addListener("click", (e: google.maps.MapMouseEvent | google.maps.IconMouseEvent) => {
          const latLng = e.latLng;
          if (!latLng) return;
          // Suppress Google's default POI info window so the pin move is the only interaction.
          if ("placeId" in e && e.placeId && "stop" in e && typeof e.stop === "function") {
            e.stop();
          }
          marker.setPosition(latLng);
          onChangeRef.current({ lat: latLng.lat(), lng: latLng.lng() });
        });
      } catch (err) {
        console.error("[google maps] init failed", err);
      }
    })();

    return () => {
      mounted = false;
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync pin when parent-provided coords change (e.g. from search pick / link paste).
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !coords) return;
    const pos = { lat: coords.lat, lng: coords.lng };
    markerRef.current.setPosition(pos);
    mapRef.current.panTo(pos);
    if ((mapRef.current.getZoom() ?? 0) < 15) {
      mapRef.current.setZoom(16);
    }
  }, [coords]);

  return <div ref={containerRef} className={className} />;
}
