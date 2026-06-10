import { z } from 'zod';

export const upsertGoalSchema = z.object({
  userId: z.string().uuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  targetRevenue: z.number().nonnegative().nullable().optional(),
  targetLeads: z.number().int().nonnegative().nullable().optional(),
  targetMeetings: z.number().int().nonnegative().nullable().optional(),
});
export type UpsertGoalInput = z.infer<typeof upsertGoalSchema>;

export const listGoalsQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2020).optional(),
});
export type ListGoalsQuery = z.infer<typeof listGoalsQuerySchema>;
