import prisma from "@workspace/database"
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@workspace/error-handler"
import { dmRoomName, parseRoomName } from "../libs/rooms"
import { canDm, type DmActor } from "../libs/permissions"
import type { HistoryQuery } from "@workspace/utils"

// A participant is a "leader" if they own at least one team (TeamRole.LEADER
// membership). Roles come from User.role; leadership is derived from TeamMember.
const leaderIds = async (userIds: string[]): Promise<Set<string>> => {
  if (userIds.length === 0) return new Set()
  const rows = await prisma.teamMember.findMany({
    where: { userId: { in: userIds }, role: "LEADER" },
    select: { userId: true },
  })
  return new Set(rows.map((r) => r.userId))
}

const dmActor = (role: string, isLeader: boolean): DmActor => ({
  role: role === "ADMIN" || role === "JUDGE" ? role : "PARTICIPANT",
  isLeader,
})

// Rooms are lazy-created on first join/history access (name is the unique key).
// The RoomType is derived from the room-name protocol — see libs/rooms.ts.
export const ensureRoom = async (roomName: string) => {
  const identity = parseRoomName(roomName)
  if (!identity) {
    throw new ForbiddenError("Invalid room name")
  }

  const type =
    identity.kind === "team"
      ? ("TEAM" as const)
      : identity.kind === "judge"
        ? ("JUDGE" as const)
        : ("DIRECT" as const)

  return prisma.room.upsert({
    where: { name: roomName },
    create: { name: roomName, type },
    update: {},
  })
}

export const saveMessage = async (
  roomId: string,
  senderId: string,
  content: string
) => {
  return prisma.message.create({
    data: { roomId, senderId, content },
  })
}

export const getRoomMessages = async (
  roomName: string,
  query: HistoryQuery
) => {
  const room = await prisma.room.findUnique({ where: { name: roomName } })
  if (!room) {
    return null
  }

  const messages = await prisma.message.findMany({
    where: {
      roomId: room.id,
      ...(query.before ? { createdAt: { lt: query.before } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: query.limit,
  })

  return messages.reverse()
}

export type ChatUserSummary = {
  id: string
  username: string
  name: string
  avatar: string | null
}

// Upsert the user's read cursor for a room (called when they join/focus it).
export const touchRoomRead = async (userId: string, roomName: string) => {
  const room = await ensureRoom(roomName)
  await prisma.roomRead.upsert({
    where: { userId_roomId: { userId, roomId: room.id } },
    create: { userId, roomId: room.id, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  })
  return room
}

// Unread count per room: messages newer than the user's last read cursor that
// the user did not send themselves. Rooms with no cursor count everything —
// the user has never opened them.
const unreadByRoom = async (
  userId: string,
  rooms: { id: string; name: string }[]
): Promise<Record<string, number>> => {
  if (rooms.length === 0) return {}
  const reads = await prisma.roomRead.findMany({
    where: { userId, roomId: { in: rooms.map((r) => r.id) } },
    select: { roomId: true, lastReadAt: true },
  })
  const lastRead = new Map(reads.map((r) => [r.roomId, r.lastReadAt]))

  const counts = await Promise.all(
    rooms.map(async (room) => {
      const n = await prisma.message.count({
        where: {
          roomId: room.id,
          senderId: { not: userId },
          createdAt: { gt: lastRead.get(room.id) ?? new Date(0) },
        },
      })
      return [room.name, n] as const
    })
  )
  return Object.fromEntries(counts)
}

// Aggregated badge data for the app sidebar: total unread across every
// readable room + per-room breakdown keyed by room name.
export const getUnreadSummary = async (userId: string) => {
  const me = userId.toLowerCase()

  const [teamRows, dmRooms] = await Promise.all([
    prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    }),
    prisma.room.findMany({
      where: {
        type: "DIRECT",
        name: { startsWith: "dm_" },
        OR: [
          { name: { startsWith: `dm_${me}_` } },
          { name: { endsWith: `_${me}` } },
        ],
      },
      select: { id: true, name: true },
    }),
  ])

  const teamRoomNames = teamRows.map((m) => `team_${m.teamId}`)
  const teamRooms = teamRoomNames.length
    ? await prisma.room.findMany({
        where: { name: { in: teamRoomNames } },
        select: { id: true, name: true },
      })
    : []

  const byRoom = await unreadByRoom(userId, [...teamRooms, ...dmRooms])
  const total = Object.values(byRoom).reduce((sum, n) => sum + n, 0)
  return { total, byRoom }
}

// Left-rail conversation list: teams the user belongs to (canonical team_<id>
// rooms) plus their 1:1 dm_ rooms. DM rooms are matched via the denormalized
// name (dm_<lower me>_<other> in either order) — the dm_ prefix keeps
// channel_<team>_<judge> rooms ending in _<me> out of the result set.
export const getConversations = async (userId: string) => {
  const me = userId.toLowerCase()

  const [teamRows, dmRooms] = await Promise.all([
    prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            members: {
              select: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    name: true,
                    avatar: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.room.findMany({
      where: {
        type: "DIRECT",
        name: { startsWith: "dm_" },
        OR: [
          { name: { startsWith: `dm_${me}_` } },
          { name: { endsWith: `_${me}` } },
        ],
      },
      select: { id: true, name: true },
    }),
  ])

  const teams = teamRows.map((m) => ({
    room: `team_${m.team.id}`,
    teamId: m.team.id,
    name: m.team.name,
    members: m.team.members.map((mm) => mm.user),
  }))

  const dmEntries = dmRooms
    .map((r) => {
      const identity = parseRoomName(r.name)
      if (!identity || identity.kind !== "dm") return null
      const other = identity.userA === me ? identity.userB : identity.userA
      return { roomId: r.id, room: r.name, other }
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)

  const otherIds = [...new Set(dmEntries.map((e) => e.other))]

  // Room rows for team rooms are lazy (created on first join); DM rooms
  // already exist (they were queried). Unread = 0 for rooms never created.
  const teamRoomNames = teams.map((t) => t.room)
  const teamRooms = teamRoomNames.length
    ? await prisma.room.findMany({
        where: { name: { in: teamRoomNames } },
        select: { id: true, name: true },
      })
    : []
  const unread = await unreadByRoom(userId, [
    ...teamRooms,
    ...dmEntries.map((e) => ({ id: e.roomId, name: e.room })),
  ])

  const otherUsers = otherIds.length
    ? await prisma.user.findMany({
        where: { id: { in: otherIds } },
        select: { id: true, username: true, name: true, avatar: true },
      })
    : []
  const userById = new Map(otherUsers.map((u) => [u.id, u]))

  const dms = await Promise.all(
    dmEntries.map(async (e) => {
      const user = userById.get(e.other)
      if (!user) return null
      const lastMessage = await prisma.message.findFirst({
        where: { roomId: e.roomId },
        orderBy: { createdAt: "desc" },
        select: { content: true, createdAt: true },
      })
      return { room: e.room, user, lastMessage }
    })
  )

  return {
    teams: teams.map((t) => ({ ...t, unread: unread[t.room] ?? 0 })),
    dms: dms
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .map((d) => ({ ...d, unread: unread[d.room] ?? 0 }))
      .sort(
        (a, b) =>
          (b.lastMessage?.createdAt.getTime() ?? 0) -
          (a.lastMessage?.createdAt.getTime() ?? 0)
      ),
  }
}

// People directory for starting new DMs — excludes self, optional case-
// insensitive substring match on username or display name. Filtered by the
// DM permission matrix so users never see people they cannot message.
export const searchUsers = async (meId: string, query?: string) => {
  const me = await prisma.user.findUnique({
    where: { id: meId },
    select: { role: true },
  })
  const meLeaders = await leaderIds([meId])
  const meActor = dmActor(me?.role ?? "PARTICIPANT", meLeaders.has(meId))

  // Over-fetch (matrix filtering happens after the DB query) then trim.
  const candidates = await prisma.user.findMany({
    where: {
      NOT: { id: meId },
      ...(query
        ? {
            OR: [
              { username: { contains: query, mode: "insensitive" as const } },
              { name: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    select: { id: true, username: true, name: true, avatar: true, role: true },
    orderBy: { username: "asc" },
    take: 100,
  })

  const targetLeaders = await leaderIds(candidates.map((u) => u.id))

  return candidates
    .filter((u) => canDm(meActor, dmActor(u.role, targetLeaders.has(u.id))))
    .slice(0, 20)
    .map(({ role: _role, ...summary }) => summary)
}

// Lazily create (or reuse) the canonical dm_ room for a 1:1 conversation.
export const startDm = async (meId: string, targetId: string) => {
  if (meId.toLowerCase() === targetId.toLowerCase()) {
    throw new BadRequestError("Cannot message yourself")
  }

  const [me, target] = await Promise.all([
    prisma.user.findUnique({
      where: { id: meId },
      select: { id: true, role: true },
    }),
    prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        username: true,
        name: true,
        avatar: true,
        role: true,
      },
    }),
  ])
  if (!target) {
    throw new NotFoundError("User not found")
  }

  const [meLeaders, targetLeaders] = await Promise.all([
    leaderIds([meId]),
    leaderIds([targetId]),
  ])
  const allowed = canDm(
    dmActor(me?.role ?? "PARTICIPANT", meLeaders.has(meId)),
    dmActor(target.role, targetLeaders.has(targetId))
  )
  if (!allowed) {
    throw new ForbiddenError("You cannot message this user")
  }

  const room = await ensureRoom(dmRoomName(meId, targetId))
  const { role: _role, ...summary } = target
  return { room: room.name, user: summary }
}
