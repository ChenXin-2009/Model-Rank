import type { MetadataRoute } from "next"
import { getAllModelSlugs, getSnapshotDate } from "@/lib/data"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://model-rank.vercel.app"
  const date = getSnapshotDate() ?? new Date().toISOString().slice(0, 10)

  const entries: MetadataRoute.Sitemap = [
    { url: base, lastModified: date, changeFrequency: "daily", priority: 1 },
    { url: `${base}/evaluations`, lastModified: date, changeFrequency: "weekly", priority: 0.8 },
    ...getAllModelSlugs().map((slug) => ({
      url: `${base}/model/${slug}`,
      lastModified: date,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ]
  return entries
}