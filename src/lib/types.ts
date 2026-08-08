/** 数据快照中单条文本模型的原始结构（来自 Artificial Analysis 汇总） */
export interface Creator {
  id: string
  name: string
  slug: string
}

/** 全部评测字段，值为 null 表示未参评 */
export interface Evaluations {
  artificial_analysis_intelligence_index: number | null
  artificial_analysis_coding_index: number | null
  artificial_analysis_math_index: number | null
  mmlu_pro: number | null
  gpqa: number | null
  hle: number | null
  livecodebench: number | null
  scicode: number | null
  math_500: number | null
  aime: number | null
  aime_25: number | null
  ifbench: number | null
  lcr: number | null
  terminalbench_hard: number | null
  terminalbench_v2_1: number | null
  tau2: number | null
  tau_banking: number | null
}

export interface Pricing {
  price_1m_blended_3_to_1: number | null
  price_1m_input_tokens: number | null
  price_1m_output_tokens: number | null
}

export interface TextModel {
  id: string
  name: string
  slug: string
  release_date: string
  model_creator: Creator
  evaluations: Partial<Evaluations>
  pricing: Partial<Pricing>
  median_output_tokens_per_second: number | null
  median_time_to_first_token_seconds: number | null
  median_time_to_first_answer_token: number | null
}

/** 图文音视频竞技场数据（LMArena 风格 Elo） */
export interface ArenaModel {
  id: string
  name: string
  slug: string
  model_creator: Creator
  elo: number
  rank: number | null
  ci95: string | null
  appearances: number | null
  release_date: string | null
}

export interface SnapshotMeta {
  date: string
  files: Record<string, number>
}

/** 竞技场分类 key -> 数据文件名 */
export type ArenaCategory = "text-to-image" | "text-to-video" | "image-to-video" | "text-to-speech"

export interface ArenaTabMeta {
  key: ArenaCategory
  label: string
  /** 排序依据基准名（展示用） */
  source: string
}