'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { registerSchema } from '@commercialpipe/shared-types';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ tenantName: '', slug: '', name: '', email: '', password: '' });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...form, slug: form.slug || slugify(form.tenantName) };
    const parsed = registerSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    setLoading(true);
    try {
      await register(parsed.data);
      toast.success('Workspace criado!');
      router.replace('/pipeline');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao registrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-border/60 shadow-xl">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-6 w-6" />
          <span className="text-xl font-bold tracking-tight text-foreground">CommercialPipe</span>
        </div>
        <CardTitle>Criar workspace</CardTitle>
        <CardDescription>Configure sua empresa e o usuário administrador</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenantName">Nome da empresa</Label>
            <Input
              id="tenantName"
              required
              value={form.tenantName}
              onChange={(e) => setForm({ ...form, tenantName: e.target.value, slug: slugify(e.target.value) })}
              placeholder="Acme Vendas"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Subdomínio</Label>
            <div className="flex items-center gap-2">
              <Input id="slug" required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="acme" />
              <span className="text-sm text-muted-foreground">.commercialpipe.com</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="name">Seu nome</Label>
              <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Maria Silva" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="maria@acme.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha (mín. 8 caracteres)</Label>
            <Input id="password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Criando...' : 'Criar workspace'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
