/* ==========================================================================
   AURA — Tramitar pedido (checkout.html)
   Cuatro pasos: 1 Contacto · 2 Entrega · 3 Pago · 4 Revisión, y la
   confirmación. Validación en línea con AURA.ui.form en cada paso; el paso
   activo se anuncia y el foco va a su encabezado.

   Datos de tarjeta: el formulario de pago es una DEMOSTRACIÓN. Solo se
   comprueba el formato (Luhn, caducidad futura, CVC) en el navegador. El
   número, la caducidad, el CVC y el titular nunca se guardan (ni en
   localStorage ni en sessionStorage) ni se envían: al pedido solo llegan el
   método, la marca y las cuatro últimas cifras, y los campos se vacían al
   confirmar o al salir de la página.

   Campos condicionales (tienda o dirección; tarjeta o AURA Pay): se quedan en
   el formulario y se ocultan con `hidden`, así AURA.ui.form solo valida lo que
   se ve (§14.10). Por eso los valores se leen de los controles y no de
   form.values(): con un paso ya completado (su panel oculto), values() no
   devuelve nada.

   Disponibilidad: cada línea trae `availability` (catalog.availability). Una
   reserva fija la entrega en su `release`; una línea que aún no se puede
   pedir (`canBuy === false`) devuelve a la bolsa, que la señala.
   Script clásico: sin módulos ni fetch.
   ========================================================================== */

(function (window, document) {
  'use strict';

  var AURA = window.AURA;
  var root = document.getElementById('checkout');
  if (!AURA || !AURA.bag || !AURA.catalog || !root) { return; }

  var fmt = AURA.fmt;
  var esc = AURA.html.esc;
  var catalog = AURA.catalog;
  var util = AURA.util || {};
  var ui = AURA.ui || {};

  var IVA = 0.21;
  var STEPS = ['Contacto', 'Entrega', 'Pago', 'Revisión'];
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var METODOS = { estandar: 'Envío estándar', expres: 'Envío exprés', recogida: 'Recogida en AURA Store' };
  var BRANDS = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express' };

  /* Tarifas de envío del catálogo (data.js → shipping). Sin tarifa exprés, la
     opción desaparece: nunca se escribe un importe en la página. */
  var SHIPPING = (AURA.data && AURA.data.shipping) || {};
  var STANDARD = typeof SHIPPING.standard === 'number' && SHIPPING.standard > 0 ? SHIPPING.standard : 0;
  var EXPRESS = typeof SHIPPING.express === 'number' && SHIPPING.express >= 0 ? SHIPPING.express : null;

  var params = null;
  try { params = new window.URLSearchParams(window.location.search); } catch (e) { params = null; }

  /* ------------------------------------------------------------------------
     Utilidades
     ------------------------------------------------------------------------ */

  function months() {
    var d = AURA.data;
    return d && d.financing && d.financing.months ? d.financing.months : 24;
  }
  function round(n) { return Math.round((Number(n) || 0) * 100) / 100; }
  function toast(opts) { return ui.toast ? ui.toast(opts) : null; }
  function reduced() {
    if (ui.reducedMotion) { return ui.reducedMotion(); }
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function co(name, ctx) { return (ctx || document).querySelector('[data-co="' + name + '"]'); }
  function each(list, fn) { for (var i = 0; i < list.length; i++) { fn(list[i], i); } }
  function setText(name, text) { var el = co(name); if (el && el.textContent !== text) { el.textContent = text; } }
  function focusEl(el, preventScroll) {
    if (!el) { return; }
    try { el.focus({ preventScroll: !!preventScroll }); } catch (e) { el.focus(); }
  }
  function shipLabel(cost) { return cost ? fmt.eur(cost) : 'Gratis'; }
  /* AURA Pay se confirma con Face ID en un teléfono o tableta y con Touch ID
     en un ordenador (puntero fino), como en la tienda de referencia. */
  function bioName() {
    var fine = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    return fine ? 'Touch ID' : 'Face ID';
  }

  /* ?hoy=AAAA-MM-DD (solo pruebas: AURA.catalog.today) se conserva entre la
     bolsa y el checkout para que la simulación del día sea coherente. */
  var HOY = (function () {
    var m = /[?&]hoy=(\d{4}-\d{2}-\d{2})(?:&|#|$)/.exec(window.location.search || '');
    return m && util.parseDate && util.parseDate(m[1]) ? m[1] : '';
  })();
  function withHoy(href) {
    if (!HOY) { return href; }
    var hash = '';
    var i = href.indexOf('#');
    if (i >= 0) { hash = href.slice(i); href = href.slice(0, i); }
    return href + (href.indexOf('?') === -1 ? '?' : '&') + 'hoy=' + HOY + hash;
  }
  function leave(aviso) { window.location.replace(withHoy('bolsa.html?aviso=' + aviso)); }

  function today() { return catalog.today ? catalog.today() : new Date(); }
  function parseDay(v) { return util.parseDate ? util.parseDate(v) : null; }
  function isoDay(d) {
    if (util.isoDate) { return util.isoDate(d); }
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
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
     puede saltar de línea (con texto grande no cabe entera), como en la bolsa. */
  var NB = '\u00a0';
  function dayNum(d) { return DIAS[d.getDay()] + ' ' + d.getDate(); }
  function shortDay(d) { return fmt.diaMes ? fmt.diaMes(d) : d.getDate() + NB + 'de' + NB + MESES[d.getMonth()]; }
  function dayLabel(d) { return DIAS[d.getDay()] + ' ' + shortDay(d); }
  function isTomorrow(d) {
    var t = today();
    t = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1);
    return d.getTime() === t.getTime();
  }
  function capitalize(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function listNames(names) {
    return names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + ' y ' + names[names.length - 1];
  }

  function availabilityOf(line) { return line.availability || catalog.availability(line.productId); }
  function blockedLines(items) { return items.filter(function (l) { return availabilityOf(l).canBuy === false; }); }

  /* Reservas de la bolsa y su fecha de entrega más tardía. */
  function reservas(items) {
    var out = { date: null, names: [] };
    items.forEach(function (l) {
      var a = availabilityOf(l);
      if (a.status !== 'reserva') { return; }
      var d = parseDay(a.release);
      if (out.names.indexOf('el ' + l.name) === -1) { out.names.push('el ' + l.name); }
      if (d && (!out.date || d > out.date)) { out.date = d; }
    });
    return out;
  }

  /* Fecha estimada por método: { from, to, note (para la opción), texto (frase), corta, iso, launch }. */
  function estimate(metodo, items) {
    var hoy = today();
    var from = metodo === 'estandar' ? addBusinessDays(hoy, 2) : addBusinessDays(hoy, 1);
    var to = metodo === 'estandar' ? addBusinessDays(hoy, 3) : from;
    var rel = reservas(items).date;
    var launch = false;
    if (rel && rel >= from) { from = rel; to = rel; launch = true; }
    var same = from.getTime() === to.getTime();
    var dia = (!launch && isTomorrow(from) ? 'mañana, ' : 'el ') + dayLabel(from);
    var rango = 'entre el ' + (from.getMonth() === to.getMonth() ? dayNum(from) : dayLabel(from)) + ' y el ' + dayLabel(to);
    var note, texto, corta;
    if (metodo === 'recogida') {
      note = 'Listo a partir del ' + dayLabel(from) + (launch ? ', día de lanzamiento' : '');
      texto = 'Listo para recoger a partir del ' + dayLabel(from);
      corta = 'A partir del ' + dayLabel(from);
    } else {
      note = 'Llega ' + (same ? dia : rango) + (launch ? ', día de lanzamiento' : '');
      texto = 'Llega ' + (same ? dia : rango);
      corta = same ? dayLabel(from) : rango;
      corta = corta.charAt(0).toUpperCase() + corta.slice(1);
    }
    return { from: from, to: to, note: note, texto: texto, corta: corta, iso: isoDay(to), launch: launch };
  }

  /* Tarjeta: marca, Luhn y formato. Nada de esto sale de la página. */
  function digitsOf(v) { return String(v || '').replace(/\D/g, ''); }
  function brandOf(d) {
    if (/^4/.test(d)) { return 'visa'; }
    if (/^3[47]/.test(d)) { return 'amex'; }
    if (/^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d\d|27[01]\d|2720)/.test(d)) { return 'mastercard'; }
    return '';
  }
  function luhn(d) {
    var sum = 0;
    for (var i = 0; i < d.length; i++) {
      var n = d.charCodeAt(d.length - 1 - i) - 48;
      if (i % 2) { n *= 2; if (n > 9) { n -= 9; } }
      sum += n;
    }
    return d.length > 0 && sum % 10 === 0;
  }
  function checkNumber(v) {
    if (/[^\d\s-]/.test(v)) { return 'Usa solo cifras: el número de la tarjeta no lleva letras.'; }
    var d = digitsOf(v);
    var brand = brandOf(d);
    if (brand === 'amex' && d.length !== 15) { return 'Las tarjetas American Express tienen 15 cifras.'; }
    if (d.length < 13 || d.length > 19) { return 'El número tiene entre 13 y 19 cifras. Revísalo.'; }
    if (!luhn(d)) { return 'Ese número no es válido. Revísalo o usa la tarjeta de prueba 4242 4242 4242 4242.'; }
    return true;
  }
  function checkExpiry(v) {
    var m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(String(v).trim());
    if (!m) { return 'Escribe la fecha como MM/AA, por ejemplo 08/29.'; }
    var mm = Number(m[1]);
    var yy = 2000 + Number(m[2]);
    if (mm < 1 || mm > 12) { return 'El mes va del 01 al 12.'; }
    var now = today();
    if (new Date(yy, mm, 1) <= now) { return 'Esta tarjeta ya ha caducado. Usa otra.'; }
    if (yy > now.getFullYear() + 20) { return 'Revisa el año de caducidad.'; }
    return true;
  }
  function checkCvc(v, all) {
    var numero = all && all.numero != null ? all.numero : (cardInput('numero') || {}).value;
    var len = brandOf(digitsOf(numero)) === 'amex' ? 4 : 3;
    if (!/^\d+$/.test(String(v).trim())) { return 'Usa solo cifras.'; }
    if (String(v).trim().length !== len) { return 'El código de seguridad tiene ' + len + ' cifras.'; }
    return true;
  }

  /* ------------------------------------------------------------------------
     Líneas compactas (resumen y confirmación) y textos del pedido
     ------------------------------------------------------------------------ */

  /* Línea compacta (resumen y confirmación). Cada dato de la configuración es
     un bloque que no se parte («Wi‑Fi», «Pantalla estándar»); la cantidad va
     bajo el importe solo si es más de una unidad, como en la bolsa. */
  function compactLine(l) {
    var img = catalog.image(l.productId, l.colorId);
    var care = AURA.data && AURA.data.care ? AURA.data.care.name : 'AuraCare+';
    var qty = Math.max(1, Number(l.qty) || 1);
    var unit = Number(l.unitPrice) || 0;
    var parts = [l.colorName].concat(Array.isArray(l.optionLabels) ? l.optionLabels : []).concat(l.care ? [care] : [])
      .join(' · ').split(' · ').filter(Boolean);   // «AURA M5 · CPU 10 núcleos» son dos datos
    /* El separador va dentro del bloque anterior: ninguna línea empieza por «·». */
    var meta = parts.map(function (p, i) {
      return '<span class="checkout-line__part">' + esc(p) + (i < parts.length - 1 ? NB + '·' : '') + '</span>';
    }).join(' ');
    var a = l.availability && l.availability.status === 'reserva' ? l.availability : null;
    var release = a ? parseDay(a.release) : null;
    return '<li class="aura-bag-line aura-bag-line--compact">' +
        '<div class="aura-bag-line__media">' + (img.slot ? AURA.html.img(img.slot, { fallback: img.fallback, alt: img.alt || l.name }) : '') + '</div>' +
        '<div class="aura-bag-line__info">' +
          '<p class="aura-bag-line__name">' + esc(l.name) + '</p>' +
          (meta ? '<p class="aura-bag-line__meta">' + meta + '</p>' : '') +
          (release ? '<p class="aura-bag-line__meta checkout-line__reserva"><i class="bi bi-calendar-event" aria-hidden="true"></i><span>Reserva · llega a partir del ' + esc(shortDay(release)) + '</span></p>' : '') +
        '</div>' +
        '<div class="aura-bag-line__price">' +
          '<span class="aura-price">' + esc(fmt.eur(round(unit * qty))) + '</span>' +
          (qty > 1 ? '<span class="checkout-line__qty">' + esc(qty + ' × ' + fmt.eur(unit)) + '</span>' : '') +
        '</div>' +
      '</li>';
  }

  /* «Visa terminada en 4242» (las cifras nunca quedan solas en otra línea). */
  function cardText(pago) {
    return pago && pago.ultimos4 ? (BRANDS[pago.marca] || 'Tarjeta') + ' terminada en' + NB + pago.ultimos4 : '';
  }
  function financeText(pago) {
    return 'Financiación: ' + (pago.cuotas || months()) + ' cuotas de ' + fmt.eur(pago.cuota || 0);
  }
  function payText(pago) {
    pago = pago || {};
    var card = cardText(pago);
    if (pago.metodo === 'aura-pay') { return 'AURA Pay'; }
    if (pago.metodo === 'financiacion') { return financeText(pago) + (card ? ' · ' + card : ''); }
    if (pago.metodo === 'tarjeta') { return card || 'Tarjeta'; }
    return '';                 // pedido antiguo sin método: la fila no se muestra
  }

  /* ------------------------------------------------------------------------
     Confirmación (también al recargar checkout.html?pedido=ID)
     ------------------------------------------------------------------------ */

  function renderConfirmation(order) {
    var envio = order.envio || {};
    var pago = order.pago || {};
    var items = (Array.isArray(order.items) ? order.items : []).filter(function (l) { return l && typeof l === 'object' && l.name; });
    var recogida = envio.metodo === 'recogida';
    var guest = !(order.owner) && !!(!order.contacto || order.contacto.invitado !== false);
    var count = items.reduce(function (n, l) { return n + (Number(l.qty) || 0); }, 0);
    var reserva = /reserv/i.test(order.estado || '');

    var direccion = [envio.direccion, envio.ciudad].filter(Boolean).join(', ');
    var where = recogida ? (envio.tienda ? ' en ' + envio.tienda : '') : (direccion ? ' a ' + direccion : '');
    var when = envio.fechaTexto || (recogida ? 'Te avisaremos cuando esté listo para recoger' : 'Te avisaremos cuando salga');
    var lead = when + where + '.';
    var descuento = Number(order.descuento) > 0 ? Number(order.descuento) : 0;
    var total = typeof order.total === 'number' && isFinite(order.total) ? order.total : null;
    var tradeLine = order.tradeIn && descuento
      ? '<div class="aura-summary__row aura-summary__row--discount"><dt>AURA Trade In <span class="checkout-summary__device">' + esc(order.tradeIn.deviceName || '') + '</span></dt><dd>− ' + esc(fmt.eur(descuento)) + '</dd></div>'
      : '';
    var envioCoste = Number(envio.coste) || 0;
    var iva = total === null ? 0 : round(total * IVA / (1 + IVA));

    var notes = '';
    if (order.tradeIn && descuento) {
      notes += '<div class="aura-note">' +
        '<span class="aura-note__icon"><i class="bi bi-arrow-repeat" aria-hidden="true"></i></span>' +
        '<p class="aura-note__title">Prepara tu ' + esc(order.tradeIn.deviceName || 'dispositivo') + '</p>' +
        '<p class="aura-note__text">Con el pedido llega un kit de envío gratuito para tu AURA Trade In. Haz una copia de seguridad y restablécelo antes de enviarlo.</p>' +
      '</div>';
    }
    if (guest) {
      notes += '<div class="aura-note">' +
        '<span class="aura-note__icon"><i class="bi bi-person-plus" aria-hidden="true"></i></span>' +
        '<p class="aura-note__title">Sigue tus próximos pedidos con un ID de AURA</p>' +
        '<p class="aura-note__text">Has comprado como invitado: guarda el número de pedido. Con un ID de AURA, tus próximos pedidos aparecerán en Tu cuenta. <a class="aura-link" href="registro.html">Crear un ID de AURA</a></p>' +
      '</div>';
    }

    /* Datos del pedido (sin filas vacías si el pedido guardado es antiguo o está incompleto). */
    var meta = [
      ['Número de pedido', order.id],
      ['Fecha', fmt.fecha(order.fecha)],
      [recogida ? 'Recogida' : 'Entrega estimada', envio.fechaCorta || envio.fechaTexto || 'Por confirmar'],
      ['Pago', payText(pago)]
    ].filter(function (r) { return r[1]; }).map(function (r) {
      return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>';
    }).join('');

    var actions = guest
      ? '<a class="aura-btn aura-btn--primary" href="../index.html">Seguir comprando</a>'
      : '<a class="aura-btn aura-btn--primary" href="cuenta.html">Ver mis pedidos</a>' +
        '<a class="aura-btn aura-btn--secondary" href="../index.html">Seguir comprando</a>';

    var sec = document.createElement('section');
    sec.className = 'aura-section aura-section--tight checkout-confirm';
    sec.id = 'confirmacion';
    sec.setAttribute('aria-labelledby', 'confirmacion-titulo');
    sec.innerHTML =
      '<div class="aura-container aura-container--narrow">' +
        '<div class="checkout-confirm__head">' +
          '<span class="checkout-confirm__icon" aria-hidden="true"><i class="bi bi-check-lg"></i></span>' +
          '<p class="aura-eyebrow aura-eyebrow--mono aura-eyebrow--ok">' + (reserva ? 'Reserva confirmada' : 'Pedido confirmado') + '</p>' +
          '<h1 class="aura-h1" id="confirmacion-titulo" tabindex="-1">Gracias por tu pedido.</h1>' +
          '<p class="aura-lead">' + esc(lead) + '</p>' +
          '<div class="checkout-confirm__actions">' + actions + '</div>' +
        '</div>' +

        '<div class="aura-card checkout-confirm__card">' +
          '<dl class="checkout-confirm__meta">' + meta + '</dl>' +
          (items.length
            ? '<h2 class="aura-h4 checkout-confirm__subtitle">' + esc(fmt.articulos(count)) + '</h2>' +
              '<ul class="aura-bag-list aura-stack aura-stack--stretch checkout-summary__lines">' + items.map(compactLine).join('') + '</ul>'
            : '') +
          /* Importes: solo si el pedido guardado los trae (uno antiguo o dañado no
             enseña un «Total 0,00 €» inventado). */
          (total === null ? '' :
            '<dl class="aura-summary__rows">' +
              (typeof order.subtotal === 'number' ? '<div class="aura-summary__row"><dt>Subtotal</dt><dd>' + esc(fmt.eur(order.subtotal)) + '</dd></div>' : '') +
              tradeLine +
              '<div class="aura-summary__row"><dt>' + esc(envio.etiqueta || 'Envío') + '</dt><dd>' + esc(shipLabel(envioCoste)) + '</dd></div>' +
              '<div class="aura-summary__row aura-summary__row--total"><dt>Total</dt><dd>' + esc(fmt.eur(total)) + '</dd></div>' +
            '</dl>' +
            '<p class="aura-summary__note">Incluye IVA de ' + esc(fmt.eur(iva)) + '.</p>') +
        '</div>' +

        (notes ? '<div class="checkout-confirm__notes">' + notes + '</div>' : '') +
        '<p class="aura-caption checkout-confirm__demo"><i class="bi bi-info-circle" aria-hidden="true"></i> Pedido de demostración: no se ha cobrado nada y no recibirás ningún envío ni correo. El pedido se guarda solo en este navegador.</p>' +
      '</div>';

    var current = document.getElementById('checkout') || document.getElementById('confirmacion');
    if (current && current.parentNode) { current.parentNode.replaceChild(sec, current); }
    document.title = 'Pedido confirmado — AURA';
    if (AURA.footer && AURA.footer.setCrumbs) { AURA.footer.setCrumbs(['Pedido confirmado']); }
    else {
      var footer = document.querySelector('aura-footer');
      if (footer) { footer.setAttribute('crumbs', 'Pedido confirmado'); }
    }
    try { window.scrollTo(0, 0); } catch (e) { /* nada */ }
    focusEl(sec.querySelector('#confirmacion-titulo'), true);
  }

  /* ------------------------------------------------------------------------
     Arranque: pedido ya confirmado (recarga), bolsa vacía o con algo que aún
     no se puede pedir
     ------------------------------------------------------------------------ */

  /* Letra pequeña con las cifras del catálogo (también en la confirmación). */
  function paintNotes() {
    var envio = 'El envío estándar ' + (STANDARD ? 'cuesta ' + fmt.eur(STANDARD) : 'es gratuito') +
      (EXPRESS !== null ? ', el exprés cuesta ' + fmt.eur(EXPRESS) : '') + ' y la recogida en AURA Store es gratuita.';
    setText('nota-envio', envio);
  }
  paintNotes();

  var pedidoId = params ? params.get('pedido') : null;
  if (pedidoId && AURA.orders) {
    var previo = AURA.orders.get(pedidoId);
    if (previo) { renderConfirmation(previo); return; }
  }
  if (!AURA.bag.count()) { leave('vacia'); return; }
  if (blockedLines(AURA.bag.items()).length) { leave('bloqueada'); return; }
  if (!ui.form) { return; }

  /* Enlaces de vuelta a la bolsa con el ?hoy de la prueba. */
  each(document.querySelectorAll('a[data-co-hoy]'), function (a) { a.setAttribute('href', withHoy(a.getAttribute('href'))); });

  /* ------------------------------------------------------------------------
     Referencias y estado
     ------------------------------------------------------------------------ */

  var statusEl = document.getElementById('checkout-estado');
  var stepsEl = root.querySelector('.checkout-steps');
  var formContacto = document.getElementById('form-contacto');
  var formEntrega = document.getElementById('form-entrega');
  var formPago = document.getElementById('form-pago');
  var panels = {};
  each(root.querySelectorAll('[data-co-panel]'), function (p) { panels[p.getAttribute('data-co-panel')] = p; });

  var current = 1;
  var done = {};
  var backToReview = false;
  var placed = false;

  /* Bloques condicionales: siempre en el DOM; `hidden` cuando no aplican
     (AURA.ui.form no valida lo oculto). Al cambiar de opción, el bloque que
     sobra se funde y se retira (150 ms, por el mismo camino por el que entró)
     y solo entonces entra el nuevo: la página cambia de alto una sola vez y
     nunca hay dos bloques a medias (skill §7 y §14). Mientras se va, queda
     inerte (ni se valida ni recibe el foco); si se vuelve a elegir en ese
     tiempo, regresa desde la opacidad en curso. Al ocultarlo se limpian sus
     errores: si vuelve a aparecer, aparece limpio. Al arrancar, en el acto. */
  var swaps = {};
  function blockEl(name) { return root.querySelector('[data-co-bloque="' + name + '"]'); }
  function showBlocks(group, on, off, form, fields, animate) {
    var turn = swaps[group] = (swaps[group] || 0) + 1;
    var ins = on.map(blockEl).filter(Boolean);
    var going = off.map(blockEl).filter(function (el) { return el && !el.hidden; });
    ins.forEach(function (el) {
      if (!el.hidden && el.classList.contains('is-leaving')) { el.classList.remove('is-leaving'); el.inert = false; }
    });
    var finish = function () {
      if (swaps[group] !== turn) { return; }
      going.forEach(function (el) { el.hidden = true; el.classList.remove('is-leaving'); el.inert = false; });
      if (going.length && form && fields) { fields.forEach(function (n) { form.clear(n); }); }
      ins.forEach(function (el) {
        if (!el.hidden) { return; }
        el.hidden = false;
        if (!animate) { return; }
        el.classList.add('is-entering');
        void el.offsetWidth;
        el.classList.remove('is-entering');
      });
    };
    if (!animate || !going.length) { finish(); return; }
    going.forEach(function (el) { el.inert = true; el.classList.add('is-leaving'); });
    var first = going[0];
    var ended = false;
    var onEnd = function (e) { if (e.target === first && e.propertyName === 'opacity') { done(); } };
    var done = function () {
      if (ended) { return; }
      ended = true;
      first.removeEventListener('transitionend', onEnd);
      finish();
    };
    first.addEventListener('transitionend', onEnd);
    window.setTimeout(done, 220);           // respaldo si no llega transitionend
  }

  /* Valor de un control (o del radio marcado), visible o no. */
  function val(form, name) {
    var el = form && form.elements ? form.elements[name] : null;
    if (!el) { return ''; }
    if (typeof el.length === 'number' && !el.tagName) {        // RadioNodeList
      for (var i = 0; i < el.length; i++) { if (el[i].checked) { return String(el[i].value); } }
      return '';
    }
    if (el.type === 'radio' || el.type === 'checkbox') { return el.checked ? String(el.value) : ''; }
    return String(el.value || '').trim();
  }

  /* Ningún formulario se envía de verdad (sitio estático): ni siquiera si un
     error impidiera llegar a AURA.ui.form. */
  [formContacto, formEntrega, formPago].forEach(function (f) {
    f.addEventListener('submit', function (e) { e.preventDefault(); }, true);
  });

  function metodo() { return val(formEntrega, 'metodo') || 'estandar'; }
  function pagoMetodo() { return val(formPago, 'pago') || 'aura-pay'; }
  function usesCard() { var m = pagoMetodo(); return m === 'tarjeta' || m === 'financiacion'; }
  function shippingCost(m) { return m === 'expres' ? (EXPRESS || 0) : (m === 'estandar' ? STANDARD : 0); }

  function totals() {
    var items = AURA.bag.items();
    var subtotal = 0;
    var count = 0;
    items.forEach(function (l) { subtotal += l.unitPrice * l.qty; count += l.qty; });
    subtotal = round(subtotal);
    var trade = AURA.tradeIn ? AURA.tradeIn.get() : null;
    var descuento = AURA.tradeIn ? AURA.tradeIn.discount(subtotal) : 0;
    var m = metodo();
    var envio = shippingCost(m);
    var total = round(subtotal - descuento + envio);
    return {
      items: items, count: count, subtotal: subtotal, trade: trade, descuento: descuento,
      metodo: m, envio: envio, total: total, iva: round(total * IVA / (1 + IVA)), cuota: round(total / months())
    };
  }

  /* ------------------------------------------------------------------------
     Resumen lateral y precios de las opciones
     ------------------------------------------------------------------------ */

  function paintLines() {
    var list = co('lineas');
    if (list) { list.innerHTML = AURA.bag.items().map(compactLine).join(''); }
  }

  var lastTotal = null;
  function paintTotals(announceChange) {
    var t = totals();
    setText('sum-count', '(' + fmt.articulos(t.count) + ')');
    setText('sum-subtotal', fmt.eur(t.subtotal));
    var hasTrade = !!(t.trade && t.descuento > 0);
    co('sum-trade').hidden = !hasTrade;
    if (hasTrade) {
      setText('sum-trade-device', [t.trade.deviceName, t.trade.conditionLabel].filter(Boolean).join(' · '));
      setText('sum-descuento', '− ' + fmt.eur(t.descuento));
    }
    setText('sum-envio-label', METODOS[t.metodo] || 'Envío');
    setText('sum-envio', shipLabel(t.envio));
    setText('sum-total', fmt.eur(t.total));
    setText('sum-nota', 'Incluye IVA de ' + fmt.eur(t.iva) + '. ' + (pagoMetodo() === 'financiacion'
      ? months() + ' cuotas de ' + fmt.eur(t.cuota) + ' sin intereses.'
      : 'O ' + fmt.mes(t.total) + ' durante ' + months() + ' meses sin intereses.'));
    setText('total-corto', fmt.eur(t.total));
    each(root.querySelectorAll('[data-co-pago-precio="cuota"]'), function (el) { el.textContent = fmt.mes(t.total); });
    if (announceChange && lastTotal !== null && lastTotal !== t.total) { announce('Total del pedido: ' + fmt.eur(t.total) + '.'); }
    lastTotal = t.total;
  }

  function paintStatic() {
    setText('meses', String(months()));
    setText('precio-estandar', shipLabel(STANDARD));
    var expres = co('opcion-expres');
    if (EXPRESS === null && expres) {
      expres.hidden = true;
      expres.querySelector('input').disabled = true;
    } else {
      setText('precio-expres', shipLabel(EXPRESS));
    }
  }

  function paintDates() {
    var items = AURA.bag.items();
    var est = {};
    ['estandar', 'expres', 'recogida'].forEach(function (m) {
      est[m] = estimate(m, items);
      var el = root.querySelector('[data-co-fecha="' + m + '"]');
      if (el) { el.textContent = est[m].note; }
    });

    /* Con una reserva, el exprés no adelanta nada (todo sale el día de
       lanzamiento): se desactiva y se explica, en vez de cobrarlo para nada. */
    var expresInput = formEntrega.querySelector('input[name="metodo"][value="expres"]');
    if (expresInput && EXPRESS !== null) {
      var useless = est.expres.launch && est.estandar.launch;
      expresInput.disabled = useless;
      if (useless) {
        var note = root.querySelector('[data-co-fecha="expres"]');
        if (note) { note.textContent = 'No adelanta una reserva: llega igual el ' + dayLabel(est.expres.from); }
        if (expresInput.checked) {
          formEntrega.querySelector('input[name="metodo"][value="estandar"]').checked = true;
          applyMetodo(true);
        }
      }
    }

    var r = reservas(items);
    var aviso = co('reserva-aviso');
    if (aviso) {
      aviso.hidden = !r.date;
      if (r.date) {
        setText('reserva-titulo', r.names.length > 1 ? 'Tu pedido incluye reservas' : 'Tu pedido incluye una reserva');
        setText('reserva-texto', capitalize(listNames(r.names)) + (r.names.length > 1 ? ' llegan' : ' llega') +
          ' a partir del ' + dayLabel(r.date) + ', su día de lanzamiento. Enviaremos el pedido completo ese día.');
      }
    }
  }

  /* ------------------------------------------------------------------------
     Paso 1 · Contacto
     ------------------------------------------------------------------------ */

  function paintContact() {
    var user = AURA.auth ? AURA.auth.user() : null;
    co('usuario').hidden = !user;
    co('invitado').hidden = !!user;
    co('login').hidden = !!user;
    co('contacto').classList.toggle('is-single', !!user);
    /* Con sesión no hay nada que elegir: solo confirmar el correo. */
    var h = document.getElementById('paso-1-titulo');
    if (h) { h.textContent = user ? '¿Dónde te enviamos la confirmación?' : '¿Cómo quieres continuar?'; }
    if (user) {
      setText('usuario-inicial', String(user.nombre || user.email || 'A').charAt(0).toUpperCase());
      setText('usuario-nombre', [user.nombre, user.apellidos].filter(Boolean).join(' ') || user.email);
      var email = formContacto.elements.email;
      if (email && !email.value) { email.value = user.email || ''; }
      var nombre = formEntrega.elements.nombre;
      var apellidos = formEntrega.elements.apellidos;
      if (nombre && !nombre.value) { nombre.value = user.nombre || ''; }
      if (apellidos && !apellidos.value) { apellidos.value = user.apellidos || ''; }
    }
    paintLabels();
  }

  ui.form(formContacto, {
    email: { required: 'Escribe tu correo para enviarte la confirmación del pedido.', email: true }
  }, { onSubmit: function () { complete(1); } });

  /* ------------------------------------------------------------------------
     Paso 2 · Entrega
     ------------------------------------------------------------------------ */

  function provinceName(code) {
    if (!/^\d{2}$/.test(String(code || ''))) { return ''; }
    var opt = formEntrega.querySelector('select[name="provincia"] option[value="' + code + '"]');
    return opt ? opt.textContent : '';
  }

  var fEntrega = ui.form(formEntrega, {
    metodo: { required: 'Elige cómo quieres recibir el pedido.' },
    tienda: { required: 'Elige la AURA Store donde lo recogerás.' },
    nombre: { required: 'Escribe el nombre de quien recibe el pedido.' },
    apellidos: { required: 'Escribe los apellidos de quien recibe el pedido.' },
    direccion: {
      required: 'Escribe la calle y el número.',
      minLength: { value: 5, message: 'Escribe la dirección completa: calle y número.' }
    },
    cp: {
      required: 'Escribe el código postal.',
      pattern: { value: /^\d{5}$/, message: 'El código postal tiene 5 cifras, como 28013.' },
      custom: function (v) {
        return provinceName(String(v).slice(0, 2)) ? true : 'Ese código postal no existe en España: las dos primeras cifras van del 01 al 52.';
      }
    },
    ciudad: { required: 'Escribe la ciudad o la localidad.' },
    provincia: {
      required: 'Elige la provincia.',
      custom: function (v, all) {
        var cp = String(all.cp || '').trim();
        var code = cp.slice(0, 2);
        if (/^\d{5}$/.test(cp) && provinceName(code) && code !== v) {
          return 'El código postal ' + cp + ' es de ' + provinceName(code) + '. Revisa uno de los dos.';
        }
        return true;
      }
    },
    telefono: {
      required: 'Escribe un teléfono para avisarte de la entrega.',
      custom: function (v) {
        var d = String(v).replace(/[\s().-]/g, '').replace(/^(\+34|0034)/, '');
        return /^[6789]\d{8}$/.test(d) || 'Escribe un teléfono de 9 cifras, como 612 345 678.';
      }
    }
  }, { onSubmit: function () { complete(2); } });

  function applyMetodo(byUser) {
    var pickup = metodo() === 'recogida';
    if (pickup) { showBlocks('entrega', ['tienda'], ['direccion'], fEntrega, ['direccion', 'cp', 'ciudad', 'provincia'], byUser); }
    else { showBlocks('entrega', ['direccion'], ['tienda'], fEntrega, ['tienda'], byUser); }
    setText('legend-datos', pickup ? '¿Quién recogerá el pedido?' : 'Dirección de envío');
    paintTotals(byUser);
  }

  formEntrega.addEventListener('change', function (e) {
    if (e.target && e.target.name === 'metodo') { applyMetodo(true); }
  });

  /* Código postal: solo cifras, y la provincia se elige sola. */
  var cpInput = formEntrega.elements.cp;
  if (cpInput) {
    cpInput.addEventListener('input', function () {
      var clean = digitsOf(cpInput.value).slice(0, 5);
      if (clean !== cpInput.value) { cpInput.value = clean; }
      var code = clean.slice(0, 2);
      var select = formEntrega.elements.provincia;
      if (clean.length === 5 && select && provinceName(code) && select.value !== code) {
        select.value = code;
        fEntrega.validateField('provincia');
      }
    });
  }

  /* ------------------------------------------------------------------------
     Paso 3 · Pago (demostración)
     ------------------------------------------------------------------------ */

  var cardBlock = root.querySelector('[data-co-bloque="tarjeta"]');
  function cardInput(name) { return cardBlock ? cardBlock.querySelector('[name="' + name + '"]') : null; }

  var fPago = ui.form(formPago, {
    pago: { required: 'Elige cómo quieres pagar.' },
    numero: { required: 'Escribe el número de la tarjeta.', custom: checkNumber },
    titular: {
      required: 'Escribe el nombre que aparece en la tarjeta.',
      minLength: { value: 3, message: 'Escribe el nombre completo, como aparece en la tarjeta.' }
    },
    caducidad: { required: 'Escribe la fecha de caducidad.', custom: checkExpiry },
    cvc: { required: 'Escribe el código de seguridad.', custom: checkCvc }
  }, { onSubmit: function () { complete(3); } });

  function applyPago(byUser, animate) {
    var card = usesCard();
    if (card) { showBlocks('pago', ['tarjeta'], ['aurapay'], null, null, animate); }
    else { showBlocks('pago', ['aurapay'], ['tarjeta'], fPago, ['numero', 'titular', 'caducidad', 'cvc'], animate); }
    paintTotals(byUser);
  }

  formPago.addEventListener('change', function (e) {
    if (e.target && e.target.name === 'pago') { applyPago(false, true); }
  });

  /* Formato en vivo conservando el cursor: «4242 4242 4242 4242», «08/29», «123». */
  var numInput = cardInput('numero');
  var expInput = cardInput('caducidad');
  var cvcInput = cardInput('cvc');
  var marcaEl = co('marca');

  if (numInput) {
    numInput.addEventListener('input', function () {
      var v = numInput.value;
      var pos = numInput.selectionStart || 0;
      var before = digitsOf(v.slice(0, pos)).length;
      var d = digitsOf(v).slice(0, 19);
      var brand = brandOf(d);
      var groups = brand === 'amex' ? [4, 6, 5] : [4, 4, 4, 4, 3];
      var out = '';
      var i = 0;
      groups.forEach(function (g) {
        if (i < d.length) { out += (out ? ' ' : '') + d.slice(i, i + g); i += g; }
      });
      if (/[^\d\s-]/.test(v)) { out = v; }   // deja ver el error si hay letras
      if (out !== v) {
        numInput.value = out;
        var p = 0;
        var seen = 0;
        while (p < out.length && seen < before) { if (/\d/.test(out.charAt(p))) { seen++; } p++; }
        try { numInput.setSelectionRange(p, p); } catch (e) { /* nada */ }
      }
      if (marcaEl) { marcaEl.textContent = BRANDS[brand] || ''; }
      if (cvcInput) { cvcInput.maxLength = brand === 'amex' ? 4 : 3; }
      setText('cvc-ayuda', brand === 'amex' ? 'Las 4 cifras del anverso de la tarjeta.' : 'Las 3 cifras del dorso de la tarjeta.');
    });
  }
  if (expInput) {
    expInput.addEventListener('input', function (e) {
      var d = digitsOf(expInput.value).slice(0, 4);
      if (d.length === 1 && Number(d) > 1) { d = '0' + d; }
      var out = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
      if (d.length === 2 && e.inputType && e.inputType.indexOf('delete') === -1) { out = d + '/'; }
      if (out !== expInput.value) { expInput.value = out; }
    });
  }
  if (cvcInput) {
    cvcInput.addEventListener('input', function () {
      var d = digitsOf(cvcInput.value).slice(0, 4);
      if (d !== cvcInput.value) { cvcInput.value = d; }
    });
  }

  /* Lo único que se conserva de la tarjeta: método, marca y cuatro últimas cifras. */
  function payInfo() {
    var m = pagoMetodo();
    var info = { metodo: m };
    if (m !== 'aura-pay' && numInput) {
      var d = digitsOf(numInput.value);
      info.marca = brandOf(d) || '';
      info.ultimos4 = d.slice(-4);
    }
    if (m === 'financiacion') {
      info.cuotas = months();
      info.cuota = totals().cuota;
    }
    return info;
  }

  /* Vacía los campos de tarjeta y también su estado de validación: si no, al
     volver con «Atrás» saldrían vacíos pero marcados en verde como válidos. */
  function clearCard() {
    ['numero', 'titular', 'caducidad', 'cvc'].forEach(function (n) {
      var el = cardInput(n);
      if (el) { el.value = ''; }
      if (fPago) { fPago.clear(n); }
    });
    if (marcaEl) { marcaEl.textContent = ''; }
    if (cvcInput) { cvcInput.maxLength = 4; }
    setText('cvc-ayuda', 'Las 3 cifras del dorso de la tarjeta.');
  }

  /* ------------------------------------------------------------------------
     Paso 4 · Revisión
     ------------------------------------------------------------------------ */

  function storeName() {
    var r = formEntrega.querySelector('input[name="tienda"]:checked');
    if (!r) { return ''; }
    var opt = r.closest('.aura-option');
    var title = opt ? opt.querySelector('.aura-option__title') : null;
    var note = opt ? opt.querySelector('.aura-option__note') : null;
    return (title ? title.textContent : '') + (note ? ' · ' + note.textContent.split('·')[0].trim() : '');
  }

  /* «612345678» → «612 345 678» (y «+34 612 345 678»). */
  function phoneLabel(v) {
    var raw = String(v || '').trim();
    var m = /^(\+34|0034)?([6789]\d{2})(\d{3})(\d{3})$/.exec(raw.replace(/[\s().-]/g, ''));
    return m ? (m[1] ? '+34 ' : '') + m[2] + ' ' + m[3] + ' ' + m[4] : raw;
  }

  function contactEmail() { return val(formContacto, 'email'); }

  function deliveryInfo() {
    var m = metodo();
    var items = AURA.bag.items();
    var est = estimate(m, items);
    var info = {
      metodo: m,
      etiqueta: METODOS[m],
      coste: shippingCost(m),
      reserva: !!reservas(items).date,
      fecha: est.iso,
      fechaTexto: est.texto,
      fechaCorta: est.corta,
      nombre: val(formEntrega, 'nombre'),
      apellidos: val(formEntrega, 'apellidos'),
      telefono: phoneLabel(val(formEntrega, 'telefono'))
    };
    if (m === 'recogida') {
      info.tienda = storeName();
    } else {
      info.direccion = val(formEntrega, 'direccion');
      info.piso = val(formEntrega, 'piso');
      info.cp = val(formEntrega, 'cp');
      info.ciudad = val(formEntrega, 'ciudad');
      info.provincia = provinceName(val(formEntrega, 'provincia'));
    }
    return info;
  }

  function lines(arr) {
    return arr.filter(Boolean).map(function (l, i) {
      return '<p' + (i ? ' class="aura-caption"' : '') + '>' + esc(l) + '</p>';
    }).join('');
  }

  function renderReview() {
    var user = AURA.auth ? AURA.auth.user() : null;
    co('rev-contacto').innerHTML = lines([
      contactEmail(),
      user ? 'ID de AURA · ' + ([user.nombre, user.apellidos].filter(Boolean).join(' ') || user.email) : 'Compra como invitado'
    ]);

    var d = deliveryInfo();
    var quien = [d.nombre, d.apellidos].filter(Boolean).join(' ');
    var entrega = [d.etiqueta + ' · ' + shipLabel(d.coste), d.fechaTexto + '.'];
    if (d.metodo === 'recogida') {
      entrega.push(d.tienda);
      entrega.push(quien ? 'Recoge: ' + quien : '');
    } else {
      entrega.push(quien);
      entrega.push([d.direccion, d.piso].filter(Boolean).join(', '));
      entrega.push([d.cp, d.ciudad].filter(Boolean).join(' ') + (d.provincia ? ' (' + d.provincia + ')' : ''));
    }
    entrega.push(d.telefono ? 'Tel. ' + d.telefono : '');
    co('rev-entrega').innerHTML = lines(entrega);

    /* Financiación: las cuotas arriba y la tarjeta debajo, cada dato en su línea. */
    var pay = payInfo();
    co('rev-pago').innerHTML = lines([
      pay.metodo === 'financiacion' ? financeText(pay) : payText(pay),
      pay.metodo === 'financiacion' ? cardText(pay) : '',
      usesCard() ? 'Datos comprobados solo en tu navegador: no se guardan.' : 'Lo confirmarás con ' + bioName() + ' al realizar el pedido.'
    ]);

    var t = totals();
    co('rev-articulos').innerHTML = lines([
      fmt.articulos(t.count) + ' · ' + fmt.eur(t.total),
      t.items.map(function (l) { return l.name + (l.qty > 1 ? ' (×' + NB + l.qty + ')' : ''); }).join(', ')
    ]);
  }

  /* ------------------------------------------------------------------------
     Navegación entre pasos
     ------------------------------------------------------------------------ */

  function announce(text) {
    if (!statusEl) { return; }
    statusEl.textContent = '';
    window.setTimeout(function () { statusEl.textContent = text; }, 80);
  }

  function paintSteps() {
    each(root.querySelectorAll('[data-co-step]'), function (li) {
      var k = Number(li.getAttribute('data-co-step'));
      var isCurrent = k === current;
      var isDone = !!done[k] && !isCurrent;
      li.classList.toggle('is-current', isCurrent);
      li.classList.toggle('is-done', isDone);
      if (isCurrent) { li.setAttribute('aria-current', 'step'); } else { li.removeAttribute('aria-current'); }
      var sr = li.querySelector('[data-co-done]');
      if (sr) { sr.textContent = isDone ? ' (completado)' : ''; }
    });
  }

  function paintLabels() {
    var user = AURA.auth ? AURA.auth.user() : null;
    var review = backToReview && done[1] && done[2] && done[3];
    setText('contacto-enviar', review ? 'Guardar y revisar el pedido' : (user ? 'Continuar a la entrega' : 'Continuar como invitado'));
    var b2 = panels['2'] ? panels['2'].querySelector('[data-co-next]') : null;
    if (b2) { b2.textContent = review ? 'Guardar y revisar el pedido' : 'Continuar al pago'; }
  }

  /* El paso entra desde el lado hacia el que avanza el pedido y vuelve por el
     contrario. Con «reducir movimiento», el CSS deja solo el fundido. */
  function enter(panel, back) {
    panel.classList.add('is-entering');
    panel.classList.toggle('is-back', !!back);
    void panel.offsetWidth;
    panel.classList.remove('is-entering', 'is-back');
  }

  function goTo(n) {
    n = Number(n);
    if (!panels[n]) { return; }
    for (var k = 1; k < n; k++) { if (!done[k]) { n = k; break; } }
    var back = n < current;
    current = n;
    Object.keys(panels).forEach(function (k) { panels[k].hidden = Number(k) !== n; });
    paintSteps();
    paintLabels();
    if (n === 4) { renderReview(); }
    enter(panels[n], back);

    document.title = STEPS[n - 1] + ' · Tramitar pedido — AURA';
    announce('Paso ' + n + ' de 4: ' + STEPS[n - 1] + '.');

    /* Orientación: los pasos y el encabezado a la vista; el foco, al encabezado. */
    if (stepsEl) {
      var top = stepsEl.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.6) {
        try { stepsEl.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' }); } catch (e) { stepsEl.scrollIntoView(true); }
      }
    }
    focusEl(document.getElementById('paso-' + n + '-titulo'), true);
  }

  function complete(step) {
    done[step] = true;
    if (step < 3 && backToReview && done[1] && done[2] && done[3]) {
      backToReview = false;
      goTo(4);
      return;
    }
    if (step === 3) { backToReview = false; }
    goTo(step + 1);
  }

  root.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-co-back], [data-co-edit]') : null;
    if (!t) { return; }
    if (t.hasAttribute('data-co-edit')) {
      backToReview = true;
      goTo(t.getAttribute('data-co-edit'));
    } else {
      goTo(t.getAttribute('data-co-back'));
    }
  });

  /* ------------------------------------------------------------------------
     Realizar el pedido
     ------------------------------------------------------------------------ */

  function placeOrder() {
    var t = totals();
    if (!t.items.length) { leave('vacia'); return; }
    if (blockedLines(t.items).length) { leave('bloqueada'); return; }
    var user = AURA.auth ? AURA.auth.user() : null;
    var trade = t.trade && t.descuento > 0
      ? { deviceName: t.trade.deviceName, conditionLabel: t.trade.conditionLabel, value: t.descuento }
      : null;

    placed = true;
    var order = AURA.orders.create({
      estado: reservas(t.items).date ? 'Reservado' : 'En preparación',
      items: t.items,
      count: t.count,
      subtotal: t.subtotal,
      descuento: t.descuento,
      tradeIn: trade,
      total: t.total,
      contacto: { email: contactEmail(), invitado: !user },
      envio: deliveryInfo(),
      pago: payInfo()           // { metodo, marca, ultimos4[, cuotas, cuota] }: nada más de la tarjeta
    });
    clearCard();
    AURA.bag.clear();
    if (AURA.tradeIn) { AURA.tradeIn.clear(); }
    renderConfirmation(order);
    if (ui.haptic) { ui.haptic('exito'); }   // el pedido hecho: en el mismo instante que la confirmación
    try { window.history.replaceState(null, '', withHoy('checkout.html?pedido=' + encodeURIComponent(order.id))); } catch (e) { /* nada */ }
  }

  var paySheet = ui.sheet ? ui.sheet('aurapay-hoja') : null;
  var realizar = co('realizar');

  /* AURA.ui.busy bloquea el botón (y su reenvío) mientras dura: sin banderas propias. */
  realizar.addEventListener('click', function () {
    if (placed) { return; }
    for (var k = 1; k <= 3; k++) {
      if (!done[k]) { goTo(k); return; }
    }
    if (pagoMetodo() === 'aura-pay' && paySheet) {
      var t = totals();
      setText('pay-total', fmt.eur(t.total));
      setText('pay-entrega', (METODOS[t.metodo] || 'Envío') + ' · ' + shipLabel(t.envio));
      paySheet.open(realizar);
      return;
    }
    var restore = ui.busy ? ui.busy(realizar, 'Realizando pedido…') : function () {};
    /* Estado visible mientras «se procesa» el pago simulado. */
    window.setTimeout(function () { restore(); placeOrder(); }, 700);
  });

  var payConfirm = co('pay-confirmar');
  if (payConfirm) {
    payConfirm.innerHTML = '<i class="bi ' + (bioName() === 'Touch ID' ? 'bi-fingerprint' : 'bi-person-bounding-box') + '" aria-hidden="true"></i>Confirmar con ' + bioName();
    payConfirm.addEventListener('click', function () {
      if (placed) { return; }
      var restore = ui.busy ? ui.busy(payConfirm, 'Comprobando…') : function () {};
      window.setTimeout(function () {
        restore();
        if (paySheet) { paySheet.close(); }
        placeOrder();
      }, 800);
    });
  }

  /* ------------------------------------------------------------------------
     Eventos del sistema
     ------------------------------------------------------------------------ */

  document.addEventListener('aura:bag', function () {
    if (placed) { return; }
    var items = AURA.bag.items();
    if (!items.length) { leave('vacia'); return; }
    if (blockedLines(items).length) { leave('bloqueada'); return; }
    paintLines();
    paintTotals(true);
    paintDates();
    if (current === 4) { renderReview(); }
  });
  document.addEventListener('aura:tradein', function () {
    if (placed) { return; }
    paintTotals(true);
    if (current === 4) { renderReview(); }
  });
  document.addEventListener('aura:auth', function () { if (!placed) { paintContact(); } });

  /* Al salir de la página, los datos de tarjeta desaparecen también de los campos. */
  window.addEventListener('pagehide', function () {
    if (placed) { return; }
    clearCard();
    if (usesCard()) { done[3] = false; }
  });
  window.addEventListener('pageshow', function (e) {
    if (e.persisted && !placed && current === 4 && !done[3]) { goTo(3); }
  });

  /* ------------------------------------------------------------------------
     Inicio
     ------------------------------------------------------------------------ */

  paintStatic();
  applyMetodo(false);
  applyPago(false);
  paintContact();
  paintLines();
  paintDates();
  paintTotals(false);
  paintSteps();

  if (AURA.storage && AURA.storage.persistent === false) {
    toast({ kind: 'warn', title: 'Este navegador no guarda datos', text: 'El pedido solo existirá mientras esta página esté abierta.' });
  }
})(window, document);
