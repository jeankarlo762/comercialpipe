'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle, Clock, ExternalLink, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPatch, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: 'pending' | 'done' | 'overdue';
  leadId: string;
  createdAt: string;
}

interface TaskWithLead extends Task {
  leadTitle?: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  done: 'Concluída',
  overdue: 'Atrasada',
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'secondary',
  done: 'success',
  overdue: 'destructive',
};

export default function TarefasPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'done'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', filter],
    queryFn: () =>
      apiGet<{ data: TaskWithLead[] }>('/tasks', {
        limit: 100,
        status: filter === 'all' ? undefined : filter,
      }).then((r) => r),
  });

  async function markDone(id: string) {
    try {
      await apiPatch(`/tasks/${id}`, { status: 'done' });
      toast.success('Tarefa concluída');
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha');
    }
  }

  const tasks: TaskWithLead[] = (data as { data?: TaskWithLead[] })?.data ?? [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate) >= today && new Date(t.dueDate) < new Date(today.getTime() + 86400000));
  const overdueTasks = tasks.filter((t) => t.status === 'overdue');
  const otherTasks = tasks.filter((t) => t.status === 'pending' && (!t.dueDate || new Date(t.dueDate) >= new Date(today.getTime() + 86400000)));
  const doneTasks = tasks.filter((t) => t.status === 'done');

  function TaskCard({ task }: { task: TaskWithLead }) {
    const isOverdue = task.status === 'overdue';
    const isDone = task.status === 'done';
    return (
      <div className={cn(
        'flex items-start gap-3 rounded-lg border p-3 transition-colors',
        isOverdue && 'border-destructive/30 bg-destructive/5',
        isDone && 'opacity-60',
      )}>
        <button
          type="button"
          onClick={() => !isDone && markDone(task.id)}
          className={cn('mt-0.5 shrink-0', isDone ? 'cursor-default text-brand' : 'text-muted-foreground hover:text-brand')}
        >
          {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={cn('text-sm font-medium', isDone && 'line-through')}>{task.title}</p>
            <Badge variant={STATUS_COLOR[task.status] as 'secondary' | 'destructive'} className="shrink-0 text-[10px]">
              {STATUS_LABEL[task.status]}
            </Badge>
          </div>
          {task.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{task.description}</p>
          )}
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
            {task.dueDate && (
              <span className={cn('flex items-center gap-1', isOverdue && 'text-destructive font-medium')}>
                <Clock className="h-3 w-3" />
                {formatDateTime(task.dueDate)}
              </span>
            )}
            <a
              href={`/leads/${task.leadId}`}
              className="flex items-center gap-1 hover:text-brand hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3" /> Ver lead
            </a>
          </div>
        </div>
      </div>
    );
  }

  function Section({ title, items, empty }: { title: string; items: TaskWithLead[]; empty?: string }) {
    if (items.length === 0 && !empty) return null;
    return (
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          {title}
          <span className="rounded-full bg-muted px-1.5 text-xs">{items.length}</span>
        </h2>
        {items.length === 0
          ? <p className="text-sm text-muted-foreground">{empty}</p>
          : items.map((t) => <TaskCard key={t.id} task={t} />)
        }
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tarefas</h1>
          <p className="text-sm text-muted-foreground">Fila de follow-ups vinculados a leads</p>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {(['all', 'pending', 'overdue', 'done'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
              filter === f ? 'border-brand bg-brand/15 text-brand' : 'hover:bg-accent',
            )}
          >
            {f === 'all' ? 'Todas' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 opacity-30" />
            <p className="font-medium">Nenhuma tarefa encontrada</p>
            <p className="text-sm">Crie tarefas diretamente nos leads para acompanhar follow-ups.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filter === 'all' ? (
            <>
              <Section title="⚠️ Atrasadas" items={overdueTasks} />
              <Section title="📅 Para hoje" items={todayTasks} empty="Nenhuma tarefa para hoje." />
              <Section title="📋 Próximas" items={otherTasks} />
              <Section title="✅ Concluídas" items={doneTasks} />
            </>
          ) : (
            <Section title={STATUS_LABEL[filter]} items={tasks} empty="Nenhuma tarefa neste filtro." />
          )}
        </div>
      )}
    </div>
  );
}
