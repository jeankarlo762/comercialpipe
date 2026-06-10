import { z } from 'zod';

export const NOTIFICATION_TYPES = [
  'lead_assigned',
  'lead_forgotten',
  'meeting_reminder',
  'lead_moved',
  'task_due',
  'goal_alert',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  unreadOnly: z.coerce.boolean().optional(),
});
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
