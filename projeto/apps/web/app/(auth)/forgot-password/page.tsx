'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, CheckCircle2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { apiPost, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiPost('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao enviar e-mail');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white px-6 py-12 dark:bg-zinc-900">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">CommercialPipe</span>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <CheckCircle2 className="h-14 w-14 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">E-mail enviado!</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Se o endereço <span className="font-medium text-zinc-700 dark:text-zinc-300">{email}</span> estiver
                cadastrado, você receberá um link para redefinir sua senha.
              </p>
            </div>
            <p className="text-xs text-zinc-400">Verifique também a caixa de spam.</p>
            <Link href="/login" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar para o login
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Esqueceu sua senha?</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Informe seu e-mail e enviaremos um link para criar uma nova senha.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@empresa.com"
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
                    Enviando...
                  </span>
                ) : (
                  'Enviar link de recuperação'
                )}
              </Button>
            </form>

            <Link href="/login" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar para o login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
