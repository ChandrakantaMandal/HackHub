import { describe, it, expect, beforeEach, vi } from "vitest"

const { mockVerifyAccessToken } = vi.hoisted(() => ({
  mockVerifyAccessToken: vi.fn(),
}))

vi.mock("@workspace/utils", () => ({
  verifyAccessToken: mockVerifyAccessToken,
}))

vi.mock("@workspace/config", () => ({
  env: { ACCESS_SECRET: "test-secret" },
}))

import {
  authMiddleware,
  authRouteGuard,
  judgeRouteGuard,
} from "../middlewares/auth.middleware"

const mockRes = () => {
  const res: any = { statusCode: 200, body: undefined as any }
  res.status = vi.fn((code: number) => {
    res.statusCode = code
    return res
  })
  res.json = vi.fn((payload: any) => {
    res.body = payload
    return res
  })
  return res
}

const reqWith = (headers: Record<string, string>, path = "/anything") => ({
  headers: { ...headers },
  path,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe("authMiddleware", () => {
  it("returns 401 when the Authorization header is missing", () => {
    const req = reqWith({})
    const res = mockRes()
    const next = vi.fn()

    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.body).toEqual({ error: "Unauthorized" })
    expect(mockVerifyAccessToken).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it("returns 401 for a non-Bearer scheme", () => {
    const req = reqWith({ authorization: "Basic dXNlcjpwYXNz" })
    const res = mockRes()
    const next = vi.fn()

    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.body).toEqual({ error: "Unauthorized" })
    expect(mockVerifyAccessToken).not.toHaveBeenCalled()
  })

  it("returns 401 when the bearer token is empty", () => {
    const req = reqWith({ authorization: "Bearer " })
    const res = mockRes()
    const next = vi.fn()

    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.body).toEqual({ error: "Token missing" })
    expect(mockVerifyAccessToken).not.toHaveBeenCalled()
  })

  it("verifies the token and injects x-user-id / x-user-role headers", () => {
    mockVerifyAccessToken.mockReturnValue({ id: "user-1", role: "JUDGE" })
    const req: any = reqWith({ authorization: "Bearer good.token" })
    const res = mockRes()
    const next = vi.fn()

    authMiddleware(req, res, next)

    expect(mockVerifyAccessToken).toHaveBeenCalledWith(
      "good.token",
      "test-secret"
    )
    expect(req.user).toEqual({ id: "user-1", role: "JUDGE" })
    expect(req.headers["x-user-id"]).toBe("user-1")
    expect(req.headers["x-user-role"]).toBe("JUDGE")
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it("defaults x-user-role to 'user' when the payload has no role", () => {
    mockVerifyAccessToken.mockReturnValue({ id: "user-1" })
    const req: any = reqWith({ authorization: "Bearer good.token" })
    const res = mockRes()
    const next = vi.fn()

    authMiddleware(req, res, next)

    expect(req.headers["x-user-id"]).toBe("user-1")
    expect(req.headers["x-user-role"]).toBe("user")
    expect(next).toHaveBeenCalledTimes(1)
  })

  it("returns 401 when verification throws", () => {
    mockVerifyAccessToken.mockImplementation(() => {
      throw new Error("jwt malformed")
    })
    const req = reqWith({ authorization: "Bearer bad.token" })
    const res = mockRes()
    const next = vi.fn()

    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.body).toEqual({ error: "Invalid token" })
    expect(next).not.toHaveBeenCalled()
  })
})

describe("authRouteGuard", () => {
  const publicPaths = [
    "/register",
    "/login",
    "/refresh",
    "/send-otp",
    "/verify-otp",
    "/reset-password",
  ]

  it.each(publicPaths)("allows %s without a token", (path) => {
    const req = reqWith({}, path)
    const res = mockRes()
    const next = vi.fn()

    authRouteGuard(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(mockVerifyAccessToken).not.toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it("enforces the token on protected auth paths", () => {
    const req = reqWith({}, "/profile")
    const res = mockRes()
    const next = vi.fn()

    authRouteGuard(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.body).toEqual({ error: "Unauthorized" })
    expect(next).not.toHaveBeenCalled()
  })

  it("passes protected auth paths through authMiddleware on success", () => {
    mockVerifyAccessToken.mockReturnValue({
      id: "user-1",
      role: "PARTICIPANT",
    })
    const req: any = reqWith({ authorization: "Bearer good.token" }, "/logout")
    const res = mockRes()
    const next = vi.fn()

    authRouteGuard(req, res, next)

    expect(req.headers["x-user-id"]).toBe("user-1")
    expect(req.headers["x-user-role"]).toBe("PARTICIPANT")
    expect(next).toHaveBeenCalledTimes(1)
  })
})

describe("judgeRouteGuard", () => {
  it.each(["/login"])("allows %s without a token", (path) => {
    const req = reqWith({}, path)
    const res = mockRes()
    const next = vi.fn()

    judgeRouteGuard(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(mockVerifyAccessToken).not.toHaveBeenCalled()
  })

  it("enforces the token on judge submissions", () => {
    const req = reqWith({}, "/submissions")
    const res = mockRes()
    const next = vi.fn()

    judgeRouteGuard(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.body).toEqual({ error: "Unauthorized" })
    expect(next).not.toHaveBeenCalled()
  })

  it("injects identity for authenticated judge requests", () => {
    mockVerifyAccessToken.mockReturnValue({ id: "judge-1", role: "JUDGE" })
    const req: any = reqWith({ authorization: "Bearer good.token" }, "/scores")
    const res = mockRes()
    const next = vi.fn()

    judgeRouteGuard(req, res, next)

    expect(req.headers["x-user-id"]).toBe("judge-1")
    expect(req.headers["x-user-role"]).toBe("JUDGE")
    expect(next).toHaveBeenCalledTimes(1)
  })
})
