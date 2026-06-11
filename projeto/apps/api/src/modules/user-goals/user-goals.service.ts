import { and, eq, sql } from 'drizzle-orm';
import type { ListGoalsQuery, UpsertGoalInput } from '@commercialpipe/shared-types';
import { db } from '../../shared/database/client.js';
import { leads, meetings, userGoals, users } from '../../shared/database/schema.js';

export async function upsertGoal(tenantId: string, createdBy: string, input: UpsertGoalInput) {
  const [goal] = await db
    .insert(userGoals)
    .values({
      tenantId,
      userId: input.userId,
      month: input.month,
      year: input.year,
      targetRevenue: input.targetRevenue !== undefined ? (input.targetRevenue?.toFixed(2) ?? null) : null,
      targetLeads: input.targetLeads ?? null,
      targetMeetings: input.targetMeetings ?? null,
      createdBy,
    })
    .onConflictDoUpdate({
      target: [userGoals.userId, userGoals.month, userGoals.year],
      set: {
        targetRevenue: sql`excluded.target_revenue`,
        targetLeads: sql`excluded.target_leads`,
        targetMeetings: sql`excluded.target_meetings`,
      },
    })
    .returning();
  return goal!;
}

export async function listGoalsWithProgress(tenantId: string, query: ListGoalsQuery) {
  const now = new Date();
  const month = query.month ?? now.getMonth() + 1;
  const year = query.year ?? now.getFullYear();

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const [goalsRows, reps] = await Promise.all([
    db
      .select()
      .from(userGoals)
      .where(and(eq(userGoals.tenantId, tenantId), eq(userGoals.month, month), eq(userGoals.year, year))),
    db.select({ id: users.id, name: users.name, role: users.role })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true))),
  ]);

  const wonLeads = await db.execute(sql`
    select owner_id, count(*)::int as won_leads,
           coalesce(sum(estimated_value), 0)::numeric as won_revenue
    from leads
    where tenant_id = ${tenantId}
      and status = 'won'
      and deleted_at is null
      and created_at >= ${monthStart.toISOString()}
      and created_at <= ${monthEnd.toISOString()}
    group by owner_id
  `) as unknown as Array<{ owner_id: string; won_leads: number; won_revenue: string }>;

  const doneMeetings = await db.execute(sql`
    select host_id, count(*)::int as done_meetings
    from meetings
    where tenant_id = ${tenantId}
      and status = 'done'
      and starts_at >= ${monthStart.toISOString()}
      and starts_at <= ${monthEnd.toISOString()}
    group by host_id
  `) as unknown as Array<{ host_id: string; done_meetings: number }>;

  const leadMap = new Map(wonLeads.map((r) => [r.owner_id, r]));
  const meetMap = new Map(doneMeetings.map((r) => [r.host_id, r]));
  const goalMap = new Map(goalsRows.map((g) => [g.userId, g]));

  return reps.map((u) => {
    const goal = goalMap.get(u.id);
    const perf = leadMap.get(u.id);
    const mts = meetMap.get(u.id);
    return {
      user: u,
      goal: goal ?? null,
      progress: {
        wonLeads: perf?.won_leads ?? 0,
        wonRevenue: perf?.won_revenue ?? '0',
        doneMeetings: mts?.done_meetings ?? 0,
      },
    };
  });
}
