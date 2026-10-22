import express from "express"
import { httpLogger } from "@workspace/logger"
import { errorMiddleware } from "@workspace/error-handler"

import adminRouter from "../routes/admin.route"

const app = express()

app.use(httpLogger)
app.use(express.json())

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", service: "admin-service" })
})

// Mount admin routes (full path matches the gateway proxy prefix)
app.use("/api/admin", adminRouter)

// Global error handling middleware
app.use(errorMiddleware)

export default app
