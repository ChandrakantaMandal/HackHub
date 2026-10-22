import { Request, Response, NextFunction } from "express"
import { ZodSchema, ZodError } from "zod"
import prisma from "@workspace/database"

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
// x-user-id carries the authenticated *account* id (the JWT subject); all
// business logic keys off the User id, so we resolve accountId -> User here
// once, and every downstream consumer sees a consistent User id.
export const userContext = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const accountId = req.headers["x-user-id"]
  const userRole = req.headers["x-user-role"]

  if (!accountId || typeof accountId !== "string") {
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Missing user context",
    })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { accountId },
    })

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Unknown user identity",
      })
    }

    ;(req as any).user = {
      id: user.id,
      role: typeof userRole === "string" ? userRole : "user",
    }

    next()
  } catch {
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    })
  }
}

// Same identity resolution as userContext, but anonymous requests are allowed
// through with no req.user. Used for public GETs that personalize their
// response (e.g. "registered" flags) when the gateway forwarded a token.
// A present-but-unknown identity still fails closed with 401.
export const optionalUserContext = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const accountId = req.headers["x-user-id"]
  const userRole = req.headers["x-user-role"]

  if (!accountId || typeof accountId !== "string") {
    return next()
  }

  try {
    const user = await prisma.user.findUnique({
      where: { accountId },
    })

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Unknown user identity",
      })
    }

    ;(req as any).user = {
      id: user.id,
      role: typeof userRole === "string" ? userRole : "user",
    }

    next()
  } catch {
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    })
  }
}
