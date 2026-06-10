import { z } from 'zod';
import { ACTION_TYPES, CONDITION_OPERATORS, TRIGGER_TYPES } from '../enums.js';

export const automationConditionSchema = z.object({
  field: z.string().min(1),
  op: z.enum(CONDITION_OPERATORS),
  value: z.unknown(),
});
export type AutomationCondition = z.infer<typeof automationConditionSchema>;

export const automationActionSchema = z.object({
  type: z.enum(ACTION_TYPES),
  config: z.record(z.string(), z.unknown()).default({}),
});
export type AutomationAction = z.infer<typeof automationActionSchema>;

export const triggerConfigSchema = z
  .object({
    fromStageId: z.string().uuid().optional(),
    toStageId: z.string().uuid().optional(),
    inactivityDays: z.number().int().min(1).optional(),
  })
  .passthrough();

export const createAutomationSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(2000).nullable().optional(),
  triggerType: z.enum(TRIGGER_TYPES),
  triggerConfig: triggerConfigSchema.default({}),
  conditions: z.array(automationConditionSchema).default([]),
  actions: z.array(automationActionSchema).min(1),
  isActive: z.boolean().default(true),
});
export type CreateAutomationInput = z.infer<typeof createAutomationSchema>;

export const updateAutomationSchema = createAutomationSchema.partial();
export type UpdateAutomationInput = z.infer<typeof updateAutomationSchema>;

export const testAutomationSchema = z.object({
  leadId: z.string().uuid().optional(),
});
export type TestAutomationInput = z.infer<typeof testAutomationSchema>;
