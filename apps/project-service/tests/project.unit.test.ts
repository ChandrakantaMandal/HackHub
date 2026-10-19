import { describe, it, expect, vi, beforeEach } from "vitest"
import { AppError } from "@workspace/error-handler"
import { createTeamSchema } from "@workspace/utils"
import { logger } from "@workspace/logger"
import projectService from "../services/project.service"
import { userContext, validate } from "../middleware/project.middleware"

const { mockPrisma, PrismaClientKnownRequestError } = vi.hoisted(() => {
  class PrismaClientKnownRequestError extends Error {
    code: string
    constructor(message: string, code: string) {
      super(message)
      this.name = "PrismaClientKnownRequestError"
      this.code = code
    }
  }

  const mockPrisma = {
    team: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    project: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    task: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    submission: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  }

  return { mockPrisma, PrismaClientKnownRequestError }
})

vi.mock("@workspace/database", () => ({
  default: mockPrisma,
  Prisma: { PrismaClientKnownRequestError },
}))

vi.mock("@workspace/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  httpLogger: (_req: unknown, _res: unknown, next: () => void) => next(),
}))

async function expectRejection(
  promise: Promise<unknown>,
  statusCode: number,
  message: string
) {
  const error = await promise.then(
    () => {
      throw new Error("Expected promise to reject, but it resolved")
    },
    (reason: unknown) => reason
  )
  expect(error).toBeInstanceOf(AppError)
  expect((error as AppError).statusCode).toBe(statusCode)
  expect((error as Error).message).toBe(message)
}

function mockRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  } as any
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  return res
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe("projectService.createTeam", () => {
  it("rejects with 400 when name or userId is missing", async () => {
    await expectRejection(
      projectService.createTeam({ name: "", userId: "u1" }),
      400,
      "Team name and user ID are required"
    )
    await expectRejection(
      projectService.createTeam({ name: "Alpha", userId: "" }),
      400,
      "Team name and user ID are required"
    )
    expect(mockPrisma.team.create).not.toHaveBeenCalled()
  })

  it("creates a team with a generated invite code and OWNER membership", async () => {
    const created = {
      id: "t1",
      name: "Alpha",
      inviteCode: "ABC123",
      ownerId: "u1",
      members: [{ userId: "u1", role: "OWNER" }],
    }
    mockPrisma.team.create.mockResolvedValue(created)

    const result = await projectService.createTeam({
      name: "Alpha",
      userId: "u1",
    })

    expect(result).toEqual(created)
    expect(mockPrisma.team.create).toHaveBeenCalledWith({
      data: {
        name: "Alpha",
        inviteCode: expect.stringMatching(/^[A-Z0-9]{1,6}$/),
        ownerId: "u1",
        members: {
          create: { userId: "u1", role: "OWNER" },
        },
      },
      include: { members: true },
    })
    expect(logger.info).toHaveBeenCalledOnce()
  })

  it("wraps non-Error rejections in a 500 DatabaseError", async () => {
    mockPrisma.team.create.mockRejectedValue("db down")

    await expectRejection(
      projectService.createTeam({ name: "Alpha", userId: "u1" }),
      500,
      "Unable to create team"
    )
  })
})

describe("projectService.joinTeam", () => {
  it("rejects with 400 when inviteCode or userId is missing", async () => {
    await expectRejection(
      projectService.joinTeam({ inviteCode: "", userId: "u1" }),
      400,
      "Invite code and user ID are required"
    )
    expect(mockPrisma.team.findUnique).not.toHaveBeenCalled()
  })

  it("rejects with 404 for an unknown invite code (uppercased lookup)", async () => {
    mockPrisma.team.findUnique.mockResolvedValue(null)

    await expectRejection(
      projectService.joinTeam({ inviteCode: "abc123", userId: "u2" }),
      404,
      "Invalid or expired invite code"
    )
    expect(mockPrisma.team.findUnique).toHaveBeenCalledWith({
      where: { inviteCode: "ABC123" },
      include: { members: true },
    })
  })

  it("rejects with 409 when the user is already a member", async () => {
    mockPrisma.team.findUnique.mockResolvedValue({
      id: "t1",
      name: "Alpha",
      ownerId: "u1",
      members: [{ userId: "u2" }],
    })

    await expectRejection(
      projectService.joinTeam({ inviteCode: "ABC123", userId: "u2" }),
      409,
      "User is already a member of this team"
    )
    expect(mockPrisma.team.update).not.toHaveBeenCalled()
  })

  it("adds the member and returns the updated team", async () => {
    mockPrisma.team.findUnique.mockResolvedValue({
      id: "t1",
      name: "Alpha",
      ownerId: "u1",
      members: [{ userId: "u1" }],
    })
    const updated = {
      id: "t1",
      name: "Alpha",
      ownerId: "u1",
      members: [{ userId: "u1" }, { userId: "u2" }],
    }
    mockPrisma.team.update.mockResolvedValue(updated)

    const result = await projectService.joinTeam({
      inviteCode: "ABC123",
      userId: "u2",
    })

    expect(result).toEqual(updated)
    expect(mockPrisma.team.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { members: { create: { userId: "u2" } } },
      include: { members: true },
    })
    expect(logger.info).toHaveBeenCalledOnce()
  })
})

describe("projectService.createProject", () => {
  it("rejects with 400 when required fields are missing", async () => {
    await expectRejection(
      projectService.createProject({
        title: "P",
        description: "",
        category: "cat",
        tags: [],
        teamId: "t1",
        userId: "u1",
      }),
      400,
      "All required project fields must be provided"
    )
    expect(mockPrisma.team.findUnique).not.toHaveBeenCalled()
  })

  it("rejects with 404 when the team does not exist", async () => {
    mockPrisma.team.findUnique.mockResolvedValue(null)

    await expectRejection(
      projectService.createProject({
        title: "P",
        description: "D",
        category: "cat",
        tags: [],
        teamId: "missing",
        userId: "u1",
      }),
      404,
      "Team not found"
    )
  })

  it("rejects with 401 when the user is not a team member", async () => {
    mockPrisma.team.findUnique.mockResolvedValue({
      id: "t1",
      name: "Alpha",
      ownerId: "owner",
      members: [{ userId: "someone-else" }],
    })

    await expectRejection(
      projectService.createProject({
        title: "P",
        description: "D",
        category: "cat",
        tags: [],
        teamId: "t1",
        userId: "u2",
      }),
      401,
      "You must be a member of the team to create a project"
    )
    expect(mockPrisma.project.create).not.toHaveBeenCalled()
  })

  it("creates a project when the user is a member", async () => {
    mockPrisma.team.findUnique.mockResolvedValue({
      id: "t1",
      name: "Alpha",
      ownerId: "owner",
      members: [{ userId: "u1" }],
    })
    const created = { id: "p1", title: "P", teamId: "t1" }
    mockPrisma.project.create.mockResolvedValue(created)

    const result = await projectService.createProject({
      title: "P",
      description: "D",
      category: "cat",
      tags: ["a"],
      teamId: "t1",
      userId: "u1",
    })

    expect(result).toEqual(created)
    expect(mockPrisma.project.create).toHaveBeenCalledWith({
      data: {
        title: "P",
        description: "D",
        category: "cat",
        tags: ["a"],
        teamId: "t1",
      },
    })
    expect(logger.info).toHaveBeenCalledOnce()
  })

  it("creates a project when the user is the team owner", async () => {
    mockPrisma.team.findUnique.mockResolvedValue({
      id: "t1",
      name: "Alpha",
      ownerId: "u1",
      members: [],
    })
    mockPrisma.project.create.mockResolvedValue({ id: "p1", title: "P" })

    const result = await projectService.createProject({
      title: "P",
      description: "D",
      category: "cat",
      tags: [],
      teamId: "t1",
      userId: "u1",
    })

    expect(result.id).toBe("p1")
    expect(mockPrisma.project.create).toHaveBeenCalled()
  })
})

describe("projectService.updateTaskStatus", () => {
  it("rejects with 400 when taskId or status is missing", async () => {
    await expectRejection(
      projectService.updateTaskStatus({
        taskId: "",
        status: "todo",
        userId: "u1",
      }),
      400,
      "Task ID and status are required"
    )
    expect(mockPrisma.task.update).not.toHaveBeenCalled()
  })

  it("maps P2025 to a 404 Task not found", async () => {
    mockPrisma.task.update.mockRejectedValue(
      new PrismaClientKnownRequestError("Record not found", "P2025")
    )

    await expectRejection(
      projectService.updateTaskStatus({
        taskId: "tk1",
        status: "todo",
        userId: "u1",
      }),
      404,
      "Task not found"
    )
  })

  it("maps the status to IN_PROGRESS and recomputes progress", async () => {
    mockPrisma.task.update.mockResolvedValue({
      id: "tk1",
      projectId: "p1",
      status: "IN_PROGRESS",
    })
    mockPrisma.task.findMany.mockResolvedValue([
      { status: "DONE" },
      { status: "DONE" },
      { status: "TODO" },
    ])

    const result = await projectService.updateTaskStatus({
      taskId: "tk1",
      status: "in_progress",
      userId: "u1",
    })

    expect(mockPrisma.task.update).toHaveBeenCalledWith({
      where: { id: "tk1" },
      data: { status: "IN_PROGRESS" },
    })
    expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
      where: { projectId: "p1" },
    })
    expect(result.progress).toBe(67)
    expect(result.message).toBe("Task updated successfully")
    expect(result.task.status).toBe("IN_PROGRESS")
  })

  it("reports 100 progress when all tasks are DONE", async () => {
    mockPrisma.task.update.mockResolvedValue({
      id: "tk1",
      projectId: "p1",
      status: "DONE",
    })
    mockPrisma.task.findMany.mockResolvedValue([
      { status: "DONE" },
      { status: "DONE" },
    ])

    const result = await projectService.updateTaskStatus({
      taskId: "tk1",
      status: "completed",
      userId: "u1",
    })

    expect(result.progress).toBe(100)
  })
})

describe("projectService.submitProject", () => {
  it("rejects with 400 when projectId or githubUrl is missing", async () => {
    await expectRejection(
      projectService.submitProject({
        projectId: "",
        githubUrl: "https://github.com/u/r",
        liveDemoUrl: "",
        userId: "u1",
      }),
      400,
      "Project ID and GitHub repository URL are required"
    )
    expect(mockPrisma.project.findUnique).not.toHaveBeenCalled()
  })

  it("rejects with 404 when the project does not exist", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null)

    await expectRejection(
      projectService.submitProject({
        projectId: "missing",
        githubUrl: "https://github.com/u/r",
        liveDemoUrl: "",
        userId: "u1",
      }),
      404,
      "Project not found"
    )
  })

  it("maps P2002 to a 409 duplicate submission error", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" })
    mockPrisma.submission.create.mockRejectedValue(
      new PrismaClientKnownRequestError("Unique constraint failed", "P2002")
    )

    await expectRejection(
      projectService.submitProject({
        projectId: "p1",
        githubUrl: "https://github.com/u/r",
        liveDemoUrl: "",
        userId: "u1",
      }),
      409,
      "This project has already been submitted"
    )
  })

  it("creates a PENDING submission with null liveUrl when liveDemoUrl is empty", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" })
    const submission = { id: "s1", projectId: "p1", status: "PENDING" }
    mockPrisma.submission.create.mockResolvedValue(submission)

    const result = await projectService.submitProject({
      projectId: "p1",
      githubUrl: "https://github.com/u/r",
      liveDemoUrl: "",
      userId: "u1",
    })

    expect(mockPrisma.submission.create).toHaveBeenCalledWith({
      data: {
        projectId: "p1",
        githubUrl: "https://github.com/u/r",
        liveUrl: null,
        status: "PENDING",
        submittedAt: expect.any(Date),
      },
    })
    expect(result.submission).toEqual(submission)
    expect(result.message).toBe("Project successfully submitted for judging!")
    expect(logger.info).toHaveBeenCalledOnce()
  })

  it("stores the live demo URL when provided", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" })
    mockPrisma.submission.create.mockResolvedValue({ id: "s1" })

    await projectService.submitProject({
      projectId: "p1",
      githubUrl: "https://github.com/u/r",
      liveDemoUrl: "https://demo.example.com",
      userId: "u1",
    })

    expect(mockPrisma.submission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          liveUrl: "https://demo.example.com",
        }),
      })
    )
  })
})

describe("projectService.getTeamDetails", () => {
  it("rejects with 400 when teamId is missing", async () => {
    await expectRejection(
      projectService.getTeamDetails(""),
      400,
      "Team ID is required"
    )
    expect(mockPrisma.team.findUnique).not.toHaveBeenCalled()
  })

  it("rejects with 404 when the team does not exist", async () => {
    mockPrisma.team.findUnique.mockResolvedValue(null)

    await expectRejection(
      projectService.getTeamDetails("missing"),
      404,
      "Team not found"
    )
  })

  it("returns the team with members, projects, tasks and submission", async () => {
    const team = {
      id: "t1",
      name: "Alpha",
      members: [{ userId: "u1" }],
      projects: [],
    }
    mockPrisma.team.findUnique.mockResolvedValue(team)

    const result = await projectService.getTeamDetails("t1")

    expect(result).toEqual(team)
    expect(mockPrisma.team.findUnique).toHaveBeenCalledWith({
      where: { id: "t1" },
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
  })
})

describe("projectService.listProjects", () => {
  it("rejects with 400 when userId is missing", async () => {
    await expectRejection(
      projectService.listProjects(""),
      400,
      "User ID is required"
    )
    expect(mockPrisma.team.findMany).not.toHaveBeenCalled()
  })

  it("flattens team projects and computes progress for each", async () => {
    mockPrisma.team.findMany.mockResolvedValue([
      {
        id: "t1",
        projects: [
          { id: "p1", tasks: [{ status: "DONE" }, { status: "TODO" }] },
          { id: "p2", tasks: [] },
        ],
      },
      {
        id: "t2",
        projects: [
          {
            id: "p3",
            tasks: [{ status: "DONE" }, { status: "DONE" }, { status: "DONE" }],
          },
        ],
      },
    ])

    const result = await projectService.listProjects("u1")

    expect(result.map((p) => p.id)).toEqual(["p1", "p2", "p3"])
    expect(result.map((p) => p.progress)).toEqual([50, 0, 100])
    expect(mockPrisma.team.findMany).toHaveBeenCalledWith({
      where: {
        OR: [{ ownerId: "u1" }, { members: { some: { userId: "u1" } } }],
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
  })

  it("returns an empty array when the user belongs to no teams", async () => {
    mockPrisma.team.findMany.mockResolvedValue([])

    const result = await projectService.listProjects("u1")

    expect(result).toEqual([])
  })
})

describe("projectService.getProject", () => {
  it("rejects with 400 when projectId or userId is missing", async () => {
    await expectRejection(
      projectService.getProject("", "u1"),
      400,
      "Project ID and user ID are required"
    )
    expect(mockPrisma.project.findUnique).not.toHaveBeenCalled()
  })

  it("rejects with 404 when the project does not exist", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null)

    await expectRejection(
      projectService.getProject("missing", "u1"),
      404,
      "Project not found"
    )
  })

  it("rejects with 401 when the user is not a team member", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: "p1",
      teamId: "t1",
      tasks: [],
      team: {
        id: "t1",
        ownerId: "owner",
        members: [{ userId: "someone-else" }],
      },
    })

    await expectRejection(
      projectService.getProject("p1", "u2"),
      401,
      "You must be a member of the team to view this project"
    )
  })

  it("returns the project with computed progress for members", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: "p1",
      title: "P",
      tasks: [{ status: "DONE" }, { status: "TODO" }],
      submission: null,
      team: {
        id: "t1",
        ownerId: "owner",
        members: [{ userId: "u1" }],
      },
    })

    const result = await projectService.getProject("p1", "u1")

    expect(result.id).toBe("p1")
    expect(result.progress).toBe(50)
  })
})

describe("projectService.updateProject", () => {
  it("rejects with 400 when projectId or userId is missing", async () => {
    await expectRejection(
      projectService.updateProject({ projectId: "", userId: "u1" }),
      400,
      "Project ID and user ID are required"
    )
    expect(mockPrisma.project.findUnique).not.toHaveBeenCalled()
  })

  it("rejects with 404 when the project does not exist", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null)

    await expectRejection(
      projectService.updateProject({ projectId: "missing", userId: "u1" }),
      404,
      "Project not found"
    )
  })

  it("rejects with 404 when the owning team no longer exists", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: "p1",
      teamId: "t1",
    })
    mockPrisma.team.findUnique.mockResolvedValue(null)

    await expectRejection(
      projectService.updateProject({
        projectId: "p1",
        userId: "u1",
        title: "New",
      }),
      404,
      "Team not found"
    )
  })

  it("rejects with 401 when the user is not a team member", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: "p1",
      teamId: "t1",
    })
    mockPrisma.team.findUnique.mockResolvedValue({
      id: "t1",
      ownerId: "owner",
      members: [{ userId: "someone-else" }],
    })

    await expectRejection(
      projectService.updateProject({
        projectId: "p1",
        userId: "u2",
        title: "New",
      }),
      401,
      "You must be a member of the team to perform this action"
    )
    expect(mockPrisma.project.update).not.toHaveBeenCalled()
  })

  it("rejects with 400 when no updatable fields are provided", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: "p1",
      teamId: "t1",
    })
    mockPrisma.team.findUnique.mockResolvedValue({
      id: "t1",
      ownerId: "u1",
      members: [{ userId: "u1" }],
    })

    await expectRejection(
      projectService.updateProject({ projectId: "p1", userId: "u1" }),
      400,
      "No fields to update"
    )
    expect(mockPrisma.project.update).not.toHaveBeenCalled()
  })

  it("updates only the provided fields", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: "p1",
      teamId: "t1",
    })
    mockPrisma.team.findUnique.mockResolvedValue({
      id: "t1",
      ownerId: "u1",
      members: [{ userId: "u1" }],
    })
    const updated = { id: "p1", title: "New title" }
    mockPrisma.project.update.mockResolvedValue(updated)

    const result = await projectService.updateProject({
      projectId: "p1",
      userId: "u1",
      title: "New title",
    })

    expect(result).toEqual(updated)
    expect(mockPrisma.project.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { title: "New title" },
    })
    expect(logger.info).toHaveBeenCalledOnce()
  })

  it("maps P2025 to a 404 during update", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: "p1",
      teamId: "t1",
    })
    mockPrisma.team.findUnique.mockResolvedValue({
      id: "t1",
      ownerId: "u1",
      members: [{ userId: "u1" }],
    })
    mockPrisma.project.update.mockRejectedValue(
      new PrismaClientKnownRequestError("Record not found", "P2025")
    )

    await expectRejection(
      projectService.updateProject({
        projectId: "p1",
        userId: "u1",
        title: "New title",
      }),
      404,
      "Project not found"
    )
  })
})

describe("projectService.deleteProject", () => {
  it("rejects with 400 when projectId or userId is missing", async () => {
    await expectRejection(
      projectService.deleteProject("", "u1"),
      400,
      "Project ID and user ID are required"
    )
    expect(mockPrisma.project.findUnique).not.toHaveBeenCalled()
  })

  it("rejects with 404 when the project does not exist", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null)

    await expectRejection(
      projectService.deleteProject("missing", "u1"),
      404,
      "Project not found"
    )
  })

  it("rejects with 401 when the user is not a team member", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: "p1",
      teamId: "t1",
    })
    mockPrisma.team.findUnique.mockResolvedValue({
      id: "t1",
      ownerId: "owner",
      members: [{ userId: "someone-else" }],
    })

    await expectRejection(
      projectService.deleteProject("p1", "u2"),
      401,
      "You must be a member of the team to perform this action"
    )
    expect(mockPrisma.project.delete).not.toHaveBeenCalled()
  })

  it("deletes the project and returns a confirmation", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: "p1",
      teamId: "t1",
    })
    mockPrisma.team.findUnique.mockResolvedValue({
      id: "t1",
      ownerId: "u1",
      members: [{ userId: "u1" }],
    })
    mockPrisma.project.delete.mockResolvedValue({ id: "p1" })

    const result = await projectService.deleteProject("p1", "u1")

    expect(result).toEqual({
      id: "p1",
      message: "Project deleted successfully",
    })
    expect(mockPrisma.project.delete).toHaveBeenCalledWith({
      where: { id: "p1" },
    })
    expect(logger.info).toHaveBeenCalledOnce()
  })
})

describe("projectService.createTask", () => {
  it("rejects with 400 when projectId, userId or title is missing", async () => {
    await expectRejection(
      projectService.createTask({
        projectId: "p1",
        userId: "u1",
        title: "",
      }),
      400,
      "Project ID, user ID, and title are required"
    )
    expect(mockPrisma.project.findUnique).not.toHaveBeenCalled()
  })

  it("rejects with 404 when the project does not exist", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null)

    await expectRejection(
      projectService.createTask({
        projectId: "missing",
        userId: "u1",
        title: "Task",
      }),
      404,
      "Project not found"
    )
  })

  it("rejects with 401 when the creator is not a team member", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: "p1",
      teamId: "t1",
    })
    mockPrisma.team.findUnique.mockResolvedValue({
      id: "t1",
      ownerId: "owner",
      members: [{ userId: "someone-else" }],
    })

    await expectRejection(
      projectService.createTask({
        projectId: "p1",
        userId: "u2",
        title: "Task",
      }),
      401,
      "You must be a member of the team to perform this action"
    )
  })

  it("rejects with 400 when the assignee is not a team member", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: "p1",
      teamId: "t1",
    })
    mockPrisma.team.findUnique.mockResolvedValue({
      id: "t1",
      ownerId: "u1",
      members: [{ userId: "u1" }],
    })

    await expectRejection(
      projectService.createTask({
        projectId: "p1",
        userId: "u1",
        title: "Task",
        assignedTo: "stranger",
      }),
      400,
      "Assignee must be a member of the team"
    )
    expect(mockPrisma.task.create).not.toHaveBeenCalled()
  })

  it("creates a task with null defaults and returns progress", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: "p1",
      teamId: "t1",
    })
    mockPrisma.team.findUnique.mockResolvedValue({
      id: "t1",
      ownerId: "u1",
      members: [{ userId: "u1" }],
    })
    const created = { id: "tk1", projectId: "p1", title: "Task" }
    mockPrisma.task.create.mockResolvedValue(created)
    mockPrisma.task.findMany.mockResolvedValue([
      { status: "DONE" },
      { status: "TODO" },
    ])

    const result = await projectService.createTask({
      projectId: "p1",
      userId: "u1",
      title: "Task",
    })

    expect(mockPrisma.task.create).toHaveBeenCalledWith({
      data: {
        projectId: "p1",
        title: "Task",
        description: null,
        assignedTo: null,
      },
    })
    expect(result.task).toEqual(created)
    expect(result.progress).toBe(50)
    expect(result.message).toBe("Task created successfully")
    expect(logger.info).toHaveBeenCalledOnce()
  })
})

describe("projectService.updateTask", () => {
  it("rejects with 400 when taskId or userId is missing", async () => {
    await expectRejection(
      projectService.updateTask({ taskId: "", userId: "u1" }),
      400,
      "Task ID and user ID are required"
    )
    expect(mockPrisma.task.findUnique).not.toHaveBeenCalled()
  })

  it("rejects with 404 when the task does not exist", async () => {
    mockPrisma.task.findUnique.mockResolvedValue(null)

    await expectRejection(
      projectService.updateTask({ taskId: "missing", userId: "u1" }),
      404,
      "Task not found"
    )
  })

  it("rejects with 401 when the user is not a team member", async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: "tk1",
      projectId: "p1",
      project: { teamId: "t1" },
    })
    mockPrisma.team.findUnique.mockResolvedValue({
      id: "t1",
      ownerId: "owner",
      members: [{ userId: "someone-else" }],
    })

    await expectRejection(
      projectService.updateTask({
        taskId: "tk1",
        userId: "u2",
        title: "New",
      }),
      401,
      "You must be a member of the team to perform this action"
    )
    expect(mockPrisma.task.update).not.toHaveBeenCalled()
  })

  it("rejects with 400 when no updatable fields are provided", async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: "tk1",
      projectId: "p1",
      project: { teamId: "t1" },
    })
    mockPrisma.team.findUnique.mockResolvedValue({
      id: "t1",
      ownerId: "u1",
      members: [{ userId: "u1" }],
    })

    await expectRejection(
      projectService.updateTask({ taskId: "tk1", userId: "u1" }),
      400,
      "No fields to update"
    )
    expect(mockPrisma.task.update).not.toHaveBeenCalled()
  })

  it("rejects with 400 when the assignee is not a team member", async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: "tk1",
      projectId: "p1",
      project: { teamId: "t1" },
    })
    mockPrisma.team.findUnique.mockResolvedValue({
      id: "t1",
      ownerId: "u1",
      members: [{ userId: "u1" }],
    })

    await expectRejection(
      projectService.updateTask({
        taskId: "tk1",
        userId: "u1",
        assignedTo: "stranger",
      }),
      400,
      "Assignee must be a member of the team"
    )
  })

  it("maps status to DONE, clears assignedTo on empty string, recomputes progress", async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: "tk1",
      projectId: "p1",
      project: { teamId: "t1" },
    })
    mockPrisma.team.findUnique.mockResolvedValue({
      id: "t1",
      ownerId: "u1",
      members: [{ userId: "u1" }],
    })
    mockPrisma.task.update.mockResolvedValue({
      id: "tk1",
      projectId: "p1",
      status: "DONE",
      assignedTo: null,
    })
    mockPrisma.task.findMany.mockResolvedValue([
      { status: "DONE" },
      { status: "TODO" },
    ])

    const result = await projectService.updateTask({
      taskId: "tk1",
      userId: "u1",
      status: "completed",
      assignedTo: "",
    })

    expect(mockPrisma.task.update).toHaveBeenCalledWith({
      where: { id: "tk1" },
      data: { status: "DONE", assignedTo: null },
    })
    expect(result.progress).toBe(50)
    expect(result.message).toBe("Task updated successfully")
    expect(logger.info).toHaveBeenCalledOnce()
  })

  it("maps P2025 to a 404 Task not found", async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: "tk1",
      projectId: "p1",
      project: { teamId: "t1" },
    })
    mockPrisma.team.findUnique.mockResolvedValue({
      id: "t1",
      ownerId: "u1",
      members: [{ userId: "u1" }],
    })
    mockPrisma.task.update.mockRejectedValue(
      new PrismaClientKnownRequestError("Record not found", "P2025")
    )

    await expectRejection(
      projectService.updateTask({
        taskId: "tk1",
        userId: "u1",
        title: "New",
      }),
      404,
      "Task not found"
    )
  })
})

describe("projectService.deleteTask", () => {
  it("rejects with 400 when taskId or userId is missing", async () => {
    await expectRejection(
      projectService.deleteTask("", "u1"),
      400,
      "Task ID and user ID are required"
    )
    expect(mockPrisma.task.findUnique).not.toHaveBeenCalled()
  })

  it("rejects with 404 when the task does not exist", async () => {
    mockPrisma.task.findUnique.mockResolvedValue(null)

    await expectRejection(
      projectService.deleteTask("missing", "u1"),
      404,
      "Task not found"
    )
  })

  it("rejects with 401 when the user is not a team member", async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: "tk1",
      projectId: "p1",
      project: { teamId: "t1" },
    })
    mockPrisma.team.findUnique.mockResolvedValue({
      id: "t1",
      ownerId: "owner",
      members: [{ userId: "someone-else" }],
    })

    await expectRejection(
      projectService.deleteTask("tk1", "u2"),
      401,
      "You must be a member of the team to perform this action"
    )
    expect(mockPrisma.task.delete).not.toHaveBeenCalled()
  })

  it("deletes the task and returns the recomputed progress", async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: "tk1",
      projectId: "p1",
      project: { teamId: "t1" },
    })
    mockPrisma.team.findUnique.mockResolvedValue({
      id: "t1",
      ownerId: "u1",
      members: [{ userId: "u1" }],
    })
    mockPrisma.task.delete.mockResolvedValue({ id: "tk1" })
    mockPrisma.task.findMany.mockResolvedValue([
      { status: "DONE" },
      { status: "TODO" },
    ])

    const result = await projectService.deleteTask("tk1", "u1")

    expect(result).toEqual({
      id: "tk1",
      progress: 50,
      message: "Task deleted successfully",
    })
    expect(mockPrisma.task.delete).toHaveBeenCalledWith({
      where: { id: "tk1" },
    })
    expect(logger.info).toHaveBeenCalledOnce()
  })
})

describe("userContext middleware", () => {
  it("responds 401 when x-user-id is missing", () => {
    const req = { headers: {} } as any
    const res = mockRes()
    const next = vi.fn()

    userContext(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Unauthorized: Missing user context",
    })
    expect(next).not.toHaveBeenCalled()
  })

  it("responds 401 when x-user-id is not a string", () => {
    const req = { headers: { "x-user-id": 123 as any } } as any
    const res = mockRes()
    const next = vi.fn()

    userContext(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Unauthorized: Missing user context",
    })
    expect(next).not.toHaveBeenCalled()
  })

  it("populates req.user from identity headers and continues", () => {
    const req = {
      headers: { "x-user-id": "u1", "x-user-role": "JUDGE" },
    } as any
    const res = mockRes()
    const next = vi.fn()

    userContext(req, res, next)

    expect(req.user).toEqual({ id: "u1", role: "JUDGE" })
    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it("defaults the role to user when x-user-role is absent (no 401)", () => {
    const req = { headers: { "x-user-id": "u1" } } as any
    const res = mockRes()
    const next = vi.fn()

    userContext(req, res, next)

    expect(req.user).toEqual({ id: "u1", role: "user" })
    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })
})

describe("validate middleware", () => {
  it("responds 400 with per-field errors for an invalid body", () => {
    const middleware = validate(createTeamSchema)
    const req = { body: {} } as any
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    const body = res.json.mock.calls[0][0]
    expect(body.success).toBe(false)
    expect(body.error).toBe("Validation failed")
    expect(body.fields).toHaveProperty("name")
    expect(body.fields).toHaveProperty("userId")
    expect(next).not.toHaveBeenCalled()
  })

  it("parses a valid body and continues", () => {
    const middleware = validate(createTeamSchema)
    const req = { body: { name: "Alpha", userId: "u1" } } as any
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(req.body.name).toBe("Alpha")
    expect(req.body.userId).toBe("u1")
    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it("responds 500 when the schema throws a non-Zod error", () => {
    const brokenSchema = {
      parse: () => {
        throw new Error("boom")
      },
    } as any
    const middleware = validate(brokenSchema)
    const req = { body: {} } as any
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Internal server error",
    })
    expect(next).not.toHaveBeenCalled()
  })
})
