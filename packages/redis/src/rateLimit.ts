import redis from "./client"

interface RateLimitOptions {
  key: string
  limit: number
  window: number
}

export async function checkRateLimit(options: RateLimitOptions) {
  const { key, limit, window } = options

  const current = await redis.incr(key)

  if (current === 1) {
    await redis.expire(key, window)
  }

  return {
    allowed: current <= limit,
    remaining: Math.max(limit - current, 0),
  }
}
