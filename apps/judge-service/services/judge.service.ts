import prisma, { Prisma } from "@workspace/database"
import {
  AppError,
  AuthError,
  ConflictError,
  DatabaseError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@workspace/error-handler"
import { env } from "@workspace/config"
import { logger } from "@workspace/logger"
import {
  computeFinalScore,
  rankProjects,
  type LeaderboardRow,
} from "../libs/scoring"

interface RegisterDTO {
  username: string
  email: string
  password: string
  confirmPassword: string
  judgeCode: string
}

interface LoginDTO {
  email: string
  password: string
}

interface ScoreSubmissionDTO {
  submissionId: string
  userId: string
  scores: {
    innovation: number
    technical: number
    design: number
    presentation: number
    overall: number
    feedback?: string
  }
}

interface AwardBadgeDTO {
  submissionId: string
  userId: string
  name: string
  description?: string
}

interface RevokeBadgeDTO {
  submissionId: string
  badgeId: string
  userId: string
}

const mapAuthError = (status: number, message?: string): Error => {
  if (status === 409) return new ConflictError(message ?? "Conflict")
  if (status === 401 || status === 403)
    return new AuthError(message ?? "Authentication failed")
  if (status === 400) return new ValidationError(message ?? "Validation failed")
  return new AuthError(message ?? "Authentication service error")
}

class JudgeService {
  async register(data: RegisterDTO) {
    const body = await this.callAuth("/register", data)

    const account = await prisma.account.findUnique({
      where: { email: data.email },
      select: { user: { select: { id: true, role: true } } },
    })

    if (!account?.user) {
      throw new AuthError("Judge registration failed")
    }
    if (account.user.role !== "JUDGE") {
      throw new ForbiddenError("Judge code is invalid")
    }

    await this.ensureJudge(account.user.id)

    logger.info("Judge registered", { userId: account.user.id })
    return body.data
  }

  async login(data: LoginDTO) {
    const body = await this.callAuth("/login", data)

    const account = await prisma.account.findUnique({
      where: { email: data.email },
      select: { user: { select: { id: true, role: true } } },
    })

    if (!account?.user || account.user.role !== "JUDGE") {
      throw new ForbiddenError("Judge account required")
    }

    await this.ensureJudge(account.user.id)

    return body.data
  }

  async listSubmissions() {
    return prisma.submission.findMany({
      include: {
        project: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            status: true,
            team: {
              select: {
                id: true,
                name: true,
                owner: { select: { id: true, username: true, name: true } },
              },
            },
          },
        },
        judgeScores: true,
        badges: true,
      },
      orderBy: { submittedAt: "desc" },
    })
  }

  async scoreSubmission({ submissionId, userId, scores }: ScoreSubmissionDTO) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { id: true },
    })
    if (!submission) throw new NotFoundError("Submission not found")

    const judge = await this.ensureJudge(userId)
    const finalScore = computeFinalScore(scores)

    const result = await prisma.judgeScore.upsert({
      where: { submissionId_judgeId: { submissionId, judgeId: judge.id } },
      update: {
        innovation: scores.innovation,
        technical: scores.technical,
        design: scores.design,
        presentation: scores.presentation,
        overall: scores.overall,
        finalScore,
        feedback: scores.feedback ?? null,
      },
      create: {
        submissionId,
        judgeId: judge.id,
        innovation: scores.innovation,
        technical: scores.technical,
        design: scores.design,
        presentation: scores.presentation,
        overall: scores.overall,
        finalScore,
        feedback: scores.feedback ?? null,
      },
    })

    logger.info("Submission scored", {
      submissionId,
      judgeId: judge.id,
      finalScore,
    })
    return result
  }

  async awardBadge({ submissionId, userId, name, description }: AwardBadgeDTO) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { id: true },
    })
    if (!submission) throw new NotFoundError("Submission not found")

    try {
      const badge = await prisma.achievementBadge.create({
        data: {
          submissionId,
          awardedById: userId,
          name,
          description: description ?? null,
        },
      })

      logger.info("Badge awarded", { submissionId, badgeId: badge.id, name })
      return badge
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictError("Badge already awarded for this submission")
      }
      throw error
    }
  }

  async revokeBadge({ submissionId, badgeId, userId }: RevokeBadgeDTO) {
    const badge = await prisma.achievementBadge.findFirst({
      where: { id: badgeId, submissionId },
    })
    if (!badge) throw new NotFoundError("Badge not found")
    if (badge.awardedById !== userId) {
      throw new ForbiddenError("Only the awarding judge can revoke this badge")
    }

    await prisma.achievementBadge.delete({ where: { id: badgeId } })

    logger.info("Badge revoked", { submissionId, badgeId })
    return { id: badgeId }
  }

  async getLeaderboard() {
    const rows = await prisma.judgeScore.findMany({
      select: {
        finalScore: true,
        submission: {
          select: { project: { select: { id: true, title: true } } },
        },
      },
    })

    const leaderboardRows: LeaderboardRow[] = rows.map((row) => ({
      projectId: row.submission.project.id,
      title: row.submission.project.title,
      finalScore: row.finalScore,
    }))

    return rankProjects(leaderboardRows).slice(0, 50)
  }

  private async ensureJudge(userId: string) {
    return prisma.judge.upsert({
      where: { userId },
      update: {},
      create: { userId },
    })
  }

  private async callAuth(path: string, payload: unknown) {
    let response: Response

    try {
      response = await fetch(`${env.AUTH_SERVICE_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    } catch {
      throw new AppError("Auth service unavailable", 502, true)
    }

    const body = await response.json().catch(() => null)

    if (!response.ok) {
      const message =
        body && typeof body.message === "string" ? body.message : undefined
      throw mapAuthError(response.status, message)
    }

    return body as { data?: unknown }
  }
}

export default new JudgeService()
