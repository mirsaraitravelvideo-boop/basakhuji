import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, getRole } from "@/lib/roles";
import { listingImageUrl } from "@/lib/images";
import { SiteHeader, EmptyState } from "@/components/ui";
import ListingCard, { type ListingCardData } from "@/components/ListingCard";
import HeroSearch from "./_components/HeroSearch";
import HomeMap, { type HomeMapPoint } from "./_components/HomeMap";
import homeStyles from "./home.module.css";

const FALLBACK_NOTICE = "স্বাগতম! বাসাখুঁজি বাংলাদেশ — নিরাপদ বাসা ভাড়ার ঠিকানা।";

/* ব্যাচেলর ভাড়া ঢাকায় মূলত রুম/শেয়ারড — তাই রুম ফিল্টারে পাঠায় */
const CHIPS: { label: string; href: string }[] = [
  { label: "ফ্ল্যাট", href: "/search?property_type=flat" },
  { label: "সাবলেট", href: "/search?property_type=sublet" },
  { label: "ব্যাচেলর", href: "/search?property_type=room" },
  { label: "অফিস", href: "/search?property_type=office" },
];

type HomeRow = {
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

/** হিরোর হালকা স্কাইলাইন লাইন-আর্ট */
function Skyline() {
  return (
    <svg
      className={homeStyles.skyline}
      viewBox="0 0 900 130"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <g
        fill="rgba(255,255,255,0.05)"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="2"
      >
        <rect x="15" y="70" width="60" height="60" />
        <rect x="85" y="50" width="55" height="80" />
        <rect x="150" y="30" width="16" height="100" />
        <circle cx="158" cy="24" r="7" />
        <rect x="185" y="62" width="80" height="68" />
        <path d="M285 62 A45 45 0 0 1 375 62 L375 130 L285 130 Z" />
        <rect x="395" y="48" width="60" height="82" />
        <rect x="465" y="68" width="75" height="62" />
        <rect x="550" y="42" width="58" height="88" />
        <rect x="618" y="66" width="80" height="64" />
        <rect x="708" y="52" width="62" height="78" />
        <rect x="780" y="72" width="105" height="58" />
      </g>
    </svg>
  );
}

export default async function Home() {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const vis = `expires_at.is.null,expires_at.gt.${now}`;

  const [{ data: noticeRow }, { data: propRows }, profile, role] =
    await Promise.all([
      supabase
        .from("notices")
        .select("id, title")
        .eq("is_published", true)
        .lte("published_at", now)
        .or(vis)
        .eq("target_audience", "all")
        .order("priority", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("properties")
        .select(
          "id,title,district,area,monthly_rent,bedrooms,bathrooms,property_type,is_verified,latitude,longitude,property_images(storage_path)"
        )
        .eq("status", "approved")
        .or(vis)
        .order("sort_order", { foreignTable: "property_images", ascending: true })
        .limit(1, { foreignTable: "property_images" })
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(9),
      getMyProfile(),
      getRole(),
    ]);

  const rows = ((propRows ?? []) as HomeRow[]).map((p) => ({
    ...p,
    imageUrl: p.property_images?.[0]?.storage_path
      ? listingImageUrl(p.property_images[0].storage_path)
      : null,
  }));

  const listings: ListingCardData[] = rows.map((p) => ({
    id: p.id,
    title: p.title,
    district: p.district,
    area: p.area,
    monthly_rent: p.monthly_rent,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    property_type: p.property_type,
    is_verified: p.is_verified,
    imageUrl: p.imageUrl,
  }));

  const mapPoints: HomeMapPoint[] = rows
    .filter((p) => p.latitude != null && p.longitude != null)
    .map((p) => ({
      id: p.id,
      title: p.title,
      lat: p.latitude as number,
      lng: p.longitude as number,
      rent: p.monthly_rent,
    }));

  const [featured, ...rest] = listings;

  const isStaff =
    role === "moderator" || role === "admin" || role === "super_admin";

  return (
    <>
      <div className="notice-bar" role="status">
        {noticeRow ? (
          <Link href="/notices" className={homeStyles.noticeLink}>
            📢 {noticeRow.title}
          </Link>
        ) : (
          FALLBACK_NOTICE
        )}
      </div>

      <SiteHeader
        name={profile?.full_name ?? null}
        role={profile ? role : null}
        isStaff={isStaff}
      />

      <main>
        <section className="hero">
          <div className="container">
            <h1>আপনার জন্য নিখুঁত বাসা খুঁজুন</h1>
            <p>যাচাইকৃত বিজ্ঞাপন, নিরাপদ যোগাযোগ, সম্পূর্ণ বাংলায়।</p>
          </div>
          <Skyline />
        </section>

        <div className="container">
          <div className={homeStyles.searchFloat}>
            <HeroSearch />
          </div>
        </div>

        <div className="container">
          <nav className={homeStyles.chips} aria-label="বাসার ধরন">
            {CHIPS.map((c) => (
              <Link key={c.label} href={c.href} className={homeStyles.chip}>
                {c.label}
              </Link>
            ))}
          </nav>
        </div>

        <section className="section">
          <div className="container">
            <div className={homeStyles.sectionHead}>
              <h2>সাম্প্রতিক বিজ্ঞাপন</h2>
              {listings.length > 0 && (
                <Link href="/search" className={homeStyles.seeAll}>
                  সব দেখুন →
                </Link>
              )}
            </div>
            {listings.length > 0 ? (
              <>
                {featured && (
                  <div className={homeStyles.featuredWrap}>
                    <ListingCard listing={featured} featured />
                  </div>
                )}
                {rest.length > 0 && (
                  <div className={homeStyles.grid}>
                    {rest.map((l) => (
                      <ListingCard key={l.id} listing={l} compact />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                title="এখনো কোনো বিজ্ঞাপন প্রকাশিত হয়নি"
                hint="প্রথম বিজ্ঞাপন প্রকাশিত হলেই এখানে দেখা যাবে।"
                actionHref="/search"
                actionLabel="সব বিজ্ঞাপন দেখুন"
              />
            )}
          </div>
        </section>

        {mapPoints.length > 0 && (
          <section className="section" style={{ paddingTop: 0 }}>
            <div className="container">
              <h2>ম্যাপে দেখুন</h2>
              <p className={homeStyles.mapHint}>
                পিনে চাপ দিলে বিজ্ঞাপনটি খুলবে।
              </p>
              <HomeMap points={mapPoints} />
            </div>
          </section>
        )}

        <section className="section">
          <div className="container">
            <h2>কীভাবে কাজ করে</h2>
            <div className="steps">
              <div className="step-card">
                <span className="step-num">১</span>
                <h3>বাসা খুঁজুন</h3>
                <p>
                  জেলা, এলাকা, ভাড়া ও সুবিধা অনুযায়ী ফিল্টার করে পছন্দের বাসা
                  বেছে নিন।
                </p>
              </div>
              <div className="step-card">
                <span className="step-num">২</span>
                <h3>যোগাযোগ করুন</h3>
                <p>নিরাপদ ইন-অ্যাপ চ্যাটে বাড়িওয়ালার সঙ্গে সরাসরি কথা বলুন।</p>
              </div>
              <div className="step-card">
                <span className="step-num">৩</span>
                <h3>বাসা নিশ্চিত করুন</h3>
                <p>বাসা দেখে সন্তুষ্ট হলে শর্ত মিলিয়ে ভাড়া চূড়ান্ত করুন।</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">
          <div>
            <strong>বাসাখুঁজি বাংলাদেশ</strong>
            <br />
            নিরাপদ ও স্বচ্ছ বাসা ভাড়ার প্ল্যাটফর্ম।
          </div>
          <div>
            <Link href="/search">বাসা খুঁজুন</Link>
            {" · "}
            <Link href="/notices">নোটিশ</Link>
            {" · "}
            <Link href="/auth/signup">অ্যাকাউন্ট খুলুন</Link>
          </div>
          <div>© ২০২৬ বাসাখুঁজি বাংলাদেশ</div>
        </div>
      </footer>
    </>
  );
}
