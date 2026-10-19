import "@workspace/telemetry"

import app from "./app"
import { env } from "@workspace/config"
import { logger } from "@workspace/logger"

const PORT = env.JUDGE_SERVICE_PORT || 5003

const server = app.listen(PORT, () => {
  logger.info(`Judge Service running on port ${PORT}`)
})

server.on("error", (error: any) => {
  logger.error("Judge Service error", {
    error: error.message,
    stack: error.stack,
  })
})
