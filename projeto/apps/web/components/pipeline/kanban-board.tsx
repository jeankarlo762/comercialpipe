'use client';

import { useEffect, useMemo, useState } from 'react';
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarRange, ChevronDown, Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPatch, ApiError } from '@/lib/api';
import { GripVertical } from 'lucide-react';
import type { Lead, Stage } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LeadQuickView } from '@/components/leads/lead-quick-view';
import { LeadCard } from './lead-card';

interface Filters {
  ownerId: string;
  createdFrom: string;
  createdTo: string;
  period: string;
}

const PERIODS: { label: string; value: string }[] = [
  { label: 'Hoje', value: 'today' },
  { label: 'Ontem', value: 'yesterday' },
  { label: 'Uma semana', value: 'week' },
  { label: 'Um mês', value: 'month' },
  { label: 'Um ano', value: 'year' },
];

function periodToDates(period: string): { from: string; to: string } {
  const now = new Date();
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  if (period === 'today') { start.setHours(0, 0, 0, 0); }
  else if (period === 'yesterday') { start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0); end.setDate(end.getDate() - 1); end.setHours(23, 59, 59, 999); }
  else if (period === 'week') { start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0); }
  else if (period === 'month') { start.setMonth(start.getMonth() - 1); start.setHours(0, 0, 0, 0); }
  else if (period === 'year') { start.setFullYear(start.getFullYear() - 1); start.setHours(0, 0, 0, 0); }
  return { from: start.toISOString(), to: end.toISOString() };
}

type Columns = Record<string, Lead[]>;

function group(stages: Stage[], leads: Lead[]): Columns {
  const cols: Columns = {};
  for (const stage of stages) cols[stage.id] = [];
  for (const lead of leads) {
    (cols[lead.stageId] ??= []).push(lead);
  }
  return cols;
}

export function KanbanBoard({ stages, pipelineId }: { stages: Stage[]; pipelineId?: string }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>({ ownerId: '', createdFrom: '', createdTo: '', period: '' });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [scheduleMode, setScheduleMode] = useState(false);

  function openLead(id: string) { setScheduleMode(false); setSelectedLeadId(id); }
  function openSchedule(id: string) { setScheduleMode(true); setSelectedLeadId(id); }

  function setFilter(patch: Partial<Filters>) {
    setFilters((f) => ({ ...f, ...patch }));
  }

  function clearFilters() {
    setFilters({ ownerId: '', createdFrom: '', createdTo: '', period: '' });
  }

  const periodDates = filters.period ? periodToDates(filters.period) : null;
  const createdFrom = periodDates?.from ?? (filters.createdFrom ? new Date(filters.createdFrom).toISOString() : undefined);
  const createdTo = periodDates?.to ?? (filters.createdTo ? new Date(filters.createdTo + 'T23:59:59').toISOString() : undefined);

  const hasActiveFilters = filters.ownerId || filters.createdFrom || filters.createdTo || filters.period;

  const { data: leads } = useQuery({
    queryKey: ['leads', { board: true, search, ownerId: filters.ownerId, createdFrom, createdTo }],
    queryFn: () =>
      apiGet<Lead[]>('/leads', {
        limit: 100,
        status: 'open',
        search: search || undefined,
        ownerId: filters.ownerId || undefined,
        createdFrom,
        createdTo,
      }),
  });

  const { data: users } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () => apiGet<{ users: { id: string; name: string }[] }>('/users/assignable').then((r) => r.users),
    staleTime: 5 * 60_000,
  });

  const [columns, setColumns] = useState<Columns>({});
  const [stageOrder, setStageOrder] = useState<Stage[]>(stages);

  useEffect(() => {
    if (leads) setColumns(group(stages, leads));
  }, [leads, stages]);

  useEffect(() => {
    setStageOrder(stages);
  }, [stages]);

  const totals = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    for (const stage of stages) {
      const items = columns[stage.id] ?? [];
      map[stage.id] = {
        count: items.length,
        value: items.reduce((sum, l) => sum + Number(l.estimatedValue ?? 0), 0),
      };
    }
    return map;
  }, [columns, stages]);

  async function assignLead(leadId: string, userId: string | null) {
    try {
      await apiPatch(`/leads/${leadId}`, { ownerId: userId });
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(userId ? 'Responsável atribuído' : 'Responsável removido');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao atribuir');
    }
  }

  async function onDragEnd(result: DropResult) {
    const { source, destination, draggableId, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'COLUMN') {
      const newOrder = Array.from(stageOrder);
      const [moved] = newOrder.splice(source.index, 1);
      newOrder.splice(destination.index, 0, moved);
      setStageOrder(newOrder);
      try {
        await apiPatch('/pipeline/stages/reorder', {
          order: newOrder.map((s, i) => ({ id: s.id, orderIndex: i })),
        });
        await queryClient.invalidateQueries({ queryKey: ['stages'] });
      } catch {
        setStageOrder(stages);
        toast.error('Falha ao reordenar colunas');
      }
      return;
    }

    const sourceItems = Array.from(columns[source.droppableId] ?? []);
    const [moved] = sourceItems.splice(source.index, 1);
    if (!moved) return;
    const destItems = Array.from(columns[destination.droppableId] ?? []);
    destItems.splice(destination.index, 0, { ...moved, stageId: destination.droppableId });

    const next: Columns = {
      ...columns,
      [source.droppableId]: sourceItems,
      [destination.droppableId]: destItems,
    };
    setColumns(next);

    if (source.droppableId !== destination.droppableId) {
      try {
        await apiPatch(`/leads/${draggableId}/stage`, { stageId: destination.droppableId });
        const stage = stageOrder.find((s) => s.id === destination.droppableId);
        toast.success(`Movido para "${stage?.name}"`);
        await queryClient.invalidateQueries({ queryKey: ['leads'] });
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Falha ao mover lead');
        if (leads) setColumns(group(stages, leads));
      }
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 space-y-2">
        {/* Search + filter toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Buscar leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-56"
          />
          <Button
            variant={filtersOpen ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {hasActiveFilters && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-white">
                {[filters.ownerId, filters.period, (filters.createdFrom || filters.createdTo)].filter(Boolean).length}
              </span>
            )}
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', filtersOpen && 'rotate-180')} />
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" /> Limpar
            </Button>
          )}
        </div>

        {/* Filter panel */}
        {filtersOpen && (
          <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-3">
            {/* User filter */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Responsável</p>
              <Select value={filters.ownerId || 'all'} onValueChange={(v) => setFilter({ ownerId: v === 'all' ? '' : v })}>
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(users ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Period shortcuts */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Período</p>
              <div className="flex gap-1">
                {PERIODS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setFilter({ period: filters.period === p.value ? '' : p.value, createdFrom: '', createdTo: '' })}
                    className={cn(
                      'rounded-md border px-2 py-1 text-xs transition-colors',
                      filters.period === p.value
                        ? 'border-brand bg-brand/15 font-medium text-brand'
                        : 'hover:bg-accent',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom date range */}
            <div className="space-y-1">
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <CalendarRange className="h-3 w-3" /> Intervalo personalizado
              </p>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={filters.createdFrom}
                  onChange={(e) => setFilter({ createdFrom: e.target.value, period: '' })}
                  className="h-8 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <span className="text-xs text-muted-foreground">até</span>
                <input
                  type="date"
                  value={filters.createdTo}
                  onChange={(e) => setFilter({ createdTo: e.target.value, period: '' })}
                  className="h-8 rounded-md border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board" type="COLUMN" direction="horizontal">
          {(boardProvided) => (
            <div
              ref={boardProvided.innerRef}
              {...boardProvided.droppableProps}
              className="flex flex-1 gap-4 overflow-x-auto pb-4 scrollbar-thin"
            >
              {stageOrder.map((stage, colIndex) => (
                <Draggable key={stage.id} draggableId={stage.id} index={colIndex}>
                  {(colProvided, colSnapshot) => (
                    <div
                      ref={colProvided.innerRef}
                      {...colProvided.draggableProps}
                      className={cn(
                        'flex w-72 shrink-0 flex-col rounded-lg bg-muted/40 transition-shadow',
                        colSnapshot.isDragging && 'shadow-lg ring-1 ring-primary/30',
                      )}
                    >
                      <div className="flex items-center justify-between border-b px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            {...colProvided.dragHandleProps}
                            title="Arrastar coluna"
                            className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
                          >
                            <GripVertical className="h-3.5 w-3.5" />
                          </span>
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                          <span className="text-sm font-semibold">{stage.name}</span>
                          <span className="rounded-full bg-background px-1.5 text-xs text-muted-foreground">
                            {totals[stage.id]?.count ?? 0}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                          {formatCurrency(totals[stage.id]?.value ?? 0)}
                        </span>
                      </div>
                      <Droppable droppableId={stage.id} type="CARD">
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={cn(
                              'flex min-h-[120px] flex-1 flex-col gap-2 p-2 transition-colors',
                              snapshot.isDraggingOver && 'bg-primary/5',
                            )}
                          >
                            {(columns[stage.id] ?? []).map((lead, index) => (
                              <LeadCard
                                key={lead.id}
                                lead={lead}
                                index={index}
                                users={users ?? []}
                                onSelect={openLead}
                                onSchedule={openSchedule}
                                onAssign={assignLead}
                              />
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  )}
                </Draggable>
              ))}
              {boardProvided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <LeadQuickView
        leadId={selectedLeadId}
        initialScheduling={scheduleMode}
        onOpenChange={(o) => !o && setSelectedLeadId(null)}
      />
    </div>
  );
}
