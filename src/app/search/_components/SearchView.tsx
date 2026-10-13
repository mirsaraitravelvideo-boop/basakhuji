"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ListingCard, { type ListingCardData } from "@/components/ListingCard";
import { shortRent } from "@/lib/labels";
import "leaflet/dist/leaflet.css";
import styles from "./SearchView.module.css";

export interface SearchResult extends ListingCardData {
  latitude: number | null;
  longitude: number | null;
}

interface SearchViewProps {
  results: SearchResult[];
  total: number;
  page: number;
  totalPages: number;
  /** page ছাড়া বাকি সব query param */
  queryString: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const CARTO_TILES =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

/** তালিকা/ম্যাপ টগল + পেজিনেশন */
export default function SearchView({
  results,
  total,
  page,
  totalPages,
  queryString,
}: SearchViewProps) {
  const [view, setView] = useState<"list" | "map">("list");
  const mapRef = useRef<HTMLDivElement>(null);

  const base = queryString ? `/search?${queryString}` : "/search";
  const pageHref = (p: number) => `${base}${queryString ? "&" : "?"}page=${p}`;

  useEffect(() => {
    if (view !== "map" || !mapRef.current) return;
    let map: import("leaflet").Map | null = null;
    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !mapRef.current) return;
      map = L.map(mapRef.current).setView([23.685, 90.3563], 7);
      L.tileLayer(CARTO_TILES, {
        attribution: "© OpenStreetMap contributors © CARTO",
        maxZoom: 19,
      }).addTo(map);

      const pts: [number, number][] = [];
      results.forEach((r) => {
        if (r.latitude == null || r.longitude == null || !map) return;
        pts.push([r.latitude, r.longitude]);
        const icon = L.divIcon({
          className: styles.rentMarker,
          html: `<span>${shortRent(r.monthly_rent)}</span>`,
        });
        L.marker([r.latitude, r.longitude], { icon })
          .addTo(map)
          .bindPopup(
            `<a href="/p/${
              r.id
            }" style="font-weight:700;color:#0b6b3a;text-decoration:none">${escapeHtml(
              r.title
            )}</a><br>৳${r.monthly_rent.toLocaleString(
              "bn-BD"
            )}/মাস · ${escapeHtml(r.area)}, ${escapeHtml(r.district)}`
          );
      });
      if (pts.length > 0 && map) {
        map.fitBounds(L.latLngBounds(pts).pad(0.2));
      }
    })();

    return () => {
      cancelled = true;
      if (map) {
        map.remove();
        map = null;
      }
    };
  }, [view, results]);

  const withLocation = results.filter(
    (r) => r.latitude != null && r.longitude != null
  );

  return (
    <div>
      <div className={styles.toolbar}>
        <p className={styles.count} role="status">
          মোট {total.toLocaleString("bn-BD")}টি বিজ্ঞাপন
        </p>
        <div className={styles.tabs} role="tablist" aria-label="দেখার ধরন">
          <button
            type="button"
            role="tab"
            aria-selected={view === "list"}
            className={view === "list" ? styles.tabOn : styles.tab}
            onClick={() => setView("list")}
          >
            📋 তালিকা
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "map"}
            className={view === "map" ? styles.tabOn : styles.tab}
            onClick={() => setView("map")}
          >
            🗺️ ম্যাপ
          </button>
        </div>
      </div>

      {view === "list" ? (
        <div className={styles.grid}>
          {results.map((r) => (
            <ListingCard key={r.id} listing={r} />
          ))}
        </div>
      ) : (
        <div>
          {withLocation.length === 0 ? (
            <p className={styles.mapHint}>
              এই ফলাফলগুলোর কোনোটিতে ম্যাপের অবস্থান দেওয়া নেই।
            </p>
          ) : (
            <div ref={mapRef} className={styles.map} aria-label="বিজ্ঞাপনের ম্যাপ" />
          )}
        </div>
      )}

      {totalPages > 1 && (
        <nav className={styles.pagination} aria-label="পেজ">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="btn btn-outline">
              ← আগের
            </Link>
          ) : (
            <span className={`${styles.disabled} btn btn-outline`}>← আগের</span>
          )}
          <span className={styles.pageInfo}>
            পৃষ্ঠা {page.toLocaleString("bn-BD")} /{" "}
            {totalPages.toLocaleString("bn-BD")}
          </span>
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} className="btn btn-outline">
              পরের →
            </Link>
          ) : (
            <span className={`${styles.disabled} btn btn-outline`}>পরের →</span>
          )}
        </nav>
      )}
    </div>
  );
}
