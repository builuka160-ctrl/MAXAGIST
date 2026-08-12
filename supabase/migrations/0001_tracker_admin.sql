-- MAXAGIST: трекер активности + редактируемый контент + allowlist админов.

-- ─────────────────────────────────────────────────────────────
-- 1. События трекера
-- ─────────────────────────────────────────────────────────────
create table if not exists public.site_events (
  id           bigint generated always as identity primary key,
  received_at  timestamptz not null default now(),
  client_ts    timestamptz,
  site         text,
  visitor_id   text,
  session_id   text,
  view_id      text,
  event_type   text,
  path         text,
  title        text,
  referrer     text,
  utm          jsonb default '{}'::jsonb,
  lang         text,
  country      text,
  is_mobile    boolean,
  new_visitor  boolean,
  viewport     text,
  screen       text,
  timezone     text,
  label        text,
  href         text,
  section      text,
  depth        int,
  active_ms    int,
  total_ms     int,
  form         text,
  extra        jsonb default '{}'::jsonb
);
create index if not exists site_events_received_idx on public.site_events (received_at desc);
create index if not exists site_events_session_idx  on public.site_events (session_id);
create index if not exists site_events_type_idx     on public.site_events (event_type);
create index if not exists site_events_path_idx      on public.site_events (path);
create index if not exists site_events_label_idx     on public.site_events (label);
alter table public.site_events enable row level security;
-- Политик нет: писать/читать напрямую нельзя. Пишет только Edge Function (service role).

-- ─────────────────────────────────────────────────────────────
-- 2. Редактируемый контент сайта (мини-CMS)
--    value = { "ru": "...", "lv": "...", "en": "..." }
-- ─────────────────────────────────────────────────────────────
create table if not exists public.site_content (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  bigint
);
alter table public.site_content enable row level security;
-- Контент публичный на чтение (сайт тянет его анонимно), запись — только через admin-api.
drop policy if exists site_content_public_read on public.site_content;
create policy site_content_public_read on public.site_content for select to anon, authenticated using (true);

-- ─────────────────────────────────────────────────────────────
-- 3. Allowlist: кто имеет доступ к мини-аппу
--    role: 'admin' (дашборд + редактор), 'viewer' (только дашборд)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.app_admins (
  tg_id       bigint primary key,
  role        text not null default 'viewer',
  name        text,
  added_at    timestamptz not null default now()
);
alter table public.app_admins enable row level security; -- доступ только через service role

insert into public.app_admins (tg_id, role, name) values
  (1905037380, 'admin',  'Лука (owner)'),
  (266729271,  'viewer', 'Miro (client)')
on conflict (tg_id) do update set role = excluded.role, name = excluded.name;

-- ─────────────────────────────────────────────────────────────
-- 4. Агрегаты для дашборда
-- ─────────────────────────────────────────────────────────────
create or replace function public.tracker_dashboard(p_days int default 7)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with win as (select now() - make_interval(days => greatest(p_days,1)) as since)
  select jsonb_build_object(
    'range_days', p_days,
    'generated_at', now(),
    'totals', (
      select jsonb_build_object(
        'visitors',  count(distinct visitor_id),
        'sessions',  count(distinct session_id),
        'pageviews', count(*) filter (where event_type='pageview'),
        'events',    count(*)
      ) from site_events, win where received_at > win.since),
    'top_clicks', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select label, count(*) hits from site_events, win
        where event_type in ('click','outbound') and received_at > win.since and label is not null
        group by label order by hits desc limit 15) x),
    'time_on_page', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select path, count(*) views,
               round(avg(active_ms)/1000.0, 1) avg_active_sec,
               round(avg(total_ms)/1000.0, 1)  avg_total_sec
        from site_events, win
        where event_type='pageend' and received_at > win.since
        group by path order by views desc) x),
    'scroll', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select path, depth, count(*) n from site_events, win
        where event_type='scroll' and received_at > win.since
        group by path, depth order by path, depth) x),
    'sections', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select section, count(distinct session_id) sessions from site_events, win
        where event_type='section' and received_at > win.since and section is not null
        group by section order by sessions desc limit 20) x),
    'sources', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select coalesce(nullif(referrer,''), '(direct)') src, count(distinct session_id) sessions
        from site_events, win
        where event_type='pageview' and received_at > win.since
        group by src order by sessions desc limit 10) x),
    'by_day', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select to_char(date_trunc('day', received_at), 'YYYY-MM-DD') d,
               count(distinct visitor_id) visitors,
               count(distinct session_id) sessions,
               count(*) filter (where event_type='pageview') pageviews
        from site_events, win
        where received_at > win.since
        group by 1 order by 1) x)
  );
$$;
