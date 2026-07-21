import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockRedis } = vi.hoisted(() => ({
  mockRedis: {
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  },
}))

vi.mock("@workspace/config", () => ({
  env: { REDIS_URL: "rediss://fake:6379" },
}))

vi.mock("@workspace/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}))

vi.mock("../src/client", () => ({
  default: mockRedis,
}))

import { setCache, getCache, deleteCache } from "../src/cache"

describe("setCache", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should store stringified value with EX expiry", async () => {
    mockRedis.set.mockResolvedValue("OK")

    await setCache("user:1", { name: "Alice" }, 3600)

    expect(mockRedis.set).toHaveBeenCalledWith(
      "user:1",
      '{"name":"Alice"}',
      "EX",
      3600
    )
  })
})

describe("getCache", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return parsed JSON when key exists", async () => {
    mockRedis.get.mockResolvedValue('{"name":"Alice","age":30}')

    const result = await getCache<{ name: string; age: number }>("user:1")

    expect(result).toEqual({ name: "Alice", age: 30 })
    expect(mockRedis.get).toHaveBeenCalledWith("user:1")
  })

  it("should return null when key does not exist", async () => {
    mockRedis.get.mockResolvedValue(null)

    const result = await getCache("nonexistent")

    expect(result).toBeNull()
  })

  it("should return null for empty string", async () => {
    mockRedis.get.mockResolvedValue("")

    const result = await getCache("empty-key")

    expect(result).toBeNull()
  })
})

describe("deleteCache", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should call redis.del with the key", async () => {
    mockRedis.del.mockResolvedValue(1)

    await deleteCache("user:1")

    expect(mockRedis.del).toHaveBeenCalledWith("user:1")
  })
})
