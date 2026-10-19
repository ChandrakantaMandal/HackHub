import { Server as HTTPServer } from "node:http"
import { Server as SocketIOServer, Socket } from "socket.io"
import { verifyAccessToken } from "@workspace/utils"
import { env } from "@workspace/config"
import prisma from "@workspace/database"
import { ForbiddenError } from "@workspace/error-handler"
import { authorizeRoomAccess } from "../libs/rooms"
import { ensureRoom, saveMessage } from "../services/chat.service"

type AuthedSocket = Socket & {
  data: { user: { id: string; role: string } }
}

// Presence is in-memory (single-process). Rooms are small (team/judge channels)
// so a Map of socketId->userId per room is sufficient.
const presence = new Map<string, Map<string, string>>()

const onlineUsers = (room: string): string[] => {
  const sockets = presence.get(room)
  if (!sockets) return []
  return [...new Set(sockets.values())]
}

const emitPresence = (io: SocketIOServer, room: string) => {
  io.to(room).emit("presence_update", { room, online: onlineUsers(room) })
}

const addPresence = (room: string, socketId: string, userId: string) => {
  if (!presence.has(room)) presence.set(room, new Map())
  presence.get(room)!.set(socketId, userId)
}

const removePresence = (room: string, socketId: string) => {
  presence.get(room)?.delete(socketId)
  if (presence.get(room)?.size === 0) presence.delete(room)
}

export const setupChatSocket = (server: HTTPServer) => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
  })

  // Chat service is the exception to the "gateway-only JWT" rule: the gateway
  // only proxies the HTTP upgrade, so the handshake token is verified here.
  io.use((socket, next) => {
    try {
      const auth = socket.handshake.auth as { token?: string }
      const header = socket.handshake.headers.authorization
      const token =
        auth.token ??
        (header?.startsWith("Bearer ") ? header.slice(7) : undefined)

      if (!token) return next(new Error("Unauthorized"))

      const payload = verifyAccessToken(token, env.ACCESS_SECRET)
      ;(socket as AuthedSocket).data.user = {
        id: payload.id,
        role: payload.role ?? "PARTICIPANT",
      }
      next()
    } catch {
      next(new Error("Unauthorized"))
    }
  })

  io.on("connection", (socket) => {
    const authed = socket as AuthedSocket
    const { id: userId, role } = authed.data.user

    authed.on(
      "join_room",
      async (payload: { room?: string }, ack?: (res: unknown) => void) => {
        try {
          const room = payload?.room
          if (!room || typeof room !== "string") {
            authed.emit("error", { message: "Invalid room" })
            ack?.({ success: false, error: "Invalid room" })
            return
          }

          const authz = await authorizeRoomAccess(prisma, room, userId, role)
          if (!authz.ok) {
            authed.emit("error", { message: authz.error })
            ack?.({ success: false, error: authz.error })
            return
          }

          await ensureRoom(room)
          authed.join(room)
          addPresence(room, authed.id, userId)
          authed.emit("joined", { room, online: onlineUsers(room) })
          emitPresence(io, room)
          ack?.({ success: true, room, online: onlineUsers(room) })
        } catch (error) {
          authed.emit("error", { message: "Internal error" })
          ack?.({ success: false, error: "Internal error" })
        }
      }
    )

    authed.on(
      "leave_room",
      (payload: { room?: string }, ack?: (res: unknown) => void) => {
        const room = payload?.room
        if (!room || typeof room !== "string") {
          ack?.({ success: false, error: "Invalid room" })
          return
        }
        authed.leave(room)
        removePresence(room, authed.id)
        emitPresence(io, room)
        ack?.({ success: true })
      }
    )

    authed.on("typing", (payload: { room?: string; isTyping?: boolean }) => {
      const room = payload?.room
      if (!room || typeof room !== "string") return
      if (!authed.rooms.has(room)) return
      authed.to(room).emit("typing", {
        room,
        userId,
        isTyping: payload?.isTyping === true,
      })
    })

    authed.on(
      "send_message",
      async (
        payload: { room?: string; content?: string },
        ack?: (res: unknown) => void
      ) => {
        try {
          const room = payload?.room
          const content = payload?.content
          if (
            !room ||
            typeof room !== "string" ||
            !content ||
            typeof content !== "string"
          ) {
            authed.emit("error", { message: "Invalid message payload" })
            ack?.({ success: false, error: "Invalid message payload" })
            return
          }

          if (!authed.rooms.has(room)) {
            authed.emit("error", { message: "Not in room" })
            ack?.({ success: false, error: "Not in room" })
            return
          }

          // Re-check authorization at send time (membership may have changed
          // since join_room).
          const authz = await authorizeRoomAccess(prisma, room, userId, role)
          if (!authz.ok) {
            authed.emit("error", { message: authz.error })
            ack?.({ success: false, error: authz.error })
            return
          }

          const dbRoom = await ensureRoom(room)
          const message = await saveMessage(dbRoom.id, userId, content)

          io.to(room).emit("message", {
            id: message.id,
            room,
            senderId: message.senderId,
            content: message.content,
            createdAt: message.createdAt,
          })
          ack?.({ success: true })
        } catch {
          authed.emit("error", { message: "Internal error" })
          ack?.({ success: false, error: "Internal error" })
        }
      }
    )

    authed.on("disconnect", () => {
      for (const room of authed.rooms) {
        if (room === authed.id) continue // skip socket's personal room
        removePresence(room, authed.id)
        emitPresence(io, room)
      }
    })
  })

  return io
}
