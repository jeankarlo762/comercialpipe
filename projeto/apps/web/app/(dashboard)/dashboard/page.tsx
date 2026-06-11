'use client';

import { useQuery } from '@tanstack/react-query';
import { roleHasPermission } from '@commercialpipe/shared-types';
import { CheckCircle2, Circle, Users } from 'lucide-react';
import { apiGet, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScoreBadge } from '@/components/score-badge';
import type { AiScore } from '@commercialpipe/shared-types';

interface Task {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  leadId: string | null;
}

interface Overview {
  conversion: Array<{ stage_id: string; stage_name: string; lead_count: number; total_value: string }>;
  timing: { won: number; lost: number; open: number; avg_days_to_close: string };
  scoreVsConversion: Array<{ score: string; total: number; won: number; win_rate: string | null }>;
  topPerformers: Array<{ user_id: string; name: string; deals_won: number; revenue_won: string }>;
  reps: Array<{
    user_id: string; name: string; role: string;
    open_leads: number; won: number; lost: number; revenue_won: string; meetings: number;
  }>;
  leadsOverTime: Array<{ day: string; created: number; won: number; lost: number }>;
  avgTimePerStage: Array<{ stage_id: string; stage_name: string; avg_days: string; lead_count: number }>;
  conversionByStage: Array<{ stage_id: string; stage_name: string; total: number; won: number; conversion_rate: number }>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user != null && roleHasPermission(user.role, 'users:manage');
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => apiGet<Overview>('/analytics/overview'),
  });

  const { data: tasksData } = useQuery({
    queryKey: ['tasks-today'],
    queryFn: () => apiGet<{ data: Task[] }>('/tasks', { limit: 50, status: 'pending' }).then((r) => r.data),
    staleTime: 60_000,
  });

  const today = new Date().toISOString().slice(0, 10);
  const tasksDue = (tasksData ?? []).filter((t) => t.dueDate?.slice(0, 10) === today);
  const leadsToday = data?.leadsOverTime?.find((d) => d.day?.slice(0, 10) === today)?.created ?? 0;

  if (error) {
    const msg =
      error instanceof ApiError && error.status === 403
        ? 'Sem permissão para visualizar o dashboard.'
        : 'Não foi possível carregar o dashboard. Tente novamente.';
    return <div className="p-6 text-sm text-muted-foreground">{msg}</div>;
  }
  if (isLoading || !data) {
    return (
      <div className="grid gap-4 p-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56" />)}
      </div>
    );
  }

  const maxCount = Math.max(1, ...data.conversion.map((c) => c.lead_count));

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Desempenho do funil comercial</p>
      </div>

      {/* Informações do dia */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-brand" /> Tarefas de hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasksDue.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa para hoje.</p>
            ) : (
              <ul className="space-y-1.5">
                {tasksDue.slice(0, 5).map((t) => (
                  <li key={t.id} className="flex items-center gap-2 text-sm">
                    <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="line-clamp-1">{t.title}</span>
                  </li>
                ))}
                {tasksDue.length > 5 && (
                  <li className="text-xs text-muted-foreground">+{tasksDue.length - 5} tarefas</li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4 text-brand" /> Leads hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{leadsToday}</p>
            <p className="text-xs text-muted-foreground">leads criados hoje</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Negócios ganhos" value={String(data.timing.won)} highlight />
        <Stat label="Em aberto" value={String(data.timing.open)} />
        <Stat label="Tempo médio p/ fechar" value={`${Math.round(Number(data.timing.avg_days_to_close))} dias`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Leads por estágio</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.conversion.map((c) => (
              <div key={c.stage_id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{c.stage_name}</span>
                  <span className="text-muted-foreground">{c.lead_count} · {formatCurrency(c.total_value)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${(c.lead_count / maxCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Score de IA vs. conversão</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.scoreVsConversion.map((s) => (
              <div key={s.score} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  {['A', 'B', 'C', 'D'].includes(s.score) ? <ScoreBadge score={s.score as AiScore} /> : <span className="text-muted-foreground">s/score</span>}
                  <span>{s.total} leads</span>
                </div>
                <span className="font-medium">{s.win_rate ? `${s.win_rate}% conversão` : '—'}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Top performers</CardTitle></CardHeader>
        <CardContent>
          <div className="divide-y">
            {data.topPerformers.map((p) => (
              <div key={p.user_id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-medium">{p.name}</span>
                <span className="text-muted-foreground">
                  {p.deals_won} ganhos · {formatCurrency(p.revenue_won)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Leads criados vs fechados (últimos 30 dias) */}
      {data.leadsOverTime && data.leadsOverTime.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Leads criados vs fechados — últimos 30 dias</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="flex min-w-max items-end gap-0.5 pb-2">
                {data.leadsOverTime.slice(-30).map((d) => {
                  const maxVal = Math.max(1, ...data.leadsOverTime.map((r) => r.created));
                  return (
                    <div key={d.day} className="group relative flex flex-col items-center gap-0.5">
                      <div className="absolute bottom-full mb-1 hidden rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background group-hover:block whitespace-nowrap z-10">
                        {d.day}: {d.created} criados, {d.won} ganhos
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="w-4 rounded-sm bg-brand/70" style={{ height: `${Math.max(4, (d.created / maxVal) * 60)}px` }} />
                        {d.won > 0 && <div className="w-4 rounded-sm bg-emerald-500" style={{ height: `${Math.max(2, (d.won / maxVal) * 30)}px` }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-brand/70" /> Criados</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-emerald-500" /> Ganhos</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Taxa de conversão + tempo médio por estágio */}
      {data.conversionByStage && data.avgTimePerStage && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Taxa de conversão por estágio</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data.conversionByStage.map((s) => (
                <div key={s.stage_id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{s.stage_name}</span>
                    <span className="text-muted-foreground">{s.total} leads · {s.conversion_rate}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, Number(s.conversion_rate))}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Tempo médio por estágio</CardTitle></CardHeader>
            <CardContent>
              <div className="divide-y">
                {data.avgTimePerStage.map((s) => (
                  <div key={s.stage_id} className="flex items-center justify-between py-2.5 text-sm">
                    <span>{s.stage_name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {Number(s.avg_days).toFixed(1)} dias · <span className="text-foreground">{s.lead_count} leads</span>
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isAdmin && (
        <Card className="border-brand/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="rounded bg-brand/15 px-2 py-0.5 text-xs font-semibold text-foreground">ADMIN</span>
              Desempenho por SDR / Closer
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Vendedor</th>
                    <th className="px-4 py-2 font-medium">Papel</th>
                    <th className="px-4 py-2 font-medium">Em aberto</th>
                    <th className="px-4 py-2 font-medium">Ganhos</th>
                    <th className="px-4 py-2 font-medium">Perdidos</th>
                    <th className="px-4 py-2 font-medium">Reuniões</th>
                    <th className="px-4 py-2 font-medium">Receita</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.reps.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Nenhum SDR/Closer cadastrado.</td></tr>
                  ) : (
                    data.reps.map((r) => (
                      <tr key={r.user_id}>
                        <td className="px-4 py-2 font-medium">{r.name}</td>
                        <td className="px-4 py-2"><Badge variant="secondary">{r.role}</Badge></td>
                        <td className="px-4 py-2">{r.open_leads}</td>
                        <td className="px-4 py-2 text-[hsl(var(--success))]">{r.won}</td>
                        <td className="px-4 py-2 text-destructive">{r.lost}</td>
                        <td className="px-4 py-2">{r.meetings}</td>
                        <td className="px-4 py-2 font-medium">{formatCurrency(r.revenue_won)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? 'border-brand/40' : undefined}>
      <CardContent className="py-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
