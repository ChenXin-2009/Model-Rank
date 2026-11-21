// 从 llmrank OSS 拉取每日数据快照到 data/snapshot/
// 用法: node scripts/fetch-data.mjs  [--date 2026-08-08]
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const DATA_DIR = join(ROOT, "data", "snapshot")
const BASE = "https://llmrank.oss-rg-china-mainland.aliyuncs.com/data"

// 文本与语音仍从 llmrank 拉取；三个 Arena 榜已切换到 LMArena（scripts/fetch-lmarena.mjs）
const FILE_NAMES = ["models", "text-to-speech"]
const LLM_RANK_LABEL = "Artificial Analysis（LLM Rank 快照）"

// 自动探测最近多少天内的快照（上游偶尔延迟发布时仍可回退）
const LOOKBACK_DAYS = Math.max(1, Number(process.env.SNAPSHOT_LOOKBACK_DAYS) || 30)

function todayStr(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  const p = (n) => String(n).padStart(2, "0")
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`
}

function fallbackArgs() {
  const idx = process.argv.indexOf("--date")
  return idx >= 0 ? process.argv[idx + 1] : null
}

function ageInDays(date) {
  const t = Date.parse(`${date}T00:00:00Z`)
  return Number.isNaN(t) ? null : Math.max(0, Math.floor((Date.now() - t) / 86400000))
}

function readExistingMeta() {
  const file = join(DATA_DIR, "meta.json")
  if (!existsSync(file)) return null
  try {
    return JSON.parse(readFileSync(file, "utf-8"))
  } catch {
    return null
  }
}

/** 从今天往前探测，返回最近一个有 models 数据的日期 */
async function findLatestDate() {
  for (let i = 0; i < LOOKBACK_DAYS; i++) {
    const candidate = todayStr(-i)
    try {
      const probe = await fetchJson(`${BASE}/${candidate}/models.json`, 10000)
      if (probe?.data?.length > 0) return candidate
    } catch (e) {
      // 404 表示当天没有快照，继续向前找；其它错误打日志方便排查
      if (!/HTTP 404/.test(e.message)) console.log(`[fetch] probe ${candidate} failed: ${e.message}`)
    }
  }
  return null
}

async function fetchJson(url, timeoutMs = 30000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "user-agent": "modelrank-refresh/1.0" } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

// 实时汇率快照：open.er-api.com 为主，exchangerate-api.com 兜底，再失败则保留旧值/默认 7.2
const EXCHANGE_SOURCES = [
  { name: "open.er-api.com", url: "https://open.er-api.com/v6/latest/USD", pick: (j) => ({ rate: j?.rates?.CNY, updated: j?.time_last_update_utc }) },
  { name: "exchangerate-api.com", url: "https://api.exchangerate-api.com/v4/latest/USD", pick: (j) => ({ rate: j?.rates?.CNY, updated: j?.date }) },
]

async function fetchExchangeRate() {
  const old = existsSync(join(DATA_DIR, "exchange.json"))
    ? JSON.parse(readFileSync(join(DATA_DIR, "exchange.json"), "utf-8"))
    : null
  for (const src of EXCHANGE_SOURCES) {
    try {
      const json = await fetchJson(src.url, 10000)
      const { rate, updated } = src.pick(json)
      if (typeof rate === "number" && rate > 0) {
        return { rate: Number(rate.toFixed(4)), updated: updated ?? null, source: src.name }
      }
    } catch (e) {
      console.log(`[fetch] exchange ${src.name} FAILED: ${e.message}`)
    }
  }
  if (old && typeof old.rate === "number") {
    console.log(`[fetch] exchange keep previous rate ${old.rate}`)
    return { ...old, source: `${old.source} (stale)` }
  }
  return { rate: 7.2, updated: null, source: "default" }
}

/**
 * 拉取快照。
 * @returns {Promise<0|2>} 0 = 已更新；2 = 上游没有可用快照（保留现有数据）
 */
async function fetchSnapshot() {
  mkdirSync(DATA_DIR, { recursive: true })
  let date = fallbackArgs()

  if (date) {
    console.log(`[fetch] snapshot date (manual): ${date}`)
  } else {
    console.log(`[fetch] probing latest snapshot (up to ${LOOKBACK_DAYS} days back)`)
    date = await findLatestDate()
    if (!date) {
      console.error(`[fetch] no snapshot published in the last ${LOOKBACK_DAYS} days; keeping existing data`)
      return 2
    }
  }

  console.log(`[fetch] snapshot date: ${date}`)
  const oldMeta = readExistingMeta()
  const summary = { date, files: {}, sources: {} }
  for (const name of FILE_NAMES) {
    const url = `${BASE}/${date}/${name}.json`
    try {
      const json = await fetchJson(url)
      const rows = json?.data?.length ?? 0
      if (!rows) { console.log(`[fetch] ${name}.json -> empty, skip`); continue }
      const file = join(DATA_DIR, `${name}.json`)
      writeFileSync(file, JSON.stringify(json, null, 0))
      summary.files[name] = rows
      summary.sources[name] = {
        source: "llmrank",
        label: LLM_RANK_LABEL,
        date,
        url: "https://llmrank.cn",
      }
      console.log(`[fetch] ${name}.json OK (${rows})`)
    } catch (e) {
      console.log(`[fetch] ${name}.json MISSING: ${e.message}`)
    }
  }

  // 没有任何文件时保持旧快照不动，避免把 meta.json 覆盖成空数据
  if (!Object.keys(summary.files).length) {
    console.error(`[fetch] snapshot ${date} has no usable files; keeping existing data`)
    return 2
  }

  // 保留未由 llmrank 更新的文件（例如 LMArena 的 Arena 榜）及其来源日期
  for (const [name, rows] of Object.entries(oldMeta?.files ?? {})) {
    if (!(name in summary.files)) summary.files[name] = rows
  }
  for (const [name, src] of Object.entries(oldMeta?.sources ?? {})) {
    if (!(name in summary.sources)) summary.sources[name] = src
  }
  for (const name of Object.keys(summary.files)) {
    if (!summary.sources[name]) {
      summary.sources[name] = {
        source: "llmrank",
        label: LLM_RANK_LABEL,
        date: oldMeta?.date ?? date,
        url: "https://llmrank.cn",
      }
    }
  }
  const sourceDates = Object.values(summary.sources).map((s) => s?.date).filter(Boolean).sort()
  if (sourceDates.length) summary.date = sourceDates[sourceDates.length - 1]

  writeFileSync(join(DATA_DIR, "meta.json"), JSON.stringify(summary, null, 2) + "\n")
  const age = ageInDays(date)
  if (age !== null && age > 1) {
    console.warn(`[fetch] WARNING: latest upstream snapshot is ${age} days old (${date})`)
  }
  console.log(`[fetch] done, meta: ${JSON.stringify(summary)}`)
  return 0
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true })
  const exchange = await fetchExchangeRate()
  writeFileSync(join(DATA_DIR, "exchange.json"), JSON.stringify(exchange, null, 2))
  console.log(`[fetch] exchange 1 USD = ${exchange.rate} CNY (${exchange.source}, ${exchange.updated ?? "n/a"})`)
  process.exitCode = await fetchSnapshot()
}

main().catch((e) => { console.error("[fetch] fatal:", e); process.exit(1) })