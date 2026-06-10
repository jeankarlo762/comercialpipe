'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, ExternalLink, FileText, Power, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiDelete, apiGetPaginated, apiPatch, ApiError } from '@/lib/api';
import type { FormItem } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { FormBuilder } from '@/components/forms/form-builder';

function FormCard({ form, onChange }: { form: FormItem; onChange: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== 'undefined' ? `${window.location.origin}/f/${form.publicId}` : `/f/${form.publicId}`;

  async function toggle() {
    try {
      await apiPatch(`/forms/${form.id}`, { isActive: !form.isActive });
      onChange();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao atualizar');
    }
  }

  async function remove() {
    if (!confirm(`Excluir o formulário "${form.name}"?`)) return;
    try {
      await apiDelete(`/forms/${form.id}`);
      toast.success('Formulário excluído');
      onChange();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao excluir');
    }
  }

  function copy() {
    void navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{form.name}</span>
              <Badge variant={form.isActive ? 'success' : 'secondary'}>{form.isActive ? 'ativo' : 'inativo'}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {form.fields.length} campos personalizados · {form.submissionsCount} envios · criado {formatDateTime(form.createdAt)}
            </p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={toggle} title={form.isActive ? 'Desativar' : 'Ativar'}>
              <Power className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={remove} title="Excluir">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input readOnly value={link} className="h-9 font-mono text-xs" />
          <Button variant="outline" size="icon" onClick={copy} title="Copiar link">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" asChild title="Abrir formulário">
            <a href={link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FormsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['forms'],
    queryFn: () => apiGetPaginated<FormItem[]>('/forms', { limit: 50 }),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['forms'] });
  const forms = data?.data ?? [];

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <FileText className="h-6 w-6 text-brand" /> Formulários
          </h1>
          <p className="text-sm text-muted-foreground">Capte leads com formulários públicos</p>
        </div>
        <FormBuilder />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : forms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <FileText className="h-10 w-10 opacity-40" />
            <p>Nenhum formulário ainda. Crie o primeiro e compartilhe o link.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {forms.map((form) => (
            <FormCard key={form.id} form={form} onChange={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}
