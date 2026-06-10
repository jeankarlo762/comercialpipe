import { sql } from 'drizzle-orm';
import { db } from '../../shared/database/client.js';

export async function pipelineConversion(tenantId: string) {
  const rows = await db.execute(sql`
    select s.id as stage_id, s.name as stage_name, s.order_index,
           count(l.id) filter (where l.deleted_at is null)::int as lead_count,
           coalesce(sum(case when l.deleted_at is null then l.estimated_value else 0 end), 0)::text as total_value
    from pipeline_stages s
    left join leads l on l.stage_id = s.id and l.tenant_id = s.tenant_id
    where s.tenant_id = ${tenantId}
    group by s.id, s.name, s.order_index
    order by s.order_index
  `);
  return rows as unknown as Array<{
    stage_id: string;
    stage_name: string;
    order_index: number;
    lead_count: number;
    total_value: string;
  }>;
}

export async function funnelTiming(tenantId: string) {
  const [row] = (await db.execute(sql`
    select
      count(*) filter (where status = 'won')::int as won,
      count(*) filter (where status = 'lost')::int as lost,
      count(*) filter (where status = 'open')::int as open,
      coalesce(avg(extract(epoch from (last_activity_at - created_at)) / 86400) filter (where status in ('won','lost')), 0)::numeric(10,2) as avg_days_to_close
    from leads
    where tenant_id = ${tenantId} and deleted_at is null
  `)) as unknown as Array<{ won: number; lost: number; open: number; avg_days_to_close: string }>;
  return row;
}

export async function scoreVsConversion(tenantId: string) {
  const rows = await db.execute(sql`
    select coalesce(ai_score::text, 'unscored') as score,
           count(*)::int as total,
           count(*) filter (where status = 'won')::int as won,
           round(100.0 * count(*) filter (where status = 'won') / nullif(count(*) filter (where status in ('won','lost')), 0), 1) as win_rate
    from leads
    where tenant_id = ${tenantId} and deleted_at is null
    group by coalesce(ai_score::text, 'unscored')
    order by score
  `);
  return rows as unknown as Array<{ score: string; total: number; won: number; win_rate: string | null }>;
}

export async function topPerformers(tenantId: string) {
  const rows = await db.execute(sql`
    select u.id as user_id, u.name,
           count(l.id) filter (where l.status = 'won')::int as deals_won,
           coalesce(sum(case when l.status = 'won' then l.estimated_value else 0 end), 0)::text as revenue_won
    from users u
    left join leads l on l.owner_id = u.id and l.tenant_id = u.tenant_id and l.deleted_at is null
    where u.tenant_id = ${tenantId}
    group by u.id, u.name
    order by deals_won desc, revenue_won desc
    limit 10
  `);
  return rows as unknown as Array<{ user_id: string; name: string; deals_won: number; revenue_won: string }>;
}

export async function repPerformance(tenantId: string) {
  const rows = await db.execute(sql`
    select u.id as user_id, u.name, u.role,
           count(l.id) filter (where l.deleted_at is null and l.status = 'open')::int as open_leads,
           count(l.id) filter (where l.status = 'won')::int as won,
           count(l.id) filter (where l.status = 'lost')::int as lost,
           coalesce(sum(case when l.status = 'won' then l.estimated_value else 0 end), 0)::text as revenue_won,
           (select count(*)::int from meetings m where m.host_id = u.id and m.tenant_id = u.tenant_id) as meetings
    from users u
    left join leads l on l.owner_id = u.id and l.tenant_id = u.tenant_id
    where u.tenant_id = ${tenantId} and u.role in ('sdr','closer')
    group by u.id, u.name, u.role
    order by won desc, open_leads desc
  `);
  return rows as unknown as Array<{
    user_id: string;
    name: string;
    role: string;
    open_leads: number;
    won: number;
    lost: number;
    revenue_won: string;
    meetings: number;
  }>;
}

export async function leadsOverTime(tenantId: string, days = 30) {
  const rows = await db.execute(sql`
    select
      date_trunc('day', created_at)::date::text as day,
      count(*)::int as created,
      count(*) filter (where status = 'won')::int as won,
      count(*) filter (where status = 'lost')::int as lost
    from leads
    where tenant_id = ${tenantId}
      and deleted_at is null
      and created_at >= now() - (${days} || ' days')::interval
    group by date_trunc('day', created_at)
    order by day
  `);
  return rows as unknown as Array<{ day: string; created: number; won: number; lost: number }>;
}

export async function avgTimePerStage(tenantId: string) {
  const rows = await db.execute(sql`
    with stage_spans as (
      select
        l.stage_id,
        s.name as stage_name,
        s.order_index,
        extract(epoch from (l.last_activity_at - l.created_at)) / 86400 as days_in_stage
      from leads l
      join pipeline_stages s on s.id = l.stage_id
      where l.tenant_id = ${tenantId} and l.deleted_at is null
    )
    select stage_id, stage_name, order_index,
           round(avg(days_in_stage)::numeric, 1)::text as avg_days,
           count(*)::int as lead_count
    from stage_spans
    group by stage_id, stage_name, order_index
    order by order_index
  `);
  return rows as unknown as Array<{ stage_id: string; stage_name: string; order_index: number; avg_days: string; lead_count: number }>;
}

export async function conversionByStage(tenantId: string) {
  const rows = await db.execute(sql`
    with ordered as (
      select s.id, s.name, s.order_index,
             count(l.id) filter (where l.deleted_at is null)::int as total,
             count(l.id) filter (where l.status = 'won')::int as won
      from pipeline_stages s
      left join leads l on l.stage_id = s.id and l.tenant_id = s.tenant_id
      where s.tenant_id = ${tenantId}
      group by s.id, s.name, s.order_index
      order by s.order_index
    )
    select id as stage_id, name as stage_name, order_index, total, won,
           case when total > 0 then round(100.0 * won / total, 1) else 0 end as conversion_rate
    from ordered
  `);
  return rows as unknown as Array<{ stage_id: string; stage_name: string; order_index: number; total: number; won: number; conversion_rate: number }>;
}

export async function getOverview(tenantId: string) {
  const [conversion, timing, scores, performers, reps, leadsTime, stageTime, stageConversion] = await Promise.all([
    pipelineConversion(tenantId),
    funnelTiming(tenantId),
    scoreVsConversion(tenantId),
    topPerformers(tenantId),
    repPerformance(tenantId),
    leadsOverTime(tenantId, 30),
    avgTimePerStage(tenantId),
    conversionByStage(tenantId),
  ]);
  return { conversion, timing, scoreVsConversion: scores, topPerformers: performers, reps, leadsOverTime: leadsTime, avgTimePerStage: stageTime, conversionByStage: stageConversion };
}
