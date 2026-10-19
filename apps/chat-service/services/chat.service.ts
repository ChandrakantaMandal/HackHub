import prisma from "@workspace/database"
import { ForbiddenError } from "@workspace/error-handler"
import { parseRoomName } from "../libs/rooms"
import type { HistoryQuery } from "@workspace/utils"

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
