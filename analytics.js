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
 */
(function () {
  'use strict';

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
      return;
    }
    if (/^tel:/i.test(href)) {
      send('phone_click', { link_url: href, page_location: location.pathname });
      return;
    }
    if (/writereview|maps\.app\.goo|search\.google\.com\/local|goo\.gl\/maps/i.test(href)) {
      send('review_click', { link_url: href, page_location: location.pathname });
      return;
    }
    if (/instagram\.com|t\.me|telegram/i.test(href)) {
      send('social_click', { link_url: href, page_location: location.pathname });
      return;
    }
  }, true); // capture — ловим даже если клик уводит со страницы

  // Отправка формы лида → тоже конверсия
  var form = document.getElementById('lead-form');
  if (form) {
    form.addEventListener('submit', function () {
      send('generate_lead', { method: 'form', page_location: location.pathname });
    });
  }
})();
