import { describe, it, expect, vi } from "vitest"

const { mockLogger, instances } = vi.hoisted(() => {
  const instances: Array<{
    args: unknown[]
    handlers: Record<string, (e: Error) => void>
  }> = []

  class RedisMock {
    args: unknown[]
    handlers: Record<string, (e: Error) => void> = {}

    constructor(...args: unknown[]) {
      this.args = args
      instances.push(this)
    }

    on(event: string, cb: (e: Error) => void) {
      this.handlers[event] = cb
      return this
    }
  }

  return {
    mockLogger: { error: vi.fn(), info: vi.fn() },
    instances,
  }
})

vi.mock("ioredis", () => ({
  default: class RedisMock {
    args: unknown[]
    handlers: Record<string, (e: Error) => void> = {}
    constructor(...args: unknown[]) {
      this.args = args
      instances.push(this)
    }
    on(event: string, cb: (e: Error) => void) {
      this.handlers[event] = cb
      return this
    }
  },
}))

vi.mock("@workspace/config", () => ({
  env: { REDIS_URL: "rediss://fake:6379" },
}))

vi.mock("@workspace/logger", () => ({
  logger: mockLogger,
  httpLogger: vi.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}))

import client from "../src/client"
import { redis } from "../src/index"

describe("redis client", () => {
  it("is constructed once with REDIS_URL and TLS options", () => {
    expect(instances).toHaveLength(1)
    expect(instances[0].args).toEqual(["rediss://fake:6379", { tls: {} }])
  })

  it("is re-exported as redis from the package barrel", () => {
    expect(redis).toBe(client)
  })

  it("registers an error listener that logs via logger.error", () => {
    const instance = instances[0]
    expect(typeof instance.handlers.error).toBe("function")

    const boom = new Error("connection refused")
    expect(() => instance.handlers.error(boom)).not.toThrow()
    expect(mockLogger.error).toHaveBeenCalledWith("Redis error:", boom)
  })
})
