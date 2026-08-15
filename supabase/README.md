# MAXAGIST — трекер, мини-CMS и Telegram-панель

Аналитика поведения на сайте + редактор контента + Telegram Mini App с
дашбордом. Бэкенд — Supabase (проект `xqwawjnvvmcydcbswous`).

## Что уже развёрнуто

| Компонент | Где |
|---|---|
| Таблицы `site_events`, `site_content`, `app_admins` + функция `tracker_dashboard()` | миграция `migrations/0001_tracker_admin.sql` (применена) |
| Таблица `leads` — заявки формы-анкеты (PII) | миграция `migrations/0003_leads.sql` (применена) |
| Edge Function `track` — приём событий + заявок формы (`body.lead`) | `functions/track/` · `…/functions/v1/track` (verify_jwt=off) |
| Edge Function `admin-api` — дашборд + редактор | `functions/admin-api/` · `…/functions/v1/admin-api` (verify_jwt=off) |
| Клиент-трекер | `../tracker.js` (подключён в `index.html`, `vyezd.html`) |
| Подстановка контента (мини-CMS) | `../content.js` |
| Telegram Mini App (дашборд + редактор) | `../tgapp/index.html` |

Endpoint трекера прописан в `<head>` сайта через `window.MX_TRACK_ENDPOINT`.

## Данные, которые собираются

`pageview · click · outbound · scroll (25/50/75/90/100 %) · section · form_submit
(только факт) · heartbeat · pageend (время на странице)`. Метки кликов
читаемые: `whatsapp:hero`, `booking:altegio`, `call:phone`, `lang:en`, `format:vyezd`…
Приватность: без PII, first-party анонимные id, уважает Do Not Track/GPC,
opt-out через `?mxtrack=off`.

## Заявки формы-анкеты (лиды)

Форма на `index.html` (имя, телефон, email, сообщение) отправляется POST'ом в
`…/functions/v1/track` как `{ "lead": { name, phone, email, message, source, path, referrer, utm } }`.
Функция пишет их service role'ом в таблицу `leads` (name + phone обязательны).
PII: RLS без политик — читать/писать напрямую нельзя, только через Edge Functions.

В Telegram-панели заявки видны на вкладке **«📇 Заявки»** (действие `admin-api`
`leads`, доступно admin и viewer). Телефон кликабелен (звонок + WhatsApp).

```sql
-- последние заявки
select received_at, name, phone, email, source from leads order by received_at desc limit 50;
```

## Секрет бота (обязательно один раз)

`admin-api` проверяет подпись Telegram по токену бота. В git токена нет — задайте секрет:

```bash
supabase secrets set BOT_TOKEN=<токен @maxag_bot>
supabase functions deploy admin-api --no-verify-jwt   # перечитать секрет
```

(В текущем задеплоенном билде токен уже вшит как константа — после установки
секрета передеплойте функцию из `functions/admin-api/`, чтобы перейти на env.)

## Доступ к панели (allowlist)

Таблица `app_admins`. Уже добавлены:

| tg_id | роль | кто |
|---|---|---|
| 1905037380 | admin (дашборд + редактор) | Лука (owner) |
| 266729271 | viewer (только дашборд) | Miro (client) |

Добавить ещё: `insert into app_admins (tg_id, role, name) values (<id>, 'viewer', '<имя>');`

## Мини-приложение и бот

1. Разместить `tgapp/index.html` по HTTPS (напр. `https://maxagist.com/app/`).
2. В @BotFather → бот `@maxag_bot` → **Bot Settings → Menu Button → Configure menu button** → URL мини-аппа.
   Или разово через Bot API (см. серверный промпт / `SERVER_PROMPT.md`):
   `setChatMenuButton` с `web_app.url`.
3. Открыть бота → кнопка меню → откроется панель. Владелец видит вкладку
   «Редактор сайта», клиент — только дашборд.

## Полезные SQL

```sql
-- живые события за час
select event_type, label, path, received_at from site_events order by received_at desc limit 50;
-- дашборд как в мини-аппе
select tracker_dashboard(7);
```
