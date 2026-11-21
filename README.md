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
npm run refresh    # 拉取文本/语音快照 + LMArena 三个 Arena 榜到 data/snapshot/
npm run dev        # 本地开发
npm run build      # 构建（含类型检查）
npm start          # 运行生产构建
npm test           # 运行测试
```

## 数据来源与更新

- **文本榜 + 文生音**：`scripts/fetch-data.mjs` 从 LLM Rank 的阿里云 OSS 快照拉取，原始数据来自 **Artificial Analysis** 公开评测
- **文生图 / 文生视频 / 图生视频**：`scripts/fetch-lmarena.mjs` 从 [LMArena 官方 HuggingFace 数据集](https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset) 拉取 `latest` 榜单（CC-BY-4.0，展示时需注明来源）
- 每个文件的来源与日期记录在 `data/snapshot/meta.json` 的 `sources` 字段；`date` 为所有来源中的最新日期，页面各 tab 会显示自己的数据日期
- 汇率：`data/snapshot/exchange.json` 每日由 `scripts/fetch-data.mjs` 从公开实时汇率接口拉取（主源 open.er-api.com，兜底 exchangerate-api.com），站点运行时再在浏览器端实时刷新；接口不可用时回退历史值/默认 7.2
- 推送后 GitHub Actions `refresh.yml` 每日 08:10（UTC+8）自动拉取最新数据并 commit，触发 Vercel 自动重新部署
- 上游延迟或停更时，工作流会向前回退最多 30 天寻找最近快照，保留最后一份可用数据；文本/语音连续 3 天未更新会自动创建 `data-stale` issue 告警，恢复后自动关闭；LMArena 拉取失败时保留上一份 Arena 榜
- 手动刷新：`node scripts/fetch-data.mjs [--date YYYY-MM-DD]`、`node scripts/fetch-lmarena.mjs` 或 `npm run refresh`；也可以在 Actions 页面手动触发 `Refresh data` 并指定日期

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