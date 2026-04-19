import type { MetadataRoute } from "next";
import { getAllCategoriesPublic, getAllProvincesPublic } from "@/lib/db/listings";
import { REGIONS } from "@/lib/utils/regions";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://xn--12c1bik6bbd8af5l3d.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, provinces] = await Promise.all([
    getAllCategoriesPublic(),
    getAllProvincesPublic(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/listings`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${BASE_URL}/property-type/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const provinceRoutes: MetadataRoute.Sitemap = provinces.map((p) => ({
    url: `${BASE_URL}/city/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const regionRoutes: MetadataRoute.Sitemap = REGIONS.map((r) => ({
    url: `${BASE_URL}/state/${r.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...categoryRoutes, ...provinceRoutes, ...regionRoutes];
}
