import { z } from "zod"

export const registerSchema = z
  .object({
    username: z.string().min(2, "Name must be at least 2 characters").max(50),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100),
    confirmPassword: z.string(),
    judgeCode: z.string().trim().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token required"),
  sessionId: z.string().min(1, "Session ID required"),
})

export const verifyOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  purpose: z.enum(["register", "login", "reset"]),
})

export const sendOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  purpose: z.enum(["register", "login", "reset"]),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
