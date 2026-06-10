'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiGetPaginated } from '@/lib/api';
import type { Lead } from '@/lib/types';
import { formatCurrency, relativeDays } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScoreBadge } from '@/components/score-badge';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'destructive'> = {
  open: 'default',
  won: 'success',
  lost: 'destructive',
};

export default function LeadsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['leads', { list: true, search, page }],
    queryFn: () => apiGetPaginated<Lead[]>('/leads', { search: search || undefined, page, limit: 20 }),
  });

  const leads = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">{meta?.total ?? 0} oportunidades</p>
        </div>
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="h-9 w-64"
        />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Título</th>
              <th className="px-4 py-3 font-medium">Estágio</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Responsável</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Atividade</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-3">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              : leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => router.push(`/leads/${lead.id}`)}
                    className="cursor-pointer transition-colors hover:bg-accent/50"
                  >
                    <td className="px-4 py-3 font-medium">{lead.title}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: lead.stageColor ?? '#888' }} />
                        {lead.stageName ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3"><ScoreBadge score={lead.aiScore} /></td>
                    <td className="px-4 py-3 font-medium text-primary">{formatCurrency(lead.estimatedValue, lead.currency)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.ownerName ?? '—'}</td>
                    <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[lead.status] ?? 'default'}>{lead.status}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground">{relativeDays(lead.lastActivityAt)}</td>
                  </tr>
                ))}
            {!isLoading && leads.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
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
    </div>
  );
}
