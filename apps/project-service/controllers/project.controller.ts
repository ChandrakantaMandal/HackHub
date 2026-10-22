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

  async listTeams(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id
      const result = await ProjectService.listTeams(userId)
      return res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async deleteTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id
      const result = await ProjectService.deleteTeam(
        String(req.params.teamId),
        userId
      )
      return res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id
      const result = await ProjectService.removeMember(
        String(req.params.teamId),
        String(req.params.userId),
        userId
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
      const { title, description, category, tags, teamId, hackathonId } =
        req.body
      const result = await ProjectService.createProject({
        title,
        description,
        category,
        tags,
        teamId,
        hackathonId,
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

  async listProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id
      const result = await ProjectService.listProjects(userId)
      return res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async getProject(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id
      const result = await ProjectService.getProject(
        String(req.params.projectId),
        userId
      )
      return res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async updateProject(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id
      const { title, description, category, tags } = req.body
      const result = await ProjectService.updateProject({
        projectId: String(req.params.projectId),
        title,
        description,
        category,
        tags,
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

  async deleteProject(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id
      const result = await ProjectService.deleteProject(
        String(req.params.projectId),
        userId
      )
      return res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  async createTask(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id
      const { projectId, title, description, assignedTo } = req.body
      const result = await ProjectService.createTask({
        projectId,
        title,
        description,
        assignedTo,
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

  async updateTask(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id
      const { title, description, status, assignedTo } = req.body
      const result = await ProjectService.updateTask({
        taskId: String(req.params.taskId),
        title,
        description,
        status,
        assignedTo,
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

  async deleteTask(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id
      const result = await ProjectService.deleteTask(
        String(req.params.taskId),
        userId
      )
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
