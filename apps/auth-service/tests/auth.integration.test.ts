import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"
import request from "supertest"

// vi.hoisted() guarantees these exist when vi.mock factories run
const {
  mockPrisma,
  mockRedis,
  mockCheckRateLimit,
  mockSendOtpEmail,
  mockBcryptHash,
  mockBcryptCompare,
} = vi.hoisted(() => ({
  mockPrisma: {
    account: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    refreshToken: {
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    oTP: {
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
  },
  mockRedis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    keys: vi.fn().mockResolvedValue([]),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn(),
  },
  mockCheckRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  mockSendOtpEmail: vi.fn().mockResolvedValue(undefined),
  mockBcryptHash: vi.fn().mockResolvedValue("hashed-password"),
  mockBcryptCompare: vi.fn(),
}))

// Mock all external dependencies BEFORE importing app
vi.mock("@workspace/config", () => ({
  env: {
    ACCESS_SECRET: "test-access-secret",
    REFRESH_SECRET: "test-refresh-secret",
    AUTH_SERVICE_PORT: 4000,
    API_GATEWAY_PORT: 3000,
    DATABASE_URL: "postgresql://test:pass@localhost:5432/test",
    REDIS_URL: "redis://localhost:6379",
    GMAIL_USER: "test@gmail.com",
    GMAIL_APP_PASSWORD: "app-password",
    JUDGE_CODES: "JUDGE-2026",
  },
}))

vi.mock("@workspace/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  httpLogger: vi.fn((req: any, res: any, next: any) => next()),
}))

vi.mock("@workspace/database", () => {
  class PrismaClientKnownRequestError extends Error {}
  return {
    default: mockPrisma,
    PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
    Prisma: { PrismaClientKnownRequestError },
  }
})

vi.mock("@workspace/redis", () => ({
  redis: mockRedis,
  checkRateLimit: mockCheckRateLimit,
}))

vi.mock("../src/libs/email", () => ({
  sendOtpEmail: mockSendOtpEmail,
}))

vi.mock("bcrypt", () => ({
  default: {
    hash: mockBcryptHash,
    compare: mockBcryptCompare,
  },
}))

vi.mock("@workspace/utils", async (importOriginal) => {
  const original = await importOriginal<any>()
  const { AuthError } = await import("@workspace/error-handler")
  return {
    ...original,
    verifyRefreshToken: vi.fn().mockImplementation(() => {
      throw new AuthError("Invalid refresh token")
    }),
  }
})

// Now import the app
import app from "../src/app"

const prisma = mockPrisma

describe("Auth Service Integration", () => {
  beforeAll(() => {
    process.env.ACCESS_SECRET = "test-access-secret"
    process.env.REFRESH_SECRET = "test-refresh-secret"
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("POST /register", () => {
    it("should register a new user successfully", async () => {
      prisma.account.findUnique.mockResolvedValue(null)
      prisma.account.create.mockResolvedValue({
        id: "account-1",
        email: "test@example.com",
        isVerified: false,
        user: { id: "user-1", username: "testuser" },
      })

      const res = await request(app).post("/register").send({
        email: "test@example.com",
        password: "password123",
        username: "testuser",
        confirmPassword: "password123",
      })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.email).toBe("test@example.com")
      expect(res.body.data.message).toContain("OTP")
    })

    it("should reject duplicate email", async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: "existing",
        email: "test@example.com",
      })

      const res = await request(app).post("/register").send({
        email: "test@example.com",
        password: "password123",
        username: "testuser",
        confirmPassword: "password123",
      })

      expect(res.status).toBe(409)
      expect(res.body.success).toBe(false)
    })

    it("should reject invalid email format", async () => {
      const res = await request(app).post("/register").send({
        email: "not-email",
        password: "password123",
        username: "testuser",
        confirmPassword: "password123",
      })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })

    it("should reject short password", async () => {
      const res = await request(app).post("/register").send({
        email: "test@example.com",
        password: "12345",
        username: "testuser",
        confirmPassword: "12345",
      })

      expect(res.status).toBe(400)
    })

    it("should register a judge with a valid judge code", async () => {
      prisma.account.findUnique.mockResolvedValue(null)
      prisma.user.findUnique.mockResolvedValue(null)
      prisma.account.create.mockResolvedValue({
        id: "account-judge",
        email: "judge@example.com",
        isVerified: false,
        user: { id: "user-judge", username: "judgeuser", role: "JUDGE" },
      })

      const res = await request(app).post("/register").send({
        email: "judge@example.com",
        password: "password123",
        username: "judgeuser",
        confirmPassword: "password123",
        judgeCode: "judge-2026",
      })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)

      const createArgs = prisma.account.create.mock.calls[0][0]
      expect(createArgs.data.user.create.role).toBe("JUDGE")
      expect(createArgs.data.user.create.judge).toEqual({ create: {} })
    })

    it("should reject registration with an invalid judge code", async () => {
      prisma.account.findUnique.mockResolvedValue(null)

      const res = await request(app).post("/register").send({
        email: "judge@example.com",
        password: "password123",
        username: "judgeuser",
        confirmPassword: "password123",
        judgeCode: "WRONG-CODE",
      })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toBe("Invalid judge code")
      expect(prisma.account.create).not.toHaveBeenCalled()
    })
  })

  describe("POST /login", () => {
    it("should login successfully with valid credentials", async () => {
      const account = {
        id: "account-1",
        email: "test@example.com",
        passwordHash: "hashed-password",
        isVerified: true,
        user: { id: "user-1", username: "testuser", role: "user" },
      }
      prisma.account.findUnique.mockResolvedValue(account)
      mockBcryptCompare.mockResolvedValue(true)

      const res = await request(app).post("/login").send({
        email: "test@example.com",
        password: "password123",
      })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty("accessToken")
      expect(res.body.data).toHaveProperty("refreshToken")
      expect(res.body.data).toHaveProperty("sessionId")
    })

    it("should reject non-existent user", async () => {
      prisma.account.findUnique.mockResolvedValue(null)

      const res = await request(app).post("/login").send({
        email: "nonexistent@example.com",
        password: "password123",
      })

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })

    it("should reject wrong password", async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: "account-1",
        email: "test@example.com",
        passwordHash: "hashed-password",
        isVerified: true,
      })
      mockBcryptCompare.mockResolvedValue(false)

      const res = await request(app).post("/login").send({
        email: "test@example.com",
        password: "wrongpassword",
      })

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })

    it("should reject unverified account", async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: "account-1",
        email: "test@example.com",
        passwordHash: "hashed-password",
        isVerified: false,
      })
      mockBcryptCompare.mockResolvedValue(true)

      const res = await request(app).post("/login").send({
        email: "test@example.com",
        password: "password123",
      })

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })
  })

  describe("POST /refresh", () => {
    it("should reject invalid refresh token", async () => {
      const res = await request(app).post("/refresh").send({
        refreshToken: "invalid-token",
        sessionId: "session-1",
      })

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })

    it("should reject missing sessionId", async () => {
      const res = await request(app).post("/refresh").send({
        refreshToken: "valid-token",
      })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })
  })

  describe("POST /logout", () => {
    it("should logout successfully with valid token", async () => {
      const { generateAccessToken } =
        await import("@workspace/utils/src/jwt/jwt")
      const token = generateAccessToken("user-1", "test-access-secret", "user")

      const res = await request(app)
        .post("/logout")
        .set("Authorization", `Bearer ${token}`)
        .send({ sessionId: "session-1" })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toBe("Logged out successfully")
    })

    it("should reject logout without token", async () => {
      const res = await request(app)
        .post("/logout")
        .send({ sessionId: "session-1" })

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })

    it("should reject logout without sessionId", async () => {
      const { generateAccessToken } =
        await import("@workspace/utils/src/jwt/jwt")
      const token = generateAccessToken("user-1", "test-access-secret", "user")

      const res = await request(app)
        .post("/logout")
        .set("Authorization", `Bearer ${token}`)
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })
  })

  describe("GET /profile", () => {
    it("should return profile with valid token", async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: "account-1",
        email: "test@example.com",
        user: { id: "user-1", username: "testuser", role: "user" },
      })

      const { generateAccessToken } =
        await import("@workspace/utils/src/jwt/jwt")
      const token = generateAccessToken("user-1", "test-access-secret", "user")

      const res = await request(app)
        .get("/profile")
        .set("Authorization", `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty("id")
      expect(res.body.data).toHaveProperty("email")
    })

    it("should reject profile without token", async () => {
      const res = await request(app).get("/profile")

      expect(res.status).toBe(401)
    })

    it("should reject profile with invalid token", async () => {
      const res = await request(app)
        .get("/profile")
        .set("Authorization", "Bearer invalid-token")

      expect(res.status).toBe(401)
    })
  })
})
