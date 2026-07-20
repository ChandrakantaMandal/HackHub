import { redis } from "@workspace/redis"

export async function saveRefreshToken(
  userId: string,
  sessionId: string,
  token: string,
  expiresIn = 60 * 60 * 24 * 7
) {
  await redis.set(`refresh:${userId}:${sessionId}`, token, "EX", expiresIn)
}

export async function getRefreshToken(userId: string, sessionId: string) {
  return await redis.get(`refresh:${userId}:${sessionId}`)
}

export async function deleteRefreshToken(userId: string, sessionId: string) {
  await redis.del(`refresh:${userId}:${sessionId}`)
}

export async function deleteAllRefreshTokens(userId: string) {
  const keys = await redis.keys(`refresh:${userId}:*`)

  if (keys.length) {
    await redis.del(...keys)
  }
}
