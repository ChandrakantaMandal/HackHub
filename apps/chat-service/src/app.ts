import express from "express"
import { httpLogger } from "@workspace/logger"
import { errorMiddleware } from "@workspace/error-handler"
import chatRouter from "../routes/chat.route"

const app = express()

app.use(httpLogger)
app.use(express.json())

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", service: "chat-service" })
})

app.use("/api/chat", chatRouter)

app.use(errorMiddleware)

export default app
