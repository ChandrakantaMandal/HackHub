import express from "express"
import { httpLogger } from "@workspace/logger"
import { errorMiddleware } from "@workspace/error-handler"

import projectRouter from "../routes/project.route"

const app = express()

app.use(httpLogger)
app.use(express.json())

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", service: "project-service" })
})

// Mount project routes
app.use("/api/projects", projectRouter)

// Global error handling middleware
app.use(errorMiddleware)

export default app
