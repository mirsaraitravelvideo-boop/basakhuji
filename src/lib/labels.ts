// Shared Bengali labels + canonical amenity slugs.
// NOTE: amenity slugs are canonical — landlord/admin agents must reuse
// these exact slugs when writing to property_amenities.

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  flat: "ফ্ল্যাট",
  house: "বাড়ি",
  room: "রুম",
  sublet: "সাবলেট",
  office: "অফিস",
  shop: "দোকান",
  plot: "প্লট",
};

export const FURNISHED_LABELS: Record<string, string> = {
  unfurnished: "আনফার্নিশড",
  semi_furnished: "আংশিক ফার্নিশড",
  furnished: "ফার্নিশড",
};

export interface AmenityDef {
  slug: string;
  label: string;
}

export const AMENITIES: AmenityDef[] = [
  { slug: "gas", label: "গ্যাস" },
  { slug: "lift", label: "লিফট" },
  { slug: "parking", label: "পার্কিং" },
  { slug: "generator", label: "জেনারেটর" },
  { slug: "wifi", label: "ওয়াইফাই" },
  { slug: "security", label: "নিরাপত্তা প্রহরী" },
  { slug: "cctv", label: "সিসিটিভি" },
  { slug: "darowan", label: "দারোয়ান" },
  { slug: "water", label: "বিশুদ্ধ পানি" },
  { slug: "balcony", label: "বারান্দা" },
  { slug: "ac", label: "এসি" },
  { slug: "mosque", label: "কাছে মসজিদ" },
  { slug: "market", label: "কাছে বাজার" },
];

export const AMENITY_LABELS: Record<string, string> = Object.fromEntries(
  AMENITIES.map((a) => [a.slug, a.label])
);

export function amenityLabel(slug: string): string {
  return AMENITY_LABELS[slug] ?? slug;
}

// Visibility rule (mirrors RLS — do not rely on RLS alone).
export function visibilityFilter(): string {
  return `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`;
}

// Short rent for map markers, e.g. 15000 -> "৳১৫হা"
export function shortRent(rent: number): string {
  if (rent >= 1000) {
    const k = rent / 1000;
    const rounded = Math.round(k * 10) / 10;
    return `৳${rounded.toLocaleString("bn-BD")}হা`;
  }
  return `৳${rent.toLocaleString("bn-BD")}`;
}

export function formatBnDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("bn-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
