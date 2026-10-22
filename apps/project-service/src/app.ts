import express from "express"
import { httpLogger } from "@workspace/logger"
import { errorMiddleware } from "@workspace/error-handler"

import projectRouter from "../routes/project.route"
import hackathonRouter from "../routes/hackathon.route"

const app = express()

app.use(httpLogger)
app.use(express.json())

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", service: "project-service" })
})

// Mount project routes
app.use("/api/projects", projectRouter)

// Mount hackathon routes (registration / join codes)
app.use("/api/hackathons", hackathonRouter)

// Global error handling middleware
app.use(errorMiddleware)

export default app
