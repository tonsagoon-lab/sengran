"use client";

import { useEffect, useRef } from "react";
import type { Coords } from "@/lib/utils/google-maps";

interface LocationPickerMapProps {
  coords: Coords | null;
  onCoordsChange: (c: Coords) => void;
  className?: string;
}

const BANGKOK: [number, number] = [13.7563, 100.5018];
const THAILAND_BOUNDS: [[number, number], [number, number]] = [[5.5, 97.3], [20.5, 105.7]];

export function LocationPickerMap({ coords, onCoordsChange, className }: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const onChangeRef = useRef(onCoordsChange);

  useEffect(() => { onChangeRef.current = onCoordsChange; });

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let mounted = true;
    const target = containerRef.current;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (!mounted) return;

      const initial: [number, number] = coords ? [coords.lat, coords.lng] : BANGKOK;
      const map = L.map(target, {
        zoomControl: true,
        maxBounds: THAILAND_BOUNDS,
        maxBoundsViscosity: 0.8,
      }).setView(initial, coords ? 16 : 6);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
        minZoom: 5,
      }).addTo(map);

      const pinIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:28px;height:28px;border-radius:50% 50% 50% 0;
          background:#f97316;border:3px solid #fff;
          box-shadow:0 4px 10px rgba(0,0,0,0.3);
          transform:rotate(-45deg);
          display:flex;align-items:center;justify-content:center;
        "><div style="
          width:8px;height:8px;border-radius:50%;background:#fff;transform:rotate(45deg);
        "></div></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      const marker = L.marker(initial, { draggable: true, icon: pinIcon }).addTo(map);
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        onChangeRef.current({ lat: p.lat, lng: p.lng });
      });
      markerRef.current = marker;

      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    })();

    return () => {
      mounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Only mount once — coords updates flow through the second effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync pin when parent-provided coords change (e.g. from search pick)
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !coords) return;
    markerRef.current.setLatLng([coords.lat, coords.lng]);
    mapRef.current.flyTo([coords.lat, coords.lng], 16, { duration: 0.7 });
  }, [coords]);

  return <div ref={containerRef} className={className} />;
}
