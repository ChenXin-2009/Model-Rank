import { USD_TO_CNY } from "@/lib/constants"

/** 通用数字：null/undefined/0 -> "-"（0 视为未公布） */
function hasValue(v: number | null | undefined): v is number {
  return v !== null && v !== undefined && !Number.isNaN(v) && v !== 0
}

export function fmtNum(v: number | null | undefined, digits = 2): string {
  if (!hasValue(v)) return "-"
  return v.toFixed(digits)
}

/** 0-1 概率展示为百分比 */
export function fmtPercent(v: number | null | undefined, digits = 1): string {
  if (!hasValue(v)) return "-"
  return `${(v * 100).toFixed(digits)}%`
}

/** 价格：美元原值，人民币按汇率换算 */
export function fmtPrice(v: number | null | undefined, cny = false, digits = 2): string {
  if (!hasValue(v)) return "-"
  const n = cny ? v * USD_TO_CNY : v
  return `${cny ? "¥" : "$"}${n.toFixed(digits)}`
}

/** 价格表头（带币种） */
export function fmtPriceHeader(cny: boolean): string {
  return cny ? `价格-输入(¥)` : `价格-输入($)`
}

/** 输出速度 tokens/s -> 取整 */
export function fmtSpeed(v: number | null | undefined): string {
  if (!hasValue(v)) return "-"
  return Math.round(v).toLocaleString("en-US")
}

/** 秒，保留 2 位 */
export function fmtSeconds(v: number | null | undefined): string {
  if (!hasValue(v)) return "-"
  return `${v.toFixed(2)}s`
}

/** 日期：YYYY-MM-DD 截断显示，供列表使用 */
export function fmtDate(v: string | null | undefined): string {
  if (!v) return "-"
  return v.slice(0, 10)
}

/** 置信区间 "+-7/7" 直接用 */
export function fmtCi(v: string | null | undefined): string {
  return v ?? "-"
}