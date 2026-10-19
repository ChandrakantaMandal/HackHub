import prisma from "@workspace/database"
import { NotFoundError } from "@workspace/error-handler"
import type { ListQuery } from "../libs/showcaseSchemas"
import { rankProjects } from "../libs/scoring"

const submittedStatuses = ["PENDING", "APPROVED"] as const

type SubmittedProject = {
  id: string
  title: string
  description: string
}

// ShowcaseProject rows are created lazily on first like/comment (no migration;
// tables already exist in the DB init migration).
const ensureShowcaseRow = async (project: SubmittedProject) => {
  return prisma.showcaseProject.upsert({
    where: { projectId: project.id },
    create: {
      projectId: project.id,
      title: project.title,
      description: project.description,
    },
    update: {},
  })
}

const getSubmittedProject = async (projectId: string) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      title: true,
      description: true,
      submission: { select: { status: true } },
    },
  })

  if (
    !project ||
    !project.submission ||
    !(submittedStatuses as readonly string[]).includes(
      project.submission.status
    )
  ) {
    throw new NotFoundError("Project not found")
  }

  return project
}

export const listProjects = async (query: ListQuery) => {
  const { search, category, sort } = query

  const orderBy =
    sort === "oldest"
      ? { submission: { submittedAt: "asc" as const } }
      : sort === "title"
        ? { title: "asc" as const }
        : sort === "likes"
          ? { showcase: { likes: { _count: "desc" as const } } }
          : { submission: { submittedAt: "desc" as const } }

  const projects = await prisma.project.findMany({
    where: {
      submission: {
        status: { in: [...submittedStatuses] },
      },
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { tags: { has: search } },
              {
                team: {
                  name: { contains: search, mode: "insensitive" as const },
                },
              },
            ],
          }
        : {}),
    },
    orderBy,
    include: {
      team: { select: { id: true, name: true } },
      submission: { select: { id: true, status: true, submittedAt: true } },
      showcase: {
        select: { _count: { select: { likes: true, comments: true } } },
      },
    },
  })

  return projects.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    category: p.category,
    tags: p.tags,
    team: p.team,
    submission: p.submission,
    likes: p.showcase?._count.likes ?? 0,
    comments: p.showcase?._count.comments ?? 0,
  }))
}

export const getProject = async (projectId: string) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          owner: {
            select: { id: true, username: true, name: true, avatar: true },
          },
        },
      },
      submission: {
        select: {
          id: true,
          status: true,
          submittedAt: true,
          githubUrl: true,
          liveUrl: true,
          documentation: true,
        },
      },
      showcase: {
        select: {
          _count: { select: { likes: true, comments: true } },
          comments: {
            orderBy: { createdAt: "desc" as const },
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

  if (
    !project ||
    !project.submission ||
    !(submittedStatuses as readonly string[]).includes(
      project.submission.status
    )
  ) {
    throw new NotFoundError("Project not found")
  }

  return {
    id: project.id,
    title: project.title,
    description: project.description,
    category: project.category,
    tags: project.tags,
    team: project.team,
    submission: project.submission,
    likes: project.showcase?._count.likes ?? 0,
    comments: project.showcase?._count.comments ?? 0,
    commentsList: project.showcase?.comments ?? [],
  }
}

export const toggleLike = async (projectId: string, userId: string) => {
  const project = await getSubmittedProject(projectId)
  const showcase = await ensureShowcaseRow(project)

  const existing = await prisma.like.findUnique({
    where: {
      showcaseId_userId: { showcaseId: showcase.id, userId },
    },
  })

  let liked: boolean
  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } })
    liked = false
  } else {
    await prisma.like.create({ data: { showcaseId: showcase.id, userId } })
    liked = true
  }

  const likesCount = await prisma.like.count({
    where: { showcaseId: showcase.id },
  })

  return { projectId, liked, likesCount }
}

export const createComment = async (
  projectId: string,
  userId: string,
  message: string
) => {
  const project = await getSubmittedProject(projectId)
  const showcase = await ensureShowcaseRow(project)

  const comment = await prisma.comment.create({
    data: { showcaseId: showcase.id, userId, message },
    include: {
      user: { select: { id: true, username: true, name: true, avatar: true } },
    },
  })

  return {
    id: comment.id,
    projectId,
    message: comment.message,
    createdAt: comment.createdAt,
    user: comment.user,
  }
}

export const getComments = async (projectId: string) => {
  await getSubmittedProject(projectId)

  const showcase = await prisma.showcaseProject.findUnique({
    where: { projectId },
    select: { id: true },
  })

  if (!showcase) return []

  const comments = await prisma.comment.findMany({
    where: { showcaseId: showcase.id },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, username: true, name: true, avatar: true } },
    },
  })

  return comments.map((c) => ({
    id: c.id,
    projectId,
    message: c.message,
    createdAt: c.createdAt,
    user: c.user,
  }))
}

export const getLeaderboard = async () => {
  const scores = await prisma.judgeScore.findMany({
    select: {
      finalScore: true,
      submission: {
        select: { project: { select: { id: true, title: true } } },
      },
    },
  })

  const rows = scores.map((s) => ({
    projectId: s.submission.project.id,
    title: s.submission.project.title,
    finalScore: s.finalScore,
  }))

  return rankProjects(rows)
}

export const getStats = async () => {
  const [projects, likes, comments] = await Promise.all([
    prisma.project.count({
      where: { submission: { status: { in: [...submittedStatuses] } } },
    }),
    prisma.like.count(),
    prisma.comment.count(),
  ])

  return { projects, likes, comments }
}
