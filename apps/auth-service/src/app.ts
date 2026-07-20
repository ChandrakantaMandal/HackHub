import express from "express"
import cookieParser from "cookie-parser"
import helmet from "helmet"
import { httpLogger } from "@workspace/logger"

import authRouter from "../routes/auth.route"

import { errorMiddleware } from "@workspace/error-handler"

const app = express()

app.use(httpLogger)
app.use(helmet())
app.use(express.json())
app.use(cookieParser())

app.use("/", authRouter)

app.use(errorMiddleware)

export default app
