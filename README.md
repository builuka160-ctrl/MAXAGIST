# MAXAGIST — massage in Piņķi / Saliena

Статический мультиязычный сайт частной массажной практики MAXAGIST. Главный локальный кластер — **Piņķi / Saliena / Babīte**; дополнительно продвигаются Imanta / Zolitūde / западная Riga и выезд по Riga / Jūrmala.

Студия: **FIFTY Beauty Studio, Jaunā iela 12, Piņķi**. Первый визит в студии до 60 минут — **€30 вместо €50**.

## Основные страницы

```text
index.html                    — главная RU/LV/EN
massage-pinki-saliena.html    — локальный Google Ads landing RU/LV/EN
vyezd.html                    — выездной массаж RU/LV/EN
podbor.html                   — подбор формата по запросу
sportivnyj-massazh-riga.html  — SEO: спортивный массаж
massazh-spiny-shei-riga.html  — SEO: спина/шея
privacy.html                  — privacy/GDPR RU/LV/EN
consent.js                    — Consent Mode v2 + CMP + delayed Meta Pixel
analytics.js                  — GA4/Ads/Meta event taxonomy
tracker.js                    — first-party privacy-first analytics
content.js                    — мини-CMS overrides
styles.css                    — общий дизайн
```

## Google Ads landing URLs

Параметр `?lang=` имеет приоритет над `localStorage` и `navigator.language`. На главной и `vyezd.html` он отключает языковой gateway, поэтому рекламный пользователь сразу видит язык объявления.

```text
/?lang=lv&utm_source=google&utm_medium=cpc&utm_campaign=search_studio_lv
/?lang=ru&utm_source=google&utm_medium=cpc&utm_campaign=search_studio_ru
/?lang=en&utm_source=google&utm_medium=cpc&utm_campaign=search_studio_en

/massage-pinki-saliena.html?lang=lv
/massage-pinki-saliena.html?lang=ru
/massage-pinki-saliena.html?lang=en
```

UTM, `gclid`, `gbraid`, `wbraid` и `fbclid` сохраняются в attribution заявки и не удаляются при переключении языка.

## Аналитика и consent

Google Consent Mode v2 задаётся в `consent.js` до конфигурации тегов. По умолчанию `ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization` = `denied`. Meta Pixel загружается только после marketing consent. Пользователь может повторно открыть настройки из футера.

События рекламы разделены:

- `whatsapp_click` — взаимодействие, **не lead**;
- `booking_click`, `phone_click` — взаимодействия;
- `lead_success` + `generate_lead` — только после успешного сохранения формы backend'ом;
- Google Ads lead conversion отправляется один раз на подтверждённую заявку.

## Локальный запуск

```bash
python3 -m http.server 8000
# http://localhost:8000/?lang=ru
```

## Supabase

Перед публикацией backend-изменений применить `supabase/migrations/0005_lead_attribution_status.sql`, затем передеплоить `track`, `admin-api` и `bot`. Подробности — `supabase/README.md` и `DEPLOY_2026-08-19.md`.

## Важно перед запуском рекламы

Проверьте в браузере URL из Google Ads с `?lang=` и UTM, затем только после QA включайте созданную Search-кампанию. Privacy policy содержит рабочую модель срока хранения заявок до 12 месяцев; финальный срок и реквизиты контролёра должны соответствовать фактическим правилам бизнеса и применимому праву.
