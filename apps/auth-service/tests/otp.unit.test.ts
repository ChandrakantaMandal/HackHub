import { describe, it, expect, beforeEach, vi } from "vitest"
import crypto from "crypto"

const { mockRedis, mockLogger } = vi.hoisted(() => ({
  mockRedis: {
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    keys: vi.fn(),
  },
  mockLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock("@workspace/redis", () => ({ redis: mockRedis }))
vi.mock("@workspace/logger", () => ({ logger: mockLogger }))

import { generateOTP, saveOTP, getOTP, verifyOTP, deleteOTP } from "../libs/otp"

const sha256 = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex")

beforeEach(() => {
  vi.clearAllMocks()
})

describe("generateOTP", () => {
  it("generates a 6-digit numeric string within range", () => {
    for (let i = 0; i < 50; i++) {
      const otp = generateOTP()
      expect(otp).toMatch(/^\d{6}$/)
      const num = Number(otp)
      expect(num).toBeGreaterThanOrEqual(100000)
      expect(num).toBeLessThan(1000000)
    }
  })
})

describe("saveOTP", () => {
  it("stores the hashed OTP with a 300s TTL and clears attempts", async () => {
    await saveOTP("user@example.com", "123456")

    expect(mockRedis.set).toHaveBeenCalledWith(
      "otp:user@example.com",
      sha256("123456"),
      "EX",
      300
    )
    expect(mockRedis.del).toHaveBeenCalledWith("otp:attempts:user@example.com")
    expect(mockLogger.info).toHaveBeenCalledWith("OTP saved")
  })

  it("honors a custom expiresIn", async () => {
    await saveOTP("user@example.com", "123456", 60)

    expect(mockRedis.set).toHaveBeenCalledWith(
      "otp:user@example.com",
      sha256("123456"),
      "EX",
      60
    )
  })
})

describe("getOTP", () => {
  it("reads the raw stored value from redis", async () => {
    mockRedis.get.mockResolvedValue("stored-hash")

    const result = await getOTP("user@example.com")

    expect(mockRedis.get).toHaveBeenCalledWith("otp:user@example.com")
    expect(result).toBe("stored-hash")
  })
})

describe("verifyOTP", () => {
  const otpKey = "otp:user@example.com"
  const attemptsKey = "otp:attempts:user@example.com"

  it("returns false when no OTP is stored", async () => {
    mockRedis.get.mockResolvedValue(null)

    const result = await verifyOTP("user@example.com", "123456")

    expect(result).toBe(false)
    expect(mockRedis.incr).not.toHaveBeenCalled()
  })

  it("returns true for a matching OTP and deletes both keys", async () => {
    mockRedis.get.mockResolvedValue(sha256("123456"))
    mockRedis.incr.mockResolvedValue(1)

    const result = await verifyOTP("user@example.com", "123456")

    expect(result).toBe(true)
    expect(mockRedis.incr).toHaveBeenCalledWith(attemptsKey)
    expect(mockRedis.expire).toHaveBeenCalledWith(attemptsKey, 300)
    expect(mockRedis.del).toHaveBeenCalledWith(otpKey)
    expect(mockRedis.del).toHaveBeenCalledWith(attemptsKey)
  })

  it("returns false for a wrong OTP without deleting the stored key", async () => {
    mockRedis.get.mockResolvedValue(sha256("123456"))
    mockRedis.incr.mockResolvedValue(1)

    const result = await verifyOTP("user@example.com", "654321")

    expect(result).toBe(false)
    expect(mockLogger.warn).toHaveBeenCalledWith("OTP mismatch")
    expect(mockRedis.del).not.toHaveBeenCalled()
  })

  it("does not reset the attempt window on the second attempt", async () => {
    mockRedis.get.mockResolvedValue(sha256("123456"))
    mockRedis.incr.mockResolvedValue(2)

    const result = await verifyOTP("user@example.com", "654321")

    expect(result).toBe(false)
    expect(mockRedis.expire).not.toHaveBeenCalled()
    expect(mockRedis.del).not.toHaveBeenCalled()
  })

  it("locks out after more than 5 attempts", async () => {
    mockRedis.get.mockResolvedValue(sha256("123456"))
    mockRedis.incr.mockResolvedValue(6)

    const result = await verifyOTP("user@example.com", "123456")

    expect(result).toBe(false)
    expect(mockRedis.del).toHaveBeenCalledWith(otpKey)
    expect(mockRedis.del).toHaveBeenCalledWith(attemptsKey)
    expect(mockLogger.warn).not.toHaveBeenCalled()
  })

  it("returns false on stored value length mismatch", async () => {
    mockRedis.get.mockResolvedValue("abcd")
    mockRedis.incr.mockResolvedValue(1)

    const result = await verifyOTP("user@example.com", "123456")

    expect(result).toBe(false)
    expect(mockLogger.error).toHaveBeenCalledWith(
      "OTP buffer length mismatch",
      expect.objectContaining({
        inputLength: 32,
        storedLength: 2,
      })
    )
    expect(mockRedis.del).not.toHaveBeenCalled()
  })
})

describe("deleteOTP", () => {
  it("deletes both the OTP and attempts keys", async () => {
    await deleteOTP("user@example.com")

    expect(mockRedis.del).toHaveBeenCalledWith("otp:user@example.com")
    expect(mockRedis.del).toHaveBeenCalledWith("otp:attempts:user@example.com")
  })
})
