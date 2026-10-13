import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, getRole } from "@/lib/roles";
import { listingImageUrl } from "@/lib/images";
import {
  PROPERTY_TYPE_LABELS,
  FURNISHED_LABELS,
  amenityLabel,
  formatBnDate,
} from "@/lib/labels";
import { SiteHeader } from "@/components/ui";
import Gallery from "./_components/Gallery";
import MiniMap from "./_components/MiniMap";
import ListingActions from "./_components/ListingActions";
import styles from "./detail.module.css";

type PropertyRow = {
  id: string;
  listing_no: string;
  title: string;
  description: string | null;
  property_type: string;
  district: string;
  upazila: string | null;
  area: string;
  address_text: string | null;
  latitude: number | null;
  longitude: number | null;
  monthly_rent: number;
  advance_amount: number | null;
  security_deposit: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  size_sqft: number | null;
  floor_no: number | null;
  furnished: string;
  available_from: string | null;
  is_verified: boolean;
  published_at: string | null;
  view_count: number;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("properties")
    .select("title, district, area, monthly_rent")
    .eq("id", id)
    .eq("status", "approved")
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .maybeSingle();
  const p = data as { title: string; district: string; area: string; monthly_rent: number } | null;
  return {
    title: p
      ? `${p.title} — ৳${p.monthly_rent.toLocaleString("bn-BD")}/মাস | বাসাখুঁজি বাংলাদেশ`
      : "বিজ্ঞাপন পাওয়া যায়নি — বাসাখুঁজি বাংলাদেশ",
  };
}

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const now = new Date().toISOString();
  const vis = `expires_at.is.null,expires_at.gt.${now}`;

  const { data: propData } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .eq("status", "approved")
    .or(vis)
    .maybeSingle();

  const property = propData as PropertyRow | null;
  if (!property) notFound();

  // ভিউ গণনা — অপেক্ষা না করে ফায়ার করা হয়
  supabase.rpc("bump_listing_view", { p_id: id }).then(
    () => undefined,
    () => undefined
  );

  const [{ data: imgData }, { data: amenData }, { data: ownerData }, profile, role] =
    await Promise.all([
      supabase
        .from("property_images")
        .select("storage_path")
        .eq("property_id", id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("property_amenities")
        .select("amenity")
        .eq("property_id", id),
      supabase.rpc("listing_owner", { p_property_id: id }),
      getMyProfile(),
      getRole(),
    ]);

  const images = (((imgData ?? []) as { storage_path: string }[])
    .map((r) => listingImageUrl(r.storage_path))
    .filter((u): u is string => !!u));
  const amenities = ((amenData ?? []) as { amenity: string }[]).map(
    (r) => r.amenity
  );
  const owner =
    (ownerData as { full_name: string; phone: string | null; is_verified: boolean }[] | null)?.[0] ??
    null;

  const isStaff =
    role === "moderator" || role === "admin" || role === "super_admin";

  const specs: [string, string | null][] = [
    ["মাসিক ভাড়া", `৳${property.monthly_rent.toLocaleString("bn-BD")}`],
    [
      "অগ্রিম",
      property.advance_amount != null
        ? `৳${property.advance_amount.toLocaleString("bn-BD")}`
        : null,
    ],
    [
      "জামানত",
      property.security_deposit != null
        ? `৳${property.security_deposit.toLocaleString("bn-BD")}`
        : null,
    ],
    ["ধরন", PROPERTY_TYPE_LABELS[property.property_type] ?? property.property_type],
    [
      "বেডরুম",
      property.bedrooms != null
        ? property.bedrooms.toLocaleString("bn-BD")
        : null,
    ],
    [
      "বাথরুম",
      property.bathrooms != null
        ? property.bathrooms.toLocaleString("bn-BD")
        : null,
    ],
    [
      "আয়তন",
      property.size_sqft != null
        ? `${property.size_sqft.toLocaleString("bn-BD")} বর্গফুট`
        : null,
    ],
    [
      "ফ্লোর",
      property.floor_no != null
        ? property.floor_no.toLocaleString("bn-BD")
        : null,
    ],
    ["ফার্নিশড", FURNISHED_LABELS[property.furnished] ?? property.furnished],
    ["খালি হবে", formatBnDate(property.available_from)],
    ["বিজ্ঞাপন নম্বর", property.listing_no],
    ["প্রকাশের তারিখ", formatBnDate(property.published_at)],
  ].filter(([, v]) => v != null) as [string, string][];

  const locationLine = [property.area, property.upazila, property.district]
    .filter(Boolean)
    .join(", ");

  const hasCoords = property.latitude != null && property.longitude != null;

  return (
    <>
      <SiteHeader
        name={profile?.full_name ?? null}
        role={profile ? role : null}
        isStaff={isStaff}
      />

      <main className={`container ${styles.wrap}`}>
        <Link href="/search" className={styles.back}>
          ← সব বিজ্ঞাপন
        </Link>

        <div className={styles.layout}>
          <article>
            <Gallery images={images} title={property.title} />

            <div className={styles.titleRow}>
              <h1 className={styles.title}>{property.title}</h1>
              {property.is_verified && (
                <span className={styles.verified}>✓ যাচাইকৃত</span>
              )}
            </div>
            <p className={styles.location}>📍 {locationLine}</p>
            {property.address_text && (
              <p className={styles.location}>{property.address_text}</p>
            )}
            <p className={styles.rent}>
              ৳{property.monthly_rent.toLocaleString("bn-BD")}
              <small>/মাস</small>
            </p>

            {property.description && (
              <div className={styles.description}>{property.description}</div>
            )}

            <table className={styles.specTable}>
              <tbody>
                {specs.map(([label, value]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {amenities.length > 0 && (
              <>
                <h2 className={styles.sectionTitle}>সুবিধাসমূহ</h2>
                <div className={styles.amenityChips}>
                  {amenities.map((a) => (
                    <span key={a} className={styles.amenityChip}>
                      {amenityLabel(a)}
                    </span>
                  ))}
                </div>
              </>
            )}

            {hasCoords && (
              <>
                <h2 className={styles.sectionTitle}>অবস্থান</h2>
                <MiniMap
                  lat={property.latitude as number}
                  lng={property.longitude as number}
                  title={property.title}
                />
              </>
            )}
          </article>

          <aside className={styles.sidebar}>
            <div className={styles.ownerCard}>
              <h3>যোগাযোগ</h3>
              {owner ? (
                <>
                  <p className={styles.ownerName}>
                    {owner.full_name}
                    {owner.is_verified && (
                      <span className={styles.ownerVerified}>✓ যাচাইকৃত</span>
                    )}
                  </p>
                  {owner.phone ? (
                    <a
                      className={styles.ownerPhone}
                      href={`tel:${owner.phone.replace(/\s+/g, "")}`}
                    >
                      📞 {owner.phone}
                    </a>
                  ) : (
                    <p className={styles.location}>
                      ফোন নম্বর দেওয়া নেই — নিচে মেসেজ পাঠান।
                    </p>
                  )}
                </>
              ) : (
                <p className={styles.location}>
                  যোগাযোগের তথ্য পাওয়া যাচ্ছে না।
                </p>
              )}
              <p className={styles.safetyTip}>
                ⚠️ নিরাপদ থাকুন: অগ্রিম টাকা পাঠাবেন না। বাসা দেখে, কাগজপত্র
                যাচাই করে তারপর লেনদেন করুন।
              </p>
            </div>

            <ListingActions propertyId={property.id} title={property.title} />
          </aside>
        </div>
      </main>
    </>
  );
}
