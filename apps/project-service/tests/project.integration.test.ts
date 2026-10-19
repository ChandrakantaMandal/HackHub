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
  })
  return {
    mockPrisma: {
      team: prismaModel(),
      project: prismaModel(),
      task: prismaModel(),
      submission: prismaModel(),
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

  describe("POST /api/projects", () => {
    const validProject = {
      title: "Cool App",
      description: "A description that is long enough",
      category: "web",
      tags: ["ai"],
      teamId: "team-1",
      userId: "user-1",
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
      mockPrisma.project.create.mockResolvedValue({
        id: "proj-1",
        title: "Cool App",
        teamId: "team-1",
      })

      const res = await request(app)
        .post("/api/projects")
        .set(asUser("user-1"))
        .send(validProject)

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.title).toBe("Cool App")
      expect(mockPrisma.project.create).toHaveBeenCalledTimes(1)
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
