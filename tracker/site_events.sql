-- Хранилище событий трекера MAXAGIST.
-- Применить в Supabase: SQL Editor → выполнить, либо как миграцию.
-- Данные пишет только Edge Function `track` (service role, в обход RLS).
-- Анонимный/публичный доступ к таблице закрыт.

create table if not exists public.site_events (
  id           bigint generated always as identity primary key,
  received_at  timestamptz not null default now(),  -- время приёма на сервере
  client_ts    timestamptz,                          -- время события в браузере

  site         text,
  visitor_id   text,   -- анонимный стабильный id (новый vs вернувшийся)
  session_id   text,   -- сессия (обновляется после 30 мин паузы)
  view_id      text,   -- один просмотр страницы

  event_type   text,   -- pageview | click | outbound | scroll | section | form_submit | heartbeat | pageend
  path         text,   -- какая страница
  title        text,
  referrer     text,   -- откуда пришёл
  utm          jsonb default '{}'::jsonb,
  lang         text,
  country      text,   -- из заголовка CF-IPCountry, если есть
  is_mobile    boolean,
  new_visitor  boolean,
  viewport     text,
  screen       text,
  timezone     text,

  -- поля конкретных событий
  label        text,   -- ЧТО нажали (напр. whatsapp:hero, booking:altegio, lang:en)
  href         text,   -- КУДА ведёт ссылка
  section      text,   -- какая секция попала в поле зрения
  depth        int,    -- глубина скролла, %
  active_ms    int,    -- активное время на странице
  total_ms     int,    -- общее время на странице
  form         text,
  extra        jsonb default '{}'::jsonb
);

create index if not exists site_events_received_idx on public.site_events (received_at desc);
create index if not exists site_events_session_idx  on public.site_events (session_id);
create index if not exists site_events_type_idx     on public.site_events (event_type);
create index if not exists site_events_path_idx      on public.site_events (path);
create index if not exists site_events_label_idx     on public.site_events (label);

-- RLS включён, политик нет → напрямую (anon/authenticated) писать/читать нельзя.
-- Edge Function ходит с service role и RLS обходит.
alter table public.site_events enable row level security;
