import { z } from 'zod';

const hexColor = z.string().regex(/^#([0-9a-fA-F]{6})$/, 'must be a hex color like #4F46E5');

export const createStageSchema = z.object({
  name: z.string().min(1).max(80),
  color: hexColor.default('#6366f1'),
  isClosedWon: z.boolean().default(false),
  isClosedLost: z.boolean().default(false),
  orderIndex: z.number().int().min(0).optional(),
  pipelineId: z.string().uuid().optional(),
});

export const createPipelineSchema = z.object({
  name: z.string().min(1).max(100),
  color: hexColor.default('#6366f1'),
});
export type CreatePipelineInput = z.infer<typeof createPipelineSchema>;

export const updatePipelineSchema = createPipelineSchema.partial();
export type UpdatePipelineInput = z.infer<typeof updatePipelineSchema>;
export type CreateStageInput = z.infer<typeof createStageSchema>;

export const updateStageSchema = createStageSchema.partial();
export type UpdateStageInput = z.infer<typeof updateStageSchema>;

export const reorderStagesSchema = z.object({
  order: z
    .array(z.object({ id: z.string().uuid(), orderIndex: z.number().int().min(0) }))
    .min(1),
});
export type ReorderStagesInput = z.infer<typeof reorderStagesSchema>;

export const deleteStageSchema = z.object({
  moveToStageId: z.string().uuid(),
});
export type DeleteStageInput = z.infer<typeof deleteStageSchema>;
