import type { MetadataRoute } from "next";
import { getAllCategoriesPublic, getAllProvincesPublic } from "@/lib/db/listings";
import { createAdminClient } from "@/lib/supabase/admin";
import { REGIONS } from "@/lib/utils/regions";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://xn--12c1bik6bbd8af5l3d.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient();

  const [categories, provinces, { data: listings }, { data: articles }] = await Promise.all([
    getAllCategoriesPublic(),
    getAllProvincesPublic(),
    supabase
      .from("listings")
      .select("slug, updated_at")
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(5000),
    supabase
      .from("articles")
      .select("slug, updated_at")
      .eq("status", "published")
      .order("updated_at", { ascending: false }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/listings`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  const listingRoutes: MetadataRoute.Sitemap = (listings ?? []).map((l) => ({
    url: `${BASE_URL}/property/${encodeURIComponent(l.slug)}`,
    lastModified: new Date(l.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${BASE_URL}/property-type/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  const provinceRoutes: MetadataRoute.Sitemap = provinces.map((p) => ({
    url: `${BASE_URL}/city/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  const regionRoutes: MetadataRoute.Sitemap = REGIONS.map((r) => ({
    url: `${BASE_URL}/state/${r.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  const articleRoutes: MetadataRoute.Sitemap = (articles ?? []).map((a) => ({
    url: `${BASE_URL}/blog/${encodeURIComponent(a.slug)}`,
    lastModified: new Date(a.updated_at),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...listingRoutes, ...articleRoutes, ...categoryRoutes, ...provinceRoutes, ...regionRoutes];
}
