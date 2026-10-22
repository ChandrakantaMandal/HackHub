import prisma from "@workspace/database"
import { ConflictError, ValidationError } from "@workspace/error-handler"
import { logger } from "@workspace/logger"
import bcrypt from "bcrypt"
import { randomInt } from "crypto"

const JOIN_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const JOIN_CODE_LENGTH = 6
const JOIN_CODE_ATTEMPTS = 6
const BCRYPT_ROUNDS = 12

const generateJoinCode = (): string => {
  let code = ""
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    code += JOIN_CODE_CHARS[randomInt(JOIN_CODE_CHARS.length)]
  }
  return code
}

export interface CreateHackathonInput {
  name: string
  tagline?: string
  description?: string
  guidelines?: string
  allowJoin?: boolean
  maxTeamSize?: number
  registrationDeadline: Date
  startDate: Date
  endDate: Date
  location?: string
  status?: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED"
}

export interface CreateJudgeInput {
  email: string
  password: string
  name?: string
}

class AdminService {
  async listHackathons() {
    return prisma.hackathon.findMany({
      orderBy: { createdAt: "desc" },
    })
  }

  async createHackathon(data: CreateHackathonInput) {
    if (
      data.registrationDeadline > data.startDate ||
      data.startDate > data.endDate
    ) {
      throw new ValidationError(
        "Dates must be ordered: registration <= start <= end"
      )
    }

    let joinCode = ""

    for (let attempt = 1; attempt <= JOIN_CODE_ATTEMPTS; attempt++) {
      const candidate = generateJoinCode()
      const clash = await prisma.hackathon.findUnique({
        where: { joinCode: candidate },
        select: { id: true },
      })

      if (!clash) {
        joinCode = candidate
        break
      }
    }

    if (!joinCode) {
      throw new ConflictError(
        "Could not generate a unique join code, please retry"
      )
    }

    const hackathon = await prisma.hackathon.create({
      data: {
        name: data.name,
        joinCode,
        registrationDeadline: data.registrationDeadline,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status ?? "ACTIVE",
        ...(data.tagline ? { tagline: data.tagline } : {}),
        ...(data.description ? { description: data.description } : {}),
        ...(data.guidelines ? { guidelines: data.guidelines } : {}),
        ...(data.location ? { location: data.location } : {}),
        ...(data.allowJoin !== undefined ? { allowJoin: data.allowJoin } : {}),
        ...(data.maxTeamSize !== undefined
          ? { maxTeamSize: data.maxTeamSize }
          : {}),
      },
    })

    logger.info("Hackathon created", {
      hackathonId: hackathon.id,
      joinCode: hackathon.joinCode,
    })

    return hackathon
  }

  async listJudges() {
    const users = await prisma.user.findMany({
      where: { role: "JUDGE" },
      include: {
        account: { select: { email: true } },
        judge: { include: { _count: { select: { scores: true } } } },
      },
      orderBy: { createdAt: "desc" },
    })

    return users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      email: u.account.email,
      submissions: u.judge?._count.scores ?? 0,
      createdAt: u.createdAt,
    }))
  }

  async createJudge(data: CreateJudgeInput) {
    const existingAccount = await prisma.account.findUnique({
      where: { email: data.email },
      select: { id: true },
    })

    if (existingAccount) {
      throw new ConflictError("An account with this email already exists")
    }

    const local = data.email.split("@")[0] ?? ""
    const base = local.toLowerCase().replace(/[^a-z0-9]/g, "") || "judge"

    const username = await this.uniqueUsername(base)
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS)

    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          email: data.email,
          passwordHash,
          isVerified: true,
        },
      })

      const user = await tx.user.create({
        data: {
          accountId: account.id,
          username,
          role: "JUDGE",
          ...(data.name ? { name: data.name } : {}),
        },
      })

      await tx.judge.create({
        data: { userId: user.id },
      })

      return { account, user }
    })

    logger.info("Judge created", {
      accountId: result.account.id,
      username: result.user.username,
    })

    return {
      id: result.user.id,
      username: result.user.username,
      name: result.user.name,
      email: result.account.email,
      submissions: 0,
      createdAt: result.user.createdAt,
    }
  }

  private async uniqueUsername(base: string): Promise<string> {
    let candidate = base
    let suffix = 2

    while (
      await prisma.user.findUnique({
        where: { username: candidate },
        select: { id: true },
      })
    ) {
      candidate = `${base.slice(0, 28)}-${suffix}`
      suffix += 1
    }

    return candidate
  }
}

export default new AdminService()
