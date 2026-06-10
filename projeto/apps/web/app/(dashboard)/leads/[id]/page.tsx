'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, Mail, Phone, User } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPatch, ApiError } from '@/lib/api';
import { useStages } from '@/lib/queries';
import type { LeadDetail } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScoreBadge } from '@/components/score-badge';
import { Timeline } from '@/components/leads/timeline';
import { AiActionBar } from '@/components/ai/ai-action-bar';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'destructive'> = {
  open: 'default',
  won: 'success',
  lost: 'destructive',
};

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const leadId = params.id;

  const { data: stages } = useStages();
  const { data, isLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => apiGet<LeadDetail>(`/leads/${leadId}`),
  });

  async function moveStage(stageId: string) {
    try {
      await apiPatch(`/leads/${leadId}/stage`, { stageId });
      toast.success('Estágio atualizado');
      await queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao mover estágio');
    }
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const { lead, contact, account } = data;

  return (
    <div className="flex h-full flex-col p-4 md:p-6">
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/pipeline')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{lead.title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[lead.status] ?? 'default'}>{lead.status}</Badge>
            <span className="text-lg font-semibold text-primary">
              {formatCurrency(lead.estimatedValue, lead.currency)}
            </span>
          </div>
        </div>
        <div className="w-48">
          <Select value={lead.stageId} onValueChange={moveStage}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {stages?.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="mb-4 border-fuchsia-500/20 bg-fuchsia-500/[0.03]">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <span className="text-sm font-medium text-muted-foreground">Ações de IA</span>
          <AiActionBar leadId={leadId} />
        </CardContent>
      </Card>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4 overflow-y-auto scrollbar-thin">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Score de IA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-3">
                <ScoreBadge score={lead.aiScore} className="h-9 w-9 text-sm" />
                <div className="text-sm text-muted-foreground">
                  {lead.aiScore ? 'Classificação preditiva' : 'Ainda não pontuado'}
                </div>
              </div>
              {lead.aiScoreReason && <p className="text-sm">{lead.aiScoreReason}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Responsável" value={lead.ownerName ?? '—'} />
              <Row label="Probabilidade" value={lead.probability != null ? `${lead.probability}%` : '—'} />
              <Row label="Fechamento previsto" value={formatDate(lead.expectedCloseDate)} />
              <Row label="Origem" value={lead.source} />
            </CardContent>
          </Card>

          {contact && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" /> Contato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <p className="font-medium">{contact.name}</p>
                {contact.roleTitle && <p className="text-muted-foreground">{contact.roleTitle}</p>}
                {contact.email && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" /> {contact.email}
                  </p>
                )}
                {contact.phone && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> {contact.phone}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {account && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" /> Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <p className="font-medium">{account.name}</p>
                {account.industry && <p className="text-muted-foreground">{account.industry}</p>}
                {account.website && <p className="text-muted-foreground">{account.website}</p>}
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="flex min-h-0 flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col">
            <Timeline leadId={leadId} entries={data.timeline} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
