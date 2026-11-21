// 从 LMArena 官方 HuggingFace 数据集拉取 Arena 榜（文生图 / 文生视频 / 图生视频）
// 数据集：https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset
// 许可：CC-BY-4.0（展示时需注明来源）
// 用法：node scripts/fetch-lmarena.mjs
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { parquetReadObjects } from "hyparquet"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const DATA_DIR = join(ROOT, "data", "snapshot")
const META_PATH = join(DATA_DIR, "meta.json")
const DATASET = "lmarena-ai/leaderboard-dataset"
const DATASET_URL = `https://huggingface.co/datasets/${DATASET}`
const CATEGORY = "overall"
const MAX_RETRIES = 5

const CONFIGS = [
  { config: "text_to_image", file: "text-to-image" },
  { config: "text_to_video", file: "text-to-video" },
  { config: "image_to_video", file: "image-to-video" },
]

const LLM_RANK_LABEL = "Artificial Analysis（LLM Rank 快照）"

// LMArena 的 organization 是 slug，补一些常见品牌的展示名
const ORG_NAMES = {
  openai: "OpenAI",
  google: "Google",
  anthropic: "Anthropic",
  meta: "Meta",
  xai: "xAI",
  alibaba: "Alibaba",
  bytedance: "ByteDance",
  deepseek: "DeepSeek",
  mistral: "Mistral",
  nvidia: "NVIDIA",
  amazon: "Amazon",
  microsoft: "Microsoft",
  "microsoft-ai": "Microsoft AI",
  apple: "Apple",
  tencent: "Tencent",
  baidu: "Baidu",
  zhipu: "Zhipu AI",
  moonshot: "Moonshot AI",
  minimax: "MiniMax",
  "luma-ai": "Luma AI",
  "black-forest-labs": "Black Forest Labs",
  bfl: "Black Forest Labs",
  ideogram: "Ideogram",
  recraft: "Recraft",
  krea: "Krea",
  runway: "Runway",
  pika: "Pika",
  kling: "Kling",
  "leonardo-ai": "Leonardo AI",
  hidream: "HiDream",
  genmo: "Genmo",
  reve: "Reve",
  "skyreel": "SkyReel",
  "aorizon": "Aorizon",
  "shengshu": "Shengshu",
  "kandinsky": "Kandinsky",
}

function todayStr() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, "0")
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function prettyOrg(slug) {
  if (!slug) return "Unknown"
  if (ORG_NAMES[slug]) return ORG_NAMES[slug]
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function round1(n) {
  return Math.round(n * 10) / 10
}

function toArenaModel(row, config) {
  const rating = Number(row.rating)
  const lower = Number(row.rating_lower)
  const upper = Number(row.rating_upper)
  const org = slugify(row.organization) || "unknown"
  return {
    id: `${config}:${row.model_name}`,
    name: String(row.model_name ?? ""),
    slug: slugify(row.model_name),
    model_creator: {
      id: org,
      name: prettyOrg(org),
      slug: org,
    },
    elo: Number.isFinite(rating) ? round1(rating) : null,
    rank: row.rank == null ? null : Number(row.rank),
    ci95:
      Number.isFinite(rating) && Number.isFinite(lower) && Number.isFinite(upper)
        ? `-${Math.round(rating - lower)}/${Math.round(upper - rating)}`
        : null,
    appearances: row.vote_count == null ? null : Number(row.vote_count),
    release_date: null,
  }
}

async function fetchParquet(config) {
  const url = `https://huggingface.co/datasets/${DATASET}/resolve/main/${config}/latest-00000-of-00001.parquet`
  let lastError = null
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": "modelrank-lmarena/1.0" },
        signal: AbortSignal.timeout(60000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buffer = await res.arrayBuffer()
      return await parquetReadObjects({ file: buffer })
    } catch (e) {
      lastError = e
      if (attempt === MAX_RETRIES) break
      const wait = 1000 * 2 ** (attempt - 1)
      console.log(`[lmarena] ${config} attempt ${attempt} failed: ${e.message}; retrying in ${wait / 1000}s`)
      await new Promise((resolve) => setTimeout(resolve, wait))
    }
  }
  throw lastError ?? new Error("unknown error")
}

function readMeta() {
  if (!existsSync(META_PATH)) return null
  try {
    return JSON.parse(readFileSync(META_PATH, "utf-8"))
  } catch {
    return null
  }
}

function writeMeta(patch) {
  const old = readMeta()
  const meta = {
    date: old?.date ?? "",
    files: { ...(old?.files ?? {}) },
    sources: { ...(old?.sources ?? {}) },
  }

  // 首次切换数据源时，旧 meta 还没有 sources，按旧快照日期补齐文本/语音来源
  const fallbackDate = meta.date || todayStr()
  if (!meta.sources.models) {
    meta.sources.models = { source: "llmrank", label: LLM_RANK_LABEL, date: fallbackDate, url: "https://llmrank.cn" }
  }
  if (!meta.sources["text-to-speech"]) {
    meta.sources["text-to-speech"] = { source: "llmrank", label: LLM_RANK_LABEL, date: fallbackDate, url: "https://llmrank.cn" }
  }

  for (const [file, info] of Object.entries(patch)) {
    meta.files[file] = info.rows
    meta.sources[file] = {
      source: "lmarena",
      label: "LMArena",
      date: info.date,
      url: DATASET_URL,
    }
  }

  const dates = Object.values(meta.sources)
    .map((s) => s?.date)
    .filter(Boolean)
    .sort()
  if (dates.length) meta.date = dates[dates.length - 1]

  writeFileSync(META_PATH, JSON.stringify(meta, null, 2) + "\n")
  return meta
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true })
  const patch = {}
  let failures = 0

  for (const { config, file } of CONFIGS) {
    try {
      const rawRows = await fetchParquet(config)
      const overallRows = rawRows.filter((r) => r.category === CATEGORY)
      const rows = overallRows
        .map((r) => toArenaModel(r, config))
        .filter((r) => r.name && Number.isFinite(r.elo))

      if (!rows.length) throw new Error("no overall rows")

      // LMArena 的 rank 是官方名次；缺失时按 Elo 降序补
      rows.sort((a, b) => {
        if (a.rank != null && b.rank != null) return a.rank - b.rank
        if (a.rank != null) return -1
        if (b.rank != null) return 1
        return b.elo - a.elo
      })

      const dates = [...new Set(overallRows.map((r) => r.leaderboard_publish_date).filter(Boolean))].sort()
      const date = dates[dates.length - 1] ?? todayStr()
      const payload = {
        status: 200,
        source: "lmarena",
        source_url: DATASET_URL,
        date,
        category: CATEGORY,
        data: rows,
      }
      writeFileSync(join(DATA_DIR, `${file}.json`), JSON.stringify(payload))
      patch[file] = { rows: rows.length, date }
      console.log(`[lmarena] ${file}.json OK (${rows.length}, ${date})`)
    } catch (e) {
      failures++
      console.error(`[lmarena] ${file}.json FAILED: ${e.message}`)
    }
  }

  if (!Object.keys(patch).length) {
    console.error("[lmarena] no arena data fetched; keeping existing files")
    return 2
  }

  const meta = writeMeta(patch)
  console.log(`[lmarena] done, meta date: ${meta.date}, files: ${JSON.stringify(meta.files)}`)
  if (failures) {
    console.warn(`[lmarena] WARNING: ${failures} of ${CONFIGS.length} arena files failed; kept previous data`)
  }
  return 0
}

main()
  .then((code) => {
    process.exitCode = code
  })
  .catch((e) => {
    console.error("[lmarena] fatal:", e)
    process.exit(1)
  })
