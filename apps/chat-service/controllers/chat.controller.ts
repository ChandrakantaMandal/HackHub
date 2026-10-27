import { Request, Response, NextFunction } from "express"
import prisma from "@workspace/database"
import { ForbiddenError, NotFoundError } from "@workspace/error-handler"
import { authorizeRoomAccess } from "../libs/rooms"
import {
  historyQuerySchema,
  startDmSchema,
  userSearchQuerySchema,
} from "@workspace/utils"
import * as chatService from "../services/chat.service"

// GET /api/chat/rooms/:room/messages?limit&before
// Paginated message history. Authorization is derived from the room name
// (see libs/rooms.ts) against the x-user-id / x-user-role headers set by
// the gateway. 403 = not allowed; 404 = room has no messages yet (never joined).
export const getMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const room = String(req.params.room)
    const user = (req as any).user as { id: string; role: string }

    const authz = await authorizeRoomAccess(prisma, room, user.id, user.role)
    if (!authz.ok) {
      throw new ForbiddenError(authz.error)
    }

    const parsed = historyQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        fields: parsed.error.flatten().fieldErrors,
      })
    }

    const messages = await chatService.getRoomMessages(room, parsed.data)
    if (messages === null) {
      throw new NotFoundError("Room not found")
    }

    res.status(200).json({ success: true, data: messages })
  } catch (error) {
    next(error)
  }
}

// GET /api/chat/conversations
// Team rooms + 1:1 dm rooms for the authenticated user (left rail).
export const getConversations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user as { id: string; role: string }
    const data = await chatService.getConversations(user.id)
    res.status(200).json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

// GET /api/chat/unread
// Aggregated unread badge data: { total, byRoom } keyed by room name.
export const getUnread = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user as { id: string; role: string }
    const data = await chatService.getUnreadSummary(user.id)
    res.status(200).json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

// GET /api/chat/users?query=
// People directory (excluding self) for starting new conversations.
export const searchUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user as { id: string; role: string }

    const parsed = userSearchQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        fields: parsed.error.flatten().fieldErrors,
      })
    }

    const data = await chatService.searchUsers(user.id, parsed.data.query)
    res.status(200).json({ success: true, data })
  } catch (error) {
    next(error)
  }
}

// POST /api/chat/dm  { userId }
// Lazily creates (or returns) the canonical dm_ room for a 1:1 conversation.
export const startDm = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user as { id: string; role: string }

    const parsed = startDmSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        fields: parsed.error.flatten().fieldErrors,
      })
    }

    const data = await chatService.startDm(user.id, parsed.data.userId)
    res.status(201).json({ success: true, data })
  } catch (error) {
    next(error)
  }
}
