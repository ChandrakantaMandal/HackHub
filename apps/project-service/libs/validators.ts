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
})
