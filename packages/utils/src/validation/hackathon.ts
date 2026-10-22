import { z } from "zod"

export const joinHackathonSchema = z.object({
  joinCode: z.string().trim().min(1, "Join code is required"),
})
