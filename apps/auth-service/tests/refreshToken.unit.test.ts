import { describe, it, expect, beforeEach, vi } from "vitest"

const { mockRedis } = vi.hoisted(() => ({
  mockRedis: {
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
  },
}))

vi.mock("@workspace/redis", () => ({ redis: mockRedis }))

import {
  saveRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
  deleteAllRefreshTokens,
} from "../libs/refreshToken"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("saveRefreshToken", () => {
  it("stores the token with a 7-day default TTL", async () => {
    await saveRefreshToken("user-1", "session-1", "token-value")

    expect(mockRedis.set).toHaveBeenCalledWith(
      "refresh:user-1:session-1",
      "token-value",
      "EX",
      60 * 60 * 24 * 7
    )
  })

  it("honors a custom expiresIn", async () => {
    await saveRefreshToken("user-1", "session-1", "token-value", 3600)

    expect(mockRedis.set).toHaveBeenCalledWith(
      "refresh:user-1:session-1",
      "token-value",
      "EX",
      3600
    )
  })
})

describe("getRefreshToken", () => {
  it("reads the token by user and session", async () => {
    mockRedis.get.mockResolvedValue("token-value")

    const result = await getRefreshToken("user-1", "session-1")

    expect(mockRedis.get).toHaveBeenCalledWith("refresh:user-1:session-1")
    expect(result).toBe("token-value")
  })
})

describe("deleteRefreshToken", () => {
  it("deletes the specific session key", async () => {
    await deleteRefreshToken("user-1", "session-1")

    expect(mockRedis.del).toHaveBeenCalledWith("refresh:user-1:session-1")
  })
})

describe("deleteAllRefreshTokens", () => {
  it("deletes every session key for the user", async () => {
    mockRedis.keys.mockResolvedValue([
      "refresh:user-1:session-1",
      "refresh:user-1:session-2",
    ])

    await deleteAllRefreshTokens("user-1")

    expect(mockRedis.keys).toHaveBeenCalledWith("refresh:user-1:*")
    expect(mockRedis.del).toHaveBeenCalledWith(
      "refresh:user-1:session-1",
      "refresh:user-1:session-2"
    )
  })

  it("does not call del when no keys exist", async () => {
    mockRedis.keys.mockResolvedValue([])

    await deleteAllRefreshTokens("user-1")

    expect(mockRedis.keys).toHaveBeenCalledWith("refresh:user-1:*")
    expect(mockRedis.del).not.toHaveBeenCalled()
  })
})
