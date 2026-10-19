import { Request, Response, NextFunction } from "express"
import JudgeService from "../services/judge.service"

class JudgeController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await JudgeService.register(req.body)
      return res.status(201).json({
        success: true,
        message: "Judge registration successful",
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await JudgeService.login(req.body)
      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async listSubmissions(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await JudgeService.listSubmissions()
      return res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async scoreSubmission(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id
      const result = await JudgeService.scoreSubmission({
        submissionId: String(req.params.submissionId),
        userId,
        scores: req.body,
      })
      return res.status(200).json({
        success: true,
        message: "Score submitted successfully",
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async awardBadge(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id
      const result = await JudgeService.awardBadge({
        submissionId: String(req.params.submissionId),
        userId,
        name: req.body.name,
        description: req.body.description,
      })
      return res.status(201).json({
        success: true,
        message: "Badge awarded successfully",
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async revokeBadge(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id
      const result = await JudgeService.revokeBadge({
        submissionId: String(req.params.submissionId),
        badgeId: String(req.params.badgeId),
        userId,
      })
      return res.status(200).json({
        success: true,
        message: "Badge revoked successfully",
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async getLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await JudgeService.getLeaderboard()
      return res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }
}

export default new JudgeController()
