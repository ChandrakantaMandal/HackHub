import { Response, NextFunction } from "express"
import { verifyAccessToken } from "@workspace/utils"
import { env } from "@workspace/config"

export const verifyToken = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    })
  }

  const token = authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Token missing",
    })
  }

  try {
    const payload = verifyAccessToken(token, env.ACCESS_SECRET)
    req.user = payload
    next()
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    })
  }
}
