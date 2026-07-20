import path from "node:path"
import { fileURLToPath } from "node:url"
import dotenv from "dotenv"
import { z } from "zod"

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../"
)

dotenv.config({
  path: path.join(rootDir, ".env"),
})

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  AUTH_SERVICE_PORT: z.coerce.number().default(6001),

  API_GATEWAY_PORT: z.coerce.number().default(8080),

  DATABASE_URL: z.string().url(),

  ACCESS_SECRET: z.string().min(1),

  REFRESH_SECRET: z.string().min(1),

  REDIS_URL: z.string().min(1),

  AUTH_SERVICE_URL: z.string().url().default("http://localhost:6001"),

  API_URL: z.string().url().default("http://localhost:4000"),

  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  LOG_LEVEL: z
    .enum(["error", "warn", "info", "http", "verbose", "debug", "silly"])
    .default("info"),
})

export const env = envSchema.parse(process.env)

export type Env = z.infer<typeof envSchema>
