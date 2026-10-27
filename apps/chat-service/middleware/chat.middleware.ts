import { Request, Response, NextFunction } from "express"
import { ZodSchema, ZodError } from "zod"
import { resolveUser } from "../libs/identity"

// Validates and parses req.body against a zod schema (same pattern as project-service).
export const validate =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.parse(req.body)

      req.body = result
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          fields: error.flatten().fieldErrors,
        })
      }

      return res.status(500).json({
        success: false,
        error: "Internal server error",
      })
    }
  }

// Reads x-user-id (the JWT subject = *account* id) injected by the API Gateway
// after its authMiddleware verifies the JWT, then resolves it to the User row
// (id + role) — chat authorization keys off User.id, not Account.id.
// This service performs NO token verification on the REST path; the gateway is
// the single auth enforcement point. (Socket.io verifies the JWT itself and
// resolves the same way — see src/socket.ts.)
// Fail-closed: missing identity headers or unknown account => 401.
export const userContext = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const accountId = req.headers["x-user-id"]

    if (!accountId || typeof accountId !== "string") {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Missing user context",
      })
    }

    const user = await resolveUser(accountId)
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Unknown user",
      })
    }

    ;(req as any).user = user
    next()
  } catch (error) {
    next(error)
  }
}
