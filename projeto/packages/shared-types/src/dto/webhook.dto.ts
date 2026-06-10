import { z } from 'zod';
import { ACTION_TYPES } from '../enums.js';

export const inboundLeadSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  contact: z
    .object({
      name: z.string().min(1).max(160),
      email: z.string().email().optional(),
      phone: z.string().max(40).optional(),
      roleTitle: z.string().max(120).optional(),
    })
    .optional(),
  account: z
    .object({
      name: z.string().min(1).max(160),
      domain: z.string().max(160).optional(),
      website: z.string().url().optional(),
    })
    .optional(),
  estimatedValue: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  utm: z.record(z.string(), z.string()).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});
export type InboundLeadInput = z.infer<typeof inboundLeadSchema>;

const n8nCallbackActionSchema = z.object({
  type: z.enum(ACTION_TYPES),
  content: z.string().optional(),
  title: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const n8nCallbackSchema = z.object({
  executionId: z.string().min(1),
  leadId: z.string().uuid(),
  status: z.enum(['success', 'failed']).default('success'),
  errorMessage: z.string().optional(),
  actions: z.array(n8nCallbackActionSchema).default([]),
});
export type N8nCallbackInput = z.infer<typeof n8nCallbackSchema>;

export const n8nConfigSchema = z.object({
  n8nBaseUrl: z.string().url().nullable(),
  n8nApiKey: z.string().min(1).nullable(),
  n8nWebhookSecret: z.string().min(8).nullable(),
});
export type N8nConfigInput = z.infer<typeof n8nConfigSchema>;
