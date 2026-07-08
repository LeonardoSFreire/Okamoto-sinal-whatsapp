-- Source message table now owned by the app for single-user Easypanel mode.
create table if not exists whatsapp_messages (
  id bigint generated always as identity primary key,
  whatsapp_owner text not null,
  chat_type text not null,
  chat_id text not null,
  chat_name text,
  contact_phone text,
  sender_phone text,
  sender_name text,
  recipient_phone text,
  direction text,
  message_type text,
  message text,
  caption text,
  media_url text,
  media_mime_type text,
  transcription text,
  message_id text not null unique,
  reply_to_message_id text,
  forwarded boolean not null default false,
  reaction text,
  reacted_to_message_id text,
  status text,
  message_created_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whatsapp_messages_owner_created_idx
  on whatsapp_messages (whatsapp_owner, message_created_at desc);

create index if not exists whatsapp_messages_chat_created_idx
  on whatsapp_messages (chat_id, message_created_at desc);

create index if not exists whatsapp_messages_direction_created_idx
  on whatsapp_messages (direction, message_created_at desc);

create index if not exists whatsapp_messages_type_idx
  on whatsapp_messages (message_type);

create table if not exists webhook_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  event text not null,
  instance text,
  external_id text,
  payload jsonb not null,
  status text not null default 'received',
  error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists webhook_events_source_created_idx
  on webhook_events (source, created_at desc);

create index if not exists webhook_events_status_created_idx
  on webhook_events (status, created_at desc);

create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
