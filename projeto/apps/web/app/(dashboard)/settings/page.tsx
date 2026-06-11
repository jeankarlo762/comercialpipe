'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, ChevronUp, Copy, ExternalLink, Link2, MessageCircle, Pencil, Plus, Trash2, Video } from 'lucide-react';
import { toast } from 'sonner';
import { apiDelete, apiGet, apiGetPaginated, apiPatch, apiPost, ApiError } from '@/lib/api';
import { useStages, useTenant } from '@/lib/queries';
import type { User } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  body: string;
  isActive: boolean;
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  closer: 'Closer',
  sdr: 'SDR',
};

export default function SettingsPage() {
  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Configurações</h1>
      <p className="mb-4 text-sm text-muted-foreground">Equipe, integrações e calendário</p>

      <Tabs defaultValue="team">
        <TabsList>
          <TabsTrigger value="team">Equipe</TabsTrigger>
          <TabsTrigger value="n8n">Integrações</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="google">Google Agenda</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="team"><TeamTab /></TabsContent>
        <TabsContent value="n8n"><N8nTab /></TabsContent>
        <TabsContent value="whatsapp"><WhatsappTab /></TabsContent>
        <TabsContent value="google"><GoogleTab /></TabsContent>
        <TabsContent value="webhooks"><WebhooksTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function TeamTab() {
  const { data } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiGetPaginated<User[]>('/users', { limit: 50 }),
    staleTime: 60_000,
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Membros da equipe</CardTitle>
        <CardDescription>Usuários do workspace e seus papéis</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {(data?.data ?? []).map((u) => (
            <div key={u.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{u.name}</p>
                <p className="text-sm text-muted-foreground">{u.email}</p>
              </div>
              <Badge variant="secondary">{ROLE_LABEL[u.role] ?? u.role}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PipelineTab() {
  const { data: stages } = useStages();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');

  async function addStage(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiPost('/pipeline/stages', { name, color: '#6366f1' });
      setName('');
      await queryClient.invalidateQueries({ queryKey: ['stages'] });
      await queryClient.invalidateQueries({ queryKey: ['board'] });
      toast.success('Estágio adicionado');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao adicionar');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estágios do pipeline</CardTitle>
        <CardDescription>Personalize as colunas do funil</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {(stages ?? []).map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="flex-1 text-sm font-medium">{s.name}</span>
              {s.isClosedWon && <Badge variant="success">ganho</Badge>}
              {s.isClosedLost && <Badge variant="destructive">perdido</Badge>}
            </div>
          ))}
        </div>
        <form onSubmit={addStage} className="flex gap-2">
          <Input placeholder="Nome do novo estágio" value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
          <Button type="submit" size="sm" disabled={!name.trim()}>Adicionar</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function N8nTab() {
  const { data: tenant } = useTenant();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ n8nBaseUrl: '', n8nApiKey: '', n8nWebhookSecret: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant?.n8nBaseUrl) setForm((f) => ({ ...f, n8nBaseUrl: tenant.n8nBaseUrl ?? '' }));
  }, [tenant]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPatch('/tenants/current/integrations/n8n', {
        n8nBaseUrl: form.n8nBaseUrl || null,
        n8nApiKey: form.n8nApiKey || null,
        n8nWebhookSecret: form.n8nWebhookSecret || null,
      });
      toast.success('Integração n8n salva');
      await queryClient.invalidateQueries({ queryKey: ['tenant'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          n8n {tenant?.n8nConfigured && <Badge variant="success">conectado</Badge>}
        </CardTitle>
        <CardDescription>Webhooks bidirecionais assinados com HMAC-SHA256</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-2">
            <Label>URL base do n8n</Label>
            <Input placeholder="https://n8n.suaempresa.com" value={form.n8nBaseUrl} onChange={(e) => setForm({ ...form, n8nBaseUrl: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>API Key do n8n</Label>
            <Input type="password" placeholder="••••••" value={form.n8nApiKey} onChange={(e) => setForm({ ...form, n8nApiKey: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Webhook Secret (HMAC)</Label>
            <Input type="password" placeholder="mín. 8 caracteres" value={form.n8nWebhookSecret} onChange={(e) => setForm({ ...form, n8nWebhookSecret: e.target.value })} />
          </div>
          <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar integração'}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

interface GoogleStatus {
  configured: boolean;
  connected: boolean;
  email: string | null;
}

const SETUP_STEPS = [
  {
    number: '1',
    title: 'Criar projeto no Google Cloud',
    content: (
      <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
        <li>Acesse <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-blue-400 underline inline-flex items-center gap-1">console.cloud.google.com <ExternalLink className="h-3 w-3" /></a></li>
        <li>Clique em <strong className="text-foreground">Selecionar projeto</strong> → <strong className="text-foreground">Novo projeto</strong></li>
        <li>Dê um nome (ex.: <code className="rounded bg-muted px-1">CRM NX</code>) e clique em <strong className="text-foreground">Criar</strong></li>
      </ol>
    ),
  },
  {
    number: '2',
    title: 'Ativar a Google Calendar API',
    content: (
      <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
        <li>No menu lateral, vá em <strong className="text-foreground">APIs e Serviços</strong> → <strong className="text-foreground">Biblioteca</strong></li>
        <li>Pesquise por <code className="rounded bg-muted px-1">Google Calendar API</code></li>
        <li>Clique na API e depois em <strong className="text-foreground">Ativar</strong></li>
      </ol>
    ),
  },
  {
    number: '3',
    title: 'Configurar a Tela de Consentimento OAuth',
    content: (
      <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
        <li>Vá em <strong className="text-foreground">APIs e Serviços</strong> → <strong className="text-foreground">Tela de consentimento OAuth</strong></li>
        <li>Selecione <strong className="text-foreground">Externo</strong> e clique em <strong className="text-foreground">Criar</strong></li>
        <li>Preencha nome do app, e-mail de suporte e e-mail do desenvolvedor</li>
        <li>Na etapa de <strong className="text-foreground">Escopos</strong>, adicione: <code className="rounded bg-muted px-1">calendar.events</code>, <code className="rounded bg-muted px-1">userinfo.email</code> e <code className="rounded bg-muted px-1">openid</code></li>
        <li>Em <strong className="text-foreground">Usuários de teste</strong>, adicione os e-mails que poderão se conectar</li>
      </ol>
    ),
  },
  {
    number: '4',
    title: 'Criar as Credenciais OAuth',
    content: (
      <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
        <li>Vá em <strong className="text-foreground">APIs e Serviços</strong> → <strong className="text-foreground">Credenciais</strong></li>
        <li>Clique em <strong className="text-foreground">+ Criar credenciais</strong> → <strong className="text-foreground">ID do cliente OAuth</strong></li>
        <li>Tipo: <strong className="text-foreground">Aplicativo da Web</strong></li>
        <li>Em <strong className="text-foreground">URIs de redirecionamento autorizados</strong>, adicione:<br />
          <code className="mt-1 block rounded bg-muted px-2 py-1 font-mono text-xs">http://localhost:3001/v1/integrations/google/callback</code>
        </li>
        <li>Clique em <strong className="text-foreground">Criar</strong> e copie o <strong className="text-foreground">Client ID</strong> e <strong className="text-foreground">Client Secret</strong></li>
      </ol>
    ),
  },
  {
    number: '5',
    title: 'Colar as credenciais aqui e conectar',
    content: (
      <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
        <li>Cole o <strong className="text-foreground">Client ID</strong> e o <strong className="text-foreground">Client Secret</strong> nos campos acima</li>
        <li>Clique em <strong className="text-foreground">Salvar credenciais</strong></li>
        <li>Clique em <strong className="text-foreground">Conectar conta Google</strong> e autorize o acesso</li>
        <li>Pronto — o badge <strong className="text-green-400">conectado</strong> aparecerá confirmando a integração</li>
      </ol>
    ),
  },
];

function GoogleSetupGuide() {
  const [open, setOpen] = useState(false);
  const [openStep, setOpenStep] = useState<number | null>(null);

  return (
    <Card className="border-blue-500/20 bg-blue-500/5">
      <button
        type="button"
        className="flex w-full items-center justify-between px-6 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-blue-400">Passo a passo: como configurar o Google Calendar</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <CardContent className="space-y-2 pt-0">
          {SETUP_STEPS.map((step, i) => (
            <div key={i} className="rounded-md border border-border/50">
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
                onClick={() => setOpenStep(openStep === i ? null : i)}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-400">
                  {step.number}
                </span>
                <span className="flex-1 text-sm font-medium">{step.title}</span>
                {openStep === i
                  ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {openStep === i && (
                <div className="border-t border-border/50 px-4 pb-4 pt-3">
                  {step.content}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

function GoogleTab() {
  const queryClient = useQueryClient();
  const { data: tenant } = useTenant();
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['google-status'],
    queryFn: () => apiGet<GoogleStatus>('/integrations/google/status'),
    staleTime: 30_000,
  });

  const [creds, setCreds] = useState({ clientId: '', clientSecret: '' });
  const [savingCreds, setSavingCreds] = useState(false);

  async function saveCreds(e: React.FormEvent) {
    e.preventDefault();
    setSavingCreds(true);
    try {
      await apiPatch('/tenants/current/integrations/google', {
        clientId: creds.clientId || null,
        clientSecret: creds.clientSecret || null,
      });
      toast.success('Credenciais Google salvas');
      setCreds({ clientId: '', clientSecret: '' });
      await queryClient.invalidateQueries({ queryKey: ['tenant'] });
      await queryClient.invalidateQueries({ queryKey: ['google-status'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao salvar');
    } finally {
      setSavingCreds(false);
    }
  }

  async function connect() {
    try {
      const { url } = await apiGet<{ url: string }>('/integrations/google/connect');
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao conectar');
    }
  }

  async function disconnect() {
    try {
      await apiPost('/integrations/google/disconnect');
      await queryClient.invalidateQueries({ queryKey: ['google-status'] });
      toast.success('Google desconectado');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao desconectar');
    }
  }

  const isConfigured = status?.configured || tenant?.googleConfigured;

  return (
    <div className="space-y-4">
      <GoogleSetupGuide />

      {/* Credentials Card */}
      <Card>
        <CardHeader>
          <CardTitle>Credenciais do Google OAuth</CardTitle>
          <CardDescription>
            Informe o Client ID e Client Secret do seu projeto no Google Cloud Console.
            {tenant?.googleConfigured && <span className="ml-1 text-green-400">✓ Credenciais configuradas</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveCreds} className="space-y-3">
            <div className="space-y-2">
              <Label>Google Client ID</Label>
              <Input
                placeholder={tenant?.googleConfigured ? '••••••••••••• (já configurado)' : 'xxxxx.apps.googleusercontent.com'}
                value={creds.clientId}
                onChange={(e) => setCreds({ ...creds, clientId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Google Client Secret</Label>
              <Input
                type="password"
                placeholder={tenant?.googleConfigured ? '••••••••••••• (já configurado)' : 'GOCSPX-...'}
                value={creds.clientSecret}
                onChange={(e) => setCreds({ ...creds, clientSecret: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={savingCreds || (!creds.clientId && !creds.clientSecret)}>
                {savingCreds ? 'Salvando...' : 'Salvar credenciais'}
              </Button>
              {tenant?.googleConfigured && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive"
                  onClick={async () => {
                    await apiPatch('/tenants/current/integrations/google', { clientId: null, clientSecret: null });
                    await queryClient.invalidateQueries({ queryKey: ['tenant'] });
                    await queryClient.invalidateQueries({ queryKey: ['google-status'] });
                    toast.success('Credenciais removidas');
                  }}
                >
                  Remover credenciais
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Connection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Conta Google
            {status?.connected && <Badge variant="success">conectado</Badge>}
          </CardTitle>
          <CardDescription>
            Vincule sua conta Google para criar eventos no Calendar e gerar links do Meet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <p className="text-sm text-muted-foreground">Verificando...</p>
          ) : !isConfigured ? (
            <p className="text-sm text-amber-400">Configure as credenciais acima para habilitar a integração.</p>
          ) : status?.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-md border bg-accent/30 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/20">
                  <Video className="h-4 w-4 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Conta vinculada</p>
                  {status.email && <p className="text-xs text-muted-foreground">{status.email}</p>}
                </div>
                <Badge variant="success">Ativo</Badge>
              </div>
              <Button variant="outline" onClick={disconnect} className="text-destructive hover:text-destructive">
                Desconectar Google
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Clique abaixo para autorizar o acesso à sua conta Google e habilitar o Google Calendar e Meet.
              </p>
              <Button onClick={connect} className="gap-2">
                <Link2 className="h-4 w-4" /> Conectar conta Google
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function WhatsappTab() {
  const { data: tenant } = useTenant();
  const queryClient = useQueryClient();
  const [creds, setCreds] = useState({ phoneNumberId: '', accessToken: '' });
  const [savingCreds, setSavingCreds] = useState(false);

  // Templates state
  const [editTpl, setEditTpl] = useState<MessageTemplate | null>(null);
  const [newTpl, setNewTpl] = useState(false);
  const [tplForm, setTplForm] = useState({ name: '', category: 'geral', body: '' });
  const [savingTpl, setSavingTpl] = useState(false);

  const { data: tplData, isLoading: tplLoading } = useQuery({
    queryKey: ['message-templates'],
    queryFn: () => apiGetPaginated<MessageTemplate[]>('/message-templates', { limit: 50 }),
    staleTime: 30_000,
  });
  const templates = tplData?.data ?? [];

  function openNew() {
    setTplForm({ name: '', category: 'geral', body: '' });
    setEditTpl(null);
    setNewTpl(true);
  }
  function openEdit(t: MessageTemplate) {
    setTplForm({ name: t.name, category: t.category, body: t.body });
    setEditTpl(t);
    setNewTpl(true);
  }

  async function saveCreds(e: React.FormEvent) {
    e.preventDefault();
    setSavingCreds(true);
    try {
      await apiPatch('/tenants/current/integrations/whatsapp', {
        phoneNumberId: creds.phoneNumberId || null,
        accessToken: creds.accessToken || null,
      });
      toast.success('Credenciais WhatsApp salvas');
      setCreds({ phoneNumberId: '', accessToken: '' });
      await queryClient.invalidateQueries({ queryKey: ['tenant'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao salvar');
    } finally {
      setSavingCreds(false);
    }
  }

  async function saveTpl(e: React.FormEvent) {
    e.preventDefault();
    setSavingTpl(true);
    try {
      if (editTpl) {
        await apiPatch(`/message-templates/${editTpl.id}`, tplForm);
        toast.success('Template atualizado');
      } else {
        await apiPost('/message-templates', tplForm);
        toast.success('Template criado');
      }
      setNewTpl(false);
      setEditTpl(null);
      await queryClient.invalidateQueries({ queryKey: ['message-templates'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao salvar template');
    } finally {
      setSavingTpl(false);
    }
  }

  async function deleteTpl(id: string) {
    try {
      await apiDelete(`/message-templates/${id}`);
      toast.success('Template removido');
      await queryClient.invalidateQueries({ queryKey: ['message-templates'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao remover');
    }
  }

  return (
    <div className="space-y-4">
      {/* Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            WhatsApp Business API
            {tenant?.whatsappConfigured && <Badge variant="success">conectado</Badge>}
          </CardTitle>
          <CardDescription>
            Configure as credenciais da Meta Cloud API para enviar mensagens pelo WhatsApp Business
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tenant?.whatsappConfigured && (
            <div className="mb-4 flex items-center gap-3 rounded-md border bg-green-500/5 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
                <Check className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium">WhatsApp conectado</p>
                <p className="text-xs text-muted-foreground">Phone Number ID: {tenant.whatsappPhoneNumberId}</p>
              </div>
            </div>
          )}
          <form onSubmit={saveCreds} className="space-y-3">
            <div className="space-y-2">
              <Label>Phone Number ID</Label>
              <Input
                placeholder={tenant?.whatsappConfigured ? '(já configurado — cole para atualizar)' : '1234567890'}
                value={creds.phoneNumberId}
                onChange={(e) => setCreds({ ...creds, phoneNumberId: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Encontre em: Meta for Developers → WhatsApp → API Setup → Phone Number ID
              </p>
            </div>
            <div className="space-y-2">
              <Label>Access Token permanente</Label>
              <Input
                type="password"
                placeholder={tenant?.whatsappConfigured ? '••••••••' : 'EAAxxxx...'}
                value={creds.accessToken}
                onChange={(e) => setCreds({ ...creds, accessToken: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Token de sistema permanente do Meta Business Manager (não o token temporário de 24h)
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={savingCreds || (!creds.phoneNumberId && !creds.accessToken)}>
                {savingCreds ? 'Salvando...' : 'Salvar credenciais'}
              </Button>
              {tenant?.whatsappConfigured && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive"
                  onClick={async () => {
                    await apiPatch('/tenants/current/integrations/whatsapp', { phoneNumberId: null, accessToken: null });
                    await queryClient.invalidateQueries({ queryKey: ['tenant'] });
                    toast.success('Credenciais removidas');
                  }}
                >
                  Remover
                </Button>
              )}
            </div>
          </form>

          {/* Setup guide */}
          <div className="mt-4 rounded-md border border-blue-500/20 bg-blue-500/5 p-3 text-sm text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Como configurar</p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>Acesse <span className="font-medium text-foreground">developers.facebook.com</span> e crie um app do tipo Business</li>
              <li>Adicione o produto <span className="font-medium text-foreground">WhatsApp</span> ao app</li>
              <li>Em <span className="font-medium text-foreground">API Setup</span>, copie o <span className="font-medium text-foreground">Phone Number ID</span></li>
              <li>No <span className="font-medium text-foreground">Meta Business Manager</span>, crie um token de sistema permanente com permissão <code className="rounded bg-muted px-1">whatsapp_business_messaging</code></li>
              <li>Cole ambos os valores acima e salve</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Message Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mensagens prontas</CardTitle>
              <CardDescription>Templates reutilizáveis para enviar via WhatsApp. Use {'{{nome}}'}, {'{{empresa}}'} como variáveis.</CardDescription>
            </div>
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4" /> Novo template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tplLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum template criado ainda.</p>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="flex items-start gap-3 rounded-md border p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{t.name}</span>
                      <Badge variant="secondary" className="text-xs">{t.category}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">{t.body}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => void deleteTpl(t.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template create/edit dialog */}
      <Dialog open={newTpl} onOpenChange={(v) => { if (!v) { setNewTpl(false); setEditTpl(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTpl ? 'Editar template' : 'Novo template'}</DialogTitle>
          </DialogHeader>
          <form id="tpl-form" onSubmit={saveTpl} className="space-y-3">
            <div className="space-y-2">
              <Label>Nome do template</Label>
              <Input
                required
                placeholder="Ex: Boas-vindas, Follow-up, Proposta"
                value={tplForm.name}
                onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Input
                placeholder="geral"
                value={tplForm.category}
                onChange={(e) => setTplForm({ ...tplForm, category: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                required
                rows={5}
                placeholder={"Olá {{nome}}, tudo bem?\n\nVi que você tem interesse em nossos serviços..."}
                value={tplForm.body}
                onChange={(e) => setTplForm({ ...tplForm, body: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Variáveis disponíveis: <code className="rounded bg-muted px-1">{'{{nome}}'}</code> <code className="rounded bg-muted px-1">{'{{empresa}}'}</code> <code className="rounded bg-muted px-1">{'{{telefone}}'}</code>
              </p>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNewTpl(false); setEditTpl(null); }}>Cancelar</Button>
            <Button type="submit" form="tpl-form" disabled={savingTpl}>
              {savingTpl ? 'Salvando...' : editTpl ? 'Salvar alterações' : 'Criar template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WebhooksTab() {
  const { data: tenant } = useTenant();
  const [copied, setCopied] = useState(false);
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

  function copy(text: string) {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhooks & API Key</CardTitle>
        <CardDescription>Ingestão de leads externos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>API Key (header X-API-Key)</Label>
          <div className="flex gap-2">
            <Input readOnly value={tenant?.apiKey ?? ''} className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={() => copy(tenant?.apiKey ?? '')}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Endpoint de ingestão</Label>
          <Input readOnly value={`${base}/v1/webhooks/leads`} className="font-mono text-xs" />
        </div>
        <div className="space-y-2">
          <Label>Callback do n8n</Label>
          <Input readOnly value={`${base}/v1/webhooks/n8n/callback`} className="font-mono text-xs" />
        </div>
      </CardContent>
    </Card>
  );
}
