'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Building2,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  Mail,
  Pencil,
  Phone,
  PhoneCall,
  Save,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPatch, apiPost, ApiError } from '@/lib/api';
import type { LeadDetail } from '@/lib/types';
import { usePipelines, useStages } from '@/lib/queries';
import { api4comHref, openExternal, whatsappHref } from '@/lib/contact';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AssignableUser { id: string; name: string; role: string; }

const SOURCE_LABEL: Record<string, string> = {
  manual: 'Manual', webhook: 'Webhook', form: 'Formulário', import: 'Importação',
};

const SCORE_COLOR: Record<string, string> = {
  A: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  B: 'bg-brand/20 text-brand',
  C: 'bg-amber-400/20 text-amber-700 dark:text-amber-400',
  D: 'bg-destructive/15 text-destructive',
};

function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

function InfoRow({ icon, label, value, className }: { icon: React.ReactNode; label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start gap-2.5 py-1.5', className)}>
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">{label}</p>
        <p className="text-sm text-foreground">{value || <span className="text-muted-foreground/40">—</span>}</p>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pb-1 pt-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{children}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export function LeadQuickView({
  leadId,
  onOpenChange,
  initialScheduling = false,
}: {
  leadId: string | null;
  onOpenChange: (open: boolean) => void;
  initialScheduling?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [scheduling, setScheduling] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedPipelineId, setSelectedPipelineId] = useState('');

  // Local owner state for immediate UI update on assignment
  const [localOwner, setLocalOwner] = useState<{ id: string | null; name: string | null } | null>(null);

  useEffect(() => {
    if (leadId) {
      setScheduling(initialScheduling);
      setEditing(false);
      setSelectedPipelineId('');
      setLocalOwner(null);
    }
  }, [leadId, initialScheduling]);

  const { data, isLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => apiGet<LeadDetail>(`/leads/${leadId}`),
    enabled: leadId !== null,
  });

  const { data: stages } = useStages(selectedPipelineId || undefined);
  const { data: pipelines } = usePipelines();

  const { data: users } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () => apiGet<{ users: AssignableUser[] }>('/users/assignable').then((r) => r.users),
    staleTime: 5 * 60_000,
  });

  const lead = data?.lead;
  const contact = data?.contact;
  const account = data?.account;
  const stage = data?.stage;
  const phone = contact?.phone ?? '';

  // Extract form metadata from custom fields
  const rawCustomFields = (lead?.customFields as Record<string, unknown>) ?? {};
  const formName = rawCustomFields['__formName'] as string | undefined;
  const fieldTypes = rawCustomFields['__fieldTypes'] as Record<string, string> | undefined;
  const description = rawCustomFields['description'] as string | undefined;

  // Filter out system/display fields
  const customEntries = Object.entries(rawCustomFields).filter(
    ([k]) => k !== 'description' && !k.startsWith('__'),
  );

  // Display owner — use local state for immediate feedback
  const displayOwnerId = localOwner !== null ? localOwner.id : (lead?.ownerId ?? null);
  const displayOwnerName = localOwner !== null ? localOwner.name : (lead?.ownerName ?? null);

  function close() {
    setScheduling(false);
    setEditing(false);
    setLocalOwner(null);
    onOpenChange(false);
  }

  async function handleAssign(userId: string) {
    if (!lead) return;
    const resolvedId = userId === 'none' ? null : userId;
    const resolvedName = resolvedId ? (users?.find((u) => u.id === resolvedId)?.name ?? null) : null;
    // Optimistic update
    setLocalOwner({ id: resolvedId, name: resolvedName });
    try {
      await apiPatch(`/leads/${lead.id}`, { ownerId: resolvedId });
      toast.success(resolvedId ? 'Responsável atribuído' : 'Responsável removido');
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (err) {
      setLocalOwner(null); // revert
      toast.error(err instanceof ApiError ? err.message : 'Falha ao atribuir');
    }
  }

  async function handleMoveStage(stageId: string) {
    if (!lead || stageId === lead.stageId) return;
    try {
      await apiPatch(`/leads/${lead.id}/stage`, { stageId });
      const s = stages?.find((x) => x.id === stageId);
      toast.success(`Movido para "${s?.name}"`);
      await queryClient.invalidateQueries({ queryKey: ['lead', lead.id] });
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao mover');
    }
  }

  function copyPhone() {
    if (!phone) return;
    void navigator.clipboard.writeText(phone);
    toast.success('Telefone copiado');
  }

  return (
    <Dialog open={leadId !== null} onOpenChange={(o) => (o ? null : close())}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto p-0">
        {isLoading || !lead ? (
          <div className="space-y-3 p-6">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="relative border-b px-5 py-4">
              <div className="flex items-start gap-3 pr-8">
                <div className="flex-1 min-w-0">
                  {/* Stage + move row */}
                  <div className="mb-2 flex items-center gap-2 flex-wrap">
                    {stage && (
                      <span
                        className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                        style={{ backgroundColor: stage.color }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                        {stage.name}
                      </span>
                    )}
                    {lead.aiScore && (
                      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', SCORE_COLOR[lead.aiScore])}>
                        Score {lead.aiScore}
                      </span>
                    )}

                    {/* Inline move stage */}
                    <div className="flex items-center gap-1">
                      {/* Pipeline selector (if multiple pipelines) */}
                      {pipelines && pipelines.length > 1 && (
                        <Select
                          value={selectedPipelineId || '__current'}
                          onValueChange={(v) => setSelectedPipelineId(v === '__current' ? '' : v)}
                        >
                          <SelectTrigger className="h-6 gap-1 border-dashed px-2 text-[11px] text-muted-foreground">
                            <SelectValue placeholder="Pipe" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__current">Pipeline atual</SelectItem>
                            {pipelines.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {/* Stage move select */}
                    <Select
                      value={lead.stageId}
                      onValueChange={(v) => handleMoveStage(v)}
                    >
                      <SelectTrigger className="h-6 gap-1 border-dashed px-2 text-[11px] text-muted-foreground hover:border-brand hover:text-brand transition-colors w-auto min-w-[100px]">
                        <SelectValue placeholder="Mover para..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(stages ?? []).map((s) => (
                          <SelectItem key={s.id} value={s.id} className="text-xs">
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                              {s.name}
                              {s.id === lead.stageId && <CheckCircle2 className="ml-1 h-3 w-3 text-brand" />}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    </div>
                  </div>

                  <DialogHeader className="text-left">
                    <DialogTitle className="text-base leading-snug">{contact?.name ?? lead.title}</DialogTitle>
                    {account?.name && (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5 shrink-0" /> {account.name}
                      </p>
                    )}
                  </DialogHeader>
                </div>
              </div>
              {/* Edit button top-right */}
              <div className="absolute right-10 top-4 flex items-center gap-1">
                <button
                  type="button"
                  title="Editar"
                  onClick={() => setEditing((v) => !v)}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                    editing ? 'bg-brand text-white' : 'hover:bg-accent text-muted-foreground',
                  )}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 pb-5">
              {/* Quick actions */}
              {phone && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="gap-2 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                    onClick={() => openExternal(whatsappHref(phone))}
                  >
                    <WhatsappIcon className="h-4 w-4" /> WhatsApp
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => openExternal(api4comHref(phone))}>
                    <PhoneCall className="h-4 w-4" /> Ligar
                  </Button>
                </div>
              )}

              {/* Edit form */}
              {editing && lead && (
                <EditForm
                  lead={lead}
                  contact={contact}
                  onSaved={async () => {
                    setEditing(false);
                    await queryClient.invalidateQueries({ queryKey: ['lead', lead.id] });
                    await queryClient.invalidateQueries({ queryKey: ['leads'] });
                  }}
                  onCancel={() => setEditing(false)}
                />
              )}

              {/* Contact info */}
              <SectionTitle>Contato</SectionTitle>
              <div className="divide-y divide-border/50 rounded-lg border bg-muted/20">
                {(phone || contact) && (
                  <div className="flex items-center gap-2 px-3 py-2">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="flex flex-1 flex-col gap-0.5">
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Telefone</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{phone || <span className="text-muted-foreground italic">Não informado</span>}</span>
                        {phone && (
                          <button
                            type="button"
                            onClick={copyPhone}
                            title="Copiar telefone"
                            className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {contact?.email && <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="E-mail" value={contact.email} className="px-3" />}
                {contact?.roleTitle && <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Cargo" value={contact.roleTitle} className="px-3" />}
                {contact?.linkedinUrl && (
                  <div className="px-3">
                    <InfoRow
                      icon={<Globe className="h-3.5 w-3.5" />}
                      label="LinkedIn"
                      value={
                        <a href={contact.linkedinUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                          Ver perfil
                        </a>
                      }
                    />
                  </div>
                )}
              </div>

              {/* Company info */}
              {account && (
                <>
                  <SectionTitle>Empresa</SectionTitle>
                  <div className="divide-y divide-border/50 rounded-lg border bg-muted/20">
                    <InfoRow icon={<Building2 className="h-3.5 w-3.5" />} label="Nome" value={account.name} className="px-3" />
                    {account.industry && <InfoRow icon={<TrendingUp className="h-3.5 w-3.5" />} label="Segmento" value={account.industry} className="px-3" />}
                    {account.size && <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Tamanho" value={`${account.size} funcionários`} className="px-3" />}
                    {account.website && (
                      <div className="px-3">
                        <InfoRow
                          icon={<Globe className="h-3.5 w-3.5" />}
                          label="Site"
                          value={<a href={account.website} target="_blank" rel="noreferrer" className="text-brand hover:underline truncate">{account.website}</a>}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Deal info */}
              <SectionTitle>Negócio</SectionTitle>
              <div className="divide-y divide-border/50 rounded-lg border bg-muted/20">
                {lead.estimatedValue && (
                  <InfoRow
                    icon={<span className="text-xs font-bold">R$</span>}
                    label="Valor estimado"
                    value={<span className="font-semibold text-brand">{formatCurrency(lead.estimatedValue, lead.currency)}</span>}
                    className="px-3"
                  />
                )}
                {lead.probability != null && (
                  <InfoRow icon={<TrendingUp className="h-3.5 w-3.5" />} label="Probabilidade" value={`${lead.probability}%`} className="px-3" />
                )}
                {lead.expectedCloseDate && (
                  <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Previsão de fechamento" value={formatDate(lead.expectedCloseDate)} className="px-3" />
                )}
                <InfoRow
                  icon={<span className="text-xs">🔗</span>}
                  label="Origem"
                  value={
                    lead.source === 'form' && formName
                      ? `Formulário: ${formName}`
                      : (SOURCE_LABEL[lead.source] ?? lead.source)
                  }
                  className="px-3"
                />
                <InfoRow
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  label="Entrada no pipeline"
                  value={formatDate(lead.createdAt)}
                  className="px-3"
                />
              </div>

              {/* Responsible */}
              <SectionTitle>Responsável</SectionTitle>
              <div className="rounded-lg border bg-muted/20 px-3 py-2">
                <Select value={displayOwnerId ?? 'none'} onValueChange={handleAssign}>
                  <SelectTrigger className="h-9 border-0 bg-transparent p-0 text-sm shadow-none focus:ring-0">
                    <div className="flex items-center gap-2">
                      {displayOwnerName ? (
                        <>
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/20 text-[10px] font-bold text-brand">
                            {displayOwnerName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
                          </span>
                          <span>{displayOwnerName}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Sem responsável — clique para atribuir</span>
                      )}
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem responsável</SelectItem>
                    {(users ?? []).map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom fields from form */}
              {customEntries.length > 0 && (
                <>
                  <SectionTitle>Campos adicionais</SectionTitle>
                  <div className="divide-y divide-border/50 rounded-lg border bg-muted/20">
                    {customEntries.map(([key, value]) => {
                      const fieldType = fieldTypes?.[key];
                      let displayValue: React.ReactNode;
                      if (Array.isArray(value)) {
                        displayValue = value.join(', ') || '—';
                      } else if (fieldType === 'currency' && typeof value === 'number') {
                        displayValue = (
                          <span className="font-semibold text-brand">
                            {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        );
                      } else if (value === true) {
                        displayValue = '✓ Sim';
                      } else if (value === false || value === null || value === undefined) {
                        displayValue = '—';
                      } else {
                        displayValue = String(value);
                      }
                      return (
                        <InfoRow
                          key={key}
                          icon={<span className="h-3.5 w-3.5" />}
                          label={key}
                          value={displayValue}
                          className="px-3"
                        />
                      );
                    })}
                  </div>
                </>
              )}

              {/* Description */}
              {typeof description === 'string' && description && (
                <>
                  <SectionTitle>Observações</SectionTitle>
                  <p className="rounded-lg border bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">{description}</p>
                </>
              )}

              {/* Schedule meeting */}
              <SectionTitle>Reunião</SectionTitle>
              {scheduling ? (
                <MeetingForm
                  leadId={lead.id}
                  users={users ?? []}
                  onDone={async () => {
                    setScheduling(false);
                    await queryClient.invalidateQueries({ queryKey: ['meetings'] });
                    await queryClient.invalidateQueries({ queryKey: ['lead', lead.id] });
                  }}
                  onCancel={() => setScheduling(false)}
                />
              ) : (
                <Button className="w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setScheduling(true)}>
                  <CalendarPlus className="h-4 w-4" /> Agendar reunião
                </Button>
              )}

              {/* Footer */}
              <div className="mt-4 border-t pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-2 text-muted-foreground"
                  onClick={() => { close(); router.push(`/leads/${lead.id}`); }}
                >
                  <ExternalLink className="h-4 w-4" /> Abrir página completa do lead
                  <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({
  lead,
  contact,
  onSaved,
  onCancel,
}: {
  lead: LeadDetail['lead'];
  contact: LeadDetail['contact'] | undefined;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: lead.title,
    estimatedValue: lead.estimatedValue ? String(Math.round(Number(lead.estimatedValue))) : '',
    probability: lead.probability != null ? String(lead.probability) : '',
    expectedCloseDate: lead.expectedCloseDate ?? '',
    phone: contact?.phone ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await apiPatch(`/leads/${lead.id}`, {
        title: form.title.trim() || undefined,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
        probability: form.probability ? Number(form.probability) : undefined,
        expectedCloseDate: form.expectedCloseDate || undefined,
      });
      if (contact?.id && form.phone !== (contact.phone ?? '')) {
        await apiPatch(`/contacts/${contact.id}`, { phone: form.phone || null });
      }
      toast.success('Lead atualizado');
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border bg-muted/30 p-3">
      <p className="text-xs font-semibold text-muted-foreground">Editando dados do negócio</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Título</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Valor (R$)</Label>
          <Input
            type="number"
            min="0"
            value={form.estimatedValue}
            onChange={(e) => setForm((f) => ({ ...f, estimatedValue: e.target.value }))}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Probabilidade (%)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={form.probability}
            onChange={(e) => setForm((f) => ({ ...f, probability: e.target.value }))}
            className="h-8 text-sm"
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Previsão de fechamento</Label>
          <Input
            type="date"
            value={form.expectedCloseDate}
            onChange={(e) => setForm((f) => ({ ...f, expectedCloseDate: e.target.value }))}
            className="h-8 text-sm"
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Telefone</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="(11) 99999-9999"
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-3.5 w-3.5" /> Cancelar
        </Button>
        <Button size="sm" onClick={save} disabled={saving}>
          <Save className="h-3.5 w-3.5" /> {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}

function MeetingForm({
  leadId,
  users,
  onDone,
  onCancel,
}: {
  leadId: string;
  users: AssignableUser[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('Reunião de descoberta');
  const [hostId, setHostId] = useState<string>('');
  const [startsAt, setStartsAt] = useState('');
  const [location, setLocation] = useState('');
  const [withMeet, setWithMeet] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: google } = useQuery({
    queryKey: ['google-status'],
    queryFn: () => apiGet<{ configured: boolean; connected: boolean; email: string | null }>('/integrations/google/status'),
  });
  const googleReady = google?.configured && google?.connected;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!startsAt) { toast.error('Informe a data e hora'); return; }
    setSaving(true);
    try {
      await apiPost('/meetings', {
        leadId, title, hostId: hostId || undefined,
        startsAt: new Date(startsAt).toISOString(),
        location: location || undefined,
        withMeet: withMeet && googleReady,
      });
      toast.success(withMeet && googleReady ? 'Reunião agendada com link do Meet' : 'Reunião agendada');
      onDone();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao agendar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Título</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="h-8 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Data e hora</Label>
          <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Responsável</Label>
          <Select value={hostId} onValueChange={setHostId}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Eu mesmo" /></SelectTrigger>
            <SelectContent>
              {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Local / link</Label>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Escritório, link..." className="h-8 text-sm" />
      </div>
      <label className={cn('flex items-center gap-2 text-xs', !googleReady && 'cursor-not-allowed text-muted-foreground')}>
        <input type="checkbox" disabled={!googleReady} checked={withMeet} onChange={(e) => setWithMeet(e.target.checked)} />
        Gerar link do Google Meet
        {!googleReady && <span className="text-muted-foreground/70">(conecte o Google nas Configurações)</span>}
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={saving}>{saving ? 'Agendando...' : 'Confirmar reunião'}</Button>
      </div>
    </form>
  );
}
