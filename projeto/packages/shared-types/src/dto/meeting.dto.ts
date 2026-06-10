import { z } from 'zod';

export const MEETING_STATUSES = ['scheduled', 'done', 'canceled'] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export const createMeetingSchema = z.object({
  leadId: z.string().uuid(),
  title: z.string().min(1).max(200),
  hostId: z.string().uuid().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  location: z.string().max(300).optional(),
  notes: z.string().max(2000).optional(),
  withMeet: z.boolean().default(false),
});
export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;

export const updateMeetingSchema = z
  .object({
    title: z.string().min(1).max(200),
    hostId: z.string().uuid().nullable(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime().nullable(),
    location: z.string().max(300).nullable(),
    notes: z.string().max(2000).nullable(),
    status: z.enum(MEETING_STATUSES),
  })
  .partial();
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;

export const listMeetingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  status: z.enum(MEETING_STATUSES).optional(),
});
export type ListMeetingsQuery = z.infer<typeof listMeetingsQuerySchema>;
