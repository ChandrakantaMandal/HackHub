import { Router } from "express"
import HackathonController from "../controllers/hackathon.controller"
import {
  validate,
  userContext,
  optionalUserContext,
} from "../middleware/project.middleware"
import { joinHackathonSchema } from "@workspace/utils"

const router = Router()

// GETs are public (the gateway only attaches identity when a token was sent);
// mutations require a verified user identity injected by the gateway.
router.get("/", optionalUserContext, HackathonController.list)
router.get("/mine", userContext, HackathonController.mine)
router.post(
  "/join",
  userContext,
  validate(joinHackathonSchema),
  HackathonController.join
)
// Static paths are registered before the parameterized route.
router.get(
  "/:id/leaderboard",
  optionalUserContext,
  HackathonController.leaderboard
)
router.post("/:id/register", userContext, HackathonController.register)

export default router
