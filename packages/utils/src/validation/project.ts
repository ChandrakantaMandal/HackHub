import { z } from "zod"

export const createTeamSchema = z.object({
  name: z.string().min(2, "Team name must be at least 2 characters"),
  userId: z.string(),
})

export const joinTeamSchema = z.object({
  inviteCode: z.string().length(6, "Invite code must be 6 characters"),
  userId: z.string(),
})

export const createProjectSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string(),
  tags: z.array(z.string()),
  teamId: z.string(),
  hackathonId: z.string().uuid("A valid hackathon must be selected"),
})

export const updateProjectSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").optional(),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export const createTaskSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1, "Task title cannot be empty").optional(),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "completed"]).optional(),
  assignedTo: z.string().nullable().optional(),
})
