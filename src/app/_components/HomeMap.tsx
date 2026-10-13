"use client";

import { useEffect, useRef } from "react";
import { shortRent } from "@/lib/labels";
import "leaflet/dist/leaflet.css";
import styles from "./HomeMap.module.css";

export type HomeMapPoint = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  rent: number;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* CARTO basemap — tile.openstreetmap.org সরাসরি ব্যবহার নীতিমালা-বিরুদ্ধ */
const CARTO_TILES =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

/** হোমপেজের "ম্যাপে দেখুন" — দামের পিনসহ ছোট ম্যাপ */
export default function HomeMap({ points }: { points: HomeMapPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || points.length === 0) return;
    let map: import("leaflet").Map | null = null;
    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !ref.current) return;
      map = L.map(ref.current, { scrollWheelZoom: false }).setView(
        [23.8103, 90.4125],
        11
      );
      L.tileLayer(CARTO_TILES, {
        attribution: "© OpenStreetMap contributors © CARTO",
        maxZoom: 19,
      }).addTo(map);

      const bounds: [number, number][] = [];
      points.forEach((p) => {
        if (!map) return;
        bounds.push([p.lat, p.lng]);
        const icon = L.divIcon({
          className: styles.pin,
          html: `<span>${escapeHtml(shortRent(p.rent))}</span>`,
        });
        L.marker([p.lat, p.lng], { icon })
          .addTo(map)
          .bindPopup(
            `<a href="/p/${p.id}">${escapeHtml(p.title)}</a>`
          );
      });
      if (bounds.length > 1) {
        map.fitBounds(L.latLngBounds(bounds).pad(0.25));
      } else {
        map.setView(bounds[0], 14);
      }
    })();

    return () => {
      cancelled = true;
      if (map) {
        map.remove();
        map = null;
      }
    };
  }, [points]);

  return (
    <div
      ref={ref}
      className={styles.map}
      role="img"
      aria-label="বাসার অবস্থান ম্যাপ"
    />
  );
}
