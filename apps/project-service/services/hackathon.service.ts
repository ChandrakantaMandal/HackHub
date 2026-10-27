import prisma from "@workspace/database"
import {
  ConflictError,
  ValidationError,
  NotFoundError,
  DatabaseError,
} from "@workspace/error-handler"
import { logger } from "@workspace/logger"
import { z } from "zod"

interface HackathonRecord {
  id: string
  name: string
  tagline: string | null
  description: string | null
  location: string | null
  startDate: Date
  endDate: Date
  registrationDeadline: Date
  allowJoin: boolean
  maxTeamSize: number
  status: string
}

export interface HackathonPublic {
  id: string
  name: string
  tagline: string | null
  description: string | null
  location: string | null
  startDate: Date
  endDate: Date
  registrationDeadline: Date
  allowJoin: boolean
  maxTeamSize: number
  status: string
  participantCount: number
  registered: boolean
  isRegistrationOpen: boolean
}

export interface TeamLeaderboardEntry {
  rank: number
  teamId: string
  teamName: string
  projectId: string
  projectTitle: string
  averageScore: number
  judgeCount: number
}

const uuidSchema = z.string().uuid()

// Public payload: joinCode is deliberately omitted — it is only revealed to
// registered participants (or entered as a credential to join).
function toPublic(
  hackathon: HackathonRecord,
  participantCount: number,
  registered: boolean
): HackathonPublic {
  return {
    id: hackathon.id,
    name: hackathon.name,
    tagline: hackathon.tagline,
    description: hackathon.description,
    location: hackathon.location,
    startDate: hackathon.startDate,
    endDate: hackathon.endDate,
    registrationDeadline: hackathon.registrationDeadline,
    allowJoin: hackathon.allowJoin,
    maxTeamSize: hackathon.maxTeamSize,
    status: hackathon.status,
    participantCount,
    registered,
    isRegistrationOpen:
      hackathon.allowJoin &&
      hackathon.status === "ACTIVE" &&
      new Date() <= hackathon.registrationDeadline,
  }
}

class HackathonService {
  // Public listing of active hackathons. When a userId is provided (the
  // gateway verified a token), each row carries the caller's `registered` flag.
  async listActive(userId?: string): Promise<HackathonPublic[]> {
    try {
      const hackathons = await prisma.hackathon.findMany({
        where: { status: "ACTIVE" },
        orderBy: { startDate: "asc" },
        include: { _count: { select: { registrations: true } } },
      })

      const registeredIds = new Set<string>()
      if (userId && hackathons.length > 0) {
        const registrations = await prisma.hackathonRegistration.findMany({
          where: { userId, hackathonId: { in: hackathons.map((h) => h.id) } },
          select: { hackathonId: true },
        })
        for (const r of registrations) registeredIds.add(r.hackathonId)
      }

      return hackathons.map((h) =>
        toPublic(h, h._count.registrations, registeredIds.has(h.id))
      )
    } catch (error) {
      if (error instanceof Error) throw error
      throw new DatabaseError("Unable to list hackathons", error)
    }
  }

  // Hackathons the caller registered for — powers the required hackathon
  // select on the create-project form.
  async listMine(userId: string): Promise<HackathonPublic[]> {
    try {
      const registrations = await prisma.hackathonRegistration.findMany({
        where: { userId },
        orderBy: { registeredAt: "desc" },
        include: {
          hackathon: {
            include: { _count: { select: { registrations: true } } },
          },
        },
      })

      return registrations.map((r) =>
        toPublic(r.hackathon, r.hackathon._count.registrations, true)
      )
    } catch (error) {
      if (error instanceof Error) throw error
      throw new DatabaseError("Unable to list your hackathons", error)
    }
  }

  // Public team rankings for one hackathon: each team's project is ranked by
  // the average judge finalScore (0-100). Teams without judge scores are
  // omitted so unscored projects never dilute the board.
  async getLeaderboard(hackathonId: string): Promise<TeamLeaderboardEntry[]> {
    try {
      if (!uuidSchema.safeParse(hackathonId).success) {
        throw new ValidationError("Invalid hackathon id")
      }

      const hackathon = await prisma.hackathon.findUnique({
        where: { id: hackathonId },
        select: { id: true },
      })
      if (!hackathon) {
        throw new NotFoundError("Hackathon not found")
      }

      const projects = await prisma.project.findMany({
        where: { hackathonId },
        select: {
          id: true,
          title: true,
          team: { select: { id: true, name: true } },
          submission: {
            select: { judgeScores: { select: { finalScore: true } } },
          },
        },
      })

      const scored = projects
        .map((project) => {
          const scores =
            project.submission?.judgeScores.map((s) => s.finalScore) ?? []
          if (scores.length === 0) return null
          const total = scores.reduce((sum, score) => sum + score, 0)
          return {
            teamId: project.team.id,
            teamName: project.team.name,
            projectId: project.id,
            projectTitle: project.title,
            averageScore: Math.round((total / scores.length) * 100) / 100,
            judgeCount: scores.length,
          }
        })
        .filter(
          (row): row is Omit<TeamLeaderboardEntry, "rank"> => row !== null
        )
        .sort(
          (a, b) =>
            b.averageScore - a.averageScore ||
            a.teamName.localeCompare(b.teamName)
        )

      // Competition ranking: equal scores share a rank, the next rank skips.
      let previousScore: number | null = null
      let previousRank = 0
      return scored.map((row, index) => {
        const rank =
          row.averageScore === previousScore ? previousRank : index + 1
        previousScore = row.averageScore
        previousRank = rank
        return { ...row, rank }
      })
    } catch (error) {
      if (error instanceof Error) throw error
      throw new DatabaseError("Unable to load the leaderboard", error)
    }
  }

  async register(
    userId: string,
    hackathonId: string
  ): Promise<HackathonPublic> {
    try {
      if (!uuidSchema.safeParse(hackathonId).success) {
        throw new ValidationError("Invalid hackathon id")
      }

      const hackathon = await prisma.hackathon.findUnique({
        where: { id: hackathonId },
      })

      if (!hackathon) {
        throw new NotFoundError("Hackathon not found")
      }

      this.assertJoinable(hackathon)

      await this.createRegistration(userId, hackathon.id)

      const participantCount = await prisma.hackathonRegistration.count({
        where: { hackathonId: hackathon.id },
      })

      logger.info(
        `[HACKATHON_REGISTER] User ${userId} registered for ${hackathon.name} (${hackathon.id})`
      )

      return toPublic(hackathon, participantCount, true)
    } catch (error) {
      if (error instanceof Error) throw error
      throw new DatabaseError("Unable to register for hackathon", error)
    }
  }

  async registerByCode(
    userId: string,
    joinCode: string
  ): Promise<HackathonPublic> {
    try {
      const hackathon = await prisma.hackathon.findUnique({
        where: { joinCode: joinCode.trim().toUpperCase() },
      })

      if (!hackathon) {
        throw new NotFoundError("Invalid join code")
      }

      this.assertJoinable(hackathon)

      await this.createRegistration(userId, hackathon.id)

      const participantCount = await prisma.hackathonRegistration.count({
        where: { hackathonId: hackathon.id },
      })

      logger.info(
        `[HACKATHON_JOIN] User ${userId} joined ${hackathon.name} (${hackathon.id}) via join code`
      )

      return toPublic(hackathon, participantCount, true)
    } catch (error) {
      if (error instanceof Error) throw error
      throw new DatabaseError("Unable to join hackathon", error)
    }
  }

  private assertJoinable(hackathon: {
    status: string
    allowJoin: boolean
    registrationDeadline: Date
  }) {
    if (hackathon.status !== "ACTIVE") {
      throw new ValidationError("This hackathon is not accepting registrations")
    }
    if (!hackathon.allowJoin) {
      throw new ValidationError("Joining is disabled for this hackathon")
    }
    if (new Date() > hackathon.registrationDeadline) {
      throw new ValidationError("Registration deadline has passed")
    }
  }

  private async createRegistration(userId: string, hackathonId: string) {
    try {
      await prisma.hackathonRegistration.create({
        data: { userId, hackathonId },
      })
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002") {
        throw new ConflictError("You are already registered for this hackathon")
      }
      throw error
    }
  }
}

export default new HackathonService()
