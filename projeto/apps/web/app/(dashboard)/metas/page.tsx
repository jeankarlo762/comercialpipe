'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Target, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { roleHasPermission } from '@commercialpipe/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface GoalEntry {
  user: { id: string; name: string; role: string };
  goal: {
    targetRevenue: string | null;
    targetLeads: number | null;
    targetMeetings: number | null;
  } | null;
  progress: { wonLeads: number; wonRevenue: string; doneMeetings: number };
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const ROLE_LABEL: Record<string, string> = { admin: 'Admin', manager: 'Gerente', closer: 'Closer', sdr: 'SDR' };

function Progress({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const color = pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-brand' : 'bg-amber-400';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={pct >= 100 ? 'font-semibold text-emerald-600' : ''}>{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SetGoalDialog({
  entry,
  month,
  year,
  onClose,
}: {
  entry: GoalEntry;
  month: number;
  year: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    targetRevenue: entry.goal?.targetRevenue ? String(Math.round(Number(entry.goal.targetRevenue))) : '',
    targetLeads: String(entry.goal?.targetLeads ?? ''),
    targetMeetings: String(entry.goal?.targetMeetings ?? ''),
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await apiPost('/goals', {
        userId: entry.user.id,
        month,
        year,
        targetRevenue: form.targetRevenue ? Number(form.targetRevenue) : null,
        targetLeads: form.targetLeads ? Number(form.targetLeads) : null,
        targetMeetings: form.targetMeetings ? Number(form.targetMeetings) : null,
      });
      toast.success('Meta salva');
      await queryClient.invalidateQueries({ queryKey: ['goals'] });
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
          <DialogTitle>Meta de {MONTHS[month - 1]}/{year} — {entry.user.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Meta de receita (R$)</Label>
            <Input
              type="number"
              min="0"
              placeholder="Ex: 50000"
              value={form.targetRevenue}
              onChange={(e) => setForm((f) => ({ ...f, targetRevenue: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Meta de negócios fechados</Label>
            <Input
              type="number"
              min="0"
              placeholder="Ex: 10"
              value={form.targetLeads}
              onChange={(e) => setForm((f) => ({ ...f, targetLeads: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Meta de reuniões realizadas</Label>
            <Input
              type="number"
              min="0"
              placeholder="Ex: 20"
              value={form.targetMeetings}
              onChange={(e) => setForm((f) => ({ ...f, targetMeetings: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar meta'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MetasPage() {
  const { user } = useAuth();
  const isAdmin = user != null && roleHasPermission(user.role, 'users:manage');
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [editingEntry, setEditingEntry] = useState<GoalEntry | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['goals', month, year],
    queryFn: () => apiGet<{ goals: GoalEntry[] }>('/goals', { month, year }).then((r) => r.goals),
  });

  const goals = data ?? [];

  const midMonth = now.getMonth() + 1 === month && now.getFullYear() === year && now.getDate() > 14;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Metas e Cotas</h1>
          <p className="text-sm text-muted-foreground">Acompanhe o progresso mensal de cada vendedor</p>
        </div>
        {/* Month picker */}
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-9 w-20 text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
            <Target className="h-12 w-12 opacity-30" />
            <p className="font-medium">Nenhum usuário encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((entry) => {
            const hasGoal = entry.goal != null;
            const revGoal = Number(entry.goal?.targetRevenue ?? 0);
            const leadsGoal = entry.goal?.targetLeads ?? 0;
            const meetGoal = entry.goal?.targetMeetings ?? 0;
            const revPct = revGoal > 0 ? (Number(entry.progress.wonRevenue) / revGoal) * 100 : null;
            const belowHalf = midMonth && revPct !== null && revPct < 50;

            return (
              <Card key={entry.user.id} className={belowHalf ? 'border-amber-400/50' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">{entry.user.name}</CardTitle>
                      <Badge variant="secondary" className="mt-0.5 text-[10px]">{ROLE_LABEL[entry.user.role] ?? entry.user.role}</Badge>
                    </div>
                    {belowHalf && (
                      <span title="Abaixo de 50% da meta no meio do mês" className="text-sm">⚠️</span>
                    )}
                    {!hasGoal && isAdmin && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">Sem meta</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {hasGoal ? (
                    <>
                      {revGoal > 0 && (
                        <Progress
                          label={`Receita: ${formatCurrency(entry.progress.wonRevenue)} / ${formatCurrency(revGoal)}`}
                          value={Number(entry.progress.wonRevenue)}
                          max={revGoal}
                        />
                      )}
                      {leadsGoal > 0 && (
                        <Progress
                          label={`Negócios: ${entry.progress.wonLeads} / ${leadsGoal}`}
                          value={entry.progress.wonLeads}
                          max={leadsGoal}
                        />
                      )}
                      {meetGoal > 0 && (
                        <Progress
                          label={`Reuniões: ${entry.progress.doneMeetings} / ${meetGoal}`}
                          value={entry.progress.doneMeetings}
                          max={meetGoal}
                        />
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <TrendingUp className="h-4 w-4" />
                      <span>{entry.progress.wonLeads} ganhos · {formatCurrency(entry.progress.wonRevenue)}</span>
                    </div>
                  )}
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-1 h-7 w-full gap-1 text-xs"
                      onClick={() => setEditingEntry(entry)}
                    >
                      <Target className="h-3.5 w-3.5" />
                      {hasGoal ? 'Editar meta' : 'Definir meta'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {editingEntry && (
        <SetGoalDialog
          entry={editingEntry}
          month={month}
          year={year}
          onClose={() => setEditingEntry(null)}
        />
      )}
    </div>
  );
}
