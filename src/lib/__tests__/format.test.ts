import { fmtDate, fmtNum, fmtPercent, fmtPrice, fmtSeconds, fmtSpeed } from "@/lib/format"

describe("format", () => {
  test("fmtNum handles null/undefined/0", () => {
    expect(fmtNum(null)).toBe("-")
    expect(fmtNum(undefined)).toBe("-")
    expect(fmtNum(Number.NaN)).toBe("-")
    expect(fmtNum(0)).toBe("-")
    expect(fmtNum(24.3)).toBe("24.30")
  })

  test("fmtPercent converts 0-1 to percent", () => {
    expect(fmtPercent(null)).toBe("-")
    expect(fmtPercent(0.734)).toBe("73.4%")
    expect(fmtPercent(1)).toBe("100.0%")
  })

  test("fmtPrice converts to CNY with rate 7.2", () => {
    expect(fmtPrice(0.545, false)).toBe("$0.55")
    expect(fmtPrice(5, true)).toBe("¥36.00")
    expect(fmtPrice(null, false)).toBe("-")
  })

  test("fmtSpeed rounds and formats", () => {
    expect(fmtSpeed(206.824)).toBe("207")
    expect(fmtSpeed(null)).toBe("-")
    expect(fmtSpeed(0)).toBe("-")
  })

  test("fmtSeconds keeps 2 decimals", () => {
    expect(fmtSeconds(0.559)).toBe("0.56s")
    expect(fmtSeconds(1.015)).toBe("1.01s")
  })

  test("fmtDate slices to date part", () => {
    expect(fmtDate("2026-08-06")).toBe("2026-08-06")
    expect(fmtDate("2026-04")).toBe("2026-04")
    expect(fmtDate(null)).toBe("-")
  })
})