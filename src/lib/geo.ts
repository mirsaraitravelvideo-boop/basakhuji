// ভূগোল হেল্পার — দূরত্ব (Haversine) ও বাংলা ফরম্যাটিং

/** দুই কোঅর্ডিনেটের মধ্যে সরলরৈখিক দূরত্ব, কিলোমিটারে */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // পৃথিবীর ব্যাসার্ধ (কিমি)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** "১.২ কিমি" / "৮০০ মি" — বাংলা সংখ্যায় */
export function formatDistance(km: number): string {
  if (!Number.isFinite(km) || km < 0) return "—";
  if (km < 1) {
    const m = Math.round(km * 1000);
    return `${m.toLocaleString("bn-BD")} মি`;
  }
  const rounded = km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
  return `${rounded.toLocaleString("bn-BD")} কিমি`;
}

/** বাংলাদেশের ভিউবক্স (Nominatim বায়াসের জন্য) */
export const BD_VIEWBOX = {
  left: 88.0,
  top: 26.7,
  right: 92.7,
  bottom: 20.5,
} as const;
