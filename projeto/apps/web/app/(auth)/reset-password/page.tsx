'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, BarChart3, CheckCircle2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { apiPost, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-zinc-500">Link inválido ou expirado.</p>
        <Link href="/forgot-password" className="text-sm font-semibold text-indigo-600 hover:underline">
          Solicitar novo link
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('As senhas não coincidem');
      return;
    }
    setLoading(true);
    try {
      await apiPost('/auth/reset-password', { token, password: form.password });
      setDone(true);
      setTimeout(() => router.replace('/login'), 3000);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao redefinir senha');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <CheckCircle2 className="h-14 w-14 text-emerald-500" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Senha redefinida!</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Sua senha foi alterada com sucesso. Você será redirecionado para o login.
          </p>
        </div>
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
          <ArrowLeft className="h-3.5 w-3.5" /> Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Criar nova senha</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Escolha uma senha segura com pelo menos 8 caracteres.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5" autoComplete="off">
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Nova senha
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className="h-11 pl-10"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Confirmar nova senha
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              placeholder="••••••••"
              className="h-11 pl-10"
            />
          </div>
        </div>

        <Button
          type="submit"
          className="h-11 w-full bg-indigo-600 text-sm font-semibold hover:bg-indigo-700"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 100 20v-2a8 8 0 01-8-8z" />
              </svg>
              Salvando...
            </span>
          ) : (
            'Salvar nova senha'
          )}
        </Button>
      </form>

      <Link href="/login" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar para o login
      </Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white px-6 py-12 dark:bg-zinc-900">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">CRM NX</span>
        </div>
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
