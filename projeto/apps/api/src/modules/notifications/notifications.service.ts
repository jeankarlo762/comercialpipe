import { and, count, desc, eq, type SQL } from 'drizzle-orm';
import type { ListNotificationsQuery, NotificationType } from '@commercialpipe/shared-types';
import { db } from '../../shared/database/client.js';
import { notifications } from '../../shared/database/schema.js';

export async function listNotifications(userId: string, tenantId: string, query: ListNotificationsQuery) {
  const offset = (query.page - 1) * query.limit;
  const filters: SQL[] = [eq(notifications.userId, userId), eq(notifications.tenantId, tenantId)];
  if (query.unreadOnly) filters.push(eq(notifications.isRead, false));
  const where = and(...filters);

  const [rows, [totals], [unreadCount]] = await Promise.all([
    db.select().from(notifications).where(where).orderBy(desc(notifications.createdAt)).limit(query.limit).offset(offset),
    db.select({ value: count() }).from(notifications).where(where),
    db.select({ value: count() }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.tenantId, tenantId), eq(notifications.isRead, false))),
  ]);
  return { rows, total: totals?.value ?? 0, unreadCount: unreadCount?.value ?? 0 };
}

export async function markRead(userId: string, tenantId: string, id: string) {
  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId), eq(notifications.tenantId, tenantId)));
}

export async function markAllRead(userId: string, tenantId: string) {
  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.tenantId, tenantId), eq(notifications.isRead, false)));
}

export async function createNotification(params: {
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  leadId?: string;
}) {
  const [notif] = await db
    .insert(notifications)
    .values({
      tenantId: params.tenantId,
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      leadId: params.leadId ?? null,
    })
    .returning();
  return notif!;
}

export async function getUnreadCount(userId: string, tenantId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.tenantId, tenantId), eq(notifications.isRead, false)));
  return row?.value ?? 0;
}
