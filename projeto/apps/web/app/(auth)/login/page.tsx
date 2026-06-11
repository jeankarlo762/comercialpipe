'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NxLogo } from '@/components/ui/nx-logo';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
      {/* Left panel — sales illustration */}
      <div className="relative hidden w-1/2 overflow-hidden bg-zinc-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Subtle radial glow behind chart */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[420px] w-[420px] rounded-full bg-amber-400/10 blur-[80px]" />
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[260px] w-[260px] rounded-full bg-amber-300/8 blur-[40px]" />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <NxLogo size="md" />
          <span className="text-2xl font-bold tracking-tight text-white">CRM NX</span>
        </div>

        {/* Growth chart SVG */}
        <div className="relative z-10 flex flex-1 items-center justify-center">
          <svg viewBox="0 0 400 320" className="w-[340px]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="glow-amber" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="glow-soft" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <linearGradient id="bar1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.15" />
              </linearGradient>
              <linearGradient id="bar2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.18" />
              </linearGradient>
              <linearGradient id="bar3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.22" />
              </linearGradient>
              <linearGradient id="bar4" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fde68a" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.28" />
              </linearGradient>
            </defs>

            {/* Concentric circles (subtle) */}
            <circle cx="200" cy="170" r="145" stroke="#fbbf24" strokeOpacity="0.06" strokeWidth="1" />
            <circle cx="200" cy="170" r="108" stroke="#fbbf24" strokeOpacity="0.05" strokeWidth="1" />
            <circle cx="200" cy="170" r="72" stroke="#fbbf24" strokeOpacity="0.04" strokeWidth="1" />

            {/* Baseline */}
            <line x1="60" y1="258" x2="340" y2="258" stroke="#fbbf24" strokeOpacity="0.12" strokeWidth="1" />

            {/* Bar 1 */}
            <rect x="80" y="218" width="38" height="40" rx="4" fill="url(#bar1)" filter="url(#glow-soft)" />
            <rect x="80" y="218" width="38" height="40" rx="4" stroke="#fbbf24" strokeOpacity="0.25" strokeWidth="1" />

            {/* Bar 2 */}
            <rect x="148" y="188" width="38" height="70" rx="4" fill="url(#bar2)" filter="url(#glow-soft)" />
            <rect x="148" y="188" width="38" height="70" rx="4" stroke="#fbbf24" strokeOpacity="0.30" strokeWidth="1" />

            {/* Bar 3 */}
            <rect x="216" y="148" width="38" height="110" rx="4" fill="url(#bar3)" filter="url(#glow-soft)" />
            <rect x="216" y="148" width="38" height="110" rx="4" stroke="#fbbf24" strokeOpacity="0.38" strokeWidth="1" />

            {/* Bar 4 */}
            <rect x="284" y="98" width="38" height="160" rx="4" fill="url(#bar4)" filter="url(#glow-soft)" />
            <rect x="284" y="98" width="38" height="160" rx="4" stroke="#fde68a" strokeOpacity="0.5" strokeWidth="1" />

            {/* Growth curve */}
            <path
              d="M 80 230 C 120 210, 148 195, 185 170 C 222 145, 250 120, 303 72"
              stroke="#fde68a"
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#glow-amber)"
              opacity="0.9"
            />

            {/* Arrow head */}
            <path
              d="M 295 60 L 316 68 L 304 82"
              stroke="#fde68a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow-amber)"
              opacity="0.9"
            />
          </svg>
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10 space-y-2">
          <h2 className="text-2xl font-bold leading-tight text-white">
            Gerencie seu funil.<br />
            <span className="text-amber-400">Feche mais negócios.</span>
          </h2>
          <p className="text-sm text-zinc-400">
            A plataforma comercial que transforma leads em resultados.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full flex-col items-center justify-center bg-white px-6 py-12 lg:w-1/2 dark:bg-zinc-900">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <NxLogo size="sm" />
          <span className="text-xl font-bold tracking-tight">CRM NX</span>
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
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="h-11 pl-10 pr-10 focus-visible:ring-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
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
