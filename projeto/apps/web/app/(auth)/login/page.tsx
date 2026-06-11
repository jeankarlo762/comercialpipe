'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRight, BarChart3, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ email: form.email, password: form.password });
      toast.success('Bem-vindo de volta!');
      router.replace('/pipeline');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Left panel — sales image */}
      <div className="relative hidden w-1/2 overflow-hidden lg:block">
        {/* Gradient overlay */}
        <div className="absolute inset-0 z-10 bg-gradient-to-br from-amber-500/90 via-yellow-400/80 to-amber-600/90" />

        {/* Background image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80&auto=format&fit=crop"
          alt="Equipe de vendas"
          className="h-full w-full object-cover"
        />

        {/* Content over image */}
        <div className="absolute inset-0 z-20 flex flex-col justify-between p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white drop-shadow">CommercialPipe</span>
          </div>

          {/* Bottom tagline */}
          <div className="space-y-3">
            <h2 className="text-3xl font-bold leading-tight text-white drop-shadow-md">
              Gerencie seu funil.<br />Feche mais negócios.
            </h2>
            <p className="text-base text-white/90 drop-shadow">
              A plataforma comercial que transforma leads em resultados.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full flex-col items-center justify-center bg-white px-6 py-12 lg:w-1/2 dark:bg-zinc-900">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">CommercialPipe</span>
        </div>

        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Acesse sua conta</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Entre com seu e-mail e senha para continuar.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5" autoComplete="off">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="off"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="voce@empresa.com"
                  className="h-11 pl-10 focus-visible:ring-amber-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="h-11 pl-10 focus-visible:ring-amber-400"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="h-11 w-full gap-2 bg-amber-400 text-sm font-semibold text-zinc-900 hover:bg-amber-500"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 100 20v-2a8 8 0 01-8-8z" />
                  </svg>
                  Entrando...
                </span>
              ) : (
                <>
                  Entrar <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm">
            <Link
              href="/forgot-password"
              className="text-zinc-500 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400"
            >
              Esqueci minha senha
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
