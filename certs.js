/*
 * MAXAGIST — дипломы и сертификаты в лайтбоксе.
 *
 * Один источник данных для главной и рекламных посадочных: раньше список
 * жил инлайном в index.html, и любая вторая страница означала копию.
 *
 * Подключение: <script src="certs.js" defer></script> плюс кнопка с атрибутом
 * data-certs. Разметку лайтбокса скрипт создаёт сам, стили — в styles.css.
 */
(function () {
  'use strict';

  var opener = document.querySelector('[data-certs]');
  if (!opener) return;

  var LB_HTML =
    '<div class="lightbox" id="lightbox" aria-hidden="true">' +
      '<button class="lb-close" id="lb-close" aria-label="Закрыть">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 5l14 14M19 5 5 19"/></svg>' +
      '</button>' +
      '<button class="lb-nav lb-prev" id="lb-prev" aria-label="Предыдущий документ">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>' +
      '</button>' +
      '<button class="lb-nav lb-next" id="lb-next" aria-label="Следующий документ">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>' +
      '</button>' +
      '<figure class="lb-figure"><img id="lb-img" src="" alt=""><figcaption id="lb-caption"></figcaption></figure>' +
      '<div class="lb-dots" id="lb-dots"></div>' +
    '</div>';

  if (!document.getElementById('lightbox')) document.body.insertAdjacentHTML('beforeend', LB_HTML);

  var CERTS = [
    { src:'photos/certs/cert-itec.jpg', title:'ITEC Level 3 Diploma in Complementary Therapies', meta:'№ 96542/354/93012/93578', desc:'Международный британский диплом: массаж тела, рефлексология, ароматерапия, анатомия и физиология.' },
    { src:'photos/certs/cert-spa-specialist.jpg', title:'SPA SPECIĀLISTS', meta:'Nr. 02-18/1050', desc:'Латвия, SPA School — 1060 часов: SPA-процедуры, работа с клиентом, основы здорового образа жизни.' },
    { src:'photos/certs/cert-classic-massage.jpg', title:'Классический массаж', meta:'№ 781801049275', desc:'Санкт-Петербург, 72 часа — база техник, на которой строятся все остальные виды массажа.' },
    { src:'photos/certs/cert-nursing.jpg', title:'Сертификат специалиста «Сестринское дело»', meta:'№ 0878180776837', desc:'Документ гос. образца — допуск к медицинской деятельности, понимание противопоказаний и безопасности.' },
    { src:'photos/certs/cert-fitness-instructor.jpg', title:'Инструктор фитнеса, бодибилдинга и оздоровительной физической культуры', meta:'№ 08321', desc:'Колледж Вейдера — как тело работает под нагрузкой, полезно для понимания мышечных зажимов.' },
    { src:'photos/certs/cert-personal-trainer.jpg', title:'Персональный тренер по бодибилдингу и фитнесу', meta:'№ 3375', desc:'Углублённый курс — индивидуальная работа с телом и восстановление после нагрузок.' },
    { src:'photos/certs/cert-medical-diploma.jpg', title:'Диплом о среднем медицинском образовании', meta:'№ 117818 0348193', desc:'Квалификация «Медицинский брат», специальность «Сестринское дело» — полное медицинское образование.' },
    { src:'photos/certs/cert-thai-massage.jpg', title:'Тайский (йога) массаж на столе', meta:'19.05.2015', desc:'Мастер-класс по традиционному тайскому массажу и массажу стоп.' },
    { src:'photos/certs/cert-fascia.jpg', title:'«Работа с фасцией и другой соединительной тканью»', meta:'№ 371', desc:'Авторский курс «Больше чем массаж» — техника глубокой работы с хроническими зажимами.' },
    { src:'photos/certs/cert-chiro-body.jpg', title:'Хиромассаж тела. Базовый курс', meta:'08–11.07.2019', desc:'Школа Magistra, 40 часов — техника ручного массажа тела повышенной точности.' },
    { src:'photos/certs/cert-chiro-face.jpg', title:'Хиромассаж лица. Базовый курс', meta:'02–05.09.2020', desc:'Школа Magistra, 40 часов — массаж лица для расслабления и лифтинг-эффекта.' }
  ];
  var lightbox = document.getElementById('lightbox');
  var lbImg = document.getElementById('lb-img');
  var lbCaption = document.getElementById('lb-caption');
  var lbDots = document.getElementById('lb-dots');
  let lbIndex = 0;

  function lbRender(){
    const c = CERTS[lbIndex];
    lbImg.src = c.src; lbImg.alt = c.title;
    lbCaption.innerHTML = c.title
      + (c.meta ? `<span class="lb-meta">${c.meta}</span>` : '')
      + (c.desc ? `<span class="lb-desc">${c.desc}</span>` : '');
    lbDots.innerHTML = CERTS.map((_, i) =>
      `<button class="lb-dot${i === lbIndex ? ' active' : ''}" data-i="${i}" aria-label="Сертификат ${i + 1} из ${CERTS.length}"></button>`
    ).join('');
  }
  function lbOpen(i){
    lbIndex = i; lbRender();
    lightbox.classList.add('open'); lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function lbClose(){
    lightbox.classList.remove('open'); lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  function lbNav(delta){
    lbIndex = (lbIndex + delta + CERTS.length) % CERTS.length; lbRender();
  }

  document.querySelectorAll('[data-certs]').forEach(function (el) { el.onclick = function () { lbOpen(0); }; });
  document.getElementById('lb-close').onclick = lbClose;
  document.getElementById('lb-prev').onclick = () => lbNav(-1);
  document.getElementById('lb-next').onclick = () => lbNav(1);
  lbDots.onclick = e => { const b = e.target.closest('.lb-dot'); if (b) { lbIndex = +b.dataset.i; lbRender(); } };
  lightbox.addEventListener('click', e => { if (e.target === lightbox) lbClose(); });
  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') lbClose();
    if (e.key === 'ArrowLeft') lbNav(-1);
    if (e.key === 'ArrowRight') lbNav(1);
  });
  let lbTouchX = null;
  lightbox.addEventListener('touchstart', e => { lbTouchX = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', e => {
    if (lbTouchX === null) return;
    const dx = e.changedTouches[0].clientX - lbTouchX;
    if (Math.abs(dx) > 40) lbNav(dx > 0 ? -1 : 1);
    lbTouchX = null;
  }, { passive: true });
})();
