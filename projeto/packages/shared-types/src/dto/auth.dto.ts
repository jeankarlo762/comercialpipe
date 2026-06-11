import { z } from 'zod';
import { USER_ROLES } from '../enums.js';

export const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const registerSchema = z.object({
  tenantName: z.string().min(2).max(120),
  slug: z
    .string()
    .min(3)
    .max(60)
    .regex(slugRegex, 'slug must be lowercase alphanumeric with hyphens'),
  name: z.string().min(2).max(120),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1).max(128),
  slug: z
    .string()
    .min(3)
    .max(60)
    .regex(slugRegex)
    .optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(128),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const createUserSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
  role: z.enum(USER_ROLES),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({
    name: z.string().min(2).max(120),
    email: z.string().email().toLowerCase(),
    password: z.string().min(8).max(128),
    role: z.enum(USER_ROLES),
    isActive: z.boolean(),
    avatarUrl: z.string().url().nullable(),
  })
  .partial();
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export interface AuthUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: (typeof USER_ROLES)[number];
  avatarUrl: string | null;
}

export interface AccessTokenPayload {
  sub: string;
  tenantId: string;
  role: (typeof USER_ROLES)[number];
  email: string;
}
