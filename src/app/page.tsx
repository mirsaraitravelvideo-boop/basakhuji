import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, getRole } from "@/lib/roles";
import { listingImageUrl } from "@/lib/images";
import { SiteHeader, EmptyState } from "@/components/ui";
import ListingCard, { type ListingCardData } from "@/components/ListingCard";
import HeroSearch from "./_components/HeroSearch";
import homeStyles from "./home.module.css";

const FALLBACK_NOTICE = "স্বাগতম! বাসাখুঁজি বাংলাদেশ — নিরাপদ বাসা ভাড়ার ঠিকানা।";

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
  property_images: { storage_path: string }[] | null;
};

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
          "id,title,district,area,monthly_rent,bedrooms,bathrooms,property_type,is_verified,property_images(storage_path)"
        )
        .eq("status", "approved")
        .or(vis)
        .order("sort_order", { foreignTable: "property_images", ascending: true })
        .limit(1, { foreignTable: "property_images" })
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(8),
      getMyProfile(),
      getRole(),
    ]);

  const listings: ListingCardData[] = ((propRows ?? []) as HomeRow[]).map(
    (p) => ({
      id: p.id,
      title: p.title,
      district: p.district,
      area: p.area,
      monthly_rent: p.monthly_rent,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      property_type: p.property_type,
      is_verified: p.is_verified,
      imageUrl: p.property_images?.[0]?.storage_path
        ? listingImageUrl(p.property_images[0].storage_path)
        : null,
    })
  );

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
            <h1>আপনার পছন্দের বাসা, এখন হাতের মুঠোয়</h1>
            <p>যাচাইকৃত বিজ্ঞাপন, নিরাপদ যোগাযোগ, সম্পূর্ণ বাংলায়।</p>
            <HeroSearch />
          </div>
        </section>

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
              <div className={homeStyles.grid}>
                {listings.map((l) => (
                  <ListingCard key={l.id} listing={l} />
                ))}
              </div>
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
