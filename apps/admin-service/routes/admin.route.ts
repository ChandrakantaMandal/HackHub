import { Router } from "express"
import AdminController from "../controllers/admin.controller"
import {
  validate,
  userContext,
  requireAdmin,
} from "../middleware/admin.middleware"
import { createHackathonSchema, createJudgeSchema } from "../libs/schemas"

const router = Router()

router.use(userContext)

router.get("/hackathons", requireAdmin, AdminController.listHackathons)
router.post(
  "/hackathons",
  requireAdmin,
  validate(createHackathonSchema),
  AdminController.createHackathon
)

router.get("/judges", requireAdmin, AdminController.listJudges)
router.post(
  "/judges",
  requireAdmin,
  validate(createJudgeSchema),
  AdminController.createJudge
)

export default router
