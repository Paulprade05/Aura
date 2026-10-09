/* ==========================================================================
   AURA — Inicio (assets/js/pages/index.js)
   Script clásico, después de aura-ui.js.

   Todo lo que es dato sale del catálogo (AURA.catalog / AURA.data /
   AURA.tradeIn), nunca del HTML: al cambiar data.js, la portada se actualiza
   sola. El HTML solo lleva un texto de reserva sin cifras para cuando el
   script no llega.
     1. Héroes y teselas: disponibilidad (AURA.catalog.availability → `text`,
        la misma frase que la tarjeta de modelo), «Desde X €» y el verbo y el
        destino de los botones y enlaces de compra (AURA.catalog.cta / .url:
        Configurar / Reservar / Comprar, con ?hoy).
     2. «Toda la gama»: las nueve tarjetas del carrusel (AURA.html.productCard,
        por familia y rank), el segmentado que salta a cada familia y sigue al
        carrusel también mientras se arrastra (su pastilla se desliza con el
        gesto), y el enlace «Comparar todos los modelos» de la familia elegida.
     3. Cifras sueltas: meses de financiación, rango y tope de AURA Trade In,
        fecha del catálogo y notas de las reservas.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var AURA = window.AURA;
  if (!AURA || !AURA.catalog || !AURA.fmt || !AURA.html) { return; }

  var cat = AURA.catalog;
  var fmt = AURA.fmt;
  var esc = AURA.html.esc;
  var data = AURA.data || {};
  var months = Number(data.financing && data.financing.months) || 0;

  function all(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function idList(el, attr) {
    return String(el.getAttribute(attr) || '').split(/[\s,]+/).filter(Boolean);
  }

  /* El más asequible de una lista: su precio es el «Desde» y su página, la de compra. */
  function cheapest(ids) {
    var best = null;
    ids.forEach(function (id) {
      var p = cat.product(id);
      if (p && (!best || p.basePrice < best.basePrice)) { best = p; }
    });
    return best;
  }

  /* Disponibilidad por fechas: { status, title, label, text, canBuy, preorder, release }. */
  function availability(p) {
    return p && cat.availability ? cat.availability(p) : { status: 'disponible', title: '', label: '', text: '', release: '' };
  }

  function monthly(price) {
    return months ? 'o ' + fmt.mes(price) + ' durante ' + months + ' meses' : '';
  }



  /* ------------------------------------------------------------------------
     1. Héroes
     ------------------------------------------------------------------------ */

  all('[data-index-from]').forEach(function (el) {
    var p = cheapest(idList(el, 'data-index-from'));
    if (!p || !(p.basePrice > 0)) { el.hidden = true; return; }
    var cuota = monthly(p.basePrice);
    el.innerHTML =
      '<span class="aura-price">Desde ' + esc(fmt.eur0(p.basePrice)) + '</span>' +
      (cuota ? '<span class="aura-caption">' + esc(cuota) + '</span>' : '');
  });

  /* «Próximamente · Reserva a partir del 16 de octubre» / «Reserva · Entregas a
     partir del 23 de octubre»: lo mismo que dicen la tarjeta, la tabla y el
     buscador. Desaparece sola el día del lanzamiento. */
  all('[data-index-availability]').forEach(function (el) {
    var a = availability(cheapest(idList(el, 'data-index-availability')));
    if (a.status === 'disponible' || !a.text) { el.hidden = true; return; }
    el.innerHTML = '<i class="bi bi-calendar-event" aria-hidden="true"></i>' +
      '<span>' + (a.title && a.label ? '<strong>' + esc(a.title) + '</strong> · ' + esc(a.label) : esc(a.text)) + '</span>';
    el.hidden = false;
  });

  /* Botones de los héroes y enlaces «Comprar» de las teselas: verbo según la
     disponibilidad (Configurar / Reservar / Comprar), destino con ?hoy si la
     página se abrió con él y el nombre del modelo para los lectores de
     pantalla (en texto oculto, como en el HTML de reserva). */
  all('[data-index-cta]').forEach(function (el) {
    var p = cheapest(idList(el, 'data-index-cta'));
    /* Un modelo que ya no está en el catálogo no se ofrece: queda «Más información». */
    if (!p) { el.hidden = true; return; }
    el.setAttribute('href', cat.url(p));
    el.innerHTML = esc(cat.cta(p)) + '<span class="visually-hidden"> ' + esc(p.name) + '</span>';
  });


  /* ------------------------------------------------------------------------
     2. «Toda la gama»: la tarjeta de modelo del sistema (AURA.html.productCard,
        la misma que pinta [data-aura-lineup])
     ------------------------------------------------------------------------ */

  var shelf = document.querySelector('[data-index-shelf]');
  var track = shelf && shelf.querySelector('.aura-carousel__track');
  var products = [];

  if (track) {
    /* Orden de familia (el de data.js) y, dentro de cada una, por rank. */
    cat.families().forEach(function (f) {
      cat.products(f.id).forEach(function (p) { products.push(p); });
    });
    products = products.filter(function (p) { return AURA.html.productCard(p); });
    track.innerHTML = products.map(function (p, i) {
      return '<li class="aura-carousel__slide" aria-roledescription="diapositiva" aria-label="' + (i + 1) + ' de ' + products.length + '" data-family="' + esc(p.family) + '">' +
        AURA.html.productCard(p, { heading: 'h3' }) + '</li>';
    }).join('');
  }

  /* Sin modelos en el catálogo no hay estantería que enseñar. */
  var gama = shelf && shelf.closest('section');
  if (gama && !products.length) { gama.hidden = true; }

  /* aura-ui.js ya inicializó el carrusel (vacío): se vuelven a medir las diapositivas. */
  var carousel = shelf && products.length && AURA.ui && AURA.ui.carousel ? AURA.ui.carousel(shelf) : null;
  if (carousel) { carousel.refresh(); }

  /* Segmentado: salta a la primera tarjeta de la familia y sigue al carrusel.
     «Comparar todos los modelos» lleva siempre a la familia elegida. */
  var families = document.querySelector('[data-index-families]');
  var compare = document.querySelector('[data-index-compare]');
  var compareName = compare && compare.querySelector('[data-index-compare-name]');

  function familyStart(familyId) {
    for (var i = 0; i < products.length; i++) { if (products[i].family === familyId) { return i; } }
    return -1;
  }

  function setCompare(familyId) {
    var f = cat.family(familyId);
    if (!compare || !f) { return; }
    compare.setAttribute('href', 'comparar.html?familia=' + encodeURIComponent(f.id));
    if (compareName) { compareName.textContent = ' de ' + f.name; }
  }

  /* La familia de la tarjeta que hay en el punto de ajuste `index` pasa a ser
     la elegida. Marcar un radio desde JS no lanza `change` ni toca atributos,
     así que la pastilla deslizante del segmentado (aura-ui.js) no se
     enteraría: se le avisa con un `change` en el propio control, que el
     manejador de abajo ignora (no viene de un radio). */
  function markFamily(index) {
    if (!products.length) { return; }
    var p = products[Math.max(0, Math.min(index, products.length - 1))];
    if (families) {
      var moved = false;
      all('input[type="radio"]', families).forEach(function (input) {
        var on = input.value === p.family;
        if (input.checked !== on) { input.checked = on; moved = true; }
      });
      if (moved) { families.dispatchEvent(new Event('change')); }
    }
    setCompare(p.family);
  }

  if (families && carousel) {
    /* Familias sin productos en el catálogo: su opción no se ofrece. */
    all('input[type="radio"]', families).forEach(function (input) {
      var item = input.closest('.aura-segmented__item');
      if (familyStart(input.value) < 0 && item) { item.hidden = true; }
    });

    families.addEventListener('change', function (e) {
      if (e.target === families) { return; }          // el aviso de markFamily
      var start = familyStart(e.target && e.target.value);
      if (start < 0) { return; }
      setCompare(e.target.value);
      /* Hay un punto de ajuste por diapositiva hasta el tope del recorrido.
         Carrusel y pastilla arrancan en el mismo fotograma, cada uno con su muelle. */
      carousel.goTo(Math.min(start, carousel.count() - 1));
    });

    /* El segmentado sigue al carrusel también DURANTE el gesto (skill §1: la
       respuesta es continua, no solo al soltar): cuando el dedo o la rueda
       llevan la estantería a otra familia, la pastilla ya se desliza hacia
       ella. El carrusel repinta su punto activo (.is-active, §12.8) en cada
       cambio de punto de ajuste, también mientras se arrastra; el evento
       aura:carousel-change solo llega al soltar, y queda de respaldo. */
    var dotsBox = shelf.querySelector('.aura-carousel__dots');
    if (dotsBox && typeof window.MutationObserver === 'function') {
      new window.MutationObserver(function () { markFamily(carousel.index()); })
        .observe(dotsBox, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    }
    shelf.addEventListener('aura:carousel-change', function (e) {
      markFamily(e.detail ? e.detail.index : carousel.index());
    });
    markFamily(carousel.index());
  } else if (families) {
    families.hidden = true;
  }


  /* ------------------------------------------------------------------------
     3. Cifras sueltas
     ------------------------------------------------------------------------ */

  var updated = data.updated ? fmt.fecha(data.updated) : '';
  all('[data-index-updated]').forEach(function (el) {
    if (!updated) { el.hidden = true; return; }
    el.textContent = ' Catálogo actualizado el ' + updated + '.';
    el.hidden = false;
  });

  /* AURA Trade In: «entre X € y Y €» = el dispositivo que menos y el que más
     vale en el mejor estado (Y = AURA.tradeIn.max(), con el tope aplicado). */
  if (AURA.tradeIn) {
    var trade = data.tradeIn || {};
    var conditions = Array.isArray(trade.conditions) ? trade.conditions : [];
    var best = conditions.reduce(function (acc, c) { return c && (!acc || c.factor > acc.factor) ? c : acc; }, null);
    var values = best && Array.isArray(trade.devices)
      ? trade.devices.map(function (d) { return AURA.tradeIn.estimate(d && d.id, best.id); }).filter(function (v) { return v > 0; })
      : [];
    var top = AURA.tradeIn.max ? AURA.tradeIn.max() : (values.length ? Math.max.apply(null, values) : 0);
    var low = values.length ? Math.min.apply(null, values) : 0;

    all('[data-index-tradein-range]').forEach(function (el) {
      if (!(top > 0)) { return; }
      el.textContent = low > 0 && low < top
        ? 'entre ' + fmt.eur0(low) + ' y ' + fmt.eur0(top) + ' de'
        : 'hasta ' + fmt.eur0(top) + ' de';
    });
  }

  /* Notas: una frase por cada modelo anunciado que aún no se entrega. */
  var announced = cat.products().map(function (p) { return { p: p, a: availability(p) }; })
    .filter(function (x) { return x.a.status !== 'disponible'; });
  all('[data-index-preorders]').forEach(function (el) {
    if (!announced.length) { el.hidden = true; return; }
    el.textContent = announced.map(function (x) {
      var a = x.a;
      var entregas = a.release ? 'entregas a partir del ' + fmt.diaMes(a.release) : '';
      if (a.status === 'proximamente') {
        var reservas = a.preorder ? 'reservas a partir del ' + fmt.diaMes(a.preorder) : 'muy pronto';
        return x.p.name + ': ' + reservas + (entregas ? ' y ' + entregas : '') + ', según disponibilidad.';
      }
      return x.p.name + ': en reserva' + (entregas ? '; ' + entregas : '') + ', según disponibilidad.';
    }).join(' ');
    el.hidden = false;
  });

})(window, document);
