import { Request, Response, NextFunction } from "express"
import ProjectService from "../services/project.service"

class ProjectController {
  async createTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id
      const result = await ProjectService.createTeam({
        name: req.body.name,
        userId,
      })
      return res.status(201).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async joinTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id
      const result = await ProjectService.joinTeam({
        inviteCode: req.body.inviteCode,
        userId,
      })
      return res.status(200).json({
        success: true,
        message: "Successfully joined team",
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async getTeamDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProjectService.getTeamDetails(
        String(req.params.teamId)
      )
      return res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async createProject(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id
      const { title, description, category, tags, teamId } = req.body
      const result = await ProjectService.createProject({
        title,
        description,
        category,
        tags,
        teamId,
        userId,
      })
      return res.status(201).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async submitProject(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id
      const { projectId, githubUrl, liveDemoUrl } = req.body
      const result = await ProjectService.submitProject({
        projectId,
        githubUrl,
        liveDemoUrl,
        userId,
      })
      return res.status(201).json({
        success: true,
        message: "Project successfully submitted for judging",
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async updateTaskStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id
      const { taskId, status } = req.body
      const result = await ProjectService.updateTaskStatus({
        taskId,
        status,
        userId,
      })
      return res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }
}

export default new ProjectController()
