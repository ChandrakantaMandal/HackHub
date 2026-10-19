import { Router } from "express"
import { userContext } from "../middleware/chat.middleware"
import * as chatController from "../controllers/chat.controller"

const router = Router()

// All chat REST routes require user context (gateway authMiddleware verified the
// token and injected x-user-id / x-user-role; chat-service performs no JWT
// verification on the REST path — Socket.io does that itself at handshake).
router.get("/rooms/:room/messages", userContext, chatController.getMessages)

export default router
