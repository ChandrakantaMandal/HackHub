import express from "express";
import { env } from "./config/env";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import {rateLimit, ipKeyGenerator} from "express-rate-limit";
import cookieParser from "cookie-parser";
import proxy from "express-http-proxy";
import { Request,Response } from "express";


const app = express();



app.use(cors({
    origin: ["http://localhost:3000"],
    allowedHeaders: ["Authorization", "Content-Type"],
  }))
app.use(morgan("dev"))
app.use(express.json({limit: "100mb"}))
app.use(express.urlencoded({limit: "100mb", extended: true }))
app.use(cookieParser())
app.use(helmet())
app.set("trust proxy", 1);


const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: (req) => (req.user ? 1000 : 100),
  message: { error: "Too many requests,please try again later!" },
  legacyHeaders: true,
  standardHeaders: true,
  keyGenerator: (req) => ipKeyGenerator(req.ip!) ?? "unknown",
});

app.use(limiter);

app.get("/", (req: Request, res: Response) => {
  res.json({
    service: "api-gateway",
    status: "running",
  })
})

app.use("/",proxy("http://localhost:6001"))

const server = app.listen(env.PORT, () => {
  console.log(`Listening at http://localhost:${env.PORT}/api`);
});
server.on("error", console.error);

