"use client";

import { useCallback, useEffect, useState } from "react";

export type UserLoc = { lat: number; lng: number };

const KEY = "basakhuji_user_loc";

export function loadStoredLoc(): UserLoc | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { lat?: unknown; lng?: unknown };
    if (typeof p.lat === "number" && typeof p.lng === "number") {
      return { lat: p.lat, lng: p.lng };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export type LocStatus = "idle" | "loading" | "ok" | "denied" | "unsupported";

/** 📍 আমার অবস্থান — একবার নিলে localStorage-এ থেকে যায় */
export function useUserLocation() {
  const [loc, setLoc] = useState<UserLoc | null>(null);
  const [status, setStatus] =
    useState<LocStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoc(loadStoredLoc());
  }, []);

  const request = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      setError("এই ডিভাইসে অবস্থান সেবা নেই");
      return;
    }
    setStatus("loading");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const l = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLoc(l);
        setStatus("ok");
        try {
          localStorage.setItem(KEY, JSON.stringify(l));
        } catch {
          /* ignore */
        }
      },
      () => {
        setStatus("denied");
        setError("অবস্থান পাওয়া যায়নি — সার্চ বক্সে এলাকার নাম লিখুন");
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 }
    );
  }, []);

  const clear = useCallback(() => {
    setLoc(null);
    setStatus("idle");
    setError(null);
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return { loc, status, error, request, clear };
}
