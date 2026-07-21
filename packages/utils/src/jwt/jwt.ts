import jwt, { JwtPayload } from "jsonwebtoken"

interface TokenPayload extends JwtPayload {
  id: string
  role?: string
  type: "access" | "refresh"
}

export function generateAccessToken(
  userId: string,
  accessSecret: string,
  role?: string
) {
  return jwt.sign(
    {
      id: userId,
      role,
      type: "access",
    },
    accessSecret,
    {
      expiresIn: "15m",
    }
  )
}

export function generateRefreshToken(userId: string, refreshSecret: string) {
  return jwt.sign(
    {
      id: userId,
      type: "refresh",
    },
    refreshSecret,
    {
      expiresIn: "7d",
    }
  )
}

export function verifyAccessToken(token: string, accessSecret: string) {
  const decoded = jwt.verify(token, accessSecret) as TokenPayload

  if (decoded.type !== "access") {
    throw new Error("Invalid token type")
  }

  return decoded
}

export function verifyRefreshToken(token: string, refreshSecret: string) {
  const decoded = jwt.verify(token, refreshSecret) as TokenPayload

  if (decoded.type !== "refresh") {
    throw new Error("Invalid token type")
  }

  return decoded
}
