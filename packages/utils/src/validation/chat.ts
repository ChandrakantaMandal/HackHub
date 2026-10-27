import { z } from "zod"

export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.coerce.date().optional(),
})

export type HistoryQuery = z.infer<typeof historyQuerySchema>

export const startDmSchema = z.object({
  userId: z.string().uuid("Invalid user id"),
})

export type StartDmBody = z.infer<typeof startDmSchema>

export const userSearchQuerySchema = z.object({
  query: z.string().trim().min(1).max(50).optional(),
})

export type UserSearchQuery = z.infer<typeof userSearchQuerySchema>
