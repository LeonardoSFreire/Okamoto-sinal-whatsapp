# UAZAPI Single-User Easypanel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refatorar o Sinal para rodar como app single-user no Easypanel usando Postgres, sem auth obrigatoria, e recebendo mensagens da UAZAPI via webhook.

**Architecture:** O backend Express continua como ponto central, mas passa a operar com `DATABASE_URL` plain Postgres e um contexto de usuario local. O webhook da UAZAPI persiste mensagens na tabela `whatsapp_messages`, preservando o contrato de leitura esperado pelo frontend atual.

**Tech Stack:** Node.js 24, TypeScript, Express 5, pg, Drizzle ORM, React, Vite, Postgres

## Global Constraints

- Preservar o frontend atual o maximo possivel.
- Nao exigir login para validacao inicial.
- Preparar o repositorio para deploy no Easypanel.
- Receber apenas eventos `messages` da UAZAPI na v1.
- Responder com estados vazios em vez de erro quando faltarem dados derivados.

---

### Task 1: Plain Postgres Foundation

**Files:**
- Modify: `lib/db/migrations/0001_init.sql`
- Create: `lib/db/migrations/0010_single_user_ingestion.sql`
- Modify: `scripts/src/migrate.ts`
- Modify: `lib/db/src/schema/whatsapp.ts`
- Modify: `lib/db/src/schema/index.ts`

**Interfaces:**
- Produces: `whatsapp_messages`, `webhook_events`, `app_settings`
- Produces: migration runner que ignora arquivos `._*.sql`

### Task 2: Single-User Auth Bypass

**Files:**
- Modify: `artifacts/api-server/src/lib/auth.ts`
- Modify: `artifacts/api-server/src/lib/scope.ts`
- Modify: `artifacts/api-server/src/routes/auth.ts`
- Modify: `artifacts/sinal-web/src/App.tsx`

**Interfaces:**
- Produces: `requireAuth()` que injeta contexto local quando auth estiver desabilitada
- Produces: `GET /api/auth/me` retornando usuario local

### Task 3: UAZAPI Webhook Ingestion

**Files:**
- Create: `artifacts/api-server/src/lib/uazapi.ts`
- Create: `artifacts/api-server/src/routes/webhooks.ts`
- Modify: `artifacts/api-server/src/routes/index.ts`
- Create: `artifacts/api-server/src/routes/webhooks.test.ts`

**Interfaces:**
- Produces: `POST /api/webhooks/uazapi`
- Produces: `normalizeUazapiWebhookEvent(input): NormalizedWhatsappMessage | null`

### Task 4: Runtime Setup and Deploy Readiness

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/INSTALACAO.md`
- Modify: `artifacts/api-server/src/routes/health.ts`
- Create: `artifacts/api-server/src/routes/setup.ts`
- Modify: `pnpm-workspace.yaml`

**Interfaces:**
- Produces: `GET /api/setup/status`
- Produces: env vars documentadas para Easypanel

### Task 5: Verification

**Files:**
- Modify only as needed based on failing checks

**Interfaces:**
- Produces: typecheck passando
- Produces: backend build passando
- Produces: frontend build passando
