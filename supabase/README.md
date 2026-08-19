# MAXAGIST — tracker, leads, mini-CMS и Telegram-панель

Backend сайта — Supabase, проект `xqwawjnvvmcydcbswous`.

## Миграции

`0001`–`0004` — существующая аналитика/CMS/leads/RPC security. Новая миграция:

```text
migrations/0005_lead_attribution_status.sql
```

Она добавляет к `leads`:

```text
landing_page
gclid / gbraid / wbraid
utm_source / utm_medium / utm_campaign / utm_content / utm_term
status / status_updated_at
booked_at / visited_at / paid_at
lead_value / revenue / currency
```

Статусы: `new → qualified → booked → visited → paid` либо `lost`. История пишется в `lead_status_history`. Это база для будущего server-side импорта offline conversions в Google Ads; Google Ads API/секреты во frontend не добавляются.

## Edge Functions

- `track` — принимает first-party события и backend-confirmed lead формы;
- `admin-api` — dashboard, admin-only leads/lifecycle и CMS;
- `bot` — Telegram webhook/setup.

Форма главной собирает только **имя + телефон + согласие**. Attribution передаётся отдельно. `track` возвращает `lead_id` только после успешной записи.

Viewer имеет только dashboard. Заявки, изменение статусов и редактор доступны только `admin`.

## Обязательные secrets

Секреты не хранить в git:

```bash
supabase secrets set BOT_TOKEN=<token-from-BotFather>
supabase secrets set SETUP_SECRET=<long-random-secret>
```

`SETUP_SECRET` больше не имеет fallback. Если переменная не задана, setup endpoint отвечает `503 Setup disabled` и ничего не настраивает.

Также Edge Functions используют стандартные Supabase env:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

## Порядок deploy

```bash
supabase db push
supabase functions deploy track --no-verify-jwt
supabase functions deploy admin-api --no-verify-jwt
supabase functions deploy bot --no-verify-jwt
```

После deploy проверить Telegram Mini App: admin видит dashboard + заявки + редактор; viewer — только dashboard.

## Privacy

PII в `leads` и `lead_status_history` не имеет anon policies; доступ идёт через service role после серверной Telegram HMAC-проверки. First-party `tracker.js` не записывает содержимое формы и уважает DNT/GPC / `?mxtrack=off`.
