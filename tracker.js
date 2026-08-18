/*
 * MAXAGIST — лёгкий трекер поведения (privacy-first, без внешних зависимостей).
 *
 * Что собирает:
 *   • pageview   — заход на страницу: путь, заголовок, referrer, UTM, язык, экран, устройство
 *   • click      — клик по ссылке/кнопке: что нажали (label) и куда ведёт (href)
 *   • outbound   — клик по внешней ссылке (Altegio, Telegram, WhatsApp, tel:)
 *   • scroll     — глубина прокрутки (вехи 25/50/75/90/100 %)
 *   • section    — какие секции страницы реально попали в поле зрения
 *   • form_submit— отправка формы заявки (БЕЗ содержимого полей)
 *   • heartbeat  — активное время каждые 15 c (чтобы не потерять сессию на мобильных)
 *   • pageend    — уход со страницы: активное и общее время
 *
 * Приватность:
 *   • не собирает персональные данные (имена, телефоны, текст полей) — только метаданные кликов;
 *   • ID посетителя/сессии — случайные, first-party (localStorage), не для кросс-сайт слежки;
 *   • уважает Do Not Track и Global Privacy Control;
 *   • есть выключатель: localStorage['mx_track_off'] = '1'  (или ?mxtrack=off в URL).
 *
 * Подключение бэкенда:
 *   Укажите ENDPOINT ниже (или задайте window.MX_TRACK_ENDPOINT до загрузки скрипта) —
 *   URL Supabase Edge Function `track` из папки tracker/. Пока ENDPOINT пуст, трекер
 *   работает в debug-режиме: события пишутся в console и в window.__mxTrack (без сети).
 */
(function () {
  'use strict';

  var ENDPOINT = window.MX_TRACK_ENDPOINT || ''; // '' => debug-режим, без отправки
  var SITE_ID  = 'maxagist';
  var DEBUG    = /[?&]mxtrack=debug\b/.test(location.search);

  /* --- уважаем отказ от трекинга --- */
  function optedOut() {
    try {
      if (localStorage.getItem('mx_track_off') === '1') return true;
      if (/[?&]mxtrack=off\b/.test(location.search)) { localStorage.setItem('mx_track_off', '1'); return true; }
    } catch (e) {}
    var dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
    if (dnt === '1' || dnt === 'yes' || navigator.globalPrivacyControl === true) return true;
    return false;
  }
  if (optedOut()) { if (DEBUG) console.info('[mx-track] отключён (DNT/opt-out)'); return; }

  /* --- утилиты --- */
  function uid() {
    try { return crypto.randomUUID(); }
    catch (e) { return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  }
  function ls(get, key, val) {
    try { return get ? localStorage.getItem(key) : (localStorage.setItem(key, val), val); }
    catch (e) { return null; }
  }

  var NOW = Date.now();
  var SESSION_GAP = 30 * 60 * 1000; // 30 минут неактивности = новая сессия

  // visitor id — стабильный анонимный (новый vs вернувшийся)
  var visitorId = ls(1, 'mx_uid') || ls(0, 'mx_uid', uid());
  var isNewVisitor = !ls(1, 'mx_uid_seen');
  ls(0, 'mx_uid_seen', '1');

  // session id — обновляется после долгой паузы
  var lastSeen = parseInt(ls(1, 'mx_seen') || '0', 10);
  var sessionId = ls(1, 'mx_sid');
  if (!sessionId || !lastSeen || (NOW - lastSeen) > SESSION_GAP) { sessionId = uid(); ls(0, 'mx_sid', sessionId); }
  ls(0, 'mx_seen', String(NOW));

  var viewId = uid();

  /* --- контекст (общий для всех событий страницы) --- */
  function utm() {
    var q = new URLSearchParams(location.search), o = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'].forEach(function (k) {
      var v = q.get(k); if (v) o[k.replace('utm_', '')] = v.slice(0, 120);
    });
    return o;
  }
  var CTX = {
    site: SITE_ID,
    uid: visitorId,
    sid: sessionId,
    vid: viewId,
    path: location.pathname + location.hash,
    title: document.title,
    ref: document.referrer || '',
    utm: utm(),
    lang: (document.documentElement.lang || 'ru'),
    scr: screen.width + 'x' + screen.height + '@' + (window.devicePixelRatio || 1),
    vp: innerWidth + 'x' + innerHeight,
    mobile: matchMedia('(pointer:coarse)').matches || /Mobi|Android/i.test(navigator.userAgent),
    tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || ''),
    newVisitor: isNewVisitor
  };

  /* --- очередь и отправка --- */
  var queue = [];
  window.__mxTrack = window.__mxTrack || [];
  var flushTimer = null;

  function send(events, useBeacon) {
    var payload = { ctx: CTX, ts: Date.now(), events: events };
    if (DEBUG) console.debug('[mx-track] flush', payload);
    window.__mxTrack.push.apply(window.__mxTrack, events);
    if (window.__mxTrack.length > 100) window.__mxTrack.splice(0, window.__mxTrack.length - 100);
    if (!ENDPOINT) return; // debug-режим: без сети
    var body = JSON.stringify(payload);
    try {
      if (useBeacon && navigator.sendBeacon) {
        // text/plain — CORS-safelisted: без preflight (надёжно при выгрузке),
        // сервер парсит тело как JSON независимо от типа.
        navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain' }));
        return;
      }
    } catch (e) {}
    try {
      fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true, mode: 'cors' })
        .catch(function () {});
    } catch (e) {}
  }
  function flush(useBeacon) {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    if (!queue.length) return;
    var batch = queue.splice(0, queue.length);
    send(batch, useBeacon);
  }
  function track(type, data) {
    var ev = { t: type, ts: Date.now(), rel: Date.now() - NOW };
    if (data) for (var k in data) ev[k] = data[k];
    if (DEBUG) console.debug('[mx-track]', ev.t, ev.label || ev.section || (ev.depth != null ? ev.depth + '%' : '') || '');
    queue.push(ev);
    if (queue.length >= 12) flush(false);
    else if (!flushTimer) flushTimer = setTimeout(function () { flush(false); }, 3000);
  }

  /* --- метка кликнутого элемента: "что нажали" --- */
  function labelFor(el) {
    var node = el.closest('[data-track],a,button');
    if (!node) return null;
    if (node.hasAttribute('data-track')) return { label: node.getAttribute('data-track'), href: node.getAttribute('href') || '' };
    var id = node.id || '';
    var href = node.getAttribute('href') || '';
    var label;
    if (/^wa-/.test(id)) label = 'whatsapp:' + id.replace('wa-', '');
    else if (/wa\.me|whatsapp/i.test(href)) label = 'whatsapp';
    else if (/^tel:/i.test(href)) label = 'call:phone';
    else if (/t\.me|telegram/i.test(href)) label = 'telegram';
    else if (/alteg\.io|altegio/i.test(href)) label = 'booking:altegio';
    else if (id === 'open-certs') label = 'gallery:open';
    else if (node.closest('#lang-switch,.langs,.lang')) label = 'lang:' + (node.getAttribute('data-lang') || (node.textContent || '').trim().toLowerCase()).slice(0, 6);
    else if (node.classList.contains('fmt')) label = 'format:' + (href.replace(/[#?].*$/, '').replace(/\.html$/, '') || (node.querySelector('h3') ? node.querySelector('h3').textContent.trim() : 'card')).slice(0, 40);
    else if (id) label = id;
    else {
      var txt = (node.getAttribute('aria-label') || node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
      label = (node.tagName.toLowerCase()) + (txt ? ':' + txt : (href ? ':' + href.slice(0, 40) : ''));
    }
    return { label: label, href: href };
  }
  function isOutbound(href) {
    if (!href) return false;
    if (/^(tel:|mailto:)/i.test(href)) return true;
    try { return new URL(href, location.href).host !== location.host; } catch (e) { return false; }
  }

  /* ================= сбор событий ================= */

  // 1) pageview
  track('pageview');

  // 2) клики
  document.addEventListener('click', function (e) {
    var info = labelFor(e.target);
    if (!info || !info.label) return;
    track(isOutbound(info.href) ? 'outbound' : 'click', { label: info.label, href: (info.href || '').slice(0, 200) });
  }, true);
  // средний клик / открытие в новой вкладке
  document.addEventListener('auxclick', function (e) {
    if (e.button !== 1) return;
    var info = labelFor(e.target);
    if (info && info.label) track('click', { label: info.label, href: (info.href || '').slice(0, 200), aux: 1 });
  }, true);

  // 3) отправка формы заявки — только факт, без данных полей
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f && (f.id === 'lead-form' || f.matches('form'))) track('form_submit', { form: f.id || 'form' });
  }, true);

  // 4) глубина скролла
  var marks = [25, 50, 75, 90, 100], hit = {};
  function onScroll() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - innerHeight;
    var pct = max > 0 ? Math.min(100, Math.round((doc.scrollTop || window.pageYOffset) / max * 100)) : 100;
    for (var i = 0; i < marks.length; i++) {
      if (pct >= marks[i] && !hit[marks[i]]) { hit[marks[i]] = 1; track('scroll', { depth: marks[i] }); }
    }
  }
  var scrollRAF = 0;
  addEventListener('scroll', function () {
    if (scrollRAF) return;
    scrollRAF = requestAnimationFrame(function () { scrollRAF = 0; onScroll(); });
  }, { passive: true });

  // 5) видимость секций
  try {
    var seen = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && en.intersectionRatio >= 0.5) {
          var id = en.target.id || en.target.className;
          if (id && !seen[id]) { seen[id] = 1; track('section', { section: String(id).slice(0, 40) }); }
        }
      });
    }, { threshold: [0.5] });
    document.querySelectorAll('section[id], section[class]').forEach(function (s) { io.observe(s); });
  } catch (e) {}

  /* ================= время на странице ================= */
  var activeMs = 0, lastResume = document.visibilityState === 'visible' ? Date.now() : 0;
  function accrue() { if (lastResume) { activeMs += Date.now() - lastResume; lastResume = 0; } }
  function resume() { if (!lastResume && document.visibilityState === 'visible') lastResume = Date.now(); }
  function activeNow() { return activeMs + (lastResume ? Date.now() - lastResume : 0); }

  var hbTimer = setInterval(function () {
    if (document.visibilityState === 'visible') track('heartbeat', { active_ms: activeNow(), total_ms: Date.now() - NOW });
  }, 15000);

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { accrue(); flush(true); }
    else resume();
  });
  addEventListener('focus', resume);
  addEventListener('blur', accrue);

  function finalize() {
    accrue();
    clearInterval(hbTimer);
    track('pageend', { active_ms: activeMs, total_ms: Date.now() - NOW, max_depth: Math.max.apply(null, [0].concat(Object.keys(hit).map(Number))) });
    flush(true);
  }
  addEventListener('pagehide', finalize);
  addEventListener('beforeunload', finalize);

  if (DEBUG) console.info('[mx-track] активен', CTX, ENDPOINT ? '→ ' + ENDPOINT : '(debug: без сети)');
})();
