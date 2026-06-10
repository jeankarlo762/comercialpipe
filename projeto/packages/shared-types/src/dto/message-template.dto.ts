import { z } from 'zod';

export const createMessageTemplateSchema = z.object({
  name: z.string().min(1).max(160),
  category: z.string().min(1).max(60).default('geral'),
  body: z.string().min(1).max(5000),
});
export type CreateMessageTemplateInput = z.infer<typeof createMessageTemplateSchema>;

export const updateMessageTemplateSchema = z
  .object({
    name: z.string().min(1).max(160),
    category: z.string().min(1).max(60),
    body: z.string().min(1).max(5000),
    isActive: z.boolean(),
  })
  .partial();
export type UpdateMessageTemplateInput = z.infer<typeof updateMessageTemplateSchema>;

export const listMessageTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  category: z.string().optional(),
  search: z.string().max(200).optional(),
});
export type ListMessageTemplatesQuery = z.infer<typeof listMessageTemplatesQuerySchema>;
