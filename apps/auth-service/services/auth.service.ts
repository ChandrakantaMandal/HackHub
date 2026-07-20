import bcrypt from "bcrypt"
import prisma from "@workspace/database"
import {
  ConflictError,
  ValidationError,
  AuthError,
  NotFoundError,
  DatabaseError,
} from "@workspace/error-handler"
import {
  saveRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
} from "@workspace/redis"
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "@workspace/utils"

import crypto from "crypto"

interface RegisterDTO {
  username: string
  email: string
  password: string
}

interface LoginDTO {
  email: string
  password: string
}

class AuthService {
  async register(data: RegisterDTO) {
    try {
      const { email, password, username } = data

      if (!email || !password || !username) {
        throw new ValidationError("Name, email and password are required")
      }

      if (password.length < 8) {
        throw new ValidationError("Password must be at least 8 characters")
      }

      const existingAccount = await prisma.account.findUnique({
        where: {
          email,
        },
      })

      if (existingAccount) {
        throw new ConflictError("Email already registered")
      }

      const passwordHash = await bcrypt.hash(password, 12)

      const account = await prisma.account.create({
        data: {
          email,
          passwordHash,
          user: {
            create: {
              username,
            },
          },
        },

        include: {
          user: true,
        },
      })

      return {
        id: account.id,
        email: account.email,
        user: account.user,
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }

      throw new DatabaseError("Unable to create account", error)
    }
  }

  async login(data: LoginDTO) {
    try {
      const { email, password } = data

      const account = await prisma.account.findUnique({
        where: {
          email,
        },
      })

      if (!account) {
        throw new AuthError("Invalid email or password")
      }

      const valid = await bcrypt.compare(password, account.passwordHash)

      if (!valid) {
        throw new AuthError("Invalid email or password")
      }

      const accessToken = generateAccessToken(account.id)

      const refreshToken = generateRefreshToken(account.id)

      const sessionId = crypto.randomUUID()

      await saveRefreshToken(account.id, sessionId, refreshToken)

      return {
        accessToken,

        refreshToken,

        sessionId,
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }

      throw new DatabaseError("Login failed", error)
    }
  }

  async refresh(accountId: string, sessionId: string, token: string) {
    try {
      if (!token) {
        throw new AuthError("Refresh token required")
      }

      const storedToken = await getRefreshToken(accountId, sessionId)

      if (!storedToken) {
        throw new AuthError("Refresh token expired")
      }

      if (storedToken !== token) {
        throw new AuthError("Invalid refresh token")
      }

      verifyRefreshToken(token)

      await deleteRefreshToken(accountId, sessionId)
      const newAccessToken = generateAccessToken(accountId)
      const newRefreshToken = generateRefreshToken(accountId)
      await saveRefreshToken(accountId, sessionId, newRefreshToken)

      return {
        accessToken: newAccessToken,

        refreshToken: newRefreshToken,
      }
    } catch (error) {
      throw new AuthError("Refresh token expired or invalid")
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
      where: {
        id: accountId,
      },

      include: {
        user: true,
      },
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
