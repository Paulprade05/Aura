/* ==========================================================================
   AURA — auraBook (assets/js/pages/aurabook.js)
   Rellena desde el catálogo (data.js) todo dato de producto de la página:
   nombres, precios, cuotas, disponibilidad, horas de autonomía, núcleos,
   memoria, enlaces de compra y la foto (con su alt) del auraBook Pro 16″.
   Al cambiar data.js, la página se actualiza sola; el HTML solo lleva los
   textos de marketing. (Las ventajas de compra, la llamada final, los
   «Comprar auraBook» y la letra pequeña los pinta la base: data-aura-perks,
   data-aura-from, data-aura-buy y data-aura-legal.)

   Marcado:
   - data-ab-product="ID | cheapest | longest" en el elemento o en un
     antecesor: el producto del que salen los datos. «cheapest» = el más
     barato de la familia; «longest» = el de mayor autonomía (a igualdad, el
     de mejor rank). Admite varios candidatos separados por espacios
     («aurabook-air-15 cheapest»): vale el primero que exista. Si ninguno
     existe, se usa el rank 1 de la familia: nunca queda un enlace muerto.
   - data-ab="campo campo…": qué se rellena (ver BIND).
   - data-ab-list="hours": lista de autonomía de los modelos.
   ========================================================================== */
(function () {
  'use strict';

  var AURA = window.AURA;
  if (!AURA || !AURA.catalog || !AURA.fmt) { return; }

  var FAMILY = 'aurabook';
  var NBSP = ' ';
  var products = AURA.catalog.products(FAMILY);

  function each(list, fn) { Array.prototype.forEach.call(list || [], fn); }

  /* Sin modelos en el catálogo: fuera los bloques que solo tienen sentido con
     datos (precios vacíos, lista de autonomía); el resto es texto de marketing. */
  if (!products.length) {
    each(document.querySelectorAll('.aurabook-price, [data-ab-list]'), function (el) { el.hidden = true; });
    return;
  }

  var family = AURA.catalog.family(FAMILY) || {};
  var months = (AURA.data && AURA.data.financing && AURA.data.financing.months) || 24;

  function group(p, id) {
    var groups = (p && p.options) || [];
    for (var i = 0; i < groups.length; i++) { if (groups[i].id === id) { return groups[i]; } }
    return null;
  }

  function matchNum(re, text) {
    var m = re.exec(String(text || ''));
    return m ? parseFloat(m[1].replace(',', '.')) : 0;
  }

  /* «Hasta 24 h de streaming de vídeo» → 24 */
  function hours(p) {
    var h = matchNum(/(\d+(?:[.,]\d+)?)\s*h\b/i, p.specs && p.specs.bateria);
    if (!h) {
      (p.highlights || []).forEach(function (t) { h = h || matchNum(/(\d+(?:[.,]\d+)?)\s*horas/i, t); });
    }
    return h;
  }

  /* «128 GB» → 128 · «1 TB» → 1024 */
  function gigas(text) {
    var m = /(\d+(?:[.,]\d+)?)\s*(GB|TB)/i.exec(String(text || ''));
    if (!m) { return 0; }
    return parseFloat(m[1].replace(',', '.')) * (m[2].toUpperCase() === 'TB' ? 1024 : 1);
  }

  /* Núcleos máximos y chips (el de más GPU y el de la configuración básica). */
  function chipInfo(p) {
    var info = { cpu: 0, gpu: 0, top: '', topLabel: '', baseLabel: '' };
    var g = group(p, 'chip');
    var choices = g ? g.choices || [] : [];
    choices.forEach(function (c, i) {
      var cpu = matchNum(/CPU\D{0,4}(\d+)/i, c.label);
      var gpu = matchNum(/GPU\D{0,4}(\d+)/i, c.label);
      if (i === 0) { info.baseLabel = c.label; }
      if (cpu > info.cpu) { info.cpu = cpu; }
      if (!info.topLabel || gpu > info.gpu) { info.gpu = gpu; info.topLabel = c.label; }
    });
    if (!choices.length && p.specs && p.specs.chip) {
      info.cpu = matchNum(/CPU\D{0,10}(\d+)/i, p.specs.chip);
      info.gpu = matchNum(/GPU\D{0,10}(\d+)/i, p.specs.chip);
      info.topLabel = info.baseLabel = p.specs.chip;
    }
    info.top = String(info.topLabel).split('·')[0].trim();
    return info;
  }

  /* Memoria máxima (etiqueta) y la de la configuración básica. */
  function memInfo(p) {
    var info = { max: '', base: '' };
    var g = group(p, 'memoria');
    var best = 0;
    (g ? g.choices || [] : []).forEach(function (c) {
      var v = gigas(c.label);
      if (v > best) { best = v; info.max = c.label; }
    });
    if (g) {
      var sel = AURA.catalog.defaults(p).selections || {};
      (g.choices || []).forEach(function (c) { if (c.id === sel.memoria) { info.base = c.label; } });
    }
    if (!info.max && p.specs && p.specs.memoria) {
      var all = String(p.specs.memoria).match(/\d+(?:[.,]\d+)?\s*(?:GB|TB)/gi) || [];
      all.forEach(function (t) { var v = gigas(t); if (v > best) { best = v; info.max = t; } });
    }
    return info;
  }

  function byRank(a, b) { return (a.rank || 99) - (b.rank || 99); }

  function pick(ref) {
    var list = products.slice();
    if (ref === 'cheapest') {
      /* El modelo de entrada de la familia: la misma regla que en auraPhone y auraPad. */
      if (AURA.catalog.entry) { return AURA.catalog.entry(FAMILY); }
      return list.sort(function (a, b) { return (a.basePrice - b.basePrice) || byRank(a, b); })[0];
    }
    if (ref === 'longest') {
      return list.sort(function (a, b) { return (hours(b) - hours(a)) || byRank(a, b); })[0];
    }
    var p = ref ? AURA.catalog.product(ref) : null;
    return p && p.family === FAMILY ? p : null;
  }

  /* «aurabook-air-15 cheapest»: el primer candidato que exista; si ninguno, el rank 1. */
  function resolve(refs) {
    var list = String(refs || '').split(/\s+/);
    for (var i = 0; i < list.length; i++) {
      var p = pick(list[i]);
      if (p) { return p; }
    }
    return products[0];
  }

  function lowerFirst(text) {
    text = String(text || '');
    return text.charAt(0).toLowerCase() + text.slice(1);
  }

  /* «auraBook Pro 16″» → «auraBook Pro 16″» con la medida pegada a la palabra
     anterior: en una columna estrecha se parte «auraBook / Pro 16″», nunca
     «auraBook Pro / 16″». */
  function keepTail(name) { return String(name || '').replace(/ (\S+)$/, NBSP + '$1'); }

  function hoursText(h) { return AURA.fmt.num(h, h % 1 ? 1 : 0); }

  var BIND = {
    name: function (el, p) { el.textContent = p.name; },
    price: function (el, p) { el.textContent = 'Desde ' + AURA.fmt.eur0(p.basePrice); },
    monthly: function (el, p) { el.textContent = 'o ' + AURA.fmt.mes(p.basePrice) + ' durante ' + months + ' meses'; },
    /* «Próximamente · Reserva a partir del…» solo si el modelo aún no está a la venta. */
    availability: function (el, p) {
      var a = AURA.catalog.availability(p);
      /* Con la fecha en <time datetime> (a.html ya va escapado). */
      el.innerHTML = a.status !== 'disponible' ? (a.html || AURA.html.esc(a.text || '')) : '';
      el.hidden = !el.textContent;
    },
    href: function (el, p) { el.setAttribute('href', AURA.catalog.url(p)); },
    'cta-name': function (el, p) { el.textContent = AURA.catalog.cta(p) + ' ' + p.name; },
    hours: function (el, p) { var h = hours(p); if (h) { el.textContent = hoursText(h); } },
    battery: function (el, p) { if (p.specs && p.specs.bateria) { el.textContent = AURA.fmt.units(lowerFirst(p.specs.bateria)); } },
    'chip-top': function (el, p) { var c = chipInfo(p); if (c.top) { el.textContent = c.top; } },
    'chip-top-label': function (el, p) { var c = chipInfo(p); if (c.topLabel) { el.textContent = c.topLabel; } },
    'chip-base-label': function (el, p) { var c = chipInfo(p); if (c.baseLabel) { el.textContent = c.baseLabel; } },
    cpu: function (el, p) { var c = chipInfo(p); if (c.cpu) { el.textContent = AURA.fmt.num(c.cpu); } },
    gpu: function (el, p) { var c = chipInfo(p); if (c.gpu) { el.textContent = AURA.fmt.num(c.gpu); } },
    'mem-max': function (el, p) { var m = memInfo(p); if (m.max) { el.textContent = m.max; } },
    /* «128 GB» repartido en cifra («128») y unidad («GB»): la cifra va grande y la unidad, en la etiqueta. */
    'mem-max-num': function (el, p) { var m = /^\s*([\d.,]+)/.exec(memInfo(p).max); if (m) { el.textContent = m[1]; } },
    'mem-max-unit': function (el, p) { var m = /(GB|TB)/i.exec(memInfo(p).max); if (m) { el.textContent = m[1].toUpperCase(); } },
    'mem-base': function (el, p) { var m = memInfo(p); if (m.base) { el.textContent = m.base; } },
    'eyebrow-chip': function (el, p) {
      var c = chipInfo(p);
      el.textContent = p.name + (c.top ? ' / ' + c.top : '');
    },
    /* La foto base del modelo, sin pedir acabado: así no hay petición por
       color que falle, y el alt es el de la foto real (data.js: imageAlt). */
    image: function (el, p) {
      var img = AURA.catalog.image(p);
      if (!img.slot) { return; }
      AURA.slots.set(el, img.slot, { fallback: img.fallback, alt: img.alt || p.name });
    },
    'family-description': function (el) { if (family.description) { el.textContent = family.description; } }
  };

  each(document.querySelectorAll('[data-ab]'), function (el) {
    var holder = el.closest('[data-ab-product]');
    var p = resolve(holder ? holder.getAttribute('data-ab-product') : '');
    String(el.getAttribute('data-ab')).split(/\s+/).forEach(function (key) {
      if (BIND[key]) {
        try { BIND[key](el, p); } catch (e) { /* un dato que falta no rompe la página */ }
      }
    });
  });

  /* Autonomía de cada modelo, por rank. */
  each(document.querySelectorAll('[data-ab-list="hours"]'), function (ul) {
    var html = products.map(function (p) {
      var h = hours(p);
      if (!h) { return ''; }
      return '<li class="aura-stat">' +
        '<p class="aura-stat__value">' + AURA.html.esc(hoursText(h) + NBSP + 'h') + '</p>' +
        '<p class="aura-stat__label">' + AURA.html.esc(keepTail(p.name)) + '</p>' +
      '</li>';
    }).join('');
    if (html) { ul.innerHTML = html; } else { ul.hidden = true; }
  });
})();
