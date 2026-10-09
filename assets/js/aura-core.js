/* ==========================================================================
   AURA — Núcleo (assets/js/aura-core.js)

   Se carga en el <head>, síncrono y sin dependencias, DESPUÉS de data.js.
   Script clásico: un único espacio de nombres global, window.AURA.

   Contiene
     1. Utilidades y almacenamiento seguro (localStorage con respaldo en memoria)
     2. AURA.fmt        precios y fechas en es-ES ('AAAA-MM-DD' = día local)
     3. AURA.catalog    lectura del catálogo (window.AURA_DATA), disponibilidad
                        por fechas (today, availability, cta)
     4. AURA.bag        bolsa de la compra            → evento 'aura:bag'
     5. AURA.auth       ID de AURA simulado           → evento 'aura:auth'
     6. AURA.orders     pedidos simulados
     7. AURA.tradeIn    crédito de AURA Trade In      → evento 'aura:tradein'
     8. AURA.slots      huecos de imagen (.aura-img → .aura-slot)
        AURA.html       img(), productCard(), esc()
     9. AURA.search     buscador de productos y accesos rápidos (lógica pura)
    10. <aura-header> y <aura-footer> (AURA.header, AURA.footer)

   Todo tolera que falte AURA_DATA, que localStorage esté bloqueado (modo
   privado) o que no exista crypto.subtle. Ninguna función lanza excepciones.
   El comportamiento (muelles, gestos, overlays) vive en aura-ui.js.
   ========================================================================== */

(function (window, document) {
  'use strict';

  var AURA = window.AURA = window.AURA || {};
  var html = document.documentElement;

  /* El CSS usa .aura-js para el estado inicial de [data-aura-reveal]. */
  if (html && html.classList) { html.classList.add('aura-js'); }


  /* ------------------------------------------------------------------------
     1. Utilidades
     ------------------------------------------------------------------------ */

  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  /** Escapa texto para insertarlo en HTML (contenido o atributo). */
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return ESC[c]; });
  }

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  function clone(v) {
    try { return v === undefined ? v : JSON.parse(JSON.stringify(v)); } catch (e) { return v; }
  }

  function toNumber(v, fallback) {
    var n = v === null || v === undefined || v === '' ? NaN : Number(v);
    return isFinite(n) ? n : (fallback || 0);
  }

  function cents(n) { return Math.round((toNumber(n) + (n < 0 ? -1e-9 : 1e-9)) * 100) / 100; }

  var ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

  /**
   * Fecha a partir de un Date o de una cadena. 'AAAA-MM-DD' (sin hora) es un
   * día LOCAL: new Date('2026-10-16') sería medianoche UTC y, al oeste de
   * Greenwich, el día anterior. Devuelve un Date nuevo o null si no es válida.
   */
  function parseDate(value) {
    if (value instanceof Date) { return isNaN(value.getTime()) ? null : new Date(value.getTime()); }
    if (value == null || value === '') { return null; }
    var m = ISO_DAY.exec(String(value).trim());
    if (m) {
      var y = +m[1], mo = +m[2] - 1, d = +m[3];
      var local = new Date(y, mo, d);
      /* 2026-02-31 no existe: Date lo convertiría en marzo. */
      return local.getFullYear() === y && local.getMonth() === mo && local.getDate() === d ? local : null;
    }
    var other = new Date(value);
    return isNaN(other.getTime()) ? null : other;
  }

  /** Date → 'AAAA-MM-DD' con el día local. */
  function isoDay(date) {
    var d = parseDate(date);
    if (!d) { return ''; }
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  /** Medianoche local del mismo día. */
  function startOfDay(date) {
    var d = parseDate(date);
    return d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null;
  }

  /** Emite un CustomEvent en document. Nunca lanza. */
  function emit(name, detail) {
    try {
      var ev;
      if (typeof window.CustomEvent === 'function') {
        ev = new window.CustomEvent(name, { detail: detail || {} });
      } else {
        ev = document.createEvent('CustomEvent');
        ev.initCustomEvent(name, false, false, detail || {});
      }
      document.dispatchEvent(ev);
    } catch (e) { /* sin eventos no hay repintado, pero nada se rompe */ }
  }

  function ready(fn) {
    if (document.readyState && document.readyState !== 'loading') { fn(); return; }
    document.addEventListener('DOMContentLoaded', fn);
  }

  /* Almacenamiento seguro: si localStorage falla, se usa memoria (dura lo que
     dura la página). AURA.storage.persistent dice cuál de los dos está activo.
     Si el almacén se llena a mitad de sesión, la copia en memoria manda sobre
     la que quedó en el navegador (la vieja) y se avisa con 'aura:storage'. */
  function makeStore(areaName) {
    var area = null;
    var memory = {};
    var store;
    try {
      var probe = 'aura.__probe__';
      window[areaName].setItem(probe, '1');
      window[areaName].removeItem(probe);
      area = window[areaName];
    } catch (e) { area = null; }

    store = {
      persistent: !!area,
      get: function (key, fallback) {
        var raw = null;
        if (has(memory, key)) {
          raw = memory[key];              // lo último que se escribió, aunque no llegara al navegador
        } else {
          try { raw = area ? area.getItem(key) : null; } catch (e) { raw = null; }
        }
        if (raw == null) { return fallback; }
        try { return JSON.parse(raw); } catch (e2) { return fallback; }
      },
      set: function (key, value) {
        var raw;
        try { raw = JSON.stringify(value); } catch (e) { return false; }
        try {
          if (area) { area.setItem(key, raw); delete memory[key]; return true; }
        } catch (e2) {
          /* Cuota llena o bloqueado: seguimos en memoria y se avisa (una vez por clave y página). */
          if (!has(memory, key) && areaName === 'localStorage') {
            store.persistent = false;
            if (AURA.storage) { AURA.storage.persistent = false; }
            emit('aura:storage', { key: key, reason: 'quota' });
          }
        }
        memory[key] = raw;
        return false;
      },
      remove: function (key) {
        try { if (area) { area.removeItem(key); } } catch (e) { /* nada */ }
        delete memory[key];
      }
    };
    return store;
  }

  var store = makeStore('localStorage');
  var tabStore = makeStore('sessionStorage');   // sesión sin «mantener la sesión iniciada»

  var KEYS = {
    bag: 'aura.bag.v1',
    users: 'aura.users.v1',
    session: 'aura.session.v1',
    orders: 'aura.orders.v1',
    tradein: 'aura.tradein.v1'
  };

  AURA.version = '1.1.0';
  AURA.keys = KEYS;
  AURA.storage = { persistent: store.persistent };
  AURA.util = { esc: esc, emit: emit, ready: ready, clone: clone, parseDate: parseDate, isoDate: isoDay };


  /* ------------------------------------------------------------------------
     2. Formato (es-ES)
     Se formatea a mano: Intl en es-ES no agrupa los números de cuatro cifras
     («1469,00 €») y la guía pide «1.469,00 €». El espacio antes de € es
     indivisible para que el precio no se parta en dos líneas.
     ------------------------------------------------------------------------ */

  var NBSP = ' ';
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  function formatNumber(n, decimals) {
    n = toNumber(n);
    var factor = Math.pow(10, decimals);
    var abs = Math.round((Math.abs(n) + 1e-9) * factor) / factor;
    var parts = abs.toFixed(decimals).split('.');
    var out = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (decimals) { out += ',' + parts[1]; }
    return (n < 0 && abs !== 0 ? '−' : '') + out;
  }

  function months() {
    var d = window.AURA_DATA;
    var m = d && d.financing ? toNumber(d.financing.months) : 0;
    return m > 0 ? m : 24;
  }

  var fmt = {
    /** 1469 → «1.469,00 €» */
    eur: function (n) { return formatNumber(n, 2) + NBSP + '€'; },
    /** 1469 → «1.469 €»; 61.5 → «61,50 €» (sin decimales solo si es entero) */
    eur0: function (n) {
      var v = cents(n);
      return (v === Math.round(v) ? formatNumber(v, 0) : formatNumber(v, 2)) + NBSP + '€';
    },
    /** 1469 → «61,21 €/mes» (precio / meses de financiación) */
    mes: function (n) { return fmt.eur(toNumber(n) / months()) + '/mes'; },
    /** 1234.5 → «1.234,5» */
    num: function (n, decimals) { return formatNumber(n, decimals || 0); },
    /** 1 → «1 artículo»; 2 → «2 artículos» */
    articulos: function (n) { n = toNumber(n); return n + (n === 1 ? ' artículo' : ' artículos'); },
    /** '2026-10-03', '2026-10-03T…' o un Date → «3 de octubre de 2026» ('AAAA-MM-DD' = día local).
        «3 de octubre» lleva espacios indivisibles: la fecha no se parte entre
        líneas (como mucho, antes de «de 2026»). */
    fecha: function (value) {
      var d = parseDate(value);
      if (!d) { return ''; }
      return fmt.diaMes(d) + ' de' + NBSP + d.getFullYear();
    },
    /** Lo mismo sin el año: '2026-10-23' → «23 de octubre» (con espacios indivisibles) */
    diaMes: function (value) {
      var d = parseDate(value);
      return d ? d.getDate() + NBSP + 'de' + NBSP + MESES[d.getMonth()] : '';
    },
    /** Sin el año si es el de hoy (o el de ref), con él si no: «16 de octubre» / «16 de octubre de 2027». */
    dia: function (value, ref) {
      var d = parseDate(value);
      if (!d) { return ''; }
      var base = parseDate(ref) || today();
      return d.getFullYear() === base.getFullYear() ? fmt.diaMes(d) : fmt.fecha(d);
    },
    /**
     * Cifra y unidad juntas en los textos del catálogo (especificaciones,
     * resúmenes): «50 % en 15 min», «120 Hz», «de 1 TB a 8 TB», «500 nits»,
     * «USB 3», «Wi-Fi 7», «AURA M5» → con espacio indivisible, para que nunca
     * se separen al cambiar de línea. Devuelve texto plano (escápalo al pintarlo).
     */
    units: function (text) {
      return String(text == null ? '' : text)
        .replace(/(\d) (?=(?:GB|TB|MB|Hz|kHz|MP|Mpx|mm|cm|kg|g|h|min|s|W|Wh|mAh|nits|%|€|núcleos|horas|fps|dB|ppp|cd\/m²|x)(?![0-9A-Za-zÀ-ÿ]))/g, '$1' + NBSP)
        .replace(/(^|[\s(])(USB|Wi-Fi|Wi‑Fi|Bluetooth|AURA|A\d+|M\d+|x\d+) (?=[0-9A-Z])/g, '$1$2' + NBSP)
        .replace(/(^|[\s(])(A\d+|M\d+) (?=(?:Pro|Max|Ultra)\b)/g, '$1$2' + NBSP);   // «AURA M5 Pro» entero
    }
  };
  AURA.fmt = fmt;


  /* ------------------------------------------------------------------------
     3. Catálogo
     ------------------------------------------------------------------------ */

  var EMPTY_DATA = {
    updated: '',
    financing: { months: 24 },
    shipping: { standard: 0, express: 0 },
    families: [],
    products: [],
    care: { name: 'AuraCare+', description: '', prices: {} },
    tradeIn: { cap: 0, conditions: [], devices: [] }
  };

  function data() { return isObj(window.AURA_DATA) ? window.AURA_DATA : EMPTY_DATA; }

  try {
    Object.defineProperty(AURA, 'data', { get: data, configurable: true, enumerable: true });
  } catch (e) { AURA.data = data(); }

  function list(v) { return Array.isArray(v) ? v : []; }

  function familyIndex(id) {
    var fams = list(data().families);
    for (var i = 0; i < fams.length; i++) { if (fams[i] && fams[i].id === id) { return i; } }
    return fams.length;
  }

  function getProduct(ref) {
    if (isObj(ref)) { return ref; }
    var all = list(data().products);
    for (var i = 0; i < all.length; i++) { if (all[i] && all[i].id === ref) { return all[i]; } }
    return null;
  }

  /* El acabado que se ve en la foto base (data.js: imageColor), o null. */
  function imageColorOf(p) {
    var id = p && p.imageColor;
    if (!id) { return null; }
    var colors = list(p.colors);
    for (var i = 0; i < colors.length; i++) { if (colors[i].id === id) { return colors[i]; } }
    return null;
  }

  /* Acabado por defecto: el de la foto si existe; si no, el primero. */
  function defaultColorOf(p) {
    return imageColorOf(p) || list(p && p.colors)[0] || null;
  }

  function findChoice(group, choiceId) {
    var choices = list(group && group.choices);
    for (var i = 0; i < choices.length; i++) { if (choices[i].id === choiceId) { return choices[i]; } }
    return null;
  }

  /* Acepta { grupo: opción } o el objeto que devuelve defaults() ({ colorId, selections }). */
  function selectionsOf(sel) {
    if (isObj(sel) && isObj(sel.selections)) { return sel.selections; }
    return isObj(sel) ? sel : {};
  }

  /* choice.requires = { idGrupo: [idOpción, …] }: la opción solo existe con esas otras. */
  function choiceAllowed(choice, selections) {
    if (!choice || !isObj(choice.requires)) { return !!choice; }
    for (var g in choice.requires) {
      if (has(choice.requires, g) && list(choice.requires[g]).indexOf(selections[g]) === -1) { return false; }
    }
    return true;
  }

  /* «Hoy» del catálogo: la fecha local, o la de ?hoy=AAAA-MM-DD en la URL con
     la que se abrió la página (solo para pruebas y demostraciones: se lee al
     cargar, así que sobrevive a un history.replaceState de la página, pero no
     se arrastra a otras páginas ni se guarda). */
  var FORCED_TODAY = (function () {
    try {
      var m = /[?&]hoy=(\d{4}-\d{2}-\d{2})(?:&|#|$)/.exec(window.location.search || '');
      return m && parseDate(m[1]) ? m[1] : '';
    } catch (e) { return ''; }
  })();

  function today() {
    return (FORCED_TODAY && parseDate(FORCED_TODAY)) || startOfDay(new Date());
  }

  /* En modo prueba (?hoy=…) los enlaces internos lo conservan: una prueba de
     disponibilidad hecha en inicio, auraphone o comparar sigue en comprar,
     bolsa y checkout. Sin ?hoy, el enlace no cambia. */
  function withHoy(href) {
    href = String(href == null ? '' : href);
    if (!FORCED_TODAY || /^[a-z][a-z0-9+.-]*:/i.test(href) || /[?&]hoy=/.test(href)) { return href; }
    var hash = '';
    var i = href.indexOf('#');
    if (i >= 0) { hash = href.slice(i); href = href.slice(0, i); }
    if (!/\.html(\?|$)/.test(href)) { return href + hash; }
    return href + (href.indexOf('?') >= 0 ? '&' : '?') + 'hoy=' + FORCED_TODAY + hash;
  }

  var AVAILABILITY_TITLE = { proximamente: 'Próximamente', reserva: 'Reserva', disponible: 'Disponible' };

  /**
   * Disponibilidad de un producto según sus fechas y el día de hoy:
   *   hoy < preorder            → 'proximamente' (no se puede comprar ni reservar)
   *   preorder ≤ hoy < release  → 'reserva'      (se reserva; se entrega en release)
   *   sin fechas o hoy ≥ release → 'disponible'
   */
  function availabilityOf(p, day) {
    var a = p && isObj(p.availability) ? p.availability : null;
    var preorder = a ? parseDate(a.preorder) : null;
    var release = a ? parseDate(a.release) : null;
    var now = startOfDay(day) || today();
    var status = 'disponible';
    if (release && now < release) { status = preorder && now < preorder ? 'proximamente' : 'reserva'; }
    else if (!release && preorder && now < preorder) { status = 'proximamente'; }
    var label = '';
    if (status === 'proximamente') {
      label = preorder ? 'Reserva a partir del ' + fmt.dia(preorder, now) : 'Muy pronto';
    } else if (status === 'reserva') {
      label = release ? 'Entregas a partir del ' + fmt.dia(release, now) : 'Disponible para reservar';
    }
    var title = AVAILABILITY_TITLE[status];
    return {
      status: status,
      title: title,
      label: label,
      text: label ? title + ' · ' + label : '',
      canBuy: status !== 'proximamente',
      preorder: preorder ? isoDay(preorder) : '',
      release: release ? isoDay(release) : ''
    };
  }

  var catalog = {
    families: function () { return list(data().families).slice(); },

    family: function (id) {
      var fams = list(data().families);
      for (var i = 0; i < fams.length; i++) { if (fams[i] && fams[i].id === id) { return fams[i]; } }
      return null;
    },

    /** Productos de una familia ordenados por rank (1 = el mejor). Sin argumento: todos. */
    products: function (familyId) {
      var out = list(data().products).filter(function (p) {
        return p && (!familyId || p.family === familyId);
      });
      return out.sort(function (a, b) {
        var fa = familyIndex(a.family), fb = familyIndex(b.family);
        return fa !== fb ? fa - fb : toNumber(a.rank, 99) - toNumber(b.rank, 99);
      });
    },

    product: function (id) { return getProduct(id); },

    /** Primera opción válida de cada grupo + primer color: { colorId, selections }. */
    /* El acabado por defecto es el de la foto (imageColor) si es un color del
       producto; si no, el primero. Así la tarjeta y el configurador abren con
       la etiqueta que corresponde a lo que se ve. */
    defaults: function (productRef) {
      var p = getProduct(productRef);
      if (!p) { return { colorId: '', selections: {} }; }
      var c = defaultColorOf(p);
      return { colorId: c ? c.id : '', selections: catalog.resolve(p, {}) };
    },

    /**
     * Devuelve unas selecciones completas y coherentes: rellena los grupos que
     * falten y, si una opción deja de ser válida (requires), salta a la primera
     * válida de su grupo.
     */
    resolve: function (productRef, selections) {
      var p = getProduct(productRef);
      var out = {};
      if (!p) { return out; }
      var groups = list(p.options);
      var input = selectionsOf(selections);
      var i, g;
      for (i = 0; i < groups.length; i++) {
        g = groups[i];
        out[g.id] = findChoice(g, input[g.id]) ? input[g.id] : (list(g.choices)[0] || {}).id;
      }
      /* Las dependencias pueden encadenarse: se repite hasta que nada cambia. */
      for (var pass = 0; pass <= groups.length; pass++) {
        var changed = false;
        for (i = 0; i < groups.length; i++) {
          g = groups[i];
          if (choiceAllowed(findChoice(g, out[g.id]), out)) { continue; }
          var choices = list(g.choices);
          for (var c = 0; c < choices.length; c++) {
            if (choiceAllowed(choices[c], out)) { out[g.id] = choices[c].id; changed = true; break; }
          }
        }
        if (!changed) { break; }
      }
      return out;
    },

    /** Opciones de un grupo con `available` según el resto de selecciones. */
    choices: function (productRef, groupId, selections) {
      var p = getProduct(productRef);
      if (!p) { return []; }
      var sel = catalog.resolve(p, selections);
      var groups = list(p.options);
      for (var i = 0; i < groups.length; i++) {
        if (groups[i].id !== groupId) { continue; }
        return list(groups[i].choices).map(function (ch) {
          return {
            id: ch.id, label: ch.label, delta: toNumber(ch.delta), note: ch.note || '',
            available: choiceAllowed(ch, sel), selected: sel[groupId] === ch.id
          };
        });
      }
      return [];
    },

    /**
     * basePrice + suma de los delta elegidos. Las selecciones pasan antes por
     * resolve(): lo que falte cuenta como la primera opción válida y una
     * combinación imposible (requires) se corrige igual que en la bolsa, así
     * que el precio que se ve es siempre el que se cobrará.
     */
    price: function (productRef, selections) {
      var p = getProduct(productRef);
      if (!p) { return 0; }
      var sel = catalog.resolve(p, selections);
      var total = toNumber(p.basePrice);
      list(p.options).forEach(function (g) {
        var ch = findChoice(g, sel[g.id]) || list(g.choices)[0];
        if (ch) { total += toNumber(ch.delta); }
      });
      return cents(total);
    },

    /** Etiquetas de las opciones elegidas (ya resueltas), en el orden de los grupos. */
    optionLabels: function (productRef, selections) {
      var p = getProduct(productRef);
      if (!p) { return []; }
      var sel = catalog.resolve(p, selections);
      var out = [];
      list(p.options).forEach(function (g) {
        var ch = findChoice(g, sel[g.id]) || list(g.choices)[0];
        if (ch && ch.label) { out.push(ch.label); }
      });
      return out;
    },

    /** El color con ese id; si no existe (o no se indica), el acabado por defecto (el de la foto, ver defaults()). */
    color: function (productRef, colorId) {
      var p = getProduct(productRef);
      var colors = list(p && p.colors);
      for (var i = 0; i < colors.length; i++) { if (colors[i].id === colorId) { return colors[i]; } }
      return defaultColorOf(p);
    },

    /** Precio de AuraCare+ por unidad para un producto (o para un id de familia). */
    carePrice: function (ref) {
      var p = getProduct(ref);
      var fam = p ? p.family : ref;
      var care = data().care;
      return care && isObj(care.prices) ? toNumber(care.prices[fam]) : 0;
    },

    /**
     * Foto de un producto para un acabado: { slot, fallback, exact, color, alt }.
     * - Solo se pide la foto por color si `imageVariants` dice que existe; si
     *   no, `slot` es directamente la foto base (sin peticiones fallidas ni
     *   parpadeo al cambiar de color: el hueco no cambia).
     * - `color`: el acabado que se VE en la foto (null si no se aprecia).
     * - `exact`: false si la foto enseña OTRO acabado que el pedido (la
     *   página debe decirlo: «Imagen en Azul glacial · Tu acabado: Negro»).
     * - `alt`: descripción de la foto real (data.js: imageAlt / imageVariants).
     */
    image: function (productRef, colorId) {
      var p = getProduct(productRef);
      if (!p || !p.image) { return { slot: '', fallback: '', exact: true, color: null, alt: '' }; }
      var variants = isObj(p.imageVariants) ? p.imageVariants : {};
      if (colorId && has(variants, colorId)) {
        return { slot: p.image + '-' + colorId, fallback: p.image, exact: true, color: catalog.color(p, colorId), alt: String(variants[colorId] || p.imageAlt || '') };
      }
      var shown = imageColorOf(p);
      return {
        slot: p.image,
        fallback: '',
        exact: !colorId || !shown || shown.id === colorId,
        color: shown,
        alt: String(p.imageAlt || '')
      };
    },

    /** Fecha de hoy (Date a medianoche local); ?hoy=AAAA-MM-DD en la URL la cambia para pruebas. */
    today: today,

    /**
     * { status: 'proximamente' | 'reserva' | 'disponible', title, label, text,
     *   canBuy, preorder, release } (fechas en 'AAAA-MM-DD'). El segundo
     * argumento, opcional, es el día que se evalúa (por defecto, today()).
     */
    availability: function (productRef, day) {
      return availabilityOf(getProduct(productRef), day);
    },

    /**
     * Modelo de entrada de una familia: el más asequible que ya se puede
     * comprar (si no hay ninguno, el más asequible que se pueda reservar; si
     * tampoco, el más asequible). Es el del precio «Desde» y el destino del
     * botón «Comprar» de la barra local, igual en las tres familias.
     */
    entry: function (familyId) {
      var all = catalog.products(familyId);
      function cheapest(arr) {
        return arr.reduce(function (a, p) {
          var pa = a ? toNumber(a.basePrice) : Infinity;
          var pp = toNumber(p.basePrice);
          return !a || (pp > 0 && pp < pa) ? p : a;
        }, null);
      }
      return cheapest(all.filter(function (p) { return availabilityOf(p).status === 'disponible'; })) ||
        cheapest(all.filter(function (p) { return availabilityOf(p).canBuy; })) ||
        cheapest(all);
    },

    /** «Configurar» si aún no se puede reservar, «Reservar» en reserva y «Comprar» si está disponible. */
    cta: function (productRef) {
      var s = availabilityOf(getProduct(productRef)).status;
      return s === 'proximamente' ? 'Configurar' : (s === 'reserva' ? 'Reservar' : 'Comprar');
    },

    /** comprar.html?producto=ID (con ?hoy si la página se abrió con él). */
    url: function (productRef) {
      var p = getProduct(productRef);
      return withHoy('comprar.html?producto=' + encodeURIComponent(p ? p.id : String(productRef || '')));
    },

    /** Enlace interno con ?hoy=AAAA-MM-DD si la página se abrió con él (pruebas); si no, igual. */
    withHoy: withHoy,

    /**
     * Construye una línea de bolsa completa a partir de una configuración:
     * line(productId, { colorId, selections, care, qty }).
     */
    line: function (productRef, config) {
      var p = getProduct(productRef);
      if (!p) { return null; }
      config = config || {};
      var selections = catalog.resolve(p, config.selections);
      var color = catalog.color(p, config.colorId);
      var care = !!config.care;
      var line = {
        productId: p.id,
        name: p.name,
        colorId: color ? color.id : '',
        colorName: color ? color.name : '',
        selections: selections,
        optionLabels: catalog.optionLabels(p, selections),
        care: care,
        unitPrice: cents(catalog.price(p, selections) + (care ? catalog.carePrice(p) : 0)),
        qty: Math.max(1, Math.round(toNumber(config.qty, 1)) || 1),
        image: p.image || '',
        availability: availabilityOf(p)
      };
      line.lineId = makeLineId(line);
      return line;
    }
  };
  AURA.catalog = catalog;


  /* ------------------------------------------------------------------------
     4. Bolsa
     ------------------------------------------------------------------------ */

  var MAX_QTY = 99;
  var removedAt = {};   // lineId → índice que ocupaba (para restore sin índice)

  /* Dos líneas son «idénticas» si coinciden producto, color, opciones y AuraCare+. */
  function makeLineId(line) {
    var sel = isObj(line.selections) ? line.selections : {};
    var pairs = Object.keys(sel).sort().map(function (k) { return k + ':' + sel[k]; });
    return [line.productId, line.colorId || '', pairs.join(','), line.care ? 'care' : ''].join('|');
  }

  function clampQty(q) {
    q = Math.round(toNumber(q, 1));
    return Math.min(MAX_QTY, Math.max(1, q || 1));
  }

  function normalizeLine(input) {
    if (!isObj(input) || !input.productId) { return null; }
    /* El catálogo manda: nombre, opciones coherentes y precio salen siempre de
       data.js (una sola fuente de verdad). Un producto que no está en el
       catálogo —un modelo retirado al renovar «los tres mejores», o una línea
       manipulada— no entra en la bolsa ni cuenta en el total: nunca se usa un
       unitPrice que llegue de fuera. Sin catálogo (data.js no cargó) la bolsa
       se lee vacía, pero no se borra lo guardado mientras nadie la modifique. */
    var line = catalog.line(input.productId, input);
    if (!line) { return null; }
    line.qty = clampQty(input.qty);
    line.lineId = input.lineId ? String(input.lineId) : makeLineId(line);
    return line;
  }

  function loadBag() {
    var raw = store.get(KEYS.bag, []);
    var out = [];
    list(raw).forEach(function (l) {
      var line = normalizeLine(l);
      if (line && line.unitPrice >= 0) { out.push(line); }
    });
    return out;
  }

  function saveBag(items, reason, line) {
    store.set(KEYS.bag, items);
    emit('aura:bag', { reason: reason, line: line ? clone(line) : null, items: clone(items), count: countOf(items), subtotal: subtotalOf(items) });
  }

  function countOf(items) { return items.reduce(function (n, l) { return n + l.qty; }, 0); }
  function subtotalOf(items) { return cents(items.reduce(function (n, l) { return n + l.unitPrice * l.qty; }, 0)); }

  function indexOfLine(items, lineId) {
    for (var i = 0; i < items.length; i++) { if (items[i].lineId === lineId) { return i; } }
    return -1;
  }

  var bag = {
    maxQty: MAX_QTY,

    /** Copia de las líneas de la bolsa. */
    items: function () { return loadBag(); },

    /** Suma de cantidades. */
    count: function () { return countOf(loadBag()); },

    subtotal: function () { return subtotalOf(loadBag()); },

    /**
     * Añade una línea; si ya hay una idéntica, suma la cantidad.
     * Acepta una línea completa o lo mínimo: { productId, colorId, selections, care, qty }.
     * Devuelve la línea resultante, o null si el producto no existe o todavía
     * no se puede comprar ni reservar (catalog.availability(p).canBuy === false).
     */
    add: function (input) {
      var line = normalizeLine(input);
      if (!line || (line.availability && !line.availability.canBuy)) { return null; }
      var items = loadBag();
      var i = indexOfLine(items, line.lineId);
      if (i >= 0) {
        items[i].qty = clampQty(items[i].qty + line.qty);
        line = items[i];
      } else {
        items.push(line);
      }
      saveBag(items, 'add', line);
      return clone(line);
    },

    /** Cambia la cantidad (entre 1 y maxQty). Devuelve la línea o null si no existe. */
    setQty: function (lineId, qty) {
      var items = loadBag();
      var i = indexOfLine(items, lineId);
      if (i < 0) { return null; }
      items[i].qty = clampQty(qty);
      saveBag(items, 'qty', items[i]);
      return clone(items[i]);
    },

    /** Elimina la línea y la devuelve (para ofrecer «Deshacer»). */
    remove: function (lineId) {
      var items = loadBag();
      var i = indexOfLine(items, lineId);
      if (i < 0) { return null; }
      var removed = items.splice(i, 1)[0];
      removedAt[removed.lineId] = i;
      saveBag(items, 'remove', removed);
      return clone(removed);
    },

    /** Devuelve una línea eliminada a su sitio (index es opcional: se recuerda). */
    restore: function (input, index) {
      var line = normalizeLine(input);
      if (!line) { return null; }
      var items = loadBag();
      var existing = indexOfLine(items, line.lineId);
      if (existing >= 0) {
        items[existing].qty = clampQty(items[existing].qty + line.qty);
        line = items[existing];
      } else {
        var at = typeof index === 'number' && isFinite(index) ? index : removedAt[line.lineId];
        if (typeof at !== 'number') { at = items.length; }
        items.splice(Math.min(items.length, Math.max(0, Math.round(at))), 0, line);
      }
      delete removedAt[line.lineId];
      saveBag(items, 'restore', line);
      return clone(line);
    },

    clear: function () { saveBag([], 'clear', null); }
  };
  AURA.bag = bag;


  /* ------------------------------------------------------------------------
     5. ID de AURA (simulado en este navegador)
     La contraseña nunca se guarda: solo SHA-256(sal + ':' + contraseña) con una
     sal aleatoria por usuario. Si no hay crypto.subtle se usa una implementación
     propia de SHA-256 que da exactamente el mismo resultado, así que una cuenta
     creada de una forma se puede abrir de la otra. Es una demostración, no un
     sistema de seguridad real.
     ------------------------------------------------------------------------ */

  var SHA_K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function utf8Bytes(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c >= 0xd800 && c <= 0xdbff) {
        var d = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
        if (d >= 0xdc00 && d <= 0xdfff) { c = 0x10000 + ((c & 0x3ff) << 10) + (d & 0x3ff); i++; } else { c = 0xfffd; }
      } else if (c >= 0xdc00 && c <= 0xdfff) {
        c = 0xfffd;
      }
      if (c < 0x80) { out.push(c); }
      else if (c < 0x800) { out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f)); }
      else if (c < 0x10000) { out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f)); }
      else { out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f)); }
    }
    return out;
  }

  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }

  function sha256(str) {
    var bytes = utf8Bytes(String(str));
    var len = bytes.length;
    var total = (((len + 8) >> 6) + 1) * 16;
    var words = new Array(total);
    var i, j;
    for (i = 0; i < total; i++) { words[i] = 0; }
    for (i = 0; i < len; i++) { words[i >> 2] |= bytes[i] << (24 - (i % 4) * 8); }
    words[len >> 2] |= 0x80 << (24 - (len % 4) * 8);
    words[total - 2] = Math.floor((len * 8) / 4294967296);
    words[total - 1] = (len * 8) | 0;

    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var w = new Array(64);
    for (i = 0; i < total; i += 16) {
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (j = 0; j < 64; j++) {
        if (j < 16) {
          w[j] = words[i + j] | 0;
        } else {
          var s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
          var s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
          w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
        }
        var t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + SHA_K[j] + w[j]) | 0;
        var t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(function (x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
  }

  function bufferToHex(buffer) {
    var view = new Uint8Array(buffer);
    var out = '';
    for (var i = 0; i < view.length; i++) { out += ('0' + view[i].toString(16)).slice(-2); }
    return out;
  }

  /** SHA-256 en hexadecimal → Promise<string>. Usa crypto.subtle si existe. */
  function digest(text) {
    try {
      var c = window.crypto || window.msCrypto;
      if (c && c.subtle && typeof window.TextEncoder === 'function') {
        return Promise.resolve(c.subtle.digest('SHA-256', new window.TextEncoder().encode(text)))
          .then(bufferToHex)
          .catch(function () { return sha256(text); });
      }
    } catch (e) { /* seguimos con la alternativa */ }
    return Promise.resolve(sha256(text));
  }

  function randomSalt() {
    var out = '';
    try {
      var c = window.crypto || window.msCrypto;
      var bytes = new Uint8Array(16);
      c.getRandomValues(bytes);
      for (var i = 0; i < bytes.length; i++) { out += ('0' + bytes[i].toString(16)).slice(-2); }
      return out;
    } catch (e) {
      for (var j = 0; j < 32; j++) { out += Math.floor(Math.random() * 16).toString(16); }
      return out;
    }
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function normEmail(v) { return String(v == null ? '' : v).trim().toLowerCase(); }

  function loadUsers() {
    var u = store.get(KEYS.users, {});
    return isObj(u) ? u : {};
  }

  /* Datos públicos del usuario (nunca la sal ni la huella). Con la sesión
     actual añade si se mantiene en el dispositivo (remember) y desde cuándo. */
  function publicUser(rec) {
    if (!rec) { return null; }
    var out = { nombre: rec.nombre || '', apellidos: rec.apellidos || '', email: rec.email || '', creado: rec.creado || '' };
    var s = currentSession();
    if (s && normEmail(s.email) === normEmail(rec.email)) {
      out.remember = !s.tab;
      out.desde = s.desde || '';
    }
    return out;
  }

  /* La sesión «solo esta pestaña» vive en sessionStorage y manda sobre la otra. */
  function currentSession() {
    var t = tabStore.get(KEYS.session, null);
    if (isObj(t) && t.email) { t.tab = true; return t; }
    var s = store.get(KEYS.session, null);
    return isObj(s) && s.email ? s : null;
  }

  function startSession(email, remember) {
    var session = { email: email, desde: new Date().toISOString() };
    if (remember === false) {
      store.remove(KEYS.session);
      tabStore.set(KEYS.session, session);
    } else {
      tabStore.remove(KEYS.session);
      store.set(KEYS.session, session);
    }
  }

  function fail(error, field, code) { return { ok: false, error: error, field: field || '', code: code || '' }; }

  var auth = {
    emailPattern: EMAIL_RE,

    /**
     * Usuario con sesión iniciada o null:
     * { nombre, apellidos, email, creado (ISO, fecha de alta), remember
     *   (true = sesión mantenida en este dispositivo; false = solo esta pestaña),
     *   desde (ISO, inicio de la sesión) }.
     */
    user: function () {
      var s = currentSession();
      if (!s) { return null; }
      return publicUser(loadUsers()[normEmail(s.email)]);
    },

    /**
     * Crea un ID de AURA e inicia sesión.
     * register({ nombre, apellidos, email, password }) → Promise<{ ok, error, field, code, user }>
     */
    register: function (input) {
      try {
        input = input || {};
        var nombre = String(input.nombre || '').trim();
        var apellidos = String(input.apellidos || '').trim();
        var email = normEmail(input.email);
        var password = String(input.password == null ? '' : input.password);

        if (!nombre) { return Promise.resolve(fail('Escribe tu nombre.', 'nombre', 'required')); }
        if (!apellidos) { return Promise.resolve(fail('Escribe tus apellidos.', 'apellidos', 'required')); }
        if (!EMAIL_RE.test(email)) { return Promise.resolve(fail('Escribe un correo completo, como nombre@correo.com.', 'email', 'email')); }
        if (password.length < 8) { return Promise.resolve(fail('La contraseña necesita al menos 8 caracteres.', 'password', 'password')); }
        if (loadUsers()[email]) { return Promise.resolve(fail('Ya existe un ID de AURA con ese correo. Inicia sesión o usa otro.', 'email', 'exists')); }

        var salt = randomSalt();
        return digest(salt + ':' + password).then(function (hash) {
          var users = loadUsers();
          if (users[email]) { return fail('Ya existe un ID de AURA con ese correo. Inicia sesión o usa otro.', 'email', 'exists'); }
          users[email] = { nombre: nombre, apellidos: apellidos, email: email, salt: salt, hash: hash, algo: 'sha256', creado: new Date().toISOString() };
          store.set(KEYS.users, users);
          startSession(email, input.remember);
          emit('aura:auth', { user: publicUser(users[email]), reason: 'register' });
          return { ok: true, error: '', user: publicUser(users[email]) };
        }).catch(function () {
          return fail('No hemos podido crear tu ID de AURA. Inténtalo de nuevo.', '', 'unknown');
        });
      } catch (e) {
        return Promise.resolve(fail('No hemos podido crear tu ID de AURA. Inténtalo de nuevo.', '', 'unknown'));
      }
    },

    /**
     * login(email, password, { remember }) → Promise<{ ok, error, user }>
     * El mensaje de error no dice cuál de los dos datos falla (no revela qué correos existen).
     */
    login: function (email, password, opts) {
      var generic = 'El ID de AURA o la contraseña no coinciden. Revisa los datos e inténtalo de nuevo.';
      try {
        email = normEmail(email);
        password = String(password == null ? '' : password);
        var rec = loadUsers()[email];
        var salt = rec ? rec.salt : 'aura';          // se calcula igualmente para no delatar si existe
        return digest(salt + ':' + password).then(function (hash) {
          if (!rec || !rec.hash || rec.hash !== hash) { return fail(generic, '', 'credentials'); }
          startSession(email, opts && opts.remember);
          emit('aura:auth', { user: publicUser(rec), reason: 'login' });
          return { ok: true, error: '', user: publicUser(rec) };
        }).catch(function () { return fail(generic, '', 'credentials'); });
      } catch (e) {
        return Promise.resolve(fail(generic, '', 'credentials'));
      }
    },

    logout: function () {
      store.remove(KEYS.session);
      tabStore.remove(KEYS.session);
      emit('aura:auth', { user: null, reason: 'logout' });
    },

    /** Cambia nombre y apellidos del usuario actual → Promise<{ ok, error, user }>. */
    update: function (fields) {
      try {
        var s = currentSession();
        var users = loadUsers();
        var rec = s ? users[normEmail(s.email)] : null;
        if (!rec) { return Promise.resolve(fail('Inicia sesión para cambiar tus datos.', '', 'session')); }
        fields = fields || {};
        if (fields.nombre != null) {
          if (!String(fields.nombre).trim()) { return Promise.resolve(fail('Escribe tu nombre.', 'nombre', 'required')); }
          rec.nombre = String(fields.nombre).trim();
        }
        if (fields.apellidos != null) {
          if (!String(fields.apellidos).trim()) { return Promise.resolve(fail('Escribe tus apellidos.', 'apellidos', 'required')); }
          rec.apellidos = String(fields.apellidos).trim();
        }
        store.set(KEYS.users, users);
        emit('aura:auth', { user: publicUser(rec), reason: 'update' });
        return Promise.resolve({ ok: true, error: '', user: publicUser(rec) });
      } catch (e) {
        return Promise.resolve(fail('No hemos podido guardar los cambios.', '', 'unknown'));
      }
    },

    /** Borra el ID de AURA actual y sus pedidos de este navegador. Irreversible. */
    remove: function () {
      var s = currentSession();
      if (!s) { return false; }
      var email = normEmail(s.email);
      var users = loadUsers();
      delete users[email];
      store.set(KEYS.users, users);
      store.set(KEYS.orders, list(store.get(KEYS.orders, [])).filter(function (o) { return !o || o.owner !== email; }));
      auth.logout();
      return true;
    }
  };
  AURA.auth = auth;


  /* ------------------------------------------------------------------------
     6. Pedidos (simulados). Jamás se guardan datos de tarjeta: cualquier campo
     con pinta de tarjeta se descarta antes de escribir en localStorage.
     ------------------------------------------------------------------------ */

  var CARD_KEY = /(tarjeta|card|cvv|cvc|csc|caducidad|expir|vencim|iban|pan$)/i;
  var CARD_SAFE = /^(metodo|método|method|marca|brand|ultimos4|últimos4|last4)$/i;

  /* Algoritmo de Luhn: el dígito de control que llevan todos los números de tarjeta. */
  function luhn(digits) {
    var sum = 0;
    for (var i = 0; i < digits.length; i++) {
      var d = digits.charCodeAt(digits.length - 1 - i) - 48;
      if (i % 2) { d *= 2; if (d > 9) { d -= 9; } }
      sum += d;
    }
    return sum % 10 === 0;
  }

  /* Solo cadenas (un número de tarjeta se escribe en un campo de texto): de 13
     a 19 cifras, con espacios o guiones, y que pasen Luhn. Los números de JS
     (marcas de tiempo en ms, importes) nunca se tocan. */
  function looksLikeCard(v) {
    if (typeof v !== 'string') { return false; }
    var digits = v.replace(/[\s-]/g, '');
    return /^\d{13,19}$/.test(digits) && luhn(digits);
  }

  function stripCardData(value) {
    if (Array.isArray(value)) { return value.map(stripCardData); }
    if (!isObj(value)) { return looksLikeCard(value) ? undefined : value; }
    var out = {};
    Object.keys(value).forEach(function (k) {
      if (CARD_KEY.test(k) && !CARD_SAFE.test(k)) { return; }
      var v = stripCardData(value[k]);
      if (v !== undefined) { out[k] = v; }
    });
    return out;
  }

  function loadOrders() { return list(store.get(KEYS.orders, [])).filter(isObj); }

  function ownerEmail() {
    var u = auth.user();
    return u ? normEmail(u.email) : null;
  }

  var orders = {
    /** Pedidos del usuario actual (o los hechos como invitado), del más reciente al más antiguo. */
    list: function () {
      var owner = ownerEmail();
      return loadOrders()
        .filter(function (o) { return (o.owner || null) === owner; })
        .sort(function (a, b) { return String(b.fecha).localeCompare(String(a.fecha)); });
    },

    /** Guarda el pedido y lo devuelve con id («AU-2026-000123»), fecha y estado. */
    create: function (order) {
      var all = loadOrders();
      var now = new Date();
      /* Con ?hoy (demostraciones) el pedido lleva ese día, a la hora actual:
         todo lo que depende del día sale de catalog.today() (§14.3). */
      if (FORCED_TODAY) {
        var day = today();
        now = new Date(day.getFullYear(), day.getMonth(), day.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
      }
      var seq = 122;
      all.forEach(function (o) {
        var m = /-(\d+)$/.exec(String(o.id || ''));
        if (m) { seq = Math.max(seq, parseInt(m[1], 10)); }
      });
      var saved = stripCardData(clone(isObj(order) ? order : {})) || {};
      saved.id = 'AU-' + now.getFullYear() + '-' + ('000000' + (seq + 1)).slice(-6);
      saved.fecha = now.toISOString();
      saved.owner = ownerEmail();
      if (!saved.estado) { saved.estado = 'En preparación'; }
      all.push(saved);
      store.set(KEYS.orders, all);
      emit('aura:orders', { order: clone(saved) });
      return clone(saved);
    },

    /** Pedido por id (solo si es del usuario actual o se hizo como invitado). */
    get: function (id) {
      var owner = ownerEmail();
      var all = loadOrders();
      for (var i = 0; i < all.length; i++) {
        if (all[i].id === id && (!all[i].owner || all[i].owner === owner)) { return clone(all[i]); }
      }
      return null;
    }
  };
  AURA.orders = orders;


  /* ------------------------------------------------------------------------
     7. AURA Trade In: crédito que se descuenta en bolsa y checkout
     ------------------------------------------------------------------------ */

  function findById(arr, id) {
    arr = list(arr);
    for (var i = 0; i < arr.length; i++) { if (arr[i] && arr[i].id === id) { return arr[i]; } }
    return null;
  }

  /* Tope por dispositivo: data.tradeIn.cap. Sin él, no hay más tope que el
     valor máximo de cada dispositivo. */
  function tradeCap() {
    var cap = toNumber((data().tradeIn || {}).cap);
    return cap > 0 ? cap : Infinity;
  }

  function capped(value) { return Math.min(tradeCap(), Math.max(0, value)); }

  var tradeIn = {
    /** Valor estimado en euros: max del dispositivo × factor del estado, como mucho `cap`. */
    estimate: function (deviceId, conditionId) {
      var t = data().tradeIn || {};
      var device = findById(t.devices, deviceId);
      var condition = findById(t.conditions, conditionId);
      if (!device || !condition) { return 0; }
      return capped(Math.round(toNumber(device.max) * toNumber(condition.factor)));
    },

    /**
     * El mejor valor posible (el dispositivo que más vale, en el mejor estado,
     * con el tope aplicado): la cifra de «hasta X €». Con un id de familia,
     * solo entre los dispositivos de esa familia.
     */
    max: function (familyId) {
      var t = data().tradeIn || {};
      var best = 0;
      list(t.conditions).forEach(function (c) { best = Math.max(best, toNumber(c && c.factor)); });
      var top = 0;
      list(t.devices).forEach(function (d) {
        if (d && (!familyId || d.family === familyId)) { top = Math.max(top, toNumber(d.max)); }
      });
      return capped(Math.round(top * best));
    },

    /** Crédito guardado: { deviceId, conditionId, value, deviceName, conditionLabel } o null. */
    get: function () {
      var t = store.get(KEYS.tradein, null);
      if (!isObj(t) || !(toNumber(t.value) > 0)) { return null; }
      /* Nunca se fía del valor guardado: si el dispositivo y el estado están en
         el catálogo, se recalcula (estimate); si no, se le aplica el tope. */
      var cat = data().tradeIn || {};
      var device = findById(cat.devices, t.deviceId);
      var condition = findById(cat.conditions, t.conditionId);
      var value = device && condition ? tradeIn.estimate(t.deviceId, t.conditionId) : capped(cents(t.value));
      if (!(value > 0)) { return null; }
      return {
        deviceId: t.deviceId || '', conditionId: t.conditionId || '', value: cents(value),
        deviceName: device ? device.name : (t.deviceName || ''),
        conditionLabel: condition ? condition.label : (t.conditionLabel || '')
      };
    },

    /** Guarda el crédito. Si el dispositivo y el estado están en el catálogo, el valor sale de ahí. */
    set: function (input) {
      input = input || {};
      var t = data().tradeIn || {};
      var device = findById(t.devices, input.deviceId);
      var condition = findById(t.conditions, input.conditionId);
      var value = device && condition ? tradeIn.estimate(input.deviceId, input.conditionId)
        : capped(cents(input.value));
      if (!(value > 0)) { tradeIn.clear(); return null; }
      var saved = {
        deviceId: String(input.deviceId || ''), conditionId: String(input.conditionId || ''), value: value,
        deviceName: device ? device.name : String(input.deviceName || ''),
        conditionLabel: condition ? condition.label : String(input.conditionLabel || '')
      };
      store.set(KEYS.tradein, saved);
      emit('aura:tradein', { tradeIn: clone(saved) });
      return clone(saved);
    },

    clear: function () {
      store.remove(KEYS.tradein);
      emit('aura:tradein', { tradeIn: null });
    },

    /** Descuento aplicable a un subtotal (nunca mayor que el propio subtotal). */
    discount: function (subtotal) {
      var t = tradeIn.get();
      return t ? Math.min(t.value, Math.max(0, cents(subtotal))) : 0;
    }
  };
  /* AURA.tradeIn.cap: tope por dispositivo (data.tradeIn.cap), siempre al día.
     Sin tope en el catálogo vale el mejor valor posible (max()). */
  try {
    Object.defineProperty(tradeIn, 'cap', {
      get: function () { var c = tradeCap(); return c === Infinity ? tradeIn.max() : c; },
      enumerable: true, configurable: true
    });
  } catch (e) { tradeIn.cap = toNumber((data().tradeIn || {}).cap); }
  AURA.tradeIn = tradeIn;


  /* ------------------------------------------------------------------------
     8. Huecos de imagen
     <img class="aura-img" src="…/NOMBRE.webp" data-slot="NOMBRE"> pide
     directamente la .webp (el formato de las fotos del sitio). Si falla, se
     prueban NOMBRE.png y NOMBRE.jpg, luego data-fallback (.webp, .png, .jpg)
     y, si nada carga, se sustituye por el marcador .aura-slot. Los
     listeners van en fase de captura (los eventos 'error' y 'load' de las
     imágenes no burbujean) y se registran aquí, en el <head>, antes de que
     exista ninguna imagen.

     Presentación (skill: aparición corta, solo opacidad): una foto que aún
     no ha llegado lleva .is-pending (opacidad 0) y, al decodificarse, pasa a
     .is-loaded con un fundido de 240 ms (sin animación con «reducir
     movimiento»). La que ya estaba en caché nunca se oculta (no parpadea) y
     la del primer héroe (fetchpriority="high") tampoco, para no retrasar el
     LCP. .is-loaded también deja al CSS quitar el marco de su contenedor.
     ------------------------------------------------------------------------ */

  var IMG_DIR = 'assets/img/';
  var EXTS = ['webp', 'png', 'jpg'];
  var missing = {};   // rutas que ya han fallado en esta página

  function slotDir(img) {
    var m = /^(.*\/)[^\/]*$/.exec(img.getAttribute('src') || '');
    return m ? m[1] : IMG_DIR;
  }

  function slotQueue(dir, slot, fallback) {
    var out = [];
    [slot, fallback].forEach(function (name) {
      if (!name) { return; }
      EXTS.forEach(function (ext) { out.push(dir + name + '.' + ext); });
    });
    return out;
  }

  function slotMarker(img, dir) {
    var slot = img.getAttribute('data-slot') || '';
    var w = img.getAttribute('width') || '4';
    var h = img.getAttribute('height') || '3';
    var alt = img.getAttribute('alt') || '';
    var div = document.createElement('div');
    /* Las clases de la página pasan al marcador; las de estado (.is-pending,
       .is-entering, .is-leaving…) no: describen al <img> que se va, y el
       marcador heredaría su opacidad 0. */
    var extra = (img.getAttribute('class') || '').split(/\s+/).filter(function (c) { return c && c !== 'aura-img' && c.indexOf('is-') !== 0; });
    div.className = ['aura-slot'].concat(extra).join(' ');
    if (alt) {
      div.setAttribute('role', 'img');
      div.setAttribute('aria-label', alt);
    } else {
      div.setAttribute('aria-hidden', 'true');
    }
    div.setAttribute('data-slot', slot);
    if (img.id) { div.id = img.id; }
    if (img.hasAttribute('data-aura-reveal')) { div.setAttribute('data-aura-reveal', img.getAttribute('data-aura-reveal')); }
    var style = (img.getAttribute('style') || '').replace(/\s*;?\s*$/, '');
    div.setAttribute('style', (style ? style + ';' : '') + '--w:' + w + ';--h:' + h);
    /* Con data-fallback, la ruta principal es la del hueco BASE (el último que
       se prueba: con esa imagen basta para todos los colores) y debajo, en
       pequeño, la variante opcional (por color). */
    var fallback = img.getAttribute('data-fallback') || '';
    var main = fallback || slot;
    var optional = '';
    if (fallback && slot && slot !== fallback) {
      optional = slot.indexOf(fallback + '-') === 0
        ? 'Opcional, una por color: …' + slot.slice(fallback.length) + '.webp'
        : 'Opcional, solo para este hueco: ' + slot + '.webp';
    }
    div.innerHTML =
      '<div class="aura-slot__inner">' +
        '<i class="aura-slot__icon bi bi-image" aria-hidden="true"></i>' +
        '<span class="aura-slot__path">' + esc(dir + main + '.webp') + '</span>' +
        (optional ? '<span class="aura-slot__optional">' + esc(optional) + '</span>' : '') +
        '<span class="aura-slot__size">' + esc(w) + ' × ' + esc(h) + ' px</span>' +
      '</div>';
    /* Lo necesario para volver a montar el <img> (AURA.slots.set). */
    div._auraSlot = { width: w, height: h, alt: alt, dir: dir, fallback: fallback };
    return div;
  }

  function handleImageError(img) {
    if (!img || img.tagName !== 'IMG' || !img.hasAttribute || !img.hasAttribute('data-slot')) { return; }
    var slot = img.getAttribute('data-slot') || '';
    var fallback = img.getAttribute('data-fallback') || '';
    var current = img.getAttribute('src') || '';
    var st = img._auraSlot;
    if (!st || st.slot !== slot || st.fallback !== fallback) {
      var dir = slotDir(img);
      st = img._auraSlot = { slot: slot, fallback: fallback, dir: dir, queue: slotQueue(dir, slot, fallback) };
    }
    if (current) { missing[current] = true; }
    while (st.queue.length) {
      var next = st.queue.shift();
      if (next !== current && !missing[next]) {
        img.setAttribute('src', next);
        return;
      }
    }
    if (!img.parentNode) { return; }
    var marker = slotMarker(img, st.dir);
    img.parentNode.replaceChild(marker, img);
    emit('aura:slot', { el: marker, slot: slot });
  }

  /* Estado de presentación de un hueco: ya visible (.is-loaded), en camino
     (.is-pending, opacidad 0) o nada que hacer. Se llama al entrar el <img>
     en el documento (antes de pintarse: los MutationObserver corren antes
     del siguiente fotograma) y al cambiarle la ruta. */
  function markImage(img) {
    if (!img || img.tagName !== 'IMG' || !img.classList) { return; }
    if (img.complete && img.naturalWidth > 0) {
      img.classList.remove('is-pending');
      img.classList.add('is-loaded');
      return;
    }
    img.classList.remove('is-loaded', 'is-instant');
    /* El primer héroe no se oculta: aparece en cuanto llega (LCP). */
    if (img.getAttribute('fetchpriority') === 'high') { return; }
    if (img.getAttribute('src')) {
      img.classList.add('is-pending');
      img._auraPendingAt = clock();
    }
  }

  function clock() {
    try { return window.performance.now(); } catch (e) { return Date.now(); }
  }

  function scanImages(rootEl) {
    try {
      var imgs = (rootEl || document).querySelectorAll('img[data-slot]');
      for (var i = 0; i < imgs.length; i++) {
        /* complete + naturalWidth 0 = ya falló (las perezosas aún sin pedir no están «complete») */
        if (imgs[i].complete && imgs[i].naturalWidth === 0 && imgs[i].getAttribute('src')) { handleImageError(imgs[i]); }
        else { markImage(imgs[i]); }
      }
    } catch (e) { /* nada */ }
  }

  document.addEventListener('error', function (e) {
    try {
      /* Un error atrasado de una ruta anterior llega cuando la nueva aún está
         cargando (complete === false): se ignora; la nueva dará su propio aviso. */
      if (e.target && e.target.complete === false) { return; }
      handleImageError(e.target);
    } catch (err) { /* nada */ }
  }, true);

  /* Decodificada: fuera .is-pending (el CSS funde la opacidad) y .is-loaded
     para el contenedor (marco, máscara). */
  document.addEventListener('load', function (e) {
    try {
      var img = e.target;
      if (!img || img.tagName !== 'IMG' || !img.hasAttribute('data-slot') || !img.naturalWidth) { return; }
      /* Llegó casi al instante (caché de disco): aparece sin fundido, como si
         ya estuviera; el fundido es para lo que de verdad se hace esperar. */
      if (img.classList.contains('is-pending') && clock() - (img._auraPendingAt || 0) < 80) { img.classList.add('is-instant'); }
      img.classList.remove('is-pending');
      img.classList.add('is-loaded');
    } catch (err) { /* nada */ }
  }, true);

  /* Cada <img data-slot> que entra en el documento (el del HTML, mientras se
     analiza, y el que inserte después cualquier script) se marca antes de
     pintarse: así una foto a medio llegar nunca se ve a trozos ni de golpe. */
  try {
    if (typeof window.MutationObserver === 'function') {
      new window.MutationObserver(function (records) {
        for (var r = 0; r < records.length; r++) {
          var added = records[r].addedNodes;
          for (var n = 0; n < added.length; n++) {
            var node = added[n];
            if (node.nodeType !== 1) { continue; }
            if (node.tagName === 'IMG') { if (node.hasAttribute('data-slot')) { markImage(node); } continue; }
            if (!node.querySelectorAll) { continue; }
            var imgs = node.querySelectorAll('img[data-slot]');
            for (var k = 0; k < imgs.length; k++) { markImage(imgs[k]); }
          }
        }
      }).observe(document.documentElement, { childList: true, subtree: true });
    }
  } catch (e) { /* sin observador, las fotos aparecen como siempre */ }

  AURA.slots = {
    /** Revisa las imágenes que ya hubieran fallado dentro de root (o de todo el documento). */
    scan: scanImages,

    /**
     * Cambia la imagen de un hueco (p. ej. al elegir otro color). `el` puede ser
     * el <img> o el marcador .aura-slot que lo sustituyó. Devuelve el <img>.
     * Si la nueva imagen tampoco existe volverá a convertirse en marcador: no
     * guardes la referencia, vuelve a buscar '.aura-img, .aura-slot'.
     */
    set: function (el, name, opts) {
      try {
        if (!el || !name) { return null; }
        opts = opts || {};
        var img = el;
        var dir = opts.dir || IMG_DIR;
        if (el.tagName !== 'IMG') {
          var meta = el._auraSlot || {};
          img = document.createElement('img');
          var extra = (el.getAttribute('class') || '').split(/\s+/).filter(function (c) { return c && c !== 'aura-slot'; });
          img.className = ['aura-img'].concat(extra).join(' ');
          img.setAttribute('width', meta.width || (el.style && el.style.getPropertyValue('--w')) || '1600');
          img.setAttribute('height', meta.height || (el.style && el.style.getPropertyValue('--h')) || '1200');
          img.setAttribute('alt', opts.alt != null ? opts.alt : (el.getAttribute('aria-label') || ''));
          img.setAttribute('decoding', 'async');
          if (el.id) { img.id = el.id; }
          if (el.hasAttribute('data-aura-reveal')) { img.setAttribute('data-aura-reveal', el.getAttribute('data-aura-reveal')); }
          var style = (el.getAttribute('style') || '').replace(/--[wh]\s*:[^;]*;?/g, '').trim();
          if (style) { img.setAttribute('style', style); }
          if (meta.dir && !opts.dir) { dir = meta.dir; }
          if (el.parentNode) { el.parentNode.replaceChild(img, el); }
        } else {
          if (!opts.dir) { dir = slotDir(img); }
          if (opts.alt != null) { img.setAttribute('alt', opts.alt); }
        }
        img._auraSlot = null;
        img.setAttribute('data-slot', name);
        if (opts.fallback) { img.setAttribute('data-fallback', opts.fallback); } else { img.removeAttribute('data-fallback'); }
        var src = dir + name + '.webp';
        if (img.getAttribute('src') !== src) {
          img.setAttribute('src', src);
          markImage(img);                 // ya en caché: sigue visible; si no, se funde al llegar
        }
        return img;
      } catch (e) { return null; }
    }
  };

  /**
   * HTML de un hueco de imagen con el marcado exacto del sistema.
   * opts: { className, fallback, width, height, alt, eager, priority }.
   * `priority: true` = la imagen del primer héroe (sin carga diferida y con
   * fetchpriority="high"); `eager` sin `priority`, solo sin carga diferida.
   */
  function imgHTML(name, opts) {
    opts = opts || {};
    return '<img class="aura-img' + (opts.className ? ' ' + esc(opts.className) : '') + '"' +
      ' src="' + IMG_DIR + esc(name) + '.webp" data-slot="' + esc(name) + '"' +
      (opts.fallback ? ' data-fallback="' + esc(opts.fallback) + '"' : '') +
      ' width="' + esc(opts.width || 1600) + '" height="' + esc(opts.height || 1200) + '"' +
      ' alt="' + esc(opts.alt || '') + '"' +
      ' loading="' + (opts.eager || opts.priority ? 'eager' : 'lazy') + '"' +
      (opts.priority ? ' fetchpriority="high"' : '') + ' decoding="async">';
  }

  /**
   * Tarjeta de modelo (docs/COMPONENTES.md §12.4): la que pinta [data-aura-lineup]
   * y la que cualquier página puede meter en un carrusel o una rejilla.
   * productCard(producto | id, { heading: 'h3', colorId }) → cadena HTML ('' si no existe).
   */
  function productCardHTML(productRef, opts) {
    var p = getProduct(productRef);
    if (!p) { return ''; }
    opts = opts || {};
    var tag = /^h[1-6]$/i.test(String(opts.heading || '')) ? String(opts.heading).toLowerCase() : 'h3';
    var colors = list(p.colors);
    /* Sin colorId, el acabado que se ve en la foto: la etiqueta dice lo que se ve. */
    var shown = (opts.colorId && catalog.color(p, opts.colorId)) || defaultColorOf(p);
    var href = esc(catalog.url(p));
    var cta = catalog.cta(p);
    var a = availabilityOf(p);
    var image = catalog.image(p, shown ? shown.id : '');
    var price = toNumber(p.basePrice);     // sin precio válido (0, texto…) no se enseña «Desde 0 €»
    return '<article class="aura-product-card" data-product="' + esc(p.id) + '" data-status="' + a.status + '">' +
      '<a class="aura-product-card__media" href="' + href + '" tabindex="-1" aria-hidden="true">' +
        (image.slot ? imgHTML(image.slot, { fallback: image.fallback }) : '') +
      '</a>' +
      '<div class="aura-product-card__body">' +
        (p.badge ? '<p class="aura-eyebrow aura-eyebrow--mono aura-eyebrow--plain">' + esc(p.badge) + '</p>' : '') +
        '<' + tag + ' class="aura-product-card__name"><a href="' + href + '">' + esc(p.name) + '</a></' + tag + '>' +
        (shown ? '<p class="aura-product-card__finish">' + esc(shown.name) + '</p>' : '') +
        (colors.length
          ? '<p class="aura-swatch-list" role="img" aria-label="Acabados: ' +
              esc(colors.map(function (c) { return String(c.name).toLowerCase(); }).join(', ')) + '">' +
              colors.map(function (c) { return '<span class="aura-swatch-list__dot" style="--swatch:' + esc(c.hex) + '"></span>'; }).join('') +
            '</p>'
          : '') +
        '<p class="aura-product-card__text">' + esc(p.tagline || '') + '</p>' +
        '<div class="aura-product-card__foot">' +
          (a.text
            ? '<p class="aura-product-card__status"><i class="bi bi-calendar-event" aria-hidden="true"></i><span>' + esc(a.text) + '</span></p>'
            : '') +
          (price > 0
            ? '<p class="aura-product-card__price">' +
                '<span class="aura-price">Desde ' + esc(fmt.eur0(price)) + '</span>' +
                '<span class="aura-caption">o ' + esc(fmt.mes(price)) + ' durante ' + months() + NBSP + 'meses</span>' +
              '</p>'
            : '') +
          '<a class="aura-btn aura-btn--primary" href="' + href + '" aria-label="' + esc(cta + ' ' + p.name) + '">' + esc(cta) + '</a>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  /**
   * «Por qué comprar en AURA»: las cuatro ventajas de la tienda, siempre en el
   * mismo orden y con las cifras del catálogo (envío, meses de financiación,
   * «hasta X €» de Trade In de la familia y precio de AuraCare+). La pinta
   * [data-aura-perks="FAMILIA"] (sin familia: la tienda entera, en inicio).
   * storePerks(familia?, { heading: 'h3' }) → cadena HTML.
   */
  function storePerksHTML(familyId, opts) {
    opts = opts || {};
    var tag = /^h[1-6]$/i.test(String(opts.heading || '')) ? String(opts.heading).toLowerCase() : 'h3';
    var fam = familyId ? catalog.family(familyId) : null;
    var famName = fam ? fam.name : '';
    var standard = toNumber((data().shipping || {}).standard);
    var m = months();
    var entry = fam ? catalog.entry(fam.id) : null;
    var tradeMax = tradeIn.max(fam ? fam.id : undefined);
    var care = data().care || {};
    var careName = care.name || 'AuraCare+';
    var carePrices = isObj(care.prices) ? care.prices : {};
    var careFrom = fam ? catalog.carePrice(fam.id) : 0;
    if (!fam) {
      Object.keys(carePrices).forEach(function (k) {
        var v = toNumber(carePrices[k]);
        if (v > 0 && (!careFrom || v < careFrom)) { careFrom = v; }
      });
    }
    var cards = [
      { icon: 'bi-truck', value: standard > 0 ? fmt.eur(standard) : 'Gratis',
        title: standard > 0 ? 'Envío y devolución' : 'Envío y devolución gratis',
        text: 'Recíbelo en 2–3' + NBSP + 'días laborables o recógelo en una AURA' + NBSP + 'Store. Si no te convence, tienes 14' + NBSP + 'días para devolverlo.',
        link: 'Ver envíos y devoluciones', href: 'soporte.html?q=devoluci%C3%B3n#preguntas' },
      { icon: 'bi-credit-card-2-front', value: '0' + NBSP + '% TAE',
        title: 'Paga en ' + m + NBSP + 'meses sin intereses',
        text: entry && toNumber(entry.basePrice) > 0
          ? 'El ' + entry.name + ', desde ' + fmt.mes(entry.basePrice) + ', con la cuota a la vista antes de decidir.'
          : 'Con la cuota a la vista antes de decidir, en todos los modelos.',
        link: 'Ver cómo financiar', href: 'soporte.html?q=financiar#preguntas' },
      { icon: 'bi-arrow-repeat', value: tradeMax > 0 ? 'Hasta ' + fmt.eur0(tradeMax) : '',
        title: 'AURA' + NBSP + 'Trade' + NBSP + 'In',
        text: 'Entrega tu dispositivo actual y descuenta su valor de tu nuevo ' + (famName || 'AURA') + ', al instante.',
        link: 'Valorar mi dispositivo', href: 'trade-in.html' },
      { icon: 'bi-shield-check', value: careFrom > 0 ? (fam ? '' : 'Desde ') + fmt.eur0(careFrom) : '',
        title: careName,
        text: care.description || 'Dos años de cobertura frente a daños accidentales y asistencia prioritaria.',
        link: 'Ver qué cubre ' + careName, href: 'soporte.html?q=auracare#preguntas' }
    ];
    return cards.map(function (c, i) {
      return '<div class="aura-feature aura-feature--card" data-aura-reveal style="--i:' + i + '">' +
        '<span class="aura-feature__icon"><i class="bi ' + c.icon + '" aria-hidden="true"></i></span>' +
        (c.value ? '<p class="aura-feature__value">' + esc(c.value) + '</p>' : '') +
        '<' + tag + ' class="aura-feature__title">' + esc(c.title) + '</' + tag + '>' +
        '<p class="aura-feature__text">' + esc(c.text) + '</p>' +
        '<a class="aura-link" href="' + esc(c.href) + '">' + esc(c.link) + '</a>' +
      '</div>';
    }).join('');
  }

  /**
   * Tarjeta de familia (bolsa vacía, «¿Qué vas a estrenar?» de Trade In,
   * comparador vacío): imagen del modelo de entrada, nombre, lema, «Desde X €»
   * y «Ver FAMILIA». familyCard(familia, { heading: 'h3', href }) → cadena HTML.
   */
  function familyCardHTML(familyId, opts) {
    opts = opts || {};
    var fam = catalog.family(familyId);
    var products = fam ? catalog.products(fam.id) : [];
    if (!fam || !products.length) { return ''; }
    var tag = /^h[1-6]$/i.test(String(opts.heading || '')) ? String(opts.heading).toLowerCase() : 'h3';
    var entry = catalog.entry(fam.id) || products[0];
    var from = products.reduce(function (min, p) {
      var v = toNumber(p.basePrice);
      return v > 0 && (!min || v < min) ? v : min;
    }, 0);
    var img = catalog.image(entry);
    var href = opts.href || fam.page || '';
    return '<a class="aura-card aura-card--flush aura-family-card" href="' + esc(href) + '">' +
        '<div class="aura-family-card__media">' + (img.slot ? imgHTML(img.slot, { alt: '' }) : '') + '</div>' +
        '<div class="aura-family-card__body">' +
          '<p class="aura-eyebrow aura-eyebrow--mono aura-eyebrow--plain">' + esc(fam.name) + '</p>' +
          '<' + tag + ' class="aura-h4">' + esc(fam.tagline || '') + '</' + tag + '>' +
          (fam.description ? '<p class="aura-caption">' + esc(fam.description) + '</p>' : '') +
          '<p class="aura-family-card__foot">' +
            (from > 0 ? '<span class="aura-caption">Desde ' + esc(fmt.eur0(from)) + '</span>' : '') +
            '<span class="aura-link">Ver ' + esc(fam.name) + '</span>' +
          '</p>' +
        '</div>' +
      '</a>';
  }

  AURA.html = { esc: esc, img: imgHTML, productCard: productCardHTML, storePerks: storePerksHTML, familyCard: familyCardHTML };


  /* ------------------------------------------------------------------------
     8 bis. Letra pequeña común (docs/COMPONENTES.md §6, «Notas al pie»)
     Un único texto por tema para todas las páginas, con las cifras del
     catálogo (meses, tope de Trade In, envío). En el HTML basta con
     <li data-aura-legal="financiacion"></li> (o un <span> dentro de una nota):
     aura-core.js lo rellena al cargar. Desde JS: AURA.legal.text('tradein').
     ------------------------------------------------------------------------ */

  var LEGAL_KEYS = ['precios', 'financiacion', 'tradein', 'reservas', 'envio', 'cifras', 'demo'];

  function legalText(key) {
    var m = months();
    var ship = data().shipping || {};
    var standard = toNumber(ship.standard);
    var cap = tradeCap();
    switch (key) {
      case 'precios':
        return 'Precios de venta recomendados en España, IVA incluido.';
      case 'financiacion':
        return 'Financiación en ' + m + NBSP + 'meses sin intereses (0' + NBSP + '% TIN, 0' + NBSP + '% TAE), sujeta a la aprobación de la entidad financiera. ' +
          'La cuota mensual es el precio dividido entre ' + m + ' y se redondea al céntimo.';
      case 'tradein':
        return 'El valor de AURA' + NBSP + 'Trade' + NBSP + 'In depende del modelo y del estado del dispositivo' +
          (cap !== Infinity && cap > 0 ? ', con un máximo de ' + fmt.eur0(cap) + ' por dispositivo,' : '') +
          ' y se descuenta del pedido una sola vez, al tramitarlo.';
      case 'reservas':
        return 'Los productos en reserva se pagan al tramitar el pedido y se entregan a partir de su fecha de lanzamiento: un pedido con una reserva sale completo ese día.';
      case 'envio':
        return (standard > 0 ? 'El envío estándar cuesta ' + fmt.eur(standard) + '.' : 'El envío estándar es gratuito.') +
          ' Puedes devolver lo que compres, sin coste, en los 14' + NBSP + 'días siguientes a recibirlo.';
      case 'cifras':
        return 'La autonomía, el rendimiento y el resto de cifras técnicas son orientativos y dependen de la configuración y del uso. Las imágenes son ilustrativas.';
      case 'demo':
        return 'AURA es un proyecto de demostración: los pedidos, los pagos, la financiación y AURA' + NBSP + 'Trade' + NBSP + 'In son simulados, y no se cobra ni se concede nada.';
      default:
        return '';
    }
  }

  function fillLegal(rootEl) {
    try {
      var els = (rootEl || document).querySelectorAll('[data-aura-legal]');
      for (var i = 0; i < els.length; i++) {
        var t = legalText(els[i].getAttribute('data-aura-legal'));
        if (t) { els[i].textContent = t; }
      }
    } catch (e) { /* el texto escrito en el HTML se queda */ }
  }

  AURA.legal = {
    keys: LEGAL_KEYS.slice(),
    /** Texto común de una nota: 'precios', 'financiacion', 'tradein', 'reservas', 'envio', 'cifras' o 'demo'. */
    text: legalText,
    /** Rellena los [data-aura-legal] de root (por defecto, todo el documento). */
    fill: function (rootEl) { fillLegal(rootEl); }
  };


  /* ------------------------------------------------------------------------
     9. Buscador (lógica pura: aura-ui.js pone el comportamiento)
     ------------------------------------------------------------------------ */

  var FAMILY_ICON = { auraphone: 'bi-phone', aurapad: 'bi-tablet-landscape', aurabook: 'bi-laptop' };

  /** Minúsculas, sin acentos ni comillas de pulgadas: «auraPad Pro 13″» → «aurapad pro 13». */
  function norm(text) {
    var s = String(text == null ? '' : text).toLowerCase();
    try { if (s.normalize) { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } } catch (e) { /* nada */ }
    return s.replace(/[″"”“'’·,.;:()+]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function quickLinks() {
    var user = auth.user();
    return [
      { title: 'Comparar modelos', href: 'comparar.html', keys: 'comparar comparador modelos especificaciones diferencias', quick: true },
      { title: 'AURA Trade In', href: 'trade-in.html', keys: 'trade in entregar renovar descuento valorar dispositivo antiguo', quick: true },
      { title: 'Soporte', href: 'soporte.html', keys: 'soporte ayuda asistencia', quick: true },
      { title: 'Bolsa', href: 'bolsa.html', keys: 'bolsa carrito cesta compra pedido', quick: true },
      user
        ? { title: 'Tu cuenta', href: 'cuenta.html', keys: 'cuenta id perfil pedidos sesion', quick: true }
        : { title: 'Iniciar sesión', href: 'login.html', keys: 'iniciar sesion entrar acceder cuenta id login', quick: true }
    ];
  }

  function extraLinks() {
    var out = catalog.families().map(function (f) {
      return { title: f.name, href: f.page, keys: (f.name || '') + ' ' + (f.tagline || '') };
    });
    return out.concat([
      { title: 'Crear un ID de AURA', href: 'registro.html', keys: 'crear cuenta registro registrarse id nuevo' },
      { title: 'Preguntas frecuentes', href: 'soporte.html#preguntas', keys: 'preguntas frecuentes faq dudas envio devolucion garantia' },
      { title: 'Contacto', href: 'soporte.html#contacto', keys: 'contacto contactar telefono chat escribir' },
      { title: 'Acerca de AURA', href: 'acerca.html', keys: 'acerca empresa historia quienes somos' },
      { title: 'Accesibilidad', href: 'acerca.html#accesibilidad', keys: 'accesibilidad' },
      { title: 'Medio ambiente', href: 'acerca.html#medio-ambiente', keys: 'medio ambiente sostenibilidad reciclaje' },
      { title: 'Newsroom', href: 'acerca.html#newsroom', keys: 'newsroom noticias prensa novedades' },
      { title: 'Privacidad', href: 'legal.html#privacidad', keys: 'privacidad datos personales' },
      { title: 'Uso de cookies', href: 'legal.html#cookies', keys: 'cookies' },
      { title: 'Condiciones de uso', href: 'legal.html#condiciones', keys: 'condiciones terminos legal' }
    ]);
  }

  function matches(haystack, tokens) {
    for (var i = 0; i < tokens.length; i++) { if (haystack.indexOf(tokens[i]) === -1) { return false; } }
    return true;
  }

  var search = {
    normalize: norm,

    /** { query, products: [producto…], links: [{ title, href }…], total } */
    query: function (text) {
      var q = norm(text);
      if (!q) { return { query: '', products: [], links: quickLinks(), total: 0 }; }
      var tokens = q.split(' ');
      var all = catalog.products();
      /* Primero por nombre y familia; solo si no hay nada, por chip o distintivo («m5», «plegable»). */
      var products = all.filter(function (p) {
        var fam = catalog.family(p.family) || {};
        return matches(norm(p.name + ' ' + (fam.name || '')), tokens);
      });
      if (!products.length) {
        products = all.filter(function (p) {
          return matches(norm([p.name, p.badge, p.tagline, p.specs && p.specs.chip].join(' ')), tokens);
        });
      }
      var links = quickLinks().concat(extraLinks()).filter(function (l) {
        return matches(norm(l.title + ' ' + l.keys), tokens);
      });
      return { query: q, products: products, links: links, total: products.length + links.length };
    },

    /** HTML de los resultados (contenido de [data-aura-search-results]). */
    html: function (text) {
      var r = search.query(text);
      var out = '';
      if (r.query && !r.total) {
        return '<p class="aura-search__empty">No hay resultados para «' + esc(String(text).trim()) + '». Prueba con auraPhone, auraPad o auraBook.</p>';
      }
      if (r.products.length) {
        out += '<p class="aura-search__heading">Productos</p><ul class="aura-search__list">';
        r.products.forEach(function (p) {
          var a = availabilityOf(p);
          out += '<li><a class="aura-search__item" href="' + esc(catalog.url(p)) + '">' +
            '<i class="bi ' + (FAMILY_ICON[p.family] || 'bi-box') + '" aria-hidden="true"></i>' +
            '<span class="aura-search__item-title">' + esc(p.name) +
              (a.text ? '<span class="aura-search__item-status">' + esc(a.text) + '</span>' : '') + '</span>' +
            '<span class="aura-search__item-meta">Desde ' + esc(fmt.eur0(p.basePrice)) + '</span></a></li>';
        });
        out += '</ul>';
      }
      if (r.links.length) {
        out += '<p class="aura-search__heading">Accesos rápidos</p><ul class="aura-search__list">';
        r.links.forEach(function (l) {
          out += '<li><a class="aura-search__item" href="' + esc(l.href) + '">' +
            '<i class="bi bi-arrow-right-short" aria-hidden="true"></i>' +
            '<span class="aura-search__item-title">' + esc(l.title) + '</span></a></li>';
        });
        out += '</ul>';
      }
      return out;
    },

    /** Texto para la región aria-live: «3 resultados», «1 resultado», «Sin resultados» o ''. */
    status: function (text) {
      var r = search.query(text);
      if (!r.query) { return ''; }
      if (!r.total) { return 'Sin resultados'; }
      return r.total === 1 ? '1 resultado' : r.total + ' resultados';
    }
  };
  AURA.search = search;


  /* ------------------------------------------------------------------------
     10. <aura-header> y <aura-footer>
     DOM normal (sin shadow DOM). El marcado es el de docs/COMPONENTES.md §12.
     ------------------------------------------------------------------------ */

  var NAV = [
    { key: 'auraphone', label: 'auraPhone', href: 'auraphone.html' },
    { key: 'aurapad', label: 'auraPad', href: 'aurapad.html' },
    { key: 'aurabook', label: 'auraBook', href: 'aurabook.html' },
    { key: 'comparar', label: 'Comparar', href: 'comparar.html' },
    { key: 'tradein', label: 'Trade In', href: 'trade-in.html' },
    { key: 'soporte', label: 'Soporte', href: 'soporte.html' }
  ];

  var BRAND =
    '<a class="aura-brand" href="index.html" aria-label="AURA, inicio">' +
      '<img class="aura-brand__mark" src="assets/img/aura.png" width="28" height="28" alt="">' +
      '<span class="aura-brand__word">AURA</span>' +
    '</a>';

  function bagLabel(count) {
    if (!count) { return 'Bolsa, vacía'; }
    return 'Bolsa, ' + fmt.articulos(count);
  }

  function lineMeta(line, withQty) {
    var parts = [];
    if (line.colorName) { parts.push(line.colorName); }
    list(line.optionLabels).forEach(function (l) { parts.push(l); });
    if (line.care) { parts.push((data().care && data().care.name) || 'AuraCare+'); }
    if (withQty) { parts.push('× ' + line.qty); }
    return parts.join(' · ');
  }

  /* Solo la foto que existe (la del color si hay variante; si no, la base). */
  function lineImage(line) {
    var img = catalog.image(line.productId, line.colorId);
    if (!img.slot && line.image) { img = { slot: line.image, fallback: '' }; }
    return img.slot ? imgHTML(img.slot, { fallback: img.fallback }) : '';
  }

  function bagPopoverHTML() {
    var items = bag.items();
    var user = auth.user();
    if (!items.length) {
      return '<div class="aura-popover__header"><h2 class="aura-popover__title">Bolsa</h2></div>' +
        '<p class="aura-popover__empty">Tu bolsa está vacía.</p>' +
        '<ul class="aura-popover__links">' +
          '<li><a href="auraphone.html"><i class="bi bi-phone" aria-hidden="true"></i>Ver auraPhone</a></li>' +
          '<li><a href="aurapad.html"><i class="bi bi-tablet-landscape" aria-hidden="true"></i>Ver auraPad</a></li>' +
          '<li><a href="aurabook.html"><i class="bi bi-laptop" aria-hidden="true"></i>Ver auraBook</a></li>' +
          (user
            ? '<li><a href="cuenta.html"><i class="bi bi-person-circle" aria-hidden="true"></i>Tu cuenta</a></li>'
            : '<li><a href="login.html"><i class="bi bi-person-circle" aria-hidden="true"></i>Iniciar sesión</a></li>') +
        '</ul>';
    }
    var out = '<div class="aura-popover__header"><h2 class="aura-popover__title">Bolsa</h2>' +
      '<span class="aura-caption">' + esc(fmt.articulos(countOf(items))) + '</span></div>' +
      '<ul class="aura-popover__list">';
    items.forEach(function (line) {
      var href = esc(catalog.url(line.productId));
      out += '<li class="aura-bag-line aura-bag-line--compact">' +
        '<a class="aura-bag-line__media" href="' + href + '" tabindex="-1" aria-hidden="true">' + lineImage(line) + '</a>' +
        '<div class="aura-bag-line__info">' +
          '<p class="aura-bag-line__name"><a href="' + href + '">' + esc(line.name) + '</a></p>' +
          '<p class="aura-bag-line__meta">' + esc(lineMeta(line)) + '</p>' +
        '</div>' +
        '<div class="aura-bag-line__price"><span class="aura-price">' + esc(fmt.eur(line.unitPrice * line.qty)) + '</span>' +
          (line.qty > 1 ? '<span class="aura-bag-line__qty">' + esc(line.qty + ' × ' + fmt.eur(line.unitPrice)) + '</span>' : '') +
        '</div>' +
      '</li>';
    });
    out += '</ul>' +
      '<div class="aura-popover__footer">' +
        '<p class="aura-popover__total"><span>Subtotal</span><span class="aura-price">' + esc(fmt.eur(subtotalOf(items))) + '</span></p>' +
        '<a class="aura-btn aura-btn--primary aura-btn--block" href="checkout.html">Tramitar pedido</a>' +
        '<a class="aura-btn aura-btn--ghost aura-btn--block" href="bolsa.html">Ver la bolsa</a>' +
      '</div>';
    return out;
  }

  function menuSecondaryHTML() {
    var user = auth.user();
    var count = bag.count();
    return (user
        ? '<li style="--i:6"><a href="cuenta.html"><i class="bi bi-person-circle" aria-hidden="true"></i>Tu cuenta, ' + esc(user.nombre) + '</a></li>'
        : '<li style="--i:6"><a href="login.html"><i class="bi bi-person-circle" aria-hidden="true"></i>Iniciar sesión</a></li>') +
      '<li style="--i:7"><a href="bolsa.html"><i class="bi bi-bag" aria-hidden="true"></i>Bolsa' + (count ? ' (' + count + ')' : '') + '</a></li>' +
      '<li style="--i:8"><a href="acerca.html"><i class="bi bi-info-circle" aria-hidden="true"></i>Acerca de AURA</a></li>';
  }

  /* «auraPhone, auraPad o auraBook» */
  function orList(names) {
    names = names.filter(Boolean);
    if (names.length < 2) { return names.join(''); }
    return names.slice(0, -1).join(', ') + ' o ' + names[names.length - 1];
  }

  /* Cinta de Trade In: la cifra («hasta 800 €», con espacio indivisible) y las
     familias salen del catálogo; nada escrito a mano. */
  function ribbonText() {
    var best = tradeIn.max();
    var families = orList(catalog.families().map(function (f) { return f.name; }));
    var amount = best > 0 ? 'hasta ' + fmt.eur0(best) + ' de descuento' : 'un descuento';
    return 'Ahorra con AURA Trade In: entrega tu antiguo dispositivo mundano y llévate ' + amount +
      (families ? ' en tu nuevo ' + families : '') + '.';
  }

  function headerHTML(host) {
    var ribbon = (host.getAttribute('ribbon') || '').toLowerCase() !== 'off';
    var out =
      '<header class="aura-nav" data-aura-nav>' +
        '<div class="aura-container aura-nav__inner">' +
          BRAND +
          '<nav class="aura-nav__links" aria-label="Principal">' +
            NAV.map(function (n) {
              return '<a class="aura-nav__link" href="' + n.href + '" data-aura-key="' + n.key + '">' + n.label + '</a>';
            }).join('') +
          '</nav>' +
          '<div class="aura-nav__actions">' +
            '<button class="aura-nav__action" type="button" data-aura-search-open aria-label="Buscar" aria-haspopup="dialog" aria-expanded="false" aria-controls="aura-search"><i class="bi bi-search" aria-hidden="true"></i></button>' +
            '<a class="aura-nav__action aura-nav__account" href="login.html" data-aura-account><i class="bi bi-person-circle" aria-hidden="true"></i><span class="aura-nav__action-label">Iniciar sesión</span></a>' +
            '<div class="aura-nav__bag-wrap">' +
              '<button class="aura-nav__action aura-nav__bag" type="button" data-aura-popover-toggle="aura-bag-popover" aria-label="Bolsa, vacía" aria-haspopup="dialog" aria-expanded="false" aria-controls="aura-bag-popover"><i class="bi bi-bag" aria-hidden="true"></i><span class="aura-nav__count" data-aura-bag-count aria-hidden="true"></span></button>' +
              '<div class="aura-popover aura-popover--end aura-bag-popover" id="aura-bag-popover" role="dialog" aria-label="Bolsa" tabindex="-1" aria-hidden="true"></div>' +
            '</div>' +
            '<button class="aura-nav__action aura-nav__toggle" type="button" data-aura-menu-open aria-label="Abrir el menú" aria-haspopup="dialog" aria-expanded="false" aria-controls="aura-menu"><i class="bi bi-list" aria-hidden="true"></i></button>' +
          '</div>' +
        '</div>' +
      '</header>';

    if (ribbon) {
      out +=
        '<aside class="aura-ribbon" aria-label="Promoción">' +
          '<div class="aura-container">' +
            '<p class="aura-ribbon__text">' + esc(ribbonText()) + ' <a class="aura-link" href="trade-in.html">Comprobar valor cuántico</a></p>' +
          '</div>' +
        '</aside>';
    }

    out +=
      '<div class="aura-search" id="aura-search" role="dialog" aria-modal="true" aria-label="Buscar en AURA" aria-hidden="true">' +
        '<div class="aura-scrim" data-aura-search-close></div>' +
        '<div class="aura-search__panel">' +
          '<div class="aura-container aura-container--narrow">' +
            '<form class="aura-search__form" role="search" action="comparar.html">' +
              '<i class="bi bi-search" aria-hidden="true"></i>' +
              '<input class="aura-search__input" id="aura-search-input" type="search" name="q" placeholder="Buscar en AURA" aria-label="Buscar productos y páginas" autocomplete="off" autocapitalize="off" spellcheck="false">' +
              '<button class="aura-icon-btn" type="button" data-aura-search-close aria-label="Cerrar el buscador"><i class="bi bi-x-lg" aria-hidden="true"></i></button>' +
            '</form>' +
            '<div class="aura-search__results" data-aura-search-results></div>' +
            '<p class="visually-hidden" role="status" aria-live="polite" data-aura-search-status></p>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="aura-menu" id="aura-menu" role="dialog" aria-modal="true" aria-label="Menú" aria-hidden="true">' +
        '<div class="aura-container aura-menu__bar">' +
          BRAND +
          '<button class="aura-icon-btn" type="button" data-aura-menu-close aria-label="Cerrar el menú"><i class="bi bi-x-lg" aria-hidden="true"></i></button>' +
        '</div>' +
        '<nav class="aura-container aura-menu__nav" aria-label="Principal">' +
          '<ul class="aura-menu__list">' +
            NAV.map(function (n, i) {
              return '<li style="--i:' + i + '"><a class="aura-menu__link" href="' + n.href + '" data-aura-key="' + n.key + '">' + n.label + '<i class="bi bi-chevron-right" aria-hidden="true"></i></a></li>';
            }).join('') +
          '</ul>' +
          '<ul class="aura-menu__secondary" data-aura-menu-secondary></ul>' +
        '</nav>' +
      '</div>';

    return out;
  }

  function each(nodes, fn) { for (var i = 0; i < nodes.length; i++) { fn(nodes[i], i); } }

  /* Wayfinding («¿dónde estoy?»): el enlace de la sección actual queda marcado. */
  function paintActive(host) {
    var active = (host.getAttribute('active') || '').toLowerCase();
    each(host.querySelectorAll('[data-aura-key]'), function (a) {
      var on = !!active && a.getAttribute('data-aura-key') === active;
      a.classList.toggle('is-active', on);
      if (on) { a.setAttribute('aria-current', 'page'); } else { a.removeAttribute('aria-current'); }
    });
  }

  function paintAccount(host) {
    var user = auth.user();
    var link = host.querySelector('[data-aura-account]');
    if (link) {
      var label = link.querySelector('.aura-nav__action-label');
      if (user) {
        link.setAttribute('href', 'cuenta.html');
        link.setAttribute('aria-label', 'Tu cuenta, ' + (user.nombre || user.email));
        if (label) { label.textContent = user.nombre || 'Tu cuenta'; }
      } else {
        link.setAttribute('href', 'login.html');
        link.removeAttribute('aria-label');
        if (label) { label.textContent = 'Iniciar sesión'; }
      }
    }
    var secondary = host.querySelector('[data-aura-menu-secondary]');
    if (secondary) { secondary.innerHTML = menuSecondaryHTML(); }
  }

  function paintBag(host, bump) {
    var count = bag.count();
    var button = host.querySelector('.aura-nav__bag');
    var badge = host.querySelector('[data-aura-bag-count]');
    if (button) { button.setAttribute('aria-label', bagLabel(count)); }
    if (badge) {
      var text = count ? String(count) : '';
      var changed = badge.textContent !== text;
      badge.textContent = text;
      if (bump && changed && count) {
        /* Reinicia la animación aunque el contador cambie dos veces seguidas. */
        badge.classList.remove('is-bumped');
        void badge.offsetWidth;
        badge.classList.add('is-bumped');
        if (!badge._auraBump) {
          badge._auraBump = true;
          badge.addEventListener('animationend', function () { badge.classList.remove('is-bumped'); });
        }
      }
    }
    var popover = host.querySelector('#aura-bag-popover');
    if (popover) { popover.innerHTML = bagPopoverHTML(); }
    var secondary = host.querySelector('[data-aura-menu-secondary]');
    if (secondary) { secondary.innerHTML = menuSecondaryHTML(); }
  }

  function paintSearch(host) {
    var results = host.querySelector('[data-aura-search-results]');
    var input = host.querySelector('.aura-search__input');
    if (results) { results.innerHTML = search.html(input ? input.value : ''); }
  }

  function renderHeader(host) {
    try {
      host.innerHTML = headerHTML(host);
      host._auraPainted = true;
      paintActive(host);
      paintAccount(host);
      paintBag(host, false);
      paintSearch(host);
      watchRibbon(host);
    } catch (e) { /* la página sigue siendo usable sin cabecera dinámica */ }
  }

  /* --ribbon-h en <html>: el alto real de la cinta (ocupa una o dos líneas
     según el ancho). Las páginas que calculan «pantalla menos cabecera» lo
     usan en lugar de suponer un alto fijo. Sin cinta vale 0. */
  function watchRibbon(host) {
    var root = document.documentElement;
    var ribbon = host.querySelector('.aura-ribbon');
    if (!ribbon) { root.style.setProperty('--ribbon-h', '0px'); return; }
    var write = function () {
      var h = ribbon.getBoundingClientRect().height;
      if (h > 0) { root.style.setProperty('--ribbon-h', Math.round(h * 100) / 100 + 'px'); }
    };
    if (typeof window.ResizeObserver === 'function') { new window.ResizeObserver(write).observe(ribbon); }
    else { window.addEventListener('resize', write); ready(write); }
  }

  /* Solo rutas relativas del propio sitio (nada de javascript:, ni de otros dominios). */
  function safeHref(href) {
    href = String(href || '').trim();
    return /^[a-z0-9][a-z0-9_\-.\/]*\.html(?:[?#][^\s"'<>]*)?$/i.test(href) || /^#[\w\-]+$/.test(href) ? href : '';
  }

  /**
   * crumbs="auraPhone|auraphone.html;Comprar auraPhone 18 Pro" → niveles
   * separados por «;»; cada uno «texto|enlace» o solo «texto». El último es la
   * página actual (nunca enlazado). El logotipo de inicio va siempre primero.
   */
  function parseCrumbs(value) {
    return String(value || '').split(';').map(function (part) {
      var i = part.indexOf('|');
      var label = (i >= 0 ? part.slice(0, i) : part).trim();
      return { label: label, href: i >= 0 ? safeHref(part.slice(i + 1)) : '' };
    }).filter(function (c) { return c.label; });
  }

  function crumbsHTML(value) {
    var items = parseCrumbs(value);
    if (!items.length) { return ''; }
    return '<nav class="aura-footer__crumbs" aria-label="Ruta de navegación">' +
      '<ol class="aura-crumbs">' +
        '<li><a href="index.html"><img src="assets/img/aura.png" width="20" height="20" alt="AURA, inicio"></a></li>' +
        items.map(function (c, i) {
          if (i === items.length - 1) { return '<li aria-current="page">' + esc(c.label) + '</li>'; }
          return c.href ? '<li><a href="' + esc(c.href) + '">' + esc(c.label) + '</a></li>' : '<li>' + esc(c.label) + '</li>';
        }).join('') +
      '</ol>' +
    '</nav>';
  }

  function footerHTML(host) {
    var year = '2026';
    var out = '<footer class="aura-footer"><div class="aura-container">';
    out += crumbsHTML(host.getAttribute('crumbs'));
    out +=
      '<div class="aura-footer__main">' +
        '<div class="aura-footer__brand">' +
          BRAND +
          '<p class="aura-footer__tagline">Tecnología inmersiva diseñada para ampliar lo que imaginas. Precisión, profundidad y energía AURA.</p>' +
          '<ul class="aura-footer__social">' +
            '<li><a class="aura-footer__social-link" href="acerca.html#newsroom" aria-label="AURA en Instagram: novedades"><i class="bi bi-instagram" aria-hidden="true"></i></a></li>' +
            '<li><a class="aura-footer__social-link" href="acerca.html#newsroom" aria-label="AURA en YouTube: novedades"><i class="bi bi-youtube" aria-hidden="true"></i></a></li>' +
            '<li><a class="aura-footer__social-link" href="acerca.html#newsroom" aria-label="AURA en LinkedIn: novedades"><i class="bi bi-linkedin" aria-hidden="true"></i></a></li>' +
          '</ul>' +
        '</div>' +
        '<nav class="aura-footer__directory" aria-label="Directorio">' +
          footerCol('Productos', [['auraphone.html', 'auraPhone'], ['aurapad.html', 'auraPad'], ['aurabook.html', 'auraBook'], ['comparar.html', 'Comparar modelos']]) +
          footerCol('Cuenta', [['cuenta.html', 'Gestionar ID de AURA'], ['bolsa.html', 'Bolsa'], ['trade-in.html', 'AURA Trade In'], ['soporte.html', 'Soporte']]) +
          footerCol('Valores', [['legal.html#privacidad', 'Privacidad'], ['acerca.html#accesibilidad', 'Accesibilidad'], ['acerca.html#medio-ambiente', 'Medio ambiente'], ['acerca.html#proveedores', 'Proveedores']]) +
          footerCol('Empresa', [['acerca.html', 'Acerca de AURA'], ['acerca.html#newsroom', 'Newsroom'], ['acerca.html#oportunidades', 'Oportunidades'], ['soporte.html#contacto', 'Contacto']]) +
        '</nav>' +
      '</div>' +
      '<div class="aura-footer__legal">' +
        '<p class="aura-footer__copy">Copyright © ' + year + ' AURA Inc. Todos los derechos reservados.</p>' +
        '<ul class="aura-footer__legal-links">' +
          '<li><a href="legal.html#privacidad">Política de privacidad</a></li>' +
          '<li><a href="legal.html#cookies">Uso de cookies</a></li>' +
          '<li><a href="legal.html#condiciones">Condiciones de uso</a></li>' +
          '<li><a href="legal.html#imagenes">Créditos de imágenes</a></li>' +
          '<li>España</li>' +
        '</ul>' +
      '</div>' +
      '<p class="aura-footer__demo">AURA es un proyecto de demostración. Los pedidos, pagos y cuentas son simulados y solo se guardan en este navegador.</p>' +
      '</div></footer>';
    return out;
  }

  function footerCol(title, links) {
    return '<div class="aura-footer__col">' +
      '<h2 class="aura-footer__heading">' + title + '</h2>' +
      '<ul class="aura-footer__list">' +
        links.map(function (l) { return '<li><a href="' + l[0] + '">' + l[1] + '</a></li>'; }).join('') +
      '</ul>' +
    '</div>';
  }

  function renderFooter(host) {
    try {
      host.innerHTML = footerHTML(host);
      host._auraPainted = true;
    } catch (e) { /* nada */ }
  }

  function headers() {
    try { return document.querySelectorAll('aura-header'); } catch (e) { return []; }
  }

  AURA.footer = {
    /**
     * Cambia las migas del pie: setCrumbs([{ label: 'auraPhone', href: 'auraphone.html' }, 'Comprar auraPhone 18 Pro']).
     * Escribe el atributo `crumbs` (y repinta el pie). Devuelve la cadena del atributo.
     */
    setCrumbs: function (items) {
      var value = list(items).map(function (c) {
        var label = String(isObj(c) ? c.label || '' : c || '').replace(/[;|]/g, ',').trim();
        var href = isObj(c) ? safeHref(c.href) : '';
        return href ? label + '|' + href : label;
      }).filter(Boolean).join(';');
      each(document.querySelectorAll('aura-footer'), function (f) {
        f.setAttribute('crumbs', value);
        if (!defined) { renderFooter(f); }
      });
      return value;
    },
    /** La lista de niveles de un valor de `crumbs`: [{ label, href }]. */
    parse: parseCrumbs
  };

  AURA.header = {
    /** Repinta cuenta, bolsa y enlace activo de todas las cabeceras. */
    refresh: function () {
      each(headers(), function (h) {
        if (!h._auraPainted) { renderHeader(h); return; }
        try { paintActive(h); paintAccount(h); paintBag(h, false); } catch (e) { /* nada */ }
      });
    },
    /** Cambia la sección activa (equivale a poner el atributo `active`). */
    setActive: function (key) {
      each(headers(), function (h) { h.setAttribute('active', key || ''); if (!window.customElements) { paintActive(h); } });
    },
    /** Texto de la cinta de Trade In, calculado desde el catálogo (sin el enlace). */
    ribbonText: function () { return ribbonText(); }
  };

  var defined = false;
  try {
    if (window.customElements && window.HTMLElement) {
      if (!window.customElements.get('aura-header')) {
        window.customElements.define('aura-header', class extends window.HTMLElement {
          static get observedAttributes() { return ['active']; }
          connectedCallback() { if (!this._auraPainted) { renderHeader(this); } }
          attributeChangedCallback() { if (this._auraPainted) { try { paintActive(this); } catch (e) { /* nada */ } } }
        });
      }
      if (!window.customElements.get('aura-footer')) {
        window.customElements.define('aura-footer', class extends window.HTMLElement {
          static get observedAttributes() { return ['crumbs']; }
          connectedCallback() { if (!this._auraPainted) { renderFooter(this); } }
          attributeChangedCallback() { if (this._auraPainted) { renderFooter(this); } }
        });
      }
      defined = true;
    }
  } catch (e) { defined = false; }

  /* Repintado en vivo: bolsa y sesión. */
  document.addEventListener('aura:bag', function (e) {
    var sync = e && e.detail && e.detail.reason === 'sync';
    each(headers(), function (h) { if (h._auraPainted) { try { paintBag(h, !sync); } catch (err) { /* nada */ } } });
  });
  document.addEventListener('aura:auth', function () {
    each(headers(), function (h) {
      if (!h._auraPainted) { return; }
      try { paintAccount(h); paintBag(h, false); paintSearch(h); } catch (err) { /* nada */ }
    });
  });

  /* Otra pestaña ha cambiado la bolsa o la sesión. */
  try {
    window.addEventListener('storage', function (e) {
      if (!e || e.key === KEYS.bag || e.key === null) { emit('aura:bag', { reason: 'sync', items: bag.items(), count: bag.count(), subtotal: bag.subtotal(), line: null }); }
      if (!e || e.key === KEYS.session || e.key === KEYS.users || e.key === null) { emit('aura:auth', { user: auth.user(), reason: 'sync' }); }
      if (!e || e.key === KEYS.tradein || e.key === null) { emit('aura:tradein', { tradeIn: tradeIn.get() }); }
    });
  } catch (e) { /* nada */ }

  ready(function () {
    try {
      /* Sin Custom Elements, se pintan a mano cuando el documento está listo. */
      if (!defined) {
        each(document.querySelectorAll('aura-header'), renderHeader);
        each(document.querySelectorAll('aura-footer'), renderFooter);
      }
      /* Con barra local, la global deja de ser pegajosa (ver aura.css). */
      if (document.body && document.querySelector('.aura-localnav')) { document.body.classList.add('has-localnav'); }
    } catch (e) { /* nada */ }
    fillLegal(document);
    scanImages(document);
  });
  try { window.addEventListener('load', function () { scanImages(document); }); } catch (e) { /* nada */ }

})(window, document);
