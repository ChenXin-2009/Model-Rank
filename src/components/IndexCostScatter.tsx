"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { TextModel } from "@/lib/types"
import { fmtNum, fmtPrice } from "@/lib/format"
import { CREATOR_LOGOS } from "@/lib/logos"
import { familyKey, stripVariantSuffix } from "@/lib/modelFamily"

interface Pt {
  m: TextModel
  x: number
  y: number
}

interface View {
  lxMin: number
  lxMax: number
  yMin: number
  yMax: number
}

const L = 46
const R = 18
const T = 16
const B = 34

const LOGO = 18
const RECENT_DAYS = 180
const MAX_POINTS = 80
const MIN_X_RANGE = 0.25
const MIN_Y_RANGE = 5
const Y_FULL_MIN = 0
const Y_FULL_MAX = 100

/** 去掉名称中的等级后缀（如 (max)/(low)/"Instant"），用于散点图展示label */
function baseName(name: string): string {
  return stripVariantSuffix(name)
}

/** 主要厂商配色（深色背景下可读），其余按 slug 哈希取色 */
const CREATOR_COLORS: Record<string, string> = {
  openai: "#e8eaf0",
  anthropic: "#f87171",
  google: "#4ade80",
  deepseek: "#60a5fa",
  xai: "#c084fc",
  meta: "#38bdf8",
  alibaba: "#fbbf24",
  kimi: "#fb7185",
  zai: "#a3e635",
  mistral: "#fb923c",
  minimax: "#f97316",
  nvidia: "#84cc16",
  tencent: "#2dd4bf",
  baidu: "#818cf8",
  bytedance_seed: "#f472b6",
  aws: "#fbbf24",
  azure: "#4ade80",
  cohere: "#fb923c",
  ai2: "#94a3b8",
}

function creatorColor(slug: string): string {
  if (CREATOR_COLORS[slug]) return CREATOR_COLORS[slug]
  let h = 0
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0
  return `hsl(${h % 360} 70% 62%)`
}

/** 精选代表性模型：同一型号的不同 Effort/Reasoning 变体只保留指数最高的一个，优先近期发布 */
function selectModels(models: TextModel[]): Pt[] {
  const pool: Pt[] = []
  for (const m of models) {
    const y = m.evaluations?.artificial_analysis_intelligence_index
    const x = m.pricing?.price_1m_blended_3_to_1
    if (typeof y !== "number" || !Number.isFinite(y) || y <= 0) continue
    if (typeof x !== "number" || !Number.isFinite(x) || x <= 0) continue
    pool.push({ m, x, y })
  }

  const groups = new Map<string, Pt[]>()
  for (const p of pool) {
    const key = familyKey(p.m.name)
    const arr = groups.get(key) ?? []
    arr.push(p)
    groups.set(key, arr)
  }
  const deduped: Pt[] = []
  for (const arr of groups.values()) {
    arr.sort((a, b) => b.y - a.y || (b.m.release_date ?? "").localeCompare(a.m.release_date ?? ""))
    deduped.push(arr[0])
  }

  let anchor = "1970-01-01"
  for (const p of deduped) {
    if (p.m.release_date && p.m.release_date > anchor) anchor = p.m.release_date
  }
  const cutoff = new Date(new Date(anchor).getTime() - RECENT_DAYS * 86400000).toISOString().slice(0, 10)

  const recent = deduped.filter((p) => p.m.release_date && p.m.release_date >= cutoff)
  const selected = new Set(recent)
  if (recent.length < MAX_POINTS) {
    const rest = [...deduped]
      .filter((p) => !selected.has(p))
      .sort((a, b) => b.y - a.y)
    for (const p of rest) {
      if (selected.size >= MAX_POINTS) break
      selected.add(p)
    }
  }
  return [...selected].sort((a, b) => b.y - a.y).slice(0, MAX_POINTS)
}

function fmtTick(v: number): string {
  return String(+v.toPrecision(2))
}

/** 等差刻度的"整齐"步长：取 1/2/2.5/5 × 10^k */
function niceStep(raw: number): number {
  if (!(raw > 0) || !Number.isFinite(raw)) return 1
  const p = Math.pow(10, Math.floor(Math.log10(raw)))
  const r = raw / p
  if (r <= 1) return p
  if (r <= 2) return 2 * p
  if (r <= 2.5) return 2.5 * p
  if (r <= 5) return 5 * p
  return 10 * p
}

/** 线段裁剪到 [lo, hi] 水平带内（散点图只有 y 方向会越界），返回裁剪后的端点 */
function clipToBand(
  x1: number, y1: number, x2: number, y2: number, lo: number, hi: number
): [number, number, number, number] | null {
  if (y1 < lo && y2 < lo) return null
  if (y1 > hi && y2 > hi) return null
  const dx = x2 - x1
  const dy = y2 - y1
  if (dy === 0) return [x1, y1, x2, y2]
  let t0: number, t1: number
  if (dy > 0) { t0 = (lo - y1) / dy; t1 = (hi - y1) / dy }
  else { t0 = (hi - y1) / dy; t1 = (lo - y1) / dy }
  t0 = Math.max(0, t0)
  t1 = Math.min(1, t1)
  if (t0 > t1) return null
  return [x1 + t0 * dx, y1 + t0 * dy, x1 + t1 * dx, y1 + t1 * dy]
}

export default function IndexCostScatter({ models }: { models: TextModel[] }) {
  const pts = useMemo(() => selectModels(models), [models])

  /** 手机竖屏：收窄 viewBox（540 宽）让图标/文字渲染得更大，并加高（H=640）；横屏/桌面保持 760×470 */
  const [mobilePortrait, setMobilePortrait] = useState(false)
  const W = mobilePortrait ? 540 : 760
  const IW = W - L - R
  const H = mobilePortrait ? 640 : 470
  const IH = H - T - B

  /** 横轴刻度：log=对数（默认），lin=等差 */
  const [xScale, setXScale] = useState<"log" | "lin">("log")
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px) and (orientation: portrait)")
    const apply = () => setMobilePortrait(mq.matches)
    apply()
    mq.addEventListener?.("change", apply)
    return () => mq.removeEventListener?.("change", apply)
  }, [])

  const full = useMemo(() => {
    const xs = pts.map((p) => p.x).sort((a, b) => a - b)
    if (!xs.length) return null
    return {
      xMin: Math.pow(10, Math.floor(Math.log10(xs[0]))),
      xMax: Math.pow(10, Math.ceil(Math.log10(xs[Math.floor(xs.length * 0.99)]))),
    }
  }, [pts])

  /** 默认视图：贴合数据分布（比全局 0~100 视野更聚焦，点更大），缩放上限仍可回到全局 */
  const defaultView = useMemo<View | null>(() => {
    if (!pts.length) return null
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    const xLo = Math.pow(10, Math.floor(Math.log10(Math.min(...xs))))
    const xHi = Math.pow(10, Math.ceil(Math.log10(Math.max(...xs))))
    const yMin = Math.max(0, Math.floor(Math.min(...ys) - 2))
    const yMax = Math.min(Y_FULL_MAX, Math.ceil(Math.max(...ys) + 2))
    return {
      lxMin: Math.log10(xLo),
      lxMax: Math.log10(xHi),
      yMin,
      yMax: Math.max(yMin + MIN_Y_RANGE, yMax),
    }
  }, [pts])

  /** 一次线性拟合（对 log10 价格做最小二乘）：y = m·log10(x) + b，用于显示散点趋势 */
  const fit = useMemo(() => {
    if (pts.length < 2) return null
    let sx = 0, sy = 0, sxx = 0, sxy = 0
    for (const p of pts) {
      const lx = Math.log10(p.x)
      sx += lx; sy += p.y; sxx += lx * lx; sxy += lx * p.y
    }
    const n = pts.length
    const denom = n * sxx - sx * sx
    if (denom === 0) return null
    const m = (n * sxy - sx * sy) / denom
    const b = (sy - m * sx) / n
    const meanY = sy / n
    let sst = 0, ssr = 0
    for (const p of pts) {
      const lx = Math.log10(p.x)
      const e = p.y - (m * lx + b)
      sst += (p.y - meanY) ** 2
      ssr += e * e
    }
    return { m, b, r2: sst > 0 ? 1 - ssr / sst : 0 }
  }, [pts])

  const [view, setView] = useState<View | null>(() => defaultView)
  const [dragging, setDragging] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ sx: number; sy: number; view: View; moved: boolean } | null>(null)
  const viewRef = useRef<View | null>(view)
  const animRef = useRef<number | null>(null)
  /** 本次手势是否发生过位移（拖动），用于手势结束后拦截误点击跳转 */
  const movedRef = useRef(false)

  /** 带缓动的视图迁移（easeOutCubic，260ms），缩放/重置都走这里 */
  function animateTo(to: View) {
    const from = viewRef.current
    if (!from) return
    if (!Number.isFinite(from.lxMin) || !Number.isFinite(from.lxMax) || !Number.isFinite(from.yMin) || !Number.isFinite(from.yMax)) {
      viewRef.current = to
      setView(to)
      return
    }
    if (animRef.current) cancelAnimationFrame(animRef.current)
    const dur = 260
    const t0 = performance.now()
    const frame = (now: number) => {
      const k = Math.min(1, (now - t0) / dur)
      const e = 1 - (1 - k) ** 3
      const v: View = {
        lxMin: from.lxMin + (to.lxMin - from.lxMin) * e,
        lxMax: from.lxMax + (to.lxMax - from.lxMax) * e,
        yMin: from.yMin + (to.yMin - from.yMin) * e,
        yMax: from.yMax + (to.yMax - from.yMax) * e,
      }
      viewRef.current = v
      setView(v)
      if (k < 1) animRef.current = requestAnimationFrame(frame)
    }
    animRef.current = requestAnimationFrame(frame)
  }

  useEffect(() => {
    viewRef.current = view
  }, [view])

  const px = (v: number) => {
    if (!view) return L
    if (xScale === "lin") {
      const linMin = 10 ** view.lxMin
      const linMax = 10 ** view.lxMax
      const c = Math.min(linMax, Math.max(linMin, v))
      return L + ((c - linMin) / (linMax - linMin)) * IW
    }
    const log = Math.log10(Math.min(10 ** view.lxMax, Math.max(10 ** view.lxMin, v)))
    return L + ((log - view.lxMin) / (view.lxMax - view.lxMin)) * IW
  }
  const py = (v: number) => {
    if (!view) return T
    return T + (1 - (v - view.yMin) / (view.yMax - view.yMin)) * IH
  }

  /** 等比缩放：横纵轴始终使用同一个缩放系数；任一轴到达边界时两轴一起停 */
  const zoomAt = (mx: number, my: number, factor: number, v: View, fullX: { xMin: number; xMax: number }): View => {
    const fullRange =
      xScale === "log"
        ? Math.log10(fullX.xMax) - Math.log10(fullX.xMin)
        : fullX.xMax - fullX.xMin
    const fullLogRange = Math.log10(fullX.xMax) - Math.log10(fullX.xMin)
    const xRange =
      xScale === "log"
        ? v.lxMax - v.lxMin
        : 10 ** v.lxMax - 10 ** v.lxMin
    const yRange = v.yMax - v.yMin
    const minX = xScale === "log" ? MIN_X_RANGE : (MIN_X_RANGE / fullLogRange) * fullRange
    const fLow = Math.max(minX / xRange, MIN_Y_RANGE / (Y_FULL_MAX - Y_FULL_MIN))
    const fHigh = Math.min(fullRange / xRange, (Y_FULL_MAX - Y_FULL_MIN) / yRange)
    const f = Math.min(Math.max(factor, fLow), fHigh)
    const newXRange = xRange * f
    const newYRange = yRange * f
    const fracX = (mx - L) / IW
    const fracY = (my - T) / IH
    const valAt = v.yMax - fracY * yRange
    let yMin = valAt - fracY * newYRange
    let yMax = yMin + newYRange
    let lxMin: number, lxMax: number
    if (xScale === "lin") {
      const linMin = 10 ** v.lxMin
      const linMax = 10 ** v.lxMax
      const priceAt = linMin + fracX * xRange
      let nLinMin = priceAt - fracX * newXRange
      let nLinMax = nLinMin + newXRange
      if (nLinMin > fullX.xMax) { nLinMin = fullX.xMax - newXRange; nLinMax = fullX.xMax }
      if (nLinMax < fullX.xMin) { nLinMax = fullX.xMin + newXRange; nLinMin = fullX.xMin }
      lxMin = Math.log10(nLinMin)
      lxMax = Math.log10(nLinMax)
    } else {
      const logAt = v.lxMin + fracX * xRange
      const fMin = Math.log10(fullX.xMin)
      const fMax = Math.log10(fullX.xMax)
      lxMin = logAt - fracX * newXRange
      lxMax = lxMin + newXRange
      if (lxMin > fMax) { lxMin = fMax - newXRange; lxMax = fMax }
      if (lxMax < fMin) { lxMax = fMin + newXRange; lxMin = fMin }
    }
    if (yMin > Y_FULL_MAX) { yMin = Y_FULL_MAX - newYRange; yMax = Y_FULL_MAX }
    if (yMax < Y_FULL_MIN) { yMax = Y_FULL_MIN + newYRange; yMin = Y_FULL_MIN }
    return { lxMin, lxMax, yMin, yMax }
  }

  useEffect(() => {
    const svg = svgRef.current
    if (!svg || !full) return
    const fullX = full
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY > 0 ? 1.3 : 1 / 1.3
      const v = viewRef.current
      if (v) animateTo(zoomAt(L + IW / 2, T + IH / 2, factor, v, fullX))
    }
    svg.addEventListener("wheel", onWheel, { passive: false })
    return () => svg.removeEventListener("wheel", onWheel)
  }, [full])

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const v = viewRef.current
    if (!v) return
    if (animRef.current) cancelAnimationFrame(animRef.current)
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    dragRef.current = { sx: e.clientX, sy: e.clientY, view: v, moved: false }
    movedRef.current = false
    setDragging(true)
  }
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    if (!drag || !full) return
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 3) {
      drag.moved = true
      movedRef.current = true
    }
    const rect = svgRef.current!.getBoundingClientRect()
    const s = W / rect.width
    const dx = (e.clientX - drag.sx) * s
    const dy = (e.clientY - drag.sy) * s
    const xRange = xScale === "log" ? drag.view.lxMax - drag.view.lxMin : 10 ** drag.view.lxMax - 10 ** drag.view.lxMin
    const yRange = drag.view.yMax - drag.view.yMin
    let lxMin: number
    let lxMax: number
    if (xScale === "lin") {
      const fLinMin = full.xMin
      const fLinMax = full.xMax
      let nLinMin = 10 ** drag.view.lxMin - (dx / IW) * xRange
      if (nLinMin > fLinMax) nLinMin = fLinMax
      if (nLinMin + xRange < fLinMin) nLinMin = fLinMin - xRange
      if (nLinMin <= 0) nLinMin = Math.max(fLinMin / 100, 1e-9)
      lxMin = Math.log10(nLinMin)
      lxMax = Math.log10(nLinMin + xRange)
    } else {
      const fMin = Math.log10(full.xMin)
      const fMax = Math.log10(full.xMax)
      lxMin = drag.view.lxMin - (dx / IW) * xRange
      if (lxMin > fMax) lxMin = fMax
      if (lxMin + xRange < fMin) lxMin = fMin - xRange
      lxMax = lxMin + xRange
    }
    let yMin = drag.view.yMin + (dy / IH) * yRange
    if (yMin > Y_FULL_MAX) yMin = Y_FULL_MAX
    if (yMin + yRange < Y_FULL_MIN) yMin = Y_FULL_MIN - yRange
    setView({ lxMin, lxMax, yMin, yMax: yMin + yRange })
  }
  const onPointerUp = () => {
    dragRef.current = null
    setDragging(false)
  }
  const resetView = () => {
    if (!defaultView) return
    animateTo(defaultView)
  }
  /** 以屏幕中心等比缩放一步（与滚轮同系数 1.3），带缓动 */
  const zoomBy = (factor: number) => {
    const v = viewRef.current
    if (!v || !full) return
    animateTo(zoomAt(L + IW / 2, T + IH / 2, factor, v, full))
  }

  if (!full || !view || !pts.length) {
    return (
      <section className="chart-card">
        <div className="chart-head"><h2>智能指数 vs 价格</h2></div>
        <div className="chart-empty">暂无数据</div>
      </section>
    )
  }

  /** 可见点：落在当前视野内的模型，名字始终显示 */
  const visible = pts.filter(
    (p) =>
      Math.log10(p.x) >= view.lxMin &&
      Math.log10(p.x) <= view.lxMax &&
      p.y >= view.yMin &&
      p.y <= view.yMax
  )

  /** 网格：对数模式水平按十进位步长（1/0.5/0.25/0.1），等差模式取整齐步长；
   *  垂直步长由水平网格的像素边长精确反推，使每个大网格单元始终保持 1:1 方块；每个单元内部再画一半步长的浅色小网格 */
  const rangeX = view.lxMax - view.lxMin
  const rangeY = view.yMax - view.yMin
  const rangeXL = xScale === "lin" ? 10 ** view.lxMax - 10 ** view.lxMin : rangeX
  const xStep =
    xScale === "lin"
      ? niceStep(rangeXL / 6)
      : [1, 0.5, 0.25, 0.1].find((s) => rangeX / s >= 2) ?? 0.05
  const pitch = xStep * (IW / rangeXL)
  let yStep = +((pitch * rangeY) / IH).toPrecision(2)
  const yCount = rangeY / yStep
  if (yCount > 12) yStep = +(yStep * 2).toPrecision(2)
  else if (yCount < 2.5) yStep = +(rangeY / 4).toPrecision(2)
  const yHalf = yStep / 2

  const xTicks: number[] = []
  const xSubTicks: number[] = []
  if (xScale === "lin") {
    const linMin = 10 ** view.lxMin
    const linMax = 10 ** view.lxMax
    const half = xStep / 2
    for (let i = Math.floor(linMin / half) - 1; i <= Math.ceil(linMax / half) + 1; i++) {
      const v = +(i * half).toFixed(8)
      if (v < linMin || v > linMax) continue
      if (i % 2 === 0) xTicks.push(v)
      else xSubTicks.push(v)
    }
  } else {
    for (let i = Math.floor(view.lxMin / xStep) - 1; i <= Math.ceil(view.lxMax / xStep) + 1; i++) {
      const major = 10 ** (i * xStep)
      if (major >= 10 ** view.lxMin && major <= 10 ** view.lxMax) xTicks.push(major)
      const sub = 10 ** ((i + 0.5) * xStep)
      if (sub >= 10 ** view.lxMin && sub <= 10 ** view.lxMax) xSubTicks.push(sub)
    }
  }

  const yTicks: number[] = []
  const ySubTicks: number[] = []
  for (let i = Math.floor(view.yMin / yHalf) - 1; i <= Math.ceil(view.yMax / yHalf) + 1; i++) {
    const v = +((i * yHalf)).toFixed(6)
    if (v < view.yMin || v > view.yMax) continue
    if (i % 2 === 0) yTicks.push(v)
    else ySubTicks.push(v)
  }

  /** 缩放百分比：当前视野相对全局视野的比例。等比缩放两轴系数始终一致，用几何平均避免单轴失真 */
  const zoomPct = full
    ? Math.round(
        Math.sqrt(
          (xScale === "lin"
            ? (full.xMax - full.xMin) / (10 ** view.lxMax - 10 ** view.lxMin)
            : (Math.log10(full.xMax) - Math.log10(full.xMin)) / (view.lxMax - view.lxMin)) *
            ((Y_FULL_MAX - Y_FULL_MIN) / (view.yMax - view.yMin))
        ) * 100
      )
    : 100

  /** 切换横轴刻度：保持当前视野端点不变，仅改变刻度映射 */
  const toggleScale = () => setXScale((s) => (s === "log" ? "lin" : "log"))

  return (
    <section className="chart-card scatter-card">
      <div className="chart-head">
        <h2>智能指数 vs 价格</h2>
        <span className="chart-badge">性价比</span>
        <button
          type="button"
          className="scale-toggle"
          aria-label="切换横轴刻度"
          title={`点击切换为${xScale === "log" ? "等差" : "对数"}刻度`}
          onClick={toggleScale}
        >
          横轴 {xScale === "log" ? "等差" : "对数"}
        </button>
        <div className="zoom-ctrl">
          <button type="button" className="zoom-btn" aria-label="缩小" title="缩小" onClick={() => zoomBy(1.3)}>−</button>
          <span className="zoom-badge">缩放 {zoomPct}%</span>
          <button type="button" className="zoom-btn" aria-label="放大" title="放大" onClick={() => zoomBy(1 / 1.3)}>+</button>
        </div>
        <button className="btn btn-sm" onClick={resetView}>↺ 重置视图</button>
      </div>
      <p className="chart-desc">横轴：综合价格（$/1M，{xScale === "log" ? "对数坐标" : "等差坐标"}）· 纵轴：智能指数 · 滚轮以屏幕中心等比缩放（带缓动）</p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={`scatter-svg ${dragging ? "dragging" : ""}`}
        role="img"
        aria-label="智能指数与价格散点图"
        ref={svgRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {xSubTicks.map((t) => (
          <line key={`xs${t}`} x1={px(t)} y1={T} x2={px(t)} y2={T + IH} className="scatter-grid-sub" />
        ))}
        {ySubTicks.map((t) => (
          <line key={`ys${t}`} x1={L} y1={py(t)} x2={L + IW} y2={py(t)} className="scatter-grid-sub" />
        ))}
        {xTicks.map((t) => (
          <g key={t}>
            <line x1={px(t)} y1={T} x2={px(t)} y2={T + IH} className="scatter-grid" />
            <text x={px(t)} y={H - 12} className="scatter-tick">{fmtTick(t)}</text>
          </g>
        ))}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={L} y1={py(t)} x2={L + IW} y2={py(t)} className="scatter-grid" />
            <text x={L - 6} y={py(t) + 4} className="scatter-tick" textAnchor="end">{fmtTick(t)}</text>
          </g>
        ))}
        <text x={L + IW / 2} y={H - 1} className="scatter-axis" textAnchor="middle">综合价格（美元/百万 tokens，{xScale === "log" ? "对数刻度" : "等差刻度"}）</text>
        <text x={14} y={T + IH / 2} className="scatter-axis" textAnchor="middle" transform={`rotate(-90 14 ${T + IH / 2})`}>智能指数评分</text>

        {fit && (() => {
          if (xScale === "log") {
            const y1 = fit.m * view.lxMin + fit.b
            const y2 = fit.m * view.lxMax + fit.b
            const seg = clipToBand(L, py(y1), L + IW, py(y2), T, T + IH)
            if (!seg) return null
            return (
              <line x1={seg[0]} y1={seg[1]} x2={seg[2]} y2={seg[3]} className="scatter-fit" />
            )
          }
          // 等差刻度：y = m·log10(x) + b 按对数均匀采样，绘制为平滑曲线
          const N = 160
          const segs: React.ReactElement[] = []
          let prev: [number, number] | null = null
          for (let i = 0; i <= N; i++) {
            const x = 10 ** (view.lxMin + ((view.lxMax - view.lxMin) * i) / N)
            const p: [number, number] = [px(x), py(fit.m * Math.log10(x) + fit.b)]
            if (prev) {
              const seg = clipToBand(prev[0], prev[1], p[0], p[1], T, T + IH)
              if (seg) segs.push(<line key={i} x1={seg[0]} y1={seg[1]} x2={seg[2]} y2={seg[3]} className="scatter-fit" />)
            }
            prev = p
          }
          return <>{segs}</>
        })()}

        {visible.map((p) => {
          const cx = px(p.x)
          const cy = py(p.y)
          const labelRight = cx > L + IW * 0.6
          const slug = p.m.model_creator?.slug ?? "?"
          const logo = CREATOR_LOGOS[slug]?.file
          const tip = `${p.m.name}（${p.m.model_creator?.name ?? "未知"}）\n指数 ${fmtNum(p.y, 1)} · ${fmtPrice(p.x, false)}/1M · 发布 ${p.m.release_date ?? "未知"}`
          return (
            <a
              key={p.m.id}
              href={`/model/${p.m.slug}`}
              className="scatter-logo-link"
              onClick={(e) => {
                // 手势（拖动/捏合）结束后的 click 不触发跳转；纯点按才放行
                if (movedRef.current) {
                  e.preventDefault()
                  movedRef.current = false
                }
              }}
            >
              {logo ? (
                <image href={logo} x={cx - LOGO / 2} y={cy - LOGO / 2} width={LOGO} height={LOGO} className="scatter-logo">
                  <title>{tip}</title>
                </image>
              ) : (
                <circle cx={cx} cy={cy} r={6} fill={creatorColor(slug)} stroke="rgba(0,0,0,0.35)" strokeWidth="0.8">
                  <title>{tip}</title>
                </circle>
              )}
              <text
                x={labelRight ? cx - LOGO / 2 - 5 : cx + LOGO / 2 + 5}
                y={cy + 3}
                textAnchor={labelRight ? "end" : "start"}
                className="scatter-label"
              >
                {baseName(p.m.name)}
              </text>
            </a>
          )
        })}
      </svg>

      <p className="chart-unit">悬停查看详情，点击跳转模型页 · 滚轮缩放、拖动平移 · 虚线为拟合趋势线（对数刻度下呈直线，等差刻度下呈曲线）</p>
    </section>
  )
}
