'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import type { Lead } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function NewLeadDialog({ pipelineId }: { pipelineId?: string } = {}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', company: '', phone: '', revenue: '', description: '', ownerId: '' });

  const { data: users } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () => apiGet<{ users: { id: string; name: string }[] }>('/users/assignable').then((r) => r.users),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  function update(patch: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.company.trim() || !form.phone.trim()) return;
    setLoading(true);
    try {
      await apiPost<{ lead: Lead }>('/leads/quick', {
        name: form.name.trim(),
        company: form.company.trim(),
        phone: form.phone.trim(),
        revenue: form.revenue ? Number(form.revenue) : undefined,
        description: form.description.trim() || undefined,
        ownerId: form.ownerId || undefined,
        pipelineId: pipelineId || undefined,
      });
      toast.success('Lead criado no pipeline');
      setForm({ name: '', company: '', phone: '', revenue: '', description: '', ownerId: '' });
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao criar lead');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Novo Lead
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
          <DialogDescription>Informe os dados de contato da oportunidade</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" required value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="João da Silva" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Nome da empresa *</Label>
            <Input id="company" required value={form.company} onChange={(e) => update({ company: e.target.value })} placeholder="Acme Ltda" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input id="phone" required value={form.phone} onChange={(e) => update({ phone: e.target.value })} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="revenue">Faturamento (R$)</Label>
              <Input id="revenue" type="number" min="0" value={form.revenue} onChange={(e) => update({ revenue: e.target.value })} placeholder="opcional" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Responsável</Label>
            <Select value={form.ownerId} onValueChange={(v) => update({ ownerId: v === 'none' ? '' : v })}>
              <SelectTrigger>
                <SelectValue placeholder="Sem responsável (atribuir depois)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem responsável</SelectItem>
                {(users ?? []).map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" value={form.description} onChange={(e) => update({ description: e.target.value })} placeholder="opcional" rows={3} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
