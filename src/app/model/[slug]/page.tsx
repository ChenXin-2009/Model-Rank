import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { findModelBySlug, getAllModelSlugs } from "@/lib/data"
import { getExchangeInfo } from "@/lib/exchange"
import { EVAL_META } from "@/lib/constants"
import { fmtDate, fmtNum, fmtPercent, fmtPrice, fmtSeconds, fmtSpeed } from "@/lib/format"
import { Header, Footer } from "@/components/Layout"
import CreatorLogo from "@/components/CreatorLogo"

export const dynamicParams = false

export function generateStaticParams() {
  return getAllModelSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const found = findModelBySlug(params.slug)
  if (!found) return { title: "模型不存在" }
  const { model } = found
  return {
    title: `${model.name} - 模型详情`,
    description: `${model.name}（${model.model_creator?.name ?? "未知供应商"}）的评测、价格与速度数据。`,
    alternates: { canonical: `/model/${params.slug}` },
  }
}

export default function ModelPage({ params }: { params: { slug: string } }) {
  const found = findModelBySlug(params.slug)
  if (!found) notFound()
  const { model } = found
  const exchange = getExchangeInfo()

  const creator = model.model_creator?.name ?? "未知供应商"
  const ii = model.evaluations?.artificial_analysis_intelligence_index ?? null

  return (
    <>
      <Header date={null} />
      <main className="container">
        <div className="crumb">
          <a href="/">模型</a> / {model.name}
        </div>

        <section className="model-hero">
          <h1>{model.name}</h1>
          <div className="byline">
            <span className="creator-pill">
              <CreatorLogo slug={model.model_creator?.slug} size={24} />
              {creator}
            </span>
            <span>发布：{fmtDate(model.release_date)}</span>
            {ii !== null && <span>智能指数：<strong>{fmtNum(ii)}</strong></span>}
          </div>
        </section>

        <div className="cards">
          <div className="card">
            <h3>价格（每百万 tokens）</h3>
            <div className="metric-row"><span className="k">输入</span><span className="v">{fmtPrice(model.pricing?.price_1m_input_tokens ?? null, false)}（{fmtPrice(model.pricing?.price_1m_input_tokens ?? null, true, exchange.rate)}）</span></div>
            <div className="metric-row"><span className="k">输出</span><span className="v">{fmtPrice(model.pricing?.price_1m_output_tokens ?? null, false)}（{fmtPrice(model.pricing?.price_1m_output_tokens ?? null, true, exchange.rate)}）</span></div>
            <div className="metric-row"><span className="k">混合（3:1）</span><span className="v">{fmtPrice(model.pricing?.price_1m_blended_3_to_1 ?? null, false)}</span></div>
            <p style={{ color: "var(--text-faint)", fontSize: 12, marginTop: 8 }}>汇率 1 USD = {exchange.rate} CNY（{exchange.source}{exchange.updated ? `，${exchange.updated.replace("T", " ").slice(0, 16)}` : ""}，每日同步）</p>
          </div>

          <div className="card">
            <h3>速度</h3>
            <div className="metric-row"><span className="k">输出速度</span><span className="v accent">{fmtSpeed(model.median_output_tokens_per_second)} tokens/s</span></div>
            <div className="metric-row"><span className="k">首 token 时间</span><span className="v">{fmtSeconds(model.median_time_to_first_token_seconds)}</span></div>
            <div className="metric-row"><span className="k">首答案 token 时间</span><span className="v">{fmtSeconds(model.median_time_to_first_answer_token)}</span></div>
          </div>

          <div className="card">
            <h3>评测覆盖</h3>
            {(() => {
              const keys = EVAL_META.map((e) => e.key)
              const have = keys.filter((k) => {
                const v = model.evaluations?.[k as keyof typeof model.evaluations]
                return typeof v === "number"
              }).length
              return (
                <>
                  <div className="metric-row"><span className="k">参与基准</span><span className="v accent">{have} / {keys.length}</span></div>
                  <div className="metric-row"><span className="k">综合指数</span><span className="v">{ii === null ? "-" : fmtNum(ii)}</span></div>
                  <div className="metric-row"><span className="k">供应商</span><span className="v">{creator}</span></div>
                </>
              )
            })()}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 18 }}>
          <h3>全部评测指标</h3>
          <div className="eval-block">
            {EVAL_META.map((e) => {
              const raw = model.evaluations?.[e.key as keyof typeof model.evaluations]
              const v = typeof raw === "number" ? raw : null
              const display = v === null ? "-" : e.percent ? fmtPercent(v) : fmtNum(v)
              const pct = v === null ? 0 : e.percent ? v : Math.min(1, v / 100)
              return (
                <div className="eval-row" key={e.key}>
                  <div className="eval-top">
                    <span className="name">
                      {e.label}
                      <span className="tag">{e.badge}</span>
                    </span>
                    <span className="score">{display}</span>
                  </div>
                  <div className="eval-bar"><span style={{ width: `${Math.max(2, pct * 100)}%` }} /></div>
                  <div className="eval-desc">{e.desc}</div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
      <Footer exchange={exchange} />
    </>
  )
}