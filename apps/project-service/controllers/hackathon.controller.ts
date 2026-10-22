import { Request, Response, NextFunction } from "express"
import HackathonService from "../services/hackathon.service"

class HackathonController {
  // GET /api/hackathons — public; personalized when a token was verified.
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id
      const data = await HackathonService.listActive(userId)
      return res.status(200).json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  // GET /api/hackathons/mine — hackathons the caller registered for.
  async mine(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id
      const data = await HackathonService.listMine(userId)
      return res.status(200).json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  // POST /api/hackathons/join — register via join code.
  async join(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id
      const data = await HackathonService.registerByCode(
        userId,
        req.body.joinCode
      )
      return res.status(201).json({
        success: true,
        data,
        message: "Successfully registered for hackathon",
      })
    } catch (error) {
      next(error)
    }
  }

  // POST /api/hackathons/:id/register — register by id.
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id
      const data = await HackathonService.register(
        userId,
        req.params.id as string
      )
      return res.status(201).json({
        success: true,
        data,
        message: "Successfully registered for hackathon",
      })
    } catch (error) {
      next(error)
    }
  }
}

export default new HackathonController()
