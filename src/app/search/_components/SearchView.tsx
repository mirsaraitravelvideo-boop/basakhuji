"use client";

import { useState } from "react";
import Link from "next/link";
import ListingCard, { type ListingCardData } from "@/components/ListingCard";
import HomeMap, {
  type HomeMapPoint,
  type HomeMapDemand,
} from "@/app/_components/HomeMap";
import styles from "./SearchView.module.css";

export interface SearchResult extends ListingCardData {
  latitude: number | null;
  longitude: number | null;
  /** 📍 কাছাকাছি ফিল্টারে — ইউজার থেকে দূরত্ব (কিমি) */
  distance_km?: number | null;
}

interface SearchViewProps {
  results: SearchResult[];
  total: number;
  page: number;
  totalPages: number;
  /** page ছাড়া বাকি সব query param */
  queryString: string;
  /** চাহিদা লেয়ারের সমষ্টিগত ডেটা */
  demand: HomeMapDemand[];
  /** ?view=map দিলে সরাসরি ম্যাপ ভিউ */
  initialView: "list" | "map";
  /** 📍 কাছাকাছি ফিল্টারের কেন্দ্র — ম্যাপে "আপনি এখানে" পিন */
  nearLoc?: { lat: number; lng: number } | null;
}

/** তালিকা/ম্যাপ টগল + পেজিনেশন */
export default function SearchView({
  results,
  total,
  page,
  totalPages,
  queryString,
  demand,
  initialView,
  nearLoc = null,
}: SearchViewProps) {
  const [view, setView] = useState<"list" | "map">(initialView);

  const base = queryString ? `/search?${queryString}` : "/search";
  const pageHref = (p: number) => `${base}${queryString ? "&" : "?"}page=${p}`;

  /* কোঅর্ডিনেটহীন বিজ্ঞাপন পিন পায় না (সততা নিয়ম) */
  const points: HomeMapPoint[] = results
    .filter((r) => r.latitude != null && r.longitude != null)
    .map((r) => ({
      id: r.id,
      title: r.title,
      lat: r.latitude as number,
      lng: r.longitude as number,
      rent: r.monthly_rent,
    }));

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
            <ListingCard
              key={r.id}
              listing={{ ...r, distanceKm: r.distance_km ?? null }}
            />
          ))}
        </div>
      ) : (
        <HomeMap points={points} demand={demand} presetLoc={nearLoc} />
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
