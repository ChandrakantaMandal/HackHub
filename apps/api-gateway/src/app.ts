import express from "express"
import cors from "cors"
import helmet from "helmet"
import { rateLimit, ipKeyGenerator } from "express-rate-limit"
import cookieParser from "cookie-parser"
import proxy from "express-http-proxy"
import { Request, Response } from "express"

import { httpLogger } from "@workspace/logger"
import { errorMiddleware } from "@workspace/error-handler"
import { env } from "@workspace/config"
import { authMiddleware, authRouteGuard } from "../middlewares/auth.middleware"

const app = express()

app.use(
  cors({
    origin: [env.CORS_ORIGIN],
    credentials: true,
    allowedHeaders: ["Authorization", "Content-Type"],
    exposedHeaders: ["Set-Cookie"],
  })
)
app.use(httpLogger)
app.use(cookieParser())
app.use(helmet({ crossOriginResourcePolicy: false }))
app.set("trust proxy", 1)

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req: any) => (req.user ? 1000 : 100),
  message: { error: "Too many requests, please try again later!" },
  legacyHeaders: true,
  standardHeaders: true,
  keyGenerator: (req) => ipKeyGenerator(req.ip!) ?? "unknown",
})

app.use(limiter)

app.get("/gateway-health", (req: Request, res: Response) => {
  res.json({
    service: "api-gateway",
    status: "running",
  })
})

// --- GATEWAY AUTHENTICATION & DECORATION MIDDLEWARE ---
// Shared authMiddleware (middlewares/auth.middleware.ts) verifies the Bearer
// token and injects x-user-id / x-user-role headers for downstream services.

// 1. Auth Service Routes (public auth endpoints pass through unauthenticated)
app.use(
  "/api/auth",
  authRouteGuard,
  proxy(env.AUTH_SERVICE_URL, {
    parseReqBody: false,
    userResDecorator: (_proxyRes, proxyResData, _userReq, userRes) => {
      userRes.setHeader("Access-Control-Allow-Origin", env.CORS_ORIGIN)
      userRes.setHeader("Access-Control-Allow-Credentials", "true")
      return proxyResData
    },
  })
)

// 2. Project Service Routes (Protected by gateway authMiddleware)
app.use(
  "/api/projects",
  authMiddleware,
  proxy(env.PROJECT_SERVICE_URL || "http://localhost:5002", {
    parseReqBody: false,
    proxyReqPathResolver: (req) => {
      return req.originalUrl
    },
    userResDecorator: (_proxyRes, proxyResData, _userReq, userRes) => {
      userRes.setHeader("Access-Control-Allow-Origin", env.CORS_ORIGIN)
      userRes.setHeader("Access-Control-Allow-Credentials", "true")
      return proxyResData
    },
  })
)

app.use(errorMiddleware)

export default app
