# Prompt de Criação: CRM Comercial B2B com IA e n8n

## Instruções para o Claude Code

Você é um Arquiteto de Software Sênior. Construa um **CRM Comercial B2B completo, moderno e funcional** chamado **CommercialPipe**. O sistema centraliza a gestão de leads, automatiza fluxos comerciais via n8n e utiliza IA para impulsionar times de vendas.

Siga Clean Architecture, SOLID e implemente **tudo que está descrito abaixo** de forma incremental e funcional. Não crie arquivos vazios ou TODOs — cada arquivo gerado deve ter código real e funcional.

---

## Stack Técnica Obrigatória

- **Backend:** Node.js + TypeScript + Fastify
- **Banco Relacional:** PostgreSQL com Drizzle ORM
- **Cache / Filas:** Redis + BullMQ
- **Autenticação:** JWT + Refresh Token (httpOnly cookie)
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **IA:** SDK Anthropic (Claude) — modelo `claude-sonnet-4-6`
- **Automação:** n8n via API REST (self-hosted ou cloud)
- **Containerização:** Docker + docker-compose (desenvolvimento local completo)
- **Validação:** Zod (backend e frontend)
- **Testes:** Vitest (unitários) + Playwright (E2E nos fluxos críticos)

---

## Estrutura de Monorepo

```
comercialpipe/
├── apps/
│   ├── api/                  # Backend Fastify
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── tenants/
│   │   │   │   ├── users/
│   │   │   │   ├── leads/
│   │   │   │   ├── contacts/
│   │   │   │   ├── accounts/
│   │   │   │   ├── deals/
│   │   │   │   ├── pipeline/
│   │   │   │   ├── timeline/
│   │   │   │   ├── automations/
│   │   │   │   ├── ai/
│   │   │   │   └── webhooks/
│   │   │   ├── shared/
│   │   │   │   ├── middleware/
│   │   │   │   ├── queue/
│   │   │   │   ├── database/
│   │   │   │   └── errors/
│   │   │   └── app.ts
│   │   └── package.json
│   └── web/                  # Frontend Next.js
│       ├── app/
│       │   ├── (auth)/
│       │   ├── (dashboard)/
│       │   │   ├── pipeline/
│       │   │   ├── leads/
│       │   │   ├── contacts/
│       │   │   ├── automations/
│       │   │   └── settings/
│       │   └── layout.tsx
│       ├── components/
│       │   ├── ui/           # shadcn/ui
│       │   ├── pipeline/
│       │   ├── leads/
│       │   └── ai/
│       └── package.json
├── packages/
│   └── shared-types/         # Tipos TypeScript compartilhados
├── docker-compose.yml
└── package.json              # Turborepo
```

---

## Módulo 1: Multi-Tenancy & IAM

### Banco de Dados

```sql
-- Tenants
id uuid PK
name varchar NOT NULL
slug varchar UNIQUE NOT NULL        -- subdomínio: empresa.commercialpipe.com
status enum('active','suspended','trial')
api_key varchar UNIQUE              -- para webhooks externos
ai_credits_limit integer DEFAULT 1000
ai_credits_used integer DEFAULT 0
ai_credits_reset_at timestamp       -- reset mensal automático
created_at timestamp

-- Users
id uuid PK
tenant_id uuid FK(tenants)
name varchar NOT NULL
email varchar NOT NULL
password_hash varchar NOT NULL
role enum('admin','manager','closer','sdr') NOT NULL
avatar_url varchar
is_active boolean DEFAULT true
last_login_at timestamp
created_at timestamp
UNIQUE(tenant_id, email)

-- Refresh Tokens
id uuid PK
user_id uuid FK(users)
token_hash varchar UNIQUE
expires_at timestamp
revoked_at timestamp
```

### RBAC — Regras de Acesso

| Recurso | Admin | Manager | Closer | SDR |
|---|---|---|---|---|
| Todos os leads do tenant | ✅ | ✅ | ❌ | ❌ |
| Leads do próprio time | ✅ | ✅ | ❌ | ❌ |
| Próprios leads/deals | ✅ | ✅ | ✅ | ✅ |
| Leads para qualificação | ✅ | ✅ | ❌ | ✅ |
| Configurar automações | ✅ | ✅ | ❌ | ❌ |
| Gerenciar usuários | ✅ | ❌ | ❌ | ❌ |
| Ver relatórios do tenant | ✅ | ✅ | ❌ | ❌ |
| Configurar AI/créditos | ✅ | ❌ | ❌ | ❌ |

### Endpoints Auth

```
POST /v1/auth/register        → Cria tenant + usuário admin
POST /v1/auth/login           → Retorna access_token (15min) + refresh_token cookie (7d)
POST /v1/auth/refresh         → Renova access_token via cookie
POST /v1/auth/logout          → Revoga refresh_token
POST /v1/auth/forgot-password → Envia e-mail de reset
POST /v1/auth/reset-password  → Confirma nova senha com token
GET  /v1/auth/me              → Dados do usuário autenticado
```

---

## Módulo 2: Core CRM

### Banco de Dados

```sql
-- Pipeline Stages (customizável por tenant)
id uuid PK
tenant_id uuid FK
name varchar NOT NULL
order_index integer NOT NULL
color varchar DEFAULT '#6366f1'   -- hex color
is_closed_won boolean DEFAULT false
is_closed_lost boolean DEFAULT false
created_at timestamp

-- Accounts (Empresas)
id uuid PK
tenant_id uuid FK
name varchar NOT NULL
domain varchar
industry varchar
size enum('1-10','11-50','51-200','201-500','500+')
website varchar
linkedin_url varchar
address jsonb
custom_fields jsonb DEFAULT '{}'
created_by uuid FK(users)
created_at timestamp

-- Contacts (Pessoas)
id uuid PK
tenant_id uuid FK
account_id uuid FK(accounts) nullable
name varchar NOT NULL
email varchar
phone varchar
role_title varchar
linkedin_url varchar
custom_fields jsonb DEFAULT '{}'
created_by uuid FK(users)
created_at timestamp

-- Leads / Opportunities
id uuid PK
tenant_id uuid FK
title varchar NOT NULL
owner_id uuid FK(users)
stage_id uuid FK(pipeline_stages)
contact_id uuid FK(contacts) nullable
account_id uuid FK(accounts) nullable
estimated_value decimal(15,2)
currency varchar DEFAULT 'BRL'
probability integer CHECK(0-100)   -- % manual ou calculada por IA
status enum('open','won','lost') DEFAULT 'open'
lost_reason varchar
expected_close_date date
ai_score enum('A','B','C','D')     -- Score de IA
ai_score_reason text               -- Justificativa da IA
last_activity_at timestamp         -- atualizado a cada interação
source varchar                     -- 'webhook','manual','import'
utm_data jsonb                     -- utm_source, utm_campaign, etc.
custom_fields jsonb DEFAULT '{}'
created_by uuid FK(users)
created_at timestamp

-- Timeline / Interactions (IMUTÁVEL — sem UPDATE/DELETE)
id uuid PK
tenant_id uuid FK
lead_id uuid FK(leads)
type enum('note','email','call','meeting','stage_change','ai_action','system','webhook')
content text NOT NULL
metadata jsonb                     -- dados extras (de_estagio, para_estagio, duração_chamada, etc.)
ai_generated boolean DEFAULT false
created_by uuid FK(users) nullable -- null = evento de sistema
created_at timestamp               -- INDEX para ordenação

-- Tasks
id uuid PK
tenant_id uuid FK
lead_id uuid FK(leads)
assigned_to uuid FK(users)
title varchar NOT NULL
description text
due_date timestamp
status enum('pending','done','overdue')
created_by uuid FK(users)
created_at timestamp
```

### Endpoints Core CRM

```
# Leads
GET    /v1/leads                   → Lista com filtros (stage, owner, score, status)
GET    /v1/leads/:id               → Detalhes completos com timeline
POST   /v1/leads                   → Cria lead manualmente
PATCH  /v1/leads/:id               → Atualiza campos
PATCH  /v1/leads/:id/stage         → Move de estágio (dispara eventos)
DELETE /v1/leads/:id               → Soft-delete (auditado)

# Pipeline
GET    /v1/pipeline                → Todos os estágios com leads (board view)
GET    /v1/pipeline/stages         → Lista de estágios customizados
POST   /v1/pipeline/stages         → Cria estágio
PATCH  /v1/pipeline/stages/:id     → Edita estágio
PATCH  /v1/pipeline/stages/reorder → Reordena estágios
DELETE /v1/pipeline/stages/:id     → Remove estágio (move leads para outro)

# Contacts & Accounts
GET    /v1/contacts                → Lista contatos
POST   /v1/contacts                → Cria contato
PATCH  /v1/contacts/:id
GET    /v1/accounts
POST   /v1/accounts
PATCH  /v1/accounts/:id

# Timeline
GET    /v1/leads/:id/timeline      → Histórico cronológico
POST   /v1/leads/:id/timeline      → Adiciona nota/log manual

# Tasks
GET    /v1/tasks?lead_id=&assigned_to=
POST   /v1/tasks
PATCH  /v1/tasks/:id
```

---

## Módulo 3: Motor de Automação + n8n

### Banco de Dados

```sql
-- Automations
id uuid PK
tenant_id uuid FK
name varchar NOT NULL
description text
trigger_type enum('stage_change','new_lead','inactivity','deal_won','deal_lost','webhook','manual')
trigger_config jsonb NOT NULL      -- {"from_stage_id": "...", "to_stage_id": "..."}
conditions jsonb DEFAULT '[]'      -- [{"field": "ai_score", "op": "eq", "value": "A"}]
actions jsonb NOT NULL             -- [{"type": "n8n_workflow", "workflow_id": "...", ...}]
is_active boolean DEFAULT true
execution_count integer DEFAULT 0
last_executed_at timestamp
created_by uuid FK(users)
created_at timestamp

-- Automation Executions (log de cada disparo)
id uuid PK
automation_id uuid FK
lead_id uuid FK
tenant_id uuid FK
status enum('queued','running','success','failed')
trigger_payload jsonb
result_payload jsonb
error_message text
started_at timestamp
finished_at timestamp
```

### Tipos de Ações Suportadas

```typescript
type ActionType =
  | 'n8n_workflow'      // Dispara workflow no n8n via webhook
  | 'send_email'        // Envia e-mail via n8n
  | 'create_task'       // Cria tarefa no CRM
  | 'assign_lead'       // Reatribui lead para usuário
  | 'change_stage'      // Move estágio automaticamente
  | 'ai_score'          // Recalcula score de IA
  | 'add_timeline_note' // Adiciona nota automática
  | 'webhook_outbound'  // Chama webhook externo (ERP, etc.)
```

### Integração n8n

A integração com n8n funciona via **webhooks bidirecionais**:

**CRM → n8n (trigger):**
```
POST https://n8n.sua-empresa.com/webhook/{workflow_id}
Headers: X-CRM-Tenant: {tenant_id}, X-CRM-Signature: HMAC-SHA256
Body: {
  "event": "stage_change",
  "lead": { ...dados completos do lead },
  "contact": { ...dados do contato },
  "from_stage": "Qualificação",
  "to_stage": "Proposta",
  "triggered_at": "ISO8601"
}
```

**n8n → CRM (callback):**
```
POST /v1/webhooks/n8n/callback
Headers: X-N8N-Signature: HMAC-SHA256
Body: {
  "execution_id": "...",
  "lead_id": "...",
  "actions": [
    { "type": "add_timeline_note", "content": "E-mail enviado via n8n" },
    { "type": "create_task", "title": "Follow-up em 3 dias" }
  ]
}
```

**Configuração n8n no tenant:**
```sql
-- Tenant Settings
n8n_base_url varchar          -- URL do n8n self-hosted
n8n_api_key varchar           -- API Key do n8n
n8n_webhook_secret varchar    -- HMAC secret para validar callbacks
```

### Endpoints Automação

```
GET    /v1/automations              → Lista automações do tenant
POST   /v1/automations              → Cria automação
PATCH  /v1/automations/:id
DELETE /v1/automations/:id
POST   /v1/automations/:id/toggle   → Ativa/desativa
GET    /v1/automations/:id/executions → Histórico de execuções
POST   /v1/automations/:id/test     → Testa com lead fictício

# Webhook público de entrada
POST   /v1/webhooks/leads           → Ingestão de leads externos (autenticado por api_key)
POST   /v1/webhooks/n8n/callback    → Recebe callbacks do n8n
```

---

## Módulo 4: Camada de IA (Claude)

### Sistema de Créditos

```typescript
// Custo em créditos por operação
const AI_CREDIT_COSTS = {
  lead_scoring: 1,
  timeline_summary: 2,
  next_best_action: 1,
  email_draft: 3,
  bulk_scoring: 0.5,  // desconto para batch
}
```

### 4.1 Lead Scoring Preditivo

**Trigger:** Na criação do lead (via webhook ou manual)  
**Implementação:**

```typescript
// Prompt para Claude
const scoringPrompt = `
Você é um especialista em vendas B2B. Analise os dados deste lead e atribua:
- Score: A (alta probabilidade >70%), B (média 40-70%), C (baixa 20-40%), D (<20%)
- Razão: 1-2 frases explicando o score

Dados do Lead:
${JSON.stringify(leadData)}

Histórico de conversão do tenant (últimos 90 dias):
${JSON.stringify(conversionStats)}

Responda em JSON: {"score": "A|B|C|D", "reason": "...", "confidence": 0-100}
`
```

### 4.2 Resumo de Timeline

**Trigger:** Sob demanda (botão "Preparar para reunião")  
**Implementação:**

```typescript
const summaryPrompt = `
Você é um assistente de vendas. Crie um resumo executivo em 3 parágrafos 
desta oportunidade para que o vendedor possa entrar em uma reunião bem preparado.

Inclua:
1. Contexto da oportunidade e histórico de contato
2. Últimas interações e estado atual da negociação  
3. Próximos passos recomendados

Timeline completa:
${JSON.stringify(timelineEvents)}
`
```

### 4.3 Next Best Action (NBA)

**Trigger:** Sob demanda ou após mudança de estágio  
**Implementação:**

```typescript
const nbaPrompt = `
Você é um coach de vendas B2B. Com base no estágio atual e histórico deste lead,
sugira a MELHOR PRÓXIMA AÇÃO para o vendedor aumentar a probabilidade de fechamento.

Retorne JSON:
{
  "action_type": "send_email|make_call|schedule_meeting|send_proposal|follow_up",
  "priority": "high|medium|low",
  "suggested_message": "Mensagem ou roteiro completo...",
  "reasoning": "Por que esta ação agora...",
  "best_time": "Quando fazer (ex: amanhã manhã, próxima segunda)"
}

Dados do Lead:
${JSON.stringify({ lead, stage, recentTimeline, daysSinceLastContact })}
`
```

### 4.4 Rascunho de E-mail com IA

**Trigger:** Sob demanda no compose de e-mail  
**Template:** Vendas, Follow-up, Proposta, Reativação

### Endpoints IA

```
POST /v1/ai/leads/:id/score          → (Re)calcula score do lead
POST /v1/ai/leads/:id/summary        → Gera resumo da timeline
POST /v1/ai/leads/:id/next-action    → Sugere próxima ação
POST /v1/ai/leads/:id/email-draft    → Gera rascunho de e-mail
GET  /v1/ai/credits                  → Saldo atual de créditos do tenant
GET  /v1/ai/usage                    → Histórico de uso de créditos
```

---

## Regras de Negócio Críticas

### Segurança e Isolamento
1. **Todo endpoint** deve validar `tenant_id` do JWT antes de qualquer query — NUNCA buscar dado sem filtro de tenant.
2. **API Key pública** (`/v1/webhooks/leads`) autentica apenas por `X-API-Key` header — sem acesso a outros endpoints.
3. **HMAC-SHA256** em todos os webhooks outbound e callbacks do n8n.
4. **Rate limiting** por tenant: 100 req/min na API REST, 10 req/min em endpoints de IA.

### Pipeline e Leads
5. Um lead **não pode ser deletado** — apenas soft-delete com `deleted_at`. Auditoria obrigatória.
6. **Mudança de estágio** sempre gera um evento na Timeline (tipo `stage_change`) com `from_stage` e `to_stage` no metadata.
7. Lead marcado como **"Fechado/Ganho"** deve disparar webhook outbound para ERP e **não pode voltar** para estágio de venda sem permissão `admin`.
8. **`last_activity_at`** do lead é atualizado automaticamente em toda inserção na timeline.
9. Estágio de pipeline **não pode ser deletado** se tiver leads ativos — deve mover leads primeiro.

### Automações
10. Automação só executa se o tenant tiver **créditos de IA suficientes** para as ações de IA configuradas.
11. **Idempotência**: o mesmo evento+lead não pode disparar a mesma automação duas vezes em menos de 60 segundos (usar Redis lock).
12. Falha em ação de automação **não bloqueia** as ações seguintes — registrar erro e continuar.

### Créditos de IA
13. **Verificar saldo** ANTES de chamar a API da IA. Retornar erro `402 Payment Required` se sem créditos.
14. **Decrementar créditos de forma atômica** (transação no banco) ao confirmar uso.
15. Reset automático de créditos no primeiro dia de cada mês (job agendado).
16. **Admin** recebe notificação quando uso atinge 80% e 100% do limite mensal.

### n8n
17. Timeout de 30s para callbacks do n8n. Se não responder, registrar como `failed` e não reprocessar automaticamente.
18. Validar **HMAC-SHA256** em todo callback recebido do n8n antes de processar.

---

## Sistema de Auditoria e Logs

### Audit Log (tabela)
```sql
id uuid PK
tenant_id uuid FK
user_id uuid FK nullable       -- null se ação de sistema
action varchar NOT NULL        -- 'lead.created', 'lead.deleted', 'deal.stage_changed', etc.
entity_type varchar            -- 'lead', 'deal', 'user', etc.
entity_id uuid
old_value jsonb                -- snapshot antes
new_value jsonb                -- snapshot depois
ip_address varchar
user_agent varchar
created_at timestamp           -- INDEX
```

### Eventos que OBRIGATORIAMENTE geram audit log:
- Criação/exclusão de qualquer entidade
- Mudança de estágio de lead
- Alteração de valor estimado de deal
- Alteração de owner do lead
- Uso de crédito de IA
- Login / logout
- Criação/edição de automação
- Execução de automação

---

## Fluxo Completo: Lead Entrada → Conversão

```
[Fonte Externa: Formulário/Landing Page]
         │
         ▼
POST /v1/webhooks/leads (X-API-Key: tenant_key)
         │
         ├─► Validar API Key → Identificar Tenant
         ├─► Higienizar e validar dados (Zod)
         ├─► Criar Lead no banco (stage = primeiro estágio do funil)
         ├─► Registrar na Timeline (tipo: 'webhook', source: utm_data)
         └─► Publicar evento na FILA (BullMQ): "lead.created"
                    │
         ┌──────────┴──────────────────────────┐
         │                                     │
         ▼                                     ▼
  [Worker: AI Scoring]              [Worker: Automation Engine]
  → Chamar Claude API               → Buscar automações ativas
  → Receber Score (A/B/C/D)           com trigger "new_lead"
  → Atualizar lead.ai_score         → Avaliar conditions
  → Registrar na Timeline           → Executar ações configuradas
  → Decrementar crédito IA          → Se ação = n8n_workflow:
                                       POST webhook n8n
                                    → Registrar execução
                    │
                    ▼
         [Lead aparece no Pipeline Board]
                    │
         [Vendedor acessa o lead]
                    │
                    ├─► Botão "Próxima Ação (IA)" 
                    │   POST /v1/ai/leads/:id/next-action
                    │   → Retorna sugestão em <1s (cache 1h)
                    │
                    ├─► Vendedor move de estágio (drag-and-drop)
                    │   PATCH /v1/leads/:id/stage
                    │   → Timeline atualizada (stage_change)
                    │   → Automações de stage_change disparadas
                    │   → n8n notificado se configurado
                    │
                    ├─► Vendedor clica "Preparar Reunião"
                    │   POST /v1/ai/leads/:id/summary
                    │   → Resumo executivo gerado por Claude
                    │
                    └─► Deal fechado como "Ganho"
                        PATCH /v1/leads/:id/stage (is_closed_won=true)
                        → Webhook outbound para ERP
                        → Notificação Slack via n8n
                        → Audit log registrado
```

---

## UI/UX — Páginas e Componentes

### Paleta e Design System
- **Primary:** Indigo-600 (#4F46E5)
- **Success:** Emerald-500
- **Warning:** Amber-500  
- **Danger:** Red-500
- **Background:** Gray-950 (dark mode) / White (light)
- Suporte a **dark/light mode** obrigatório
- Animações com **Framer Motion** (drag-and-drop suave no pipeline)

### Páginas Obrigatórias

#### `/login` e `/register`
- Formulários clean com validação inline
- Register cria tenant + admin em uma etapa

#### `/pipeline` (Dashboard principal)
- Board Kanban com colunas por estágio
- Drag-and-drop de leads entre colunas
- Card do lead mostra: Nome, Valor, Score (badge colorido A/B/C/D), Último contato, Avatar do responsável
- Filtros: por responsável, por score, por período
- Botão "+ Novo Lead" abre sidebar/modal
- Contador de leads e valor total por coluna

#### `/leads/:id` (Detalhe do Lead)
- Layout em duas colunas:
  - **Esquerda:** Dados do lead, contato, empresa, score IA com justificativa
  - **Direita:** Timeline cronológica + composer para novas notas
- Barra de ações IA flutuante:
  - "Sugerir Próxima Ação" → Modal com sugestão da IA
  - "Preparar para Reunião" → Modal com resumo executivo
  - "Rascunhar E-mail" → Modal com template editável
- Indicador visual de créditos de IA consumidos

#### `/automations`
- Lista de automações com status (ativo/inativo), último disparo, taxa de sucesso
- Builder visual de automações:
  - Seletor de Trigger (dropdown)
  - Editor de Conditions (if/then visual)
  - Lista de Actions ordenada (drag para reordenar)
  - Para ação n8n: seletor do workflow via API n8n

#### `/settings`
- Abas: Equipe, Pipeline, Integrações (n8n config), IA & Créditos, Webhooks
- Página de Créditos IA mostra: gauge de uso, histórico, limite mensal

#### `/analytics`
- Métricas: Taxa de conversão por estágio, Tempo médio no funil, Score IA vs Conversão real, Top performers

---

## Configuração Docker

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: commercialpipe
      POSTGRES_USER: pipe
      POSTGRES_PASSWORD: pipe123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=admin123
      - WEBHOOK_URL=http://localhost:5678
    volumes:
      - n8n_data:/home/node/.n8n

  api:
    build: ./apps/api
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://pipe:pipe123@postgres:5432/commercialpipe
      REDIS_URL: redis://redis:6379
      JWT_SECRET: change-me-in-production
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    depends_on:
      - postgres
      - redis

  web:
    build: ./apps/web
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001
    depends_on:
      - api

volumes:
  postgres_data:
  n8n_data:
```

---

## Variáveis de Ambiente

```env
# apps/api/.env
DATABASE_URL=postgresql://pipe:pipe123@localhost:5432/commercialpipe
REDIS_URL=redis://localhost:6379
JWT_SECRET=super-secret-jwt-key
JWT_REFRESH_SECRET=super-secret-refresh-key
ANTHROPIC_API_KEY=sk-ant-...
ENCRYPTION_KEY=32-char-hex-key-for-sensitive-data

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Ordem de Implementação

Implemente nesta ordem exata para ter algo funcional o mais rápido possível:

1. **Setup do monorepo** (Turborepo + packages)
2. **docker-compose.yml** funcional com todos os serviços
3. **Schema do banco** (Drizzle migrations)
4. **Backend: Auth** (register, login, refresh, me)
5. **Backend: Tenants + RBAC middleware**
6. **Backend: Pipeline stages CRUD**
7. **Backend: Leads CRUD** + timeline events
8. **Backend: Webhook de ingestão** (`/v1/webhooks/leads`)
9. **Backend: BullMQ workers** (AI scoring queue)
10. **Backend: Camada de IA** (scoring + summary + NBA)
11. **Backend: Motor de Automações** + integração n8n
12. **Frontend: Auth pages** (login/register)
13. **Frontend: Pipeline Kanban** (drag-and-drop)
14. **Frontend: Lead Detail** com timeline
15. **Frontend: AI Action Bar**
16. **Frontend: Automations Builder**
17. **Frontend: Settings** (n8n config, créditos)
18. **Testes** críticos (auth, webhook, AI credits)

---

## Restrições e Qualidade

- **Sem `any` no TypeScript** — tipos explícitos em tudo
- **Sem comentários desnecessários** — código autoexplicativo
- **Sem TODOs** — implemente completo ou não mencione
- Toda resposta de API deve seguir o padrão:
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "total": 100 }  // quando paginado
}
```
- Erros seguem o padrão:
```json
{
  "success": false,
  "error": {
    "code": "LEAD_NOT_FOUND",
    "message": "Lead não encontrado",
    "details": []
  }
}
```
- **Todos os endpoints paginados** com `?page=1&limit=20`
- Logs estruturados (JSON) em produção

---

Comece pelo setup do monorepo e docker-compose, confirme que os serviços sobem corretamente, depois siga a ordem de implementação. A cada módulo concluído, confirme que está funcional antes de avançar.
