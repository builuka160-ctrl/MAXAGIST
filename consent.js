/*
 * MAXAGIST — баннер согласия на cookies + Google Consent Mode v2.
 *
 * Зачем: Google Ads и GA4 для трафика из ЕЭЗ требуют Consent Mode v2. Значения
 * по умолчанию (denied) выставляются инлайном в <head> ДО загрузки gtag.js —
 * здесь только UI и отправка consent update после выбора пользователя.
 *
 * Выбор хранится в localStorage['mx_consent'] = 'all' | 'necessary'.
 * Пока выбора нет — баннер показан, реклама и аналитика не пишут куки
 * (Google при этом собирает обезличенные сигналы через modeling).
 */
(function () {
  'use strict';

  var KEY = 'mx_consent';

  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  function lang() {
    var l = null;
    try { l = localStorage.getItem('lang'); } catch (e) {}
    l = l || (document.documentElement.lang || 'ru').slice(0, 2);
    return (l === 'lv' || l === 'en') ? l : 'ru';
  }

  var T = {
    ru: {
      text: 'Мы используем cookies для аналитики и рекламы, чтобы понимать, какие страницы полезны. Без согласия работают только необходимые.',
      all: 'Принять',
      need: 'Только необходимые',
      more: 'Подробнее'
    },
    lv: {
      text: 'Izmantojam sīkdatnes analītikai un reklāmai, lai saprastu, kuras lapas ir noderīgas. Bez piekrišanas darbojas tikai nepieciešamās.',
      all: 'Piekrītu',
      need: 'Tikai nepieciešamās',
      more: 'Sīkāk'
    },
    en: {
      text: 'We use cookies for analytics and advertising to see which pages are useful. Without consent only essential ones are used.',
      all: 'Accept',
      need: 'Essential only',
      more: 'Details'
    }
  };

  function update(granted) {
    var v = granted ? 'granted' : 'denied';
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        ad_storage: v, ad_user_data: v, ad_personalization: v, analytics_storage: v
      });
    }
    if (typeof window.fbq === 'function') {
      try { window.fbq('consent', granted ? 'grant' : 'revoke'); } catch (e) {}
    }
  }

  function render() {
    var t = T[lang()];
    var box = document.createElement('div');
    box.className = 'cookie-bar';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-live', 'polite');
    box.innerHTML =
      '<p>' + t.text + ' <a href="#terms">' + t.more + '</a></p>' +
      '<div class="cookie-btns">' +
        '<button type="button" class="c-need">' + t.need + '</button>' +
        '<button type="button" class="c-all">' + t.all + '</button>' +
      '</div>';
    document.body.appendChild(box);
    requestAnimationFrame(function () { box.classList.add('show'); });

    function close(choice, granted) {
      save(choice);
      update(granted);
      box.classList.remove('show');
      setTimeout(function () { box.remove(); }, 320);
      document.body.classList.remove('has-consent-bar');
    }
    box.querySelector('.c-all').onclick = function () { close('all', true); };
    box.querySelector('.c-need').onclick = function () { close('necessary', false); };
    document.body.classList.add('has-consent-bar');
  }

  var choice = stored();
  if (choice === 'all') { update(true); return; }
  if (choice === 'necessary') { return; }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
