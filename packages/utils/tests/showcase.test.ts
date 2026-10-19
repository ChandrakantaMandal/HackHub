import { describe, it, expect } from "vitest"
import { listQuerySchema, commentSchema } from "../src/validation/showcase"

describe("listQuerySchema", () => {
  it("accepts empty query and defaults sort to newest", () => {
    const result = listQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sort).toBe("newest")
      expect(result.data.search).toBeUndefined()
      expect(result.data.category).toBeUndefined()
    }
  })

  it.each(["newest", "oldest", "title", "likes"] as const)(
    "accepts sort=%s",
    (sort) => {
      expect(listQuerySchema.safeParse({ sort }).success).toBe(true)
    }
  )

  it("rejects invalid sort value", () => {
    expect(listQuerySchema.safeParse({ sort: "rating" }).success).toBe(false)
  })

  it("accepts search and category strings", () => {
    const result = listQuerySchema.safeParse({
      search: "hackhub",
      category: "ai",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.search).toBe("hackhub")
      expect(result.data.category).toBe("ai")
    }
  })

  it("trims search whitespace", () => {
    const result = listQuerySchema.safeParse({ search: "  hackhub  " })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.search).toBe("hackhub")
    }
  })

  it("trims category whitespace", () => {
    const result = listQuerySchema.safeParse({ category: "  ai  " })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.category).toBe("ai")
    }
  })

  it("rejects empty search string", () => {
    expect(listQuerySchema.safeParse({ search: "" }).success).toBe(false)
  })

  it("rejects whitespace-only search", () => {
    expect(listQuerySchema.safeParse({ search: "   " }).success).toBe(false)
  })

  it("rejects empty category string", () => {
    expect(listQuerySchema.safeParse({ category: "" }).success).toBe(false)
  })

  it("rejects whitespace-only category", () => {
    expect(listQuerySchema.safeParse({ category: "   " }).success).toBe(false)
  })

  it("rejects non-string search", () => {
    expect(listQuerySchema.safeParse({ search: 42 }).success).toBe(false)
  })

  it("parses full valid query with all fields", () => {
    const result = listQuerySchema.safeParse({
      search: "  blockchain  ",
      category: " web3 ",
      sort: "likes",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.search).toBe("blockchain")
      expect(result.data.category).toBe("web3")
      expect(result.data.sort).toBe("likes")
    }
  })
})

describe("commentSchema", () => {
  it("accepts a valid message", () => {
    const result = commentSchema.safeParse({ message: "Great project!" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.message).toBe("Great project!")
    }
  })

  it("trims message whitespace", () => {
    const result = commentSchema.safeParse({ message: "  nice work  " })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.message).toBe("nice work")
    }
  })

  it("accepts message of exactly 2000 chars after trim", () => {
    expect(commentSchema.safeParse({ message: "x".repeat(2000) }).success).toBe(
      true
    )
  })

  it("rejects message over 2000 chars", () => {
    expect(commentSchema.safeParse({ message: "x".repeat(2001) }).success).toBe(
      false
    )
  })

  it("rejects empty message", () => {
    expect(commentSchema.safeParse({ message: "" }).success).toBe(false)
  })

  it("rejects whitespace-only message", () => {
    expect(commentSchema.safeParse({ message: "   " }).success).toBe(false)
  })

  it("rejects missing message", () => {
    expect(commentSchema.safeParse({}).success).toBe(false)
  })

  it("rejects non-string message", () => {
    expect(commentSchema.safeParse({ message: 123 }).success).toBe(false)
  })
})
