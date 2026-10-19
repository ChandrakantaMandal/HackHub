import { describe, it, expect, vi, beforeEach } from "vitest"
import request from "supertest"

const { mockPrisma, mockHttpLogger } = vi.hoisted(() => {
  const model = () => ({
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
  })
  return {
    mockPrisma: {
      project: model(),
      showcaseProject: model(),
      like: model(),
      comment: model(),
      judgeScore: model(),
    },
    mockHttpLogger: vi.fn((req: any, res: any, next: any) => next()),
  }
})

vi.mock("@workspace/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  httpLogger: mockHttpLogger,
}))

vi.mock("@workspace/config", () => ({
  env: {
    CORS_ORIGIN: "http://localhost:3000",
    SHOWCASE_SERVICE_PORT: 5004,
  },
}))

vi.mock("@workspace/database", () => ({
  default: mockPrisma,
}))

import app from "../src/app"

const submittedProject = {
  id: "p1",
  title: "HackHub",
  description: "Monorepo platform",
  submission: { status: "APPROVED" },
}

describe("showcase-service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /health", () => {
    it("should return health status", async () => {
      const res = await request(app).get("/health")

      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        status: "healthy",
        service: "showcase-service",
      })
    })
  })

  describe("GET /api/showcase", () => {
    it("should list submitted projects with default sort", async () => {
      mockPrisma.project.findMany.mockResolvedValue([
        {
          id: "p1",
          title: "HackHub",
          description: "Monorepo platform",
          category: "DevTools",
          tags: ["typescript"],
          team: { id: "t1", name: "Team One" },
          submission: { id: "s1", status: "APPROVED", submittedAt: new Date() },
          showcase: { _count: { likes: 3, comments: 2 } },
        },
      ])

      const res = await request(app).get("/api/showcase")

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0]).toMatchObject({
        id: "p1",
        title: "HackHub",
        likes: 3,
        comments: 2,
        team: { id: "t1", name: "Team One" },
      })
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            submission: { status: { in: ["PENDING", "APPROVED"] } },
          }),
          orderBy: { submission: { submittedAt: "desc" } },
        })
      )
    })

    it("should apply search filter as OR across title/tags/team", async () => {
      mockPrisma.project.findMany.mockResolvedValue([])

      const res = await request(app).get("/api/showcase?search=ai")

      expect(res.status).toBe(200)
      const call = mockPrisma.project.findMany.mock.calls[0][0]
      expect(call.where.OR).toEqual([
        { title: { contains: "ai", mode: "insensitive" } },
        { tags: { has: "ai" } },
        { team: { name: { contains: "ai", mode: "insensitive" } } },
      ])
    })

    it("should apply category filter and likes sort", async () => {
      mockPrisma.project.findMany.mockResolvedValue([])

      const res = await request(app).get("/api/showcase?category=AI&sort=likes")

      expect(res.status).toBe(200)
      const call = mockPrisma.project.findMany.mock.calls[0][0]
      expect(call.where.category).toBe("AI")
      expect(call.orderBy).toEqual({ showcase: { likes: { _count: "desc" } } })
    })

    it("should return 400 for invalid sort", async () => {
      const res = await request(app).get("/api/showcase?sort=bogus")

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toBe("Validation failed")
    })
  })

  describe("GET /api/showcase/:id", () => {
    it("should return 404 for missing project", async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null)

      const res = await request(app).get("/api/showcase/nope")

      expect(res.status).toBe(404)
      expect(res.body.message).toBe("Project not found")
    })

    it("should return 404 for unsubmitted project", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: "p1",
        title: "HackHub",
        description: "Monorepo platform",
        submission: null,
      })

      const res = await request(app).get("/api/showcase/p1")

      expect(res.status).toBe(404)
    })

    it("should return project detail with counts and comments", async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: "p1",
        title: "HackHub",
        description: "Monorepo platform",
        category: "DevTools",
        tags: ["typescript"],
        team: {
          id: "t1",
          name: "Team One",
          owner: { id: "u1", username: "alice", name: "Alice", avatar: null },
        },
        submission: {
          id: "s1",
          status: "PENDING",
          submittedAt: new Date("2026-01-01"),
          githubUrl: "https://github.com/x/y",
          liveUrl: null,
          documentation: null,
        },
        showcase: {
          _count: { likes: 5, comments: 1 },
          comments: [
            {
              id: "c1",
              message: "great work",
              createdAt: new Date("2026-01-02"),
              user: {
                id: "u2",
                username: "bob",
                name: "Bob",
                avatar: null,
              },
            },
          ],
        },
      })

      const res = await request(app).get("/api/showcase/p1")

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toMatchObject({
        id: "p1",
        title: "HackHub",
        likes: 5,
        comments: 1,
      })
      expect(res.body.data.commentsList).toHaveLength(1)
      expect(res.body.data.commentsList[0].user.username).toBe("bob")
    })
  })

  describe("POST /api/showcase/:id/like", () => {
    it("should 401 without user context headers", async () => {
      const res = await request(app).post("/api/showcase/p1/like")

      expect(res.status).toBe(401)
      expect(res.body.error).toBe("Unauthorized: Missing user context")
    })

    it("should 404 for unsubmitted project", async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .post("/api/showcase/p1/like")
        .set("x-user-id", "u1")

      expect(res.status).toBe(404)
    })

    it("should create like when none exists (lazy upsert)", async () => {
      mockPrisma.project.findUnique.mockResolvedValue(submittedProject)
      mockPrisma.showcaseProject.upsert.mockResolvedValue({ id: "sc1" })
      mockPrisma.like.findUnique.mockResolvedValue(null)
      mockPrisma.like.create.mockResolvedValue({})
      mockPrisma.like.count.mockResolvedValue(4)

      const res = await request(app)
        .post("/api/showcase/p1/like")
        .set("x-user-id", "u1")

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual({
        projectId: "p1",
        liked: true,
        likesCount: 4,
      })
      expect(mockPrisma.showcaseProject.upsert).toHaveBeenCalledWith({
        where: { projectId: "p1" },
        create: {
          projectId: "p1",
          title: "HackHub",
          description: "Monorepo platform",
        },
        update: {},
      })
      expect(mockPrisma.like.create).toHaveBeenCalledWith({
        data: { showcaseId: "sc1", userId: "u1" },
      })
    })

    it("should remove existing like (toggle off)", async () => {
      mockPrisma.project.findUnique.mockResolvedValue(submittedProject)
      mockPrisma.showcaseProject.upsert.mockResolvedValue({ id: "sc1" })
      mockPrisma.like.findUnique.mockResolvedValue({ id: "l1" })
      mockPrisma.like.delete.mockResolvedValue({})
      mockPrisma.like.count.mockResolvedValue(3)

      const res = await request(app)
        .post("/api/showcase/p1/like")
        .set("x-user-id", "u1")

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual({
        projectId: "p1",
        liked: false,
        likesCount: 3,
      })
      expect(mockPrisma.like.delete).toHaveBeenCalledWith({
        where: { id: "l1" },
      })
      expect(mockPrisma.like.create).not.toHaveBeenCalled()
    })
  })

  describe("POST /api/showcase/:id/comment", () => {
    it("should 401 without user context", async () => {
      const res = await request(app)
        .post("/api/showcase/p1/comment")
        .send({ message: "hi" })

      expect(res.status).toBe(401)
    })

    it("should 400 for empty message", async () => {
      const res = await request(app)
        .post("/api/showcase/p1/comment")
        .set("x-user-id", "u1")
        .send({ message: "" })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe("Validation failed")
    })

    it("should 400 for message over 2000 chars", async () => {
      const res = await request(app)
        .post("/api/showcase/p1/comment")
        .set("x-user-id", "u1")
        .send({ message: "x".repeat(2001) })

      expect(res.status).toBe(400)
    })

    it("should create comment and return 201", async () => {
      mockPrisma.project.findUnique.mockResolvedValue(submittedProject)
      mockPrisma.showcaseProject.upsert.mockResolvedValue({ id: "sc1" })
      mockPrisma.comment.create.mockResolvedValue({
        id: "c1",
        message: "great work",
        createdAt: new Date("2026-01-02"),
        user: { id: "u1", username: "alice", name: "Alice", avatar: null },
      })

      const res = await request(app)
        .post("/api/showcase/p1/comment")
        .set("x-user-id", "u1")
        .send({ message: "great work" })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toMatchObject({
        id: "c1",
        projectId: "p1",
        message: "great work",
      })
      expect(mockPrisma.comment.create).toHaveBeenCalledWith({
        data: { showcaseId: "sc1", userId: "u1", message: "great work" },
        include: {
          user: {
            select: { id: true, username: true, name: true, avatar: true },
          },
        },
      })
    })
  })

  describe("GET /api/showcase/:id/comments", () => {
    it("should 404 for unsubmitted project", async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null)

      const res = await request(app).get("/api/showcase/p1/comments")

      expect(res.status).toBe(404)
    })

    it("should return empty list when no showcase row exists", async () => {
      mockPrisma.project.findUnique.mockResolvedValue(submittedProject)
      mockPrisma.showcaseProject.findUnique.mockResolvedValue(null)

      const res = await request(app).get("/api/showcase/p1/comments")

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
      expect(mockPrisma.comment.findMany).not.toHaveBeenCalled()
    })

    it("should return comments newest first", async () => {
      mockPrisma.project.findUnique.mockResolvedValue(submittedProject)
      mockPrisma.showcaseProject.findUnique.mockResolvedValue({ id: "sc1" })
      mockPrisma.comment.findMany.mockResolvedValue([
        {
          id: "c2",
          message: "newer",
          createdAt: new Date(),
          user: { id: "u2", username: "bob", name: "Bob", avatar: null },
        },
        {
          id: "c1",
          message: "older",
          createdAt: new Date(),
          user: { id: "u1", username: "alice", name: "Alice", avatar: null },
        },
      ])

      const res = await request(app).get("/api/showcase/p1/comments")

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(2)
      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { showcaseId: "sc1" },
          orderBy: { createdAt: "desc" },
        })
      )
    })
  })

  describe("GET /api/showcase/leaderboard", () => {
    it("should rank projects by average score", async () => {
      mockPrisma.judgeScore.findMany.mockResolvedValue([
        {
          finalScore: 80,
          submission: { project: { id: "p1", title: "Alpha" } },
        },
        {
          finalScore: 90,
          submission: { project: { id: "p1", title: "Alpha" } },
        },
        {
          finalScore: 60,
          submission: { project: { id: "p2", title: "Beta" } },
        },
      ])

      const res = await request(app).get("/api/showcase/leaderboard")

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(2)
      expect(res.body.data[0]).toMatchObject({
        rank: 1,
        projectId: "p1",
        title: "Alpha",
        averageScore: 85,
        scoreCount: 2,
      })
      expect(res.body.data[1]).toMatchObject({
        rank: 2,
        projectId: "p2",
        averageScore: 60,
        scoreCount: 1,
      })
    })

    it("should return empty leaderboard when no scores", async () => {
      mockPrisma.judgeScore.findMany.mockResolvedValue([])

      const res = await request(app).get("/api/showcase/leaderboard")

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })
  })

  describe("GET /api/showcase/stats", () => {
    it("should aggregate counts", async () => {
      mockPrisma.project.count.mockResolvedValue(12)
      mockPrisma.like.count.mockResolvedValue(40)
      mockPrisma.comment.count.mockResolvedValue(25)

      const res = await request(app).get("/api/showcase/stats")

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual({
        projects: 12,
        likes: 40,
        comments: 25,
      })
      expect(mockPrisma.project.count).toHaveBeenCalledWith({
        where: { submission: { status: { in: ["PENDING", "APPROVED"] } } },
      })
    })
  })
})
