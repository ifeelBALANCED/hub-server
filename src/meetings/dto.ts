import { z } from 'zod';

export const createMeetingDto = z.object({
  title: z.string().min(1).max(255).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const resolveCodeDto = z.object({
  code: z.string().regex(/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/),
});

export const roomTokenDto = z.object({
  allowGuest: z.boolean().optional().default(false),
  displayName: z.string().optional(),
});

export const getMeetingsQueryDto = z.object({
  upcoming: z
    .string()
    .optional()
    .transform(val => val === 'true'),
  limit: z.string().optional().default('10').transform(Number),
});

export type CreateMeetingDto = z.infer<typeof createMeetingDto>;
export type ResolveCodeDto = z.infer<typeof resolveCodeDto>;
export type RoomTokenDto = z.infer<typeof roomTokenDto>;
export type GetMeetingsQueryDto = z.infer<typeof getMeetingsQueryDto>;
