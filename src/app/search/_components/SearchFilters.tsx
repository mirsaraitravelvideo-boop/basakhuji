"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AMENITIES,
  PROPERTY_TYPE_LABELS,
  FURNISHED_LABELS,
} from "@/lib/labels";
import styles from "./SearchFilters.module.css";

/** ফুল ফিল্টার ফর্ম — URLSearchParams বানিয়ে /search-এ পাঠায় */
export default function SearchFilters({
  initial,
}: {
  initial: Record<string, string>;
}) {
  const router = useRouter();
  const [district, setDistrict] = useState(initial.district ?? "");
  const [area, setArea] = useState(initial.area ?? "");
  const [minRent, setMinRent] = useState(initial.min_rent ?? "");
  const [maxRent, setMaxRent] = useState(initial.max_rent ?? "");
  const [propertyType, setPropertyType] = useState(
    initial.property_type ?? ""
  );
  const [bedroomsMin, setBedroomsMin] = useState(initial.bedrooms_min ?? "");
  const [furnished, setFurnished] = useState(initial.furnished ?? "");
  const [availableFrom, setAvailableFrom] = useState(
    initial.available_from ?? ""
  );
  const [sort, setSort] = useState(initial.sort ?? "newest");
  const [amenities, setAmenities] = useState<string[]>(
    (initial.amenities ?? "").split(",").filter(Boolean)
  );
  const [error, setError] = useState<string | null>(null);
  /* 📍 কাছাকাছি */
  const [nearKm, setNearKm] = useState(initial.near_km ?? "");
  const [nearCoords, setNearCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(() => {
    const la = parseFloat(initial.near_lat ?? "");
    const ln = parseFloat(initial.near_lng ?? "");
    return Number.isFinite(la) && Number.isFinite(ln)
      ? { lat: la, lng: ln }
      : null;
  });
  const [locating, setLocating] = useState(false);

  function useMyLocationForFilter() {
    if (!("geolocation" in navigator)) {
      setError("এই ডিভাইসে অবস্থান সেবা নেই");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNearCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (!nearKm) setNearKm("5");
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError("অবস্থান পাওয়া যায়নি — ব্রাউজারে অনুমতি দিন");
      },
      { timeout: 12000, maximumAge: 600000 }
    );
  }

  function toggleAmenity(slug: string) {
    setAmenities((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  function buildParams(): URLSearchParams | null {
    const min = minRent.trim() === "" ? null : Number(minRent);
    const max = maxRent.trim() === "" ? null : Number(maxRent);
    if (min != null && (Number.isNaN(min) || min < 0)) {
      setError("সর্বনিম্ন ভাড়া সঠিক সংখ্যায় লিখুন।");
      return null;
    }
    if (max != null && (Number.isNaN(max) || max < 0)) {
      setError("সর্বোচ্চ ভাড়া সঠিক সংখ্যায় লিখুন।");
      return null;
    }
    if (min != null && max != null && min > max) {
      setError("সর্বনিম্ন ভাড়া সর্বোচ্চ ভাড়ার চেয়ে বেশি হতে পারবে না।");
      return null;
    }
    if (nearKm && !nearCoords) {
      setError("📍 কাছাকাছি ব্যবহার করতে আগে 'আমার অবস্থান' বাটনে চাপুন।");
      return null;
    }
    setError(null);
    const params = new URLSearchParams();
    if (district.trim()) params.set("district", district.trim());
    if (area.trim()) params.set("area", area.trim());
    if (min != null) params.set("min_rent", String(min));
    if (max != null) params.set("max_rent", String(max));
    if (propertyType) params.set("property_type", propertyType);
    if (bedroomsMin) params.set("bedrooms_min", bedroomsMin);
    if (furnished) params.set("furnished", furnished);
    if (availableFrom) params.set("available_from", availableFrom);
    if (amenities.length > 0) params.set("amenities", amenities.join(","));
    if (sort && sort !== "newest") params.set("sort", sort);
    if (nearKm && nearCoords) {
      params.set("near_lat", String(nearCoords.lat));
      params.set("near_lng", String(nearCoords.lng));
      params.set("near_km", nearKm);
    }
    return params;
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = buildParams();
    if (!params) return;
    router.push(`/search?${params.toString()}`);
  }

  function onReset() {
    router.push("/search");
  }

  return (
    <details className={styles.filters}>
      <summary className={styles.summary}>🔍 ফিল্টার</summary>
      <form onSubmit={onSubmit} className={styles.form} aria-label="সার্চ ফিল্টার">
        <div className={styles.grid}>
          <label>
            জেলা
            <input
              type="text"
              placeholder="যেমন: চট্টগ্রাম"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            />
          </label>
          <label>
            এলাকা
            <input
              type="text"
              placeholder="যেমন: মিরসরাই"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </label>
          <label>
            সর্বনিম্ন ভাড়া (টাকা)
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={minRent}
              onChange={(e) => setMinRent(e.target.value)}
            />
          </label>
          <label>
            সর্বোচ্চ ভাড়া (টাকা)
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={maxRent}
              onChange={(e) => setMaxRent(e.target.value)}
            />
          </label>
          <label>
            বাসার ধরন
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
            >
              <option value="">সব ধরন</option>
              {Object.entries(PROPERTY_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            কমপক্ষে বেডরুম
            <select
              value={bedroomsMin}
              onChange={(e) => setBedroomsMin(e.target.value)}
            >
              <option value="">যেকোনো</option>
              <option value="1">১+</option>
              <option value="2">২+</option>
              <option value="3">৩+</option>
              <option value="4">৪+</option>
            </select>
          </label>
          <label>
            ফার্নিশড
            <select
              value={furnished}
              onChange={(e) => setFurnished(e.target.value)}
            >
              <option value="">যেকোনো</option>
              {Object.entries(FURNISHED_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            কবে নাগাদ খালি চান
            <input
              type="date"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
            />
          </label>
        </div>

        <fieldset className={styles.amenities}>
          <legend>যেকোনো সুবিধা</legend>
          <div className={styles.chips}>
            {AMENITIES.map((a) => (
              <label
                key={a.slug}
                className={`${styles.chip} ${
                  amenities.includes(a.slug) ? styles.chipOn : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={amenities.includes(a.slug)}
                  onChange={() => toggleAmenity(a.slug)}
                />
                {a.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className={styles.sortLabel}>
          সাজান
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">নতুন বিজ্ঞাপন আগে</option>
            <option value="rent_asc">ভাড়া কম থেকে বেশি</option>
            <option value="rent_desc">ভাড়া বেশি থেকে কম</option>
          </select>
        </label>

        <fieldset className={styles.amenities}>
          <legend>📍 কাছাকাছি</legend>
          <div className={styles.chips}>
            <button
              type="button"
              className={`${styles.chip} ${nearCoords ? styles.chipOn : ""}`}
              onClick={useMyLocationForFilter}
              disabled={locating}
            >
              {locating
                ? "অবস্থান নেওয়া হচ্ছে…"
                : nearCoords
                  ? "✓ আমার অবস্থান সেট"
                  : "আমার অবস্থান ব্যবহার করুন"}
            </button>
            {(["2", "5", "10"] as const).map((km) => (
              <button
                key={km}
                type="button"
                className={`${styles.chip} ${nearKm === km ? styles.chipOn : ""}`}
                onClick={() => setNearKm(nearKm === km ? "" : km)}
              >
                {km === "2" ? "২" : km === "5" ? "৫" : "১০"} কিমি
              </button>
            ))}
          </div>
          {nearKm && nearCoords && (
            <p className={styles.sortLabel} style={{ marginTop: 8 }}>
              ✓ {nearKm === "2" ? "২" : nearKm === "5" ? "৫" : "১০"} কিমির মধ্যে —
              দূরত্ব অনুযায়ী সাজানো হবে
            </p>
          )}
        </fieldset>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <div className={styles.actions}>
          <button type="submit" className="btn btn-primary">
            প্রয়োগ করুন
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onReset}
          >
            মুছুন
          </button>
        </div>
      </form>
    </details>
  );
}
