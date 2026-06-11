'use client';

import { useState } from 'react';
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, GitBranch, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Pipeline {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  orderIndex: number;
}

interface Stage {
  id: string;
  name: string;
  color: string;
  orderIndex: number;
  isClosedWon: boolean;
  isClosedLost: boolean;
  pipelineId: string | null;
}

const COLORS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#8b5cf6', '#64748b', '#f97316',
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
          style={{
            backgroundColor: c,
            borderColor: value === c ? '#000' : 'transparent',
            outline: value === c ? '2px solid white' : 'none',
            outlineOffset: '-3px',
          }}
        />
      ))}
    </div>
  );
}

function PipelineFormDialog({
  initial,
  onClose,
}: {
  initial?: Pipeline;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? '#6366f1');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (initial) {
        await apiPatch(`/pipelines/${initial.id}`, { name: name.trim(), color });
        toast.success('Pipeline atualizado');
      } else {
        await apiPost('/pipelines', { name: name.trim(), color });
        toast.success('Pipeline criado');
      }
      await queryClient.invalidateQueries({ queryKey: ['pipelines'] });
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
          <DialogTitle>{initial ? 'Editar pipeline' : 'Novo pipeline'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Pipeline SDR"
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cor</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !name.trim()}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StageFormDialog({
  pipeline,
  initial,
  stages,
  onClose,
}: {
  pipeline: Pipeline;
  initial?: Stage;
  stages: Stage[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? '#6366f1');
  const [isClosedWon, setIsClosedWon] = useState(initial?.isClosedWon ?? false);
  const [isClosedLost, setIsClosedLost] = useState(initial?.isClosedLost ?? false);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (initial) {
        await apiPatch(`/pipeline/stages/${initial.id}`, { name: name.trim(), color, isClosedWon, isClosedLost });
        toast.success('Estágio atualizado');
      } else {
        await apiPost('/pipeline/stages', { name: name.trim(), color, isClosedWon, isClosedLost, pipelineId: pipeline.id });
        toast.success('Estágio criado');
      }
      await queryClient.invalidateQueries({ queryKey: ['pipeline-stages', pipeline.id] });
      await queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      await queryClient.invalidateQueries({ queryKey: ['stages'] });
      await queryClient.invalidateQueries({ queryKey: ['board'] });
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
          <DialogTitle>{initial ? 'Editar estágio' : `Novo estágio — ${pipeline.name}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome do estágio</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Qualificação"
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cor</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isClosedWon}
                onChange={(e) => { setIsClosedWon(e.target.checked); if (e.target.checked) setIsClosedLost(false); }}
              />
              Ganho (fechado)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isClosedLost}
                onChange={(e) => { setIsClosedLost(e.target.checked); if (e.target.checked) setIsClosedWon(false); }}
              />
              Perdido (fechado)
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !name.trim()}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteStageDialog({
  stage,
  pipeline,
  allStages,
  onClose,
}: {
  stage: Stage;
  pipeline: Pipeline;
  allStages: Stage[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const others = allStages.filter((s) => s.id !== stage.id);
  const [moveToId, setMoveToId] = useState(others[0]?.id ?? '');
  const [deleting, setDeleting] = useState(false);

  async function confirm() {
    if (!moveToId) return;
    setDeleting(true);
    try {
      await apiDelete(`/pipeline/stages/${stage.id}`, { moveToStageId: moveToId });
      toast.success('Estágio excluído');
      await queryClient.invalidateQueries({ queryKey: ['pipeline-stages', pipeline.id] });
      await queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      await queryClient.invalidateQueries({ queryKey: ['stages'] });
      await queryClient.invalidateQueries({ queryKey: ['board'] });
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao excluir');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir estágio "{stage.name}"</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Os leads neste estágio serão movidos para outro estágio antes da exclusão.</p>
          {others.length === 0 ? (
            <p className="text-destructive">Não é possível excluir o único estágio do pipeline.</p>
          ) : (
            <div className="space-y-1.5">
              <Label>Mover leads para</Label>
              <Select value={moveToId} onValueChange={setMoveToId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {others.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            variant="destructive"
            onClick={confirm}
            disabled={deleting || others.length === 0}
          >
            {deleting ? 'Excluindo...' : 'Excluir estágio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PipelineCard({ pipeline, onEdit }: { pipeline: Pipeline; onEdit: () => void }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [addingStage, setAddingStage] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [deletingStage, setDeletingStage] = useState<Stage | null>(null);
  const [deletingPipeline, setDeletingPipeline] = useState(false);

  const { data: stagesData } = useQuery({
    queryKey: ['pipeline-stages', pipeline.id],
    queryFn: () =>
      apiGet<{ stages: Stage[] }>('/pipeline/stages', { pipelineId: pipeline.id }).then((r) => r.stages),
    enabled: expanded,
    staleTime: 30_000,
  });

  const stages = stagesData ?? [];

  async function onDragStageEnd(result: DropResult) {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;
    const newStages = Array.from(stages);
    const [moved] = newStages.splice(result.source.index, 1);
    newStages.splice(result.destination.index, 0, moved);
    queryClient.setQueryData(['pipeline-stages', pipeline.id], { stages: newStages });
    try {
      await apiPatch('/pipeline/stages/reorder', {
        order: newStages.map((s, i) => ({ id: s.id, orderIndex: i })),
      });
      await queryClient.invalidateQueries({ queryKey: ['stages'] });
      await queryClient.invalidateQueries({ queryKey: ['board'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao reordenar');
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages', pipeline.id] });
    }
  }

  async function deletePipeline() {
    if (!confirm(`Excluir pipeline "${pipeline.name}"? Os leads serão movidos para o pipeline padrão.`)) return;
    setDeletingPipeline(true);
    try {
      await apiDelete(`/pipelines/${pipeline.id}`);
      toast.success('Pipeline excluído');
      await queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao excluir');
      setDeletingPipeline(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-muted/40"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: pipeline.color }} />
        <span className="flex-1 font-medium">{pipeline.name}</span>
        {pipeline.isDefault && (
          <Badge variant="secondary" className="text-[10px]">Padrão</Badge>
        )}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="Editar pipeline"
            onClick={onEdit}
            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {!pipeline.isDefault && (
            <button
              type="button"
              title="Excluir pipeline"
              onClick={deletePipeline}
              disabled={deletingPipeline}
              className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {expanded && (
        <div className="border-t bg-muted/20 px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Estágios
          </p>
          {stages.length === 0 ? (
            <p className="mb-2 text-sm text-muted-foreground">Nenhum estágio ainda.</p>
          ) : (
            <DragDropContext onDragEnd={onDragStageEnd}>
              <Droppable droppableId={`stages-${pipeline.id}`}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="mb-3 space-y-1.5"
                  >
                    {stages.map((stage, index) => (
                      <Draggable key={stage.id} draggableId={stage.id} index={index}>
                        {(drag, dragSnapshot) => (
                          <div
                            ref={drag.innerRef}
                            {...drag.draggableProps}
                            className={`flex items-center gap-2 rounded-md border bg-background px-3 py-2 transition-shadow ${dragSnapshot.isDragging ? 'shadow-md ring-1 ring-primary/20' : ''}`}
                          >
                            <span
                              {...drag.dragHandleProps}
                              title="Arrastar estágio"
                              className="cursor-grab text-muted-foreground/30 hover:text-muted-foreground active:cursor-grabbing"
                            >
                              <GripVertical className="h-3.5 w-3.5" />
                            </span>
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                            <span className="flex-1 text-sm">{stage.name}</span>
                            {stage.isClosedWon && <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">Ganho</Badge>}
                            {stage.isClosedLost && <Badge variant="destructive" className="text-[10px]">Perdido</Badge>}
                            <button
                              type="button"
                              onClick={() => setEditingStage(stage)}
                              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingStage(stage)}
                              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setAddingStage(true)}>
            <Plus className="h-3.5 w-3.5" /> Adicionar estágio
          </Button>
        </div>
      )}

      {addingStage && (
        <StageFormDialog
          pipeline={pipeline}
          stages={stages}
          onClose={() => setAddingStage(false)}
        />
      )}
      {editingStage && (
        <StageFormDialog
          pipeline={pipeline}
          initial={editingStage}
          stages={stages}
          onClose={() => setEditingStage(null)}
        />
      )}
      {deletingStage && (
        <DeleteStageDialog
          stage={deletingStage}
          pipeline={pipeline}
          allStages={stages}
          onClose={() => setDeletingStage(null)}
        />
      )}
    </Card>
  );
}

export default function GestaoPipePage() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => apiGet<{ pipelines: Pipeline[] }>('/pipelines').then((r) => r.pipelines),
    staleTime: 30_000,
  });

  const pipelines = data ?? [];

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Pipes</h1>
          <p className="text-sm text-muted-foreground">
            Crie e gerencie múltiplos pipelines com estágios personalizados
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Novo pipeline
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : pipelines.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <GitBranch className="h-12 w-12 opacity-30" />
            <p className="font-medium">Nenhum pipeline criado</p>
            <Button variant="outline" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Criar primeiro pipeline
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pipelines.map((p) => (
            <PipelineCard key={p.id} pipeline={p} onEdit={() => setEditingPipeline(p)} />
          ))}
        </div>
      )}

      {creating && <PipelineFormDialog onClose={() => setCreating(false)} />}
      {editingPipeline && (
        <PipelineFormDialog initial={editingPipeline} onClose={() => setEditingPipeline(null)} />
      )}
    </div>
  );
}
