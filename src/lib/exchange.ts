import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import type { ExchangeInfo } from "@/lib/types"

const SNAPSHOT_DIR = join(process.cwd(), "data", "snapshot")

/** 汇率缺失时的兜底值（与历史展示口径一致） */
export const DEFAULT_USD_TO_CNY = 7.2

/** 读取汇率快照；无快照时返回兜底值（服务端构建期读取） */
export function getExchangeInfo(): ExchangeInfo {
  const path = join(SNAPSHOT_DIR, "exchange.json")
  if (!existsSync(path)) return { rate: DEFAULT_USD_TO_CNY, updated: null, source: "default" }
  try {
    const raw = JSON.parse(readFileSync(path, "utf-8")) as Partial<ExchangeInfo>
    if (typeof raw.rate === "number" && raw.rate > 0) {
      return { rate: raw.rate, updated: raw.updated ?? null, source: raw.source ?? "unknown" }
    }
  } catch {
    // 快照损坏时走兜底
  }
  return { rate: DEFAULT_USD_TO_CNY, updated: null, source: "default" }
}
