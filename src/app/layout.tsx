import type { Metadata } from "next"
import "./globals.css"
import { Analytics } from "@vercel/analytics/next"
import { SITE_URL } from "@/lib/site"

const bingVerify = process.env.NEXT_PUBLIC_BING_VERIFY
const baiduVerify = process.env.NEXT_PUBLIC_BAIDU_VERIFY

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Model Rank - 大模型评测排行榜",
    template: "%s | Model Rank",
  },
  description: "全球主流大模型多维度评测排行榜：综合智能、代码、数学、知识、价格与速度，帮你选型。数据来自 Artificial Analysis 等公开评测。",
  keywords: "大模型排行榜, LLM评测, AI模型对比, Artificial Analysis, 智能指数",
  icons: [{ rel: "icon", url: "/favicon.svg" }],
  alternates: { canonical: "/" },
  verification: {
    ...(bingVerify ? { bing: bingVerify } : {}),
    ...(baiduVerify
      ? { other: { "baidu-site-verification": baiduVerify } }
      : {}),
  },
  openGraph: {
    title: "Model Rank - 大模型评测排行榜",
    description: "全球主流大模型多维度评测排行榜，帮开发者选型。",
    type: "website",
    url: "/",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}<Analytics /></body>
    </html>
  )
}