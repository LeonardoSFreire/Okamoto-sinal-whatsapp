# Design: UAZAPI Webhook + Postgres Single-User

## Objetivo

Refatorar o projeto Sinal para uma primeira versao single-user, sem autenticacao obrigatoria, com ingestao de mensagens do WhatsApp via webhook da UAZAPI e persistencia em Postgres hospedado no Easypanel. O frontend atual deve ser preservado o maximo possivel para validacao online inicial.

## Escopo da v1

- Remover a dependencia operacional de Supabase Auth.
- Manter Express como backend principal.
- Usar Postgres do Easypanel como banco principal.
- Criar um endpoint publico de webhook para UAZAPI.
- Persistir eventos `messages` da UAZAPI em `whatsapp_messages`.
- Manter o frontend atual funcional sem exigir login.
- Preparar o repositorio para deploy no Easypanel.

## Fora de escopo nesta v1

- Sincronizacao retroativa de historico pela UAZAPI.
- Multiusuario.
- Sistema completo de autenticacao.
- Reescrita grande do frontend.
- Reativacao total do pipeline de IA.

## Arquitetura

Fluxo principal:

`UAZAPI -> POST /api/webhooks/uazapi -> normalizacao -> tabela whatsapp_messages -> API Express -> frontend atual`

Fluxo operacional:

- O backend sobe com uma `DATABASE_URL` apontando para o Postgres do Easypanel.
- O webhook da UAZAPI envia eventos `messages` para uma rota publica.
- O backend valida a requisicao e grava a mensagem em `whatsapp_messages`.
- As rotas existentes continuam lendo do banco.
- O frontend deixa de depender de sessao autenticada para carregar.

## Banco de dados

### Tabela principal: `whatsapp_messages`

Esta tabela passa a ser criada e mantida pelo proprio projeto. Ela deixa de ser uma tabela "externa" do Supabase e passa a ser a fonte primaria local do sistema.

Campos previstos:

- `id bigint generated always as identity primary key`
- `whatsapp_owner text not null`
- `chat_type text not null`
- `chat_id text not null`
- `chat_name text`
- `contact_phone text`
- `sender_phone text`
- `sender_name text`
- `recipient_phone text`
- `direction text`
- `message_type text`
- `message text`
- `caption text`
- `media_url text`
- `media_mime_type text`
- `transcription text`
- `message_id text not null unique`
- `reply_to_message_id text`
- `forwarded boolean default false`
- `reaction text`
- `reacted_to_message_id text`
- `status text`
- `message_created_at timestamptz not null`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indices iniciais:

- `unique(message_id)`
- `index(whatsapp_owner, message_created_at desc)`
- `index(chat_id, message_created_at desc)`
- `index(direction, message_created_at desc)`
- `index(message_type)`

### Tabelas auxiliares da v1

- `webhook_events`
  - guarda payload bruto, tipo do evento, hash/idempotencia, status de processamento e erro
  - util para auditoria e debug
- `app_settings`
  - configuracoes simples single-user, como `whatsapp_owner`, nome da instancia e flags locais

### Compatibilidade com o restante do projeto

As tabelas derivadas do projeto atual podem continuar existindo. Na v1 elas nao sao o foco, mas nao devem ser removidas sem necessidade para evitar quebrar consultas do frontend. Quando alguma rota depender de tabelas ainda vazias, ela deve responder com arrays vazios ou metricas zeradas em vez de erro.

## Webhook UAZAPI

### Endpoint

- `POST /api/webhooks/uazapi`

### Seguranca

- Sem login.
- Validacao por segredo proprio via header configuravel, por exemplo:
  - `x-webhook-secret: <UAZAPI_WEBHOOK_SECRET>`
- O token da instancia da UAZAPI continua sendo usado nas chamadas de configuracao/consulta da API UAZAPI, nao como autenticacao do webhook de entrada.

### Eventos suportados na v1

- `messages`

Eventos nao suportados inicialmente:

- `messages_update`
- `groups`
- `contacts`
- `presence`
- `history`

Eles podem ser aceitos e registrados em `webhook_events`, mas nao precisam alterar o dominio principal na v1.

### Comportamento

- Responder rapido com `200` apos validacao e persistencia basica.
- Salvar o payload bruto em `webhook_events`.
- Normalizar o evento para o schema de `whatsapp_messages`.
- Fazer upsert por `message_id` para evitar duplicacoes.
- Logar payload invalido sem derrubar o servidor.

## Mapeamento UAZAPI -> `whatsapp_messages`

O payload da UAZAPI varia por evento, entao a normalizacao deve ser isolada em uma funcao dedicada. O mapeamento alvo da v1 e:

- `whatsapp_owner`: valor configurado em ambiente
- `chat_type`: `group` quando o chat for grupo; caso contrario `private`
- `chat_id`: id do chat vindo do webhook
- `chat_name`: nome consolidado do chat ou contato, quando presente
- `contact_phone`: telefone do contato quando aplicavel
- `sender_phone`: telefone do autor da mensagem
- `sender_name`: nome do autor
- `recipient_phone`: telefone do destino, quando inferivel
- `direction`: `inbound` para mensagens recebidas e `outbound` para enviadas pela propria instancia
- `message_type`: texto, imagem, video, audio, documento, sticker, reacao etc
- `message`: corpo textual principal
- `caption`: legenda de midia
- `media_url`: URL da midia quando existir
- `media_mime_type`: mime type quando existir
- `transcription`: nulo nesta v1
- `message_id`: id unico da mensagem vindo da UAZAPI
- `reply_to_message_id`: id da mensagem respondida, quando existir
- `forwarded`: flag de encaminhamento
- `reaction`: emoji/reacao, quando for o caso
- `reacted_to_message_id`: alvo da reacao
- `status`: status informado pela UAZAPI, quando existir
- `message_created_at`: timestamp da mensagem convertido para timestamptz
- `metadata`: payload bruto normalizado com campos adicionais

## Backend

### Mudancas principais

- substituir conexao obrigatoria com Supabase por conexao unica `DATABASE_URL`
- manter Drizzle/pg quando for util
- adicionar modulo de webhook UAZAPI
- adicionar modulo de normalizacao de mensagens
- remover gate obrigatorio de auth nas rotas do app para modo single-user

### Rotas novas

- `POST /api/webhooks/uazapi`
- `GET /api/healthz`
- `GET /api/setup/status`
  - informa se banco, webhook secret e owner estao configurados

### Rotas existentes

- continuam, mas sem exigir sessao
- quando faltarem dados derivados, responder vazio/zero sem erro fatal

## Frontend

### Ajustes minimos

- remover o bloqueio de login do `AuthGate`
- permitir carregar paginas sem sessao
- se uma rota de backend devolver vazio por ausencia de enriquecimento, a UI deve continuar estavel

## Deploy no Easypanel

O repositorio precisa sair preparado para:

- build do backend
- build do frontend
- start unico do servico web
- variaveis de ambiente documentadas
- webhook publico configuravel

Variaveis previstas:

- `DATABASE_URL`
- `PORT`
- `BASE_PATH`
- `WHATSAPP_OWNER`
- `UAZAPI_BASE_URL`
- `UAZAPI_INSTANCE_TOKEN`
- `UAZAPI_WEBHOOK_SECRET`
- `NODE_ENV`

## Tratamento de erros

- rejeitar webhook sem segredo valido com `401`
- rejeitar payload estruturalmente invalido com `400`
- registrar falhas de normalizacao em `webhook_events.error`
- nao derrubar o processo por mensagem malformada isolada

## Testes

Minimo da v1:

- teste de normalizacao de payload `messages`
- teste do endpoint `/api/webhooks/uazapi`
- teste de idempotencia por `message_id`
- teste de leitura basica de mensagens pelas rotas existentes

## Riscos e decisoes

- O frontend atual foi desenhado esperando mais dados derivados do que a v1 vai popular.
  - Decisao: preservar telas e tolerar estados vazios.
- O payload real da UAZAPI pode variar do exemplo da spec.
  - Decisao: salvar payload bruto e implementar normalizacao defensiva.
- Alguns componentes atuais ainda carregam suposicoes de auth/multi-tenant.
  - Decisao: simplificar primeiro e limpar em iteracoes seguintes.

## Entregaveis da implementacao

- backend sem auth obrigatoria
- migracao SQL para criar `whatsapp_messages` e tabelas auxiliares
- endpoint publico de webhook UAZAPI
- normalizador de eventos `messages`
- `.env.example` atualizado
- projeto pronto para deploy no Easypanel
