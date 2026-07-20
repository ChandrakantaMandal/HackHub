import morgan from "morgan"
import { logger } from "./index"

export const httpLogger = morgan("combined", {
  stream: {
    write: (message: string) => {
      logger.info(message.trim())
    },
  },
})
