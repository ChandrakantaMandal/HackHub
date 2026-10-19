import { describe, it, expect } from "vitest"
import { historyQuerySchema } from "../src/validation/chat"

describe("historyQuerySchema", () => {
  it("defaults limit to 50 when omitted", () => {
    const result = historyQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(50)
      expect(result.data.before).toBeUndefined()
    }
  })

  it("coerces string limit from query strings", () => {
    const result = historyQuerySchema.safeParse({ limit: "25" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(25)
      expect(typeof result.data.limit).toBe("number")
    }
  })

  it("accepts limit at minimum (1)", () => {
    expect(historyQuerySchema.safeParse({ limit: 1 }).success).toBe(true)
  })

  it("accepts limit at maximum (100)", () => {
    expect(historyQuerySchema.safeParse({ limit: 100 }).success).toBe(true)
  })

  it("rejects limit below minimum (0)", () => {
    expect(historyQuerySchema.safeParse({ limit: 0 }).success).toBe(false)
  })

  it("rejects limit above maximum (101)", () => {
    expect(historyQuerySchema.safeParse({ limit: 101 }).success).toBe(false)
  })

  it("rejects non-integer limit", () => {
    expect(historyQuerySchema.safeParse({ limit: 7.5 }).success).toBe(false)
  })

  it("rejects non-numeric limit string", () => {
    expect(historyQuerySchema.safeParse({ limit: "abc" }).success).toBe(false)
  })

  it("rejects negative limit", () => {
    expect(historyQuerySchema.safeParse({ limit: -5 }).success).toBe(false)
  })

  it("accepts optional before as ISO date string (query string shape)", () => {
    const result = historyQuerySchema.safeParse({
      before: "2026-01-15T12:00:00.000Z",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.before).toBeInstanceOf(Date)
      expect(result.data.before?.toISOString()).toBe("2026-01-15T12:00:00.000Z")
    }
  })

  it("accepts optional before as a Date instance", () => {
    const before = new Date("2026-06-01T00:00:00.000Z")
    const result = historyQuerySchema.safeParse({ before })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.before?.getTime()).toBe(before.getTime())
    }
  })

  it("rejects invalid before value", () => {
    expect(historyQuerySchema.safeParse({ before: "not-a-date" }).success).toBe(
      false
    )
  })

  it("parses full valid payload with limit and before", () => {
    const result = historyQuerySchema.safeParse({
      limit: "10",
      before: "2026-03-01T08:30:00.000Z",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(10)
      expect(result.data.before?.toISOString()).toBe("2026-03-01T08:30:00.000Z")
    }
  })
})
