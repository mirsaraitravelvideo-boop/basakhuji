import { NextRequest, NextResponse } from "next/server";

/* ============================================================
   Nominatim (OpenStreetMap) প্রক্সি — শুধু সার্ভার-সাইড থেকে।
   ব্যবহার-নীতি মেনে চলা হয়:
   - সঠিক User-Agent ("BasakhujiBangladesh/1.0")
   - সর্বোচ্চ ১ req/sec (in-memory throttle)
   - ১ ঘণ্টার in-memory cache
   - শুধু বাংলাদেশে সীমাবদ্ধ (countrycodes=bd)
   ============================================================ */

const UA = "BasakhujiBangladesh/1.0 (Bangladesh rental marketplace)";
const MIN_GAP_MS = 1100;
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX = 300;

let lastCallAt = 0;
const cache = new Map<string, { data: unknown; expires: number }>();

async function throttledFetch(url: string): Promise<unknown> {
  const wait = MIN_GAP_MS - (Date.now() - lastCallAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "bn" },
  });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  return res.json();
}

function getCached<T>(key: string): T | null {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() > e.expires) {
    cache.delete(key);
    return null;
  }
  return e.data as T;
}

function setCached(key: string, data: unknown) {
  if (cache.size >= CACHE_MAX) {
    const first = cache.keys().next().value;
    if (first !== undefined) cache.delete(first);
  }
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

/** "ঢাকা জেলা" → "ঢাকা" — প্রস্তাব হিসেবে, ইউজার বদলাতে পারবে */
function cleanDistrict(s: string | undefined): string | null {
  if (!s) return null;
  const c = s
    .replace(/\s*(District|জেলা|Division|বিভাগ)\s*$/i, "")
    .trim();
  return c || null;
}

type ForwardResult = { lat: number; lng: number; name: string };

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim();
  const latS = sp.get("lat");
  const lonS = sp.get("lon");

  try {
    /* ---------- reverse: lat+lon → জেলা/এলাকা ---------- */
    if (latS && lonS) {
      const la = parseFloat(latS);
      const lo = parseFloat(lonS);
      if (
        !Number.isFinite(la) ||
        !Number.isFinite(lo) ||
        Math.abs(la) > 90 ||
        Math.abs(lo) > 180
      ) {
        return NextResponse.json(
          { error: "ভুল কোঅর্ডিনেট" },
          { status: 400 }
        );
      }
      const key = `r:${la.toFixed(4)},${lo.toFixed(4)}`;
      const hit = getCached(key);
      if (hit) return NextResponse.json(hit);

      const url =
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
        `&lat=${la}&lon=${lo}&zoom=14&addressdetails=1&accept-language=bn`;
      const data = (await throttledFetch(url)) as {
        address?: Record<string, string>;
        display_name?: string;
      };
      const a = data?.address ?? {};
      const out = {
        district: cleanDistrict(
          a.state_district ?? a.county ?? a.state
        ),
        area:
          a.suburb ??
          a.neighbourhood ??
          a.village ??
          a.town ??
          a.city ??
          null,
        displayName: data?.display_name ?? null,
      };
      setCached(key, out);
      return NextResponse.json(out);
    }

    /* ---------- forward: এলাকার নাম → কোঅর্ডিনেট ---------- */
    if (q) {
      if (q.length > 120)
        return NextResponse.json({ error: "অনেক বড়" }, { status: 400 });
      const key = `f:${q.toLowerCase()}`;
      const hit = getCached(key);
      if (hit) return NextResponse.json(hit);

      const url =
        `https://nominatim.openstreetmap.org/search?format=jsonv2` +
        `&q=${encodeURIComponent(q)}&countrycodes=bd&limit=5` +
        `&addressdetails=1&accept-language=bn`;
      const data = (await throttledFetch(url)) as Array<{
        lat: string;
        lon: string;
        display_name?: string;
      }>;
      const results: ForwardResult[] = (Array.isArray(data) ? data : [])
        .map((d) => ({
          lat: parseFloat(d.lat),
          lng: parseFloat(d.lon),
          name:
            d.display_name?.split(",").slice(0, 3).join(",").trim() || q,
        }))
        .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
      const out = { results };
      setCached(key, out);
      return NextResponse.json(out);
    }

    return NextResponse.json(
      { error: "q অথবা lat+lon প্যারামিটার দিন" },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "ম্যাপ সেবায় সমস্যা — একটু পরে চেষ্টা করুন" },
      { status: 502 }
    );
  }
}
