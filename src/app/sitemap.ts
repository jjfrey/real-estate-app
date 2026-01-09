import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://distincthomes.com";

// Static pages
const staticPages = [
  "",
  "/search",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticUrls = staticPages.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  // In production, you'd fetch listings and cities from the database
  // For now, return static pages only
  // TODO: Add dynamic listing URLs when database is connected

  return staticUrls;
}
