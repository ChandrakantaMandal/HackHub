import { Router } from "express"
import { userContext, validate } from "../middleware/showcase.middleware"
import { commentSchema } from "@workspace/utils"
import * as showcaseController from "../controllers/showcase.controller"

const router = Router()

// Public GET routes (no auth required — gateway authMiddleware is a no-op for GET)
router.get("/", showcaseController.list)
router.get("/leaderboard", showcaseController.leaderboard)
router.get("/stats", showcaseController.stats)

// Authenticated POST routes (require user context)
router.post("/:id/like", userContext, showcaseController.toggleLike)
router.post(
  "/:id/comment",
  userContext,
  validate(commentSchema),
  showcaseController.createComment
)

// Public GET with :id (after specific paths like /leaderboard and /stats)
router.get("/:id", showcaseController.getProject)
router.get("/:id/comments", showcaseController.getComments)

export default router
