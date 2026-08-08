"use client"

import { useEffect, useRef } from "react"
import type { TextModel } from "@/lib/types"
import { fmtNum } from "@/lib/format"
import CreatorLogo from "@/components/CreatorLogo"
import IndexCostScatter from "@/components/IndexCostScatter"

function topIndex(models: TextModel[]): { model: TextModel; value: number; display: string }[] {
  const rows: { model: TextModel; value: number; display: string }[] = []
  for (const m of models) {
    const v = m.evaluations?.artificial_analysis_intelligence_index
    if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) continue
    rows.push({ model: m, value: v, display: fmtNum(v, 1) })
  }
  rows.sort((a, b) => b.value - a.value)
  return rows
}

export default function LeaderboardCharts({ models }: { models: TextModel[] }) {
  const rows = topIndex(models)
  const max = rows[0]?.value ?? 1
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)

  /** 左卡片高度 = 右散点图卡片实际高度，仅在两列布局生效；窄屏恢复自然高度 */
  useEffect(() => {
    const left = leftRef.current
    const right = rightRef.current
    if (!left || !right) return
    const apply = () => {
      if (window.matchMedia("(min-width: 981px)").matches) {
        if (right.offsetHeight > 0) left.style.height = `${right.offsetHeight}px`
      } else {
        left.style.height = ""
      }
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(right)
    window.addEventListener("resize", apply)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", apply)
    }
  }, [])

  return (
    <div className="chart-grid">
      <section ref={leftRef} className="chart-card bar-card">
        <div className="chart-head">
          <h2>智能指数</h2>
          <span className="chart-badge">综合</span>
        </div>
        <p className="chart-desc">全部模型按智能指数排序，共 {rows.length} 个，可上下滚动</p>
        <div className="chart-list chart-list-scroll">
          {rows.length === 0 && <div className="chart-empty">暂无数据</div>}
          {rows.map((r, i) => (
            <a key={r.model.id} className="chart-row" href={`/model/${r.model.slug}`}>
              <span className={`chart-rank${i < 3 ? " medal" + (i + 1) : ""}`}>{i + 1}</span>
              <CreatorLogo slug={r.model.model_creator?.slug} size={24} />
              <span className="chart-name" title={r.model.name}>{r.model.name}</span>
              <span className="chart-bar">
                <span style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
              </span>
              <span className="chart-val">{r.display}</span>
            </a>
          ))}
        </div>
        <p className="chart-unit">数值越大越好 · 可上下滚动查看更多</p>
      </section>

      <div ref={rightRef} className="chart-scatter-col">
        <IndexCostScatter models={models} />
      </div>
    </div>
  )
}