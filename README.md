# MAXAGIST — массаж в Риге

Лендинг массажной практики **MAXAGIST**. Студия FIFTY и выезд на дом,
в отель или офис по Риге. Первый визит — €30.

Сайт статический: HTML-страницы с общим `styles.css` плюс изображения в
`photos/`. Внешних зависимостей нет, кроме шрифтов Google Fonts. Заявки и
аналитика уходят в Supabase (см. `supabase/README.md`).

## Структура

```
index.html         — главная: оффер €30, выбор по жалобе, услуги, цены, отзывы, форма
vyezd.html         — посадочная под выезд на дом, в отель, офис
podbor.html        — A/B-лендинг под холодный трафик (noindex, вне sitemap)
anticelulitnyj-massazh-riga.html — SEO: антицеллюлитный массаж
sportivnyj-massazh-riga.html     — SEO: спортивный массаж
massazh-spiny-shei-riga.html     — SEO: массаж спины и шеи
styles.css         — общие стили всех страниц
tracker.js         — свой трекер поведения (privacy-first)
analytics.js       — события конверсий в GA4 / Google Ads / Meta
consent.js         — баннер согласия на cookies (Google Consent Mode v2)
content.js         — подстановка контента из Supabase (мини-CMS)
tgapp/index.html   — Telegram Mini App: дашборд, заявки, редактор
photos/            — фотографии студии, работ и логотип
  ├─ logo.png
  ├─ studio-room.jpg, spa-tools.jpg, massage-*.jpg …
  ├─ diploma-riseba.jpg, cert-spaschool.jpg
  └─ certs/         — сертификаты и дипломы
```

## Реклама и согласие на cookies

Значения Consent Mode v2 по умолчанию (`denied` для рекламы и аналитики)
выставляются инлайном в `<head>` каждой страницы — до загрузки `gtag.js`.
Баннер (`consent.js`) после выбора шлёт `consent update` и `fbq('consent', …)`.
Согласие хранится в `localStorage['mx_consent']` = `all` | `necessary`.

Метки конверсий Google Ads — в `analytics.js`, константа `AW_LABELS`:
`lead` уже заполнена, `phone` пустая — пока она пустая, звонки уходят
только в GA4, но не в Ads.

## Локальный просмотр

Достаточно открыть `index.html` в браузере. Для корректной загрузки
изображений удобнее поднять локальный сервер:

```bash
python3 -m http.server 8000
# затем открыть http://localhost:8000
```

## Публикация (GitHub Pages)

Репозиторий готов к раздаче через GitHub Pages:

1. **Settings → Pages**
2. **Source:** Deploy from a branch
3. **Branch:** `main` / `/ (root)`

Точка входа — `index.html`, сайт откроется на корневом URL.

## Контакты

Запись — в WhatsApp или через форму на сайте.
