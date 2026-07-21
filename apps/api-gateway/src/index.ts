import { logger } from "@workspace/logger"
import { env } from "@workspace/config"

import app from "./app"

const server = app.listen(env.API_GATEWAY_PORT, () => {
  logger.info(`Listening at http://localhost:${env.API_GATEWAY_PORT}/api`)
})
server.on("error", (error) => {
  logger.error("Server error", {
    error: error.message,
    stack: error.stack,
  })
})
