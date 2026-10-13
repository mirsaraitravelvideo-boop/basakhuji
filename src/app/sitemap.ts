import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://basakhuji-bangladesh.example.com";

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
  { url: `${SITE_URL}/search`, changeFrequency: "daily", priority: 0.9 },
  { url: `${SITE_URL}/notices`, changeFrequency: "daily", priority: 0.7 },
  { url: `${SITE_URL}/auth/login`, changeFrequency: "monthly", priority: 0.3 },
  { url: `${SITE_URL}/auth/signup`, changeFrequency: "monthly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Dynamic listing routes: best-effort only — never crash the build.
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return STATIC_ROUTES;

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(url, anonKey);
    const { data, error } = await supabase
      .from("properties")
      .select("id, updated_at")
      .eq("status", "approved")
      .or("expires_at.is.null,expires_at.gt.now()")
      .limit(5000);
    if (error || !data) return STATIC_ROUTES;

    const listingRoutes: MetadataRoute.Sitemap = data.map((p) => ({
      url: `${SITE_URL}/p/${p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
    return [...STATIC_ROUTES, ...listingRoutes];
  } catch {
    return STATIC_ROUTES;
  }
}
