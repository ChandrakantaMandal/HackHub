import express from "express"
import { httpLogger } from "@workspace/logger"

import authRouter from "../routes/auth.route"

import { errorMiddleware } from "@workspace/error-handler"

const app = express()

app.use(httpLogger)
app.use(express.json())

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", service: "auth-service" })
})

app.use("/", authRouter)

app.use(errorMiddleware)

export default app
