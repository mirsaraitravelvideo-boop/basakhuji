"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { shortRent } from "@/lib/labels";
import { haversineKm, formatDistance } from "@/lib/geo";
import { useUserLocation } from "@/lib/useUserLocation";
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

type GeoResult = { lat: number; lng: number; name: string };

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
const DEFAULT_ZOOM = 13; // রাস্তার নাম দেখা যায়

function demandLabel(d: HomeMapDemand): string {
  return d.area ? `${d.district}, ${d.area}` : d.district;
}

/**
 * বাসাখুঁজি ম্যাপ — আমাদের নিজের ম্যাপ:
 *  🏠 বাসা — আসল লিস্টিং পিন (দামের ব্যাজ; কোঅর্ডিনেটহীন লিস্টিং পিন পায় না)
 *  🔥 চাহিদা — search_alerts থেকে সমষ্টিগত ডিমান্ড পিন (ভুয়া সংখ্যা নয়)
 *  📍 আমার অবস্থান + এলাকা সার্চ + দূরত্ব
 */
export default function HomeMap({
  points,
  demand,
  presetLoc = null,
}: {
  points: HomeMapPoint[];
  demand: HomeMapDemand[];
  /** সার্ভার থেকে দেওয়া অবস্থান (যেমন 📍 কাছাকাছি ফিল্টার) — "আপনি এখানে" পিন */
  presetLoc?: { lat: number; lng: number } | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const meRef = useRef<import("leaflet").Marker | null>(null);
  const [tab, setTab] = useState<Tab>("homes");
  const [Lmod, setLmod] = useState<typeof import("leaflet") | null>(null);

  const { loc: userLoc, status: locStatus, error: locError, request: requestLoc } =
    useUserLocation();

  /* সার্ভারের দেওয়া অবস্থান (📍 কাছাকাছি) না থাকলে ইউজারের নিজের */
  const shownLoc = userLoc ?? presetLoc;

  // জেলা-কেন্দ্রে বসানো ডিমান্ড পিন (শুধু চেনা জেলা; ভুয়া পিন নয়)
  const demandPins = demand
    .map((d) => {
      const c = districtCoords(d.district);
      return c ? { ...d, lat: c[0], lng: c[1] } : null;
    })
    .filter((d): d is HomeMapDemand & { lat: number; lng: number } => d !== null);

  /* ---------- ম্যাপ তৈরি (একবার) ---------- */
  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !ref.current) return;
      setLmod(L);
      const map = L.map(ref.current, { scrollWheelZoom: false }).setView(
        DHAKA,
        DEFAULT_ZOOM
      );
      L.tileLayer(CARTO_TILES, {
        attribution: "© OpenStreetMap contributors © CARTO",
        maxZoom: 19,
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- পিন আঁকা ---------- */
  useEffect(() => {
    const L = Lmod;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!L || !map || !layer) return;
    layer.clearLayers();

    const distBadge = (lat: number, lng: number) =>
      shownLoc
        ? `<br><small>📍 ${escapeHtml(
            formatDistance(haversineKm(shownLoc.lat, shownLoc.lng, lat, lng))
          )} দূরে</small>`
        : "";

    const bounds: [number, number][] = [];
    if (tab === "homes") {
      points.forEach((p) => {
        bounds.push([p.lat, p.lng]);
        const icon = L.divIcon({
          className: styles.pin,
          html: `<span>${escapeHtml(shortRent(p.rent))}</span>`,
        });
        L.marker([p.lat, p.lng], { icon })
          .addTo(layer)
          .bindPopup(
            `<a href="/p/${p.id}">${escapeHtml(p.title)}</a>${distBadge(
              p.lat,
              p.lng
            )}`
          );
      });
    } else {
      demandPins.forEach((d) => {
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
          .addTo(layer)
          .bindPopup(
            `<strong>${label}-তে ${escapeHtml(
              String(d.seekers)
            )} জন খুঁজছেন</strong>${from}${distBadge(d.lat, d.lng)}`
          );
      });
    }

    if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds).pad(0.2));
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Lmod, tab, points, demand, shownLoc]);

  /* ---------- "আপনি এখানে" পিন ---------- */
  useEffect(() => {
    const L = Lmod;
    const map = mapRef.current;
    if (!L || !map) return;
    if (meRef.current) {
      map.removeLayer(meRef.current);
      meRef.current = null;
    }
    if (shownLoc) {
      const icon = L.divIcon({
        className: styles.mePin,
        html: `<span title="আপনি এখানে"></span>`,
      });
      meRef.current = L.marker([shownLoc.lat, shownLoc.lng], {
        icon,
        zIndexOffset: 1000,
      })
        .addTo(map)
        .bindPopup("<strong>📍 আপনি এখানে</strong>");
      map.setView([shownLoc.lat, shownLoc.lng], 14);
    }
  }, [Lmod, shownLoc]);

  /* ---------- ম্যাপ আনমাউন্টে পরিষ্কার ---------- */
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerRef.current = null;
        meRef.current = null;
      }
    };
  }, []);

  const panTo = useCallback((lat: number, lng: number, zoom = 14) => {
    mapRef.current?.setView([lat, lng], zoom);
  }, []);

  /* ---------- এলাকা সার্চ (Nominatim → সার্ভার API) ---------- */
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setSearchError(null);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(term)}`);
        const data = await res.json();
        if (res.ok) {
          setResults(data.results ?? []);
          setSearchError(
            (data.results ?? []).length === 0
              ? "এলাকা পাওয়া যায়নি — অন্য নামে চেষ্টা করুন"
              : null
          );
        } else {
          setSearchError(data.error ?? "সার্চে সমস্যা হয়েছে");
          setResults([]);
        }
      } catch {
        setSearchError("সার্চে সমস্যা হয়েছে");
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [q]);

  const pickResult = (r: GeoResult) => {
    panTo(r.lat, r.lng, 14);
    setResults([]);
    setQ("");
  };

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
        {/* এলাকা সার্চ */}
        <div className={styles.searchBox}>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="এলাকা খুঁজুন… যেমন: ধানমন্ডি"
            aria-label="এলাকা খুঁজুন"
          />
          {searching && <span className={styles.searchSpin} aria-hidden="true">…</span>}
          {results.length > 0 && (
            <ul className={styles.searchResults}>
              {results.map((r, i) => (
                <li key={i}>
                  <button type="button" onClick={() => pickResult(r)}>
                    📍 {r.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searchError && <p className={styles.searchError}>{searchError}</p>}
        </div>
        {/* আমার অবস্থান */}
        <button
          type="button"
          className={styles.locateBtn}
          onClick={requestLoc}
          disabled={locStatus === "loading"}
          title="আমার অবস্থানে যান"
        >
          {locStatus === "loading" ? "…" : "📍 আমার অবস্থান"}
        </button>
        {/* ব্র্যান্ড */}
        <span className={styles.brand}>বাসাখুঁজি ম্যাপ</span>
        {locError && <p className={styles.locError}>{locError}</p>}
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
