import { createClient } from "@/lib/supabase/server";
import { getMyProfile, getRole } from "@/lib/roles";
import { listingImageUrl } from "@/lib/images";
import { haversineKm } from "@/lib/geo";
import { PROPERTY_TYPE_LABELS, FURNISHED_LABELS } from "@/lib/labels";
import { SiteHeader, EmptyState } from "@/components/ui";
import SearchFilters from "./_components/SearchFilters";
import SearchView, { type SearchResult } from "./_components/SearchView";
import { type HomeMapDemand } from "@/app/_components/HomeMap";

export const metadata = {
  title: "বাসা খুঁজুন — বাসাখুঁজি বাংলাদেশ",
};

type SearchParams = {
  district?: string;
  area?: string;
  min_rent?: string;
  max_rent?: string;
  property_type?: string;
  bedrooms_min?: string;
  furnished?: string;
  amenities?: string;
  available_from?: string;
  sort?: string;
  page?: string;
  view?: string;
  /** 📍 কাছাকাছি ফিল্টার */
  near_lat?: string;
  near_lng?: string;
  near_km?: string;
};

type DbRow = {
  id: string;
  title: string;
  district: string;
  area: string;
  monthly_rent: number;
  bedrooms: number | null;
  bathrooms: number | null;
  property_type: string;
  is_verified: boolean;
  latitude: number | null;
  longitude: number | null;
  property_images: { storage_path: string }[] | null;
};

const PAGE_SIZE = 12;

function parsePositiveInt(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) || n < 0 ? null : n;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const now = new Date().toISOString();
  const vis = `expires_at.is.null,expires_at.gt.${now}`;

  const page = Math.max(1, parsePositiveInt(sp.page) ?? 1);
  const minRent = parsePositiveInt(sp.min_rent);
  const maxRent = parsePositiveInt(sp.max_rent);
  const bedroomsMin = parsePositiveInt(sp.bedrooms_min);
  const propertyType =
    sp.property_type && PROPERTY_TYPE_LABELS[sp.property_type]
      ? sp.property_type
      : null;
  const furnished =
    sp.furnished && FURNISHED_LABELS[sp.furnished] ? sp.furnished : null;
  const availableFrom =
    sp.available_from && /^\d{4}-\d{2}-\d{2}$/.test(sp.available_from)
      ? sp.available_from
      : null;
  const sort =
    sp.sort === "rent_asc" || sp.sort === "rent_desc" ? sp.sort : "newest";
  const amenityList = (sp.amenities ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  /* 📍 কাছাকাছি — বৈধ হলেই সক্রিয় (২/৫/১০ কিমি) */
  const nearLat = sp.near_lat ? parseFloat(sp.near_lat) : NaN;
  const nearLng = sp.near_lng ? parseFloat(sp.near_lng) : NaN;
  const nearKm = parsePositiveInt(sp.near_km);
  const nearby =
    Number.isFinite(nearLat) &&
    Math.abs(nearLat) <= 90 &&
    Number.isFinite(nearLng) &&
    Math.abs(nearLng) <= 180 &&
    nearKm != null &&
    [2, 5, 10].includes(nearKm)
      ? { lat: nearLat, lng: nearLng, km: nearKm }
      : null;

  // সুবিধা ফিল্টার: আগে মিলে যাওয়া property id বের করি (সঠিক count + পেজিনেশন)
  let amenityIds: string[] | null = null;
  if (amenityList.length > 0) {
    const { data } = await supabase
      .from("property_amenities")
      .select("property_id")
      .in("amenity", amenityList);
    const rows = (data ?? []) as { property_id: string }[];
    amenityIds = [...new Set(rows.map((r) => r.property_id))];
  }

  let results: SearchResult[] = [];
  let total = 0;

  if (amenityIds === null || amenityIds.length > 0) {
    let q = supabase
      .from("properties")
      .select(
        "id,title,district,area,monthly_rent,bedrooms,bathrooms,property_type,is_verified,latitude,longitude,property_images(storage_path)",
        { count: "exact" }
      )
      .eq("status", "approved")
      .or(vis)
      .order("sort_order", {
        foreignTable: "property_images",
        ascending: true,
      })
      .limit(1, { foreignTable: "property_images" });

    if (sp.district?.trim()) q = q.ilike("district", `%${sp.district.trim()}%`);
    if (sp.area?.trim()) q = q.ilike("area", `%${sp.area.trim()}%`);
    if (minRent != null) q = q.gte("monthly_rent", minRent);
    if (maxRent != null) q = q.lte("monthly_rent", maxRent);
    if (propertyType) q = q.eq("property_type", propertyType as never);
    if (furnished) q = q.eq("furnished", furnished as never);
    if (bedroomsMin != null) q = q.gte("bedrooms", bedroomsMin);
    if (availableFrom) q = q.lte("available_from", availableFrom);
    if (amenityIds) q = q.in("id", amenityIds);

    if (sort === "rent_asc") {
      q = q
        .order("monthly_rent", { ascending: true })
        .order("published_at", { ascending: false, nullsFirst: false });
    } else if (sort === "rent_desc") {
      q = q
        .order("monthly_rent", { ascending: false })
        .order("published_at", { ascending: false, nullsFirst: false });
    } else {
      q = q
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
    }

    /* 📍 কাছাকাছি সক্রিয় থাকলে: বেশি রো এনে JS-এ দূরত্বে ফিল্টার+সাজানো */
    if (nearby) {
      q = q.limit(500);
    } else {
      q = q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    }

    const { data, count, error } = await q;
    if (!error) {
      const mapped = ((data ?? []) as DbRow[]).map((p) => ({
        id: p.id,
        title: p.title,
        district: p.district,
        area: p.area,
        monthly_rent: p.monthly_rent,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        property_type: p.property_type,
        is_verified: p.is_verified,
        latitude: p.latitude,
        longitude: p.longitude,
        imageUrl: p.property_images?.[0]?.storage_path
          ? listingImageUrl(p.property_images[0].storage_path)
          : null,
        distance_km:
          nearby && p.latitude != null && p.longitude != null
            ? haversineKm(nearby.lat, nearby.lng, p.latitude, p.longitude)
            : null,
      }));
      if (nearby) {
        const filtered = mapped
          .filter((p) => p.distance_km != null && p.distance_km <= nearby.km)
          .sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
        total = filtered.length;
        results = filtered.slice(
          (page - 1) * PAGE_SIZE,
          page * PAGE_SIZE
        );
      } else {
        total = count ?? 0;
        results = mapped;
      }
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "page" || v == null || v === "") continue;
    qs.set(k, v);
  }
  const queryString = qs.toString();

  const initial: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (v != null) initial[k] = v;
  }

  const [profile, role] = await Promise.all([getMyProfile(), getRole()]);
  const isStaff =
    role === "moderator" || role === "admin" || role === "super_admin";

  /* চাহিদা লেয়ার — function না থাকলে/এরর হলে খালি (সৎ empty state) */
  const demand: HomeMapDemand[] = await supabase
    .rpc("demand_by_area")
    .then(
      (r) => (r.error || !r.data ? [] : r.data),
      () => []
    );

  return (
    <>
      <SiteHeader
        name={profile?.full_name ?? null}
        role={profile ? role : null}
        isStaff={isStaff}
      />

      <main className="container">
        <h2
          style={{ margin: "20px 0 0", color: "var(--primary)" }}
        >
          বাসা খুঁজুন
        </h2>

        <SearchFilters initial={initial} />

        {total === 0 ? (
          <EmptyState
            title="কোনো বিজ্ঞাপন পাওয়া যায়নি"
            hint={
              nearby
                ? `${nearby.km.toLocaleString("bn-BD")} কিমির মধ্যে কোনো বিজ্ঞাপন নেই — দূরত্ব বাড়িয়ে আবার চেষ্টা করুন।`
                : "ফিল্টার বদলে আবার চেষ্টা করুন, অথবা সব ফিল্টার মুছে দিন।"
            }
          />
        ) : (
          <SearchView
            results={results}
            total={total}
            page={page}
            totalPages={totalPages}
            queryString={queryString}
            demand={demand}
            initialView={sp.view === "map" ? "map" : "list"}
            nearLoc={nearby ? { lat: nearby.lat, lng: nearby.lng } : null}
          />
        )}
      </main>
    </>
  );
}
