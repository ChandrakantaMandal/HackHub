import app from "./app"
import { env } from "../config/env"
import { logger } from "@workspace/logger"

const server = app.listen(env.PORT, () => {
  logger.info(`Auth service running on port ${env.PORT}`)
})

server.on("error", logger.error)
