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
    default: (target: string) => {
      return (req: any, res: any, next: any) => {
        res.json({ proxied: true, target, path: req.path })
      }
    },
  }
})

import app from "../src/app"

describe("api-gateway", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /getway-health", () => {
    it("should return service status", async () => {
      const res = await request(app).get("/getway-health")

      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        service: "api-gateway",
        status: "running",
      })
    })
  })

  describe("GET /auth/* (proxy)", () => {
    it("should proxy /auth requests to AUTH_SERVICE_URL", async () => {
      const res = await request(app).get("/auth/login")

      expect(res.status).toBe(200)
      expect(res.body.proxied).toBe(true)
      expect(res.body.target).toBe("http://localhost:4001")
      expect(res.body.path).toBe("/login")
    })
  })

  describe("unknown routes", () => {
    it("should return 404 for unknown routes", async () => {
      const res = await request(app).get("/unknown-route")

      expect(res.status).toBe(404)
    })
  })
})
