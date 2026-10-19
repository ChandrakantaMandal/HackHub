import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import request from "supertest"

const { mockPrisma, PrismaClientKnownRequestError, fetchMock } = vi.hoisted(
  () => {
    class PrismaClientKnownRequestError extends Error {
      code: string
      constructor(message: string, code: string) {
        super(message)
        this.name = "PrismaClientKnownRequestError"
        this.code = code
      }
    }
    const prismaModel = () => ({
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    })
    return {
      mockPrisma: {
        account: prismaModel(),
        submission: prismaModel(),
        judge: prismaModel(),
        judgeScore: prismaModel(),
        achievementBadge: prismaModel(),
      },
      PrismaClientKnownRequestError,
      fetchMock: vi.fn(),
    }
  }
)

vi.mock("@workspace/config", () => ({
  env: { CORS_ORIGIN: "*", AUTH_SERVICE_URL: "http://auth:6001" },
}))

vi.mock("@workspace/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  httpLogger: vi.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}))

vi.mock("@workspace/database", () => ({
  default: mockPrisma,
  Prisma: { PrismaClientKnownRequestError },
}))

import app from "../src/app"

vi.stubGlobal("fetch", fetchMock)

const asJudge = (id = "judge-user-1") => ({
  "x-user-id": id,
  "x-user-role": "JUDGE",
})

const fetchOk = (data: unknown) =>
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ data }),
  })

const fetchHttpError = (status: number, message?: string) =>
  fetchMock.mockResolvedValue({
    ok: false,
    status,
    json: async () => (message ? { message } : {}),
  })

const validRegister = {
  username: "judge1",
  email: "judge@hackhub.dev",
  password: "secret123",
  confirmPassword: "secret123",
  judgeCode: "JUDGE01",
}

const validScores = {
  innovation: 8,
  technical: 8,
  design: 8,
  presentation: 8,
  overall: 8,
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.stubGlobal("fetch", fetchMock)
})

describe("judge-service integration", () => {
  describe("GET /health", () => {
    it("returns healthy status", async () => {
      const res = await request(app).get("/health")
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ status: "healthy", service: "judge-service" })
    })
  })

  describe("POST /api/judges/register (public)", () => {
    it("returns 400 with field errors when judgeCode is missing", async () => {
      const { judgeCode: _omit, ...withoutCode } = validRegister

      const res = await request(app)
        .post("/api/judges/register")
        .send(withoutCode)

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toBe("Validation failed")
      expect(res.body.fields.judgeCode).toBeDefined()
      expect(fetchMock).not.toHaveBeenCalled()
      expect(mockPrisma.account.findUnique).not.toHaveBeenCalled()
    })

    it("registers a judge via auth-service and ensures the Judge row", async () => {
      const authPayload = { user: { id: "u1" }, accessToken: "jwt-token" }
      fetchOk(authPayload)
      mockPrisma.account.findUnique.mockResolvedValue({
        user: { id: "u1", role: "JUDGE" },
      })
      mockPrisma.judge.upsert.mockResolvedValue({ id: "judge-1", userId: "u1" })

      const res = await request(app)
        .post("/api/judges/register")
        .send(validRegister)

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toBe("Judge registration successful")
      expect(res.body.data).toEqual(authPayload)
      expect(fetchMock).toHaveBeenCalledWith(
        "http://auth:6001/register",
        expect.objectContaining({ method: "POST" })
      )
      expect(mockPrisma.judge.upsert).toHaveBeenCalledWith({
        where: { userId: "u1" },
        update: {},
        create: { userId: "u1" },
      })
    })

    it("returns 403 when the account was not promoted to JUDGE", async () => {
      fetchOk({ user: { id: "u1" } })
      mockPrisma.account.findUnique.mockResolvedValue({
        user: { id: "u1", role: "user" },
      })

      const res = await request(app)
        .post("/api/judges/register")
        .send(validRegister)

      expect(res.status).toBe(403)
      expect(res.body).toEqual({
        success: false,
        message: "Judge code is invalid",
      })
      expect(mockPrisma.judge.upsert).not.toHaveBeenCalled()
    })

    it("passes the auth-service conflict message through as 409", async () => {
      fetchHttpError(409, "Username already taken")

      const res = await request(app)
        .post("/api/judges/register")
        .send(validRegister)

      expect(res.status).toBe(409)
      expect(res.body).toEqual({
        success: false,
        message: "Username already taken",
      })
      expect(mockPrisma.account.findUnique).not.toHaveBeenCalled()
    })

    it("returns 502 when the auth-service is unreachable", async () => {
      fetchMock.mockRejectedValue(new Error("ECONNREFUSED"))

      const res = await request(app)
        .post("/api/judges/register")
        .send(validRegister)

      expect(res.status).toBe(502)
      expect(res.body).toEqual({
        success: false,
        message: "Auth service unavailable",
      })
    })
  })

  describe("POST /api/judges/login (public)", () => {
    it("logs in a judge and ensures the Judge row", async () => {
      const authPayload = { user: { id: "u1" }, accessToken: "jwt-token" }
      fetchOk(authPayload)
      mockPrisma.account.findUnique.mockResolvedValue({
        user: { id: "u1", role: "JUDGE" },
      })
      mockPrisma.judge.upsert.mockResolvedValue({ id: "judge-1", userId: "u1" })

      const res = await request(app)
        .post("/api/judges/login")
        .send({ email: "judge@hackhub.dev", password: "secret123" })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toBe("Login successful")
      expect(res.body.data).toEqual(authPayload)
      expect(mockPrisma.judge.upsert).toHaveBeenCalledTimes(1)
    })

    it("returns 403 for a non-judge account", async () => {
      fetchOk({ user: { id: "u1" } })
      mockPrisma.account.findUnique.mockResolvedValue({
        user: { id: "u1", role: "user" },
      })

      const res = await request(app)
        .post("/api/judges/login")
        .send({ email: "user@hackhub.dev", password: "secret123" })

      expect(res.status).toBe(403)
      expect(res.body).toEqual({
        success: false,
        message: "Judge account required",
      })
      expect(mockPrisma.judge.upsert).not.toHaveBeenCalled()
    })
  })

  describe("identity gates", () => {
    it("rejects requests without x-user-id with 401", async () => {
      const res = await request(app).get("/api/judges/submissions")

      expect(res.status).toBe(401)
      expect(res.body).toEqual({
        success: false,
        error: "Unauthorized: Missing user context",
      })
      expect(mockPrisma.submission.findMany).not.toHaveBeenCalled()
    })

    it("rejects non-JUDGE roles with 403", async () => {
      const res = await request(app)
        .get("/api/judges/submissions")
        .set({ "x-user-id": "u1", "x-user-role": "user" })

      expect(res.status).toBe(403)
      expect(res.body).toEqual({
        success: false,
        error: "Forbidden: Judge role required",
      })
      expect(mockPrisma.submission.findMany).not.toHaveBeenCalled()
    })

    it("accepts the JUDGE role injected by the gateway", async () => {
      mockPrisma.submission.findMany.mockResolvedValue([])

      const res = await request(app)
        .get("/api/judges/submissions")
        .set(asJudge())

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ success: true, data: [] })
      expect(mockPrisma.submission.findMany).toHaveBeenCalledTimes(1)
    })
  })

  describe("POST /api/judges/submissions/:id/score", () => {
    it("returns 400 with field errors on an invalid body", async () => {
      const res = await request(app)
        .post("/api/judges/submissions/sub-1/score")
        .set(asJudge())
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toBe("Validation failed")
      expect(res.body.fields.innovation).toBeDefined()
      expect(mockPrisma.submission.findUnique).not.toHaveBeenCalled()
    })

    it("returns 404 when the submission does not exist", async () => {
      mockPrisma.submission.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .post("/api/judges/submissions/sub-404/score")
        .set(asJudge())
        .send(validScores)

      expect(res.status).toBe(404)
      expect(res.body).toEqual({
        success: false,
        message: "Submission not found",
      })
      expect(mockPrisma.judgeScore.upsert).not.toHaveBeenCalled()
    })

    it("upserts the score with the computed weighted finalScore", async () => {
      mockPrisma.submission.findUnique.mockResolvedValue({ id: "sub-1" })
      mockPrisma.judge.upsert.mockResolvedValue({
        id: "judge-1",
        userId: "judge-user-1",
      })
      mockPrisma.judgeScore.upsert.mockResolvedValue({
        id: "score-1",
        submissionId: "sub-1",
        judgeId: "judge-1",
        finalScore: 80,
      })

      const res = await request(app)
        .post("/api/judges/submissions/sub-1/score")
        .set(asJudge())
        .send({ ...validScores, feedback: "Solid work" })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toBe("Score submitted successfully")
      expect(mockPrisma.judgeScore.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            submissionId_judgeId: { submissionId: "sub-1", judgeId: "judge-1" },
          },
          update: expect.objectContaining({
            finalScore: 80,
            feedback: "Solid work",
          }),
          create: expect.objectContaining({
            submissionId: "sub-1",
            judgeId: "judge-1",
            finalScore: 80,
          }),
        })
      )
    })
  })

  describe("POST /api/judges/submissions/:id/badge", () => {
    it("returns 400 with field errors when name is missing", async () => {
      const res = await request(app)
        .post("/api/judges/submissions/sub-1/badge")
        .set(asJudge())
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.error).toBe("Validation failed")
      expect(res.body.fields.name).toBeDefined()
      expect(mockPrisma.achievementBadge.create).not.toHaveBeenCalled()
    })

    it("returns 404 when the submission does not exist", async () => {
      mockPrisma.submission.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .post("/api/judges/submissions/sub-404/badge")
        .set(asJudge())
        .send({ name: "Best UI" })

      expect(res.status).toBe(404)
      expect(res.body).toEqual({
        success: false,
        message: "Submission not found",
      })
      expect(mockPrisma.achievementBadge.create).not.toHaveBeenCalled()
    })

    it("awards a badge attributed to the awarding judge", async () => {
      mockPrisma.submission.findUnique.mockResolvedValue({ id: "sub-1" })
      mockPrisma.achievementBadge.create.mockResolvedValue({
        id: "badge-1",
        submissionId: "sub-1",
        awardedById: "judge-user-1",
        name: "Best UI",
        description: null,
      })

      const res = await request(app)
        .post("/api/judges/submissions/sub-1/badge")
        .set(asJudge())
        .send({ name: "Best UI" })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toBe("Badge awarded successfully")
      expect(mockPrisma.achievementBadge.create).toHaveBeenCalledWith({
        data: {
          submissionId: "sub-1",
          awardedById: "judge-user-1",
          name: "Best UI",
          description: null,
        },
      })
    })

    it("returns 409 on a duplicate badge (P2002)", async () => {
      mockPrisma.submission.findUnique.mockResolvedValue({ id: "sub-1" })
      mockPrisma.achievementBadge.create.mockRejectedValue(
        new PrismaClientKnownRequestError("Unique constraint failed", "P2002")
      )

      const res = await request(app)
        .post("/api/judges/submissions/sub-1/badge")
        .set(asJudge())
        .send({ name: "Best UI" })

      expect(res.status).toBe(409)
      expect(res.body).toEqual({
        success: false,
        message: "Badge already awarded for this submission",
      })
    })
  })

  describe("DELETE /api/judges/submissions/:id/badge/:badgeId", () => {
    it("returns 404 when the badge does not exist", async () => {
      mockPrisma.achievementBadge.findFirst.mockResolvedValue(null)

      const res = await request(app)
        .delete("/api/judges/submissions/sub-1/badge/badge-404")
        .set(asJudge())

      expect(res.status).toBe(404)
      expect(res.body).toEqual({ success: false, message: "Badge not found" })
      expect(mockPrisma.achievementBadge.delete).not.toHaveBeenCalled()
    })

    it("returns 403 when a different judge tries to revoke", async () => {
      mockPrisma.achievementBadge.findFirst.mockResolvedValue({
        id: "badge-1",
        submissionId: "sub-1",
        awardedById: "other-judge",
      })

      const res = await request(app)
        .delete("/api/judges/submissions/sub-1/badge/badge-1")
        .set(asJudge())

      expect(res.status).toBe(403)
      expect(res.body).toEqual({
        success: false,
        message: "Only the awarding judge can revoke this badge",
      })
      expect(mockPrisma.achievementBadge.delete).not.toHaveBeenCalled()
    })

    it("revokes a badge awarded by this judge", async () => {
      mockPrisma.achievementBadge.findFirst.mockResolvedValue({
        id: "badge-1",
        submissionId: "sub-1",
        awardedById: "judge-user-1",
      })
      mockPrisma.achievementBadge.delete.mockResolvedValue({ id: "badge-1" })

      const res = await request(app)
        .delete("/api/judges/submissions/sub-1/badge/badge-1")
        .set(asJudge())

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toEqual({ id: "badge-1" })
      expect(mockPrisma.achievementBadge.delete).toHaveBeenCalledWith({
        where: { id: "badge-1" },
      })
    })
  })

  describe("GET /api/judges/leaderboard", () => {
    it("groups scores per project, averages, and ranks descending", async () => {
      mockPrisma.judgeScore.findMany.mockResolvedValue([
        {
          finalScore: 90,
          submission: { project: { id: "p1", title: "Alpha" } },
        },
        {
          finalScore: 70,
          submission: { project: { id: "p1", title: "Alpha" } },
        },
        {
          finalScore: 50,
          submission: { project: { id: "p2", title: "Beta" } },
        },
      ])

      const res = await request(app)
        .get("/api/judges/leaderboard")
        .set(asJudge())

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(2)
      expect(res.body.data[0]).toEqual({
        rank: 1,
        projectId: "p1",
        title: "Alpha",
        averageScore: 80,
        scoreCount: 2,
      })
      expect(res.body.data[1]).toEqual({
        rank: 2,
        projectId: "p2",
        title: "Beta",
        averageScore: 50,
        scoreCount: 1,
      })
    })
  })
})
