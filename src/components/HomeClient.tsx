"use client"

import { useState } from "react"
import type { ArenaCategory, ArenaModel, TextModel } from "@/lib/types"
import { ARENA_TABS } from "@/lib/constants"
import TextTable from "@/components/TextTable"
import ArenaTable from "@/components/ArenaTable"

export interface HomeData {
  models: TextModel[]
  arena: Partial<Record<ArenaCategory, ArenaModel[]>>
  date: string | null
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

  return (
    <>
      <section className="hero">
        <h1>帮开发者选择大模型</h1>
        <p className="sub">多维度评测 · 价格 · 速度 — 数据来自公开评测，每日同步更新</p>
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
            <div className="label">数据快照</div>
          </div>
        </div>
      </section>

      <main className="container">
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

        {active === "text" && <TextTable models={data.models} />}
        {active !== "text" && (
          <ArenaTable category={active} models={data.arena[active] ?? []} />
        )}
      </main>
    </>
  )
}