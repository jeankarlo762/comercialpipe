'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  CalendarClock,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Send,
  Webhook,
} from 'lucide-react';
import { toast } from 'sonner';
import type { TimelineType } from '@commercialpipe/shared-types';
import { apiPost, ApiError } from '@/lib/api';
import type { TimelineEntry } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const ICONS: Record<TimelineType, typeof MessageSquare> = {
  note: MessageSquare,
  email: Mail,
  call: Phone,
  meeting: CalendarClock,
  stage_change: RefreshCw,
  ai_action: Bot,
  system: RefreshCw,
  webhook: Webhook,
};

const ICON_COLORS: Record<TimelineType, string> = {
  note: 'text-sky-500',
  email: 'text-violet-500',
  call: 'text-emerald-500',
  meeting: 'text-amber-500',
  stage_change: 'text-primary',
  ai_action: 'text-fuchsia-500',
  system: 'text-muted-foreground',
  webhook: 'text-cyan-500',
};

export function Timeline({ leadId, entries }: { leadId: string; entries: TimelineEntry[] }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    try {
      await apiPost(`/leads/${leadId}/timeline`, { type: 'note', content: note.trim() });
      setNote('');
      await queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao adicionar nota');
    } finally {
      setSaving(false);
    }
  }

  const ordered = [...entries].reverse();

  return (
    <div className="flex h-full flex-col">
      <form onSubmit={addNote} className="mb-4 space-y-2">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Adicionar uma nota, registro de chamada ou e-mail..."
          rows={3}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={saving || !note.trim()}>
            <Send className="h-4 w-4" /> Registrar
          </Button>
        </div>
      </form>

      <div className="space-y-4 overflow-y-auto pr-1 scrollbar-thin">
        {ordered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Sem interações ainda.</p>
        )}
        {ordered.map((entry) => {
          const Icon = ICONS[entry.type];
          return (
            <div key={entry.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-full border bg-card', ICON_COLORS[entry.type])}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="mt-1 w-px flex-1 bg-border" />
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    {entry.type.replace('_', ' ')}
                  </span>
                  {entry.aiGenerated && (
                    <span className="rounded-full bg-fuchsia-500/15 px-1.5 text-[10px] font-medium text-fuchsia-500">
                      IA
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{entry.content}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
