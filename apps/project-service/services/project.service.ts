import prisma, { Prisma } from "@workspace/database"
import {
  ConflictError,
  ValidationError,
  NotFoundError,
  DatabaseError,
  AuthError,
} from "@workspace/error-handler"
import { logger } from "@workspace/logger"

interface CreateTeamDTO {
  name: string
  userId: string
}

interface JoinTeamDTO {
  inviteCode: string
  userId: string
}

interface CreateProjectDTO {
  title: string
  description: string
  category: string
  tags: string[]
  teamId: string
  userId: string
}

interface UpdateTaskDTO {
  taskId: string
  status: "todo" | "in_progress" | "completed"
  userId: string
}

interface SubmitProjectDTO {
  projectId: string
  githubUrl: string
  liveDemoUrl: string
  userId: string
}

class ProjectService {
  async createTeam(data: CreateTeamDTO) {
    try {
      const { name, userId } = data

      if (!name || !userId) {
        throw new ValidationError("Team name and user ID are required")
      }

      const inviteCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()

      const team = await prisma.team.create({
        data: {
          name,
          inviteCode,
          ownerId: userId,
          members: {
            create: { userId, role: "OWNER" },
          },
        },
        include: {
          members: true,
        },
      })

      logger.info(
        `[TEAM_CREATE] Team created: ${name} (${inviteCode}) by user ${userId}`
      )
      return team
    } catch (error) {
      if (error instanceof Error) throw error
      throw new DatabaseError("Unable to create team", error)
    }
  }

  async joinTeam(data: JoinTeamDTO) {
    try {
      const { inviteCode, userId } = data

      if (!inviteCode || !userId) {
        throw new ValidationError("Invite code and user ID are required")
      }

      const team = await prisma.team.findUnique({
        where: { inviteCode: inviteCode.toUpperCase() },
        include: { members: true },
      })

      if (!team) {
        throw new NotFoundError("Invalid or expired invite code")
      }

      const isAlreadyMember = team.members.some(
        (member) => member.userId === userId
      )
      if (isAlreadyMember) {
        throw new ConflictError("User is already a member of this team")
      }

      const updatedTeam = await prisma.team.update({
        where: { id: team.id },
        data: {
          members: {
            create: { userId },
          },
        },
        include: {
          members: true,
        },
      })

      logger.info(`[TEAM_JOIN] User ${userId} joined team ${team.name}`)
      return updatedTeam
    } catch (error) {
      if (error instanceof Error) throw error
      throw new DatabaseError("Unable to join team", error)
    }
  }

  async createProject(data: CreateProjectDTO) {
    try {
      const { title, description, category, tags, teamId, userId } = data

      if (!title || !description || !category || !teamId) {
        throw new ValidationError(
          "All required project fields must be provided"
        )
      }

      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: { members: true },
      })

      if (!team) {
        throw new NotFoundError("Team not found")
      }

      const isAuthorized =
        team.members.some((m) => m.userId === userId) || team.ownerId === userId
      if (!isAuthorized) {
        throw new AuthError(
          "You must be a member of the team to create a project"
        )
      }

      const project = await prisma.project.create({
        data: {
          title,
          description,
          category,
          tags,
          teamId,
        },
      })

      logger.info(
        `[PROJECT_CREATE] Project created: ${title} for team ${team.name}`
      )
      return project
    } catch (error) {
      if (error instanceof Error) throw error
      throw new DatabaseError("Unable to create project", error)
    }
  }

  async updateTaskStatus(data: UpdateTaskDTO) {
    try {
      const { taskId, status } = data

      if (!taskId || !status) {
        throw new ValidationError("Task ID and status are required")
      }

      const statusMap: Record<
        UpdateTaskDTO["status"],
        "TODO" | "IN_PROGRESS" | "DONE"
      > = {
        todo: "TODO",
        in_progress: "IN_PROGRESS",
        completed: "DONE",
      }

      const task = await prisma.task.update({
        where: { id: taskId },
        data: { status: statusMap[status] },
      })

      const allTasks = await prisma.task.findMany({
        where: { projectId: task.projectId },
      })

      const completedCount = allTasks.filter((t) => t.status === "DONE").length
      const progress =
        allTasks.length > 0
          ? Math.round((completedCount / allTasks.length) * 100)
          : 0

      logger.info(
        `[TASK_UPDATE] Task ${taskId} status changed to ${status}. New progress: ${progress}%`
      )
      return {
        task,
        progress,
        message: "Task updated successfully",
      }
    } catch (error) {
      if (error instanceof Error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new NotFoundError("Task not found")
        }
        throw error
      }
      throw new DatabaseError("Unable to update task status", error)
    }
  }

  async submitProject(data: SubmitProjectDTO) {
    try {
      const { projectId, githubUrl, liveDemoUrl } = data

      if (!projectId || !githubUrl) {
        throw new ValidationError(
          "Project ID and GitHub repository URL are required"
        )
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
      })

      if (!project) {
        throw new NotFoundError("Project not found")
      }

      const submission = await prisma.submission.create({
        data: {
          projectId,
          githubUrl,
          liveUrl: liveDemoUrl || null,
          status: "PENDING",
          submittedAt: new Date(),
        },
      })

      logger.info(
        `[PROJECT_SUBMIT] Project submitted for judging: ${projectId}`
      )
      return {
        submission,
        message: "Project successfully submitted for judging!",
      }
    } catch (error) {
      if (error instanceof Error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new ConflictError("This project has already been submitted")
        }
        throw error
      }
      throw new DatabaseError("Unable to submit project", error)
    }
  }

  async getTeamDetails(teamId: string) {
    if (!teamId) {
      throw new ValidationError("Team ID is required")
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: true,
        projects: {
          include: {
            tasks: true,
            submission: true,
          },
        },
      },
    })

    if (!team) {
      throw new NotFoundError("Team not found")
    }

    return team
  }
}

export default new ProjectService()
