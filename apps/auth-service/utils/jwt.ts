import jwt from "jsonwebtoken"
import { env } from "../config/env"

export function generateAccessToken(userId: string) {
  return jwt.sign(
    {
      id: userId,
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

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.ACCESS_SECRET)
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.REFRESH_SECRET)
}
