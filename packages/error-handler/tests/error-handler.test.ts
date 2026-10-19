import { describe, it, expect, vi, beforeEach } from "vitest"
import { AppError } from "../src/AppError"
import {
  BadRequestError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  DatabaseError,
} from "../src/errors"
import { errorMiddleware } from "../src/errorMiddleware"
import type { Request, Response, NextFunction } from "express"

describe("AppError", () => {
  it("should create error with message and status code", () => {
    const error = new AppError("Test error", 500)
    expect(error.message).toBe("Test error")
    expect(error.statusCode).toBe(500)
    expect(error.isOperational).toBe(true)
  })

  it("should create non-operational error", () => {
    const error = new AppError("System error", 500, false)
    expect(error.isOperational).toBe(false)
  })

  it("should accept details", () => {
    const error = new AppError("Validation failed", 400, true, {
      field: "email",
    })
    expect(error.details).toEqual({ field: "email" })
  })

  it("should be instance of Error", () => {
    const error = new AppError("Test", 400)
    expect(error).toBeInstanceOf(Error)
  })
})

describe("Error Classes", () => {
  it("BadRequestError should have status 400", () => {
    const error = new BadRequestError("Bad request")
    expect(error.statusCode).toBe(400)
    expect(error.isOperational).toBe(true)
  })

  it("ValidationError should have status 400", () => {
    const error = new ValidationError("Invalid input", { field: "name" })
    expect(error.statusCode).toBe(400)
    expect(error.details).toEqual({ field: "name" })
  })

  it("AuthError should have status 401", () => {
    const error = new AuthError("Unauthorized")
    expect(error.statusCode).toBe(401)
  })

  it("ForbiddenError should have status 403", () => {
    const error = new ForbiddenError("Forbidden")
    expect(error.statusCode).toBe(403)
  })

  it("NotFoundError should have status 404", () => {
    const error = new NotFoundError("Not found")
    expect(error.statusCode).toBe(404)
  })

  it("ConflictError should have status 409", () => {
    const error = new ConflictError("Conflict")
    expect(error.statusCode).toBe(409)
  })

  it("DatabaseError should have status 500", () => {
    const error = new DatabaseError("Database failure")
    expect(error.statusCode).toBe(500)
  })
})

describe("errorMiddleware", () => {
  let req: Request
  let res: Response
  let next: NextFunction

  beforeEach(() => {
    req = { originalUrl: "/test", method: "GET" } as Request
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response
    next = vi.fn()
  })

  it("should handle AppError with correct status code", () => {
    const error = new NotFoundError("User not found")
    errorMiddleware(error, req, res, next)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "User not found",
    })
  })

  it("should handle ValidationError with details", () => {
    const error = new ValidationError("Invalid input", {
      email: "Required",
    })
    errorMiddleware(error, req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid input",
      details: { email: "Required" },
    })
  })

  it("should handle non-AppError (generic Error) as 500", () => {
    const error = new Error("Something went wrong")
    errorMiddleware(error, req, res, next)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Internal server error. Please try again later.",
    })
  })

  it("should not call next()", () => {
    const error = new AppError("Test", 400)
    errorMiddleware(error, req, res, next)

    expect(next).not.toHaveBeenCalled()
  })

  it("should handle AppError with 500 status using its own message", () => {
    const error = new DatabaseError("Connection pool exhausted")
    errorMiddleware(error, req, res, next)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Connection pool exhausted",
    })
  })

  it("should omit details key when details is undefined", () => {
    const error = new AppError("No details here", 418)
    errorMiddleware(error, req, res, next)

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "No details here",
    })
    const payload = vi.mocked(res.json).mock.calls[0][0] as Record<
      string,
      unknown
    >
    expect("details" in payload).toBe(false)
  })
})

describe("AppError prototype quirk (subclasses do not reset prototype)", () => {
  it("subclass instances are NOT instanceof their own class", () => {
    const error = new ValidationError("Invalid input")
    expect(error instanceof ValidationError).toBe(false)
  })

  it("subclass instances ARE instanceof AppError", () => {
    const error = new ValidationError("Invalid input")
    expect(error).toBeInstanceOf(AppError)
    expect(error).toBeInstanceOf(Error)
  })

  it("preserves message, statusCode and details despite the prototype reset", () => {
    const error = new ValidationError("Invalid input", { email: "Required" })
    expect(error.message).toBe("Invalid input")
    expect(error.statusCode).toBe(400)
    expect(error.details).toEqual({ email: "Required" })
  })

  it("applies to every subclass", () => {
    const errors = [
      new BadRequestError("b"),
      new ValidationError("v"),
      new AuthError("a"),
      new ForbiddenError("f"),
      new NotFoundError("n"),
      new ConflictError("c"),
      new DatabaseError("d"),
    ]
    for (const error of errors) {
      expect(error).toBeInstanceOf(AppError)
      expect(error).toBeInstanceOf(Error)
      expect(error instanceof AppError).toBe(true)
    }
  })
})
