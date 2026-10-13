import Link from "next/link";
import { PROPERTY_TYPE_LABELS } from "@/lib/labels";
import { formatDistance } from "@/lib/geo";
import styles from "./ListingCard.module.css";

export interface ListingCardData {
  id: string;
  title: string;
  district: string;
  area: string;
  monthly_rent: number;
  bedrooms: number | null;
  bathrooms: number | null;
  property_type: string;
  is_verified: boolean;
  /** ইতিমধ্যে রেজলভ করা পাবলিক ছবি URL; না থাকলে প্লেসহোল্ডার দেখায় */
  imageUrl?: string | null;
  /** 📍 কাছাকাছি ফিল্টারে — ইউজার থেকে দূরত্ব (কিমি) */
  distanceKm?: number | null;
  /** বড় ফিচার্ড কার্ড */
  featured?: boolean;
  /** ২-কলাম গ্রিডের ছোট কার্ড */
  compact?: boolean;
}

/** পাবলিক তালিকার কার্ড — পুরো কার্ড /p/[id]-এ লিংক করে */
export default function ListingCard({
  listing,
  featured = false,
  compact = false,
}: {
  listing: ListingCardData;
  featured?: boolean;
  compact?: boolean;
}) {
  const typeLabel =
    PROPERTY_TYPE_LABELS[listing.property_type] ?? listing.property_type;
  const cls = [styles.card, featured ? styles.featured : "", compact ? styles.compact : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <Link href={`/p/${listing.id}`} className={cls} aria-label={listing.title}>
      <div className={styles.media}>
        {listing.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.imageUrl} alt={listing.title} loading="lazy" />
        ) : (
          <div className={styles.placeholder} aria-hidden="true">
            🏠
          </div>
        )}
        <span className={styles.rentBadge}>
          ৳{listing.monthly_rent.toLocaleString("bn-BD")}
          <small>/মাস</small>
        </span>
        {listing.is_verified && (
          <span className={styles.verified}>✓ যাচাইকৃত</span>
        )}
      </div>
      <div className={styles.body}>
        <span className={styles.typeLabel}>{typeLabel}</span>
        <h3 className={styles.title}>{listing.title}</h3>
        <p className={styles.location}>
          📍 {listing.area}, {listing.district}
          {listing.distanceKm != null && (
            <> · <strong>{formatDistance(listing.distanceKm)} দূরে</strong></>
          )}
        </p>
        <div className={styles.specs}>
          {listing.bedrooms != null && (
            <span>🛏 {listing.bedrooms.toLocaleString("bn-BD")} বেড</span>
          )}
          {listing.bathrooms != null && (
            <span>🚿 {listing.bathrooms.toLocaleString("bn-BD")} বাথ</span>
          )}
        </div>
      </div>
    </Link>
  );
}
