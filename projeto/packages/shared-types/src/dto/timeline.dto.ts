import { z } from 'zod';
import { TASK_STATUSES, TIMELINE_TYPES } from '../enums.js';

const manualTimelineTypes = ['note', 'email', 'call', 'meeting'] as const;

export const createTimelineEntrySchema = z.object({
  type: z.enum(manualTimelineTypes).default('note'),
  content: z.string().min(1).max(10000),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreateTimelineEntryInput = z.infer<typeof createTimelineEntrySchema>;

export const listTimelineQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  type: z.enum(TIMELINE_TYPES).optional(),
});
export type ListTimelineQuery = z.infer<typeof listTimelineQuerySchema>;

export const createTaskSchema = z.object({
  leadId: z.string().uuid(),
  assignedTo: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(5000).nullable(),
    assignedTo: z.string().uuid(),
    dueDate: z.string().datetime().nullable(),
    status: z.enum(TASK_STATUSES),
  })
  .partial();
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const listTasksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  leadId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  status: z.enum(TASK_STATUSES).optional(),
});
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
