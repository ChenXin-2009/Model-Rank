import { DEFAULT_USD_TO_CNY, getExchangeInfo } from "@/lib/exchange"

jest.mock("node:fs", () => {
  const actual = jest.requireActual("node:fs")
  return { ...actual, existsSync: jest.fn(), readFileSync: jest.fn() }
})

const mockExists = jest.mocked(require("node:fs").existsSync)
const mockRead = jest.mocked(require("node:fs").readFileSync)

describe("getExchangeInfo", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("falls back to 7.2 when snapshot missing", () => {
    mockExists.mockReturnValue(false)
    expect(getExchangeInfo()).toEqual({ rate: 7.2, updated: null, source: "default" })
    expect(DEFAULT_USD_TO_CNY).toBe(7.2)
  })

  test("returns snapshot rate", () => {
    mockExists.mockReturnValue(true)
    mockRead.mockReturnValue(JSON.stringify({ rate: 6.7597, updated: "2026-08-08T00:02:31+00:00", source: "open.er-api.com" }))
    expect(getExchangeInfo()).toEqual({
      rate: 6.7597,
      updated: "2026-08-08T00:02:31+00:00",
      source: "open.er-api.com",
    })
  })

  test("falls back when snapshot is corrupt", () => {
    mockExists.mockReturnValue(true)
    mockRead.mockReturnValue("{ not json")
    expect(getExchangeInfo().rate).toBe(7.2)
  })

  test("falls back when rate is invalid", () => {
    mockExists.mockReturnValue(true)
    mockRead.mockReturnValue(JSON.stringify({ rate: -1 }))
    expect(getExchangeInfo().rate).toBe(7.2)
  })
})
