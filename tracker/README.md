# Трекер активности MAXAGIST

Лёгкая собственная аналитика: кто, что и куда жмёт, сколько времени проводит на
странице, докуда докручивает и откуда пришёл. Без внешних сервисов и cookie,
privacy-first (уважает Do Not Track, без персональных данных).

## Из чего состоит

| Файл | Что делает |
|---|---|
| `../tracker.js` | Клиентский скрипт. Уже подключён в `index.html` и `vyezd.html`. |
| `site_events.sql` | Таблица `public.site_events` в Supabase. |
| `edge-function/index.ts` | Supabase Edge Function `track` — принимает события и пишет их в таблицу. |

## Какие события собираются

`pageview` · `click` · `outbound` · `scroll` (25/50/75/90/100 %) · `section`
(видимость секций) · `form_submit` (только факт, без содержимого полей) ·
`heartbeat` (активное время каждые 15 c) · `pageend` (итоговое время ухода).

Метка клика (`label`) читаемая: `whatsapp:hero`, `whatsapp:price`,
`booking:altegio`, `call:phone`, `telegram`, `lang:en`, `format:vyezd`,
`gallery:open` и т. п. Любому элементу можно задать явную метку атрибутом
`data-track="…"`.

## Запуск (3 шага)

1. **Таблица.** Supabase → SQL Editor → выполнить `site_events.sql`.
2. **Функция.** Скопировать `edge-function/index.ts` в `supabase/functions/track/index.ts` вашего Supabase-проекта и задеплоить:
   ```bash
   supabase functions deploy track --no-verify-jwt
   ```
   `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` рантайм подставит сам.
3. **Включить отправку.** Прописать URL функции в сайте — один из вариантов:
   - в `tracker.js` заменить `var ENDPOINT = ''` на URL функции, **или**
   - добавить в `<head>` до подключения трекера:
     ```html
     <script>window.MX_TRACK_ENDPOINT='https://<PROJECT-REF>.functions.supabase.co/track';</script>
     ```

Пока `ENDPOINT` пуст — трекер работает в **debug-режиме**: события видны в консоли
и в `window.__mxTrack`, но никуда не отправляются. Проверить локально:
открыть сайт с `?mxtrack=debug` и смотреть консоль.

## Приватность и отключение

- ID посетителя/сессии — случайные, first-party (`localStorage`), не для кросс-сайт слежки.
- Персональные данные (имя, телефон, текст формы) **не собираются**.
- Уважается Do Not Track и Global Privacy Control.
- Выключить для себя: `localStorage.setItem('mx_track_off','1')` или зайти с `?mxtrack=off`.

## Примеры запросов (SQL)

```sql
-- Топ: что и куда жмут
select label, href, count(*) hits
from site_events
where event_type in ('click','outbound')
group by label, href order by hits desc limit 30;

-- Сколько в среднем проводят на странице (активное время)
select path,
       count(*) views,
       round(avg(active_ms)/1000.0, 1) avg_active_sec,
       round(avg(total_ms)/1000.0, 1)  avg_total_sec
from site_events
where event_type = 'pageend'
group by path order by views desc;

-- Глубина скролла
select path, depth, count(*)
from site_events
where event_type = 'scroll'
group by path, depth order by path, depth;

-- Какие секции реально видят
select section, count(distinct session_id) sessions
from site_events
where event_type = 'section'
group by section order by sessions desc;

-- Посетители и сессии по дням (новые vs вернувшиеся)
select date_trunc('day', received_at) d,
       count(distinct visitor_id) visitors,
       count(distinct session_id) sessions,
       count(*) filter (where event_type='pageview') pageviews
from site_events
group by d order by d desc;

-- Источники переходов
select coalesce(nullif(referrer,''),'(direct)') src, count(distinct session_id) sessions
from site_events
where event_type = 'pageview'
group by src order by sessions desc;
```
