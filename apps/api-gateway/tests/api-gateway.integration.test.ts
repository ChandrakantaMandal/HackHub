import { describe, it, expect, vi, beforeEach } from "vitest"
import request from "supertest"

const { mockHttpLogger } = vi.hoisted(() => ({
  mockHttpLogger: vi.fn((req: any, res: any, next: any) => next()),
}))

vi.mock("@workspace/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn() },
  httpLogger: mockHttpLogger,
}))

vi.mock("@workspace/config", () => ({
  env: {
    CORS_ORIGIN: "http://localhost:3000",
    AUTH_SERVICE_URL: "http://localhost:4001",
    API_GATEWAY_PORT: 4000,
    ACCESS_SECRET: "test-access-secret",
  },
}))

vi.mock("@workspace/error-handler", () => ({
  errorMiddleware: (err: any, req: any, res: any, _next: any) => {
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Internal server error" })
  },
}))

vi.mock("express-http-proxy", () => {
  return {
    default: (target: string, opts?: any) => {
      return (req: any, res: any, next: any) => {
        res.json({
          proxied: true,
          target,
          path: req.path,
          method: req.method,
          parseReqBody: opts?.parseReqBody,
        })
      }
    },
  }
})

import app from "../src/app"

describe("api-gateway", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /gateway-health", () => {
    it("should return health status", async () => {
      const res = await request(app).get("/gateway-health")

      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        service: "api-gateway",
        status: "running",
      })
    })
  })

  describe("GET /api/auth/* (proxy)", () => {
    it("should proxy /api/auth requests to AUTH_SERVICE_URL", async () => {
      const res = await request(app).get("/api/auth/login")

      expect(res.status).toBe(200)
      expect(res.body.proxied).toBe(true)
      expect(res.body.target).toBe("http://localhost:4001")
      expect(res.body.path).toBe("/login")
    })
  })

  describe("GET /api/gateway-health", () => {
    it("should return health status under the /api alias", async () => {
      const res = await request(app).get("/api/gateway-health")

      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        service: "api-gateway",
        status: "running",
      })
    })
  })

  describe("protected service proxies", () => {
    const authHeader = async () => {
      const { generateAccessToken } =
        await import("@workspace/utils/src/jwt/jwt")
      return `Bearer ${generateAccessToken("user-1", "test-access-secret", "PARTICIPANT")}`
    }

    it("should reject protected proxies without a token", async () => {
      const res = await request(app).get("/api/judges/projects/1")

      expect(res.status).toBe(401)
      expect(res.body.error).toBe("Unauthorized")
    })

    it("should proxy /api/projects to PROJECT_SERVICE_URL fallback", async () => {
      const res = await request(app)
        .get("/api/projects/teams/123")
        .set("Authorization", await authHeader())

      expect(res.status).toBe(200)
      expect(res.body.proxied).toBe(true)
      expect(res.body.target).toBe("http://localhost:5002")
      expect(res.body.path).toBe("/teams/123")
    })

    it("should proxy /api/judges to JUDGE_SERVICE_URL fallback", async () => {
      const res = await request(app)
        .get("/api/judges/projects/1")
        .set("Authorization", await authHeader())

      expect(res.status).toBe(200)
      expect(res.body.proxied).toBe(true)
      expect(res.body.target).toBe("http://localhost:5003")
      expect(res.body.path).toBe("/projects/1")
    })

    it("should proxy /api/showcase to SHOWCASE_SERVICE_URL fallback", async () => {
      const res = await request(app)
        .get("/api/showcase")
        .set("Authorization", await authHeader())

      expect(res.status).toBe(200)
      expect(res.body.proxied).toBe(true)
      expect(res.body.target).toBe("http://localhost:5004")
      expect(res.body.path).toBe("/")
    })
  })

  describe("judge route guard", () => {
    it("should proxy POST /api/judges/login without a token", async () => {
      const res = await request(app).post("/api/judges/login").send({})

      expect(res.status).toBe(200)
      expect(res.body.proxied).toBe(true)
      expect(res.body.path).toBe("/login")
      expect(res.body.method).toBe("POST")
    })

    it("should reject protected judge routes without a token", async () => {
      const res = await request(app)
        .post("/api/judges/submissions/abc/score")
        .send({})

      expect(res.status).toBe(401)
      expect(res.body.error).toBe("Unauthorized")
    })

    it("should proxy protected judge routes with a token", async () => {
      const { generateAccessToken } =
        await import("@workspace/utils/src/jwt/jwt")
      const token = `Bearer ${generateAccessToken("judge-1", "test-access-secret", "JUDGE")}`

      const res = await request(app)
        .get("/api/judges/submissions")
        .set("Authorization", token)

      expect(res.status).toBe(200)
      expect(res.body.proxied).toBe(true)
      expect(res.body.target).toBe("http://localhost:5003")
      expect(res.body.path).toBe("/submissions")
    })
  })

  describe("showcase route guard", () => {
    it("should proxy GET /api/showcase without a token (public listing)", async () => {
      const res = await request(app).get("/api/showcase")

      expect(res.status).toBe(200)
      expect(res.body.proxied).toBe(true)
      expect(res.body.target).toBe("http://localhost:5004")
      expect(res.body.path).toBe("/")
      expect(res.body.method).toBe("GET")
    })

    it("should proxy GET /api/showcase/leaderboard without a token", async () => {
      const res = await request(app).get("/api/showcase/leaderboard")

      expect(res.status).toBe(200)
      expect(res.body.proxied).toBe(true)
      expect(res.body.path).toBe("/leaderboard")
    })

    it("should reject POST /api/showcase/:id/like without a token", async () => {
      const res = await request(app).post("/api/showcase/p1/like")

      expect(res.status).toBe(401)
      expect(res.body.error).toBe("Unauthorized")
    })

    it("should reject POST /api/showcase/:id/comment without a token", async () => {
      const res = await request(app)
        .post("/api/showcase/p1/comment")
        .send({ message: "nice" })

      expect(res.status).toBe(401)
      expect(res.body.error).toBe("Unauthorized")
    })

    it("should proxy POST /api/showcase/:id/like with a token", async () => {
      const { generateAccessToken } =
        await import("@workspace/utils/src/jwt/jwt")
      const token = `Bearer ${generateAccessToken("user-1", "test-access-secret", "PARTICIPANT")}`

      const res = await request(app)
        .post("/api/showcase/p1/like")
        .set("Authorization", token)

      expect(res.status).toBe(200)
      expect(res.body.proxied).toBe(true)
      expect(res.body.target).toBe("http://localhost:5004")
      expect(res.body.path).toBe("/p1/like")
      expect(res.body.method).toBe("POST")
    })
  })

  describe("unknown routes", () => {
    it("should return 404 for unknown routes", async () => {
      const res = await request(app).get("/unknown-route")

      expect(res.status).toBe(404)
    })
  })
})
