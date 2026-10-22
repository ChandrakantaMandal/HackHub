import { Router } from "express"
import ProjectController from "../controllers/project.controller"
import { validate, userContext } from "../middleware/project.middleware"

import {
  createTeamSchema,
  joinTeamSchema,
  createProjectSchema,
  updateProjectSchema,
  createTaskSchema,
  updateTaskSchema,
} from "@workspace/utils"

const router = Router()

// Identity is injected by the API Gateway (x-user-id / x-user-role headers)
// after its authMiddleware verifies the JWT. No local token verification.
router.use(userContext)

// Team Routes (with validation middleware attached)
router.post("/teams", validate(createTeamSchema), ProjectController.createTeam)
router.post("/teams/join", validate(joinTeamSchema), ProjectController.joinTeam)
router.get("/teams", ProjectController.listTeams)
router.get("/teams/:teamId", ProjectController.getTeamDetails)
router.delete("/teams/:teamId", ProjectController.deleteTeam)
router.delete("/teams/:teamId/members/:userId", ProjectController.removeMember)

// Project Routes (with validation middleware attached)
router.post("/", validate(createProjectSchema), ProjectController.createProject)
router.post("/submit", ProjectController.submitProject)

// Task Routes — static "tasks" paths must be registered before the
// parameterized "/:projectId" routes so "tasks" is never parsed as an id.
router.patch("/tasks", ProjectController.updateTaskStatus)
router.post("/tasks", validate(createTaskSchema), ProjectController.createTask)
router.patch(
  "/tasks/:taskId",
  validate(updateTaskSchema),
  ProjectController.updateTask
)
router.delete("/tasks/:taskId", ProjectController.deleteTask)

// Project read/update/delete
router.get("/", ProjectController.listProjects)
router.get("/:projectId", ProjectController.getProject)
router.patch(
  "/:projectId",
  validate(updateProjectSchema),
  ProjectController.updateProject
)
router.delete("/:projectId", ProjectController.deleteProject)

export default router
