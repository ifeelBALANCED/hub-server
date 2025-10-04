import { z } from 'zod';

export const registerDto = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(255),
});

export const loginDto = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const oauthGoogleDto = z.object({
  idToken: z.string(),
});

export const refreshDto = z.object({
  refreshToken: z.string().optional(),
});

export const updateProfileDto = z.object({
  displayName: z.string().min(1).max(255).optional(),
  avatarUrl: z.string().url().optional(),
});

export type RegisterDto = z.infer<typeof registerDto>;
export type LoginDto = z.infer<typeof loginDto>;
export type OAuthGoogleDto = z.infer<typeof oauthGoogleDto>;
export type RefreshDto = z.infer<typeof refreshDto>;
export type UpdateProfileDto = z.infer<typeof updateProfileDto>;
