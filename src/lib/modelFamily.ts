import type { TextModel } from "@/lib/types"

/** 等级/模式后缀。注意：必须以空格开头匹配，避免误伤 "Flash-Lite" 这类整体词 */
const TIER_SUFFIXES = [
  "non-reasoning",
  "minimal",
  "instant",
  "preview",
  "thinking",
  "xhigh",
  "medium",
  "high",
  "low",
  "lite",
  "nano",
  "pro",
]

/** 去掉名称中的等级后缀（如 "(low)"/"(instant)"/" Thinking"/"Pro"/"0731" 日期）
 *  用于展示短名，如 "GPT-5.5 (xhigh)" -> "GPT-5.5" */
export function stripVariantSuffix(name: string): string {
  let s = name.replace(/\s*\([^)]*\)/g, " ").replace(/\s+/g, " ").trim()
  let changed = true
  while (changed) {
    changed = false
    const low = s.toLowerCase()
    for (const t of TIER_SUFFIXES) {
      const pat = " " + t
      if (low.endsWith(pat)) {
        s = s.slice(0, -pat.length).trim()
        changed = true
        break
      }
    }
    if (!changed) {
      const m = s.match(/\s+\d{3,4}\s*$/)
      if (m) {
        s = s.slice(0, -m[0].length).trim()
        changed = true
      }
    }
  }
  return s
}

/** 型号家族键：同一模型的多个等级视为同一家族，用于去重聚合 */
export function familyKey(name: string): string {
  return stripVariantSuffix(name).toLowerCase()
}

/** 每个型号家族只保留最强的那个等级：指数最高，其次发布日期最新 */
export function mergeStrongest(models: TextModel[]): TextModel[] {
  const groups = new Map<string, TextModel[]>()
  for (const m of models) {
    const k = familyKey(m.name)
    const arr = groups.get(k) ?? []
    arr.push(m)
    groups.set(k, arr)
  }
  const out: TextModel[] = []
  for (const arr of groups.values()) {
    arr.sort((a, b) => {
      const av = a.evaluations?.artificial_analysis_intelligence_index ?? -Infinity
      const bv = b.evaluations?.artificial_analysis_intelligence_index ?? -Infinity
      if (av !== bv) return bv - av
      return (b.release_date ?? "").localeCompare(a.release_date ?? "")
    })
    out.push(arr[0])
  }
  return out
}