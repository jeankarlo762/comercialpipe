'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Link2,
  Plus,
  UserX,
  User,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from '@/lib/api';
import type { Meeting } from '@/lib/types';
import { useStages } from '@/lib/queries';
import { cn, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LeadQuickView } from '@/components/leads/lead-quick-view';
import { NewMeetingDialog } from '@/components/calendar/new-meeting-dialog';

interface GoogleStatus {
  configured: boolean;
  connected: boolean;
  email: string | null;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function GoogleConnect({ status }: { status: GoogleStatus | undefined }) {
  const queryClient = useQueryClient();
  if (!status) return null;

  async function connect() {
    try {
      const { url } = await apiGet<{ url: string }>('/integrations/google/connect');
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao conectar');
    }
  }
  async function disconnect() {
    await apiPost('/integrations/google/disconnect');
    await queryClient.invalidateQueries({ queryKey: ['google-status'] });
    toast.success('Google desconectado');
  }

  if (!status.configured) {
    return (
      <span className="text-xs text-muted-foreground">
        Google não configurado no servidor
      </span>
    );
  }
  if (status.connected) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="flex items-center gap-1 text-[hsl(var(--success))]">
          <Video className="h-3.5 w-3.5" /> {status.email ?? 'Google conectado'}
        </span>
        <button onClick={disconnect} className="text-muted-foreground underline">desconectar</button>
      </div>
    );
  }
  return (
    <Button variant="outline" size="sm" onClick={connect}>
      <Link2 className="h-4 w-4" /> Conectar Google Calendar
    </Button>
  );
}

function RescheduleDialog({
  meeting,
  onClose,
}: {
  meeting: Meeting;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [startsAt, setStartsAt] = useState(() => {
    const d = new Date(meeting.startsAt);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPatch(`/meetings/${meeting.id}`, { startsAt: new Date(startsAt).toISOString() });
      toast.success('Reunião reagendada');
      await queryClient.invalidateQueries({ queryKey: ['meetings'] });
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao reagendar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reagendar reunião</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <p className="text-sm text-muted-foreground">{meeting.title}</p>
          <div className="space-y-2">
            <Label>Nova data e hora</Label>
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Confirmar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NoShowDialog({
  meeting,
  onClose,
}: {
  meeting: Meeting;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: stages } = useStages();
  const [stageId, setStageId] = useState('');
  const [saving, setSaving] = useState(false);

  async function confirm() {
    if (!stageId) return toast.error('Selecione o estágio de destino');
    setSaving(true);
    try {
      await Promise.all([
        apiDelete(`/meetings/${meeting.id}`),
        apiPatch(`/leads/${meeting.leadId}/stage`, { stageId }),
      ]);
      toast.success('Lead marcado como no-show');
      await queryClient.invalidateQueries({ queryKey: ['meetings'] });
      await queryClient.invalidateQueries({ queryKey: ['board'] });
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao marcar no-show');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <UserX className="h-5 w-5" /> Marcar como No-Show
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            A reunião <strong className="text-foreground">"{meeting.title}"</strong> será cancelada e o lead será movido para o estágio selecionado.
          </p>
          <div className="space-y-2">
            <Label>Mover lead para o estágio</Label>
            <Select value={stageId} onValueChange={setStageId}>
              <SelectTrigger><SelectValue placeholder="Selecione o estágio" /></SelectTrigger>
              <SelectContent>
                {(stages ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" onClick={confirm} disabled={saving || !stageId}>
            {saving ? 'Confirmando...' : 'Confirmar no-show'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MeetingDetailDialog({
  meeting,
  googleReady,
  onClose,
  onOpenLead,
}: {
  meeting: Meeting | null;
  googleReady: boolean;
  onClose: () => void;
  onOpenLead: (leadId: string) => void;
}) {
  const [showReschedule, setShowReschedule] = useState(false);
  const [showNoShow, setShowNoShow] = useState(false);

  if (!meeting) return null;

  if (showReschedule) {
    return <RescheduleDialog meeting={meeting} onClose={() => { setShowReschedule(false); onClose(); }} />;
  }
  if (showNoShow) {
    return <NoShowDialog meeting={meeting} onClose={() => { setShowNoShow(false); onClose(); }} />;
  }

  const hasMeetLink = Boolean(meeting.meetLink);
  const timeStr = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(meeting.startsAt));

  return (
    <Dialog open={Boolean(meeting)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="pr-6">{meeting.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2 text-muted-foreground">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="capitalize">{timeStr}</span>
          </div>
          {meeting.leadTitle && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <ExternalLink className="h-4 w-4 shrink-0" />
              <span>{meeting.leadTitle}</span>
            </div>
          )}
          {meeting.hostName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4 shrink-0" />
              <span>Responsável: {meeting.hostName}</span>
            </div>
          )}
          {meeting.notes && (
            <p className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">{meeting.notes}</p>
          )}
        </div>

        <div className="mt-2 space-y-2">
          {hasMeetLink ? (
            <Button
              className="w-full gap-2 bg-green-600 text-white hover:bg-green-700"
              onClick={() => window.open(meeting.meetLink!, '_blank')}
            >
              <Video className="h-4 w-4" />
              Entrar na chamada
            </Button>
          ) : googleReady ? (
            <Button className="w-full gap-2" disabled variant="outline">
              <Video className="h-4 w-4" />
              Sem link do Meet
            </Button>
          ) : (
            <Button className="w-full gap-2" disabled variant="outline">
              <Video className="h-4 w-4" />
              Conecte o Google para Meet
            </Button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowReschedule(true)}
            >
              <CalendarClock className="h-4 w-4" />
              Reagendar
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setShowNoShow(true)}
            >
              <UserX className="h-4 w-4" />
              No-Show
            </Button>
          </div>

          <Button
            variant="ghost"
            className="w-full gap-2 text-muted-foreground"
            onClick={() => { onClose(); onOpenLead(meeting.leadId); }}
          >
            <ExternalLink className="h-4 w-4" />
            Abrir lead completo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Carregando…</div>}>
      <CalendarContent />
    </Suspense>
  );
}

function CalendarContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newDate, setNewDate] = useState<string | null>(null);

  useEffect(() => {
    const g = searchParams.get('google');
    if (g === 'connected') {
      toast.success('Google Calendar conectado!');
      void queryClient.invalidateQueries({ queryKey: ['google-status'] });
    } else if (g === 'error') {
      toast.error('Não foi possível conectar o Google.');
    }
  }, [searchParams, queryClient]);

  const { data: status } = useQuery({
    queryKey: ['google-status'],
    queryFn: () => apiGet<GoogleStatus>('/integrations/google/status'),
    staleTime: 30_000,
  });
  const googleReady = Boolean(status?.configured && status?.connected);

  const { data: meetings } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => apiGet<Meeting[]>('/meetings', { limit: 200 }),
    staleTime: 60_000,
  });

  const byDay = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const m of meetings ?? []) {
      const key = dateKey(new Date(m.startsAt));
      const arr = map.get(key);
      if (arr) arr.push(m);
      else map.set(key, [m]);
    }
    return map;
  }, [meetings]);

  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const result: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) result.push(null);
    for (let d = 1; d <= daysInMonth; d++) result.push(new Date(cursor.year, cursor.month, d));
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [cursor]);

  const todayKey = dateKey(new Date());

  function move(delta: number) {
    setCursor((c) => {
      const m = c.month + delta;
      return { year: c.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  }

  function openNew(date: Date | null) {
    setNewDate(date ? dateKey(date) : null);
    setNewOpen(true);
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <CalendarDays className="h-6 w-6 text-brand" /> Calendário
          </h1>
          <p className="text-sm text-muted-foreground">Reuniões agendadas</p>
        </div>
        <div className="flex items-center gap-3">
          <GoogleConnect status={status} />
          <Button onClick={() => openNew(null)}>
            <Plus className="h-4 w-4" /> Nova reunião
          </Button>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => move(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="icon" onClick={() => move(1)}><ChevronRight className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => { const n = new Date(); setCursor({ year: n.getFullYear(), month: n.getMonth() }); }}>
          Hoje
        </Button>
        <span className="ml-2 text-lg font-semibold">{MONTHS[cursor.month]} {cursor.year}</span>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs font-medium uppercase text-muted-foreground">
          {WEEKDAYS.map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            const key = date ? dateKey(date) : `empty-${i}`;
            const dayMeetings = date ? byDay.get(dateKey(date)) ?? [] : [];
            const isToday = date && dateKey(date) === todayKey;
            return (
              <div
                key={key}
                className={cn(
                  'min-h-[96px] border-b border-r p-1.5 last:border-r-0',
                  !date && 'bg-muted/20',
                  date && 'group cursor-pointer hover:bg-accent/40',
                )}
                onClick={() => date && openNew(date)}
              >
                {date && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        'text-xs font-medium',
                        isToday && 'flex h-5 w-5 items-center justify-center rounded-full bg-brand text-brand-foreground',
                      )}>
                        {date.getDate()}
                      </span>
                      <Plus className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" />
                    </div>
                    <div className="mt-1 space-y-1">
                      {dayMeetings.slice(0, 3).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedMeeting(m); }}
                          className={cn(
                            'block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] transition-colors',
                            m.meetLink
                              ? 'bg-green-500/15 hover:bg-green-500/25'
                              : 'bg-brand/15 hover:bg-brand/25',
                          )}
                          title={`${m.title} — ${m.leadTitle ?? ''}`}
                        >
                          <span className="font-medium">
                            {new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(m.startsAt))}
                          </span>{' '}
                          {m.title}
                          {m.meetLink && <Video className="ml-1 inline h-2.5 w-2.5 text-green-500" />}
                        </button>
                      ))}
                      {dayMeetings.length > 3 && (
                        <span className="px-1.5 text-[10px] text-muted-foreground">+{dayMeetings.length - 3} mais</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <MeetingDetailDialog
        meeting={selectedMeeting}
        googleReady={googleReady}
        onClose={() => setSelectedMeeting(null)}
        onOpenLead={(id) => setSelectedLeadId(id)}
      />
      <LeadQuickView leadId={selectedLeadId} onOpenChange={(o) => !o && setSelectedLeadId(null)} />
      <NewMeetingDialog open={newOpen} onOpenChange={setNewOpen} defaultDate={newDate} googleReady={googleReady} />
    </div>
  );
}
