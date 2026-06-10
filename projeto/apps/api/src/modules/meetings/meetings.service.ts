import { aliasedTable, and, asc, count, eq, gte, lte, type SQL } from 'drizzle-orm';
import type {
  CreateMeetingInput,
  ListMeetingsQuery,
  UpdateMeetingInput,
} from '@commercialpipe/shared-types';
import { db } from '../../shared/database/client.js';
import { leads, meetings, users } from '../../shared/database/schema.js';
import { BadRequestError, NotFoundError } from '../../shared/errors/app-error.js';
import { addTimelineEntry } from '../timeline/timeline.service.js';
import { createCalendarEvent } from '../integrations/google.service.js';

const scheduler = aliasedTable(users, 'scheduler');
const host = aliasedTable(users, 'host');

const selection = {
  id: meetings.id,
  leadId: meetings.leadId,
  title: meetings.title,
  startsAt: meetings.startsAt,
  endsAt: meetings.endsAt,
  location: meetings.location,
  notes: meetings.notes,
  meetLink: meetings.meetLink,
  status: meetings.status,
  scheduledById: meetings.scheduledById,
  hostId: meetings.hostId,
  createdAt: meetings.createdAt,
  leadTitle: leads.title,
  scheduledByName: scheduler.name,
  hostName: host.name,
};

export async function listMeetings(tenantId: string, query: ListMeetingsQuery) {
  const offset = (query.page - 1) * query.limit;
  const filters: SQL[] = [eq(meetings.tenantId, tenantId)];
  if (query.from) filters.push(gte(meetings.startsAt, new Date(query.from)));
  if (query.to) filters.push(lte(meetings.startsAt, new Date(query.to)));
  if (query.status) filters.push(eq(meetings.status, query.status));
  const where = and(...filters);

  const [rows, [totals]] = await Promise.all([
    db
      .select(selection)
      .from(meetings)
      .leftJoin(leads, eq(meetings.leadId, leads.id))
      .leftJoin(scheduler, eq(meetings.scheduledById, scheduler.id))
      .leftJoin(host, eq(meetings.hostId, host.id))
      .where(where)
      .orderBy(asc(meetings.startsAt))
      .limit(query.limit)
      .offset(offset),
    db.select({ value: count() }).from(meetings).where(where),
  ]);
  return { rows, total: totals?.value ?? 0 };
}

export async function createMeeting(
  tenantId: string,
  scheduledById: string,
  input: CreateMeetingInput,
) {
  const [lead] = await db
    .select({ id: leads.id })
    .from(leads)
    .where(and(eq(leads.id, input.leadId), eq(leads.tenantId, tenantId)))
    .limit(1);
  if (!lead) throw new BadRequestError('Lead inválido', 'INVALID_LEAD');

  let meetLink: string | null = null;
  let googleEventId: string | null = null;
  let location = input.location ?? null;
  if (input.withMeet) {
    const event = await createCalendarEvent(scheduledById, tenantId, {
      summary: input.title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      description: input.notes,
    });
    if (event) {
      meetLink = event.meetLink;
      googleEventId = event.googleEventId;
      if (event.meetLink && !location) location = event.meetLink;
    }
  }

  const [meeting] = await db
    .insert(meetings)
    .values({
      tenantId,
      leadId: input.leadId,
      title: input.title,
      scheduledById,
      hostId: input.hostId ?? scheduledById,
      startsAt: new Date(input.startsAt),
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      location,
      notes: input.notes ?? null,
      meetLink,
      googleEventId,
    })
    .returning();

  await addTimelineEntry({
    tenantId,
    leadId: input.leadId,
    type: 'meeting',
    content: `Reunião agendada: ${input.title} (${new Date(input.startsAt).toLocaleString('pt-BR')})`,
    metadata: { meetingId: meeting?.id },
    createdBy: scheduledById,
  });

  return meeting;
}

export async function updateMeeting(tenantId: string, id: string, input: UpdateMeetingInput) {
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.hostId !== undefined) patch.hostId = input.hostId;
  if (input.startsAt !== undefined) patch.startsAt = new Date(input.startsAt);
  if (input.endsAt !== undefined) patch.endsAt = input.endsAt ? new Date(input.endsAt) : null;
  if (input.location !== undefined) patch.location = input.location;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.status !== undefined) patch.status = input.status;

  const [meeting] = await db
    .update(meetings)
    .set(patch)
    .where(and(eq(meetings.id, id), eq(meetings.tenantId, tenantId)))
    .returning();
  if (!meeting) throw new NotFoundError('Reunião não encontrada', 'MEETING_NOT_FOUND');
  return meeting;
}

export async function deleteMeeting(tenantId: string, id: string) {
  const [deleted] = await db
    .delete(meetings)
    .where(and(eq(meetings.id, id), eq(meetings.tenantId, tenantId)))
    .returning({ id: meetings.id });
  if (!deleted) throw new NotFoundError('Reunião não encontrada', 'MEETING_NOT_FOUND');
}
