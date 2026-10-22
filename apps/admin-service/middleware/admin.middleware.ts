import { Request, Response, NextFunction } from "express"
import { ZodSchema, ZodError } from "zod"

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

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const role = (req as any).user?.role

  if (role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      error: "Forbidden: Admin role required",
    })
  }

  next()
}
