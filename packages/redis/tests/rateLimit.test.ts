import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockRedis, mockHttpLogger } = vi.hoisted(() => ({
  mockRedis: {
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  },
  mockHttpLogger: vi.fn((req: any, res: any, next: any) => next()),
}))

vi.mock("@workspace/config", () => ({
  env: { REDIS_URL: "rediss://fake:6379" },
}))

vi.mock("@workspace/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn() },
  httpLogger: mockHttpLogger,
}))

vi.mock("../src/client", () => ({
  default: mockRedis,
}))

import { checkRateLimit } from "../src/rateLimit"

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should allow request when under limit", async () => {
    mockRedis.incr.mockResolvedValue(1)
    mockRedis.expire.mockResolvedValue(1)
    mockRedis.ttl.mockResolvedValue(600)

    const result = await checkRateLimit({
      key: "test-key",
      limit: 5,
      window: 600,
    })

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
    expect(result.reset).toBe(600)
    expect(mockRedis.incr).toHaveBeenCalledWith("rate_limit:test-key")
  })

  it("should set expiry when key is first created (current === 1)", async () => {
    mockRedis.incr.mockResolvedValue(1)
    mockRedis.expire.mockResolvedValue(1)
    mockRedis.ttl.mockResolvedValue(600)

    await checkRateLimit({ key: "test-key", limit: 5, window: 600 })

    expect(mockRedis.expire).toHaveBeenCalledWith("rate_limit:test-key", 600)
  })

  it("should not set expiry when key already exists (current > 1)", async () => {
    mockRedis.incr.mockResolvedValue(3)
    mockRedis.ttl.mockResolvedValue(500)

    await checkRateLimit({ key: "test-key", limit: 5, window: 600 })

    expect(mockRedis.expire).not.toHaveBeenCalled()
  })

  it("should deny request when at limit", async () => {
    mockRedis.incr.mockResolvedValue(6)
    mockRedis.ttl.mockResolvedValue(100)

    const result = await checkRateLimit({
      key: "test-key",
      limit: 5,
      window: 600,
    })

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it("should return remaining as 0 when over limit (never negative)", async () => {
    mockRedis.incr.mockResolvedValue(10)
    mockRedis.ttl.mockResolvedValue(50)

    const result = await checkRateLimit({
      key: "test-key",
      limit: 5,
      window: 600,
    })

    expect(result.remaining).toBe(0)
  })

  it("should namespace keys with rate_limit: prefix", async () => {
    mockRedis.incr.mockResolvedValue(1)
    mockRedis.expire.mockResolvedValue(1)
    mockRedis.ttl.mockResolvedValue(600)

    await checkRateLimit({ key: "user:123", limit: 10, window: 300 })

    expect(mockRedis.incr).toHaveBeenCalledWith("rate_limit:user:123")
    expect(mockRedis.expire).toHaveBeenCalledWith("rate_limit:user:123", 300)
  })
})
