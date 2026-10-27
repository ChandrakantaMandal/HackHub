import { z } from "zod"

export const userIdSchema = z.object({
  id: z.string().uuid("Invalid user id"),
})

export const updateUserSchema = z.object({
  name: z.string().min(2).max(50).optional(),

  email: z.string().email().optional(),

  avatar: z.string().url().optional(),
})

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be at most 50 characters")
      .optional(),

    bio: z
      .string()
      .trim()
      .max(280, "Bio must be at most 280 characters")
      .nullable()
      .optional(),

    avatar: z.string().url("Avatar must be a valid URL").nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  })

export const avatarUploadSchema = z.object({
  /** Base64 data URL: data:image/png;base64,.... */
  file: z.string().min(1, "Image data is required"),

  fileName: z.string().max(255).optional(),
})

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),

  limit: z.coerce.number().min(1).max(100).default(10),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

export type AvatarUploadInput = z.infer<typeof avatarUploadSchema>

export type PaginationInput = z.infer<typeof paginationSchema>
