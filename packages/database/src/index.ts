import { PrismaClient, Prisma } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { env } from "@workspace/config"

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
})

const prismaClientSingleton = () => {
  return new PrismaClient({
    adapter,
  })
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton> | null
} & typeof global

const prisma = globalThis.prismaGlobal || prismaClientSingleton()

if (env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma
}

export { Prisma }
export default prisma
