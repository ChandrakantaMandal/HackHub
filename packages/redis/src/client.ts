import Redis from "ioredis"

import { env } from "@workspace/config"
import { logger } from "@workspace/logger"

const redis = new Redis(env.REDIS_URL, {
  tls: {},
})

redis.on("error", (error) => {
  logger.error("Redis error:", error)
})

export default redis
