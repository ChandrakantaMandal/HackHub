import { describe, it, expect, vi, beforeEach } from "vitest"

describe("Config", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db"
    process.env.AUTH_SERVICE_PORT = "4000"
    process.env.API_GATEWAY_PORT = "3000"
    process.env.REDIS_URL = "redis://localhost:6379"
    process.env.ACCESS_SECRET = "access-secret"
    process.env.REFRESH_SECRET = "refresh-secret"
    process.env.GMAIL_USER = "test@gmail.com"
    process.env.GMAIL_APP_PASSWORD = "app-password"
  })

  it("should export env with all required fields when valid", async () => {
    const { env } = await import("../src/env.js")

    expect(env.DATABASE_URL).toBe("postgresql://user:pass@localhost:5432/db")
    expect(env.AUTH_SERVICE_PORT).toBe(4000)
    expect(env.API_GATEWAY_PORT).toBe(3000)
    expect(env.REDIS_URL).toBe("redis://localhost:6379")
    expect(env.ACCESS_SECRET).toBe("access-secret")
    expect(env.REFRESH_SECRET).toBe("refresh-secret")
  })

  it("should coerce port numbers to numbers", async () => {
    const { env } = await import("../src/env.js")

    expect(typeof env.AUTH_SERVICE_PORT).toBe("number")
    expect(typeof env.API_GATEWAY_PORT).toBe("number")
  })

  it("should have default values", async () => {
    const { env } = await import("../src/env.js")

    expect(env.NODE_ENV).toBeDefined()
    expect(env.AUTH_SERVICE_URL).toBeDefined()
    expect(env.CORS_ORIGIN).toBeDefined()
  })
})
