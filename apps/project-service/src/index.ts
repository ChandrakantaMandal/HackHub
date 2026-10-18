// 1. MUST be the absolute first line before any other imports for OpenTelemetry tracing
import "@workspace/telemetry"

import app from "./app"
import { env } from "@workspace/config"
import { logger } from "@workspace/logger"

const PORT = env.PROJECT_SERVICE_PORT || 5002

const server = app.listen(PORT, () => {
  logger.info(`Project Service running on port ${PORT}`)
})

server.on("error", (error: any) => {
  logger.error("Project Service error", {
    error: error.message,
    stack: error.stack,
  })
})
