import path from "node:path"
import { fileURLToPath } from "node:url"
import dotenv from "dotenv"
import { envSchema, type Env } from "@workspace/utils"

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../"
)

dotenv.config({
  path: path.join(rootDir, ".env"),
})

const result = envSchema.safeParse(process.env)

if (!result.success) {
  console.error("\n❌ Environment validation failed!\n")

  const errors = result.error.flatten().fieldErrors

  Object.entries(errors).forEach(([key, messages]) => {
    console.error(`❌ ${key}: ${messages?.join(", ")}`)
  })

  console.error("\nPlease check your .env file and fix the above issues.\n")

  process.exit(1)
}

export const env: Env = result.data
