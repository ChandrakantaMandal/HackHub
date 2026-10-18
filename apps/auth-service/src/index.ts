import "@workspace/telemetry"

import app from "./app"
import { env } from "@workspace/config"
import { logger } from "@workspace/logger"

const server = app.listen(env.AUTH_SERVICE_PORT, () => {
  logger.info(`Auth service running on port ${env.AUTH_SERVICE_PORT}`)
})

server.on("error", (error) => {
  logger.error("Auth service error", {
    error: error.message,
    stack: error.stack,
  })
})
