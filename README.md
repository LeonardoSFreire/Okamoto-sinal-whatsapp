# Sinal

**Inteligencia de WhatsApp + CRM em modo single-user.** Esta versao do Sinal foi
adaptada para rodar com **Express + Postgres** e receber mensagens da
**UAZAPI** via webhook, preservando o frontend atual para validacao rapida.

## O que esta nesta v1

- App **single-user**
- **Sem login obrigatorio**
- **Postgres** como banco principal
- **Webhook UAZAPI** para popular `whatsapp_messages`
- Frontend atual preservado o maximo possivel
- Projeto preparado para deploy no **Easypanel**

## Arquitetura

```text
UAZAPI -> /api/webhooks/uazapi -> Postgres (whatsapp_messages) -> API Express -> frontend React
```

O contrato principal permanece o mesmo: o frontend le a tabela
`whatsapp_messages` por meio da API atual. O webhook e quem passa a alimentar
essa tabela.

## Início rapido local

Voce precisa de:

- Node.js 24
- pnpm
- um Postgres acessivel

```bash
pnpm install
cp .env.example .env
set -a && source .env && set +a

pnpm --filter @workspace/scripts run migrate

# terminal 1
PORT=8080 pnpm --filter @workspace/api-server run dev

# terminal 2
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/sinal-web run dev
```

Abra `http://localhost:5173`.

## Easypanel

Para subir no Easypanel:

1. Configure as variaveis do `.env.example`
2. Rode as migrations no Postgres
3. Build command:

```bash
pnpm install && pnpm run build
```

4. Start command:

```bash
pnpm start
```

5. Exponha o dominio publico e preencha `PUBLIC_BASE_URL`

## Banco

As migrations agora criam:

- `whatsapp_messages`
- `webhook_events`
- `app_settings`
- tabelas antigas do app (CRM, topics, mentions, tasks etc.)

## Webhook UAZAPI

Endpoint da aplicacao:

```text
POST /api/webhooks/uazapi
```

Como a UAZAPI nao permite configurar header customizado nesse webhook, a
protecao e feita por query string quando `UAZAPI_WEBHOOK_SECRET` estiver
definido:

```text
https://seu-dominio/api/webhooks/uazapi?secret=SEU_SEGREDO
```

Configuracao recomendada na UAZAPI:

- `events: ["messages"]`
- `excludeMessages: ["wasSentByApi"]`

Script auxiliar para configurar o webhook na UAZAPI:

```bash
pnpm --filter @workspace/scripts run configure-uazapi-webhook
```

## SQL / migrations

Se preferir rodar tudo pela aplicacao:

```bash
pnpm --filter @workspace/scripts run migrate
```

No final da entrega eu tambem te passo o SQL principal para rodar direto no
banco.

## Documentacao

- [docs/INSTALACAO.md](docs/INSTALACAO.md)
- [docs/ARQUITETURA.md](docs/ARQUITETURA.md)
- [docs/SUPABASE.md](docs/SUPABASE.md)

## Licenca

[MIT](LICENSE)
