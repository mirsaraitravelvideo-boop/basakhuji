"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { shortRent } from "@/lib/labels";
import { districtCoords } from "@/lib/bd-districts";
import "leaflet/dist/leaflet.css";
import styles from "./HomeMap.module.css";

export type HomeMapPoint = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  rent: number;
};

/** demand_by_area() RPC-এর একটা সারি — সমষ্টিগত, ব্যক্তিগত তথ্যহীন */
export type HomeMapDemand = {
  district: string;
  area: string | null;
  seekers: number;
  top_from: string | null;
};

type Tab = "homes" | "demand";

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

const DHAKA: [number, number] = [23.8103, 90.4125];

function demandLabel(d: HomeMapDemand): string {
  return d.area ? `${d.district}, ${d.area}` : d.district;
}

/**
 * হোমপেজের ম্যাপ — দুই লেয়ার:
 *  🏠 বাসা — আসল লিস্টিং পিন (দামের ব্যাজ; কোঅর্ডিনেটহীন লিস্টিং পিন পায় না)
 *  🔥 চাহিদা — search_alerts থেকে সমষ্টিগত ডিমান্ড পিন (ভুয়া সংখ্যা নয়)
 */
export default function HomeMap({
  points,
  demand,
}: {
  points: HomeMapPoint[];
  demand: HomeMapDemand[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>("homes");

  // জেলা-কেন্দ্রে বসানো ডিমান্ড পিন (শুধু চেনা জেলা; ভুয়া পিন নয়)
  const demandPins = demand
    .map((d) => {
      const c = districtCoords(d.district);
      return c ? { ...d, lat: c[0], lng: c[1] } : null;
    })
    .filter((d): d is HomeMapDemand & { lat: number; lng: number } => d !== null);

  useEffect(() => {
    if (!ref.current) return;
    let map: import("leaflet").Map | null = null;
    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !ref.current) return;
      map = L.map(ref.current, { scrollWheelZoom: false }).setView(DHAKA, 11);
      L.tileLayer(CARTO_TILES, {
        attribution: "© OpenStreetMap contributors © CARTO",
        maxZoom: 19,
      }).addTo(map);

      const bounds: [number, number][] = [];

      if (tab === "homes") {
        points.forEach((p) => {
          if (!map) return;
          bounds.push([p.lat, p.lng]);
          const icon = L.divIcon({
            className: styles.pin,
            html: `<span>${escapeHtml(shortRent(p.rent))}</span>`,
          });
          L.marker([p.lat, p.lng], { icon })
            .addTo(map)
            .bindPopup(`<a href="/p/${p.id}">${escapeHtml(p.title)}</a>`);
        });
      } else {
        demandPins.forEach((d) => {
          if (!map) return;
          bounds.push([d.lat, d.lng]);
          const icon = L.divIcon({
            className: styles.demandPin,
            html: `<span>🔥 ${escapeHtml(String(d.seekers))} জন</span>`,
          });
          const label = escapeHtml(demandLabel(d));
          const from = d.top_from
            ? `<br><small>বেশিরভাগ ${escapeHtml(d.top_from)} থেকে</small>`
            : "";
          L.marker([d.lat, d.lng], { icon })
            .addTo(map)
            .bindPopup(
              `<strong>${label}-তে ${escapeHtml(String(d.seekers))} জন খুঁজছেন</strong>${from}`
            );
        });
      }

      if (bounds.length > 1) {
        map.fitBounds(L.latLngBounds(bounds).pad(0.25));
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 13);
      }
    })();

    return () => {
      cancelled = true;
      if (map) {
        map.remove();
        map = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, points, demand]);

  const showHomesEmpty = tab === "homes" && points.length === 0;
  const showDemandEmpty = tab === "demand" && demand.length === 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs} role="tablist" aria-label="ম্যাপ লেয়ার">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "homes"}
          className={tab === "homes" ? styles.tabActive : styles.tab}
          onClick={() => setTab("homes")}
        >
          🏠 বাসা
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "demand"}
          className={tab === "demand" ? styles.tabActive : styles.tab}
          onClick={() => setTab("demand")}
        >
          🔥 চাহিদা
        </button>
      </div>
      <div className={styles.mapWrap}>
        <div
          ref={ref}
          className={styles.map}
          role="img"
          aria-label={
            tab === "homes" ? "বাসার অবস্থান ম্যাপ" : "বাসার চাহিদা ম্যাপ"
          }
        />
        {showHomesEmpty && (
          <div className={styles.empty}>
            <p>এখনো ম্যাপে দেখানোর মতো বিজ্ঞাপন নেই।</p>
          </div>
        )}
        {showDemandEmpty && (
          <div className={styles.empty}>
            <p>
              এখনো চাহিদার তথ্য জমা হয়নি — সার্চ অ্যালার্ট চালু করলে এখানে
              দেখাবে।
            </p>
            <Link href="/dashboard" className={styles.cta}>
              অ্যালার্ট তৈরি করুন
            </Link>
          </div>
        )}
      </div>
      <p className={styles.hint}>
        {tab === "homes"
          ? "পিনে চাপ দিলে বিজ্ঞাপনটি খুলবে।"
          : "কোন এলাকায় কতজন বাসা খুঁজছেন — সার্চ অ্যালার্টের আসল তথ্য।"}
      </p>
    </div>
  );
}
