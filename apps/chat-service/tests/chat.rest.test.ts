import { describe, it, expect, vi, beforeEach } from "vitest"
import request from "supertest"

const { mockPrisma, mockHttpLogger } = vi.hoisted(() => {
  const model = () => ({
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
  })
  return {
    mockPrisma: {
      user: model(),
      room: model(),
      message: model(),
      teamMember: model(),
      roomRead: model(),
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
import { dmRoomName } from "../libs/rooms"

const TEAM_ID = "11111111-1111-4111-8111-111111111111"
const ROOM = `team_${TEAM_ID}`
const ME = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const STRANGER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const DM_ROOM = dmRoomName(ME, OTHER)

const asUser = (id: string, role: string) => ({
  "x-user-id": id,
  "x-user-role": role,
})

let mockRole = "PARTICIPANT"

describe("chat-service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRole = "PARTICIPANT"
    // userContext resolves x-user-id (an *account* id) via user.findUnique({
    // where: { accountId } }); other lookups (startDm target, etc.) use
    // where: { id } and default to null unless a test overrides them.
    mockPrisma.user.findUnique.mockImplementation((args: any) => {
      if (args?.where?.accountId !== undefined) {
        return Promise.resolve({ id: args.where.accountId, role: mockRole })
      }
      return Promise.resolve(null)
    })
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

  describe("user context", () => {
    it("returns 401 for an unknown account", async () => {
      mockPrisma.user.findUnique.mockImplementation(() => Promise.resolve(null))

      const res = await request(app)
        .get(`/api/chat/rooms/${ROOM}/messages`)
        .set(asUser("u1", "PARTICIPANT"))

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })
  })

  describe("DM rooms", () => {
    it("returns history for a DM participant", async () => {
      const t1 = new Date("2026-10-20T10:00:00Z")
      mockPrisma.room.findUnique.mockResolvedValue({
        id: "rdm",
        name: DM_ROOM,
      })
      mockPrisma.message.findMany.mockResolvedValue([
        { id: "m1", content: "hey", senderId: OTHER, createdAt: t1 },
      ])

      const res = await request(app)
        .get(`/api/chat/rooms/${DM_ROOM}/messages`)
        .set(asUser(ME, "PARTICIPANT"))

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].content).toBe("hey")
      // dm branch must not consult team membership
      expect(mockPrisma.teamMember.findUnique).not.toHaveBeenCalled()
    })

    it("rejects a non-participant from a DM room", async () => {
      const res = await request(app)
        .get(`/api/chat/rooms/${DM_ROOM}/messages`)
        .set(asUser(STRANGER, "PARTICIPANT"))

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
      expect(mockPrisma.room.findUnique).not.toHaveBeenCalled()
    })
  })

  describe("GET /api/chat/conversations", () => {
    it("returns team and DM conversations", async () => {
      const t = new Date("2026-10-20T12:00:00Z")
      mockPrisma.teamMember.findMany.mockResolvedValue([
        {
          teamId: TEAM_ID,
          userId: ME,
          joinedAt: new Date("2026-10-01T00:00:00Z"),
          team: {
            id: TEAM_ID,
            name: "Night",
            members: [
              { user: { id: ME, username: "me", name: "Me", avatar: null } },
            ],
          },
        },
      ])
      mockPrisma.room.findMany
        .mockResolvedValueOnce([{ id: "rdm", name: DM_ROOM }]) // dm rooms
        .mockResolvedValueOnce([{ id: "rteam", name: ROOM }]) // team room rows
      mockPrisma.user.findMany.mockResolvedValue([
        { id: OTHER, username: "other", name: "Other", avatar: null },
      ])
      mockPrisma.message.findFirst.mockResolvedValue({
        content: "yo",
        createdAt: t,
      })
      // Unread: DM has 4 unseen messages; team room was read after its last.
      mockPrisma.roomRead.findMany.mockResolvedValue([
        { roomId: "rdm", lastReadAt: new Date(0) },
        { roomId: "rteam", lastReadAt: t },
      ])
      mockPrisma.message.count.mockImplementation((args: any) =>
        Promise.resolve(args.where.roomId === "rdm" ? 4 : 1)
      )

      const res = await request(app)
        .get("/api/chat/conversations")
        .set(asUser(ME, "PARTICIPANT"))

      expect(res.status).toBe(200)
      expect(res.body.data.teams).toHaveLength(1)
      expect(res.body.data.teams[0]).toMatchObject({
        room: `team_${TEAM_ID}`,
        teamId: TEAM_ID,
        name: "Night",
        unread: 1,
      })
      expect(res.body.data.dms).toHaveLength(1)
      expect(res.body.data.dms[0]).toMatchObject({
        room: DM_ROOM,
        user: { id: OTHER, username: "other" },
        lastMessage: { content: "yo" },
        unread: 4,
      })
      // DM lookup: dm_ prefix + participant match, channel_ rooms excluded
      expect(mockPrisma.room.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: "DIRECT",
            name: { startsWith: "dm_" },
          }),
        })
      )
    })

    it("returns empty lists when the user has no conversations", async () => {
      mockPrisma.teamMember.findMany.mockResolvedValue([])
      mockPrisma.room.findMany.mockResolvedValue([])

      const res = await request(app)
        .get("/api/chat/conversations")
        .set(asUser(ME, "PARTICIPANT"))

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual({ teams: [], dms: [] })
    })
  })

  describe("GET /api/chat/unread", () => {
    it("returns total and per-room unread counts", async () => {
      mockPrisma.teamMember.findMany.mockResolvedValue([{ teamId: TEAM_ID }])
      mockPrisma.room.findMany
        .mockResolvedValueOnce([{ id: "rdm", name: DM_ROOM }])
        .mockResolvedValueOnce([{ id: "rteam", name: ROOM }])
      mockPrisma.roomRead.findMany.mockResolvedValue([
        { roomId: "rdm", lastReadAt: new Date(0) },
      ])
      mockPrisma.message.count.mockImplementation((args: any) =>
        Promise.resolve(args.where.roomId === "rdm" ? 3 : 2)
      )

      const res = await request(app)
        .get("/api/chat/unread")
        .set(asUser(ME, "PARTICIPANT"))

      expect(res.status).toBe(200)
      expect(res.body.data.total).toBe(5)
      expect(res.body.data.byRoom).toEqual({
        [DM_ROOM]: 3,
        [ROOM]: 2,
      })
    })

    it("returns zeros when the user has no rooms", async () => {
      mockPrisma.teamMember.findMany.mockResolvedValue([])
      mockPrisma.room.findMany.mockResolvedValue([])

      const res = await request(app)
        .get("/api/chat/unread")
        .set(asUser(ME, "PARTICIPANT"))

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual({ total: 0, byRoom: {} })
    })
  })

  describe("GET /api/chat/users", () => {
    it("searches users excluding self", async () => {
      mockPrisma.teamMember.findMany.mockResolvedValue([])
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: OTHER,
          username: "other",
          name: "Other",
          avatar: null,
          role: "PARTICIPANT",
        },
      ])

      const res = await request(app)
        .get("/api/chat/users?query=oth")
        .set(asUser(ME, "PARTICIPANT"))

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      // role is used for filtering but never leaks to the client
      expect(res.body.data[0]).not.toHaveProperty("role")
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ NOT: { id: ME } }),
        })
      )
    })

    it("hides judges and admins from plain participants", async () => {
      mockPrisma.teamMember.findMany.mockResolvedValue([])
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: OTHER,
          username: "peer",
          name: "Peer",
          avatar: null,
          role: "PARTICIPANT",
        },
        {
          id: STRANGER,
          username: "judy",
          name: "Judy",
          avatar: null,
          role: "JUDGE",
        },
      ])

      const res = await request(app)
        .get("/api/chat/users?query=u")
        .set(asUser(ME, "PARTICIPANT"))

      expect(res.status).toBe(200)
      expect(res.body.data.map((u: any) => u.id)).toEqual([OTHER])
    })

    it("returns 400 for an empty query", async () => {
      const res = await request(app)
        .get("/api/chat/users?query=")
        .set(asUser(ME, "PARTICIPANT"))

      expect(res.status).toBe(400)
      expect(res.body.error).toBe("Validation failed")
    })
  })

  describe("POST /api/chat/dm", () => {
    it("creates the canonical DM room (201)", async () => {
      mockPrisma.teamMember.findMany.mockResolvedValue([])
      mockPrisma.user.findUnique.mockImplementation((args: any) => {
        if (args?.where?.accountId !== undefined) {
          return Promise.resolve({ id: args.where.accountId, role: mockRole })
        }
        if (args?.where?.id === OTHER) {
          return Promise.resolve({
            id: OTHER,
            username: "other",
            name: "Other",
            avatar: null,
            role: "PARTICIPANT",
          })
        }
        return Promise.resolve(null)
      })
      mockPrisma.room.upsert.mockResolvedValue({
        id: "rdm",
        name: DM_ROOM,
        type: "DIRECT",
      })

      const res = await request(app)
        .post("/api/chat/dm")
        .set(asUser(ME, "PARTICIPANT"))
        .send({ userId: OTHER })

      expect(res.status).toBe(201)
      expect(res.body.data.room).toBe(DM_ROOM)
      expect(res.body.data.user).toMatchObject({ id: OTHER })
      // role used for the permission check never leaks to the client
      expect(res.body.data.user).not.toHaveProperty("role")
      expect(mockPrisma.room.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { name: DM_ROOM } })
      )
    })

    describe("permission matrix", () => {
      // Mocks both users with the given roles; leaders = user ids that own a
      // team (TeamRole.LEADER membership).
      const mockActors = (
        roles: Record<string, string>,
        leaders: string[] = []
      ) => {
        mockPrisma.user.findUnique.mockImplementation((args: any) => {
          if (args?.where?.accountId !== undefined) {
            return Promise.resolve({ id: args.where.accountId, role: mockRole })
          }
          const id = args?.where?.id
          const role = roles[id]
          if (!id || !role) return Promise.resolve(null)
          return Promise.resolve({
            id,
            username: `u-${id.slice(0, 4)}`,
            name: null,
            avatar: null,
            role,
          })
        })
        mockPrisma.teamMember.findMany.mockResolvedValue(
          leaders.map((userId) => ({ userId, role: "LEADER" }))
        )
      }

      it("blocks a participant from DMing a judge", async () => {
        mockActors({ [ME]: "PARTICIPANT", [OTHER]: "JUDGE" })

        const res = await request(app)
          .post("/api/chat/dm")
          .set(asUser(ME, "PARTICIPANT"))
          .send({ userId: OTHER })

        expect(res.status).toBe(403)
        expect(res.body.message).toBe("You cannot message this user")
        expect(mockPrisma.room.upsert).not.toHaveBeenCalled()
      })

      it("blocks a participant (non-leader) from DMing an admin", async () => {
        mockActors({ [ME]: "PARTICIPANT", [OTHER]: "ADMIN" })

        const res = await request(app)
          .post("/api/chat/dm")
          .set(asUser(ME, "PARTICIPANT"))
          .send({ userId: OTHER })

        expect(res.status).toBe(403)
      })

      it("allows a team leader to DM an admin", async () => {
        mockActors({ [ME]: "PARTICIPANT", [OTHER]: "ADMIN" }, [ME])
        mockPrisma.room.upsert.mockResolvedValue({
          id: "rdm",
          name: DM_ROOM,
          type: "DIRECT",
        })

        const res = await request(app)
          .post("/api/chat/dm")
          .set(asUser(ME, "PARTICIPANT"))
          .send({ userId: OTHER })

        expect(res.status).toBe(201)
      })

      it("blocks a judge from DMing a participant", async () => {
        mockActors({ [ME]: "JUDGE", [OTHER]: "PARTICIPANT" })

        const res = await request(app)
          .post("/api/chat/dm")
          .set(asUser(ME, "JUDGE"))
          .send({ userId: OTHER })

        expect(res.status).toBe(403)
      })

      it("allows a judge to DM another judge", async () => {
        mockActors({ [ME]: "JUDGE", [OTHER]: "JUDGE" })
        mockPrisma.room.upsert.mockResolvedValue({
          id: "rdm",
          name: DM_ROOM,
          type: "DIRECT",
        })

        const res = await request(app)
          .post("/api/chat/dm")
          .set(asUser(ME, "JUDGE"))
          .send({ userId: OTHER })

        expect(res.status).toBe(201)
      })

      it("allows an admin to DM a judge", async () => {
        mockActors({ [ME]: "ADMIN", [OTHER]: "JUDGE" })
        mockPrisma.room.upsert.mockResolvedValue({
          id: "rdm",
          name: DM_ROOM,
          type: "DIRECT",
        })

        const res = await request(app)
          .post("/api/chat/dm")
          .set(asUser(ME, "ADMIN"))
          .send({ userId: OTHER })

        expect(res.status).toBe(201)
      })

      it("blocks an admin from DMing a participant who leads no team", async () => {
        mockActors({ [ME]: "ADMIN", [OTHER]: "PARTICIPANT" })

        const res = await request(app)
          .post("/api/chat/dm")
          .set(asUser(ME, "ADMIN"))
          .send({ userId: OTHER })

        expect(res.status).toBe(403)
      })

      it("allows an admin to DM a team leader", async () => {
        mockActors({ [ME]: "ADMIN", [OTHER]: "PARTICIPANT" }, [OTHER])
        mockPrisma.room.upsert.mockResolvedValue({
          id: "rdm",
          name: DM_ROOM,
          type: "DIRECT",
        })

        const res = await request(app)
          .post("/api/chat/dm")
          .set(asUser(ME, "ADMIN"))
          .send({ userId: OTHER })

        expect(res.status).toBe(201)
      })
    })

    it("returns 400 when messaging yourself", async () => {
      const res = await request(app)
        .post("/api/chat/dm")
        .set(asUser(ME, "PARTICIPANT"))
        .send({ userId: ME })

      expect(res.status).toBe(400)
      expect(res.body.message).toBe("Cannot message yourself")
      expect(mockPrisma.room.upsert).not.toHaveBeenCalled()
    })

    it("returns 404 for an unknown target user", async () => {
      const res = await request(app)
        .post("/api/chat/dm")
        .set(asUser(ME, "PARTICIPANT"))
        .send({ userId: STRANGER })

      expect(res.status).toBe(404)
      expect(res.body.message).toBe("User not found")
    })

    it("returns 400 for a non-uuid userId", async () => {
      const res = await request(app)
        .post("/api/chat/dm")
        .set(asUser(ME, "PARTICIPANT"))
        .send({ userId: "not-a-uuid" })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe("Validation failed")
      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1) // identity only
    })
  })
})
