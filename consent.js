/* MAXAGIST consent manager — EEA-oriented Consent Mode v2 + delayed Meta Pixel. */
(function () {
  'use strict';

  var STORE_KEY = 'mx_consent_v1';
  var GA4_ID = 'G-D7B249WJS0';
  var ADS_ID = 'AW-18386499497';
  var META_ID = '1383733323705616';

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  // Consent Mode must be set before any Google tag config calls.
  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    analytics_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });
  window.gtag('set', 'ads_data_redaction', true);
  window.gtag('set', 'url_passthrough', true);
  window.gtag('js', new Date());
  window.gtag('config', GA4_ID);
  window.gtag('config', ADS_ID);

  var gs = document.createElement('script');
  gs.async = true;
  gs.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_ID);
  document.head.appendChild(gs);

  var metaLoaded = false;
  function loadMeta() {
    if (metaLoaded) return;
    metaLoaded = true;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
      s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', META_ID);
    window.fbq('track', 'PageView');
  }

  function readChoice() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      var v = JSON.parse(raw);
      if (!v || v.version !== 1) return null;
      return v;
    } catch (_e) { return null; }
  }
  function saveChoice(v) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(v)); } catch (_e) {}
  }
  function applyChoice(choice, persist) {
    var analytics = !!choice.analytics;
    var marketing = !!choice.marketing;
    // Honour Global Privacy Control by never enabling advertising storage/personalisation.
    if (navigator.globalPrivacyControl === true) marketing = false;
    window.gtag('consent', 'update', {
      analytics_storage: analytics ? 'granted' : 'denied',
      ad_storage: marketing ? 'granted' : 'denied',
      ad_user_data: marketing ? 'granted' : 'denied',
      ad_personalization: marketing ? 'granted' : 'denied'
    });
    if (marketing) loadMeta();
    if (persist) saveChoice({ version: 1, analytics: analytics, marketing: marketing, ts: Date.now() });
    window.dispatchEvent(new CustomEvent('mx:consent', { detail: { analytics: analytics, marketing: marketing } }));
  }

  var saved = readChoice();
  if (saved) applyChoice(saved, false);

  var TXT = {
    ru: {
      title: 'Настройки конфиденциальности',
      text: 'Мы используем необходимые технологии для работы сайта. Аналитика и рекламные технологии включаются только по вашему выбору.',
      accept: 'Принять', reject: 'Отклонить', settings: 'Настроить', save: 'Сохранить выбор',
      analytics: 'Аналитика', analyticsText: 'Помогает понять, как используется сайт, через Google Analytics.',
      marketing: 'Реклама', marketingText: 'Google Ads и Meta Pixel для измерения рекламы и ремаркетинга.',
      necessary: 'Необходимые', necessaryText: 'Нужны для языка, форм, безопасности и основных функций сайта.',
      privacy: 'Политика конфиденциальности', back: 'Назад'
    },
    lv: {
      title: 'Privātuma iestatījumi',
      text: 'Vietnes darbībai izmantojam nepieciešamās tehnoloģijas. Analītika un reklāmas tehnoloģijas tiek ieslēgtas tikai pēc jūsu izvēles.',
      accept: 'Pieņemt', reject: 'Noraidīt', settings: 'Iestatīt', save: 'Saglabāt izvēli',
      analytics: 'Analītika', analyticsText: 'Palīdz saprast vietnes izmantošanu ar Google Analytics.',
      marketing: 'Reklāma', marketingText: 'Google Ads un Meta Pixel reklāmas mērīšanai un remarketingam.',
      necessary: 'Nepieciešamās', necessaryText: 'Nepieciešamas valodai, formām, drošībai un vietnes pamatfunkcijām.',
      privacy: 'Privātuma politika', back: 'Atpakaļ'
    },
    en: {
      title: 'Privacy settings',
      text: 'We use necessary technologies to operate the site. Analytics and advertising technologies are enabled only with your choice.',
      accept: 'Accept', reject: 'Reject', settings: 'Customize', save: 'Save choices',
      analytics: 'Analytics', analyticsText: 'Helps us understand site usage through Google Analytics.',
      marketing: 'Advertising', marketingText: 'Google Ads and Meta Pixel for ad measurement and remarketing.',
      necessary: 'Necessary', necessaryText: 'Required for language, forms, security and core site functions.',
      privacy: 'Privacy policy', back: 'Back'
    }
  };
  function lang() {
    var q = new URLSearchParams(location.search).get('lang');
    if (/^(ru|lv|en)$/.test(q || '')) return q;
    var h = (document.documentElement.lang || '').slice(0,2).toLowerCase();
    return TXT[h] ? h : 'ru';
  }

  var root, panel, details;
  function injectStyle() {
    if (document.getElementById('mx-consent-style')) return;
    var s = document.createElement('style'); s.id = 'mx-consent-style';
    s.textContent = '.mx-consent{position:fixed;inset:0;z-index:10000;display:none;align-items:flex-end;justify-content:center;padding:18px;background:rgba(5,4,3,.46)}.mx-consent.show{display:flex}.mx-consent-card{width:min(720px,100%);background:#211c17;color:#ece4d7;border:1px solid rgba(228,201,162,.28);border-radius:20px;padding:22px;box-shadow:0 24px 70px rgba(0,0,0,.55);font:400 15px/1.5 Karla,system-ui,sans-serif}.mx-consent h2{font:500 27px/1.1 "Cormorant Garamond",Georgia,serif;margin:0 0 8px}.mx-consent p{margin:0;color:#b7aa99}.mx-consent-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:18px}.mx-consent button,.mx-consent a.mx-cbtn{border:1px solid rgba(228,201,162,.28);background:rgba(255,255,255,.05);color:#ece4d7;border-radius:999px;padding:11px 17px;font:600 14px Karla,system-ui;cursor:pointer;text-decoration:none}.mx-consent button.primary{background:#c7a17a;color:#17120d;border-color:#c7a17a}.mx-consent .choices{display:grid;gap:10px;margin-top:15px}.mx-consent .choice{display:grid;grid-template-columns:1fr auto;gap:12px;padding:12px 14px;border:1px solid rgba(228,201,162,.16);border-radius:13px}.mx-consent .choice b{display:block}.mx-consent .choice small{display:block;color:#9a8f80;margin-top:3px}.mx-consent input{width:21px;height:21px;accent-color:#c7a17a}.mx-consent .fixed{opacity:.65}.mx-consent .privacy{display:inline-block;margin-top:13px;color:#c7a17a;font-size:13px}.mx-consent-details{display:none}.mx-consent.details .mx-consent-main{display:none}.mx-consent.details .mx-consent-details{display:block}@media(max-width:560px){.mx-consent{padding:10px}.mx-consent-card{padding:18px}.mx-consent-actions>*{flex:1;text-align:center}}';
    s.textContent += '.mx-consent{padding:22px;background:rgba(8,6,5,.58);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}.mx-consent-card{width:min(680px,100%);background:linear-gradient(155deg,#241f19,#191612);border-color:rgba(228,201,162,.2);border-radius:24px;padding:25px 26px 23px;box-shadow:0 32px 90px -30px rgba(0,0,0,.95),0 1px 0 rgba(255,255,255,.06) inset}.mx-consent h2{font-size:31px;font-weight:400;letter-spacing:-.01em}.mx-consent p{max-width:570px;color:#a99d8e;line-height:1.55}.mx-consent-actions{gap:8px;margin-top:20px}.mx-consent button{min-height:44px;padding:10px 17px}.mx-consent button.primary{background:linear-gradient(180deg,#e0c39f,#c7a17a);box-shadow:0 12px 28px -18px rgba(199,161,120,.9)}.mx-consent .choice{padding:14px 15px;background:rgba(255,255,255,.025)}.mx-consent .privacy{color:#d2ad84;text-underline-offset:3px}@media(max-width:560px){.mx-consent{padding:8px;align-items:flex-end}.mx-consent-card{border-radius:22px 22px 14px 14px;padding:21px 18px 16px}.mx-consent h2{font-size:27px}.mx-consent-actions{display:grid;grid-template-columns:1fr 1fr}.mx-consent-actions .primary{grid-column:1/-1;grid-row:1}.mx-consent-actions>*{width:100%}.mx-consent .choices{gap:8px}}';
    document.head.appendChild(s);
  }
  function build() {
    if (root) return;
    injectStyle();
    root = document.createElement('div'); root.className = 'mx-consent'; root.setAttribute('role','dialog'); root.setAttribute('aria-modal','true');
    root.innerHTML = '<div class="mx-consent-card"><div class="mx-consent-main"><h2 data-c="title"></h2><p data-c="text"></p><a class="privacy" href="privacy.html" data-c="privacy"></a><div class="mx-consent-actions"><button type="button" data-act="reject" data-c="reject"></button><button type="button" data-act="settings" data-c="settings"></button><button type="button" class="primary" data-act="accept" data-c="accept"></button></div></div><div class="mx-consent-details"><h2 data-c="title"></h2><div class="choices"><label class="choice fixed"><span><b data-c="necessary"></b><small data-c="necessaryText"></small></span><input type="checkbox" checked disabled></label><label class="choice"><span><b data-c="analytics"></b><small data-c="analyticsText"></small></span><input id="mx-consent-analytics" type="checkbox"></label><label class="choice"><span><b data-c="marketing"></b><small data-c="marketingText"></small></span><input id="mx-consent-marketing" type="checkbox"></label></div><a class="privacy" href="privacy.html" data-c="privacy"></a><div class="mx-consent-actions"><button type="button" data-act="back" data-c="back"></button><button type="button" class="primary" data-act="save" data-c="save"></button></div></div></div>';
    document.body.appendChild(root);
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var a = b.getAttribute('data-act');
      if (a === 'accept') { applyChoice({analytics:true,marketing:true}, true); close(); }
      else if (a === 'reject') { applyChoice({analytics:false,marketing:false}, true); close(); }
      else if (a === 'settings') { root.classList.add('details'); syncChecks(); }
      else if (a === 'back') root.classList.remove('details');
      else if (a === 'save') {
        applyChoice({analytics:document.getElementById('mx-consent-analytics').checked,marketing:document.getElementById('mx-consent-marketing').checked}, true); close();
      }
    });
    render();
  }
  function syncChecks() {
    var v = readChoice() || {analytics:false,marketing:false};
    var ac = document.getElementById('mx-consent-analytics'); var mc = document.getElementById('mx-consent-marketing');
    if (ac) ac.checked = !!v.analytics;
    if (mc) { mc.checked = !!v.marketing && navigator.globalPrivacyControl !== true; mc.disabled = navigator.globalPrivacyControl === true; }
  }
  function render() {
    if (!root) return; var t = TXT[lang()];
    root.querySelectorAll('[data-c]').forEach(function(el){ var k=el.getAttribute('data-c'); if(t[k]) el.textContent=t[k]; });
    root.querySelectorAll('a.privacy').forEach(function(a){ var u=new URL(a.getAttribute('href'), location.href); u.searchParams.set('lang',lang()); a.setAttribute('href',u.pathname+u.search); });
  }
  function open() { build(); root.classList.remove('details'); syncChecks(); render(); root.classList.add('show'); }
  function close() { if (root) root.classList.remove('show','details'); }

  window.MXConsent = { open: open, current: readChoice, apply: applyChoice };
  document.addEventListener('click', function(e){ if(e.target.closest('[data-consent-settings]')) { e.preventDefault(); open(); } });
  window.addEventListener('mx:langchange', render);
  document.addEventListener('DOMContentLoaded', function(){ build(); if(!saved) open(); });
})();
