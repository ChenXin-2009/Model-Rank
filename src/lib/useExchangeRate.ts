"use client"

import { useEffect, useState } from "react"

/**
 * 客户端实时汇率：页面加载后从公开接口拉取最新 USD/CNY，
 * 初始值为构建期快照汇率，接口失败时静默回退。
 */
export function useExchangeRate(initialRate: number) {
  const [rate, setRate] = useState(initialRate)
  const [live, setLive] = useState(false)

  useEffect(() => {
    let cancelled = false
    const urls = [
      "https://open.er-api.com/v6/latest/USD",
      "https://api.exchangerate-api.com/v4/latest/USD",
    ]
    let i = 0
    const tryFetch = () => {
      if (cancelled || i >= urls.length) return
      const url = urls[i++]
      fetch(url)
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
        .then((j) => {
          const cny = j?.rates?.CNY
          if (typeof cny === "number" && cny > 0) {
            if (!cancelled) {
              setRate(cny)
              setLive(true)
            }
          } else if (!cancelled) {
            tryFetch()
          }
        })
        .catch(() => { if (!cancelled) tryFetch() })
    }
    tryFetch()
    return () => {
      cancelled = true
    }
  }, [initialRate])

  return { rate, live }
}
