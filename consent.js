/*
 * MAXAGIST — согласие на cookies и Google Consent Mode v2.
 *
 * Выбор хранится в localStorage['mx_consent_v2'] = {analytics, ads, ts}.
 * Значения по умолчанию (denied) выставляются инлайном в <head> ДО загрузки
 * gtag.js — здесь только интерфейс и отправка consent update.
 *
 * Три равнозначные кнопки: «Принять», «Отклонить», «Настроить». Отказ стоит
 * рядом с согласием и выглядит так же — тёмных паттернов быть не должно.
 *
 * Собственный трекер (tracker.js) уважает DNT/GPC самостоятельно и от этого
 * баннера не зависит: он не пишет рекламные куки и не собирает PII.
 */
(function () {
  'use strict';

  var KEY = 'mx_consent_v2';
  var LEGACY = 'mx_consent';

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var v = JSON.parse(raw);
        if (v && typeof v === 'object') return { analytics: !!v.analytics, ads: !!v.ads };
      }
      // выбор, сделанный до появления настроек, не спрашиваем заново
      var old = localStorage.getItem(LEGACY);
      if (old === 'all') return { analytics: true, ads: true };
      if (old === 'necessary') return { analytics: false, ads: false };
    } catch (e) {}
    return null;
  }

  function save(v) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ analytics: !!v.analytics, ads: !!v.ads, ts: new Date().toISOString() }));
      localStorage.setItem(LEGACY, (v.analytics && v.ads) ? 'all' : 'necessary');
    } catch (e) {}
  }

  function apply(v) {
    var a = v.analytics ? 'granted' : 'denied';
    var d = v.ads ? 'granted' : 'denied';
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        ad_storage: d, ad_user_data: d, ad_personalization: d, analytics_storage: a
      });
    }
    if (typeof window.fbq === 'function') {
      try { window.fbq('consent', v.ads ? 'grant' : 'revoke'); } catch (e) {}
    }
  }

  function lang() {
    var l = window.MX_LANG;
    if (!l) { try { l = localStorage.getItem('lang'); } catch (e) {} }
    l = l || (document.documentElement.lang || 'ru').slice(0, 2);
    return (l === 'lv' || l === 'en') ? l : 'ru';
  }

  var T = {
    ru: {
      text: 'Мы используем cookies: обязательные — чтобы сайт работал, аналитические и рекламные — чтобы понимать, какие страницы полезны.',
      more: 'Подробнее', all: 'Принять', none: 'Отклонить', settings: 'Настроить',
      necessary: 'Обязательные', necessaryNote: 'Нужны для работы сайта, отключить нельзя.',
      analytics: 'Аналитика', analyticsNote: 'Обезличенная статистика посещений.',
      ads: 'Реклама', adsNote: 'Оценка эффективности рекламы и ремаркетинг.',
      save: 'Сохранить выбор', back: 'Назад'
    },
    lv: {
      text: 'Izmantojam sīkdatnes: obligātās — lai vietne darbotos, analītiskās un reklāmas — lai saprastu, kuras lapas ir noderīgas.',
      more: 'Sīkāk', all: 'Piekrītu', none: 'Noraidīt', settings: 'Iestatīt',
      necessary: 'Obligātās', necessaryNote: 'Nepieciešamas vietnes darbībai, tās atslēgt nevar.',
      analytics: 'Analītika', analyticsNote: 'Anonīma apmeklējumu statistika.',
      ads: 'Reklāma', adsNote: 'Reklāmas efektivitātes novērtēšana un remārketings.',
      save: 'Saglabāt izvēli', back: 'Atpakaļ'
    },
    en: {
      text: 'We use cookies: essential ones to run the site, analytics and advertising ones to see which pages are useful.',
      more: 'Details', all: 'Accept', none: 'Reject', settings: 'Customise',
      necessary: 'Essential', necessaryNote: 'Required for the site to work, cannot be disabled.',
      analytics: 'Analytics', analyticsNote: 'Anonymous visit statistics.',
      ads: 'Advertising', adsNote: 'Measuring ad performance and remarketing.',
      save: 'Save choices', back: 'Back'
    }
  };

  function render() {
    var t = T[lang()];
    var box = document.createElement('div');
    box.className = 'cookie-bar';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Cookies');
    box.innerHTML =
      '<div class="cb-main">' +
        '<p>' + t.text + ' <a href="#terms">' + t.more + '</a></p>' +
        '<div class="cookie-btns">' +
          '<button type="button" class="c-set">' + t.settings + '</button>' +
          '<button type="button" class="c-none">' + t.none + '</button>' +
          '<button type="button" class="c-all">' + t.all + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="cb-prefs" hidden>' +
        '<label class="cb-row cb-fixed"><input type="checkbox" checked disabled>' +
          '<span><b>' + t.necessary + '</b><small>' + t.necessaryNote + '</small></span></label>' +
        '<label class="cb-row"><input type="checkbox" class="c-an">' +
          '<span><b>' + t.analytics + '</b><small>' + t.analyticsNote + '</small></span></label>' +
        '<label class="cb-row"><input type="checkbox" class="c-ad">' +
          '<span><b>' + t.ads + '</b><small>' + t.adsNote + '</small></span></label>' +
        '<div class="cookie-btns">' +
          '<button type="button" class="c-back">' + t.back + '</button>' +
          '<button type="button" class="c-save">' + t.save + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(box);
    requestAnimationFrame(function () { box.classList.add('show'); });

    var main = box.querySelector('.cb-main');
    var prefs = box.querySelector('.cb-prefs');

    function close(v) {
      save(v); apply(v);
      box.classList.remove('show');
      setTimeout(function () { box.remove(); }, 320);
    }
    box.querySelector('.c-all').onclick = function () { close({ analytics: true, ads: true }); };
    box.querySelector('.c-none').onclick = function () { close({ analytics: false, ads: false }); };
    box.querySelector('.c-set').onclick = function () { main.hidden = true; prefs.hidden = false; };
    box.querySelector('.c-back').onclick = function () { prefs.hidden = true; main.hidden = false; };
    box.querySelector('.c-save').onclick = function () {
      close({ analytics: box.querySelector('.c-an').checked, ads: box.querySelector('.c-ad').checked });
    };
  }

  var choice = read();
  if (choice) { apply(choice); return; }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
