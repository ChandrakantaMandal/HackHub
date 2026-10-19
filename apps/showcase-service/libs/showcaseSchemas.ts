import { z } from "zod"

export const listQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  sort: z.enum(["newest", "oldest", "title", "likes"]).default("newest"),
})

export const commentSchema = z.object({
  message: z.string().trim().min(1).max(2000),
})

export type ListQuery = z.infer<typeof listQuerySchema>
