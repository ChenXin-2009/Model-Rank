"use client"

import { useMemo, useState } from "react"
import type { ArenaCategory, ArenaModel } from "@/lib/types"
import { ARENA_TABS } from "@/lib/constants"
import { fmtDate, fmtNum } from "@/lib/format"

const BATCH = 60

type SortKey = "rank" | "elo" | "appearances" | "name" | "creator" | "release_date"

const ROW_KEYS: { key: SortKey; label: string; sorted?: boolean }[] = [
  { key: "rank", label: "排名" },
  { key: "name", label: "模型" },
  { key: "creator", label: "供应商" },
  { key: "elo", label: "Elo", sorted: true },
  { key: "appearances", label: "对战次数" },
  { key: "release_date", label: "发布日期" },
]

export default function ArenaTable({ category, models }: { category: ArenaCategory; models: ArenaModel[] }) {
  const [query, setQuery] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("rank")
  const [desc, setDesc] = useState(false)
  const [count, setCount] = useState(BATCH)
  const meta = ARENA_TABS.find((t) => t.key === category)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = models.filter((m) => {
      if (!q) return true
      return (m.name + " " + (m.model_creator?.name ?? "")).toLowerCase().includes(q)
    })
    list.sort((a, b) => {
      const get = (m: ArenaModel): number | string => {
        switch (sortKey) {
          case "name": return m.name
          case "creator": return m.model_creator?.name ?? ""
          case "elo": return m.elo
          case "appearances": return m.appearances ?? 0
          case "release_date": return m.release_date ?? ""
          default: return m.rank ?? Number.MAX_SAFE_INTEGER
        }
      }
      const av = get(a), bv = get(b)
      const cmp = typeof av === "string" ? av.localeCompare(String(bv)) : (av as number) - (bv as number)
      return desc ? -cmp : cmp
    })
    return list
  }, [models, query, sortKey, desc])

  const toggle = (key: SortKey) => {
    if (key === sortKey) setDesc((d) => !d)
    else { setSortKey(key); setDesc(key === "rank") }
    setCount(BATCH)
  }

  return (
    <div>
      <div className="note-strip">
        <span>
          <strong>{meta?.source ?? category}</strong> 竞技场 Elo 评分 · 用户盲测两两投票生成，每日同步
        </span>
      </div>
      <div className="toolbar">
        <div className="search-box">
          <span className="icon">🔍</span>
          <input
            type="text"
            placeholder="搜索模型 / 供应商…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCount(BATCH) }}
          />
          {query && <button className="clear" onClick={() => setQuery("")}>✕</button>}
        </div>
      </div>

      <div className="table-wrap">
        <table className="llm-table">
          <thead>
            <tr>
              {ROW_KEYS.map((c) => (
                <th key={c.key} className={`${c.sorted ? "sortable" : ""} ${sortKey === c.key ? "sorted" : ""}`} onClick={() => c.sorted && toggle(c.key)}>
                  {c.label}
                  {c.sorted && sortKey === c.key && <span className="sort-indicator">{desc ? "↓" : "↑"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, count).map((m) => (
              <tr key={m.id}>
                <td className="num-cell">{m.rank ? fmtNum(m.rank, 0) : "—"}</td>
                <td className="name-cell">{m.name}</td>
                <td className="creator-cell">{m.model_creator?.name ?? "-"}</td>
                <td className="el-cell"><EloBadge elo={m.elo} /></td>
                <td className="num-cell">{fmtNum(m.appearances ?? null, 0)}</td>
                <td className="date-cell">{fmtDate(m.release_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.slice(0, count).length && <div className="empty-state">没有匹配的模型</div>}
      </div>
      {rows.length > count && (
        <div className="load-more">
          <button className="btn" onClick={() => setCount((c) => c + BATCH)}>加载更多（{rows.length - count} 剩余）</button>
        </div>
      )}
      <p className="count-line">共 {rows.length} 个模型 · 展示 {Math.min(count, rows.length)}</p>
    </div>
  )
}

function EloBadge({ elo }: { elo: number }) {
  const tone = elo >= 1450 ? "gold" : elo >= 1400 ? "silver" : elo >= 1350 ? "bronze" : "plain"
  return (
    <span className={`rank-badge ${tone}`} style={{ width: "auto", padding: "0 8px", borderRadius: 8 }}>
      {fmtNum(elo, 0)}
    </span>
  )
}