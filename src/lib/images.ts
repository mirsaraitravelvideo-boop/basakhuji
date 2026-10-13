/**
 * লিস্টিং ছবির পাবলিক URL বানায়।
 * - ফাঁকা পথ → ফলব্যাক আইকন
 * - পূর্ণ http(s) URL → যেমন আছে তেমন
 * - seed-images/... → লোকাল স্ট্যাটিক পাথ
 * - বাকি সব → property-images বাকেটের পাবলিক URL
 */
export function listingImageUrl(path: string | null): string {
  if (!path) return "/icon.svg";
  if (path.startsWith("http")) return path;
  if (path.startsWith("seed-images/")) return "/" + path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-images/${path}`;
}
