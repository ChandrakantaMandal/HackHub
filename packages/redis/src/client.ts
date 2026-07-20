import Redis from "ioredis"

import { env } from "@workspace/config"

const redis = new Redis(env.REDIS_URL, {
  tls: {},
})

redis.on("error", (error) => {
  console.error("Redis error:", error)
})

export default redis
