import { z } from "zod"

export const createHackathonSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(120, "Name is too long"),
    tagline: z.string().max(160).optional(),
    description: z.string().optional(),
    guidelines: z.string().optional(),
    allowJoin: z.boolean().optional(),
    maxTeamSize: z.number().int().min(1).max(100).optional(),
    registrationDeadline: z.coerce.date(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    location: z.string().max(160).optional(),
    status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
  })
  .refine((d) => d.registrationDeadline <= d.startDate, {
    message: "Dates must be ordered: registration <= start <= end",
    path: ["registrationDeadline"],
  })
  .refine((d) => d.startDate <= d.endDate, {
    message: "Dates must be ordered: registration <= start <= end",
    path: ["startDate"],
  })

export const createJudgeSchema = z.object({
  email: z.string().email("A valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().max(80).optional(),
})
