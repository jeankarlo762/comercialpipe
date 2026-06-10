'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Power, RotateCcw, Settings2, Shuffle, UserCheck, Users, Workflow, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiGetPaginated, apiPatch, apiPost, ApiError } from '@/lib/api';
import type { Automation } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AutomationBuilder } from '@/components/automations/automation-builder';

interface AssignableUser { id: string; name: string; role: string; }

const ROUND_ROBIN_NAME = 'Distribuição Inteligente';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin', manager: 'Gerente', closer: 'Closer', sdr: 'SDR',
};

function RoundRobinConfigDialog({
  automation,
  onClose,
}: {
  automation: Automation | undefined;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () => apiGet<{ users: AssignableUser[] }>('/users/assignable').then((r) => r.users),
  });

  const currentUserIds = (() => {
    if (!automation) return [] as string[];
    const action = (automation.actions as Array<{ type: string; config: Record<string, unknown> }>)
      .find((a) => a.type === 'assign_lead');
    const ids = action?.config?.userIds;
    return Array.isArray(ids) ? (ids as string[]) : [];
  })();

  const [selected, setSelected] = useState<string[]>(currentUserIds);
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function save() {
    setSaving(true);
    try {
      const userIds = selected.length > 0 ? selected : null;
      if (!automation) {
        await apiPost('/automations', {
          name: ROUND_ROBIN_NAME,
          description: 'Distribui automaticamente novos leads entre os usuários selecionados em sequência circular.',
          triggerType: 'new_lead',
          triggerConfig: {},
          conditions: [],
          actions: [{ type: 'assign_lead', config: { mode: 'round_robin', ...(userIds ? { userIds } : {}) } }],
          isActive: true,
        });
      } else {
        await apiPatch(`/automations/${automation.id}`, {
          actions: [{ type: 'assign_lead', config: { mode: 'round_robin', ...(userIds ? { userIds } : {}) } }],
        });
      }
      toast.success('Configuração salva');
      await queryClient.invalidateQueries({ queryKey: ['automations'] });
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shuffle className="h-4 w-4 text-brand" /> Distribuição Inteligente
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Selecione os usuários que farão parte da rotação. Deixe todos desmarcados para incluir todos os usuários ativos automaticamente.
        </p>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : (
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
            {(users ?? []).map((u) => {
              const checked = selected.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggle(u.id)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    checked ? 'bg-brand/10 text-foreground' : 'hover:bg-accent'
                  }`}
                >
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                    checked ? 'border-brand bg-brand' : 'border-muted-foreground/40'
                  }`}>
                    {checked && <UserCheck className="h-3 w-3 text-white" />}
                  </div>
                  <span className="flex-1 font-medium">{u.name}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {ROLE_LABEL[u.role] ?? u.role}
                  </Badge>
                </button>
              );
            })}
          </div>
        )}

        {selected.length > 0 && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{selected.length}</span> usuário(s) selecionado(s) na rotação.
          </p>
        )}
        {selected.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Todos os usuários ativos serão incluídos na rotação.
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StrategiesSection({ automations }: { automations: Automation[] }) {
  const queryClient = useQueryClient();
  const [configOpen, setConfigOpen] = useState(false);

  const { data: allUsers } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () => apiGet<{ users: AssignableUser[] }>('/users/assignable').then((r) => r.users),
    staleTime: 5 * 60_000,
  });

  const rrAutomation = automations.find(
    (a) =>
      a.name === ROUND_ROBIN_NAME &&
      (a.actions as Array<{ type: string; config: Record<string, unknown> }>).some(
        (ac) => ac.type === 'assign_lead' && ac.config?.mode === 'round_robin',
      ),
  );

  const rrUserIds = (() => {
    if (!rrAutomation) return [] as string[];
    const action = (rrAutomation.actions as Array<{ type: string; config: Record<string, unknown> }>)
      .find((a) => a.type === 'assign_lead');
    const ids = action?.config?.userIds;
    return Array.isArray(ids) ? (ids as string[]) : [];
  })();

  const displayUsers = rrUserIds.length > 0
    ? (allUsers ?? []).filter((u) => rrUserIds.includes(u.id))
    : (allUsers ?? []);

  async function toggleRoundRobin(enabled: boolean) {
    try {
      if (!rrAutomation) {
        setConfigOpen(true);
        return;
      }
      await apiPost(`/automations/${rrAutomation.id}/toggle`);
      toast.success(enabled ? 'Distribuição Inteligente ativada' : 'Distribuição Inteligente desativada');
      await queryClient.invalidateQueries({ queryKey: ['automations'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao alterar estratégia');
    }
  }

  const isActive = rrAutomation?.isActive ?? false;

  return (
    <div className="mb-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Estratégias pré-configuradas
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className={isActive ? 'border-brand/40 bg-brand/5' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/15">
                  <Shuffle className="h-4 w-4 text-brand" />
                </div>
                <div>
                  <CardTitle className="text-sm">Distribuição Inteligente</CardTitle>
                  <Badge variant={isActive ? 'success' : 'secondary'} className="mt-0.5 text-[10px]">
                    {isActive ? 'ativa' : 'inativa'}
                  </Badge>
                </div>
              </div>
              <Switch checked={isActive} onCheckedChange={toggleRoundRobin} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <CardDescription className="text-xs leading-relaxed">
              Distribui novos leads automaticamente em sequência circular (round-robin),
              garantindo uma divisão equilibrada da carteira.
            </CardDescription>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1 rounded-full border px-2 py-0.5">
                <Zap className="h-3 w-3" /> Novo lead
              </span>
              <span className="flex items-center gap-1 rounded-full border px-2 py-0.5">
                <RotateCcw className="h-3 w-3" /> Round-robin
              </span>
            </div>

            {/* User avatars */}
            <div className="mt-3">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Na rotação ({displayUsers.length})
              </p>
              {displayUsers.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">Carregando...</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {displayUsers.map((u) => (
                    <div key={u.id} className="flex items-center gap-1.5 rounded-full border bg-background px-2 py-0.5">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand/20 text-[9px] font-bold text-brand">
                        {u.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
                      </span>
                      <span className="text-[11px] font-medium">{u.name.split(' ')[0]}</span>
                      <Badge variant="secondary" className="h-3.5 px-1 text-[9px]">
                        {ROLE_LABEL[u.role] ?? u.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {rrAutomation && (
              <p className="mt-2 text-[10px] text-muted-foreground">
                {rrAutomation.executionCount} execuções ·{' '}
                {rrAutomation.lastExecutedAt ? `último: ${formatDateTime(rrAutomation.lastExecutedAt)}` : 'nunca executada'}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-3 h-7 gap-1.5 text-xs"
              onClick={() => setConfigOpen(true)}
            >
              <Settings2 className="h-3.5 w-3.5" /> Configurar usuários
            </Button>
          </CardContent>
        </Card>
      </div>

      {configOpen && (
        <RoundRobinConfigDialog
          automation={rrAutomation}
          onClose={() => setConfigOpen(false)}
        />
      )}
    </div>
  );
}

export default function AutomationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['automations'],
    queryFn: () => apiGetPaginated<Automation[]>('/automations', { limit: 50 }),
  });

  async function toggle(id: string) {
    try {
      await apiPost(`/automations/${id}/toggle`);
      await queryClient.invalidateQueries({ queryKey: ['automations'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao alternar');
    }
  }

  async function test(id: string) {
    try {
      const result = await apiPost<{ wouldRun: boolean; conditionsEvaluated: number }>(`/automations/${id}/test`, {});
      toast[result.wouldRun ? 'success' : 'info'](
        result.wouldRun
          ? 'Condições satisfeitas — a automação rodaria.'
          : 'Condições não satisfeitas com o lead de teste.',
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha no teste');
    }
  }

  const automations = data?.data ?? [];

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Automações</h1>
          <p className="text-sm text-muted-foreground">Gatilhos, condições e ações (incl. n8n)</p>
        </div>
        <AutomationBuilder />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <>
          <StrategiesSection automations={automations} />

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Minhas automações
            </h2>
            {automations.filter((a) => a.name !== ROUND_ROBIN_NAME).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                  <Workflow className="h-10 w-10 opacity-40" />
                  <p>Nenhuma automação personalizada ainda. Crie a primeira.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {automations.filter((a) => a.name !== ROUND_ROBIN_NAME).map((a) => (
                  <Card key={a.id}>
                    <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{a.name}</span>
                          <Badge variant={a.isActive ? 'success' : 'secondary'}>
                            {a.isActive ? 'ativa' : 'inativa'}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Gatilho: <span className="font-medium">{a.triggerType}</span> ·{' '}
                          {a.executionCount} execuções ·{' '}
                          {a.lastExecutedAt ? `último: ${formatDateTime(a.lastExecutedAt)}` : 'nunca executada'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => test(a.id)}>
                          <Zap className="h-4 w-4" /> Testar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => toggle(a.id)}>
                          <Power className="h-4 w-4" /> {a.isActive ? 'Desativar' : 'Ativar'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
