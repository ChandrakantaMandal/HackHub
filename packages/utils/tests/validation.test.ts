import { describe, it, expect } from "vitest"
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from "../src/validation/auth"

describe("Auth Validation Schemas", () => {
  describe("registerSchema", () => {
    const validRegister = {
      username: "testuser",
      email: "test@example.com",
      password: "password123",
      confirmPassword: "password123",
    }

    it("should accept valid registration data", () => {
      const result = registerSchema.safeParse(validRegister)
      expect(result.success).toBe(true)
    })

    it("should reject invalid email", () => {
      const result = registerSchema.safeParse({
        ...validRegister,
        email: "not-an-email",
      })
      expect(result.success).toBe(false)
    })

    it("should reject short username", () => {
      const result = registerSchema.safeParse({
        ...validRegister,
        username: "a",
      })
      expect(result.success).toBe(false)
    })

    it("should reject short password", () => {
      const result = registerSchema.safeParse({
        ...validRegister,
        password: "12345",
        confirmPassword: "12345",
      })
      expect(result.success).toBe(false)
    })

    it("should reject mismatched passwords", () => {
      const result = registerSchema.safeParse({
        ...validRegister,
        confirmPassword: "different",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("loginSchema", () => {
    const validLogin = {
      email: "test@example.com",
      password: "password123",
    }

    it("should accept valid login data", () => {
      const result = loginSchema.safeParse(validLogin)
      expect(result.success).toBe(true)
    })

    it("should reject invalid email", () => {
      const result = loginSchema.safeParse({
        ...validLogin,
        email: "invalid",
      })
      expect(result.success).toBe(false)
    })

    it("should reject empty password", () => {
      const result = loginSchema.safeParse({
        ...validLogin,
        password: "",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("refreshTokenSchema", () => {
    it("should accept valid refresh token with sessionId", () => {
      const result = refreshTokenSchema.safeParse({
        refreshToken: "valid.jwt.token",
        sessionId: "session-123",
      })
      expect(result.success).toBe(true)
    })

    it("should reject missing sessionId", () => {
      const result = refreshTokenSchema.safeParse({
        refreshToken: "valid.jwt.token",
      })
      expect(result.success).toBe(false)
    })

    it("should reject empty refresh token", () => {
      const result = refreshTokenSchema.safeParse({
        refreshToken: "",
        sessionId: "session-123",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("sendOtpSchema", () => {
    it("should accept valid email with purpose", () => {
      const result = sendOtpSchema.safeParse({
        email: "test@example.com",
        purpose: "register",
      })
      expect(result.success).toBe(true)
    })

    it("should reject invalid email", () => {
      const result = sendOtpSchema.safeParse({
        email: "not-email",
        purpose: "register",
      })
      expect(result.success).toBe(false)
    })

    it("should reject invalid purpose", () => {
      const result = sendOtpSchema.safeParse({
        email: "test@example.com",
        purpose: "invalid",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("verifyOtpSchema", () => {
    it("should accept valid OTP data", () => {
      const result = verifyOtpSchema.safeParse({
        email: "test@example.com",
        otp: "123456",
        purpose: "register",
      })
      expect(result.success).toBe(true)
    })

    it("should reject invalid OTP format", () => {
      const result = verifyOtpSchema.safeParse({
        email: "test@example.com",
        otp: "12345",
        purpose: "register",
      })
      expect(result.success).toBe(false)
    })

    it("should reject invalid email", () => {
      const result = verifyOtpSchema.safeParse({
        email: "invalid",
        otp: "123456",
        purpose: "register",
      })
      expect(result.success).toBe(false)
    })
  })
})
