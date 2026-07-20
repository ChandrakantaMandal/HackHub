import jwt, { JwtPayload } from "jsonwebtoken"
import { env } from "@workspace/config"

interface TokenPayload extends JwtPayload {
  id: string
  role?: string
  type: "access" | "refresh"
}

export function generateAccessToken(userId: string, role?: string) {
  return jwt.sign(
    {
      id: userId,
      role,
      type: "access",
    },
    env.ACCESS_SECRET,
    {
      expiresIn: "15m",
    }
  )
}

export function generateRefreshToken(userId: string) {
  return jwt.sign(
    {
      id: userId,
      type: "refresh",
    },
    env.REFRESH_SECRET,
    {
      expiresIn: "7d",
    }
  )
}

export function verifyAccessToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.ACCESS_SECRET) as TokenPayload

  if (decoded.type !== "access") {
    throw new Error("Invalid token type")
  }

  return decoded
}

export function verifyRefreshToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.REFRESH_SECRET) as TokenPayload

  if (decoded.type !== "refresh") {
    throw new Error("Invalid token type")
  }

  return decoded
}
