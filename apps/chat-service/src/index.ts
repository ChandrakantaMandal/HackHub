import "@workspace/telemetry"

import { createServer } from "node:http"
import { env } from "@workspace/config"
import { logger } from "@workspace/logger"
import app from "./app"
import { setupChatSocket } from "./socket"

const PORT = env.CHAT_SERVICE_PORT || 5005

const server = createServer(app)
setupChatSocket(server)

server.listen(PORT, () => {
  logger.info(`Chat Service running on port ${PORT}`)
})

server.on("error", (error: Error) => {
  logger.error("Chat Service error", {
    error: error.message,
    stack: error.stack,
  })
  process.exit(1)
})
