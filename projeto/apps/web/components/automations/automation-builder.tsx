'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  ACTION_TYPES,
  CONDITION_OPERATORS,
  TRIGGER_TYPES,
  type ActionType,
  type ConditionOperator,
  type TriggerType,
} from '@commercialpipe/shared-types';
import { apiPost, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ConditionRow {
  field: string;
  op: ConditionOperator;
  value: string;
}
interface ActionRow {
  type: ActionType;
  config: Record<string, string>;
}

const TRIGGER_LABEL: Record<TriggerType, string> = {
  stage_change: 'Mudança de estágio',
  new_lead: 'Novo lead',
  inactivity: 'Inatividade',
  deal_won: 'Negócio ganho',
  deal_lost: 'Negócio perdido',
  webhook: 'Webhook recebido',
  manual: 'Manual',
};

const ACTION_LABEL: Record<ActionType, string> = {
  n8n_workflow: 'Executar workflow n8n',
  send_email: 'Enviar e-mail',
  create_task: 'Criar tarefa',
  assign_lead: 'Atribuir lead',
  change_stage: 'Mudar estágio',
  ai_score: 'Pontuação por IA',
  add_timeline_note: 'Adicionar nota na timeline',
  webhook_outbound: 'Enviar webhook',
};

const OPERATOR_LABEL: Record<ConditionOperator, string> = {
  eq: 'igual a',
  neq: 'diferente de',
  gt: 'maior que',
  gte: 'maior ou igual',
  lt: 'menor que',
  lte: 'menor ou igual',
  in: 'está em',
  contains: 'contém',
};

const ACTION_FIELDS: Partial<Record<ActionType, { key: string; label: string }[]>> = {
  add_timeline_note: [{ key: 'content', label: 'Conteúdo da nota' }],
  create_task: [
    { key: 'title', label: 'Título da tarefa' },
    { key: 'description', label: 'Descrição' },
  ],
  assign_lead: [{ key: 'ownerId', label: 'ID do novo responsável' }],
  change_stage: [{ key: 'stageId', label: 'ID do estágio destino' }],
  n8n_workflow: [{ key: 'workflowId', label: 'ID do workflow (n8n)' }],
  send_email: [{ key: 'workflowId', label: 'Workflow de e-mail (n8n)' }],
  webhook_outbound: [{ key: 'url', label: 'URL do webhook' }],
};

export function AutomationBuilder() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<TriggerType>('new_lead');
  const [conditions, setConditions] = useState<ConditionRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([{ type: 'add_timeline_note', config: {} }]);

  function reset() {
    setName('');
    setTriggerType('new_lead');
    setConditions([]);
    setActions([{ type: 'add_timeline_note', config: {} }]);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (actions.length === 0) {
      toast.error('Adicione ao menos uma ação');
      return;
    }
    setSaving(true);
    try {
      await apiPost('/automations', {
        name,
        triggerType,
        triggerConfig: {},
        conditions: conditions.map((c) => ({
          field: c.field,
          op: c.op,
          value: /^-?\d+(\.\d+)?$/.test(c.value) ? Number(c.value) : c.value,
        })),
        actions: actions.map((a) => ({ type: a.type, config: a.config })),
        isActive: true,
      });
      toast.success('Automação criada');
      reset();
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['automations'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao criar automação');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Nova automação
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Construtor de automação</DialogTitle>
          <DialogDescription>Gatilho → condições → ações</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="max-h-[70vh] space-y-5 overflow-y-auto pr-1 scrollbar-thin">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Notificar leads quentes" />
            </div>
            <div className="space-y-2">
              <Label>Gatilho</Label>
              <Select value={triggerType} onValueChange={(v) => setTriggerType(v as TriggerType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{TRIGGER_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Condições <span className="text-xs font-normal text-muted-foreground">(todas precisam ser verdadeiras)</span></Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConditions([...conditions, { field: 'ai_score', op: 'eq', value: 'A' }])}
              >
                <Plus className="h-3.5 w-3.5" /> Condição
              </Button>
            </div>
            {conditions.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhuma condição — a automação disparará para todos os gatilhos.</p>
            )}
            {conditions.map((cond, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  className="h-9"
                  placeholder="Campo (ex: ai_score)"
                  value={cond.field}
                  onChange={(e) => updateCondition(setConditions, conditions, i, { field: e.target.value })}
                />
                <Select value={cond.op} onValueChange={(v) => updateCondition(setConditions, conditions, i, { op: v as ConditionOperator })}>
                  <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITION_OPERATORS.map((op) => (
                      <SelectItem key={op} value={op}>{OPERATOR_LABEL[op]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="h-9"
                  placeholder="Valor"
                  value={cond.value}
                  onChange={(e) => updateCondition(setConditions, conditions, i, { value: e.target.value })}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => setConditions(conditions.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Ações</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setActions([...actions, { type: 'add_timeline_note', config: {} }])}>
                <Plus className="h-3.5 w-3.5" /> Ação
              </Button>
            </div>
            {actions.map((action, i) => (
              <div key={i} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Select
                    value={action.type}
                    onValueChange={(v) => updateAction(setActions, actions, i, { type: v as ActionType, config: {} })}
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{ACTION_LABEL[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setActions(actions.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                {(ACTION_FIELDS[action.type] ?? []).map((field) => (
                  <Input
                    key={field.key}
                    className="h-9"
                    placeholder={field.label}
                    value={action.config[field.key] ?? ''}
                    onChange={(e) =>
                      updateAction(setActions, actions, i, {
                        config: { ...action.config, [field.key]: e.target.value },
                      })
                    }
                  />
                ))}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Criar automação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function updateCondition(
  set: (rows: ConditionRow[]) => void,
  rows: ConditionRow[],
  index: number,
  patch: Partial<ConditionRow>,
) {
  set(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
}

function updateAction(
  set: (rows: ActionRow[]) => void,
  rows: ActionRow[],
  index: number,
  patch: Partial<ActionRow>,
) {
  set(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
}
