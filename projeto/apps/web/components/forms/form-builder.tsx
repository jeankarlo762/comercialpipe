'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Lock, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { FORM_FIELD_TYPES, type FormFieldType } from '@commercialpipe/shared-types';
import { apiPost, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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

interface FieldRow {
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options: string[];
}

const TYPE_LABEL: Record<FormFieldType, string> = {
  text: 'Texto',
  textarea: 'Texto longo',
  checkbox: 'Checkbox',
  number: 'Número',
  currency: 'Valor (R$)',
};

function slugKey(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

function OptionsInput({ options, onChange }: { options: string[]; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState('');

  function commit(raw: string) {
    const parts = raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const merged = Array.from(new Set([...options, ...parts]));
    onChange(merged);
    setDraft('');
  }

  return (
    <div className="space-y-1.5">
      {options.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {options.map((opt) => (
            <span key={opt} className="flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-xs">
              {opt}
              <button type="button" onClick={() => onChange(options.filter((o) => o !== opt))}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          className="h-9"
          placeholder="Digite uma opção e Enter (ou vírgula)"
          value={draft}
          onChange={(e) => {
            if (e.target.value.includes(',')) commit(e.target.value);
            else setDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit(draft);
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => commit(draft)}>
          Adicionar
        </Button>
      </div>
    </div>
  );
}

function PreviewField({ field }: { field: FieldRow }) {
  const label = field.label || 'Campo';
  if (field.type === 'checkbox' && field.options.length > 0) {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium">{label} {field.required && '*'}</p>
        {field.options.map((o) => (
          <label key={o} className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" disabled /> {o}
          </label>
        ))}
      </div>
    );
  }
  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" disabled /> {label} {field.required && '*'}
      </label>
    );
  }
  if (field.type === 'currency') {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium">{label} {field.required && '*'}</p>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
          <Input disabled placeholder="0,00" className="pl-10" />
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{label} {field.required && '*'}</p>
      {field.type === 'textarea' ? (
        <Textarea disabled placeholder="resposta..." rows={2} />
      ) : (
        <Input disabled type={field.type === 'number' ? 'number' : 'text'} placeholder="resposta..." />
      )}
    </div>
  );
}

export function FormBuilder() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<FieldRow[]>([]);

  function addField() {
    setFields([...fields, { key: '', label: '', type: 'text', required: false, options: [] }]);
  }
  function update(index: number, patch: Partial<FieldRow>) {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  async function save(e: { preventDefault: () => void }) {
    e.preventDefault();
    const prepared = fields
      .filter((f) => f.label.trim())
      .map((f) => ({
        key: f.key || slugKey(f.label),
        label: f.label,
        type: f.type,
        required: f.required,
        ...(f.type === 'checkbox' && f.options.length > 0 ? { options: f.options } : {}),
      }));
    setSaving(true);
    try {
      await apiPost('/forms', { name, description: description || null, fields: prepared, isActive: true });
      toast.success('Formulário criado — link gerado');
      setName('');
      setDescription('');
      setFields([]);
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['forms'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao criar formulário');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Novo formulário
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Construtor de formulário</DialogTitle>
          <DialogDescription>Nome, empresa e telefone são obrigatórios. Adicione campos personalizados.</DialogDescription>
        </DialogHeader>

        <form onSubmit={save} className="grid gap-6 md:grid-cols-2">
          {/* Coluna de edição */}
          <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1 scrollbar-thin">
            <div className="space-y-2">
              <Label>Nome do formulário</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Captação — Landing Page" />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Fale com nosso time" />
            </div>

            <div>
              <Label className="text-xs uppercase text-muted-foreground">Campos fixos</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {['Nome', 'Nome da empresa', 'Telefone'].map((f) => (
                  <Badge key={f} variant="secondary" className="gap-1">
                    <Lock className="h-3 w-3" /> {f}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Campos personalizados</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addField}>
                  <Plus className="h-3.5 w-3.5" /> Campo
                </Button>
              </div>
              {fields.map((field, i) => (
                <div key={i} className="space-y-2 rounded-md border p-2">
                  <div className="flex items-center gap-2">
                    <Input
                      className="h-9 flex-1"
                      placeholder="Rótulo do campo"
                      value={field.label}
                      onChange={(e) => update(i, { label: e.target.value, key: slugKey(e.target.value) })}
                    />
                    <Select value={field.type} onValueChange={(v) => update(i, { type: v as FormFieldType })}>
                      <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FORM_FIELD_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setFields(fields.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <label className="flex items-center gap-1 text-xs text-muted-foreground">
                    <input type="checkbox" checked={field.required} onChange={(e) => update(i, { required: e.target.checked })} />
                    obrigatório
                  </label>
                  {field.type === 'checkbox' && (
                    <OptionsInput options={field.options} onChange={(opts) => update(i, { options: opts })} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Coluna de preview */}
          <div className="space-y-3">
            <Label className="text-xs uppercase text-muted-foreground">Pré-visualização</Label>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto rounded-lg border bg-muted/30 p-4 scrollbar-thin">
              <p className="text-base font-semibold">{name || 'Nome do formulário'}</p>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
              <div className="space-y-1"><p className="text-sm font-medium">Nome *</p><Input disabled placeholder="resposta..." /></div>
              <div className="space-y-1"><p className="text-sm font-medium">Nome da empresa *</p><Input disabled placeholder="resposta..." /></div>
              <div className="space-y-1"><p className="text-sm font-medium">Telefone *</p><Input disabled placeholder="+55 (11) 99999-9999" /></div>
              {fields.filter((f) => f.label.trim()).map((f, i) => <PreviewField key={i} field={f} />)}
              <Button type="button" disabled className="w-full">Enviar</Button>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button onClick={save} disabled={saving || !name.trim()}>{saving ? 'Gerando...' : 'Criar e gerar link'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
