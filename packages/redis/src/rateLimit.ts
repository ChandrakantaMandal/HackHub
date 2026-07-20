import redis from "./client"
interface RateLimitOptions {
  key: string
  limit: number
  window: number
}

export async function checkRateLimit({ key, limit, window }: RateLimitOptions) {
  const namespacedKey = `rate_limit:${key}`

  const current = await redis.incr(namespacedKey)

  if (current === 1) {
    await redis.expire(namespacedKey, window)
  }

  const ttl = await redis.ttl(namespacedKey)

  const allowed = current <= limit

  return {
    allowed,
    remaining: Math.max(limit - current, 0),
    reset: ttl,
  }
}
