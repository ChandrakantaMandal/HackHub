import { Request, Response, NextFunction } from "express"
import AuthService from "../services/auth.service"

class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.register(req.body)

      return res.status(201).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.login(req.body)

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken, sessionId } = req.body

      if (!refreshToken || !sessionId) {
        return res.status(400).json({
          success: false,
          message: "Refresh token and session ID are required",
        })
      }

      const result = await AuthService.refresh(refreshToken, sessionId)

      return res.status(200).json({
        success: true,
        message: "Token refreshed",
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user
      const { sessionId } = req.body

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: "Session ID is required",
        })
      }

      await AuthService.logout(user.id, sessionId)

      return res.status(200).json({
        success: true,
        message: "Logged out successfully",
      })
    } catch (error) {
      next(error)
    }
  }

  async profile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user

      const result = await AuthService.getProfile(user.id)

      return res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.verifyOtp(req.body)

      return res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.sendOtp(req.body)

      return res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }
}

export default new AuthController()
