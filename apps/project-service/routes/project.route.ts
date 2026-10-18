import { Router } from "express"
import ProjectController from "../controllers/project.controller"
import { validate, userContext } from "../middleware/project.middleware"

import {
  createTeamSchema,
  joinTeamSchema,
  createProjectSchema,
} from "../libs/validators"

const router = Router()

// Identity is injected by the API Gateway (x-user-id / x-user-role headers)
// after its authMiddleware verifies the JWT. No local token verification.
router.use(userContext)

// Team Routes (with validation middleware attached)
router.post("/teams", validate(createTeamSchema), ProjectController.createTeam)
router.post("/teams/join", validate(joinTeamSchema), ProjectController.joinTeam)
router.get("/teams/:teamId", ProjectController.getTeamDetails)

// Project Routes (with validation middleware attached)
router.post("/", validate(createProjectSchema), ProjectController.createProject)
router.post("/submit", ProjectController.submitProject)

// Task Routes
router.patch("/tasks", ProjectController.updateTaskStatus)

export default router
