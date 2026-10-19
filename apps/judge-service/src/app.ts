import express from "express"
import { httpLogger } from "@workspace/logger"
import { errorMiddleware } from "@workspace/error-handler"

import judgeRouter from "../routes/judge.route"

const app = express()

app.use(httpLogger)
app.use(express.json())

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", service: "judge-service" })
})

// Mount judge routes (full path matches the gateway proxy prefix)
app.use("/api/judges", judgeRouter)

// Global error handling middleware
app.use(errorMiddleware)

export default app
