import { z } from "zod"

export const userIdSchema = z.object({
  id: z.string().uuid("Invalid user id"),
})

export const updateUserSchema = z.object({
  name: z.string().min(2).max(50).optional(),

  email: z.string().email().optional(),

  avatar: z.string().url().optional(),
})

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),

  limit: z.coerce.number().min(1).max(100).default(10),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>

export type PaginationInput = z.infer<typeof paginationSchema>
