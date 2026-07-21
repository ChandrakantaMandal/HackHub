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
    next()
  } catch {
    return res.status(401).json({ error: "Invalid token" })
  }
}
