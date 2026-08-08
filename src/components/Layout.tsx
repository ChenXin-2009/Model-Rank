import type { ExchangeInfo } from "@/lib/types"

export function Header({ date }: { date: string | null }) {
  return (
    <header className="site-header">
      <div className="container">
        <a href="/" className="brand">Model Rank</a>
        <nav className="site-nav">
          <a href="/" className="active">模型</a>
          <a href="/evaluations">测评</a>
        </nav>
        <div className="header-right">
          <span className="data-chip"><span className="dot" />数据更新 {date ?? "-"}</span>
        </div>
      </div>
    </header>
  )
}

export function Footer({ exchange }: { exchange: ExchangeInfo }) {
  const updated = exchange.updated ? exchange.updated.replace("T", " ").slice(0, 16) : null
  return (
    <>
      <div className="footer-project">
        <a href="https://github.com/ChenXin-2009/Model-Rank" target="_blank" rel="noreferrer" aria-label="项目 GitHub 仓库">
          <img src="/CX.svg" alt="CX logo" className="footer-logo" />
        </a>
        <a href="https://github.com/ChenXin-2009/Model-Rank" target="_blank" rel="noreferrer" className="footer-project-link">
          本项目开源地址 · github.com/ChenXin-2009/Model-Rank
        </a>
      </div>
      <footer className="site-footer">
        <div className="container">
          <div>
            <p>数据来源：<a href="https://artificialanalysis.ai" target="_blank" rel="noreferrer">Artificial Analysis</a> 公开评测 · 竞技场数据每日同步</p>
            <p style={{ marginTop: 4 }}>
              实时汇率（{exchange.source}）：1 USD = {exchange.rate} CNY{updated ? `（${updated}）` : ""} · 仅展示换算，非交易汇率
            </p>
          </div>
          <div className="footer-links">
            <a href="https://artificialanalysis.ai" target="_blank" rel="noreferrer">Artificial Analysis ↗</a>
            <a href="https://lmarena.ai" target="_blank" rel="noreferrer">LMArena ↗</a>
            <a href="/sitemap.xml">Sitemap</a>
          </div>
        </div>
      </footer>
    </>
  )
}