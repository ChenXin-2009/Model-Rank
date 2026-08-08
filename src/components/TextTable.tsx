"use client"

import { useMemo, useState } from "react"
import type { TextModel } from "@/lib/types"
import { EVAL_META, PRICE_COL_META } from "@/lib/constants"
import { fmtDate, fmtNum, fmtPercent, fmtPrice, fmtSeconds, fmtSpeed } from "@/lib/format"

const BATCH = 40

type SortKey = "rank" | "name" | "creator" | "release_date" | "price_in" | "price_out" | "speed" | "ttft" | "first_answer" | string

interface SortState {
  key: SortKey
  desc: boolean
}

const evalValue = (m: TextModel, key: string): number | null => {
  const v = m.evaluations?.[key as keyof TextModel["evaluations"]]
  return typeof v === "number" ? v : null
}

const colValue = (m: TextModel, key: string): number | null => {
  switch (key) {
    case "price_in": return m.pricing?.price_1m_input_tokens ?? null
    case "price_out": return m.pricing?.price_1m_output_tokens ?? null
    case "speed": return m.median_output_tokens_per_second
    case "ttft": return m.median_time_to_first_token_seconds
    case "first_answer": return m.median_time_to_first_answer_token
    default: return evalValue(m, key)
  }
}

export default function TextTable({ models }: { models: TextModel[] }) {
  const [query, setQuery] = useState("")
  const [creator, setCreator] = useState("all")
  const [sort, setSort] = useState<SortState>({ key: "release_date", desc: true })
  const [showPrice, setShowPrice] = useState(true)
  const [showSpeed, setShowSpeed] = useState(true)
  const [showEvals, setShowEvals] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(EVAL_META.map((e) => [e.key, e.defaultOn])))
  const [showRank, setShowRank] = useState(true)
  const [cny, setCny] = useState(true)
  const [count, setCount] = useState(BATCH)
  const [panelOpen, setPanelOpen] = useState(false)

  const creators = useMemo(() => {
    const set = new Map<string, number>()
    for (const m of models) {
      const name = m.model_creator?.name ?? "Unknown"
      set.set(name, (set.get(name) ?? 0) + 1)
    }
    return [...set.entries()].sort((a, b) => b[1] - a[1])
  }, [models])

  const visibleEvals = useMemo(() => EVAL_META.filter((e) => showEvals[e.key]), [showEvals])
  const visiblePrice = useMemo(() => PRICE_COL_META.filter((c) => (c.badge === "价格" ? showPrice : showSpeed)), [showPrice, showSpeed])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = models.filter((m) => {
      if (creator !== "all" && (m.model_creator?.name ?? "Unknown") !== creator) return false
      if (!q) return true
      return (m.name + " " + (m.model_creator?.name ?? "")).toLowerCase().includes(q)
    })
    const { key, desc } = sort
    list.sort((a, b) => {
      if (key === "name") return desc ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)
      if (key === "creator") return desc
        ? (b.model_creator?.name ?? "").localeCompare(a.model_creator?.name ?? "")
        : (a.model_creator?.name ?? "").localeCompare(b.model_creator?.name ?? "")
      if (key === "release_date") {
        const av = a.release_date ? new Date(a.release_date).getTime() : -Infinity
        const bv = b.release_date ? new Date(b.release_date).getTime() : -Infinity
        return desc ? bv - av : av - bv
      }
      const av = colValue(a, key)
      const bv = colValue(b, key)
      const an = av === null ? -Infinity : av
      const bn = bv === null ? -Infinity : bv
      const diff = desc ? bn - an : an - bn
      return diff
    })
    return list
  }, [models, query, creator, sort])

  const ranked = useMemo(() => {
    const { key, desc } = sort
    const arr = [...rows]
    if (key === "name") arr.sort((a, b) => a.name.localeCompare(b.name))
    else if (key === "creator") arr.sort((a, b) => (a.model_creator?.name ?? "").localeCompare(b.model_creator?.name ?? ""))
    else if (key === "release_date") arr.sort((a, b) => (a.release_date ?? "").localeCompare(b.release_date ?? ""))
    else arr.sort((a, b) => (colValue(a, key) ?? 0) - (colValue(b, key) ?? 0))
    return desc ? arr.reverse() : arr
  }, [rows, sort])

  const maxByKey = useMemo(() => {
    const m: Record<string, number> = {}
    for (const key of [...EVAL_META.map((e) => e.key), ...PRICE_COL_META.map((c) => c.key)]) {
      let mx = 0
      for (const model of models) mx = Math.max(mx, colValue(model, key) ?? 0)
      m[key] = mx || 1
    }
    return m
  }, [models])

  const toggleSort = (key: string) => {
    setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: true }))
    setCount(BATCH)
  }

  const displayRows = rows.slice(0, count)
  const rankMap = useMemo(() => new Map(displayRows.map((r, i) => [r.id, i + 1])), [displayRows])

  const setEval = (key: string, on: boolean) => {
    setShowEvals((s) => ({ ...s, [key]: on }))
  }

  return (
    <div>
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
        <select className="select" value={creator} onChange={(e) => { setCreator(e.target.value); setCount(BATCH) }}>
          <option value="all">全部供应商 ({models.length})</option>
          {creators.map(([name, n]) => (
            <option key={name} value={name}>{name} ({n})</option>
          ))}
        </select>
        <div className="btn-group">
          <button className={`btn ${cny ? "active" : ""}`} onClick={() => setCny(true)}>¥</button>
          <button className={`btn ${!cny ? "active" : ""}`} onClick={() => setCny(false)}>$</button>
        </div>
        <div style={{ position: "relative" }}>
          <button className="btn" onClick={() => setPanelOpen((v) => !v)}>⚙️ 自定义表头</button>
          {panelOpen && (
            <div className="cols-panel">
              <h4>质量指标</h4>
              <div className="cols-grid">
                {EVAL_META.map((e) => (
                  <label key={e.key}>
                    <input type="checkbox" checked={!!showEvals[e.key]} onChange={(ev) => setEval(e.key, ev.target.checked)} />
                    {e.label}
                  </label>
                ))}
              </div>
              <h4 style={{ marginTop: 12 }}>价格 / 速度</h4>
              <div className="cols-grid">
                <label>
                  <input type="checkbox" checked={showPrice} onChange={(ev) => setShowPrice(ev.target.checked)} />
                  价格（输入/输出）
                </label>
                <label>
                  <input type="checkbox" checked={showSpeed} onChange={(ev) => setShowSpeed(ev.target.checked)} />
                  速度（输出/首token/首答案）
                </label>
                <label>
                  <input type="checkbox" checked={showRank} onChange={(ev) => setShowRank(ev.target.checked)} />
                  当前排名列
                </label>
              </div>
              <div className="cols-actions">
                <button className="btn" onClick={() => {
                  setShowEvals(Object.fromEntries(EVAL_META.map((e) => [e.key, e.defaultOn])))
                  setShowPrice(true); setShowSpeed(true); setShowRank(true)
                }}>恢复默认</button>
                <button className="btn" onClick={() => setPanelOpen(false)}>关闭</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="note-strip">
        <span>默认按发布日期倒序排序，点击任意列表头可切换排序</span>
        {sort.key !== "release_date" && <span><strong>当前排序：</strong>{EVAL_META.find((e) => e.key === sort.key)?.label ?? PRICE_COL_META.find((c) => c.key === sort.key)?.label ?? sort.key} {sort.desc ? "↓" : "↑"}</span>}
      </div>

      <div className="table-wrap">
        <table className="llm-table">
          <thead>
            <tr>
              {showRank && (
                <Th>#</Th>
              )}
              <Th sortable onClick={() => toggleSort("name")} sorted={sort.key === "name"} desc={sort.desc}>模型</Th>
              <Th sortable onClick={() => toggleSort("creator")} sorted={sort.key === "creator"} desc={sort.desc}>供应商</Th>
              <Th sortable onClick={() => toggleSort("release_date")} sorted={sort.key === "release_date"} desc={sort.desc}>发布日期</Th>
              {visiblePrice.filter((c) => c.badge === "价格").map((c) => (
                <Th key={c.key} sortable onClick={() => toggleSort(c.key)} sorted={sort.key === c.key} desc={sort.desc}>
                  {c.label}
                </Th>
              ))}
              {visiblePrice.filter((c) => c.badge === "速度").map((c) => (
                <Th key={c.key} sortable onClick={() => toggleSort(c.key)} sorted={sort.key === c.key} desc={sort.desc}>
                  {c.label}
                </Th>
              ))}
              {visibleEvals.map((e) => (
                <Th key={e.key} sortable onClick={() => toggleSort(e.key)} sorted={sort.key === e.key} desc={sort.desc}>
                  {e.label}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((m) => {
              const pos = rankMap.get(m.id) ?? 0
              return (
                <tr key={m.id}>
                  {showRank && (
                    <td className="rank-cell">
                      <RankBadge pos={pos} />
                    </td>
                  )}
                  <td className="name-cell">
                    <a href={`/model/${m.slug}`}>{m.name}</a>
                  </td>
                  <td className="creator-cell">{m.model_creator?.name ?? "-"}</td>
                  <td className="date-cell">{fmtDate(m.release_date)}</td>
                  {showPrice && [
                    <td key="pi" className="num-cell">{fmtPrice(m.pricing?.price_1m_input_tokens ?? null, cny)}</td>,
                    <td key="po" className="num-cell">{fmtPrice(m.pricing?.price_1m_output_tokens ?? null, cny)}</td>,
                  ]}
                  {showSpeed && [
                    <td key="sp" className="num-cell">{fmtSpeed(m.median_output_tokens_per_second)}</td>,
                    <td key="tf" className="num-cell">{fmtSeconds(m.median_time_to_first_token_seconds)}</td>,
                    <td key="fa" className="num-cell">{fmtSeconds(m.median_time_to_first_answer_token)}</td>,
                  ]}
                  {visibleEvals.map((e) => (
                    <td key={e.key}>
                      <ScoreCell value={colValue(m, e.key) ?? null} max={maxByKey[e.key]} percent={e.percent} />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
        {!displayRows.length && <div className="empty-state">没有匹配的模型</div>}
      </div>

      {rows.length > count && (
        <div className="load-more">
          <button className="btn" onClick={() => setCount((c) => c + BATCH)}>
            加载更多（{rows.length - count} 剩余）
          </button>
        </div>
      )}
      <p className="count-line">共显示 {displayRows.length} / {rows.length} 个模型 · 数据来源：Artificial Analysis 公开评测</p>
    </div>
  )
}

function Th({ children, sortable, onClick, sorted, desc }: { children: React.ReactNode; sortable?: boolean; onClick?: () => void; sorted?: boolean; desc?: boolean }) {
  return (
    <th className={`${sortable ? "sortable" : ""} ${sorted ? "sorted" : ""}`} onClick={onClick}>
      {children}
      {sorted && <span className="sort-indicator">{desc ? "↓" : "↑"}</span>}
    </th>
  )
}

function ScoreCell({ value, max, percent }: { value: number | null; max: number; percent: boolean }) {
  if (value === null || value === undefined) return <span className="empty-cell">-</span>
  const r = value / max
  return (
    <span className="score-cell">
      <span className="bar" title={percent ? `${value * 100}%` : String(value)}>
        <span style={{ width: `${Math.min(100, Math.max(3, r * 100))}%` }} />
      </span>
      <span className="num-cell" style={{ minWidth: 46 }}>
        {percent ? fmtPercent(value) : fmtNum(value)}
      </span>
    </span>
  )
}

function RankBadge({ pos }: { pos: number }) {
  if (pos === 1) return <span className="rank-badge gold">1</span>
  if (pos === 2) return <span className="rank-badge silver">2</span>
  if (pos === 3) return <span className="rank-badge bronze">3</span>
  return <span className="rank-badge plain">{pos}</span>
}