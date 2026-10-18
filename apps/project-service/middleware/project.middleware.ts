import { Request, Response, NextFunction } from "express"
import { ZodSchema, ZodError } from "zod"

// Validates and parses req.body against a zod schema (same pattern as auth-service).
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

// Reads x-user-id / x-user-role headers injected by the API Gateway after its
// authMiddleware verifies the JWT. This service performs NO token verification;
// the gateway is the single auth enforcement point.
// Fail-closed: missing identity headers => 401, so the service is never
// reachable with an anonymous user, even if exposed directly.
export const userContext = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.headers["x-user-id"]
  const userRole = req.headers["x-user-role"]

  if (!userId || typeof userId !== "string") {
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Missing user context",
    })
  }

  ;(req as any).user = {
    id: userId,
    role: typeof userRole === "string" ? userRole : "user",
  }

  next()
}
