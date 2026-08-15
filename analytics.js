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
 * События (в GA4 их можно пометить как «ключевые» / конверсии):
 *   generate_lead  — клик по WhatsApp или отправка формы лида (главная цель)
 *   phone_click    — клик по номеру телефона
 *   review_click   — переход к отзывам (Google Maps / оставить отзыв)
 *   social_click   — переход в Instagram и т.п.
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
  var AW_ID = 'AW-18386499497';
  var AW_LABELS = {
    lead: 'e3XgCM2BiOIcEKnvrr9E', // «Отправка формы для потенциальных клиентов»: WhatsApp / форма лида
    phone: '' // (опционально) звонок по номеру телефона — добавить отдельным action при необходимости
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
      // Главная конверсия воронки — обращение в WhatsApp (запись/консультация)
      send('generate_lead', {
        method: 'whatsapp',
        link_url: href || 'wa:js',
        page_location: location.pathname
      });
      adConversion('lead', { value: 1.0, currency: 'EUR' });
      fb('Lead', { content_name: 'whatsapp' });
      return;
    }
    if (/^tel:/i.test(href)) {
      send('phone_click', { link_url: href, page_location: location.pathname });
      adConversion('phone', { value: 1.0, currency: 'EUR' });
      fb('Contact', { content_name: 'phone' });
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

  // Отправка формы лида → тоже конверсия
  var form = document.getElementById('lead-form');
  if (form) {
    form.addEventListener('submit', function () {
      send('generate_lead', { method: 'form', page_location: location.pathname });
      adConversion('lead', { value: 1.0, currency: 'EUR' });
      fb('Lead', { content_name: 'form' });
    });
  }
})();
