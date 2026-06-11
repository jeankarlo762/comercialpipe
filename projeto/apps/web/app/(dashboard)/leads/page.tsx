'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Filter, Search, X } from 'lucide-react';
import { apiGet, apiGetPaginated } from '@/lib/api';
import type { Lead, Stage } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LeadQuickView } from '@/components/leads/lead-quick-view';

interface AssignableUser { id: string; name: string; role: string; }

export default function LeadsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [stageFilter, setStageFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const hasFilters = !!(stageFilter || ownerFilter || dateFrom || dateTo);

  const { data, isLoading } = useQuery({
    queryKey: ['leads', { list: true, search, page, stageFilter, ownerFilter, dateFrom, dateTo }],
    queryFn: () =>
      apiGetPaginated<Lead[]>('/leads', {
        search: search || undefined,
        page,
        limit: 20,
        stageId: stageFilter || undefined,
        ownerId: ownerFilter || undefined,
        createdFrom: dateFrom || undefined,
        createdTo: dateTo || undefined,
      }),
  });

  const { data: stages } = useQuery({
    queryKey: ['stages'],
    queryFn: () => apiGet<{ stages: Stage[] }>('/pipeline/stages').then((r) => r.stages),
    staleTime: 5 * 60_000,
  });

  const { data: users } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () => apiGet<{ users: AssignableUser[] }>('/users/assignable').then((r) => r.users),
    staleTime: 5 * 60_000,
  });

  const leads = data?.data ?? [];
  const meta = data?.meta;

  function clearFilters() {
    setStageFilter('');
    setOwnerFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">{meta?.total ?? 0} oportunidades</p>
        </div>

        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, empresa..."
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            className="h-9 pl-9 pr-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <Button
          variant={filtersOpen || hasFilters ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltersOpen((v) => !v)}
          className="gap-1.5"
        >
          <Filter className="h-3.5 w-3.5" />
          Filtros
          {hasFilters && (
            <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
              {[stageFilter, ownerFilter, dateFrom, dateTo].filter(Boolean).length}
            </span>
          )}
        </Button>
      </div>

      {/* Filter bar */}
      {filtersOpen && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Estágio</p>
            <Select value={stageFilter || '__all'} onValueChange={(v) => { setPage(1); setStageFilter(v === '__all' ? '' : v); }}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos os estágios</SelectItem>
                {(stages ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Responsável</p>
            <Select value={ownerFilter || '__all'} onValueChange={(v) => { setPage(1); setOwnerFilter(v === '__all' ? '' : v); }}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos</SelectItem>
                <SelectItem value="unassigned">Sem responsável</SelectItem>
                {(users ?? []).map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Entrada de</p>
            <div className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setPage(1); setDateFrom(e.target.value); }}
                className="h-8 w-36 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Até</p>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setPage(1); setDateTo(e.target.value); }}
              className="h-8 w-36 text-xs"
            />
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1 text-xs text-muted-foreground">
              <X className="h-3 w-3" /> Limpar filtros
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">Estágio</th>
              <th className="px-4 py-3 font-medium">Responsável</th>
              <th className="px-4 py-3 font-medium">Entrada</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-4 py-3">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              : leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className="cursor-pointer transition-colors hover:bg-accent/50"
                  >
                    <td className="px-4 py-3 font-medium">
                      {lead.contactName ?? lead.title.split(' — ')[0] ?? lead.title}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lead.accountName ?? lead.title.split(' — ')[1] ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: lead.stageColor ?? '#888' }} />
                        {lead.stageName ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.ownerName ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(lead.createdAt)}</td>
                  </tr>
                ))}
            {!isLoading && leads.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Nenhum lead encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            {meta.page} / {meta.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </Button>
        </div>
      )}

      <LeadQuickView leadId={selectedLeadId} onOpenChange={(open) => !open && setSelectedLeadId(null)} />
    </div>
  );
}
