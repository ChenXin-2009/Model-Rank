"use client"

import { useState } from "react"
import type { ArenaCategory, ArenaModel, SourceMeta, TextModel } from "@/lib/types"
import { ARENA_TABS } from "@/lib/constants"
import TextTable from "@/components/TextTable"
import ArenaTable from "@/components/ArenaTable"
import LeaderboardCharts from "@/components/LeaderboardCharts"

export interface HomeData {
  models: TextModel[]
  arena: Partial<Record<ArenaCategory, ArenaModel[]>>
  date: string | null
  /** 各数据文件的来源与日期 */
  sources: Record<string, SourceMeta>
  /** 构建期快照汇率（客户端会实时刷新） */
  rate: number
}

type TabKey = "text" | ArenaCategory

export default function HomeClient({ data }: { data: HomeData }) {
  const suppliers = new Set(data.models.map((m) => m.model_creator?.name ?? "Unknown")).size

  const tabs: { key: TabKey; label: string }[] = [
    { key: "text", label: "文本" },
    ...ARENA_TABS.map((t) => ({ key: t.key as TabKey, label: t.label })),
  ]
  const available = tabs.filter((t) => t.key === "text" || (data.arena[t.key as ArenaCategory]?.length ?? 0) > 0)

  const [active, setActive] = useState<TabKey>("text")

  const activeSource = active === "text" ? data.sources.models : data.sources[active]
  const fallbackLabel = active === "text"
    ? "Artificial Analysis（LLM Rank 快照）"
    : ARENA_TABS.find((t) => t.key === active)?.source ?? active
  const sourceLabel = activeSource?.label ?? fallbackLabel
  const sourceDate = activeSource?.date ?? data.date
  const olderThanLatest = Boolean(sourceDate && data.date && sourceDate < data.date)

  return (
    <>
      <section className="hero">
        <h1>帮开发者选择大模型</h1>
        <p className="sub">多维度评测 · 价格 · 速度 — 数据来自公开评测，各榜单标注来源与日期</p>
        <div className="hero-stats">
          <div className="stat-card">
            <div className="num">{data.models.length}</div>
            <div className="label">收录模型</div>
          </div>
          <div className="stat-card">
            <div className="num">{suppliers}</div>
            <div className="label">模型供应商</div>
          </div>
          <div className="stat-card">
            <div className="num">{data.date}</div>
            <div className="label">最新榜单日期</div>
          </div>
        </div>
      </section>

      <main className="container">
        <LeaderboardCharts models={data.models} />

        <div className="tabs" role="tablist">
          {available.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={active === t.key}
              className={`tab ${active === t.key ? "active" : ""}`}
              onClick={() => setActive(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="note-strip">
          <span>
            <strong>{sourceLabel}</strong>
            {active === "text" ? " · 综合评测与价格" : " · 用户盲测 Elo"}
            {" · 数据日期 "}{sourceDate ?? "—"}
            {olderThanLatest && activeSource?.source === "llmrank" && (
              <span className="warn"> · 上游停更，展示最后可用快照</span>
            )}
          </span>
        </div>

        {active === "text" && <TextTable models={data.models} initialRate={data.rate} />}
        {active !== "text" && (
          <ArenaTable category={active} models={data.arena[active] ?? []} />
        )}
      </main>
    </>
  )
}