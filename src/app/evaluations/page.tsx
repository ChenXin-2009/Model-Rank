import type { Metadata } from "next"
import { EVAL_META } from "@/lib/constants"
import { getExchangeInfo } from "@/lib/exchange"
import { Header, Footer } from "@/components/Layout"

export const metadata: Metadata = {
  title: "评测指标说明 - Model Rank",
  description: "大模型评测基准说明：智能指数、MMLU Pro、GPQA、HLE、LiveCodeBench 等指标含义与数据来源。",
}

export default function EvaluationsPage() {
  const exchange = getExchangeInfo()
  return (
    <>
      <Header date={null} />
      <main className="container eval-page">
        <h1>评测指标说明</h1>
        <p className="lead">以下为榜单中使用的各级指标口径。数值型指标为 0-1 的得分率，指数型指标为 0-100 的相对评分。</p>

        {EVAL_META.map((e) => (
          <div className="eval-card" key={e.key}>
            <div>
              <div className="e-name">{e.label}</div>
              <span className="e-badge">{e.badge}</span>
              {!e.percent && <span className="e-badge">指数型</span>}
            </div>
            <div>
              <p className="e-desc">{e.desc}</p>
              <p className="e-source">来源：{e.source}</p>
            </div>
          </div>
        ))}

        <h1 style={{ marginTop: 36 }}>价格与速度</h1>
        <p className="lead">价格为每百万 tokens 的官方公开价（USD），人民币价按实时汇率换算展示（当前 1 USD = {exchange.rate} CNY，来自 {exchange.source}，每日同步）。速度指标由社区抽样实测中位数得出。</p>
      </main>
      <Footer exchange={exchange} />
    </>
  )
}