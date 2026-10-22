import { Request, Response, NextFunction } from "express"
import AdminService from "../services/admin.service"
import type {
  CreateHackathonInput,
  CreateJudgeInput,
} from "../services/admin.service"

class AdminController {
  async listHackathons(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.listHackathons()

      return res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async createHackathon(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as CreateHackathonInput
      const result = await AdminService.createHackathon(data)

      return res.status(201).json({
        success: true,
        message: "Hackathon created",
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async listJudges(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.listJudges()

      return res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async createJudge(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as CreateJudgeInput
      const result = await AdminService.createJudge(data)

      return res.status(201).json({
        success: true,
        message: "Judge created",
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }
}

export default new AdminController()
