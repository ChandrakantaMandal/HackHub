import { describe, it, expect, vi } from "vitest"
import { z } from "zod"
import { validate } from "../middleware/auth.middleware"

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

const schema = z.object({
  name: z.string().min(2),
  age: z.number().int(),
})

describe("validate middleware", () => {
  it("calls next and replaces req.body with the parsed result", () => {
    const middleware = validate(schema)
    const req: any = { body: { name: "Alice", age: 30, extra: "stripped" } }
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.body).toEqual({ name: "Alice", age: 30 })
    expect(req.body.extra).toBeUndefined()
    expect(res.status).not.toHaveBeenCalled()
  })

  it("returns 400 with field errors on ZodError", () => {
    const middleware = validate(schema)
    const req: any = { body: { name: "A", age: "nope" } }
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.body.success).toBe(false)
    expect(res.body.error).toBe("Validation failed")
    expect(res.body.fields.name).toBeDefined()
    expect(res.body.fields.age).toBeDefined()
  })

  it("returns 500 when parse throws a non-Zod error", () => {
    const brokenSchema: any = {
      parse: () => {
        throw new Error("boom")
      },
    }
    const middleware = validate(brokenSchema)
    const req: any = { body: {} }
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.body).toEqual({
      success: false,
      error: "Internal server error",
    })
  })
})
