"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import styles from "../detail.module.css";

const CARTO_TILES =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

/** বিজ্ঞাপনের অবস্থানের ছোট ম্যাপ (lat/lng থাকলেই রেন্ডার হয়) */
export default function MiniMap({
  lat,
  lng,
  title,
}: {
  lat: number;
  lng: number;
  title: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    let map: import("leaflet").Map | null = null;
    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !mapRef.current) return;
      map = L.map(mapRef.current, { scrollWheelZoom: false }).setView(
        [lat, lng],
        15
      );
      L.tileLayer(CARTO_TILES, {
        attribution: "© OpenStreetMap contributors © CARTO",
        maxZoom: 19,
      }).addTo(map);
      L.marker([lat, lng]).addTo(map).bindPopup(title).openPopup();
    })();

    return () => {
      cancelled = true;
      if (map) {
        map.remove();
        map = null;
      }
    };
  }, [lat, lng, title]);

  return (
    <div>
      <div ref={mapRef} className={styles.miniMap} aria-label="অবস্থানের ম্যাপ" />
      <a
        className={styles.gmapsLink}
        href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Google Maps-এ খুলুন ↗
      </a>
    </div>
  );
}
