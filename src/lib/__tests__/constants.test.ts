import { EVAL_META, PRICE_COL_META, ARENA_TABS, USD_TO_CNY } from "@/lib/constants"

describe("constants", () => {
  test("EVAL_META keys are unique", () => {
    const keys = EVAL_META.map((e) => e.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  test("EVAL_META has no duplicate labels", () => {
    const labels = EVAL_META.map((e) => e.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  test("PRICE_COL_META keys are unique", () => {
    const keys = PRICE_COL_META.map((c) => c.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  test("arena tabs cover 4 categories", () => {
    expect(ARENA_TABS).toHaveLength(4)
    expect(ARENA_TABS.map((t) => t.key)).toEqual([
      "text-to-image",
      "text-to-video",
      "image-to-video",
      "text-to-speech",
    ])
  })

  test("exchange rate is 7.2", () => {
    expect(USD_TO_CNY).toBe(7.2)
  })
})