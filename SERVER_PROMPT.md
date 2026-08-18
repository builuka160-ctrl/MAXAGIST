# Промпт для серверного Claude (VPS + Caddy + Telegram-бот)

Скопируй всё, что ниже разделителя, и вставь серверному агенту с доступом к VPS.
Подставь реальный токен бота вместо `<BOT_TOKEN>` — в этот файл его НЕ вписывай
(он не должен попасть в git).

---

Ты — агент с доступом к VPS, где Caddy хостит статический сайт maxagist.com
из /var/www/maxagist (репозиторий builuka160-ctrl/MAXAGIST, ветка main).
Панель — Telegram Mini App по адресу https://maxagist.com/app/ (каталог tgapp/).
Бэкенд — Supabase проект xqwawjnvvmcydcbswous (Edge Functions track / admin-api / bot).

Есть две проблемы. Реши по шагам и покажи вывод каждой проверки.

## Проблема 1. Сайт отдаёт СТАРЫЙ билд (в консоли maxagist.com — SyntaxError)

На сервере не выкачен свежий main. В актуальном коде ошибки нет.

1. В рабочей копии сайта:
   `git fetch origin && git reset --hard origin/main`
2. Задеплой статику в веб-корень /var/www/maxagist (index.html, vyezd.html,
   podbor.html, styles.css, tracker.js, content.js, analytics.js, каталоги
   tgapp/ и photos/). Права на чтение — для пользователя Caddy.
3. `caddy reload` (или `systemctl reload caddy`)
4. Проверки (ожидается HTTP 200):
   - `curl -I https://maxagist.com/`
   - `curl -I https://maxagist.com/app/`
5. Проверь, что в отданном index.html нет синтаксической ошибки — открой
   https://maxagist.com/ в браузере с пустым кешем (Ctrl+Shift+R), консоль
   должна быть чистой; переключение языка и форма заявки должны работать.

## Проблема 2. Панель показывает «unauthorized»

admin-api проверяет подпись Telegram по секрету BOT_TOKEN. Панель отклоняется,
значит секрет НЕ совпадает с ботом, из которого реально открывают панель
(его могли перевыпустить через @BotFather /revoke, либо панель открыта из
другого бота — в заголовке видно «MAXAGISDASHBORD»).

Функция уже возвращает точный код причины — используй его для диагностики:
- `bad_signature` → BOT_TOKEN не от этого бота (главный подозреваемый)
- `stale` → достаточно переоткрыть панель
- `no_initdata` → панель открыли не внутри Telegram
- `no_token` → секрет BOT_TOKEN не задан

Шаги:
1. Возьми АКТУАЛЬНЫЙ токен того бота, чья кнопка меню открывает панель
   (@BotFather → выбрать этого бота → API Token; если был /revoke — новый токен).
2. Убедись, что токен принадлежит нужному боту:
   `curl -s "https://api.telegram.org/bot<BOT_TOKEN>/getMe"`
   → в ответе username должен быть тем ботом, из которого открывают панель.
3. Кнопка меню этого же бота должна вести на панель:
   ```bash
   curl -s -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setChatMenuButton" \
     -H 'Content-Type: application/json' \
     -d '{"menu_button":{"type":"web_app","text":"Панель","web_app":{"url":"https://maxagist.com/app/"}}}'
   ```
   → `{"ok":true,"result":true}`
4. Пропиши этот же токен секретом в Supabase и передеплой функции:
   ```bash
   supabase link --project-ref xqwawjnvvmcydcbswous
   supabase secrets set BOT_TOKEN=<BOT_TOKEN>
   supabase functions deploy admin-api --no-verify-jwt
   supabase functions deploy track     --no-verify-jwt
   supabase functions deploy bot        --no-verify-jwt
   ```
   (track использует BOT_TOKEN для уведомлений о заявках, bot — для вебхука.)
5. Проверка: закрой и заново открой панель из меню бота.
   - Владелец (tg_id 1905037380) видит «Дашборд», «Заявки», «Редактор сайта».
   - Вкладка «Заявки» показывает заявки, внизу карточки — устройство.
   Если панель всё ещё отклоняет — посмотри код внизу экрана панели
   (bad_signature/stale/no_initdata) и действуй по нему.

## Важно про безопасность

- Токен НЕ коммить в git и не вставляй в этот файл.
- Если токен когда-либо светился в переписке — перевыпусти его в @BotFather,
  затем повтори шаги 2–4 с новым токеном.

## Примечания

- CORS трекера (ошибка `Access-Control-Allow-Origin '*' … credentials`) уже
  исправлен на стороне Supabase (функция `track` отражает Origin и разрешает
  credentials) — отдельных действий на VPS не требует, уходит после Ctrl+Shift+R.
