import { Router } from "express"
import AuthController from "../controllers/auth.controller"

import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from "@workspace/utils"

import { validate } from "../middleware/auth.middleware"

const router = Router()

router.post("/register", validate(registerSchema), AuthController.register)

router.post("/login", validate(loginSchema), AuthController.login)

router.post("/refresh", validate(refreshTokenSchema), AuthController.refresh)

router.post("/logout", AuthController.logout)
router.get("/profile", AuthController.profile)

export default router
