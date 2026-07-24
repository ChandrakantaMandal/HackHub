import { Router } from "express"
import AuthController from "../controllers/auth.controller"

import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from "@workspace/utils"

import { validate } from "../middleware/auth.middleware"
import { verifyToken } from "../middleware/verifyToken"

const router = Router()

router.post("/register", validate(registerSchema), AuthController.register)

router.post("/login", validate(loginSchema), AuthController.login)

router.post("/refresh", validate(refreshTokenSchema), AuthController.refresh)

router.post("/send-otp", AuthController.sendOtp)
router.post("/verify-otp", AuthController.verifyOtp)

router.post("/reset-password", AuthController.resetPassword)

router.post("/logout", verifyToken, AuthController.logout)
router.get("/profile", verifyToken, AuthController.profile)

export default router
