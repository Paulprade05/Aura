/* ==========================================================================
   AURA — auraBook (assets/js/pages/aurabook.js)
   Rellena desde el catálogo (data.js) todo dato de producto de la página:
   nombres, lema de la gama, precios, cuotas, disponibilidad, horas de
   autonomía, núcleos, memoria, brillo y frecuencia de la pantalla, medidas,
   puertos, cámara, sistema, el precio de la pantalla nanotexturizada y los
   enlaces de compra. Al cambiar data.js, la página se actualiza sola; el HTML
   solo lleva los textos de marketing. (La escena con scroll, las exhibiciones
   de color, las ventajas de compra, la llamada final, los «Comprar auraBook»
   y la letra pequeña los pinta la base: data-aura-scrub, data-aura-colorway,
   data-aura-perks, data-aura-from, data-aura-buy y data-aura-legal.)

   Marcado:
   - data-ab-product="ID | cheapest | longest | brightest | thinnest |
     lightest" en el elemento o en un antecesor: el producto del que salen
     los datos. «cheapest» = el modelo de entrada; «longest» = el de mayor
     autonomía; «brightest» = el de pantalla más brillante; «thinnest» = el
     más fino; «lightest» = el más ligero (a igualdad, el de mejor rank).
     Admite varios candidatos separados por espacios («aurabook-air-15
     cheapest»): vale el primero que exista. Si ninguno existe, se usa el
     rank 1 de la familia: nunca queda un enlace muerto.
   - data-ab="campo campo…": qué se rellena (ver BIND). Si el dato no está en
     el catálogo, se queda el texto del HTML.
   - data-ab-list="hours | puertos": autonomía (cifras destacadas) y puertos
     (lista de definiciones) de cada modelo.
   - data-ab-show="campo" (con hidden en el HTML): muestra el bloque solo si
     ese dato existe (la nota de la pantalla nanotexturizada y su precio).
   ========================================================================== */
(function () {
  'use strict';

  var AURA = window.AURA;
  if (!AURA || !AURA.catalog || !AURA.fmt) { return; }

  var FAMILY = 'aurabook';
  var NBSP = ' ';
  var products = AURA.catalog.products(FAMILY);

  function each(list, fn) { Array.prototype.forEach.call(list || [], fn); }

  /* Sin modelos en el catálogo: fuera los bloques que solo tienen sentido con
     datos (precios vacíos, listas por modelo); el resto es texto de marketing. */
  if (!products.length) {
    each(document.querySelectorAll('.aurabook-price, [data-ab-list], [data-ab-show]'), function (el) { el.hidden = true; });
    return;
  }

  var family = AURA.catalog.family(FAMILY) || {};
  var months = (AURA.data && AURA.data.financing && AURA.data.financing.months) || 24;

  function group(p, id) {
    var groups = (p && p.options) || [];
    for (var i = 0; i < groups.length; i++) { if (groups[i].id === id) { return groups[i]; } }
    return null;
  }

  /* Número de una cadena del catálogo: «1.600» → 1600 · «16,2» → 16.2 */
  function toNum(text) {
    return parseFloat(String(text || '').replace(/\./g, '').replace(',', '.')) || 0;
  }
  function matchNum(re, text) {
    var m = re.exec(String(text || ''));
    return m ? toNum(m[1]) : 0;
  }
  function spec(p, key) { return String((p && p.specs && p.specs[key]) || ''); }

  /* «Hasta 24 h de streaming de vídeo» → 24 */
  function hours(p) {
    var h = matchNum(/(\d+(?:,\d+)?)\s*h\b/i, spec(p, 'bateria'));
    if (!h) {
      (p.highlights || []).forEach(function (t) { h = h || matchNum(/(\d+(?:,\d+)?)\s*horas/i, t); });
    }
    return h;
  }

  /* Pantalla: «Liquid Retina XDR de 16,2″ · ProMotion 120 Hz · 1.600 nits» */
  function nits(p) { return matchNum(/(\d[\d.]*)\s*nits/i, spec(p, 'pantalla')); }
  function hz(p) { return matchNum(/(\d+)\s*Hz/i, spec(p, 'pantalla')); }
  function diagonal(p) { return matchNum(/(\d+(?:,\d+)?)\s*(?:″|"|pulgadas)/i, spec(p, 'pantalla')); }

  /* Peso y grosor: «1,51 kg · 1,15 cm» */
  function weight(p) { return matchNum(/(\d+(?:,\d+)?)\s*kg/i, spec(p, 'peso')); }
  function thickness(p) { return matchNum(/(\d+(?:,\d+)?)\s*cm/i, spec(p, 'peso')); }

  /* «Chip …: IA hasta 8 veces más rápida que con el AURA M1 Max» */
  function aiInfo(p) {
    var info = { times: 0, ref: '' };
    (p.highlights || []).forEach(function (t) {
      var m = /(\d+(?:,\d+)?)\s*veces[^.]*?\bque con el\s+(.+?)\s*$/i.exec(String(t || ''));
      if (m && !info.times) { info.times = toNum(m[1]); info.ref = m[2]; }
    });
    return info;
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

  /* Precio extra de la pantalla nanotexturizada (opción «pantalla» del
     configurador): el más bajo de los modelos que la ofrecen. */
  function nanoDelta() {
    var best = 0;
    products.forEach(function (p) {
      var g = group(p, 'pantalla');
      (g ? g.choices || [] : []).forEach(function (c) {
        if (/nano/i.test(c.id + ' ' + c.label) && c.delta > 0 && (!best || c.delta < best)) { best = c.delta; }
      });
    });
    return best;
  }

  function byRank(a, b) { return (a.rank || 99) - (b.rank || 99); }

  /* El producto que más (o menos) tiene de algo; a igualdad, el de mejor rank. */
  function most(fn, sign) {
    return products.slice().filter(function (p) { return fn(p) > 0; }).sort(function (a, b) {
      return (sign * (fn(b) - fn(a))) || byRank(a, b);
    })[0] || null;
  }

  function pick(ref) {
    if (ref === 'cheapest') {
      /* El modelo de entrada de la familia: la misma regla que en auraPhone y auraPad. */
      if (AURA.catalog.entry) { return AURA.catalog.entry(FAMILY); }
      return products.slice().sort(function (a, b) { return (a.basePrice - b.basePrice) || byRank(a, b); })[0];
    }
    if (ref === 'longest') { return most(hours, 1); }
    if (ref === 'brightest') { return most(nits, 1); }
    if (ref === 'thinnest') { return most(thickness, -1); }
    if (ref === 'lightest') { return most(weight, -1); }
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

  /* Cifras con el formato de España: 1600 → «1.600», 16.2 → «16,2». */
  function numText(n) { return AURA.fmt.num(n, n % 1 ? (Math.round(n * 10) === n * 10 ? 1 : 2) : 0); }

  /* 4 → «Cuatro» (hasta diez, como se escribe en un texto); a partir de ahí, la cifra. */
  var WORDS = ['Cero', 'Un', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete', 'Ocho', 'Nueve', 'Diez'];
  function countText(n) { return WORDS[n] || AURA.fmt.num(n); }

  /* Si el dato existe (> 0 o cadena no vacía), se escribe; si no, se queda el texto del HTML. */
  function put(el, value) { if (value) { el.textContent = value; } }

  var BIND = {
    name: function (el, p) { el.textContent = p.name; },
    price: function (el, p) { el.textContent = 'Desde ' + AURA.fmt.eur0(p.basePrice); },
    monthly: function (el, p) { el.textContent = 'o ' + AURA.fmt.mes(p.basePrice) + ' durante ' + months + NBSP + 'meses'; },
    /* «Próximamente · Reserva a partir del…» solo si el modelo aún no está a la venta. */
    availability: function (el, p) {
      var a = AURA.catalog.availability(p);
      /* Con la fecha en <time datetime> (a.html ya va escapado). */
      el.innerHTML = a.status !== 'disponible' ? (a.html || AURA.html.esc(a.text || '')) : '';
      el.hidden = !el.textContent;
    },
    href: function (el, p) { el.setAttribute('href', AURA.catalog.url(p)); },
    'cta-name': function (el, p) { el.textContent = AURA.catalog.cta(p) + ' ' + p.name; },
    hours: function (el, p) { var h = hours(p); if (h) { el.textContent = numText(h); } },
    battery: function (el, p) { if (p.specs && p.specs.bateria) { el.textContent = AURA.fmt.units(lowerFirst(p.specs.bateria)); } },
    'chip-top': function (el, p) { put(el, chipInfo(p).top); },
    'chip-top-label': function (el, p) { put(el, chipInfo(p).topLabel); },
    'chip-base-label': function (el, p) { put(el, chipInfo(p).baseLabel); },
    cpu: function (el, p) { var c = chipInfo(p); if (c.cpu) { el.textContent = AURA.fmt.num(c.cpu); } },
    gpu: function (el, p) { var c = chipInfo(p); if (c.gpu) { el.textContent = AURA.fmt.num(c.gpu); } },
    'mem-max': function (el, p) { put(el, memInfo(p).max); },
    /* «128 GB» repartido en cifra («128») y unidad («GB»): la cifra va grande y la unidad, a la mitad. */
    'mem-max-num': function (el, p) { var m = /^\s*([\d.,]+)/.exec(memInfo(p).max); if (m) { el.textContent = m[1]; } },
    'mem-max-unit': function (el, p) { var m = /(GB|TB)/i.exec(memInfo(p).max); if (m) { el.textContent = m[1].toUpperCase(); } },
    'mem-base': function (el, p) { put(el, memInfo(p).base); },
    'eyebrow-chip': function (el, p) {
      var c = chipInfo(p);
      el.textContent = p.name + (c.top ? ' / ' + c.top : '');
    },
    /* Pantalla, medidas e IA (specs y highlights del catálogo). */
    nits: function (el, p) { var n = nits(p); if (n) { el.textContent = numText(n); } },
    hz: function (el, p) { var n = hz(p); if (n) { el.textContent = numText(n); } },
    diagonal: function (el, p) { var n = diagonal(p); if (n) { el.textContent = numText(n); } },
    weight: function (el, p) { var n = weight(p); if (n) { el.textContent = numText(n) + NBSP + 'kg'; } },
    'weight-num': function (el, p) { var n = weight(p); if (n) { el.textContent = numText(n); } },
    'thickness-num': function (el, p) { var n = thickness(p); if (n) { el.textContent = numText(n); } },
    peso: function (el, p) { if (p.specs && p.specs.peso) { el.textContent = AURA.fmt.units(p.specs.peso); } },
    'colors-count': function (el, p) { var n = (p.colors || []).length; if (n) { el.textContent = countText(n); } },
    'ai-x': function (el, p) { var a = aiInfo(p); if (a.times) { el.textContent = numText(a.times); } },
    'ai-ref': function (el, p) { put(el, aiInfo(p).ref); },
    camara: function (el, p) { var c = spec(p, 'camara').split('·')[0].trim(); if (c) { el.textContent = AURA.fmt.units(c); } },
    'nano-delta': function (el) { var d = nanoDelta(); if (d) { el.textContent = AURA.fmt.eur0(d); } },
    os: function (el) { put(el, family.os); },
    'family-tagline': function (el) { put(el, family.tagline); },
    'family-description': function (el) { put(el, family.description); }
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

  /* Bloques que dependen de un dato: van ocultos en el HTML y se muestran si el catálogo lo tiene. */
  var EXISTS = { 'nano-delta': function () { return nanoDelta() > 0; } };
  each(document.querySelectorAll('[data-ab-show]'), function (el) {
    var test = EXISTS[el.getAttribute('data-ab-show')];
    el.hidden = !(test && test());
  });

  /* Autonomía de cada modelo, por rank: cifras destacadas que aparecen por
     partes (data-aura-reveal="stat"; aura-ui.js inicializa solo lo insertado). */
  each(document.querySelectorAll('[data-ab-list="hours"]'), function (ul) {
    var i = 0;
    var html = products.map(function (p) {
      var h = hours(p);
      if (!h) { return ''; }
      return '<li class="aura-stat aura-stat--lg" data-aura-reveal="stat" style="--i:' + (i++) + '">' +
        '<p class="aura-stat__pre">Hasta</p>' +
        '<p class="aura-stat__value">' + AURA.html.esc(numText(h)) + '<span class="aura-stat__unit">' + NBSP + 'h</span></p>' +
        '<p class="aura-stat__label">' + AURA.html.esc(keepTail(p.name)) + '</p>' +
      '</li>';
    }).join('');
    if (html) { ul.innerHTML = html; } else { ul.hidden = true; }
  });

  /* Puertos de cada modelo: lista de definiciones (modelo → puertos), una
     tarjeta por modelo con las clases de .aura-feature. */
  each(document.querySelectorAll('[data-ab-list="puertos"]'), function (dl) {
    var html = products.map(function (p) {
      var ports = spec(p, 'puertos');
      if (!ports) { return ''; }
      return '<div class="aura-feature aura-feature--card">' +
        '<span class="aura-feature__icon"><i class="bi bi-usb-c" aria-hidden="true"></i></span>' +
        '<dt class="aura-feature__title">' + AURA.html.esc(keepTail(p.name)) + '</dt>' +
        '<dd class="aura-feature__text">' + AURA.html.esc(AURA.fmt.units(ports)) + '</dd>' +
      '</div>';
    }).join('');
    if (html) {
      dl.innerHTML = html;
    } else {
      dl.hidden = true;
      var title = dl.previousElementSibling;
      if (title && title.classList.contains('aurabook-ports__title')) { title.hidden = true; }
    }
  });
})();
