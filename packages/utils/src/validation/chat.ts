import { z } from "zod"

export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.coerce.date().optional(),
})

export type HistoryQuery = z.infer<typeof historyQuerySchema>
