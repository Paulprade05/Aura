/* ==========================================================================
   AURA — auraPad (assets/js/pages/aurapad.js)
   Pinta desde el catálogo (data.js) lo que la página no escribe a mano, para
   que al actualizar la gama todo siga cuadrando:
     - [data-aurapad-family="description"] → family.description
     - [data-aurapad-buy="ID"]              → enlace, verbo («Comprar»,
       «Reservar» o «Configurar», según la disponibilidad) y nombre del
       modelo: el enlace del último texto de la escena con scroll (los
       «Comprar auraPad» de héroe, barra local y llamada final son del
       sistema: [data-aura-buy="aurapad"]).
     - [data-aurapad-compat="Accesorio"]    → «Compatible con …»: los modelos
       cuyo specs.accesorios lo nombran (si ninguno lo nombra, se oculta)
     - [data-aurapad-rec="ID"]              → modelo recomendado en el pie de
       cada hoja «Ver cómo» (las del carrusel de auraPadOS y la de cámaras):
       nombre, lema, disponibilidad, precio, cuota y acción
   Lo demás lo pone el sistema desde el catálogo: tarjetas de modelo, muestras
   de color de las exhibiciones, tabla comparativa, ventajas de la tienda y
   precio «Desde». Si un ID ya no está en la gama, se usa el primer modelo
   (rank 1). Si falta un dato, se conserva el texto genérico del HTML.
   ========================================================================== */
(function () {
  'use strict';

  var AURA = window.AURA;
  if (!AURA || !AURA.catalog || !AURA.fmt) { return; }

  var FAMILY = 'aurapad';
  var catalog = AURA.catalog;
  var fmt = AURA.fmt;
  var esc = (AURA.html && AURA.html.esc) || function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var products = catalog.products(FAMILY) || [];
  var data = AURA.data || {};

  function each(selector, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(selector), function (el) {
      try { fn(el); } catch (e) { /* un dato raro no debe romper el resto de la página */ }
    });
  }

  /* Comparación sin acentos ni mayúsculas. */
  function norm(text) {
    var s = String(text || '').toLowerCase();
    return s.normalize ? s.normalize('NFD').replace(/[̀-ͯ]/g, '') : s;
  }

  /* Nombre de modelo que no se parte en dos líneas («auraPad Pro 11″»). */
  function keep(name) { return String(name || '').replace(/ /g, ' '); }

  /* «a», «a y b», «a, b y c». */
  function joinList(names) {
    names = names.map(keep);
    if (names.length < 2) { return names.join(''); }
    return names.slice(0, -1).join(', ') + ' y ' + names[names.length - 1];
  }

  /* El modelo pedido; si ya no está en la gama, el primero (rank 1). */
  function pick(id) {
    var p = id ? catalog.product(id) : null;
    return p && p.family === FAMILY ? p : (products[0] || null);
  }

  function verbOf(p) { return catalog.cta(p) || 'Comprar'; }

  /* 1. Entradilla de la gama */
  var family = catalog.family(FAMILY);
  if (family && family.description) {
    each('[data-aurapad-family="description"]', function (el) { el.textContent = family.description; });
  }

  /* 2. Acciones de compra: enlace, verbo y nombre desde el catálogo */
  each('[data-aurapad-buy]', function (a) {
    var p = pick(a.getAttribute('data-aurapad-buy'));
    if (!p) { return; }
    a.setAttribute('href', catalog.url(p));
    a.textContent = verbOf(p) + ' ' + p.name;
  });

  /* 3. Compatibilidad de accesorios */
  each('[data-aurapad-compat]', function (el) {
    var key = norm(el.getAttribute('data-aurapad-compat'));
    var names = products.filter(function (p) {
      return p.specs && norm(p.specs.accesorios).indexOf(key) !== -1;
    }).map(function (p) { return p.name; });
    if (!names.length) { el.hidden = true; return; }
    var text = el.querySelector('span') || el;
    text.textContent = 'Compatible con ' + joinList(names) + '.';
    el.hidden = false;
  });


  /* 4. Modelo recomendado en cada hoja «Ver cómo» */
  var months = data.financing && data.financing.months;
  each('[data-aurapad-rec]', function (box) {
    var p = pick(box.getAttribute('data-aurapad-rec'));
    if (!p) { return; }
    var a = catalog.availability(p) || {};
    var price = Number(p.basePrice) > 0
      ? '<p class="aura-caption">' +
          '<span class="aura-text-primary">Desde ' + esc(fmt.eur0(p.basePrice)) + '</span>' +
          (months ? ' o ' + esc(fmt.mes(p.basePrice)) + ' durante ' + esc(months) + ' meses' : '') +
        '</p>'
      : '';
    var status = a.status && a.status !== 'disponible' && a.text
      ? '<p class="aura-caption aurapad-rec__status"><i class="bi bi-calendar-event" aria-hidden="true"></i> ' + (a.html || esc(a.text)) + '</p>'
      : '';
    box.innerHTML =
      '<div class="aura-stack" style="--stack:.25rem">' +
        '<p class="aura-eyebrow aura-eyebrow--mono aura-eyebrow--plain">Te recomendamos</p>' +
        '<p class="aura-h4">' + esc(p.name) + '</p>' +
        (p.tagline ? '<p class="aura-caption">' + esc(p.tagline) + '</p>' : '') +
        status + price +
      '</div>' +
      '<a class="aura-btn aura-btn--primary aura-btn--block mt-3" href="' + esc(catalog.url(p)) + '">' + esc(verbOf(p) + ' ' + p.name) + '</a>';
  });
})();
