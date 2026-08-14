-- Keepalive-строки (site='__keepalive', event_type='keepalive') создаёт
-- воркфлоу .github/workflows/supabase-keepalive.yml, чтобы бесплатный проект
-- Supabase не уходил в автопаузу. Эти строки — служебные, в статистику
-- попадать не должны. Переопределяем tracker_dashboard, исключая их.

create or replace function public.tracker_dashboard(p_days int default 7)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with win as (select now() - make_interval(days => greatest(p_days,1)) as since),
  ev as (
    select * from site_events
    where coalesce(event_type,'') <> 'keepalive'
      and coalesce(site,'')       <> '__keepalive'
  )
  select jsonb_build_object(
    'range_days', p_days,
    'generated_at', now(),
    'totals', (
      select jsonb_build_object(
        'visitors',  count(distinct visitor_id),
        'sessions',  count(distinct session_id),
        'pageviews', count(*) filter (where event_type='pageview'),
        'events',    count(*)
      ) from ev, win where received_at > win.since),
    'top_clicks', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select label, count(*) hits from ev, win
        where event_type in ('click','outbound') and received_at > win.since and label is not null
        group by label order by hits desc limit 15) x),
    'time_on_page', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select path, count(*) views,
               round(avg(active_ms)/1000.0, 1) avg_active_sec,
               round(avg(total_ms)/1000.0, 1)  avg_total_sec
        from ev, win
        where event_type='pageend' and received_at > win.since
        group by path order by views desc) x),
    'scroll', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select path, depth, count(*) n from ev, win
        where event_type='scroll' and received_at > win.since
        group by path, depth order by path, depth) x),
    'sections', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select section, count(distinct session_id) sessions from ev, win
        where event_type='section' and received_at > win.since and section is not null
        group by section order by sessions desc limit 20) x),
    'sources', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select coalesce(nullif(referrer,''), '(direct)') src, count(distinct session_id) sessions
        from ev, win
        where event_type='pageview' and received_at > win.since
        group by src order by sessions desc limit 10) x),
    'by_day', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select to_char(date_trunc('day', received_at), 'YYYY-MM-DD') d,
               count(distinct visitor_id) visitors,
               count(distinct session_id) sessions,
               count(*) filter (where event_type='pageview') pageviews
        from ev, win
        where received_at > win.since
        group by 1 order by 1) x)
  );
$$;
