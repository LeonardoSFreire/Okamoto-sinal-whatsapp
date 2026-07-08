# Instalacao

## 1. Pre-requisitos

- Node.js 24
- pnpm
- Postgres
- opcionalmente uma conta UAZAPI ja conectada ao WhatsApp

## 2. Ambiente

```bash
pnpm install
cp .env.example .env
set -a && source .env && set +a
```

Preencha principalmente:

- `DATABASE_URL`
- `PORT`
- `BASE_PATH`
- `PUBLIC_BASE_URL`
- `WHATSAPP_OWNER`
- `AUTH_DISABLED=1`
- `UAZAPI_BASE_URL`
- `UAZAPI_INSTANCE_TOKEN`
- `UAZAPI_WEBHOOK_SECRET`

## 3. Banco

Rode as migrations:

```bash
pnpm --filter @workspace/scripts run migrate
```

Isso cria:

- `whatsapp_messages`
- `webhook_events`
- `app_settings`
- tabelas antigas do app

## 4. Rodando localmente

```bash
# API
PORT=8080 pnpm --filter @workspace/api-server run dev

# frontend
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/sinal-web run dev
```

Abra `http://localhost:5173`.

## 5. Webhook da UAZAPI

Endpoint da app:

```text
POST /api/webhooks/uazapi
```

Se `UAZAPI_WEBHOOK_SECRET` estiver definido, use:

```text
https://seu-dominio/api/webhooks/uazapi?secret=SEU_SEGREDO
```

Configuracao recomendada:

```json
{
  "url": "https://seu-dominio/api/webhooks/uazapi?secret=SEU_SEGREDO",
  "events": ["messages"],
  "excludeMessages": ["wasSentByApi"]
}
```

Script para configurar automaticamente:

```bash
pnpm --filter @workspace/scripts run configure-uazapi-webhook
```

## 6. Easypanel

Use o modo **Dockerfile**.

### Build command

Deixe vazio.

### Start command

Deixe vazio.

### Variaveis

Configure no Easypanel o mesmo conjunto do `.env.example`.

### Healthcheck

Use:

```text
/api/healthz
```

### Porta

Use `8080`.

### Setup/status

Use:

```text
/api/setup/status
```

Essa rota mostra se banco, owner, segredo do webhook e UAZAPI estao
configurados, e devolve a URL recomendada do webhook.
