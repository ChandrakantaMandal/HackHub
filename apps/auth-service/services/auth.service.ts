// services/auth.service.ts

import bcrypt from "bcrypt"

import { prisma } from "@workspace/database"

import {
  ConflictError,
  ValidationError,
  AuthError,
  NotFoundError,
  DatabaseError,
} from "@workspace/error-handler"

import { generateAccessToken, generateRefreshToken } from "../utils/jwt"

interface RegisterDTO {
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
      const { email, password } = data

      if (!email || !password) {
        throw new ValidationError("Email and password are required")
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
        },
      })

      return {
        id: account.id,

        email: account.email,
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

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,

          accountId: account.id,

          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })

      return {
        accessToken,

        refreshToken,
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }

      throw new DatabaseError("Login failed", error)
    }
  }

  async refreshToken(token: string) {
    try {
      if (!token) {
        throw new AuthError("Refresh token required")
      }

      const storedToken = await prisma.refreshToken.findUnique({
        where: {
          token,
        },

        include: {
          account: true,
        },
      })

      if (!storedToken) {
        throw new AuthError("Invalid refresh token")
      }

      verifyRefreshToken(token)

      const accessToken = generateAccessToken(storedToken.accountId)

      return {
        accessToken,
      }
    } catch (error) {
      throw new AuthError("Refresh token expired or invalid")
    }
  }

  async logout(token: string) {
    await prisma.refreshToken.delete({
      where: {
        token,
      },
    })

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
