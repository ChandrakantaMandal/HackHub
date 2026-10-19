import { describe, it, expect, vi, afterEach } from "vitest"

afterEach(() => {
  vi.restoreAllMocks()
})

describe("env validation failure path", () => {
  it("logs field errors and calls process.exit(1) when a required var is invalid", async () => {
    const originalDatabaseUrl = process.env.DATABASE_URL
    process.env.DATABASE_URL = "not-a-url"

    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as unknown as typeof process.exit)
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    try {
      vi.resetModules()
      await import("../src/env")

      expect(exitSpy).toHaveBeenCalledWith(1)

      const logged = errorSpy.mock.calls
        .map((call) => call.map(String).join(" "))
        .join("\n")
      expect(logged).toContain("Environment validation failed")
      expect(logged).toContain("DATABASE_URL")
    } finally {
      if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL
      else process.env.DATABASE_URL = originalDatabaseUrl
    }
  })

  it("does not call process.exit when env is valid", async () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as unknown as typeof process.exit)

    vi.resetModules()
    const mod = await import("../src/env")

    expect(exitSpy).not.toHaveBeenCalled()
    expect(mod.env).toBeDefined()
    expect(typeof mod.env.ACCESS_SECRET).toBe("string")
  })
})
