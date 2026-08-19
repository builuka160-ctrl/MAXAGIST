/* MAXAGIST — GA4 / Google Ads / Meta event taxonomy.
 * Google Ads lead conversion fires only after the backend confirms a saved lead.
 * WhatsApp clicks are interactions, not leads.
 */
(function () {
  'use strict';
  var AW_ID = 'AW-18386499497';
  var AW_LABELS = { lead: 'e3XgCM2BiOIcEKnvrr9E', phone: '' };
  var leadSuccessSent = false;

  function send(name, params) {
    params = params || {};
    try {
      if (typeof window.gtag === 'function') window.gtag('event', name, params);
      else (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: name }, params));
    } catch (_e) {}
  }
  function adConversion(key, params) {
    var label = AW_LABELS[key]; if (!label) return;
    try { if (typeof window.gtag === 'function') window.gtag('event', 'conversion', Object.assign({ send_to: AW_ID + '/' + label }, params || {})); } catch (_e) {}
  }
  function fb(name, params, custom) {
    try { if (typeof window.fbq === 'function') window.fbq(custom ? 'trackCustom' : 'track', name, params || {}); } catch (_e) {}
  }
  function hrefOf(el) { var a = el.closest && el.closest('a[href]'); return a ? (a.getAttribute('href') || '') : ''; }
  function isWhatsApp(el, href) {
    if (/wa\.me|api\.whatsapp|whatsapp\.com/i.test(href)) return true;
    return !!(el.closest && (el.closest('#wa-fab') || el.closest('[data-wa]')));
  }
  function sourceFor(el) {
    var n = el.closest && el.closest('[data-track]');
    if (n && n.getAttribute('data-track')) return n.getAttribute('data-track');
    var a = el.closest && el.closest('[id]');
    if (a && /^wa-/.test(a.id)) return 'whatsapp:' + a.id.replace(/^wa-/, '');
    return 'whatsapp';
  }

  document.addEventListener('click', function (ev) {
    var el = ev.target; if (!el || !el.closest) return;
    var href = hrefOf(el);
    if (isWhatsApp(el, href)) {
      var src = sourceFor(el);
      send('whatsapp_click', { method: 'whatsapp', source: src, link_url: href || 'wa:js', page_location: location.pathname });
      fb('Contact', { content_name: src });
      return;
    }
    if (/^tel:/i.test(href)) {
      send('phone_click', { link_url: href, page_location: location.pathname });
      adConversion('phone');
      fb('Contact', { content_name: 'phone' });
      return;
    }
    if (/alteg\.io|altegio/i.test(href)) {
      send('booking_click', { link_url: href, page_location: location.pathname });
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
    }
  }, true);

  document.addEventListener('lead:success', function (ev) {
    if (leadSuccessSent) return; // protects Ads/GA4 against duplicate custom-event firing
    leadSuccessSent = true;
    var method = ev && ev.detail && ev.detail.method || 'form';
    send('lead_success', { method: method, page_location: location.pathname });
    send('generate_lead', { method: method, page_location: location.pathname });
    // No fabricated value/currency: Google Ads conversion action decides its own default value.
    adConversion('lead');
    fb('Lead', { content_name: method });
  });
})();
