import "@workspace/telemetry"

import app from "./app"
import { env } from "@workspace/config"
import { logger } from "@workspace/logger"

const PORT = env.SHOWCASE_SERVICE_PORT || 5004

const server = app.listen(PORT, () => {
  logger.info(`Showcase Service running on port ${PORT}`)
})

server.on("error", (error: any) => {
  logger.error("Showcase Service error", {
    error: error.message,
    stack: error.stack,
  })
})
