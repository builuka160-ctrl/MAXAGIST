/* MAXAGIST — GA4 conversion events (G-D7B249WJS0)
 *
 * Отправляет события конверсии в Google Analytics 4 без правки каждой кнопки:
 * один делегированный слушатель на весь документ ловит клики по WhatsApp,
 * телефону, отзывам и соцсетям, а также сабмит формы лида.
 *
 * gtag() уже объявлен инлайном в <head> каждой страницы. Здесь мы только
 * шлём события. Если gtag почему-то нет — тихо кладём в dataLayer, ничего
 * не ломая. Подключать так: <script defer src="analytics.js"></script>
 *
 * Разделение конверсий (важно для Smart Bidding):
 *   ПЕРВИЧНЫЕ  — generate_lead (форма реально сохранена на сервере)
 *                и офлайн-события booked / paid, которые загружаются в Ads
 *                со стороны Supabase по сохранённому gclid.
 *   ВТОРИЧНЫЕ  — whatsapp_click, phone_click, altegio_click, review_click,
 *                social_click. Это намерение, а не клиент: если оптимизировать
 *                кампании по ним, Google будет искать людей, которые жмут
 *                кнопку, а не тех, кто приходит на массаж.
 *
 * Раньше клик по WhatsApp слался как generate_lead — от этого отказались
 * сознательно: у одного мастера цена ошибки в обучении ставок слишком высока.
 *
 * Google Ads (AW-18386499497): базовый тег подключён в <head> каждой страницы
 * (ремаркетинг + сбор данных). Ниже — отправка конверсий в Ads. Чтобы конверсия
 * заработала, вставьте её conversion label в AW_LABELS: возьмите его в Google Ads
 * → Цели → Конверсии → нужное действие, часть после слэша в send_to
 * ('AW-18386499497/XXXXXXX' → 'XXXXXXX'). Пока label пуст — событие в Ads молча
 * не шлётся, GA4 и остальное работают как обычно.
 */
(function () {
  'use strict';

  // Google Ads conversion labels. Заполните из кабинета Ads (Цели → Конверсии).
  // Действие в Ads помечайте как Primary только для `lead`; остальные — Secondary.
  var AW_ID = 'AW-18386499497';
  var AW_LABELS = {
    lead: 'e3XgCM2BiOIcEKnvrr9E', // PRIMARY: форма заявки успешно сохранена
    whatsapp: '',                 // SECONDARY: клик по WhatsApp — создайте отдельное действие
    phone: '',                    // SECONDARY: клик по номеру телефона
    booking_click: ''             // SECONDARY: переход в онлайн-запись Altegio
  };

  /* Идентификаторы рекламного клика. Нужны, чтобы позже вернуть в Google
     офлайн-результат («записался», «пришёл», «оплатил») по этому же клику —
     именно на таких данных Smart Bidding начинает искать реальных клиентов,
     а не любителей нажать кнопку. Храним только при согласии на рекламные
     хранилища; из текущего URL читаем всегда. */
  var CLICK_KEYS = ['gclid', 'wbraid', 'gbraid', 'fbclid', 'msclkid'];

  function readClickIds() {
    var out = {}, q;
    try { q = new URLSearchParams(location.search); } catch (e) { return out; }
    CLICK_KEYS.forEach(function (k) { var v = q.get(k); if (v) out[k] = String(v).slice(0, 200); });
    return out;
  }
  function consentGranted() {
    try { return localStorage.getItem('mx_consent') === 'all'; } catch (e) { return false; }
  }
  (function storeClickIds() {
    var found = readClickIds();
    if (!Object.keys(found).length || !consentGranted()) return;
    try {
      found.ts = new Date().toISOString();
      found.landing = location.pathname;
      localStorage.setItem('mx_click', JSON.stringify(found));
    } catch (e) { /* приватный режим — не страшно */ }
  })();
  // Заявка может уйти со страницы без параметров в URL — отдаём сохранённые.
  window.mxClickIds = function () {
    var live = readClickIds();
    if (Object.keys(live).length) return live;
    try { return JSON.parse(localStorage.getItem('mx_click') || '{}'); } catch (e) { return {}; }
  };

  function send(name, params) {
    params = params || {};
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', name, params);
      } else {
        (window.dataLayer = window.dataLayer || []).push(
          Object.assign({ event: name }, params)
        );
      }
    } catch (e) { /* аналитика не должна мешать сайту */ }
  }

  // Конверсия в Google Ads. Шлём только если для действия задан label —
  // иначе Ads ругается на пустой send_to, поэтому тихо пропускаем.
  function adConversion(key, params) {
    var label = AW_LABELS[key];
    if (!label) return;
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'conversion', Object.assign(
          { send_to: AW_ID + '/' + label }, params || {}
        ));
      }
    } catch (e) { /* не мешаем сайту */ }
  }

  // Meta Pixel — стандартные (track) и кастомные (trackCustom) события.
  // Пиксель копит данные/аудиторию заранее, чтобы будущая реклама в Meta
  // сразу имела кому ретаргетить.
  function fb(name, params, custom) {
    try {
      if (typeof window.fbq === 'function') {
        window.fbq(custom ? 'trackCustom' : 'track', name, params || {});
      }
    } catch (e) { /* не мешаем сайту */ }
  }

  // Куда ведёт ссылка/кнопка — нормализуем для матчинга
  function hrefOf(el) {
    var a = el.closest && el.closest('a[href]');
    return a ? (a.getAttribute('href') || '') : '';
  }

  function isWhatsApp(el, href) {
    if (/wa\.me|api\.whatsapp|whatsapp\.com/i.test(href)) return true;
    // FAB и карточки «что вас беспокоит» открывают WA через JS (window.open),
    // у них нет href — ловим по маркерам.
    if (el.closest && (el.closest('#wa-fab') || el.closest('[data-wa]'))) return true;
    return false;
  }

  document.addEventListener('click', function (ev) {
    var el = ev.target;
    if (!el || !el.closest) return;

    var href = hrefOf(el);

    if (isWhatsApp(el, href)) {
      // Намерение, а не клиент: вторичная конверсия.
      send('whatsapp_click', {
        method: 'whatsapp',
        link_url: href || 'wa:js',
        page_location: location.pathname
      });
      adConversion('whatsapp');
      fb('Contact', { content_name: 'whatsapp' });
      return;
    }
    if (/^tel:/i.test(href)) {
      send('phone_click', { link_url: href, page_location: location.pathname });
      adConversion('phone');
      fb('Contact', { content_name: 'phone' });
      return;
    }
    if (/alteg\.io|altegio/i.test(href)) {
      send('altegio_click', { link_url: href, page_location: location.pathname });
      adConversion('booking_click');
      fb('Schedule', { content_name: 'altegio' });
      return;
    }
    if (/writereview|maps\.app\.goo|search\.google\.com\/local|goo\.gl\/maps/i.test(href)) {
      send('review_click', { link_url: href, page_location: location.pathname });
      fb('ReviewClick', { link_url: href }, true);
      return;
    }
    if (/instagram\.com|t\.me|telegram/i.test(href)) {
      send('social_click', { link_url: href, page_location: location.pathname });
      fb('SocialClick', { link_url: href }, true);
      return;
    }
  }, true); // capture — ловим даже если клик уводит со страницы

  // Отправка формы лида → конверсия ТОЛЬКО после успешного сохранения на сервере.
  // Обработчик формы (index.html) шлёт кастомное событие 'lead:success', когда
  // заявка реально принята. Раньше слушали 'submit' — и конверсия засчитывалась
  // даже при ошибке валидации или сбое сети, раздувая статистику Ads/Meta.
  document.addEventListener('lead:success', function () {
    send('generate_lead', { method: 'form', page_location: location.pathname });
    adConversion('lead', { value: 1.0, currency: 'EUR' });
    fb('Lead', { content_name: 'form' });
  });
})();
