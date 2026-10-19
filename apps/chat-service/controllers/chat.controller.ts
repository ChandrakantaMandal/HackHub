import { Request, Response, NextFunction } from "express"
import prisma from "@workspace/database"
import { ForbiddenError, NotFoundError } from "@workspace/error-handler"
import { authorizeRoomAccess } from "../libs/rooms"
import { historyQuerySchema } from "@workspace/utils"
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
