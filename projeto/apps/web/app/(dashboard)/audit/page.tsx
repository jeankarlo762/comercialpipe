'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import { apiGetPaginated } from '@/lib/api';
import type { AuditLogItem } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const ACTION_VARIANT: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
  created: 'success',
  deleted: 'destructive',
  updated: 'warning',
};

function variantFor(action: string) {
  if (action.includes('deleted')) return ACTION_VARIANT.deleted;
  if (action.includes('created')) return ACTION_VARIANT.created;
  if (action.includes('changed') || action.includes('updated')) return ACTION_VARIANT.updated;
  return 'secondary';
}

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['audit', page],
    queryFn: () => apiGetPaginated<AuditLogItem[]>('/audit', { page, limit: 30 }),
  });

  const logs = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ScrollText className="h-6 w-6 text-brand" /> Auditoria
        </h1>
        <p className="text-sm text-muted-foreground">Registro imutável de ações no workspace</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {isLoading ? (
              <div className="p-4"><Skeleton className="h-12 w-full" /></div>
            ) : logs.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">Nenhum registro.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="flex min-w-0 items-center gap-3">
                    <Badge variant={variantFor(log.action)}>{log.action}</Badge>
                    <div className="min-w-0">
                      <p className="truncate">
                        <span className="font-medium">{log.userName ?? 'sistema'}</span>
                        <span className="text-muted-foreground"> · {log.entityType}</span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{log.entityId ?? ''}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground">{meta.page} / {meta.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
        </div>
      )}
    </div>
  );
}
