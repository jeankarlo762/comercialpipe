'use client';

import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bot, FileText, Mail, Sparkles, Target } from 'lucide-react';
import { toast } from 'sonner';
import { apiPost, ApiError } from '@/lib/api';
import type { EmailDraftResult, NbaResult } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ScoreResult {
  score: string;
  reason: string;
  confidence: number;
}

const PRIORITY_VARIANT: Record<string, 'destructive' | 'warning' | 'secondary'> = {
  high: 'destructive',
  medium: 'warning',
  low: 'secondary',
};

export function AiActionBar({ leadId }: { leadId: string }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [modal, setModal] = useState<{ title: string; description: string; body: ReactNode } | null>(null);

  async function run<T>(key: string, fn: () => Promise<T>, render: (data: T) => { title: string; description: string; body: ReactNode }) {
    setBusy(key);
    try {
      const data = await fn();
      const content = render(data);
      setModal(content);
      await queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      await queryClient.invalidateQueries({ queryKey: ['credits'] });
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        toast.error('Créditos de IA esgotados. Configure o limite em Configurações.');
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Falha na operação de IA');
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() =>
            run<ScoreResult>(
              'score',
              () => apiPost(`/ai/leads/${leadId}/score`),
              (d) => ({
                title: `Score de IA: ${d.score}`,
                description: `Confiança ${d.confidence}%`,
                body: <p className="text-sm">{d.reason}</p>,
              }),
            )
          }
        >
          <Sparkles className="h-4 w-4" /> {busy === 'score' ? 'Analisando...' : 'Recalcular Score'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() =>
            run<NbaResult>(
              'nba',
              () => apiPost(`/ai/leads/${leadId}/next-action`),
              (d) => ({
                title: 'Próxima Melhor Ação',
                description: d.best_time,
                body: (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={PRIORITY_VARIANT[d.priority] ?? 'secondary'}>{d.priority}</Badge>
                      <span className="font-medium">{d.action_type.replace('_', ' ')}</span>
                    </div>
                    <div className="rounded-md bg-muted p-3 whitespace-pre-wrap">{d.suggested_message}</div>
                    <p className="text-muted-foreground">{d.reasoning}</p>
                  </div>
                ),
              }),
            )
          }
        >
          <Target className="h-4 w-4" /> {busy === 'nba' ? 'Pensando...' : 'Próxima Ação'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() =>
            run<{ summary: string }>(
              'summary',
              () => apiPost(`/ai/leads/${leadId}/summary`),
              (d) => ({
                title: 'Resumo para Reunião',
                description: 'Gerado por IA a partir da timeline',
                body: <p className="whitespace-pre-wrap text-sm leading-relaxed">{d.summary}</p>,
              }),
            )
          }
        >
          <FileText className="h-4 w-4" /> {busy === 'summary' ? 'Preparando...' : 'Preparar Reunião'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() =>
            run<EmailDraftResult>(
              'email',
              () => apiPost(`/ai/leads/${leadId}/email-draft`, { template: 'follow_up', tone: 'consultative' }),
              (d) => ({
                title: 'Rascunho de E-mail',
                description: d.subject,
                body: (
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">Assunto: {d.subject}</p>
                    <div className="rounded-md bg-muted p-3 whitespace-pre-wrap">{d.body}</div>
                  </div>
                ),
              }),
            )
          }
        >
          <Mail className="h-4 w-4" /> {busy === 'email' ? 'Escrevendo...' : 'Rascunhar E-mail'}
        </Button>
      </div>

      <Dialog open={modal !== null} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-fuchsia-500" /> {modal?.title}
            </DialogTitle>
            <DialogDescription>{modal?.description}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">{modal?.body}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
