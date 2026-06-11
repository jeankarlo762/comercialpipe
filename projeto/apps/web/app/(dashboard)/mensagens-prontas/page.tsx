'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, MessageSquare, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { roleHasPermission } from '@commercialpipe/shared-types';
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface Template {
  id: string;
  name: string;
  category: string;
  body: string;
  isActive: boolean;
  createdAt: string;
}

const VARIABLES_HINT = '{{nome}}, {{empresa}}, {{telefone}}';
const CATEGORIES = ['geral', 'abordagem inicial', 'follow-up', 'proposta', 'reativação'];

function TemplateForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Template;
  onSave: (data: { name: string; category: string; body: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    category: initial?.category ?? 'geral',
    body: initial?.body ?? '',
  });
  const [saving, setSaving] = useState(false);

  function insertVar(v: string) {
    setForm((f) => ({ ...f, body: f.body + v }));
  }

  async function handleSave() {
    if (!form.name.trim() || !form.body.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Nome do template</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ex: Abordagem inicial SDR"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm((f) => ({ ...f, category: c }))}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  form.category === c ? 'border-brand bg-brand/15 font-medium text-brand' : 'hover:bg-accent'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Mensagem</Label>
          <p className="text-[11px] text-muted-foreground">
            Use variáveis automáticas: insira com os botões abaixo ou digite diretamente.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {['{{nome}}', '{{empresa}}', '{{telefone}}'].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => insertVar(v)}
                className="rounded border bg-muted px-2 py-0.5 font-mono text-[10px] hover:bg-accent"
              >
                {v}
              </button>
            ))}
          </div>
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            rows={6}
            placeholder={`Olá {{nome}}, vi que você é da {{empresa}}...`}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <p className="text-[11px] text-muted-foreground">{form.body.length}/5000 caracteres</p>
        </div>
        {form.body && (
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">Pré-visualização</p>
            <div className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm">
              {form.body.replace(/\{\{nome\}\}/g, 'João Silva').replace(/\{\{empresa\}\}/g, 'Acme Ltda').replace(/\{\{telefone\}\}/g, '(11) 99999-9999')}
            </div>
          </div>
        )}
      </div>
      <DialogFooter className="mt-4">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving || !form.name.trim() || !form.body.trim()}>
          {saving ? 'Salvando...' : 'Salvar template'}
        </Button>
      </DialogFooter>
    </>
  );
}

export default function MensagensProntasPage() {
  const { user } = useAuth();
  const isAdmin = user != null && roleHasPermission(user.role, 'users:manage');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['message-templates', search],
    queryFn: () =>
      apiGet<{ data: Template[] }>('/message-templates', {
        limit: 100,
        search: search || undefined,
      }).then((r) => r),
  });

  async function handleCreate(form: { name: string; category: string; body: string }) {
    try {
      await apiPost('/message-templates', form);
      toast.success('Template criado');
      await queryClient.invalidateQueries({ queryKey: ['message-templates'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao criar');
      throw err;
    }
  }

  async function handleUpdate(id: string, form: { name: string; category: string; body: string }) {
    try {
      await apiPatch(`/message-templates/${id}`, form);
      toast.success('Template atualizado');
      await queryClient.invalidateQueries({ queryKey: ['message-templates'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao atualizar');
      throw err;
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este template?')) return;
    try {
      await apiDelete(`/message-templates/${id}`);
      toast.success('Template excluído');
      await queryClient.invalidateQueries({ queryKey: ['message-templates'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao excluir');
    }
  }

  const templates: Template[] = (data as { data?: Template[] })?.data ?? [];

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mensagens Prontas</h1>
          <p className="text-sm text-muted-foreground">
            Templates de WhatsApp com variáveis automáticas. Envie com 1 clique direto do lead.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Novo template
          </Button>
        )}
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 opacity-30" />
            <p className="font-medium">Nenhum template encontrado</p>
            <p className="text-sm">{isAdmin ? 'Crie templates de mensagem para usar no WhatsApp com seus leads.' : 'Nenhum template disponível ainda.'}</p>
            {isAdmin && (
              <Button variant="outline" onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" /> Criar primeiro template
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="group relative">
              <CardContent className="p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold leading-tight">{t.name}</p>
                    <Badge variant="secondary" className="mt-1 text-[10px]">{t.category}</Badge>
                  </div>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      title="Copiar mensagem"
                      onClick={() => {
                        navigator.clipboard.writeText(t.body);
                        toast.success('Mensagem copiada!');
                      }}
                      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          title="Editar"
                          onClick={() => setEditingTemplate(t)}
                          className="rounded p-1 hover:bg-accent"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Excluir"
                          onClick={() => handleDelete(t.id)}
                          className="rounded p-1 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <p className="line-clamp-4 text-xs text-muted-foreground">{t.body}</p>
                {['{{nome}}', '{{empresa}}', '{{telefone}}'].some((v) => t.body.includes(v)) && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {['{{nome}}', '{{empresa}}', '{{telefone}}'].filter((v) => t.body.includes(v)).map((v) => (
                      <span key={v} className="rounded bg-brand/10 px-1.5 py-0.5 font-mono text-[10px] text-brand">{v}</span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isAdmin && creating && (
        <Dialog open onOpenChange={(o) => !o && setCreating(false)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo template de mensagem</DialogTitle>
            </DialogHeader>
            <TemplateForm onSave={handleCreate} onClose={() => setCreating(false)} />
          </DialogContent>
        </Dialog>
      )}

      {isAdmin && editingTemplate && (
        <Dialog open onOpenChange={(o) => !o && setEditingTemplate(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar template</DialogTitle>
            </DialogHeader>
            <TemplateForm
              initial={editingTemplate}
              onSave={(form) => handleUpdate(editingTemplate.id, form)}
              onClose={() => setEditingTemplate(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
