import { describe, it, expect } from "vitest"
import { scoreSchema, awardBadgeSchema } from "../src/validation/judge"

describe("scoreSchema", () => {
  const validScore = {
    innovation: 10,
    technical: 8,
    design: 7,
    presentation: 9,
    overall: 8,
  }

  it("accepts a valid score payload", () => {
    expect(scoreSchema.safeParse(validScore).success).toBe(true)
  })

  it("accepts optional feedback within limit", () => {
    expect(
      scoreSchema.safeParse({ ...validScore, feedback: "Great work" }).success
    ).toBe(true)
  })

  it("accepts feedback of exactly 2000 chars", () => {
    expect(
      scoreSchema.safeParse({ ...validScore, feedback: "x".repeat(2000) })
        .success
    ).toBe(true)
  })

  it("rejects feedback over 2000 chars", () => {
    expect(
      scoreSchema.safeParse({ ...validScore, feedback: "x".repeat(2001) })
        .success
    ).toBe(false)
  })

  it("rejects non-integer score", () => {
    expect(
      scoreSchema.safeParse({ ...validScore, technical: 7.5 }).success
    ).toBe(false)
  })

  it("rejects negative score", () => {
    expect(
      scoreSchema.safeParse({ ...validScore, innovation: -1 }).success
    ).toBe(false)
  })

  it("rejects score above 10", () => {
    expect(scoreSchema.safeParse({ ...validScore, overall: 11 }).success).toBe(
      false
    )
  })

  it("rejects missing field", () => {
    const { overall: _overall, ...missingOverall } = validScore
    expect(scoreSchema.safeParse(missingOverall).success).toBe(false)
  })
})

describe("awardBadgeSchema", () => {
  it("accepts name only", () => {
    expect(awardBadgeSchema.safeParse({ name: "Best UI" }).success).toBe(true)
  })

  it("accepts name with description at limit", () => {
    expect(
      awardBadgeSchema.safeParse({
        name: "Best UI",
        description: "d".repeat(500),
      }).success
    ).toBe(true)
  })

  it("rejects empty name", () => {
    expect(awardBadgeSchema.safeParse({ name: "" }).success).toBe(false)
  })

  it("rejects whitespace-only name", () => {
    expect(awardBadgeSchema.safeParse({ name: "   " }).success).toBe(false)
  })

  it("rejects name longer than 100 chars", () => {
    expect(awardBadgeSchema.safeParse({ name: "n".repeat(101) }).success).toBe(
      false
    )
  })

  it("rejects description over 500 chars", () => {
    expect(
      awardBadgeSchema.safeParse({
        name: "Best UI",
        description: "d".repeat(501),
      }).success
    ).toBe(false)
  })
})
