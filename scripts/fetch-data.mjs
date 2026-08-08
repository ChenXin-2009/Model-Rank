// 从 llmrank OSS 拉取每日数据快照到 data/snapshot/
// 用法: node scripts/fetch-data.mjs  [--date 2026-08-08]
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const DATA_DIR = join(ROOT, "data", "snapshot")
const BASE = "https://llmrank.oss-rg-china-mainland.aliyuncs.com/data"

// 可能的文件名（部分缺失，探测后保留存在的）
const FILE_NAMES = ["models", "text-to-image", "text-to-video", "image-to-video", "text-to-speech"]

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

async function fetchSnapshot() {
  mkdirSync(DATA_DIR, { recursive: true })
  let date = fallbackArgs()
  if (!date) {
    date = todayStr()
    // 回退: 尝试最近 7 天
    for (let i = 0; i < 7; i++) {
      const candidate = todayStr(-i)
      try {
        const probe = await fetchJson(`${BASE}/${candidate}/models.json`, 10000)
        if (probe?.data?.length > 0) { date = candidate; break }
      } catch { /* try older */ }
    }
  }

  console.log(`[fetch] snapshot date: ${date}`)
  const summary = { date, files: {} }
  for (const name of FILE_NAMES) {
    const url = `${BASE}/${date}/${name}.json`
    try {
      const json = await fetchJson(url)
      const rows = json?.data?.length ?? 0
      if (!rows) { console.log(`[fetch] ${name}.json -> empty, skip`); continue }
      const file = join(DATA_DIR, `${name}.json`)
      writeFileSync(file, JSON.stringify(json, null, 0))
      summary.files[name] = rows
      console.log(`[fetch] ${name}.json OK (${rows})`)
    } catch (e) {
      console.log(`[fetch] ${name}.json MISSING: ${e.message}`)
    }
  }

  writeFileSync(join(DATA_DIR, "meta.json"), JSON.stringify(summary, null, 2))
  console.log(`[fetch] done, meta: ${JSON.stringify(summary)}`)
  // 无数据时退出码非 0，方便 CI 判断
  if (!Object.keys(summary.files).length) process.exit(1)
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true })
  const exchange = await fetchExchangeRate()
  writeFileSync(join(DATA_DIR, "exchange.json"), JSON.stringify(exchange, null, 2))
  console.log(`[fetch] exchange 1 USD = ${exchange.rate} CNY (${exchange.source}, ${exchange.updated ?? "n/a"})`)
  await fetchSnapshot()
}

main().catch((e) => { console.error("[fetch] fatal:", e); process.exit(1) })