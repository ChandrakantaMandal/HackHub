import express from "express"
import { httpLogger } from "@workspace/logger"

import authRouter from "../routes/auth.route"

import { errorMiddleware } from "@workspace/error-handler"

const app = express()

app.use(httpLogger)
// 5mb JSON limit so base64 avatar uploads fit (default is 100kb).
app.use(express.json({ limit: "5mb" }))

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", service: "auth-service" })
})

app.use("/", authRouter)

app.use(errorMiddleware)

export default app
