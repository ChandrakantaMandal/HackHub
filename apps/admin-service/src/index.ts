import "@workspace/telemetry"

import app from "./app"
import { env } from "@workspace/config"
import { logger } from "@workspace/logger"

const PORT = env.ADMIN_SERVICE_PORT || 5006

const server = app.listen(PORT, () => {
  logger.info(`Admin Service running on port ${PORT}`)
})

server.on("error", (error: any) => {
  logger.error("Admin Service error", {
    error: error.message,
    stack: error.stack,
  })
})
