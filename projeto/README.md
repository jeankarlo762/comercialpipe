# CRM NX — CRM Comercial B2B com IA e n8n

Monorepo (Turborepo) de um CRM comercial B2B multi-tenant com pipeline Kanban,
scoring preditivo por IA (Claude), motor de automações e integração bidirecional com n8n.

> **Status:** Backend (Módulos 1–4 + automações + workers) **completo e funcional**.
> Frontend Next.js 14 **completo** (auth, Kanban drag-and-drop, lead detail + ações de IA,
> automações, settings, analytics). Testes automatizados são a próxima fase.

## Stack

- **Backend:** Node.js 22 + TypeScript + Fastify 5
- **Banco:** PostgreSQL + Drizzle ORM
- **Cache/Filas:** Redis + BullMQ
- **Auth:** JWT (access 15min) + Refresh Token opaco (httpOnly cookie, 7d) + Argon2id
- **IA:** SDK Anthropic — `claude-sonnet-4-6`
- **Automação:** n8n via webhooks HMAC-SHA256 bidirecionais

## Estrutura

```
comercialpipe/
├── apps/api/              # Backend Fastify (este entregável)
│   └── src/
│       ├── modules/       # auth, tenants, users, pipeline, accounts, contacts,
│       │                  # leads, timeline, tasks, ai, automations, webhooks, analytics
│       ├── shared/        # database, redis, queue (+workers), security, http, audit, middleware
│       ├── config/        # env (validado por Zod)
│       ├── app.ts         # montagem do Fastify + rotas /v1
│       └── server.ts      # bootstrap HTTP (+ workers inline em dev)
├── packages/shared-types/ # enums, RBAC, DTOs Zod compartilhados (API + Web)
├── docker-compose.yml     # postgres, redis, n8n, api, web
└── turbo.json
```

## Pré-requisitos

- Node.js >= 20
- PostgreSQL e Redis. **Docker não é obrigatório** — aponte para serviços em nuvem
  (Neon/Supabase + Upstash, etc.) via variáveis de ambiente.

## Configuração

```bash
cp .env.example apps/api/.env
# Edite apps/api/.env com:
#   DATABASE_URL  -> seu Postgres (cloud ou local)
#   REDIS_URL     -> seu Redis (cloud ou local)
#   ENCRYPTION_KEY-> 64 caracteres hex (32 bytes). Gere com:
#                    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
#   ANTHROPIC_API_KEY -> sua chave Claude
```

## Instalação e execução

```bash
npm install                                   # instala todo o workspace
npm run build --workspace=@CRM NX/shared-types

# Migrar o banco
npm run db:migrate --workspace=@CRM NX/api   # aplica drizzle/0000_init.sql
npm run db:seed    --workspace=@CRM NX/api   # tenant demo: admin@acme.com / changeme123 (slug acme)

# Subir a API (em dev os workers BullMQ rodam no mesmo processo)
npm run dev --workspace=@CRM NX/api          # http://localhost:3001/health

# Em produção, rode os workers separados:
npm run worker --workspace=@CRM NX/api

# Frontend (Next.js) — em outro terminal
npm run dev --workspace=@CRM NX/web          # http://localhost:3000
```

O frontend lê `NEXT_PUBLIC_API_URL` (padrão `http://localhost:3001`). Faça login com o
tenant de seed (`admin@acme.com` / `changeme123`, workspace `acme`).

Com Docker disponível: `docker compose up` sobe postgres + redis + n8n + api + web.

## Padrão de resposta da API

```jsonc
// sucesso
{ "success": true, "data": { /* ... */ }, "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 } }
// erro
{ "success": false, "error": { "code": "LEAD_NOT_FOUND", "message": "Lead não encontrado", "details": [] } }
```

## Endpoints principais (prefixo `/v1`)

| Área | Rotas |
|---|---|
| Auth | `POST /auth/register \| /login \| /refresh \| /logout \| /forgot-password \| /reset-password`, `GET /auth/me` |
| Users | `GET/POST /users`, `PATCH /users/:id` (admin) |
| Tenant | `GET /tenants/current`, `PATCH /tenants/current/integrations/n8n` |
| Pipeline | `GET /pipeline` (board), `GET/POST /pipeline/stages`, `PATCH /pipeline/stages/:id`, `PATCH /pipeline/stages/reorder`, `DELETE /pipeline/stages/:id` |
| Leads | `GET/POST /leads`, `GET/PATCH/DELETE /leads/:id`, `PATCH /leads/:id/stage`, `GET/POST /leads/:id/timeline` |
| Accounts/Contacts | `GET/POST /accounts`, `PATCH /accounts/:id`, `GET/POST /contacts`, `PATCH /contacts/:id` |
| Tasks | `GET/POST /tasks`, `PATCH /tasks/:id` |
| IA | `POST /ai/leads/:id/score \| /summary \| /next-action \| /email-draft`, `GET /ai/credits \| /usage` |
| Automações | `GET/POST /automations`, `PATCH/DELETE /automations/:id`, `POST /automations/:id/toggle \| /test`, `GET /automations/:id/executions`, `GET /automations/n8n/workflows` |
| Webhooks | `POST /webhooks/leads` (X-API-Key), `POST /webhooks/n8n/callback` (HMAC) |
| Analytics | `GET /analytics/overview` |

## Regras de negócio implementadas

Isolamento por `tenant_id` em toda query · RBAC por papel (admin/manager/closer/sdr) ·
API Key pública para ingestão · HMAC-SHA256 nos webhooks · rate-limit (100/min API, 10/min IA) ·
soft-delete auditado de leads · evento de timeline em toda mudança de estágio · `last_activity_at`
automático · estágio não removível com leads ativos · negócio ganho não reabre sem admin ·
idempotência de automação via lock Redis (60s) · isolamento de falha entre ações ·
verificação + débito atômico de créditos de IA (402 quando esgotado) · reset mensal de créditos ·
notificação em 80%/100% de uso · timeout de 30s nos callbacks n8n · audit log completo.
