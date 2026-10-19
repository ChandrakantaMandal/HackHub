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

import { verifyToken } from "../middleware/verifyToken"

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

const reqWith = (headers: Record<string, string>) => ({ headers })

beforeEach(() => {
  vi.clearAllMocks()
})

describe("verifyToken middleware", () => {
  it("returns 401 when the Authorization header is missing", () => {
    const req = reqWith({})
    const res = mockRes()
    const next = vi.fn()

    verifyToken(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.body).toEqual({ success: false, message: "Unauthorized" })
    expect(mockVerifyAccessToken).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it("returns 401 for a non-Bearer scheme", () => {
    const req = reqWith({ authorization: "Basic dXNlcjpwYXNz" })
    const res = mockRes()
    const next = vi.fn()

    verifyToken(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.body).toEqual({ success: false, message: "Unauthorized" })
    expect(mockVerifyAccessToken).not.toHaveBeenCalled()
  })

  it("returns 401 when the bearer token is empty", () => {
    const req = reqWith({ authorization: "Bearer " })
    const res = mockRes()
    const next = vi.fn()

    verifyToken(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.body).toEqual({ success: false, message: "Token missing" })
    expect(mockVerifyAccessToken).not.toHaveBeenCalled()
  })

  it("verifies the token with ACCESS_SECRET and sets req.user", () => {
    const payload = { id: "user-1", role: "PARTICIPANT" }
    mockVerifyAccessToken.mockReturnValue(payload)
    const req: any = reqWith({ authorization: "Bearer valid.token" })
    const res = mockRes()
    const next = vi.fn()

    verifyToken(req, res, next)

    expect(mockVerifyAccessToken).toHaveBeenCalledWith(
      "valid.token",
      "test-secret"
    )
    expect(req.user).toEqual(payload)
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it("returns 401 when verification throws", () => {
    mockVerifyAccessToken.mockImplementation(() => {
      throw new Error("jwt malformed")
    })
    const req = reqWith({ authorization: "Bearer bad.token" })
    const res = mockRes()
    const next = vi.fn()

    verifyToken(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.body).toEqual({
      success: false,
      message: "Invalid or expired token",
    })
    expect(next).not.toHaveBeenCalled()
  })
})
