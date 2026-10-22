import { z } from "zod"

export const scoreSchema = z.object({
  innovation: z.number().int().min(0).max(10),
  technical: z.number().int().min(0).max(10),
  design: z.number().int().min(0).max(10),
  presentation: z.number().int().min(0).max(10),
  overall: z.number().int().min(0).max(10),
  feedback: z.string().max(2000).optional(),
})

export const awardBadgeSchema = z.object({
  name: z.string().trim().min(1, "Badge name is required").max(100),
  description: z.string().max(500).optional(),
})

export type ScoreInput = z.infer<typeof scoreSchema>
export type AwardBadgeInput = z.infer<typeof awardBadgeSchema>
