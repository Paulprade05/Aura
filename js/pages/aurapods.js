/* ==========================================================================
   AURA — auraPods (js/pages/aurapods.js)
   Lógica propia de la página de familia auraPods. Script clásico: se carga
   después de aura-ui.js y usa solo window.AURA.

   Rellena desde el catálogo (data.js) todo dato de producto de la página:
   lema y descripción de la gama, horas de autonomía, micrófonos, precios,
   cuotas, acabados, pesos, la cancelación de ruido de cada modelo, el precio
   del estuche de carga inalámbrica y los enlaces de compra. Al cambiar
   data.js, la página se actualiza sola; el HTML solo lleva los textos de
   marketing (y un texto de reserva por si el script no llega).
   (La escena con scroll, la exhibición de color, las tarjetas de modelo, la
   tabla comparativa, las ventajas de compra, la llamada final, los «Comprar
   auraPods» y la letra pequeña los pinta la base: data-aura-scrub,
   data-aura-colorway, data-aura-lineup, data-aura-compare, data-aura-perks,
   data-aura-from, data-aura-buy y data-aura-legal.)

   Marcado:
   - data-pods-product="ID" en el elemento o en un antecesor: el producto del
     que salen los datos (por defecto, el rank 1 de la familia).
   - data-pods="campo": qué se rellena (ver CAMPOS). Si el dato no está en el
     catálogo, se queda el texto del HTML.
   - data-pods-cta: enlace de compra del producto (verbo según disponibilidad).
   - data-pods-block="price" (con hidden): se muestra si el producto tiene precio.
   - data-pods-list="hours | weights | cancelacion" (con hidden): una cifra
     destacada por modelo (o por valor de cancelación), en el orden de la gama.
   ========================================================================== */
(function () {
  'use strict';

  var AURA = window.AURA;
  if (!AURA || !AURA.catalog || !AURA.fmt) { return; }

  var cat = AURA.catalog;
  var fmt = AURA.fmt;
  var FAMILY = 'aurapods';
  var NBSP = ' ';
  var products = cat.products(FAMILY);
  var family = cat.family(FAMILY) || {};
  var months = (AURA.data && AURA.data.financing && Number(AURA.data.financing.months)) || 24;

  function each(sel, fn, root) { Array.prototype.forEach.call((root || document).querySelectorAll(sel), fn); }
  function esc(t) { return AURA.html && AURA.html.esc ? AURA.html.esc(t) : String(t == null ? '' : t); }
  function cap(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''; }

  /* Sin modelos en el catálogo: fuera los bloques que solo tienen sentido con datos. */
  if (!products.length) {
    each('[data-pods-list], [data-pods-block], [data-pods-cta]', function (el) { el.hidden = true; });
    return;
  }

  var NUMEROS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce'];

  /* «Hasta 8 h con cancelación · hasta 24 h con el estuche» → { h: '8', estuche: '24' } */
  function horas(p) {
    var s = String((p.specs || {}).bateria || '');
    var m = /Hasta\s+(\d+(?:,\d+)?)\s*h\b/i.exec(s);
    var e = /hasta\s+(\d+(?:,\d+)?)\s*h\s+con\s+el\s+estuche/i.exec(s);
    var w = /(\d+(?:,\d+)?)(?:\s*y\s*\d+(?:,\d+)?)?\s*h\s+con\s+estuche\s+inal/i.exec(s);
    return m ? { h: m[1], estuche: e ? e[1] : '', inalambrico: w ? w[1] : '' } : null;
  }

  /* «AURA H2 · nueve micrófonos» → '9' */
  function microfonos(p) {
    var s = String((p.specs || {}).chip || '').toLowerCase();
    var m = /(\d+|[a-zñ]+)\s+micr[oó]fonos/.exec(s);
    if (!m) { return ''; }
    var n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMEROS.indexOf(m[1]);
    return n > 0 ? String(n) : '';
  }

  /* «5,55 g por auricular» → { valor: '5,55', unidad: 'g', cada: true } */
  function peso(p) {
    var m = /^(\d+(?:,\d+)?)\s*(kg|g)\b(.*)$/i.exec(String((p.specs || {}).peso || '').trim());
    return m ? { valor: m[1], unidad: m[2], cada: /auricular/i.test(m[3]) } : null;
  }

  /* «Activa, hasta 2 veces la de la generación anterior…» → '2' */
  function cancelacion(p) {
    var m = /hasta\s+(\d+(?:,\d+)?)\s+veces/i.exec(String((p.specs || {}).cancelacion || ''));
    return m ? m[1] : '';
  }

  /* El delta de la opción de carga inalámbrica (options.estuche de data.js) */
  function deltaInalambrico(p) {
    var groups = (p && p.options) || [];
    for (var i = 0; i < groups.length; i++) {
      var ch = groups[i].choices || [];
      for (var j = 0; j < ch.length; j++) { if (/inal/i.test(ch[j].id + ' ' + ch[j].label) && Number(ch[j].delta) > 0) { return Number(ch[j].delta); } }
    }
    return 0;
  }

  function enumerar(nombres, y) {
    if (nombres.length < 2) { return nombres.join(''); }
    return nombres.slice(0, -1).join(', ') + ' ' + (y || 'y') + ' ' + nombres[nombres.length - 1];
  }

  /* El producto de un elemento: su data-pods-product o el de un antecesor; si no, el rank 1. */
  function productoDe(el) {
    var host = el.closest ? el.closest('[data-pods-product]') : null;
    var id = host ? host.getAttribute('data-pods-product') : '';
    return (id && cat.product(id)) || products[0];
  }

  function put(el, text) { if (text) { el.textContent = text; el.hidden = false; } }

  var CAMPOS = {
    'family-tagline': function (el) { put(el, family.tagline); },
    'family-description': function (el) { put(el, family.description); },
    os: function (el) { put(el, family.os); },
    hours: function (el, p) { var h = horas(p); put(el, h && h.h); },
    mics: function (el, p) { put(el, microfonos(p)); },
    from: function (el, p) { if (Number(p.basePrice) > 0) { put(el, 'Desde ' + fmt.eur0(p.basePrice)); } },
    monthly: function (el, p) { if (Number(p.basePrice) > 0) { put(el, 'o ' + fmt.mes(p.basePrice) + ' durante ' + months + NBSP + 'meses'); } },
    'colors-count-cap': function (el, p) { var n = (p.colors || []).length; if (n) { put(el, cap(NUMEROS[n] || String(n))); } },
    'colors-text': function (el, p) {
      var nombres = (p.colors || []).map(function (c) { return String(c.name || '').toLowerCase(); }).filter(Boolean);
      put(el, enumerar(nombres));
    },
    'wireless-delta': function (el, p) { var d = deltaInalambrico(p); if (d > 0) { put(el, 'por ' + fmt.eur0(d) + ' más'); } }
  };

  /* Los campos de la escena y de los capítulos de un producto (Max 2) toman el rank 1 por defecto:
     data-pods-product en el texto o la sección lo cambia. */
  var max = cat.product('aurapods-max-2');
  each('[data-pods]', function (el) {
    var campo = el.getAttribute('data-pods');
    var fn = CAMPOS[campo];
    if (!fn) { return; }
    var p = el.closest && el.closest('[data-pods-product]') ? productoDe(el) : (/^(hours|mics|from|monthly|colors-count-cap|colors-text)$/.test(campo) && max ? max : productoDe(el));
    fn(el, p);
  });

  /* Enlaces de compra: verbo según la disponibilidad y destino con ?hoy si la página se abrió con él. */
  each('[data-pods-cta]', function (el) {
    var p = productoDe(el);
    el.setAttribute('href', cat.url(p));
    el.textContent = cat.cta(p) + ' ' + p.name;
  });

  each('[data-pods-block="price"]', function (el) { el.hidden = !(Number(productoDe(el).basePrice) > 0); });

  /* Si un modelo sale de la gama, los capítulos que dependen de él se ocultan (nunca un enlace muerto). */
  each('[data-pods-product]', function (el) {
    if (!cat.product(el.getAttribute('data-pods-product'))) { el.hidden = true; }
  });


  /* ------------------------------------------------------------------------
     Cifras destacadas por modelo (data-pods-list): marcado de .aura-stat--lg
     de la base, con su aparición escalonada (data-aura-reveal="stat").
     ------------------------------------------------------------------------ */

  function stat(pre, valor, unidad, label, i) {
    return '<li class="aura-stat aura-stat--lg" data-aura-reveal="stat" style="--i:' + i + '">' +
      (pre ? '<p class="aura-stat__pre">' + esc(pre) + '</p>' : '') +
      '<p class="aura-stat__value">' + esc(valor) + (unidad ? '<span class="aura-stat__unit">' + NBSP + esc(unidad) + '</span>' : '') + '</p>' +
      '<p class="aura-stat__label">' + esc(label) + '</p></li>';
  }

  /* «los auraPods Max 2» con su artículo (data.js: family.plural) */
  function conArticulo(p) {
    var g = cat.grammar ? cat.grammar(p) : { el: 'los' };
    return g.el + ' ' + p.name;
  }

  var LISTAS = {
    hours: function () {
      return products.map(function (p) {
        var h = horas(p);
        if (!h) { return null; }
        var extra = h.estuche ? ' (hasta ' + h.estuche + NBSP + 'h con el estuche)'
          : (h.inalambrico ? ' (' + h.inalambrico + NBSP + 'h con el estuche inalámbrico)' : '');
        return { pre: 'Hasta', valor: h.h, unidad: 'h', label: 'en ' + conArticulo(p) + extra };
      });
    },
    weights: function () {
      return products.map(function (p) {
        var w = peso(p);
        if (!w) { return null; }
        return { pre: w.cada ? 'Cada auricular,' : 'En total,', valor: w.valor, unidad: w.unidad, label: (w.cada ? 'en ' : 'pesan ') + conArticulo(p) };
      });
    },
    cancelacion: function () {
      /* Un valor por cifra distinta, con los modelos que la comparten: «Hasta 2 veces · en los auraPods Pro 3». */
      var grupos = [];
      products.forEach(function (p) {
        var v = cancelacion(p);
        if (!v) { return; }
        var g = grupos.filter(function (x) { return x.v === v; })[0];
        if (g) { g.ps.push(p); } else { grupos.push({ v: v, ps: [p] }); }
      });
      grupos.sort(function (a, b) { return parseFloat(b.v.replace(',', '.')) - parseFloat(a.v.replace(',', '.')); });
      return grupos.map(function (g) {
        return { pre: 'Hasta', valor: g.v, unidad: 'veces', label: 'más cancelación que la generación anterior en ' + enumerar(g.ps.map(conArticulo)) };
      });
    }
  };

  each('[data-pods-list]', function (el) {
    var fn = LISTAS[el.getAttribute('data-pods-list')];
    var items = fn ? fn().filter(Boolean) : [];
    if (!items.length) { el.hidden = true; return; }
    el.innerHTML = items.map(function (it, i) { return stat(it.pre, it.valor, it.unidad, it.label, i); }).join('');
    el.style.setProperty('--n', String(items.length));
    el.hidden = false;
  });
}());
