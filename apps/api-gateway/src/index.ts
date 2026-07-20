import express from "express"
import cors from "cors"
import helmet from "helmet"
import { rateLimit, ipKeyGenerator } from "express-rate-limit"
import cookieParser from "cookie-parser"
import proxy from "express-http-proxy"
import { Request, Response } from "express"

import { logger, httpLogger } from "@workspace/logger"
import { errorMiddleware } from "@workspace/error-handler"
import { env } from "@workspace/config"

const app = express()

app.use(
  cors({
    origin: [env.CORS_ORIGIN],
    allowedHeaders: ["Authorization", "Content-Type"],
  })
)
app.use(httpLogger)
app.use(express.json({ limit: "100mb" }))
app.use(express.urlencoded({ limit: "100mb", extended: true }))
app.use(cookieParser())
app.use(helmet())
app.set("trust proxy", 1)

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: (req) => (req.user ? 1000 : 100),
  message: { error: "Too many requests,please try again later!" },
  legacyHeaders: true,
  standardHeaders: true,
  keyGenerator: (req) => ipKeyGenerator(req.ip!) ?? "unknown",
})

app.use(limiter)

app.get("/getway-health", (req: Request, res: Response) => {
  res.json({
    service: "api-gateway",
    status: "running",
  })
})

app.use("/auth", proxy(env.AUTH_SERVICE_URL))

app.use(errorMiddleware)

const server = app.listen(env.API_GATEWAY_PORT, () => {
  logger.info(`Listening at http://localhost:${env.API_GATEWAY_PORT}/api`)
})
server.on("error", console.error)
