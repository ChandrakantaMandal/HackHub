import { describe, it, expect } from "vitest"
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../src/jwt/jwt"

const SECRET = "shared-secret-for-testing"
const USER_ID = "user-123"
const ROLE = "user"

describe("JWT Utils", () => {
  describe("generateAccessToken", () => {
    it("should generate a valid access token", () => {
      const token = generateAccessToken(USER_ID, SECRET, ROLE)

      expect(token).toBeDefined()
      expect(typeof token).toBe("string")
      expect(token.split(".")).toHaveLength(3)
    })

    it("should generate token with correct payload", () => {
      const token = generateAccessToken(USER_ID, SECRET, ROLE)
      const decoded = verifyAccessToken(token, SECRET)

      expect(decoded.id).toBe(USER_ID)
      expect(decoded.role).toBe(ROLE)
      expect(decoded.type).toBe("access")
    })

    it("should generate token without role", () => {
      const token = generateAccessToken(USER_ID, SECRET)
      const decoded = verifyAccessToken(token, SECRET)

      expect(decoded.id).toBe(USER_ID)
      expect(decoded.role).toBeUndefined()
      expect(decoded.type).toBe("access")
    })
  })

  describe("generateRefreshToken", () => {
    it("should generate a valid refresh token", () => {
      const token = generateRefreshToken(USER_ID, SECRET)

      expect(token).toBeDefined()
      expect(typeof token).toBe("string")
      expect(token.split(".")).toHaveLength(3)
    })

    it("should generate token with correct payload", () => {
      const token = generateRefreshToken(USER_ID, SECRET)
      const decoded = verifyRefreshToken(token, SECRET)

      expect(decoded.id).toBe(USER_ID)
      expect(decoded.type).toBe("refresh")
    })
  })

  describe("verifyAccessToken", () => {
    it("should verify a valid access token", () => {
      const token = generateAccessToken(USER_ID, SECRET, ROLE)
      const decoded = verifyAccessToken(token, SECRET)

      expect(decoded.id).toBe(USER_ID)
      expect(decoded.type).toBe("access")
    })

    it("should throw for invalid token", () => {
      expect(() => verifyAccessToken("invalid-token", SECRET)).toThrow()
    })

    it("should throw for wrong secret", () => {
      const token = generateAccessToken(USER_ID, SECRET)
      expect(() => verifyAccessToken(token, "wrong-secret")).toThrow()
    })

    it("should throw for refresh token used as access token", () => {
      const refreshToken = generateRefreshToken(USER_ID, SECRET)
      expect(() => verifyAccessToken(refreshToken, SECRET)).toThrow(
        "Invalid token type"
      )
    })
  })

  describe("verifyRefreshToken", () => {
    it("should verify a valid refresh token", () => {
      const token = generateRefreshToken(USER_ID, SECRET)
      const decoded = verifyRefreshToken(token, SECRET)

      expect(decoded.id).toBe(USER_ID)
      expect(decoded.type).toBe("refresh")
    })

    it("should throw for invalid token", () => {
      expect(() => verifyRefreshToken("invalid-token", SECRET)).toThrow()
    })

    it("should throw for wrong secret", () => {
      const token = generateRefreshToken(USER_ID, SECRET)
      expect(() => verifyRefreshToken(token, "wrong-secret")).toThrow()
    })

    it("should throw for access token used as refresh token", () => {
      const accessToken = generateAccessToken(USER_ID, SECRET, ROLE)
      expect(() => verifyRefreshToken(accessToken, SECRET)).toThrow(
        "Invalid token type"
      )
    })
  })
})
