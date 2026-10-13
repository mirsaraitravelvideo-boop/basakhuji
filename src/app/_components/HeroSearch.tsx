"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PROPERTY_TYPE_LABELS } from "@/lib/labels";
import styles from "./HeroSearch.module.css";

/** হিরোর সার্চ ফর্ম — /search?...-এ পাঠায় */
export default function HeroSearch() {
  const router = useRouter();
  const [district, setDistrict] = useState("");
  const [area, setArea] = useState("");
  const [minRent, setMinRent] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const min = minRent.trim() === "" ? null : Number(minRent);
    const max = maxRent.trim() === "" ? null : Number(maxRent);
    if (min != null && (Number.isNaN(min) || min < 0)) {
      setError("সর্বনিম্ন ভাড়া সঠিক সংখ্যায় লিখুন।");
      return;
    }
    if (max != null && (Number.isNaN(max) || max < 0)) {
      setError("সর্বোচ্চ ভাড়া সঠিক সংখ্যায় লিখুন।");
      return;
    }
    if (min != null && max != null && min > max) {
      setError("সর্বনিম্ন ভাড়া সর্বোচ্চ ভাড়ার চেয়ে বেশি হতে পারবে না।");
      return;
    }
    setError(null);
    const params = new URLSearchParams();
    if (district.trim()) params.set("district", district.trim());
    if (area.trim()) params.set("area", area.trim());
    if (min != null) params.set("min_rent", String(min));
    if (max != null) params.set("max_rent", String(max));
    if (propertyType) params.set("property_type", propertyType);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form className="search-card" onSubmit={onSubmit} aria-label="বাসা খুঁজুন">
      <div className={styles.grid}>
        <label>
          জেলা
          <input
            type="text"
            placeholder="যেমন: চট্টগ্রাম"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            autoComplete="address-level1"
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
            placeholder="যেমন: ৫০০০"
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
            placeholder="যেমন: ১৫০০০"
            value={maxRent}
            onChange={(e) => setMaxRent(e.target.value)}
          />
        </label>
        <label className={styles.full}>
          বাসার ধরন
          <select
            className={styles.select}
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
          >
            <option value="">সব ধরন</option>
            {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-accent">
        খুঁজুন
      </button>
    </form>
  );
}
