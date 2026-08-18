-- MAXAGIST: заявки с формы-анкеты (лиды). PII — доступ только через service role.
create table if not exists public.leads (
  id           bigint generated always as identity primary key,
  received_at  timestamptz not null default now(),
  name         text,
  phone        text,
  email        text,  -- legacy: форма больше не собирает email (оставлено для исторических записей)
  message      text,
  source       text,
  path         text,
  referrer     text,
  utm          jsonb not null default '{}'::jsonb,
  country      text,
  visitor_id   text,
  session_id   text,
  user_agent   text
);
create index if not exists leads_received_idx on public.leads (received_at desc);
alter table public.leads enable row level security;
-- Политик нет: анонимно ни писать, ни читать нельзя.
-- Пишет Edge Function `track` (service role), читает `admin-api` (service role)
-- после Telegram-авторизации из allowlist app_admins.
