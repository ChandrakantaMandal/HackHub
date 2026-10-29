import Redis from "ioredis"

import { env } from "@workspace/config"
import { logger } from "@workspace/logger"

// TLS is only available over rediss:// (e.g. Upstash / Redis Cloud).
// A plain redis:// server (local dev, Docker) rejects TLS connections.
const redis = new Redis(env.REDIS_URL, {
  tls: env.REDIS_URL.startsWith("rediss://") ? {} : undefined,
})

redis.on("error", (error) => {
  logger.error("Redis error:", error)
})

export default redis
