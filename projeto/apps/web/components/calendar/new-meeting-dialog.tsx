'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import type { Lead } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AssignableUser {
  id: string;
  name: string;
}

export function NewMeetingDialog({
  open,
  onOpenChange,
  defaultDate,
  googleReady,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate: string | null; // YYYY-MM-DD
  googleReady: boolean;
}) {
  const queryClient = useQueryClient();
  const [leadId, setLeadId] = useState('');
  const [title, setTitle] = useState('Reunião');
  const [hostId, setHostId] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [withMeet, setWithMeet] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setStartsAt(defaultDate ? `${defaultDate}T09:00` : '');
  }, [open, defaultDate]);

  const { data: leads } = useQuery({
    queryKey: ['leads', { forMeeting: true }],
    queryFn: () => apiGet<Lead[]>('/leads', { limit: 100, status: 'open' }),
    enabled: open,
  });
  const { data: users } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () => apiGet<{ users: AssignableUser[] }>('/users/assignable').then((r) => r.users),
    enabled: open,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!leadId) return toast.error('Selecione um lead');
    if (!startsAt) return toast.error('Informe data e hora');
    setSaving(true);
    try {
      await apiPost('/meetings', {
        leadId,
        title,
        hostId: hostId || undefined,
        startsAt: new Date(startsAt).toISOString(),
        withMeet: withMeet && googleReady,
      });
      toast.success('Reunião agendada');
      setLeadId('');
      setTitle('Reunião');
      setWithMeet(false);
      onOpenChange(false);
      await queryClient.invalidateQueries({ queryKey: ['meetings'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao agendar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova reunião</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <Label>Lead</Label>
            <Select value={leadId} onValueChange={setLeadId}>
              <SelectTrigger><SelectValue placeholder="Selecione o lead" /></SelectTrigger>
              <SelectContent>
                {(leads ?? []).map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.contactName ? `${l.contactName} — ${l.accountName ?? ''}` : l.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data e hora</Label>
              <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={hostId} onValueChange={setHostId}>
                <SelectTrigger><SelectValue placeholder="Eu mesmo" /></SelectTrigger>
                <SelectContent>
                  {(users ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className={cn('flex items-center gap-2 text-sm', !googleReady && 'cursor-not-allowed text-muted-foreground')}>
            <input type="checkbox" disabled={!googleReady} checked={withMeet} onChange={(e) => setWithMeet(e.target.checked)} />
            Gerar link do Google Meet {!googleReady && <span className="text-xs">(conecte o Google)</span>}
          </label>
          <DialogFooter>
            <Button type="submit" disabled={saving}>{saving ? 'Agendando...' : 'Agendar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
