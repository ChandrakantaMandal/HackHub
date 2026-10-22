import { Router } from "express"
import JudgeController from "../controllers/judge.controller"
import {
  validate,
  userContext,
  requireJudge,
} from "../middleware/judge.middleware"
import { loginSchema, scoreSchema, awardBadgeSchema } from "@workspace/utils"

const router = Router()

router.post("/login", validate(loginSchema), JudgeController.login)

router.use(userContext)

router.use(requireJudge)

router.get("/submissions", JudgeController.listSubmissions)
router.post(
  "/submissions/:submissionId/score",
  validate(scoreSchema),
  JudgeController.scoreSubmission
)
router.post(
  "/submissions/:submissionId/badge",
  validate(awardBadgeSchema),
  JudgeController.awardBadge
)
router.delete(
  "/submissions/:submissionId/badge/:badgeId",
  JudgeController.revokeBadge
)
router.get("/leaderboard", JudgeController.getLeaderboard)

export default router
