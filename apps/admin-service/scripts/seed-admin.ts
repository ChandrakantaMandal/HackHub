import { env } from "@workspace/config"
import prisma from "@workspace/database"
import bcrypt from "bcrypt"

const BCRYPT_ROUNDS = 12

async function main() {
  const email = env.ADMIN_EMAIL
  const password = env.ADMIN_PASSWORD

  if (!email || !password) {
    console.error(
      "Missing admin seed config. Set ADMIN_EMAIL and ADMIN_PASSWORD (min 8 chars) in the root .env file."
    )
    process.exit(1)
  }

  if (password.length < 8) {
    console.error("ADMIN_PASSWORD must be at least 8 characters.")
    process.exit(1)
  }

  const username = env.ADMIN_USERNAME ?? email.split("@")[0] ?? "admin"

  const existingAccount = await prisma.account.findUnique({
    where: { email },
    select: { id: true },
  })

  if (existingAccount) {
    console.log(`Admin account already exists: ${email}`)
    return
  }

  const existingUser = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  })

  if (existingUser) {
    console.error(
      `Username "${username}" is already taken. Set ADMIN_USERNAME in .env to a free username.`
    )
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

  await prisma.$transaction(async (tx) => {
    const account = await tx.account.create({
      data: {
        email,
        passwordHash,
        isVerified: true,
      },
    })

    await tx.user.create({
      data: {
        accountId: account.id,
        username,
        role: "ADMIN",
      },
    })
  })

  console.log(`Admin account seeded: ${email} (username: ${username})`)
}

main()
  .catch((error) => {
    console.error("Failed to seed admin account:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
