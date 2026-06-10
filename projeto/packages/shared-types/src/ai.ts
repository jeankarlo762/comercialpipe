import { z } from 'zod';
import { AI_SCORES } from './enums.js';

export const AI_CREDIT_COSTS = {
  lead_scoring: 1,
  timeline_summary: 2,
  next_best_action: 1,
  email_draft: 3,
  bulk_scoring: 0.5,
} as const;

export type AiOperation = keyof typeof AI_CREDIT_COSTS;

export const aiScoreResultSchema = z.object({
  score: z.enum(AI_SCORES),
  reason: z.string().min(1),
  confidence: z.number().min(0).max(100),
});
export type AiScoreResult = z.infer<typeof aiScoreResultSchema>;

export const EMAIL_TEMPLATES = ['sales', 'follow_up', 'proposal', 'reactivation'] as const;
export type EmailTemplate = (typeof EMAIL_TEMPLATES)[number];

export const NBA_ACTION_TYPES = [
  'send_email',
  'make_call',
  'schedule_meeting',
  'send_proposal',
  'follow_up',
] as const;
export type NbaActionType = (typeof NBA_ACTION_TYPES)[number];

export const nbaResultSchema = z.object({
  action_type: z.enum(NBA_ACTION_TYPES),
  priority: z.enum(['high', 'medium', 'low']),
  suggested_message: z.string().min(1),
  reasoning: z.string().min(1),
  best_time: z.string().min(1),
});
export type NbaResult = z.infer<typeof nbaResultSchema>;

export const emailDraftRequestSchema = z.object({
  template: z.enum(EMAIL_TEMPLATES).default('follow_up'),
  tone: z.enum(['formal', 'casual', 'consultative']).default('consultative'),
  instructions: z.string().max(2000).optional(),
});
export type EmailDraftRequest = z.infer<typeof emailDraftRequestSchema>;

export const emailDraftResultSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
});
export type EmailDraftResult = z.infer<typeof emailDraftResultSchema>;
