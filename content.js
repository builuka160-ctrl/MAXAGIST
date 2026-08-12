/*
 * MAXAGIST — подстановка редактируемого контента (мини-CMS).
 * Тянет переопределения из Supabase (таблица site_content, публичное чтение) и
 * накладывает их на элементы с атрибутом data-edit="<key>".
 *
 *   <h1 data-edit="hero.h1">…текст по умолчанию…</h1>
 *   data-edit-html — если значение содержит HTML.
 *
 * Значение хранится как {ru, lv, en}; берётся язык страницы, фолбэк — ru.
 * Наложение НЕ разрушающее: если для ключа нет значения, остаётся текст из i18n.
 * Правит контент Telegram Mini App (вкладка «Редактор») через Edge Function admin-api.
 */
(function () {
  'use strict';
  var URL = window.MX_SUPABASE_URL, KEY = window.MX_SUPABASE_KEY;
  if (!URL || !KEY) return;

  var MAP = {};

  function lang() {
    try { var l = localStorage.getItem('lang'); if (l) return l; } catch (e) {}
    return (document.documentElement.lang || 'ru').slice(0, 2);
  }

  function apply() {
    var lng = lang();
    document.querySelectorAll('[data-edit]').forEach(function (el) {
      var entry = MAP[el.getAttribute('data-edit')];
      if (!entry) return;
      var val = entry[lng] || entry.ru || entry.en || entry.lv;
      if (val == null || val === '') return;
      if (el.hasAttribute('data-edit-html')) el.innerHTML = val;
      else el.textContent = val;
    });
  }
  window.__applyContentOverrides = apply;

  fetch(URL + '/rest/v1/site_content?select=key,value', {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY },
  })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (rows) {
      (rows || []).forEach(function (row) { MAP[row.key] = row.value || {}; });
      apply();
    })
    .catch(function () {});
})();
