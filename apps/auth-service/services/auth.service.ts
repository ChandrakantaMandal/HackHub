import bcrypt from "bcrypt"
import prisma, { Prisma } from "@workspace/database"
import {
  ConflictError,
  ValidationError,
  AuthError,
  NotFoundError,
  DatabaseError,
} from "@workspace/error-handler"

import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "@workspace/utils"
import { env } from "@workspace/config"

import {
  saveRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
} from "../libs/refreshToken"

import { saveOTP, verifyOTP, generateOTP } from "../libs/otp"
import { sendOtpEmail } from "../libs/email"
import { checkRateLimit } from "@workspace/redis"

import crypto from "crypto"
import { logger } from "@workspace/logger"

interface RegisterDTO {
  username: string
  email: string
  password: string
  confirmPassword: string
  judgeCode?: string
}

interface LoginDTO {
  email: string
  password: string
}

interface SendOtpDTO {
  email: string
}

type VerifyOtpDTO = {
  email: string
  otp: string
}

class AuthService {
  async register(data: RegisterDTO) {
    try {
      const { email, password, username, confirmPassword, judgeCode } = data

      // Validation
      if (!email || !password || !username || !confirmPassword) {
        throw new ValidationError("All fields are required")
      }

      if (password !== confirmPassword) {
        throw new ValidationError("Passwords do not match")
      }

      if (password.length < 8) {
        throw new ValidationError("Password must be at least 8 characters")
      }

      let isJudge = false
      if (judgeCode !== undefined) {
        const validCodes = String(env.JUDGE_CODES ?? "")
          .split(",")
          .map((code) => code.trim().toLowerCase())
          .filter(Boolean)

        if (!judgeCode || !validCodes.includes(judgeCode.toLowerCase())) {
          throw new ValidationError("Invalid judge code")
        }

        isJudge = true
      }

      // Check existing account
      const existingAccount = await prisma.account.findUnique({
        where: {
          email,
        },
      })

      if (existingAccount) {
        throw new ConflictError("Email already registered")
      }

      const existingUser = await prisma.user.findUnique({
        where: {
          username,
        },
      })

      if (existingUser) {
        throw new ConflictError("Username already taken")
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12)

      // Create account
      const account = await prisma.account.create({
        data: {
          email,
          passwordHash,

          user: {
            create: {
              username,
              role: isJudge ? "JUDGE" : "PARTICIPANT",
              ...(isJudge ? { judge: { create: {} } } : {}),
            },
          },
        },

        include: {
          user: true,
        },
      })

      // Generate OTP
      const otp = generateOTP()

      logger.info("Generated Register OTP")

      // Save OTP in Redis
      await saveOTP(`register:${email}`, otp)

      // Send OTP email (non-blocking — don't await)
      sendOtpEmail(email, otp).catch((err) => {
        logger.error("[REGISTER] Failed to send OTP email:", err)
      })

      return {
        id: account.id,
        email: account.email,
        user: account.user,
        message: "Account created. OTP sent to email",
      }
    } catch (error) {
      if (error instanceof Error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          const target = (error.meta?.target as string[]) ?? []
          if (target.includes("email")) {
            throw new ConflictError("Email already registered")
          }
          if (target.includes("username")) {
            throw new ConflictError("Username already taken")
          }
          throw new ConflictError("Account already exists")
        }
        throw error
      }

      throw new DatabaseError("Unable to create account", error)
    }
  }

  async login(data: LoginDTO) {
    try {
      const { email, password } = data

      const account = await prisma.account.findUnique({
        where: { email },
        include: { user: true },
      })

      if (!account) {
        throw new AuthError("Invalid email or password")
      }

      if (!account.isVerified) {
        throw new AuthError("Please verify your email before logging in")
      }

      const valid = await bcrypt.compare(password, account.passwordHash)

      if (!valid) {
        throw new AuthError("Invalid email or password")
      }

      const accessToken = generateAccessToken(
        account.id,
        env.ACCESS_SECRET,
        account.user?.role
      )
      const refreshToken = generateRefreshToken(account.id, env.REFRESH_SECRET)
      const sessionId = crypto.randomUUID()

      await saveRefreshToken(account.id, sessionId, refreshToken)

      return {
        accessToken,
        refreshToken,
        sessionId,
      }
    } catch (error) {
      if (error instanceof Error) throw error
      throw new DatabaseError("Login failed", error)
    }
  }

  async refresh(refreshToken: string, sessionId: string) {
    try {
      if (!refreshToken) {
        throw new AuthError("Refresh token required")
      }

      const decoded = verifyRefreshToken(refreshToken, env.REFRESH_SECRET)
      const accountId = decoded.id

      const storedToken = await getRefreshToken(accountId, sessionId)

      if (!storedToken || storedToken !== refreshToken) {
        throw new AuthError("Invalid refresh token")
      }

      await deleteRefreshToken(accountId, sessionId)

      const user = await prisma.user.findUnique({ where: { accountId } })
      const newAccessToken = generateAccessToken(
        accountId,
        env.ACCESS_SECRET,
        user?.role
      )
      const newRefreshToken = generateRefreshToken(
        accountId,
        env.REFRESH_SECRET
      )

      await saveRefreshToken(accountId, sessionId, newRefreshToken)

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      }
    } catch (error) {
      if (error instanceof Error) throw error
      throw new AuthError("Refresh token expired or invalid")
    }
  }

  async sendOtp(
    data: SendOtpDTO & { purpose: "register" | "login" | "reset" }
  ) {
    const { email, purpose } = data

    if (!email) {
      throw new ValidationError("Email is required")
    }

    const rate = await checkRateLimit({
      key: `otp:${email}`,
      limit: 3,
      window: 300,
    })

    if (!rate.allowed) {
      throw new AuthError(`Too many requests. Try again in ${rate.reset}s`)
    }

    if (purpose !== "register") {
      const account = await prisma.account.findUnique({ where: { email } })
      if (!account) {
        return { message: "OTP sent if account exists" }
      }
    }

    const otp = generateOTP()

    await saveOTP(`${purpose}:${email}`, otp)

    // Send OTP email (non-blocking — don't await)
    sendOtpEmail(email, otp).catch((err) => {
      logger.error("[SEND_OTP] Failed to send OTP email:", err)
    })

    return {
      message: "OTP sent successfully",
    }
  }

  async verifyOtp(
    data: VerifyOtpDTO & { purpose: "register" | "login" | "reset" }
  ) {
    const { email, otp, purpose } = data

    if (!email || !otp) {
      throw new ValidationError("Email and OTP are required")
    }

    const isValid = await verifyOTP(`${purpose}:${email}`, otp)

    if (!isValid) {
      throw new AuthError("Invalid or expired OTP")
    }

    if (purpose === "register") {
      await prisma.account.update({
        where: { email },
        data: { isVerified: true },
      })
    }

    return {
      message: "OTP verified",
    }
  }

  async resetPassword(
    email: string,
    newPassword: string,
    confirmPassword: string,
    otp: string
  ) {
    if (newPassword !== confirmPassword) {
      throw new ValidationError("Passwords do not match")
    }

    const isValid = await verifyOTP(`reset:${email}`, otp)

    if (!isValid) {
      throw new AuthError("Invalid or expired OTP")
    }

    const account = await prisma.account.findUnique({
      where: { email },
    })

    if (!account) {
      throw new NotFoundError("Account not found")
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)

    await prisma.account.update({
      where: { email },
      data: { passwordHash },
    })

    return {
      message: "Password reset successful",
    }
  }

  async logout(accountId: string, sessionId: string) {
    await deleteRefreshToken(accountId, sessionId)

    return {
      message: "Logged out successfully",
    }
  }

  async getProfile(accountId: string) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { user: true },
    })

    if (!account) {
      throw new NotFoundError("User not found")
    }

    return {
      id: account.id,
      email: account.email,
      user: account.user,
    }
  }
}

export default new AuthService()
