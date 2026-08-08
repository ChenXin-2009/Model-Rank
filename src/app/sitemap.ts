import type { MetadataRoute } from "next"
import { getAllModelSlugs, getSnapshotDate } from "@/lib/data"
import { SITE_URL } from "@/lib/site"

export default function sitemap(): MetadataRoute.Sitemap {
  const date = getSnapshotDate() ?? new Date().toISOString().slice(0, 10)

  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: date, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/evaluations`, lastModified: date, changeFrequency: "weekly", priority: 0.8 },
    ...getAllModelSlugs().map((slug) => ({
      url: `${SITE_URL}/model/${slug}`,
      lastModified: date,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ]
  return entries
}