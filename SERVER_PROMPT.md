# Промпт для серверного Claude (VPS + Caddy + Telegram-бот)

Скопируй всё, что ниже разделителя, и вставь серверному агенту с доступом к VPS.
Замени `<BOT_TOKEN>` на токен `@maxag_bot` из @BotFather (в этот файл его не вписывай —
он не должен попасть в git).

---

Ты работаешь на VPS, где за Caddy хостится статический сайт **maxagist.com**
(домен на Cloudflare, порты 80/443 открыты только для диапазонов Cloudflare).
Репозиторий сайта — `builuka160-ctrl/maxagist`. Нужно выкатить обновление и
подключить Telegram Mini App с панелью активности. Сделай по шагам и покажи
результат каждой проверки.

## 1. Выкатить свежий код

Обнови рабочую копию сайта из ветки `claude/notion-tasks-5a2tsz` (или из `main`,
если её уже влили) и задеплой статику в веб-корень. Новые/изменённые файлы:
`index.html`, `vyezd.html`, `styles.css`, `tracker.js`, `content.js`,
каталог `tgapp/`, `photos/`. Убедись, что права на чтение выставлены для Caddy.

## 2. Caddy: отдавать сайт и мини-апп

Мини-апп лежит в `tgapp/index.html`, его нужно отдавать по HTTPS по адресу
`https://maxagist.com/app/`. Пример блока Caddyfile (адаптируй под свой конфиг и
путь к корню сайта `/var/www/maxagist`):

```caddy
maxagist.com {
    encode zstd gzip
    root * /var/www/maxagist

    # Telegram Mini App
    handle_path /app/* {
        root * /var/www/maxagist/tgapp
        file_server
        try_files {path} /index.html
    }

    # основной сайт
    handle {
        file_server
    }
}
```

Проверка: `curl -I https://maxagist.com/app/` → 200; `curl -I https://maxagist.com/` → 200.
Перезапусти/перезагрузи Caddy (`caddy reload` или `systemctl reload caddy`).

## 3. Секрет бота в Supabase (если на сервере есть Supabase CLI)

Бэкенд трекера и панели уже развёрнут в Supabase (проект `xqwawjnvvmcydcbswous`).
Функция `admin-api` проверяет подпись Telegram по токену бота. Переведи её на
секрет из окружения (сейчас токен вшит в задеплоенный билд — замени на env):

```bash
supabase link --project-ref xqwawjnvvmcydcbswous
supabase secrets set BOT_TOKEN=<BOT_TOKEN>
supabase functions deploy admin-api --no-verify-jwt
```

Если Supabase CLI на сервере нет — это можно сделать позже из любого места; на
работу панели прямо сейчас это не влияет (токен уже вшит в текущий билд).

## 4. Подключить кнопку меню бота на мини-апп

Разово вызови Bot API, чтобы кнопка меню `@maxag_bot` открывала панель:

```bash
curl -s -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setChatMenuButton" \
  -H 'Content-Type: application/json' \
  -d '{"menu_button":{"type":"web_app","text":"Панель","web_app":{"url":"https://maxagist.com/app/"}}}'
```

Ожидаемый ответ: `{"ok":true,"result":true}`.
(Альтернатива без API: @BotFather → Bot Settings → Menu Button → задать URL `https://maxagist.com/app/`.)

Опционально — описание/подсказка бота:

```bash
curl -s -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setMyDescription" \
  -d 'description=Панель активности и редактор сайта MAXAGIST'
```

## 5. Проверка

1. Открой `@maxag_bot` в Telegram → нажми кнопку меню → должна открыться панель.
   - Владелец (tg_id 1905037380) видит вкладки «Дашборд» и «Редактор сайта».
   - Клиент (tg_id 266729271) видит только «Дашборд».
2. Зайди на `https://maxagist.com/`, покликай кнопки, поскролль. Через минуту в
   панели во вкладке «Дашборд» появятся события (клики, время, источники).
3. В «Редакторе сайта» поменяй, например, «Главная · лид под заголовком»,
   сохрани — текст на сайте обновится после перезагрузки страницы.

## Примечания

- Тех-долг `background-attachment: fixed` в `styles.css` можно заменить позже
  (плохо работает на части мобильных) — на задачу с панелью не влияет.
- Токен бота был засвечен в переписке — после проверки работоспособности
  желательно перевыпустить его в @BotFather (`/revoke`) и обновить секрет
  (шаг 3) и кнопку меню (шаг 4).
