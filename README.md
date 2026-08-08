# Model Rank

大模型评测榜单站点。汇总 Artificial Analysis 公开评测与 LMArena 竞技场数据，提供文本、文生图、文生视频、图生视频、文生音五个榜单，支持搜索、筛选、排序、自定义表头、美元/人民币价格切换，以及 595 个模型详情页。

## 技术栈

- Next.js 14（App Router）+ React 18 + TypeScript
- 纯 CSS（CSS 变量设计系统，深色主题 + 渐变）
- 静态生成（SSG）：`/model/[...slug]` 595 页全部构建时生成
- Jest + Testing Library 单元测试

## 常用命令

```bash
npm install        # 安装依赖
npm run refresh    # 拉取最新数据快照到 data/snapshot/（每日数据）
npm run dev        # 本地开发
npm run build      # 构建（含类型检查）
npm start          # 运行生产构建
npm test           # 运行测试
```

## 数据来源与更新

- 数据文件：`data/snapshot/*.json`，由 `scripts/fetch-data.mjs` 从阿里云 OSS 每日快照拉取
- 文本榜数据来自 **Artificial Analysis** 公开评测；图文音视频榜为 **LMArena** 竞技场 Elo 数据
- 价格展示按 1 USD = 7.2 CNY 换算（仅展示口径）
- 推送后 GitHub Actions `refresh.yml` 每日 08:10（UTC+8）自动拉取最新数据并 commit，触发 Vercel 自动重新部署
- 手动刷新：`node scripts/fetch-data.mjs` 或 `npm run refresh`

> 注意：榜单数据为公开第三方评测汇总，仅供选型参考，不构成任何能力或质量保证。

## 部署到 Vercel

1. 将本项目推送到 GitHub 仓库（`.github/workflows/refresh.yml` 会启用每日数据刷新）
2. 在 [vercel.com](https://vercel.com) Import 该仓库
3. 框架自动识别 Next.js，构建命令 `next build`，输出目录默认
4. 部署完成后，将 `src/app/sitemap.ts` 与 `src/app/robots.ts` 中的 `https://model-rank.vercel.app` 替换为你的正式域名（如有）

## 路由

| 路由 | 说明 |
| --- | --- |
| `/` | 首页：五类榜单 tab + 工具栏 |
| `/model/[slug]` | 模型详情（SSG 595 页） |
| `/evaluations` | 评测指标说明 |
| `/sitemap.xml` `/robots.txt` | SEO |