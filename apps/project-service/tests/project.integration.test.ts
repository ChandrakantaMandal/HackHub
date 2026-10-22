import { describe, it, expect, beforeEach, vi } from "vitest"
import request from "supertest"

const { mockPrisma, PrismaClientKnownRequestError } = vi.hoisted(() => {
  class PrismaClientKnownRequestError extends Error {
    code: string
    constructor(message: string, code: string) {
      super(message)
      this.name = "PrismaClientKnownRequestError"
      this.code = code
    }
  }
  const prismaModel = () => ({
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  })
  return {
    mockPrisma: {
      team: prismaModel(),
      project: prismaModel(),
      task: prismaModel(),
      submission: prismaModel(),
      user: prismaModel(),
      teamMember: prismaModel(),
      hackathon: prismaModel(),
      hackathonRegistration: prismaModel(),
    },
    PrismaClientKnownRequestError,
  }
})

vi.mock("@workspace/config", () => ({
  env: { CORS_ORIGIN: "*" },
}))

vi.mock("@workspace/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  httpLogger: vi.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}))

vi.mock("@workspace/database", () => ({
  default: mockPrisma,
  Prisma: { PrismaClientKnownRequestError },
}))

import app from "../src/app"

const asUser = (id: string, role = "user") => ({
  "x-user-id": id,
  "x-user-role": role,
})

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.user.findUnique.mockImplementation(
    async ({ where }: { where: { accountId: string } }) => ({
      id: where.accountId,
    })
  )
})

describe("project-service integration", () => {
  describe("GET /health", () => {
    it("returns healthy status", async () => {
      const res = await request(app).get("/health")
      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        status: "healthy",
        service: "project-service",
      })
    })
  })

  describe("userContext gate", () => {
    it("rejects requests without x-user-id with 401", async () => {
      const res = await request(app).get("/api/projects")
      expect(res.status).toBe(401)
      expect(res.body).toEqual({
        success: false,
        error: "Unauthorized: Missing user context",
      })
      expect(mockPrisma.team.findMany).not.toHaveBeenCalled()
    })
  })

  describe("POST /api/projects/teams", () => {
    it("creates a team with a generated invite code", async () => {
      mockPrisma.team.create.mockResolvedValue({
        id: "team-1",
        name: "Hackers",
        inviteCode: "AB12CD",
        ownerId: "user-1",
        members: [],
      })

      const res = await request(app)
        .post("/api/projects/teams")
        .set(asUser("user-1"))
        .send({ name: "Hackers", userId: "user-1" })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.name).toBe("Hackers")
      expect(res.body.data.inviteCode).toMatch(/^[A-Z0-9]{1,6}$/)
      expect(mockPrisma.team.create).toHaveBeenCalledTimes(1)
    })

    it("returns 400 with field errors on invalid body", async () => {
      const res = await request(app)
        .post("/api/projects/teams")
        .set(asUser("user-1"))
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toBe("Validation failed")
      expect(res.body.fields.name).toBeDefined()
      expect(mockPrisma.team.create).not.toHaveBeenCalled()
    })
  })

  describe("POST /api/projects/teams/join", () => {
    it("returns 404 for an unknown invite code", async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .post("/api/projects/teams/join")
        .set(asUser("user-2"))
        .send({ inviteCode: "ZZZZ99", userId: "user-2" })

      expect(res.status).toBe(404)
      expect(res.body).toEqual({
        success: false,
        message: "Invalid or expired invite code",
      })
      expect(mockPrisma.team.update).not.toHaveBeenCalled()
    })

    it("joins an existing team", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team-1",
        name: "Hackers",
        ownerId: "user-1",
        members: [{ userId: "user-1" }],
      })
      mockPrisma.team.update.mockResolvedValue({ id: "team-1" })

      const res = await request(app)
        .post("/api/projects/teams/join")
        .set(asUser("user-2"))
        .send({ inviteCode: "AB12CD", userId: "user-2" })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toBe("Successfully joined team")
      expect(mockPrisma.team.update).toHaveBeenCalledTimes(1)
      expect(mockPrisma.team.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "team-1" },
          data: { members: { create: { userId: "user-2" } } },
        })
      )
    })
  })

  describe("GET /api/projects/teams", () => {
    it("lists teams owned or joined by the user", async () => {
      mockPrisma.team.findMany.mockResolvedValue([
        { id: "team-1", ownerId: "user-1", members: [] },
        { id: "team-2", ownerId: "user-2", members: [] },
      ])

      const res = await request(app)
        .get("/api/projects/teams")
        .set(asUser("user-1"))

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(2)
      expect(mockPrisma.team.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { ownerId: "user-1" },
              { members: { some: { userId: "user-1" } } },
            ],
          },
        })
      )
    })
  })

  describe("DELETE /api/projects/teams/:teamId", () => {
    it("returns 403 when the caller is not the owner", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team-1",
        ownerId: "user-1",
      })

      const res = await request(app)
        .delete("/api/projects/teams/team-1")
        .set(asUser("user-2"))

      expect(res.status).toBe(403)
      expect(res.body).toEqual({
        success: false,
        message: "Only the team owner can delete this team",
      })
      expect(mockPrisma.team.delete).not.toHaveBeenCalled()
    })

    it("returns 404 when the team does not exist", async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .delete("/api/projects/teams/team-404")
        .set(asUser("user-1"))

      expect(res.status).toBe(404)
      expect(res.body).toEqual({ success: false, message: "Team not found" })
      expect(mockPrisma.team.delete).not.toHaveBeenCalled()
    })

    it("deletes an owned team", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team-1",
        ownerId: "user-1",
      })
      mockPrisma.team.delete.mockResolvedValue({ id: "team-1" })

      const res = await request(app)
        .delete("/api/projects/teams/team-1")
        .set(asUser("user-1"))

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toEqual({
        id: "team-1",
        message: "Team deleted successfully",
      })
      expect(mockPrisma.team.delete).toHaveBeenCalledWith({
        where: { id: "team-1" },
      })
    })
  })

  describe("DELETE /api/projects/teams/:teamId/members/:userId", () => {
    it("returns 404 when the team does not exist", async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .delete("/api/projects/teams/team-404/members/user-2")
        .set(asUser("user-1"))

      expect(res.status).toBe(404)
      expect(res.body).toEqual({
        success: false,
        message: "Team not found",
      })
      expect(mockPrisma.teamMember.delete).not.toHaveBeenCalled()
    })

    it("forbids a non-owner from removing another member", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team-1",
        ownerId: "user-1",
        members: [
          { id: "m1", userId: "user-1" },
          { id: "m2", userId: "user-2" },
          { id: "m3", userId: "user-3" },
        ],
      })

      const res = await request(app)
        .delete("/api/projects/teams/team-1/members/user-3")
        .set(asUser("user-2"))

      expect(res.status).toBe(403)
      expect(res.body).toEqual({
        success: false,
        message: "Only the team owner can remove members",
      })
      expect(mockPrisma.teamMember.delete).not.toHaveBeenCalled()
    })

    it("lets the owner remove a member", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team-1",
        ownerId: "user-1",
        members: [
          { id: "m1", userId: "user-1" },
          { id: "m2", userId: "user-2" },
        ],
      })
      mockPrisma.teamMember.delete.mockResolvedValue({ id: "m2" })

      const res = await request(app)
        .delete("/api/projects/teams/team-1/members/user-2")
        .set(asUser("user-1"))

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toEqual({
        teamId: "team-1",
        userId: "user-2",
        message: "Member removed from team",
      })
      expect(mockPrisma.teamMember.delete).toHaveBeenCalledWith({
        where: { id: "m2" },
      })
    })

    it("lets a member leave the team", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team-1",
        ownerId: "user-1",
        members: [
          { id: "m1", userId: "user-1" },
          { id: "m2", userId: "user-2" },
        ],
      })
      mockPrisma.teamMember.delete.mockResolvedValue({ id: "m2" })

      const res = await request(app)
        .delete("/api/projects/teams/team-1/members/user-2")
        .set(asUser("user-2"))

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(mockPrisma.teamMember.delete).toHaveBeenCalledWith({
        where: { id: "m2" },
      })
    })

    it("forbids the owner from leaving the team", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team-1",
        ownerId: "user-1",
        members: [{ id: "m1", userId: "user-1" }],
      })

      const res = await request(app)
        .delete("/api/projects/teams/team-1/members/user-1")
        .set(asUser("user-1"))

      expect(res.status).toBe(403)
      expect(res.body).toEqual({
        success: false,
        message: "Owner cannot leave team; delete the team instead",
      })
      expect(mockPrisma.teamMember.delete).not.toHaveBeenCalled()
    })
  })

  describe("POST /api/projects", () => {
    const H_ID = "3f1a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8"
    const validProject = {
      title: "Cool App",
      description: "A description that is long enough",
      category: "web",
      tags: ["ai"],
      teamId: "team-1",
      userId: "user-1",
      hackathonId: H_ID,
    }

    it("returns 401 when user is not a team member", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team-1",
        ownerId: "owner-9",
        members: [{ userId: "someone-else" }],
      })

      const res = await request(app)
        .post("/api/projects")
        .set(asUser("user-1"))
        .send(validProject)

      expect(res.status).toBe(401)
      expect(res.body).toEqual({
        success: false,
        message: "You must be a member of the team to create a project",
      })
      expect(mockPrisma.project.create).not.toHaveBeenCalled()
    })

    it("creates a project for a team member", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team-1",
        ownerId: "user-1",
        members: [],
      })
      mockPrisma.hackathonRegistration.findUnique.mockResolvedValue({
        userId: "user-1",
        hackathonId: H_ID,
      })
      mockPrisma.project.create.mockResolvedValue({
        id: "proj-1",
        title: "Cool App",
        teamId: "team-1",
        hackathonId: H_ID,
      })

      const res = await request(app)
        .post("/api/projects")
        .set(asUser("user-1"))
        .send(validProject)

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.title).toBe("Cool App")
      expect(mockPrisma.project.create).toHaveBeenCalledTimes(1)
      expect(mockPrisma.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ hackathonId: H_ID }),
        })
      )
      expect(mockPrisma.hackathonRegistration.findUnique).toHaveBeenCalledWith({
        where: { userId_hackathonId: { userId: "user-1", hackathonId: H_ID } },
      })
    })

    it("returns 400 when the user has not registered for the hackathon", async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team-1",
        ownerId: "user-1",
        members: [],
      })
      mockPrisma.hackathonRegistration.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .post("/api/projects")
        .set(asUser("user-1"))
        .send(validProject)

      expect(res.status).toBe(400)
      expect(res.body).toEqual({
        success: false,
        message:
          "You must register for this hackathon before creating a project",
      })
      expect(mockPrisma.project.create).not.toHaveBeenCalled()
    })

    it("returns 400 with field errors when hackathonId is missing", async () => {
      const { hackathonId: _omit, ...withoutHackathon } = validProject

      const res = await request(app)
        .post("/api/projects")
        .set(asUser("user-1"))
        .send(withoutHackathon)

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toBe("Validation failed")
      expect(res.body.fields.hackathonId).toBeDefined()
      expect(mockPrisma.team.findUnique).not.toHaveBeenCalled()
      expect(mockPrisma.project.create).not.toHaveBeenCalled()
    })

    it("returns 400 with field errors on a short title", async () => {
      const res = await request(app)
        .post("/api/projects")
        .set(asUser("user-1"))
        .send({ ...validProject, title: "ab" })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toBe("Validation failed")
      expect(res.body.fields.title).toBeDefined()
      expect(mockPrisma.team.findUnique).not.toHaveBeenCalled()
      expect(mockPrisma.project.create).not.toHaveBeenCalled()
    })
  })

  describe("hackathon endpoints", () => {
    const H_ID = "3f1a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8"
    const activeHackathon = {
      id: H_ID,
      name: "Spring Hack",
      tagline: "Build things",
      description: "A hackathon",
      location: "Online",
      startDate: new Date("2026-11-01T00:00:00Z"),
      endDate: new Date("2026-11-03T00:00:00Z"),
      registrationDeadline: new Date("2026-10-30T00:00:00Z"),
      allowJoin: true,
      maxTeamSize: 4,
      status: "ACTIVE",
      joinCode: "SPRING",
      _count: { registrations: 3 },
    }

    describe("GET /api/hackathons", () => {
      it("lists active hackathons anonymously without joinCode", async () => {
        mockPrisma.hackathon.findMany.mockResolvedValue([activeHackathon])

        const res = await request(app).get("/api/hackathons")

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data).toHaveLength(1)
        expect(res.body.data[0].id).toBe(H_ID)
        expect(res.body.data[0].participantCount).toBe(3)
        expect(res.body.data[0].registered).toBe(false)
        expect(res.body.data[0].isRegistrationOpen).toBe(true)
        expect(res.body.data[0]).not.toHaveProperty("joinCode")
        expect(mockPrisma.hackathon.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ where: { status: "ACTIVE" } })
        )
        expect(mockPrisma.hackathonRegistration.findMany).not.toHaveBeenCalled()
      })

      it("marks registered hackathons for an authenticated caller", async () => {
        mockPrisma.hackathon.findMany.mockResolvedValue([activeHackathon])
        mockPrisma.hackathonRegistration.findMany.mockResolvedValue([
          { hackathonId: H_ID },
        ])

        const res = await request(app)
          .get("/api/hackathons")
          .set(asUser("acct-1"))

        expect(res.status).toBe(200)
        expect(res.body.data[0].registered).toBe(true)
        expect(mockPrisma.hackathonRegistration.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ userId: "acct-1" }),
          })
        )
      })
    })

    describe("GET /api/hackathons/mine", () => {
      it("returns 401 without user context", async () => {
        const res = await request(app).get("/api/hackathons/mine")
        expect(res.status).toBe(401)
        expect(res.body).toEqual({
          success: false,
          error: "Unauthorized: Missing user context",
        })
      })

      it("returns the hackathons the user registered for", async () => {
        mockPrisma.hackathonRegistration.findMany.mockResolvedValue([
          {
            hackathon: { ...activeHackathon, joinCode: "SPRING" },
            hackathonId: H_ID,
            userId: "user-1",
            registeredAt: new Date(),
          },
        ])

        const res = await request(app)
          .get("/api/hackathons/mine")
          .set(asUser("user-1"))

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data).toHaveLength(1)
        expect(res.body.data[0].id).toBe(H_ID)
        expect(res.body.data[0].registered).toBe(true)
        expect(res.body.data[0]).not.toHaveProperty("joinCode")
        expect(mockPrisma.hackathonRegistration.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { userId: "user-1" },
          })
        )
      })
    })

    describe("POST /api/hackathons/:id/register", () => {
      it("registers the user and returns 201", async () => {
        mockPrisma.hackathon.findUnique.mockResolvedValue(activeHackathon)
        mockPrisma.hackathonRegistration.create.mockResolvedValue({
          userId: "user-1",
          hackathonId: H_ID,
        })
        mockPrisma.hackathonRegistration.count.mockResolvedValue(4)

        const res = await request(app)
          .post(`/api/hackathons/${H_ID}/register`)
          .set(asUser("user-1"))

        expect(res.status).toBe(201)
        expect(res.body.success).toBe(true)
        expect(res.body.message).toBe("Successfully registered for hackathon")
        expect(res.body.data.id).toBe(H_ID)
        expect(res.body.data.registered).toBe(true)
        expect(res.body.data.participantCount).toBe(4)
        expect(res.body.data).not.toHaveProperty("joinCode")
        expect(mockPrisma.hackathonRegistration.create).toHaveBeenCalledWith({
          data: { userId: "user-1", hackathonId: H_ID },
        })
      })

      it("returns 400 for an invalid hackathon id", async () => {
        const res = await request(app)
          .post("/api/hackathons/not-a-uuid/register")
          .set(asUser("user-1"))

        expect(res.status).toBe(400)
        expect(res.body).toEqual({
          success: false,
          message: "Invalid hackathon id",
        })
        expect(mockPrisma.hackathon.findUnique).not.toHaveBeenCalled()
      })

      it("returns 404 when the hackathon does not exist", async () => {
        mockPrisma.hackathon.findUnique.mockResolvedValue(null)

        const res = await request(app)
          .post(`/api/hackathons/${H_ID}/register`)
          .set(asUser("user-1"))

        expect(res.status).toBe(404)
        expect(res.body).toEqual({
          success: false,
          message: "Hackathon not found",
        })
      })

      it("returns 409 when already registered", async () => {
        mockPrisma.hackathon.findUnique.mockResolvedValue(activeHackathon)
        mockPrisma.hackathonRegistration.create.mockRejectedValue(
          new PrismaClientKnownRequestError("Unique constraint", "P2002")
        )

        const res = await request(app)
          .post(`/api/hackathons/${H_ID}/register`)
          .set(asUser("user-1"))

        expect(res.status).toBe(409)
        expect(res.body).toEqual({
          success: false,
          message: "You are already registered for this hackathon",
        })
      })

      it("returns 400 when registration deadline has passed", async () => {
        mockPrisma.hackathon.findUnique.mockResolvedValue({
          ...activeHackathon,
          registrationDeadline: new Date("2020-01-01T00:00:00Z"),
        })

        const res = await request(app)
          .post(`/api/hackathons/${H_ID}/register`)
          .set(asUser("user-1"))

        expect(res.status).toBe(400)
        expect(res.body).toEqual({
          success: false,
          message: "Registration deadline has passed",
        })
        expect(mockPrisma.hackathonRegistration.create).not.toHaveBeenCalled()
      })
    })

    describe("POST /api/hackathons/join", () => {
      it("returns 400 when joinCode is missing", async () => {
        const res = await request(app)
          .post("/api/hackathons/join")
          .set(asUser("user-1"))
          .send({})

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
        expect(res.body.error).toBe("Validation failed")
        expect(res.body.fields.joinCode).toBeDefined()
        expect(mockPrisma.hackathon.findUnique).not.toHaveBeenCalled()
      })

      it("joins by join code (normalized to uppercase) and returns 201", async () => {
        mockPrisma.hackathon.findUnique.mockResolvedValue(activeHackathon)
        mockPrisma.hackathonRegistration.create.mockResolvedValue({
          userId: "user-1",
          hackathonId: H_ID,
        })
        mockPrisma.hackathonRegistration.count.mockResolvedValue(5)

        const res = await request(app)
          .post("/api/hackathons/join")
          .set(asUser("user-1"))
          .send({ joinCode: "  spring " })

        expect(res.status).toBe(201)
        expect(res.body.success).toBe(true)
        expect(res.body.message).toBe("Successfully registered for hackathon")
        expect(res.body.data.registered).toBe(true)
        expect(res.body.data.participantCount).toBe(5)
        expect(mockPrisma.hackathon.findUnique).toHaveBeenCalledWith({
          where: { joinCode: "SPRING" },
        })
      })

      it("returns 404 for an unknown join code", async () => {
        mockPrisma.hackathon.findUnique.mockResolvedValue(null)

        const res = await request(app)
          .post("/api/hackathons/join")
          .set(asUser("user-1"))
          .send({ joinCode: "NOPE99" })

        expect(res.status).toBe(404)
        expect(res.body).toEqual({
          success: false,
          message: "Invalid join code",
        })
      })
    })
  })

  describe("GET /api/projects", () => {
    it("lists the user's projects with computed progress", async () => {
      mockPrisma.team.findMany.mockResolvedValue([
        {
          id: "team-1",
          projects: [
            {
              id: "proj-1",
              title: "A",
              tasks: [{ status: "DONE" }, { status: "TODO" }],
            },
            { id: "proj-2", title: "B", tasks: [] },
          ],
        },
      ])

      const res = await request(app).get("/api/projects").set(asUser("user-1"))

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(2)
      expect(res.body.data[0].progress).toBe(50)
      expect(res.body.data[1].progress).toBe(0)
      expect(mockPrisma.team.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      )
    })
  })

  describe("GET /api/projects/:projectId", () => {
    it("returns 404 when the project does not exist", async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .get("/api/projects/proj-404")
        .set(asUser("user-1"))

      expect(res.status).toBe(404)
      expect(res.body).toEqual({ success: false, message: "Project not found" })
    })

    it("returns a project with computed progress", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: "proj-1",
        title: "Cool App",
        teamId: "team-1",
        team: {
          id: "team-1",
          ownerId: "user-1",
          members: [{ userId: "user-1" }],
        },
        tasks: [
          { status: "DONE" },
          { status: "DONE" },
          { status: "TODO" },
          { status: "TODO" },
        ],
        submission: null,
      })

      const res = await request(app)
        .get("/api/projects/proj-1")
        .set(asUser("user-1"))

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.title).toBe("Cool App")
      expect(res.body.data.progress).toBe(50)
    })
  })

  describe("POST /api/projects/submit", () => {
    it("submits a project for judging", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: "proj-1",
        teamId: "team-1",
        team: {
          id: "team-1",
          ownerId: "user-1",
          members: [{ userId: "user-1" }],
        },
        submission: null,
      })
      mockPrisma.submission.create.mockResolvedValue({
        id: "sub-1",
        projectId: "proj-1",
        status: "PENDING",
      })

      const res = await request(app)
        .post("/api/projects/submit")
        .set(asUser("user-1"))
        .send({ projectId: "proj-1", githubUrl: "https://github.com/u/r" })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toBe(
        "Project successfully submitted for judging"
      )
      expect(res.body.data.submission.status).toBe("PENDING")
      expect(mockPrisma.submission.create).toHaveBeenCalledTimes(1)
    })

    it("returns 409 when the project was already submitted", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: "proj-1",
        teamId: "team-1",
        team: {
          id: "team-1",
          ownerId: "user-1",
          members: [{ userId: "user-1" }],
        },
        submission: null,
      })
      mockPrisma.submission.create.mockRejectedValue(
        new PrismaClientKnownRequestError("Unique constraint failed", "P2002")
      )

      const res = await request(app)
        .post("/api/projects/submit")
        .set(asUser("user-1"))
        .send({ projectId: "proj-1", githubUrl: "https://github.com/u/r" })

      expect(res.status).toBe(409)
      expect(res.body).toEqual({
        success: false,
        message: "This project has already been submitted",
      })
    })
  })

  describe("PATCH /api/projects/tasks", () => {
    it("returns 400 when taskId and status are missing", async () => {
      const res = await request(app)
        .patch("/api/projects/tasks")
        .set(asUser("user-1"))
        .send({})

      expect(res.status).toBe(400)
      expect(res.body).toEqual({
        success: false,
        message: "Task ID and status are required",
      })
      expect(mockPrisma.task.update).not.toHaveBeenCalled()
    })

    it("updates task status and returns recomputed progress", async () => {
      mockPrisma.task.update.mockResolvedValue({
        id: "t1",
        projectId: "proj-1",
        status: "IN_PROGRESS",
      })
      mockPrisma.task.findMany.mockResolvedValue([
        { status: "DONE" },
        { status: "TODO" },
      ])

      const res = await request(app)
        .patch("/api/projects/tasks")
        .set(asUser("user-1"))
        .send({ taskId: "t1", status: "in_progress" })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.message).toBe("Task updated successfully")
      expect(res.body.data.task.status).toBe("IN_PROGRESS")
      expect(res.body.data.progress).toBe(50)
      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "t1" },
          data: { status: "IN_PROGRESS" },
        })
      )
    })
  })

  describe("PATCH /api/projects/tasks/:taskId", () => {
    it("returns 400 for an invalid status enum value", async () => {
      const res = await request(app)
        .patch("/api/projects/tasks/t1")
        .set(asUser("user-1"))
        .send({ status: "bogus" })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toBe("Validation failed")
      expect(res.body.fields.status).toBeDefined()
      expect(mockPrisma.task.findUnique).not.toHaveBeenCalled()
      expect(mockPrisma.task.update).not.toHaveBeenCalled()
    })
  })

  describe("PATCH /api/projects/:projectId", () => {
    it("returns 400 when there is nothing to update", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: "proj-1",
        teamId: "team-1",
      })
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team-1",
        ownerId: "user-1",
        members: [],
      })

      const res = await request(app)
        .patch("/api/projects/proj-1")
        .set(asUser("user-1"))
        .send({})

      expect(res.status).toBe(400)
      expect(res.body).toEqual({
        success: false,
        message: "No fields to update",
      })
      expect(mockPrisma.project.update).not.toHaveBeenCalled()
    })
  })

  describe("DELETE /api/projects/:projectId", () => {
    it("deletes a project the user owns", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: "proj-1",
        teamId: "team-1",
      })
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team-1",
        ownerId: "user-1",
        members: [],
      })
      mockPrisma.project.delete.mockResolvedValue({ id: "proj-1" })

      const res = await request(app)
        .delete("/api/projects/proj-1")
        .set(asUser("user-1"))

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toEqual({
        id: "proj-1",
        message: "Project deleted successfully",
      })
      expect(mockPrisma.project.delete).toHaveBeenCalledWith({
        where: { id: "proj-1" },
      })
    })

    it("returns 401 when the user is not a team member", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: "proj-1",
        teamId: "team-1",
      })
      mockPrisma.team.findUnique.mockResolvedValue({
        id: "team-1",
        ownerId: "owner-9",
        members: [{ userId: "someone-else" }],
      })

      const res = await request(app)
        .delete("/api/projects/proj-1")
        .set(asUser("user-1"))

      expect(res.status).toBe(401)
      expect(res.body).toEqual({
        success: false,
        message: "You must be a member of the team to perform this action",
      })
      expect(mockPrisma.project.delete).not.toHaveBeenCalled()
    })
  })

  describe("GET /api/projects/teams/:teamId", () => {
    it("returns 404 when the team does not exist", async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .get("/api/projects/teams/team-404")
        .set(asUser("user-1"))

      expect(res.status).toBe(404)
      expect(res.body).toEqual({ success: false, message: "Team not found" })
    })
  })
})
