import type { ArenaTabMeta } from "@/lib/types"

/** 美元 -> 人民币汇率（与原站一致的展示口径） */
export const USD_TO_CNY = 7.2

/** 竞技场 tab 定义 */
export const ARENA_TABS: ArenaTabMeta[] = [
  { key: "text-to-image", label: "文生图", source: "Image Arena" },
  { key: "text-to-video", label: "文生视频", source: "Video Arena" },
  { key: "image-to-video", label: "图生视频", source: "Image2Video Arena" },
  { key: "text-to-speech", label: "文生音", source: "Speech Arena" },
]

/** 单个评测列元信息 */
export interface EvalMeta {
  key: string
  label: string
  badge: string
  /** 0-1 小数按百分比展示 */
  percent: boolean
  /** 数值越大越好 */
  higherBetter: boolean
  desc: string
  source: string
  /** 是否在默认表头中显示 */
  defaultOn: boolean
}

export const EVAL_META: EvalMeta[] = [
  {
    key: "artificial_analysis_intelligence_index",
    label: "Intelligence Index",
    badge: "综合",
    percent: false,
    higherBetter: true,
    desc: "Artificial Analysis 综合智能指数，由多个基准加权得出，反映模型整体推理能力。",
    source: "Artificial Analysis",
    defaultOn: true,
  },
  {
    key: "artificial_analysis_coding_index",
    label: "Coding Index",
    badge: "代码",
    percent: false,
    higherBetter: true,
    desc: "Artificial Analysis 代码能力指数，综合 LiveCodeBench 等代码基准。",
    source: "Artificial Analysis",
    defaultOn: true,
  },
  {
    key: "artificial_analysis_math_index",
    label: "Math Index",
    badge: "数学",
    percent: false,
    higherBetter: true,
    desc: "Artificial Analysis 数学能力指数，综合 AIME 等数学基准。",
    source: "Artificial Analysis",
    defaultOn: true,
  },
  {
    key: "mmlu_pro",
    label: "MMLU Pro",
    badge: "学科知识",
    percent: true,
    higherBetter: true,
    desc: "大规模多任务语言理解进阶版，衡量跨学科知识广度。",
    source: "MMLU Pro",
    defaultOn: false,
  },
  {
    key: "gpqa",
    label: "GPQA",
    badge: "知识",
    percent: true,
    higherBetter: true,
    desc: "研究生水平知识问答（GPQA Diamond），考察专家级科学知识。",
    source: "GPQA",
    defaultOn: false,
  },
  {
    key: "hle",
    label: "HLE",
    badge: "评估",
    percent: true,
    higherBetter: true,
    desc: "人类最后一场考试（Humanity's Last Exam），极难的综合知识测试。",
    source: "HLE",
    defaultOn: false,
  },
  {
    key: "livecodebench",
    label: "LiveCodeBench",
    badge: "代码",
    percent: true,
    higherBetter: true,
    desc: "持续更新的代码生成基准，降低数据污染影响。",
    source: "LiveCodeBench",
    defaultOn: false,
  },
  {
    key: "scicode",
    label: "SciCode",
    badge: "代码",
    percent: true,
    higherBetter: true,
    desc: "面向科研场景的数据科学编程题集。",
    source: "SciCode",
    defaultOn: false,
  },
  {
    key: "math_500",
    label: "Math 500",
    badge: "数学",
    percent: true,
    higherBetter: true,
    desc: "OpenAI 收集的 500 道竞赛数学题子集（MATH500）。",
    source: "MATHEMATICA/MATH500",
    defaultOn: false,
  },
  {
    key: "aime",
    label: "AIME",
    badge: "数学",
    percent: true,
    higherBetter: true,
    desc: "美国数学邀请赛题（老版口径，2023 及以前）。",
    source: "AIME",
    defaultOn: false,
  },
  {
    key: "aime_25",
    label: "AIME 2025",
    badge: "数学",
    percent: true,
    higherBetter: true,
    desc: "2025 版美国数学邀请赛题。",
    source: "AIME 2025",
    defaultOn: false,
  },
  {
    key: "ifbench",
    label: "IFBench",
    badge: "指令遵循",
    percent: true,
    higherBetter: true,
    desc: "指令遵循能力基准（IFEval 中文扩展）。",
    source: "IFBench",
    defaultOn: false,
  },
  {
    key: "lcr",
    label: "LCR",
    badge: "代码",
    percent: true,
    higherBetter: true,
    desc: "代码审查与修复基准（LLM Code Review）。",
    source: "LCR",
    defaultOn: false,
  },
  {
    key: "terminalbench_hard",
    label: "TerminalBench Hard",
    badge: "命令行",
    percent: true,
    higherBetter: true,
    desc: "终端 CLI 使用能力高难度子集评测。",
    source: "TerminalBench",
    defaultOn: false,
  },
  {
    key: "tau2",
    label: "Tau2",
    badge: "综合",
    percent: true,
    higherBetter: true,
    desc: "第三代整体智能基准测试（Tau-Bench 的升级版），综合对话与工具使用。",
    source: "Tau2",
    defaultOn: false,
  },
]

export const PRICE_COL_META = [
  { key: "price_in", label: "价格-输入", badge: "价格", unit: "$/1M", higherBetter: false },
  { key: "price_out", label: "价格-输出", badge: "价格", unit: "$/1M", higherBetter: false },
  { key: "speed", label: "输出速度", badge: "速度", unit: "tokens/s", higherBetter: true },
  { key: "ttft", label: "首token时间", badge: "速度", unit: "秒", higherBetter: false },
  { key: "first_answer", label: "首答案token时间", badge: "速度", unit: "秒", higherBetter: false },
] as const

/** 排序用的字段 key */
export type SortKey = "release_date" | "name" | "creator" | PriceSpeedKey
export type PriceSpeedKey = (typeof PRICE_COL_META)[number]["key"]