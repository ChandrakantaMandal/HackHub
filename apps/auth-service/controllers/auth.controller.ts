import { Request, Response, NextFunction } from "express"
import AuthService from "../services/auth.service"

class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.register(req.body)

      res.status(201).json({
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

      res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { accountId, sessionId, refreshToken } = req.body

      const result = await AuthService.refresh(
        accountId,
        sessionId,
        refreshToken
      )

      res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { accountId, sessionId } = req.body

      const result = await AuthService.logout(accountId, sessionId)

      res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async profile(req: Request, res: Response, next: NextFunction) {
    try {
      const accountId = (req as any).user.id // from auth middleware

      const result = await AuthService.getProfile(accountId)

      res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }
}

export default new AuthController()
