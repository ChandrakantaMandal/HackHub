import prisma, { Prisma } from "@workspace/database"
import {
  ConflictError,
  ValidationError,
  NotFoundError,
  DatabaseError,
  AuthError,
  ForbiddenError,
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
  hackathonId: string
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

interface UpdateProjectDTO {
  projectId: string
  title?: string
  description?: string
  category?: string
  tags?: string[]
  userId: string
}

interface CreateTaskDTO {
  projectId: string
  title: string
  description?: string
  assignedTo?: string
  userId: string
}

interface UpdateTaskFieldsDTO {
  taskId: string
  title?: string
  description?: string
  status?: "todo" | "in_progress" | "completed"
  assignedTo?: string | null
  userId: string
}

const TASK_STATUS_MAP = {
  todo: "TODO",
  in_progress: "IN_PROGRESS",
  completed: "DONE",
} as const

const TASK_STATUS_LABEL = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  DONE: "completed",
} as const

// The API contract exposes lowercase statuses ("todo" | "in_progress" |
// "completed") while Prisma stores the uppercase enum. Every task leaving
// this service goes through toTaskDto so clients never see raw enum values.
function toTaskDto<T extends { status: string }>(task: T) {
  return {
    ...task,
    status:
      TASK_STATUS_LABEL[task.status as keyof typeof TASK_STATUS_LABEL] ??
      "todo",
  }
}

function computeProgress(tasks: { status: string }[]): number {
  if (tasks.length === 0) return 0
  const completedCount = tasks.filter((t) => t.status === "DONE").length
  return Math.round((completedCount / tasks.length) * 100)
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
            create: { userId, role: "LEADER" },
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

  async listTeams(userId: string) {
    try {
      if (!userId) {
        throw new ValidationError("User ID is required")
      }

      const teams = await prisma.team.findMany({
        where: {
          OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                  avatar: true,
                  role: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })

      return teams
    } catch (error) {
      if (error instanceof Error) throw error
      throw new DatabaseError("Unable to list teams", error)
    }
  }

  async deleteTeam(teamId: string, userId: string) {
    try {
      if (!teamId || !userId) {
        throw new ValidationError("Team ID and user ID are required")
      }

      const team = await prisma.team.findUnique({
        where: { id: teamId },
      })

      if (!team) {
        throw new NotFoundError("Team not found")
      }

      if (team.ownerId !== userId) {
        throw new ForbiddenError("Only the team leader can delete this team")
      }

      await prisma.team.delete({ where: { id: teamId } })

      logger.info(`[TEAM_DELETE] Team ${teamId} deleted by owner ${userId}`)
      return {
        id: teamId,
        message: "Team deleted successfully",
      }
    } catch (error) {
      if (error instanceof Error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new NotFoundError("Team not found")
        }
        throw error
      }
      throw new DatabaseError("Unable to delete team", error)
    }
  }

  async removeMember(
    teamId: string,
    targetUserId: string,
    actorUserId: string
  ) {
    try {
      if (!teamId || !targetUserId || !actorUserId) {
        throw new ValidationError("Team ID and user ID are required")
      }

      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: { members: true },
      })

      if (!team) {
        throw new NotFoundError("Team not found")
      }

      const member = team.members.find((m) => m.userId === targetUserId)
      if (!member) {
        throw new NotFoundError("Team member not found")
      }

      if (targetUserId === actorUserId) {
        // Self-removal: members may leave, but the leader must delete the team.
        if (team.ownerId === actorUserId) {
          throw new ForbiddenError(
            "Leader cannot leave team; delete the team instead"
          )
        }
      } else if (team.ownerId !== actorUserId) {
        throw new ForbiddenError("Only the team leader can remove members")
      }

      await prisma.teamMember.delete({ where: { id: member.id } })

      logger.info(
        `[TEAM_MEMBER_REMOVE] User ${targetUserId} removed from team ${teamId} by ${actorUserId}`
      )
      return {
        teamId,
        userId: targetUserId,
        message: "Member removed from team",
      }
    } catch (error) {
      if (error instanceof Error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new NotFoundError("Team member not found")
        }
        throw error
      }
      throw new DatabaseError("Unable to remove team member", error)
    }
  }

  async createProject(data: CreateProjectDTO) {
    try {
      const {
        title,
        description,
        category,
        tags,
        teamId,
        hackathonId,
        userId,
      } = data

      if (!title || !description || !category || !teamId || !hackathonId) {
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

      const registration = await prisma.hackathonRegistration.findUnique({
        where: { userId_hackathonId: { userId, hackathonId } },
      })

      if (!registration) {
        throw new ValidationError(
          "You must register for this hackathon before creating a project"
        )
      }

      const project = await prisma.project.create({
        data: {
          title,
          description,
          category,
          tags,
          teamId,
          hackathonId,
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
      const { taskId, status, userId } = data

      if (!taskId || !status) {
        throw new ValidationError("Task ID and status are required")
      }

      const existing = await prisma.task.findUnique({
        where: { id: taskId },
        include: { project: { select: { teamId: true } } },
      })

      if (!existing) {
        throw new NotFoundError("Task not found")
      }

      const team = await this.assertTeamMember(existing.project.teamId, userId)

      const isLeader = team.ownerId === userId
      const isAssignee = existing.assignedTo === userId
      if (existing.assignedTo) {
        if (!isAssignee) {
          throw new ForbiddenError(
            "Only the assigned member can change this task's status"
          )
        }
      } else if (!isLeader) {
        throw new ForbiddenError(
          "Only the team leader can change the status of an unassigned task"
        )
      }

      const task = await prisma.task.update({
        where: { id: taskId },
        data: { status: TASK_STATUS_MAP[status] },
      })

      const allTasks = await prisma.task.findMany({
        where: { projectId: task.projectId },
      })

      const progress = computeProgress(allTasks)

      logger.info(
        `[TASK_UPDATE] Task ${taskId} status changed to ${status}. New progress: ${progress}%`
      )
      return {
        task: toTaskDto(task),
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
      const { projectId, githubUrl, liveDemoUrl, userId } = data

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

      const team = await this.assertTeamMember(project.teamId, userId)
      if (team.ownerId !== userId) {
        throw new ForbiddenError("Only the team leader can submit the project")
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

  private async assertTeamMember(teamId: string, userId: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true },
    })

    if (!team) {
      throw new NotFoundError("Team not found")
    }

    const isMember =
      team.ownerId === userId || team.members.some((m) => m.userId === userId)
    if (!isMember) {
      throw new AuthError(
        "You must be a member of the team to perform this action"
      )
    }

    return team
  }

  async listProjects(userId: string) {
    try {
      if (!userId) {
        throw new ValidationError("User ID is required")
      }

      const teams = await prisma.team.findMany({
        where: {
          OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        },
        include: {
          projects: {
            include: {
              tasks: true,
              submission: true,
            },
          },
        },
      })

      const projects = teams.flatMap((team) =>
        team.projects.map((project) => ({
          ...project,
          progress: computeProgress(project.tasks),
        }))
      )

      return projects
    } catch (error) {
      if (error instanceof Error) throw error
      throw new DatabaseError("Unable to list projects", error)
    }
  }

  async getProject(projectId: string, userId: string) {
    try {
      if (!projectId || !userId) {
        throw new ValidationError("Project ID and user ID are required")
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          tasks: true,
          submission: true,
          team: {
            include: {
              owner: {
                select: { id: true, username: true, name: true, avatar: true },
              },
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                      name: true,
                      avatar: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      if (!project) {
        throw new NotFoundError("Project not found")
      }

      const isMember =
        project.team.ownerId === userId ||
        project.team.members.some((m) => m.userId === userId)
      if (!isMember) {
        throw new AuthError(
          "You must be a member of the team to view this project"
        )
      }

      return {
        ...project,
        tasks: project.tasks.map((t) => toTaskDto(t)),
        progress: computeProgress(project.tasks),
      }
    } catch (error) {
      if (error instanceof Error) throw error
      throw new DatabaseError("Unable to fetch project", error)
    }
  }

  async updateProject(data: UpdateProjectDTO) {
    try {
      const { projectId, userId, title, description, category, tags } = data

      if (!projectId || !userId) {
        throw new ValidationError("Project ID and user ID are required")
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
      })

      if (!project) {
        throw new NotFoundError("Project not found")
      }

      await this.assertTeamMember(project.teamId, userId)

      const payload: Prisma.ProjectUpdateInput = {}
      if (title !== undefined) payload.title = title
      if (description !== undefined) payload.description = description
      if (category !== undefined) payload.category = category
      if (tags !== undefined) payload.tags = tags

      if (Object.keys(payload).length === 0) {
        throw new ValidationError("No fields to update")
      }

      const updated = await prisma.project.update({
        where: { id: projectId },
        data: payload,
      })

      logger.info(`[PROJECT_UPDATE] Project updated: ${projectId}`)
      return updated
    } catch (error) {
      if (error instanceof Error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new NotFoundError("Project not found")
        }
        throw error
      }
      throw new DatabaseError("Unable to update project", error)
    }
  }

  async deleteProject(projectId: string, userId: string) {
    try {
      if (!projectId || !userId) {
        throw new ValidationError("Project ID and user ID are required")
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
      })

      if (!project) {
        throw new NotFoundError("Project not found")
      }

      await this.assertTeamMember(project.teamId, userId)

      await prisma.project.delete({ where: { id: projectId } })

      logger.info(
        `[PROJECT_DELETE] Project ${projectId} deleted by user ${userId}`
      )
      return {
        id: projectId,
        message: "Project deleted successfully",
      }
    } catch (error) {
      if (error instanceof Error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new NotFoundError("Project not found")
        }
        throw error
      }
      throw new DatabaseError("Unable to delete project", error)
    }
  }

  async createTask(data: CreateTaskDTO) {
    try {
      const { projectId, userId, title, description, assignedTo } = data

      if (!projectId || !userId || !title) {
        throw new ValidationError("Project ID, user ID, and title are required")
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
      })

      if (!project) {
        throw new NotFoundError("Project not found")
      }

      const team = await this.assertTeamMember(project.teamId, userId)

      if (team.ownerId !== userId) {
        throw new ForbiddenError("Only the team leader can create tasks")
      }

      if (assignedTo) {
        const isTeamMember =
          team.ownerId === assignedTo ||
          team.members.some((m) => m.userId === assignedTo)
        if (!isTeamMember) {
          throw new ValidationError("Assignee must be a member of the team")
        }
      }

      const task = await prisma.task.create({
        data: {
          projectId,
          title,
          description: description ?? null,
          assignedTo: assignedTo ?? null,
        },
      })

      const allTasks = await prisma.task.findMany({
        where: { projectId },
      })

      logger.info(`[TASK_CREATE] Task "${title}" created in ${projectId}`)
      return {
        task: toTaskDto(task),
        progress: computeProgress(allTasks),
        message: "Task created successfully",
      }
    } catch (error) {
      if (error instanceof Error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          throw new NotFoundError("Project not found")
        }
        throw error
      }
      throw new DatabaseError("Unable to create task", error)
    }
  }

  async updateTask(data: UpdateTaskFieldsDTO) {
    try {
      const { taskId, userId, title, description, status, assignedTo } = data

      if (!taskId || !userId) {
        throw new ValidationError("Task ID and user ID are required")
      }

      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { project: { select: { teamId: true } } },
      })

      if (!task) {
        throw new NotFoundError("Task not found")
      }

      const team = await this.assertTeamMember(task.project.teamId, userId)
      const isLeader = team.ownerId === userId

      const payload: Prisma.TaskUpdateInput = {}
      if (title !== undefined) payload.title = title
      if (description !== undefined) payload.description = description

      if (status !== undefined) {
        const isAssignee = task.assignedTo === userId
        if (task.assignedTo) {
          if (!isAssignee) {
            throw new ForbiddenError(
              "Only the assigned member can change this task's status"
            )
          }
        } else if (!isLeader) {
          throw new ForbiddenError(
            "Only the team leader can change the status of an unassigned task"
          )
        }
        payload.status = TASK_STATUS_MAP[status]
      }

      if (assignedTo !== undefined) {
        if (!isLeader) {
          throw new ForbiddenError("Only the team leader can reassign tasks")
        }
        const assignee = assignedTo === "" ? null : assignedTo
        if (assignee) {
          const isTeamMember =
            team.ownerId === assignee ||
            team.members.some((m) => m.userId === assignee)
          if (!isTeamMember) {
            throw new ValidationError("Assignee must be a member of the team")
          }
        }
        payload.assignedTo = assignee
      }

      if (Object.keys(payload).length === 0) {
        throw new ValidationError("No fields to update")
      }

      const updated = await prisma.task.update({
        where: { id: taskId },
        data: payload,
      })

      const allTasks = await prisma.task.findMany({
        where: { projectId: task.projectId },
      })

      const progress = computeProgress(allTasks)
      logger.info(
        `[TASK_UPDATE] Task ${taskId} updated. Progress: ${progress}%`
      )
      return {
        task: toTaskDto(updated),
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
      throw new DatabaseError("Unable to update task", error)
    }
  }

  async deleteTask(taskId: string, userId: string) {
    try {
      if (!taskId || !userId) {
        throw new ValidationError("Task ID and user ID are required")
      }

      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { project: { select: { teamId: true } } },
      })

      if (!task) {
        throw new NotFoundError("Task not found")
      }

      await this.assertTeamMember(task.project.teamId, userId)

      await prisma.task.delete({ where: { id: taskId } })

      const allTasks = await prisma.task.findMany({
        where: { projectId: task.projectId },
      })

      const progress = computeProgress(allTasks)
      logger.info(
        `[TASK_DELETE] Task ${taskId} deleted. Progress: ${progress}%`
      )
      return {
        id: taskId,
        progress,
        message: "Task deleted successfully",
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
      throw new DatabaseError("Unable to delete task", error)
    }
  }
}

export default new ProjectService()
