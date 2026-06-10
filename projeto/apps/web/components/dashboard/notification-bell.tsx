'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { cn, formatDateTime } from '@/lib/utils';

interface NotifItem {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  leadId: string | null;
}

const TYPE_ICON: Record<string, string> = {
  lead_assigned: '👤',
  lead_forgotten: '⏰',
  meeting_reminder: '📅',
  lead_moved: '➡️',
  task_due: '✅',
  goal_alert: '🎯',
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => apiGet<{ unreadCount: number }>('/notifications/unread-count'),
    refetchInterval: 30_000,
  });

  const { data: notifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: () =>
      apiGet<{ data: NotifItem[]; meta: { unreadCount: number } }>('/notifications', { limit: 20 }).then((r) => r),
    enabled: open,
  });

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function markRead(id: string) {
    try {
      await apiPost(`/notifications/${id}/read`);
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      await queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    } catch { /* silent */ }
  }

  async function markAll() {
    try {
      await apiPost('/notifications/read-all');
      toast.success('Todas marcadas como lidas');
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      await queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha');
    }
  }

  const unread = countData?.unreadCount ?? 0;
  const items: NotifItem[] = (notifs as { data?: NotifItem[] })?.data ?? [];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:bg-accent"
        aria-label="Notificações"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b px-3 py-2.5">
            <span className="text-sm font-semibold">Notificações</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="flex items-center gap-1 text-[11px] text-brand hover:underline"
              >
                <CheckCheck className="h-3 w-3" /> Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y">
            {items.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma notificação</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => { if (!n.isRead) markRead(n.id); }}
                  className={cn(
                    'flex w-full gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent',
                    !n.isRead && 'bg-brand/[0.04]',
                  )}
                >
                  <span className="mt-0.5 text-base">{TYPE_ICON[n.type] ?? '🔔'}</span>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-xs font-medium', !n.isRead && 'text-foreground')}>{n.title}</p>
                    <p className="line-clamp-2 text-[11px] text-muted-foreground">{n.body}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/70">{formatDateTime(n.createdAt)}</p>
                  </div>
                  {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
