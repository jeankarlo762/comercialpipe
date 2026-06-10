import { z } from 'zod';
import { AI_SCORES, LEAD_SOURCES, LEAD_STATUSES } from '../enums.js';

const customFields = z.record(z.string(), z.unknown());
const utmData = z
  .object({
    utm_source: z.string().optional(),
    utm_medium: z.string().optional(),
    utm_campaign: z.string().optional(),
    utm_term: z.string().optional(),
    utm_content: z.string().optional(),
  })
  .passthrough();

export const createLeadSchema = z.object({
  title: z.string().min(1).max(200),
  ownerId: z.string().uuid().optional(),
  stageId: z.string().uuid().optional(),
  contactId: z.string().uuid().nullable().optional(),
  accountId: z.string().uuid().nullable().optional(),
  estimatedValue: z.number().nonnegative().optional(),
  currency: z.string().length(3).default('BRL'),
  probability: z.number().int().min(0).max(100).optional(),
  expectedCloseDate: z.string().date().nullable().optional(),
  source: z.enum(LEAD_SOURCES).default('manual'),
  utmData: utmData.optional(),
  customFields: customFields.optional(),
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const updateLeadSchema = z
  .object({
    title: z.string().min(1).max(200),
    ownerId: z.string().uuid(),
    contactId: z.string().uuid().nullable(),
    accountId: z.string().uuid().nullable(),
    estimatedValue: z.number().nonnegative(),
    currency: z.string().length(3),
    probability: z.number().int().min(0).max(100),
    expectedCloseDate: z.string().date().nullable(),
    customFields,
  })
  .partial();
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

// Criação rápida a partir de nome/empresa/telefone (cria contato + empresa + lead).
export const quickCreateLeadSchema = z.object({
  name: z.string().min(1).max(160),
  company: z.string().min(1).max(160),
  phone: z.string().min(3).max(40),
  email: z.string().email().optional(),
  revenue: z.number().nonnegative().optional(),
  description: z.string().max(2000).optional(),
  stageId: z.string().uuid().optional(),
  pipelineId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
});
export type QuickCreateLeadInput = z.infer<typeof quickCreateLeadSchema>;

export const moveStageSchema = z.object({
  stageId: z.string().uuid(),
  lostReason: z.string().max(500).optional(),
});
export type MoveStageInput = z.infer<typeof moveStageSchema>;

export const listLeadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  stageId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  score: z.enum(AI_SCORES).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  search: z.string().max(200).optional(),
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
});
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
