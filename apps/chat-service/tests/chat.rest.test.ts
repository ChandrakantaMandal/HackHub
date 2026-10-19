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
      room: model(),
      message: model(),
      teamMember: model(),
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
    CHAT_SERVICE_PORT: 5005,
  },
}))

vi.mock("@workspace/database", () => ({
  default: mockPrisma,
}))

import app from "../src/app"

const TEAM_ID = "11111111-1111-4111-8111-111111111111"
const ROOM = `team_${TEAM_ID}`

const asUser = (id: string, role: string) => ({
  "x-user-id": id,
  "x-user-role": role,
})

describe("chat-service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /health", () => {
    it("returns healthy", async () => {
      const res = await request(app).get("/health")
      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        status: "healthy",
        service: "chat-service",
      })
    })
  })

  describe("GET /api/chat/rooms/:room/messages", () => {
    it("returns 401 without user context", async () => {
      const res = await request(app).get(`/api/chat/rooms/${ROOM}/messages`)
      expect(res.status).toBe(401)
    })

    it("returns 403 when not a team member", async () => {
      mockPrisma.teamMember.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .get(`/api/chat/rooms/${ROOM}/messages`)
        .set(asUser("u1", "PARTICIPANT"))

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })

    it("returns messages for a team member", async () => {
      const t1 = new Date("2026-10-19T10:00:00Z")
      const t2 = new Date("2026-10-19T10:01:00Z")
      mockPrisma.teamMember.findUnique.mockResolvedValue({
        teamId: TEAM_ID,
        userId: "u1",
      })
      mockPrisma.room.findUnique.mockResolvedValue({ id: "r1", name: ROOM })
      // service queries desc + reverses, so mock returns desc order
      mockPrisma.message.findMany.mockResolvedValue([
        { id: "m2", content: "hello", senderId: "u2", createdAt: t2 },
        { id: "m1", content: "hi", senderId: "u1", createdAt: t1 },
      ])

      const res = await request(app)
        .get(`/api/chat/rooms/${ROOM}/messages`)
        .set(asUser("u1", "PARTICIPANT"))

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(2)
      // ascending order after reverse()
      expect(res.body.data[0].id).toBe("m1")
      expect(res.body.data[1].id).toBe("m2")
    })

    it("returns 404 for a room with no messages yet", async () => {
      mockPrisma.teamMember.findUnique.mockResolvedValue({
        teamId: TEAM_ID,
        userId: "u1",
      })
      mockPrisma.room.findUnique.mockResolvedValue(null)

      const res = await request(app)
        .get(`/api/chat/rooms/${ROOM}/messages`)
        .set(asUser("u1", "PARTICIPANT"))

      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toBe("Room not found")
    })

    it("returns 400 for invalid limit", async () => {
      mockPrisma.teamMember.findUnique.mockResolvedValue({
        teamId: TEAM_ID,
        userId: "u1",
      })

      const res = await request(app)
        .get(`/api/chat/rooms/${ROOM}/messages?limit=999`)
        .set(asUser("u1", "PARTICIPANT"))

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })
  })
})
