import express from "express"
import cookieParser from "cookie-parser"
import helmet from "helmet"
import cors from "cors"
import { httpLogger } from "@workspace/logger"
import { errorMiddleware } from "@workspace/error-handler"
import { env } from "@workspace/config"

import judgeRouter from "../routes/judge.route"

const app = express()

app.use(
  cors({
    origin: [env.CORS_ORIGIN || "*"],
    credentials: true,
    allowedHeaders: ["Authorization", "Content-Type"],
    exposedHeaders: ["Set-Cookie"],
  })
)

app.use(httpLogger)
app.use(helmet())
app.use(express.json())
app.use(cookieParser())

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", service: "judge-service" })
})

// Mount judge routes (full path matches the gateway proxy prefix)
app.use("/api/judges", judgeRouter)

// Global error handling middleware
app.use(errorMiddleware)

export default app
