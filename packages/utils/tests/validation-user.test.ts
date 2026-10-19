import { describe, it, expect } from "vitest"
import {
  userIdSchema,
  updateUserSchema,
  paginationSchema,
} from "../src/validation/user"

const UUID = "550e8400-e29b-41d4-a716-446655440000"

describe("userIdSchema", () => {
  it("accepts an object with a valid uuid id", () => {
    expect(userIdSchema.parse({ id: UUID })).toEqual({ id: UUID })
  })

  it("rejects a non-uuid id", () => {
    expect(userIdSchema.safeParse({ id: "not-a-uuid" }).success).toBe(false)
  })

  it("rejects missing id", () => {
    expect(userIdSchema.safeParse({}).success).toBe(false)
  })

  it("rejects a bare string input", () => {
    expect(userIdSchema.safeParse(UUID).success).toBe(false)
  })
})

describe("updateUserSchema", () => {
  it("accepts an empty patch", () => {
    expect(updateUserSchema.parse({})).toEqual({})
  })

  it("accepts valid name, email and avatar", () => {
    const result = updateUserSchema.parse({
      name: "Alice",
      email: "alice@hackhub.dev",
      avatar: "https://cdn.hackhub.dev/a.png",
    })
    expect(result).toEqual({
      name: "Alice",
      email: "alice@hackhub.dev",
      avatar: "https://cdn.hackhub.dev/a.png",
    })
  })

  it("rejects name shorter than 2 chars", () => {
    expect(updateUserSchema.safeParse({ name: "A" }).success).toBe(false)
  })

  it("rejects name longer than 50 chars", () => {
    expect(updateUserSchema.safeParse({ name: "a".repeat(51) }).success).toBe(
      false
    )
  })

  it("rejects invalid email", () => {
    expect(updateUserSchema.safeParse({ email: "not-an-email" }).success).toBe(
      false
    )
  })

  it("rejects non-url avatar", () => {
    expect(updateUserSchema.safeParse({ avatar: "not-a-url" }).success).toBe(
      false
    )
  })
})

describe("paginationSchema", () => {
  it("applies defaults when input is empty", () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, limit: 10 })
  })

  it("coerces string numbers", () => {
    expect(paginationSchema.parse({ page: "3", limit: "20" })).toEqual({
      page: 3,
      limit: 20,
    })
  })

  it("rejects page below 1", () => {
    expect(paginationSchema.safeParse({ page: 0 }).success).toBe(false)
  })

  it("rejects limit of 0", () => {
    expect(paginationSchema.safeParse({ limit: 0 }).success).toBe(false)
  })

  it("rejects limit above 100", () => {
    expect(paginationSchema.safeParse({ limit: 101 }).success).toBe(false)
  })

  it("strips unknown keys", () => {
    expect(paginationSchema.parse({ page: 1, limit: 10, foo: "bar" })).toEqual({
      page: 1,
      limit: 10,
    })
  })
})
