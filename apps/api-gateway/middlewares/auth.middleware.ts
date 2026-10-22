import { Request, Response, NextFunction } from "express"
import { verifyAccessToken } from "@workspace/utils"
import { env } from "@workspace/config"

export interface AuthRequest extends Request {
  user?: any
}

export const authMiddleware = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const token = authHeader.split(" ")[1]
  if (!token) {
    return res.status(401).json({ error: "Token missing" })
  }

  try {
    const payload = verifyAccessToken(token, env.ACCESS_SECRET)
    req.user = payload

    // Inject user identity into headers so downstream services read them directly
    req.headers["x-user-id"] = payload.id
    req.headers["x-user-role"] = payload.role || "user"

    next()
  } catch {
    return res.status(401).json({ error: "Invalid token" })
  }
}

// Paths under the /api/auth mount that stay public.
// Express strips the mount path, so req.path here is e.g. "/register".
const publicAuthPaths = new Set([
  "/register",
  "/login",
  "/refresh",
  "/send-otp",
  "/verify-otp",
  "/reset-password",
])

// Everything else under /api/auth (e.g. /logout, /profile) requires a valid token.
export const authRouteGuard = (req: any, res: Response, next: NextFunction) => {
  if (publicAuthPaths.has(req.path)) {
    return next()
  }
  return authMiddleware(req, res, next)
}

const publicJudgePaths = new Set(["/login"])

export const judgeRouteGuard = (
  req: any,
  res: Response,
  next: NextFunction
) => {
  if (publicJudgePaths.has(req.path)) {
    return next()
  }
  return authMiddleware(req, res, next)
}

// Showcase: all GETs are public (list/detail/comments/leaderboard/stats);
// mutations (POST like/comment) require a valid token.
export const showcaseRouteGuard = (
  req: any,
  res: Response,
  next: NextFunction
) => {
  if (req.method === "GET") {
    return next()
  }
  return authMiddleware(req, res, next)
}

// Hackathons: GETs are public (list, mine) — but if the client sent a token
// we still verify it so the downstream service can personalize the response
// (registered flags) with a trusted identity. Invalid tokens on GET are
// rejected. Every mutation (register/join) requires a valid token.
export const hackathonRouteGuard = (
  req: any,
  res: Response,
  next: NextFunction
) => {
  if (req.method === "GET") {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authMiddleware(req, res, next)
    }
    return next()
  }
  return authMiddleware(req, res, next)
}
