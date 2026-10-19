import express from "express"
import { httpLogger } from "@workspace/logger"
import { errorMiddleware } from "@workspace/error-handler"

import showcaseRouter from "../routes/showcase.route"

const app = express()

app.use(httpLogger)
app.use(express.json())

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", service: "showcase-service" })
})

// Mount showcase routes (full path matches the gateway proxy prefix)
app.use("/api/showcase", showcaseRouter)

// Global error handling middleware
app.use(errorMiddleware)

export default app
