import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import type { ArenaModel, ArenaCategory, SnapshotMeta, TextModel } from "@/lib/types"

const SNAPSHOT_DIR = join(process.cwd(), "data", "snapshot")

function readJson<T>(file: string): T | null {
  const path = join(SNAPSHOT_DIR, file)
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T
  } catch {
    return null
  }
}

export interface TextDataset {
  models: TextModel[]
  meta: SnapshotMeta | null
}

/** 文本类模型（models.json） */
export function getTextDataset(): TextDataset {
  const raw = readJson<{ data: TextModel[] }>("models.json")
  const meta = readJson<SnapshotMeta>("meta.json")
  return { models: raw?.data ?? [], meta }
}

/** 竞技场榜单（elo 数据） */
export function getArenaData(category: ArenaCategory): ArenaModel[] {
  const raw = readJson<{ data: ArenaModel[] }>(`${category}.json`)
  return raw?.data ?? []
}

/** 全部竞技场榜单，按 tab 顺序 */
export function getAllArenaData(): Record<ArenaCategory, ArenaModel[]> {
  const out = {} as Record<ArenaCategory, ArenaModel[]>
  for (const key of ["text-to-image", "text-to-video", "image-to-video", "text-to-speech"] as ArenaCategory[]) {
    out[key] = getArenaData(key)
  }
  return out
}

export function getSnapshotDate(): string | null {
  const meta = readJson<SnapshotMeta>("meta.json")
  return meta?.date ?? null
}

/** 按 slug 找文本模型 */
export function findModelBySlug(slug: string): { model: TextModel; index: number } | null {
  const { models } = getTextDataset()
  const index = models.findIndex((m) => m.slug === slug)
  return index >= 0 ? { model: models[index], index } : null
}

/** 全部有效 slug（供 generateStaticParams） */
export function getAllModelSlugs(): string[] {
  return getTextDataset().models.map((m) => m.slug)
}