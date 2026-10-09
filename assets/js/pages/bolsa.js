/* ==========================================================================
   AURA — Bolsa (bolsa.html)
   Pinta la bolsa desde AURA.bag y el catálogo, y la repinta con 'aura:bag' y
   'aura:tradein' (también si cambia en otra pestaña). Las líneas se actualizan
   en su sitio (por lineId): el foco, las imágenes y la posición de lectura no
   saltan al cambiar una cantidad.
   - Una sola acción primaria: «Tramitar pedido» del resumen (en móvil, la
     barra de compra repite esa misma acción mientras el resumen no se ve).
   - Eliminar no pide confirmación: se elimina y se ofrece «Deshacer».
   - AuraCare+ se añade o se quita en la propia línea (.aura-bag-line__care).
   - El crédito de AURA Trade In se puede quitar (con «Deshacer»).
   - Disponibilidad (line.availability): una reserva se entrega en su
     `release`; una línea que aún no se puede pedir (canBuy === false) se
     señala y bloquea «Tramitar pedido» hasta que se quite.
   Importes, plazos y topes salen siempre del catálogo (data.js).
   Script clásico: sin módulos ni fetch.
   ========================================================================== */

(function (window, document) {
  'use strict';

  var AURA = window.AURA;
  var section = document.getElementById('bolsa');
  var view = document.querySelector('[data-bolsa-vista]');
  if (!AURA || !AURA.bag || !AURA.catalog || !view || !section) { return; }

  var fmt = AURA.fmt;
  var esc = AURA.html.esc;
  var catalog = AURA.catalog;
  var util = AURA.util || {};
  var ui = AURA.ui || {};
  var IVA = 0.21;
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  var SHIPPING = (AURA.data && AURA.data.shipping) || {};
  var STANDARD = typeof SHIPPING.standard === 'number' && SHIPPING.standard > 0 ? SHIPPING.standard : 0;
  var EXPRESS = typeof SHIPPING.express === 'number' && SHIPPING.express >= 0 ? SHIPPING.express : null;

  var status = document.getElementById('bolsa-estado');
  var buybar = document.getElementById('bolsa-buybar');

  var mode = '';        // 'llena' | 'vacia'
  var els = {};         // referencias del estado lleno
  var lineEls = {};     // lineId → <li>
  var batching = false; // operaciones compuestas (AuraCare+): se pinta una sola vez al final
  var ctaObserver = null;
  var blockedNow = [];  // líneas que aún no se pueden pedir

  /* ------------------------------------------------------------------------
     Utilidades
     ------------------------------------------------------------------------ */

  function months() {
    var d = AURA.data;
    return d && d.financing && d.financing.months ? d.financing.months : 24;
  }
  function careInfo() { return (AURA.data && AURA.data.care) || {}; }
  function careName() { return careInfo().name || 'AuraCare+'; }

  function round(n) { return Math.round((Number(n) || 0) * 100) / 100; }
  function each(list, fn) { for (var i = 0; i < list.length; i++) { fn(list[i], i); } }
  function toast(opts) { return ui.toast ? ui.toast(opts) : null; }
  function setText(el, text) { if (el && el.textContent !== text) { el.textContent = text; } }

  function announce(text) {
    if (!status) { return; }
    status.textContent = '';
    window.setTimeout(function () { status.textContent = text; }, 60);
  }

  /* ?hoy=AAAA-MM-DD (solo pruebas: AURA.catalog.today) se conserva entre la
     bolsa y el checkout para que la simulación del día sea coherente. */
  var HOY = (function () {
    var m = /[?&]hoy=(\d{4}-\d{2}-\d{2})(?:&|#|$)/.exec(window.location.search || '');
    return m && util.parseDate && util.parseDate(m[1]) ? m[1] : '';
  })();
  function withHoy(href) {
    return HOY ? href + (href.indexOf('?') === -1 ? '?' : '&') + 'hoy=' + HOY : href;
  }

  function today() { return catalog.today ? catalog.today() : new Date(); }

  function addBusinessDays(from, n) {
    var d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    while (n > 0) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) { n--; }
    }
    return d;
  }

  /* «martes 6 de octubre»: la fecha («6 de octubre», AURA.fmt.diaMes) va
     pegada y nunca se parte («7 / de octubre»); tras el día de la semana sí
     puede saltar de línea (con texto grande, «miércoles 14 de octubre» entero
     no cabe en la columna). */
  var NB = '\u00a0';
  function dayNum(d) { return DIAS[d.getDay()] + ' ' + d.getDate(); }
  function shortDay(d) { return fmt.diaMes ? fmt.diaMes(d) : d.getDate() + NB + 'de' + NB + MESES[d.getMonth()]; }
  function dayLabel(d) { return DIAS[d.getDay()] + ' ' + shortDay(d); }

  /* «entre el martes 6 y el miércoles 7 de octubre» (el mes, una vez si coincide). */
  function rangeLabel(a, b) {
    return 'entre el ' + (a.getMonth() === b.getMonth() ? dayNum(a) : dayLabel(a)) + ' y el ' + dayLabel(b);
  }

  function availabilityOf(line) { return line.availability || catalog.availability(line.productId); }
  function isBlocked(line) { return availabilityOf(line).canBuy === false; }

  function listNames(names) {
    return names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + ' y ' + names[names.length - 1];
  }
  /* Nombres con artículo («el auraPhone Duo»), sin repetir. */
  function uniqueNames(lines) {
    var out = [];
    lines.forEach(function (l) { var n = 'el ' + l.name; if (out.indexOf(n) === -1) { out.push(n); } });
    return out;
  }

  function totals(items) {
    var subtotal = 0;
    var count = 0;
    items.forEach(function (l) { subtotal += l.unitPrice * l.qty; count += l.qty; });
    subtotal = round(subtotal);
    var trade = AURA.tradeIn ? AURA.tradeIn.get() : null;
    var descuento = AURA.tradeIn ? AURA.tradeIn.discount(subtotal) : 0;
    var total = round(subtotal - descuento + STANDARD);
    return { subtotal: subtotal, count: count, trade: trade, descuento: descuento, total: total, iva: round(total * IVA / (1 + IVA)) };
  }

  function indexOfLine(items, lineId) {
    for (var i = 0; i < items.length; i++) { if (items[i].lineId === lineId) { return i; } }
    return -1;
  }

  function capitalize(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  /* Configuración de la línea: cada dato es un bloque que no se parte
     («Pantalla estándar», «Wi‑Fi») y lleva su «·» dentro, para que ninguna
     línea empiece por el separador. */
  function metaHTML(list) {
    var parts = list.filter(Boolean).join(' · ').split(' · ').filter(Boolean);
    return parts.map(function (p, i) {
      return '<span class="bolsa-line__part">' + esc(p) + (i < parts.length - 1 ? NB + '·' : '') + '</span>';
    }).join(' ');
  }

  function ref(n, id) {
    return '<sup class="aura-footnote-ref"><a href="#nota-' + n + '" id="' + id + '" aria-label="Nota ' + n + '">' + n + '</a></sup>';
  }

  /* ------------------------------------------------------------------------
     Estado vacío
     ------------------------------------------------------------------------ */

  /* Accesos a las familias: la tarjeta de familia de la base (la misma que
     «¿Qué vas a estrenar?» de Trade In). */
  function familyCards() {
    return catalog.families().map(function (f) { return AURA.html.familyCard(f.id); }).join('');
  }


  function familyList() {
    return listNames(catalog.families().map(function (f) { return 'un ' + f.name; })).replace(/ y (un [^,]+)$/, ' o $1');
  }

  function renderEmpty() {
    mode = 'vacia';
    els = {};
    lineEls = {};
    blockedNow = [];
    stopCtaObserver();
    var user = AURA.auth ? AURA.auth.user() : null;
    var text = user
      ? 'Cuando añadas ' + familyList() + ', aparecerá aquí, listo para tramitar.'
      : 'Inicia sesión para tramitar más rápido y seguir tus pedidos, o elige tu próximo AURA.';
    var trade = AURA.tradeIn ? AURA.tradeIn.get() : null;
    if (trade) {
      text += ' Tu crédito de AURA Trade In de ' + fmt.eur(trade.value) + ' te espera.';
    }
    var actions = user
      ? '<a class="aura-btn aura-btn--primary" href="index.html">Seguir comprando</a>' +
        '<a class="aura-btn aura-btn--secondary" href="cuenta.html">Ver mis pedidos</a>'
      : '<a class="aura-btn aura-btn--primary" href="login.html?volver=bolsa.html">Iniciar sesión</a>' +
        '<a class="aura-btn aura-btn--secondary" href="index.html">Seguir comprando</a>';

    view.innerHTML =
      '<div class="aura-empty bolsa-empty">' +
        '<span class="aura-empty__icon"><i class="bi bi-bag" aria-hidden="true"></i></span>' +
        '<h1 class="aura-h1 aura-empty__title" id="bolsa-titulo" tabindex="-1">Tu bolsa está vacía.</h1>' +
        '<p class="aura-empty__text">' + esc(text) + '</p>' +
        '<div class="aura-empty__actions">' + actions + '</div>' +
      '</div>' +
      '<div class="bolsa-familias">' +
        '<h2 class="aura-h3 bolsa-familias__title">Encuentra tu próximo AURA.</h2>' +
        '<div class="aura-grid aura-grid--3 bolsa-familias__grid">' + familyCards() + '</div>' +
      '</div>';

    document.body.classList.remove('has-buybar');
    if (buybar) { buybar.hidden = true; }
    syncFootnotes();
  }

  /* ------------------------------------------------------------------------
     Estado con artículos: marco (una vez) + actualización en su sitio
     ------------------------------------------------------------------------ */

  function renderFull() {
    mode = 'llena';
    lineEls = {};
    var max = AURA.tradeIn && AURA.tradeIn.max ? AURA.tradeIn.max() : 0;

    view.innerHTML =
      '<div class="aura-section-head aura-section-head--center bolsa-head">' +
        '<p class="aura-eyebrow aura-eyebrow--mono" data-b="eyebrow"></p>' +
        '<h1 class="aura-h1" id="bolsa-titulo" tabindex="-1" data-b="titulo"></h1>' +
        '<p class="aura-lead" data-b="lead"></p>' +
      '</div>' +

      '<div class="aura-layout aura-layout--aside">' +
        '<div class="bolsa-items">' +
          '<ul class="aura-bag-list" data-b="lista" aria-label="Artículos de tu bolsa"></ul>' +
          '<div class="bolsa-items__foot">' +
            '<a class="aura-link" href="index.html">Seguir comprando</a>' +
            '<a class="aura-link" href="comparar.html">Comparar todos los modelos</a>' +
          '</div>' +
        '</div>' +

        '<aside class="aura-summary" id="resumen" aria-labelledby="resumen-titulo">' +
          '<h2 class="aura-summary__title" id="resumen-titulo">Resumen del pedido</h2>' +
          '<dl class="aura-summary__rows">' +
            '<div class="aura-summary__row"><dt>Subtotal <span class="bolsa-sum__count" data-b="count"></span></dt><dd data-b="subtotal"></dd></div>' +
            '<div class="aura-summary__row aura-summary__row--discount bolsa-trade" data-b="trade-row" hidden>' +
              '<dt><span>AURA Trade In' + ref(3, 'ref-3b') + '</span>' +
                '<span class="bolsa-trade__device" data-b="trade-device"></span>' +
                '<button class="aura-link aura-link--plain bolsa-trade__remove" type="button" data-b-trade-remove>Quitar crédito</button>' +
              '</dt>' +
              '<dd data-b="descuento"></dd>' +
            '</div>' +
            '<div class="aura-summary__row"><dt>Envío</dt><dd data-b="envio"></dd></div>' +
            '<div class="aura-summary__row aura-summary__row--total"><dt>Total</dt><dd data-b="total"></dd></div>' +
          '</dl>' +
          '<p class="aura-summary__note"><span data-b="iva"></span>' + ref(1, 'ref-1') + '. <span data-b="cuota"></span>' + ref(2, 'ref-2') + '.</p>' +
          '<p class="bolsa-bloqueo" id="bolsa-bloqueo" data-b="bloqueo" hidden><i class="bi bi-exclamation-circle" aria-hidden="true"></i><span data-b="bloqueo-texto"></span></p>' +
          '<a class="aura-btn aura-btn--primary aura-btn--block" href="checkout.html" data-b="cta" data-bolsa-cta>Tramitar pedido</a>' +
          '<div class="bolsa-trade-cta" data-b="trade-cta">' +
            '<a class="aura-link" href="trade-in.html">Añadir crédito de AURA Trade In</a>' +
            '<p class="aura-caption">Entrega tu antiguo dispositivo' + (max ? ' y ahorra hasta ' + esc(fmt.eur0(max)) : ' y ahorra') + ' en este pedido' + ref(3, 'ref-3') + '.</p>' +
          '</div>' +
          '<ul class="aura-checklist bolsa-checklist">' +
            '<li data-b="promesa"></li>' +
            '<li>Devolución gratuita en 14 días</li>' +
          '</ul>' +
        '</aside>' +
      '</div>';

    els = {};
    var nodes = view.querySelectorAll('[data-b]');
    for (var i = 0; i < nodes.length; i++) { els[nodes[i].getAttribute('data-b')] = nodes[i]; }

    document.body.classList.add('has-buybar');
    if (buybar) { buybar.classList.add('is-hidden'); buybar.hidden = false; }
    startCtaObserver();
  }

  function releaseOf(line) {
    var a = availabilityOf(line);
    return a.status === 'reserva' && util.parseDate ? util.parseDate(a.release) : null;
  }

  /* La reserva que sale más tarde: el pedido completo se envía ese día (como
     dice el checkout), así que las demás líneas llegan con ella. */
  function latestRelease(items) {
    var out = null;
    items.forEach(function (l) { var d = releaseOf(l); if (d && (!out || d > out)) { out = d; } });
    return out;
  }

  /* Entrega o estado de la línea: { kind, icon, text }. */
  function shipInfo(line, bagRelease) {
    var a = availabilityOf(line);
    if (a.canBuy === false) {
      return { kind: 'is-blocked', icon: 'bi-exclamation-circle', text: (a.text || a.title || 'Aún no disponible') + '.' };   // la fecha ya llega con espacios indivisibles
    }
    var release = releaseOf(line);
    if (release) {
      return { kind: 'is-reserva', icon: 'bi-calendar-event', text: a.title + ' · Recíbelo a partir del ' + dayLabel(release) };
    }
    var hoy = today();
    var from = addBusinessDays(hoy, 2);
    if (bagRelease && bagRelease >= from) {
      return { kind: '', icon: 'bi-truck', text: 'Llega con tu reserva, a partir del ' + dayLabel(bagRelease) };
    }
    return { kind: '', icon: 'bi-truck', text: 'Recíbelo ' + rangeLabel(from, addBusinessDays(hoy, 3)) };
  }

  function paintShip(li, line, bagRelease) {
    var el = li.querySelector('[data-b-ship]');
    if (!el) { return; }
    var info = shipInfo(line, bagRelease);
    var key = info.kind + '|' + info.text;
    if (el._key === key) { return; }
    el._key = key;
    el.className = 'bolsa-line__ship' + (info.kind ? ' ' + info.kind : '');
    el.innerHTML = '<i class="bi ' + info.icon + '" aria-hidden="true"></i><span>' + esc(info.text) + '</span>';
  }

  function careHTML(line) {
    if (isBlocked(line)) { return ''; }
    var name = careName();
    var price = fmt.eur(catalog.carePrice(line.productId));
    if (line.care) {
      return '<div class="aura-bag-line__care is-on">' +
          '<span class="aura-bag-line__care-icon"><i class="bi bi-shield-fill-check" aria-hidden="true"></i></span>' +
          '<p class="aura-bag-line__care-title">' + esc(name) + ' incluido</p>' +
          '<p class="aura-bag-line__care-text">Dos años de cobertura por ' + esc(price) + ' la unidad, ya sumados al precio.</p>' +
          '<button class="aura-link aura-link--plain" type="button" data-b-care aria-label="Quitar ' + esc(name) + ' de ' + esc(line.name) + '">Quitar ' + esc(name) + '</button>' +
        '</div>';
    }
    return '<div class="aura-bag-line__care">' +
        '<span class="aura-bag-line__care-icon"><i class="bi bi-shield-check" aria-hidden="true"></i></span>' +
        '<p class="aura-bag-line__care-title">Añade ' + esc(name) + ' por ' + esc(price) + '</p>' +
        '<p class="aura-bag-line__care-text">' + esc(careInfo().description || '') + '</p>' +
        '<button class="aura-link" type="button" data-b-care aria-label="Añadir ' + esc(name) + ' a ' + esc(line.name) + '">Añadir ' + esc(name) + '</button>' +
      '</div>';
  }

  function lineHTML(line) {
    var href = esc(catalog.url(line.productId));
    var img = catalog.image(line.productId, line.colorId);
    var meta = metaHTML([line.colorName].concat(line.optionLabels || []));
    var max = AURA.bag.maxQty || 99;
    var blocked = isBlocked(line);
    /* Lo que aún no se puede pedir no lleva cantidad: solo «Eliminar». */
    var stepper = blocked ? '' :
      '<div class="aura-stepper" role="group" aria-label="Cantidad de ' + esc(line.name) + '" data-aura-stepper data-min="1" data-max="' + max + '">' +
        '<button class="aura-stepper__btn" type="button" data-aura-step="-1" aria-label="Quitar una unidad"><i class="bi bi-dash" aria-hidden="true"></i></button>' +
        '<output class="aura-stepper__value" aria-live="polite" data-b-qty></output>' +
        '<button class="aura-stepper__btn" type="button" data-aura-step="1" aria-label="Añadir una unidad"><i class="bi bi-plus" aria-hidden="true"></i></button>' +
      '</div>';
    return '<li class="aura-bag-line bolsa-line' + (blocked ? ' is-blocked' : '') + '" data-line-id="' + esc(line.lineId) + '">' +
        /* Enlace duplicado del nombre (fuera del árbol de accesibilidad); el alt
           describe igualmente la foto real. */
        '<a class="aura-bag-line__media" href="' + href + '" tabindex="-1" aria-hidden="true">' +
          (img.slot ? AURA.html.img(img.slot, { fallback: img.fallback, alt: img.alt || line.name }) : '') +
        '</a>' +
        '<div class="aura-bag-line__info">' +
          '<h2 class="aura-bag-line__name"><a href="' + href + '">' + esc(line.name) + '</a></h2>' +
          (meta ? '<p class="aura-bag-line__meta">' + meta + '</p>' : '') +
          '<p class="bolsa-line__ship" data-b-ship></p>' +
          '<div class="aura-bag-line__actions">' +
            stepper +
            '<button class="aura-link aura-link--plain" type="button" data-b-remove aria-label="Eliminar ' + esc(line.name) + ' de la bolsa">Eliminar</button>' +
          '</div>' +
        '</div>' +
        '<div class="aura-bag-line__price">' +
          '<span class="aura-price" data-b-line-total></span>' +
          '<span class="aura-caption" data-b-line-note></span>' +
        '</div>' +
        careHTML(line) +
      '</li>';
  }

  function careKey(line) { return isBlocked(line) ? 'x' : (line.care ? 'on' : 'off'); }

  function createLine(line) {
    var tpl = document.createElement('template');
    tpl.innerHTML = lineHTML(line);
    var li = tpl.content.firstElementChild;
    li._lineId = line.lineId;
    li._careKey = careKey(line);
    return li;
  }

  /* AuraCare+ cambia en la propia línea (la misma <li>, que no se mueve ni
     parpadea): solo se sustituye su bloque. */
  function paintCare(li, line) {
    var key = careKey(line);
    if (li._careKey === key) { return; }
    li._careKey = key;
    var old = li.querySelector('.aura-bag-line__care');
    var html = careHTML(line);
    if (old) { old.insertAdjacentHTML('afterend', html); old.parentNode.removeChild(old); }
    else if (html) { li.insertAdjacentHTML('beforeend', html); }
  }

  function updateLine(li, line, bagRelease) {
    var max = AURA.bag.maxQty || 99;
    paintCare(li, line);
    paintShip(li, line, bagRelease);
    setText(li.querySelector('[data-b-qty]'), String(line.qty));
    var minus = li.querySelector('[data-aura-step="-1"]');
    var plus = li.querySelector('[data-aura-step="1"]');
    if (minus) { minus.disabled = line.qty <= 1; }
    if (plus) { plus.disabled = line.qty >= max; }
    var lineTotal = round(line.unitPrice * line.qty);
    setText(li.querySelector('[data-b-line-total]'), fmt.eur(lineTotal));
    setText(li.querySelector('[data-b-line-note]'), line.qty > 1
      ? line.qty + ' × ' + fmt.eur(line.unitPrice)
      : 'o ' + fmt.mes(lineTotal));
  }

  /* ------------------------------------------------------------------------
     Movimiento de las líneas (skill §7, §11 y §14). Al eliminar una línea, se
     funde y encoge un poco en su sitio mientras las de debajo suben a ocupar
     el hueco; «Deshacer» hace el camino inverso (las de debajo bajan y la
     línea reaparece donde estaba). Las que se desplazan lo hacen con FLIP y un
     muelle crítico (damping 1, response .35) que arranca desde donde estén en
     pantalla y con su velocidad: un cambio nuevo en pleno movimiento no da
     saltos. Solo transform y opacity. Con «reducir movimiento», solo fundidos
     (nada se desliza).
     ------------------------------------------------------------------------ */

  var leavingEls = {};   // lineId → <li> que se está yendo (se recupera si vuelve)

  function reducedMotion() { return ui.reducedMotion ? ui.reducedMotion() : false; }

  /* Lo que se desplaza cuando cambia la lista: las líneas que se quedan y los
     enlaces de debajo. */
  function movers() {
    var out = [];
    Object.keys(lineEls).forEach(function (id) { out.push(lineEls[id]); });
    var foot = view.querySelector('.bolsa-items__foot');
    if (foot) { out.push(foot); }
    return out;
  }

  function measure(nodes) {
    nodes.forEach(function (n) { n._flipTop = n.isConnected ? n.getBoundingClientRect().top : null; });
  }

  function setY(n, y) { n.style.transform = Math.abs(y) < 0.25 ? '' : 'translate3d(0,' + y.toFixed(2) + 'px,0)'; }

  /* Lleva cada nodo de donde se veía (medido antes del cambio) a su sitio nuevo. */
  function playFlip(nodes) {
    nodes.forEach(function (n) {
      var first = n._flipTop;
      n._flipTop = null;
      if (first == null || !n.isConnected) { return; }
      var running = n._flip;
      var velocity = running ? running.velocity : 0;
      if (running) { running.stop(); }
      n.style.transform = '';
      var delta = first - n.getBoundingClientRect().top;
      if (Math.abs(delta) < 0.5 || reducedMotion() || !ui.spring) { n._flip = null; return; }
      setY(n, delta);
      n._flip = ui.spring({
        from: delta, to: 0, velocity: velocity, damping: 1, response: 0.35, precision: 0.2,
        onUpdate: function (v) { setY(n, v); },
        onRest: function () { n.style.transform = ''; n._flip = null; }
      });
    });
  }

  /* La línea que se va: fuera del flujo, en el sitio exacto donde estaba (las
     de debajo suben por debajo de ella), y se funde. Sin movimiento: se funde
     en su sitio y después se retira. */
  function leave(li, id) {
    var list = els.lista;
    li.inert = true;
    li.setAttribute('aria-hidden', 'true');
    if (li._flip) { li._flip.stop(); li._flip = null; }
    leavingEls[id] = li;
    if (!reducedMotion()) {
      var cs = window.getComputedStyle(li);
      li.style.position = 'absolute';
      li.style.top = li.offsetTop + 'px';
      li.style.left = li.offsetLeft + 'px';
      li.style.width = li.offsetWidth + 'px';
      li.style.paddingTop = cs.paddingTop;
      list.appendChild(li);              // la siguiente pasa a ser la primera (sin su relleno superior) desde ya
    }
    void li.offsetWidth;
    li.classList.add('is-leaving');
    var done = function () {
      if (leavingEls[id] !== li || !li.classList.contains('is-leaving')) { return; }
      delete leavingEls[id];
      if (li.parentNode) { li.parentNode.removeChild(li); }
    };
    li.addEventListener('transitionend', function (e) { if (e.target === li && e.propertyName === 'opacity') { done(); } });
    window.setTimeout(done, 400);
  }

  /* Vuelve (Deshacer o restaurar): si aún se estaba yendo, se recupera desde
     su opacidad actual; si no, entra fundiéndose donde le toca. */
  function revive(li) {
    li.inert = false;
    li.removeAttribute('aria-hidden');
    li.style.position = li.style.top = li.style.left = li.style.width = li.style.paddingTop = li.style.transform = '';
    li.classList.remove('is-leaving');
  }

  function enterLine(li) {
    li.classList.add('is-entering');
    void li.offsetWidth;
    li.classList.remove('is-entering');
  }

  function syncLines(items, animate) {
    var list = els.lista;
    if (!list) { return; }
    var keep = {};
    items.forEach(function (l) { keep[l.lineId] = true; });
    Object.keys(lineEls).forEach(function (id) {
      if (!keep[id]) {
        var gone = lineEls[id];
        delete lineEls[id];
        if (animate) { leave(gone, id); } else if (gone.parentNode) { gone.parentNode.removeChild(gone); }
      }
    });
    /* Reconciliación por clave: solo se mueve lo que cambia de sitio (mover un
       nodo que tiene el foco lo haría perder). Las que se van, al final. */
    var cursor = list.firstElementChild;
    var bagRelease = latestRelease(items);
    var entering = [];
    items.forEach(function (line) {
      var li = lineEls[line.lineId];
      if (!li && leavingEls[line.lineId]) {
        li = leavingEls[line.lineId];
        delete leavingEls[line.lineId];
        revive(li);
      } else if (!li) {
        li = createLine(line);
        if (animate) { entering.push(li); }
      }
      lineEls[line.lineId] = li;
      updateLine(li, line, bagRelease);
      /* Las que se están yendo se quedan donde están (sin movimiento, se funden
         en su sitio): el cursor las salta. */
      while (cursor && cursor !== li && cursor.classList.contains('is-leaving')) { cursor = cursor.nextElementSibling; }
      if (li === cursor) { cursor = cursor.nextElementSibling; } else { list.insertBefore(li, cursor); }
    });
    entering.forEach(enterLine);
  }

  function update(items, animate) {
    /* Dónde se ve cada línea ANTES de cambiar nada (también los textos de
       arriba, que pueden cambiar de alto): de ahí parte el FLIP. */
    var flip = animate ? movers() : [];
    measure(flip);
    var t = totals(items);
    blockedNow = items.filter(isBlocked);
    var blockedNames = uniqueNames(blockedNow);

    setText(els.eyebrow, 'Bolsa / ' + fmt.articulos(t.count));
    setText(els.titulo, 'Tu bolsa suma ' + fmt.eur(t.total) + '.');
    var envio = STANDARD ? 'Devoluciones gratuitas en 14 días.' : 'Envío estándar y devoluciones gratuitos.';
    /* Entradilla: lo que impide tramitar, si lo hay; si no, lo que ya incluye
       el total (crédito) y cuándo llega todo si hay una reserva. */
    var bagRelease = latestRelease(items);
    var lead;
    if (blockedNames.length) {
      lead = capitalize(listNames(blockedNames)) + (blockedNames.length > 1
        ? ' aún no se pueden reservar: quítalos para tramitar el resto.'
        : ' aún no se puede reservar: quítalo para tramitar el resto.');
    } else {
      lead = (t.descuento ? 'Ya incluye ' + fmt.eur(t.descuento) + ' de crédito de AURA' + NB + 'Trade' + NB + 'In. ' : '') +
        (bagRelease ? 'Con tu reserva, lo recibirás todo a partir del ' + dayLabel(bagRelease) + '.' : envio);
    }
    setText(els.lead, lead);
    setText(els.count, '(' + fmt.articulos(t.count) + ')');
    setText(els.subtotal, fmt.eur(t.subtotal));

    var hasTrade = !!(t.trade && t.descuento > 0);
    els['trade-row'].hidden = !hasTrade;
    els['trade-cta'].hidden = hasTrade;
    if (hasTrade) {
      setText(els['trade-device'], [t.trade.deviceName, t.trade.conditionLabel].filter(Boolean).join(' · '));
      setText(els.descuento, '− ' + fmt.eur(t.descuento));
    }
    setText(els.envio, STANDARD ? fmt.eur(STANDARD) : 'Gratis');
    /* La promesa de entrega sigue a la bolsa: con una reserva, todo sale el día
       del lanzamiento (como dicen la entradilla y la línea del artículo). */
    setText(els.promesa, (STANDARD ? 'Envío estándar' : 'Envío gratuito') +
      (bagRelease ? ': lo recibirás a partir del ' + dayLabel(bagRelease) : ' en 2–3 días laborables'));
    setText(els.total, fmt.eur(t.total));
    setText(els.iva, 'Incluye IVA de ' + fmt.eur(t.iva));
    setText(els.cuota, 'O ' + fmt.mes(t.total) + ' durante ' + months() + ' meses sin intereses');

    /* Algo que aún no se puede pedir: la acción se desactiva y se explica al lado. */
    els.bloqueo.hidden = !blockedNames.length;
    if (blockedNames.length) {
      setText(els['bloqueo-texto'], 'Quita ' + listNames(blockedNames) + ' para tramitar el pedido: aún no se ' +
        (blockedNames.length > 1 ? 'pueden' : 'puede') + ' reservar.');
    }
    each(document.querySelectorAll('[data-bolsa-cta]'), function (a) {
      a.setAttribute('href', withHoy('checkout.html'));
      if (blockedNames.length) {
        a.setAttribute('aria-disabled', 'true');
        if (els.bloqueo) { a.setAttribute('aria-describedby', 'bolsa-bloqueo'); }
      } else {
        a.removeAttribute('aria-disabled');
        a.removeAttribute('aria-describedby');
      }
    });

    if (buybar) {
      setText(buybar.querySelector('[data-bolsa-bar-name]'), 'Total · ' + fmt.articulos(t.count));
      setText(buybar.querySelector('[data-bolsa-bar-total]'), fmt.eur(t.total));
    }

    syncLines(items, animate);
    playFlip(flip);
    section.setAttribute('data-items', String(t.count));
    syncFootnotes(hasTrade);
  }

  /* Al pasar de la bolsa llena a vacía (o al revés, con «Deshacer»), la vista
     nueva se funde: es una superficie grande que cambia entera (skill §14). */
  function fadeInView() {
    view.classList.add('is-entering');
    void view.offsetWidth;
    view.classList.remove('is-entering');
  }

  function render() {
    var items = AURA.bag.items();
    var before = mode;
    if (!items.length) {
      if (mode !== 'vacia') {
        leavingEls = {};
        renderEmpty();
        if (before === 'llena') { fadeInView(); }
      }
      return;
    }
    var first = mode !== 'llena';
    if (first) {
      leavingEls = {};
      renderFull();
      if (before === 'vacia') { fadeInView(); }
    }
    update(items, !first);                // la primera vez, las líneas ya están (sin entrada)
  }

  /* «Volver al texto» de las notas: a la llamada que se ve, o nada si en esta
     vista no hay llamada (bolsa vacía). */
  function syncFootnotes(hasTrade) {
    var back3 = document.querySelector('.aura-footnotes__back[href^="#ref-3"]');
    if (back3) { back3.setAttribute('href', hasTrade ? '#ref-3b' : '#ref-3'); }
    each(document.querySelectorAll('.aura-footnotes__back'), function (a) {
      var target = document.getElementById(a.getAttribute('href').slice(1));
      a.hidden = !target;
    });
  }

  /* ------------------------------------------------------------------------
     Barra de compra: escondida mientras el «Tramitar pedido» del resumen está
     a la vista (es la misma acción, no una segunda).
     ------------------------------------------------------------------------ */

  function startCtaObserver() {
    stopCtaObserver();
    if (!buybar) { return; }
    if (typeof window.IntersectionObserver !== 'function' || !els.cta) {
      buybar.classList.remove('is-hidden');
      return;
    }
    ctaObserver = new window.IntersectionObserver(function (entries) {
      buybar.classList.toggle('is-hidden', entries[entries.length - 1].isIntersecting);
    });
    ctaObserver.observe(els.cta);
  }

  function stopCtaObserver() {
    if (ctaObserver) { ctaObserver.disconnect(); ctaObserver = null; }
  }

  /* ------------------------------------------------------------------------
     Foco tras un cambio (nunca se queda en el vacío)
     ------------------------------------------------------------------------ */

  /* El foco va a su sitio sin que el navegador desplace la página hacia donde
     se VE el elemento en pleno FLIP (aún en su sitio antiguo): se desplaza, si
     hace falta, para que se vea donde va a quedar. */
  function focusEl(el) {
    if (!el) { return; }
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); return; }
    var r = el.getBoundingClientRect();
    var moving = el.closest ? el.closest('.bolsa-line, .bolsa-items__foot') : null;
    var offset = moving && moving._flip ? moving._flip.value : 0;
    var top = r.top - offset;
    var bottom = r.bottom - offset;
    var nav = document.querySelector('.aura-nav');
    var minTop = (nav ? Math.max(0, nav.getBoundingClientRect().bottom) : 0) + 16;
    var maxBottom = window.innerHeight - (buybar && !buybar.hidden && !buybar.classList.contains('is-hidden') ? buybar.offsetHeight : 0) - 16;
    var dy = top < minTop ? top - minTop : (bottom > maxBottom ? Math.min(bottom - maxBottom, top - minTop) : 0);
    if (dy) { window.scrollBy(0, dy); }
  }

  function focusTitle() { focusEl(view.querySelector('#bolsa-titulo')); }

  function focusLine(lineId, what) {
    var li = lineEls[lineId];
    if (!li) { focusTitle(); return; }
    focusEl((what === 'care' && li.querySelector('[data-b-care]')) || li.querySelector('.aura-bag-line__name a'));
  }

  function focusAfterRemoval(index) {
    if (mode !== 'llena') { focusTitle(); return; }
    /* Las que se están yendo (fundiéndose) no cuentan. */
    var lis = els.lista ? Array.prototype.filter.call(els.lista.children, function (li) { return !li.classList.contains('is-leaving'); }) : [];
    if (!lis.length) { focusTitle(); return; }
    var li = lis[Math.min(index, lis.length - 1)];
    focusEl(li.querySelector('.aura-bag-line__name a'));
  }

  /* ------------------------------------------------------------------------
     Acciones
     ------------------------------------------------------------------------ */

  function removeLine(lineId) {
    var index = indexOfLine(AURA.bag.items(), lineId);
    var removed = AURA.bag.remove(lineId);
    if (!removed) { return; }
    focusAfterRemoval(index);
    toast({
      kind: 'warn',
      title: 'Artículo eliminado',
      text: [removed.name, removed.colorName].filter(Boolean).join(' · ') + ' ya no está en tu bolsa.',
      action: {
        label: 'Deshacer',
        onClick: function () {
          var back = AURA.bag.restore(removed);
          if (back) { focusLine(back.lineId, 'name'); }
        }
      }
    });
  }

  /* La línea cuya única diferencia es AuraCare+ conserva su <li> (otro lineId):
     no se va ni entra, solo cambia su bloque de AuraCare+. */
  function rekey(from, to) {
    var li = lineEls[from];
    if (!li || from === to || lineEls[to]) { return; }
    delete lineEls[from];
    lineEls[to] = li;
    li._lineId = to;
    li.setAttribute('data-line-id', to);
  }

  function toggleCare(lineId, quiet) {
    var items = AURA.bag.items();
    var i = indexOfLine(items, lineId);
    if (i < 0) { return null; }
    var line = items[i];
    var next = { productId: line.productId, colorId: line.colorId, selections: line.selections, care: !line.care, qty: line.qty };
    /* Si ya hay una línea igual con la otra opción de AuraCare+, las dos se
       fusionan: se guarda cuántas unidades tenía para que «Deshacer» deje la
       bolsa exactamente como estaba (y no pase AuraCare+ a todas las unidades). */
    var twin = catalog.line(line.productId, { colorId: line.colorId, selections: line.selections, care: !line.care, qty: 1 });
    var twinIndex = twin ? indexOfLine(items, twin.lineId) : -1;
    var twinQty = twinIndex >= 0 ? items[twinIndex].qty : 0;
    var added, removed;
    batching = true;
    try {
      removed = AURA.bag.remove(lineId);
      added = AURA.bag.restore(next, i);
      if (!added && removed) { AURA.bag.restore(removed, i); }
    } finally {
      batching = false;
    }
    if (added && removed) { rekey(lineId, added.lineId); }
    render();
    if (!added) { return null; }
    focusLine(added.lineId, 'care');
    if (quiet) { return added; }

    function undo() {
      var restored = null;
      batching = true;
      try {
        var exists = indexOfLine(AURA.bag.items(), added.lineId) >= 0;
        if (exists && twinQty > 0) { AURA.bag.setQty(added.lineId, twinQty); }
        else if (exists) { AURA.bag.remove(added.lineId); }
        restored = AURA.bag.restore(removed, i);
      } finally {
        batching = false;
      }
      if (restored && !twinQty) { rekey(added.lineId, restored.lineId); }
      render();
      if (restored) { focusLine(restored.lineId, 'care'); }
    }

    var name = careName();
    var price = fmt.eur(catalog.carePrice(line.productId));
    if (added.care) {
      toast({ kind: 'ok', title: name + ' añadido', text: 'Dos años de cobertura para tu ' + line.name + ' por ' + price + ' la unidad.' });
    } else {
      toast({
        kind: 'status',
        title: name + ' quitado',
        text: line.name + ' ya no lleva ' + name + '.',
        action: { label: 'Deshacer', onClick: undo }
      });
    }
    return added;
  }

  function removeTrade() {
    if (!AURA.tradeIn) { return; }
    var saved = AURA.tradeIn.get();
    if (!saved) { return; }
    AURA.tradeIn.clear();
    focusEl(els['trade-cta'] ? els['trade-cta'].querySelector('a') : null);
    toast({
      kind: 'status',
      title: 'Crédito de AURA Trade In quitado',
      text: [saved.deviceName, fmt.eur(saved.value)].filter(Boolean).join(' · '),
      action: {
        label: 'Deshacer',
        onClick: function () {
          AURA.tradeIn.set(saved);
          focusEl(view.querySelector('[data-b-trade-remove]'));
        }
      }
    });
  }

  /* «Tramitar pedido» desactivado (algo aún no se puede pedir): con teclado
     el enlace se puede activar; se explica y se lleva el foco a lo que hay
     que quitar. */
  document.addEventListener('click', function (e) {
    var cta = e.target && e.target.closest ? e.target.closest('[data-bolsa-cta]') : null;
    if (!cta || cta.getAttribute('aria-disabled') !== 'true') { return; }
    e.preventDefault();
    var first = blockedNow[0];
    var names = uniqueNames(blockedNow);
    toast({
      kind: 'warn',
      title: 'Aún no puedes tramitar el pedido',
      text: 'Quita ' + listNames(names) + ' de la bolsa: aún no se ' + (names.length > 1 ? 'pueden' : 'puede') + ' reservar.'
    });
    var li = first ? lineEls[first.lineId] : null;
    if (li) { focusEl(li.querySelector('[data-b-remove]')); }
  });

  /* Delegación: el marco se repinta con innerHTML, el contenedor no. */
  view.addEventListener('click', function (e) {
    var t = e.target;
    var btn = t && t.closest ? t.closest('[data-b-remove], [data-b-care], [data-b-trade-remove]') : null;
    if (!btn) { return; }
    var li = btn.closest('[data-line-id]');
    if (btn.hasAttribute('data-b-remove') && li) { removeLine(li._lineId || li.getAttribute('data-line-id')); }
    else if (btn.hasAttribute('data-b-care') && li) { toggleCare(li._lineId || li.getAttribute('data-line-id')); }
    else if (btn.hasAttribute('data-b-trade-remove')) { removeTrade(); }
  });

  /* Cantidad: el stepper del sistema (data-aura-stepper) emite 'aura:step' y
     ya cuida el foco al desactivar un botón. */
  view.addEventListener('aura:step', function (e) {
    var li = e.target && e.target.closest ? e.target.closest('[data-line-id]') : null;
    if (!li || !e.detail) { return; }
    var line = AURA.bag.setQty(li._lineId || li.getAttribute('data-line-id'), e.detail.value);
    if (line) { announce('Total de la bolsa: ' + fmt.eur(totals(AURA.bag.items()).total) + '.'); }
  });

  /* ------------------------------------------------------------------------
     Textos fijos con cifras del catálogo (ventajas, preguntas, notas)
     ------------------------------------------------------------------------ */

  function fillStatic() {
    each(document.querySelectorAll('[data-bolsa="meses"]'), function (el) { el.textContent = String(months()); });
    each(document.querySelectorAll('[data-bolsa="expres"]'), function (el) { el.textContent = EXPRESS !== null ? fmt.eur(EXPRESS) : ''; });
    each(document.querySelectorAll('[data-bolsa="expres-frase"]'), function (el) { el.hidden = EXPRESS === null; });
    var max = AURA.tradeIn && AURA.tradeIn.max ? AURA.tradeIn.max() : 0;
    each(document.querySelectorAll('[data-bolsa="trade-max"]'), function (el) { el.textContent = max ? ' (hasta ' + fmt.eur0(max) + ')' : ''; });
    var nota = 'El envío estándar ' + (STANDARD ? 'cuesta ' + fmt.eur(STANDARD) : 'es gratuito') +
      (EXPRESS !== null ? '; el exprés, ' + fmt.eur(EXPRESS) : '') + '. La recogida en AURA Store es gratuita.';
    each(document.querySelectorAll('[data-bolsa="nota-envio"]'), function (el) { el.textContent = nota; });
    var care = careInfo();
    each(document.querySelectorAll('[data-bolsa="care-nombre"]'), function (el) { if (care.name) { el.textContent = care.name; } });
    each(document.querySelectorAll('[data-bolsa="care-texto"]'), function (el) { if (care.description) { el.textContent = care.description; } });
  }

  /* ------------------------------------------------------------------------
     Eventos del sistema
     ------------------------------------------------------------------------ */

  document.addEventListener('aura:bag', function () { if (!batching) { render(); } });
  document.addEventListener('aura:tradein', function () {
    if (mode === 'llena') { update(AURA.bag.items()); } else { renderEmpty(); }
  });
  document.addEventListener('aura:auth', function () { if (mode === 'vacia') { renderEmpty(); } });

  fillStatic();
  render();

  /* Llegada desde el checkout: bolsa vacía o algo que aún no se puede pedir. */
  try {
    var aviso = new window.URLSearchParams(window.location.search).get('aviso');
    if (aviso === 'vacia') {
      toast({ kind: 'status', title: 'No hay nada que tramitar', text: 'Tu bolsa está vacía. Añade un producto para hacer un pedido.' });
    } else if (aviso === 'bloqueada' && blockedNow.length) {
      toast({
        kind: 'warn',
        title: 'Revisa tu bolsa',
        text: blockedNow.length > 1
          ? 'Hay ' + blockedNow.length + ' artículos que aún no se pueden reservar. Quítalos para tramitar el pedido.'
          : 'Hay un artículo que aún no se puede reservar. Quítalo para tramitar el pedido.'
      });
    }
    if (aviso && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', withHoy('bolsa.html') + (window.location.hash || ''));
    }
  } catch (e) { /* sin URLSearchParams no hay aviso, nada más */ }

  if (AURA.storage && AURA.storage.persistent === false) {
    toast({ kind: 'warn', title: 'Este navegador no guarda datos', text: 'Tu bolsa se conservará solo mientras esta página esté abierta.' });
  }
})(window, document);
