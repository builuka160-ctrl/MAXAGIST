/* For legacy RU-only pages: honour ?lang= by redirecting LV/EN to the local multilingual landing. */
(function(){
  var p = new URLSearchParams(location.search); var l = p.get('lang');
  if (!/^(ru|lv|en)$/.test(l || '')) return;
  try { localStorage.setItem('lang', l); } catch (_e) {}
  document.documentElement.lang = l;
  if (l !== 'ru') {
    p.set('lang', l);
    location.replace('massage-pinki-saliena.html?' + p.toString());
  }
})();
