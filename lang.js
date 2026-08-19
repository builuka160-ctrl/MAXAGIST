/*
 * MAXAGIST — выбор языка для рекламного трафика.
 *
 * Порядок приоритетов: ?lang= из URL → сохранённый выбор → язык браузера.
 * Параметр из URL нужен для Google Ads: объявление на латышском должно
 * открывать латышскую страницу сразу, без экрана выбора языка и без пауз.
 *
 * Подключать СИНХРОННО в <head>, до инлайн-скриптов страницы: они читают
 * window.MX_LANG и на его основе сразу рисуют нужный язык.
 *
 * <html lang> переписывается только на страницах с реальными переводами
 * (атрибут data-i18n-page). На одноязычных страницах ?lang= лишь запоминает
 * выбор для остальных страниц — объявлять русский текст латышским нельзя.
 */
(function () {
  'use strict';

  var SUPPORTED = ['ru', 'lv', 'en'];

  function fromUrl() {
    try {
      var v = new URLSearchParams(location.search).get('lang');
      if (!v) return null;
      v = String(v).trim().toLowerCase().slice(0, 2);
      return SUPPORTED.indexOf(v) >= 0 ? v : null;
    } catch (e) { return null; }
  }
  function fromStorage() {
    try {
      var v = localStorage.getItem('lang');
      return SUPPORTED.indexOf(v) >= 0 ? v : null;
    } catch (e) { return null; }
  }
  function fromBrowser() {
    var b = (navigator.language || '').toLowerCase();
    return b.indexOf('lv') === 0 ? 'lv' : b.indexOf('en') === 0 ? 'en' : 'ru';
  }

  var urlLang = fromUrl();
  var lang = urlLang || fromStorage() || fromBrowser();

  if (urlLang) { try { localStorage.setItem('lang', urlLang); } catch (e) {} }

  if (document.documentElement.hasAttribute('data-i18n-page')) {
    document.documentElement.lang = lang;
  }

  window.MX_LANG = lang;
  window.MX_LANG_FROM_URL = !!urlLang;
  window.MX_LANGS = SUPPORTED;

  /*
   * Разметка написана по-русски, остальные языки подставляет i18n в конце body.
   * Чтобы посетитель из латышского объявления не увидел, как заголовок
   * перещёлкивается с русского, на эти доли секунды прячем содержимое.
   * visibility (а не display/opacity) — чтобы не дёргалась вёрстка.
   * Таймер-страховка снимает скрытие, даже если i18n почему-то не отработает.
   */
  if (lang !== 'ru' && document.documentElement.hasAttribute('data-i18n-page')) {
    var root = document.documentElement;
    root.classList.add('mx-lang-pending');
    var reveal = function () { root.classList.remove('mx-lang-pending'); };
    window.mxLangReady = reveal;
    setTimeout(reveal, 700);
  } else {
    window.mxLangReady = function () {};
  }

  /*
   * Переключатель языка на странице меняет ТОЛЬКО параметр lang и только если
   * он уже есть в адресе: utm_*, gclid, gbraid, wbraid, fbclid и msclkid
   * обязаны уцелеть, иначе ломается атрибуция Ads. Чистый URL не засоряем.
   */
  window.mxSetLangParam = function (next) {
    if (SUPPORTED.indexOf(next) < 0) return;
    try {
      var url = new URL(location.href);
      if (!url.searchParams.has('lang')) return;
      if (url.searchParams.get('lang') === next) return;
      url.searchParams.set('lang', next);
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch (e) { /* старый браузер — не критично */ }
  };
})();
