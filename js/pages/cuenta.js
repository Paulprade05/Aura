/* ==========================================================================
   AURA — cuenta.html (assets/js/pages/cuenta.js)
   Gestión del ID de AURA (simulado en este navegador).
   - Sin sesión al cargar → login.html?volver=cuenta.html.
   - Pestañas accesibles (segmentado): Pedidos · Datos personales · Trade In ·
     Seguridad. Flechas, Inicio y Fin; la pestaña elegida queda en el #hash.
   - Pedidos: lo guardado en el pedido (precios del momento de la compra) y
     un estado que avanza con las fechas de entrega (AURA.catalog.today()).
   - Datos: AURA.auth.update con validación en línea y «Deshacer» (con
     AURA.ui.haptic('exito') en táctil al guardar).
   - Estado del pedido: insignia con texto; dorada si es una reserva, verde
     si está entregado y neutra mientras se prepara o viaja (el azul queda
     para lo que se pulsa).
   - Trade In: crédito activo; quitarlo ofrece «Deshacer».
   - Seguridad: alta («Miembro desde…») y sesión (AURA.auth.user().creado /
     .remember / .desde); cerrar sesión (sin confirmación) y eliminar el ID de
     AURA (destructivo e irreversible → confirmación en una hoja).
   - El doble envío lo impide AURA.ui.busy (sin banderas propias).
   ========================================================================== */
(function () {
  'use strict';

  var AURA = window.AURA;
  if (!AURA || !AURA.auth || !AURA.ui) { return; }

  var TABS = ['pedidos', 'datos', 'trade-in', 'seguridad'];
  var esc = AURA.html && AURA.html.esc ? AURA.html.esc : function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  function hashActual() {
    var h = String(window.location.hash || '').replace(/^#/, '');
    return TABS.indexOf(h) !== -1 ? h : '';
  }

  function irALogin() {
    var h = hashActual();
    window.location.replace('login.html?volver=' + encodeURIComponent('cuenta.html' + (h ? '#' + h : '')));
  }

  var usuario = AURA.auth.user();
  if (!usuario) { irALogin(); return; }

  /* ---- Elementos -------------------------------------------------------- */

  var main = document.getElementById('contenido');
  var app = document.getElementById('cuenta-app');
  if (!app) { return; }
  var titulo = document.getElementById('cuenta-titulo');
  var avatar = app.querySelector('[data-cuenta-iniciales]');
  var tablist = app.querySelector('[role="tablist"]');
  var tabs = Array.prototype.slice.call(app.querySelectorAll('[role="tab"]'));
  var listaPedidos = app.querySelector('[data-cuenta-pedidos]');
  var resumenPedidos = app.querySelector('[data-cuenta-pedidos-resumen]');
  var cajaTradeIn = app.querySelector('[data-cuenta-tradein]');
  var alta = app.querySelector('[data-cuenta-alta]');
  var sesionTexto = app.querySelector('[data-cuenta-sesion]');
  var sesionDesde = app.querySelector('[data-cuenta-sesion-desde]');
  var sesionIcono = app.querySelector('[data-cuenta-sesion-icono]');
  var hoja = document.getElementById('eliminar-id');

  var estado = '';              // '' (cuenta) · 'fuera' (sesión cerrada) · 'eliminado'

  /* ---- Utilidades ------------------------------------------------------- */

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

  function num(v, def) {
    var n = typeof v === 'number' ? v : parseFloat(v);
    return isFinite(n) ? n : def;
  }

  function dia(valor) {
    var d = AURA.util && AURA.util.parseDate ? AURA.util.parseDate(valor) : null;
    return d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null;
  }

  function hoy() {
    return AURA.catalog && AURA.catalog.today ? AURA.catalog.today() : dia(new Date());
  }

  /* «3 de octubre de 2026» → «octubre de 2026». fmt.fecha une «3 de
     octubre» con espacios indivisibles (\s también los reconoce). */
  function mesAnio(valor) {
    return String(AURA.fmt.fecha(valor) || '').replace(/^\d+\s+de\s+/, '');
  }

  /* ---- Cabecera y Seguridad --------------------------------------------- */

  function iniciales(u) {
    var a = String(u.nombre || '').trim().charAt(0);
    var b = String(u.apellidos || '').trim().charAt(0);
    return (a + b).toUpperCase() || String(u.email || 'A').charAt(0).toUpperCase();
  }

  function pintarUsuario(u) {
    titulo.textContent = u.nombre ? 'Hola, ' + u.nombre + '.' : 'Hola.';
    avatar.textContent = iniciales(u);
    Array.prototype.forEach.call(document.querySelectorAll('[data-cuenta-email], [data-cuenta-email-texto]'), function (el) {
      el.textContent = u.email;
    });
    var campoEmail = document.getElementById('datos-email');
    if (campoEmail) { campoEmail.value = u.email; }

    /* Alta: los ID creados antes de guardar la fecha no la tienen → sin fila. */
    var miembro = mesAnio(u.creado);
    alta.textContent = miembro ? 'Miembro desde ' + miembro + '.' : '';
    alta.hidden = !miembro;

    /* Sesión: mantenida en el dispositivo o solo en esta pestaña. */
    var mantenida = u.remember !== false;
    sesionTexto.textContent = mantenida
      ? 'Se mantiene iniciada en este dispositivo. Si lo compartes, ciérrala al terminar: tu bolsa se conserva.'
      : 'Solo dura mientras tengas abierta esta pestaña. Al cerrarla, tendrás que volver a iniciar sesión; tu bolsa se conserva.';
    if (sesionIcono) { sesionIcono.className = 'bi ' + (mantenida ? 'bi-laptop' : 'bi-window'); }
    var desde = AURA.fmt.fecha(u.desde);
    sesionDesde.textContent = desde ? 'Iniciada el ' + desde + '.' : '';
    sesionDesde.hidden = !desde;
  }

  /* ---- Pestañas --------------------------------------------------------- */

  function seleccionar(slug, opciones) {
    opciones = opciones || {};
    tabs.forEach(function (tab) {
      var activa = tab.getAttribute('data-cuenta-tab') === slug;
      tab.classList.toggle('is-active', activa);
      tab.setAttribute('aria-selected', activa ? 'true' : 'false');
      tab.tabIndex = activa ? 0 : -1;
      var panel = document.getElementById(tab.getAttribute('aria-controls'));
      if (panel) { panel.hidden = !activa; }
      if (activa) {
        if (opciones.foco) { tab.focus(); }
        try { tab.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* nada */ }
      }
    });
    if (opciones.hash) {
      try { window.history.replaceState(null, '', '#' + slug); } catch (e) { /* file:// sin historial: no pasa nada */ }
    }
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      seleccionar(tab.getAttribute('data-cuenta-tab'), { hash: true });
    });
  });

  tablist.addEventListener('keydown', function (e) {
    var i = tabs.indexOf(document.activeElement);
    if (i === -1) { return; }
    var n = null;
    if (e.key === 'ArrowRight') { n = (i + 1) % tabs.length; }
    else if (e.key === 'ArrowLeft') { n = (i - 1 + tabs.length) % tabs.length; }
    else if (e.key === 'Home') { n = 0; }
    else if (e.key === 'End') { n = tabs.length - 1; }
    if (n === null) { return; }
    e.preventDefault();
    seleccionar(tabs[n].getAttribute('data-cuenta-tab'), { foco: true, hash: true });
  });

  window.addEventListener('hashchange', function () {
    var h = hashActual();
    if (h && !estado) { seleccionar(h); }
  });

  /* ---- Pedidos ---------------------------------------------------------- */

  var MARCAS = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express' };
  var METODOS = { estandar: 'Envío estándar', expres: 'Envío exprés', recogida: 'Recogida en AURA Store' };

  /* El estado guardado no cambia solo: lo que ya ha pasado según las fechas
     de entrega se muestra como tal (enviado al día siguiente del pedido,
     entregado o listo para recoger el día de la entrega). */
  function estadoPedido(o, envio) {
    var guardado = String(o.estado || 'En preparación');
    if (/entregad|cancelad|devuelt|rechazad/i.test(guardado)) { return guardado; }
    var h = hoy();
    var entrega = dia(envio.fecha);
    var recogida = envio.metodo === 'recogida';
    if (!h) { return guardado; }
    if (entrega && h >= entrega) { return recogida ? 'Listo para recoger' : 'Entregado'; }
    var hecho = dia(o.fecha);
    if (!recogida && /preparaci/i.test(guardado) && hecho && h > hecho) { return 'Enviado'; }
    return guardado;
  }

  function claseEstado(texto) {
    var t = String(texto || '').toLowerCase();
    if (/entregad|listo/.test(t)) { return ' aura-badge--ok'; }
    if (/cancelad|devuelt|rechazad/.test(t)) { return ' aura-badge--error'; }
    if (/reserv/.test(t)) { return ''; }                 // dorado: aún no se entrega
    return ' aura-badge--neutral';                        // en preparación, enviado… (el azul es para lo que se pulsa)
  }

  function metodoPago(pago) {
    if (!isObj(pago)) { return ''; }
    var metodo = String(pago.metodo || '').toLowerCase();
    var ultimos = String(pago.ultimos4 || pago.last4 || '').replace(/\D/g, '').slice(-4);
    var tarjeta = ultimos ? entero((MARCAS[String(pago.marca || '').toLowerCase()] || 'Tarjeta') + ' terminada en ' + ultimos) : '';
    if (/aura.?pay/.test(metodo)) { return 'AURA Pay'; }
    if (/financ/.test(metodo)) {
      var meses = AURA.data && AURA.data.financing ? AURA.data.financing.months : 24;
      var cuotas = Math.max(1, Math.round(num(pago.cuotas, meses)));
      var cuota = num(pago.cuota, 0);
      return (cuota > 0 ? 'Financiación: ' + entero(cuotas + ' cuotas de ' + AURA.fmt.eur(cuota)) : entero('Financiación a ' + cuotas + ' meses')) +
        (tarjeta ? ' · ' + tarjeta : '');
    }
    if (tarjeta) { return tarjeta; }
    if (/transfer/.test(metodo)) { return 'Transferencia'; }
    if (/tarjeta|card/.test(metodo)) { return 'Tarjeta'; }
    return metodo ? metodo.charAt(0).toUpperCase() + metodo.slice(1) : '';
  }

  /* Un dato que no se parte por dentro («Visa terminada en 4242», «28013
     Madrid»): espacios duros. Si no cabe entero, el CSS lo parte antes que
     desbordar (overflow-wrap). */
  function entero(s) { return String(s == null ? '' : s).trim().replace(/\s+/g, ' '); }

  function quien(envio) { return [envio.nombre, envio.apellidos].map(function (s) { return String(s || '').trim(); }).filter(Boolean).join(' '); }

  /* Dirección como en una etiqueta de envío: nombre · calle y piso · CP y
     ciudad (con la provincia si no es la misma), una línea cada uno. */
  function direccion(envio) {
    var calle = [envio.direccion, envio.piso].map(function (s) { return String(s || '').trim(); }).filter(Boolean).join(', ');
    var ciudad = String(envio.ciudad || '').trim();
    var provincia = String(envio.provincia || '').trim();
    var lugar = entero([envio.cp, ciudad].filter(Boolean).join(' ')) +
      (provincia && provincia.toLowerCase() !== ciudad.toLowerCase() ? ' (' + provincia + ')' : '');
    return [quien(envio), calle, lugar.trim()].filter(Boolean);
  }

  function fila(dt, dd, extra) {
    return '<div class="aura-summary__row' + (extra || '') + '"><dt>' + esc(dt) + '</dt><dd>' + esc(dd) + '</dd></div>';
  }

  /* dd = un texto o varias líneas (una por elemento) */
  function dato(dt, dd) {
    var lineas = (Array.isArray(dd) ? dd : [dd]).filter(Boolean).map(esc);
    return lineas.length ? '<div><dt>' + esc(dt) + '</dt><dd>' + lineas.join('<br>') + '</dd></div>' : '';
  }

  function lineaHTML(l) {
    var p = AURA.catalog.product(l.productId);
    var qty = Math.max(1, Math.round(num(l.qty, 1)));
    var unidad = num(l.unitPrice, 0);
    /* Imagen del color pedido si ese color sigue en el catálogo; si no (dato
       antiguo o raro), la del producto. Fuera del catálogo, solo un nombre de
       hueco limpio. */
    var color = p && Array.isArray(p.colors) && p.colors.some(function (c) { return c && c.id === l.colorId; }) ? l.colorId : '';
    var hueco = typeof l.image === 'string' && /^[a-z0-9-]+$/.test(l.image) ? l.image : '';
    var img = p ? AURA.catalog.image(p, color) : { slot: hueco, fallback: '' };
    var nombre = esc(l.name || (p && p.name) || 'Producto AURA');
    var url = p ? AURA.catalog.url(p) : '';
    var care = AURA.data && AURA.data.care && AURA.data.care.name ? AURA.data.care.name : 'AuraCare+';
    /* Mismo formato que la confirmación del pedido (checkout.js) */
    var meta = [l.colorName].concat(Array.isArray(l.optionLabels) ? l.optionLabels : []);
    if (l.care) { meta.push(care); }
    meta.push('× ' + qty);
    /* Cada dato entero («CPU 10 núcleos», «× 2»): la línea solo parte después
       de un «·», nunca dentro de un dato ni con el «·» al principio. */
    var metaTexto = meta.filter(Boolean).join(' · ').split(' · ').map(entero).join(' · ');
    var media = img && img.slot ? AURA.html.img(img.slot, { alt: '', fallback: img.fallback }) : '';
    return '<li class="aura-bag-line aura-bag-line--compact">' +
      (url
        ? '<a class="aura-bag-line__media" href="' + esc(url) + '" tabindex="-1" aria-hidden="true">' + media + '</a>'
        : '<div class="aura-bag-line__media" aria-hidden="true">' + media + '</div>') +
      '<div class="aura-bag-line__info">' +
        '<p class="aura-bag-line__name">' + (url ? '<a href="' + esc(url) + '">' + nombre + '</a>' : nombre) + '</p>' +
        '<p class="aura-bag-line__meta">' + esc(metaTexto) + '</p>' +
      '</div>' +
      '<div class="aura-bag-line__price"><span class="aura-price">' + esc(AURA.fmt.eur(unidad * qty)) + '</span></div>' +
    '</li>';
  }

  function pedidoHTML(o, i) {
    var items = (Array.isArray(o.items) ? o.items : []).filter(isObj);
    var unidades = items.reduce(function (s, l) { return s + Math.max(1, Math.round(num(l.qty, 1))); }, 0);
    var subtotal = num(o.subtotal, items.reduce(function (s, l) { return s + num(l.unitPrice, 0) * Math.max(1, Math.round(num(l.qty, 1))); }, 0));
    var descuento = Math.max(0, num(o.descuento, 0));
    var envio = isObj(o.envio) ? o.envio : {};
    var coste = Math.max(0, num(envio.coste, 0));
    var total = num(o.total, subtotal - descuento + coste);
    var idTitulo = 'pedido-titulo-' + i;
    var estadoTexto = estadoPedido(o, envio);
    var recogida = envio.metodo === 'recogida';

    /* Datos de la entrega y del pago (a la izquierda desde 768 px)… */
    var datos = '';
    var cuando = envio.fechaCorta || AURA.fmt.fecha(envio.fecha);
    if (cuando) { datos += dato(recogida ? 'Recogida' : 'Entrega', cuando); }
    if (recogida) { datos += dato('Tienda', [envio.tienda, quien(envio) ? 'Recoge: ' + quien(envio) : '']); }
    else { datos += dato('Envío a', direccion(envio)); }
    datos += dato('Pago', metodoPago(o.pago));

    /* …y las cifras, que cuadran con las líneas: envío + Trade In = total. */
    var filas = '';
    if (!recogida && (envio.metodo || envio.etiqueta || envio.coste != null)) {
      filas += fila(envio.etiqueta || METODOS[envio.metodo] || 'Envío', coste > 0 ? AURA.fmt.eur(coste) : 'Gratis');
    }
    if (descuento > 0) { filas += fila('AURA Trade In', '− ' + AURA.fmt.eur(descuento), ' aura-summary__row--discount'); }
    filas += fila('Total', AURA.fmt.eur(total), ' aura-summary__row--total');

    /* «Del 3 de octubre de 2026 · 3 artículos»: cada parte entera; si no
       cabe, parte por el separador. */
    var realizado = AURA.fmt.fecha(o.fecha);
    var detalle = [realizado ? 'Del ' + realizado : '', unidades ? AURA.fmt.articulos(unidades) : '']
      .filter(Boolean).map(function (s) { return '<span class="text-nowrap">' + esc(s) + '</span>'; }).join(' · ');

    return '<article class="aura-card cuenta-pedido" aria-labelledby="' + idTitulo + '"' +
        (i > 1 ? ' data-aura-reveal style="--i:' + Math.min(i - 2, 3) + '"' : '') + '>' +
      '<header class="cuenta-pedido__head">' +
        '<div class="cuenta-pedido__titulo">' +
          '<h3 class="aura-h4" id="' + idTitulo + '">Pedido' + (o.id ? ' <span class="cuenta-pedido__num">' + esc(o.id) + '</span>' : '') + '</h3>' +
          (detalle ? '<p class="aura-caption">' + detalle + '</p>' : '') +
        '</div>' +
        '<span class="aura-badge aura-badge--mono' + claseEstado(estadoTexto) + '">' + esc(estadoTexto) + '</span>' +
      '</header>' +
      (items.length ? '<ul class="aura-bag-list cuenta-pedido__lineas">' + items.map(lineaHTML).join('') + '</ul>' : '') +
      '<div class="cuenta-pedido__pie">' +
        (datos ? '<dl class="cuenta-pedido__datos">' + datos + '</dl>' : '') +
        '<dl class="aura-summary__rows cuenta-pedido__totales">' + filas + '</dl>' +
      '</div>' +
    '</article>';
  }

  function nombresFamilias() {
    var nombres = (AURA.catalog.families() || []).map(function (f) { return 'un ' + f.name; });
    if (nombres.length < 2) { return nombres.join('') || 'un dispositivo AURA'; }
    return nombres.slice(0, -1).join(', ') + ' o ' + nombres[nombres.length - 1];
  }

  function vacioPedidosHTML() {
    var enBolsa = AURA.bag ? AURA.bag.count() : 0;
    var acciones = enBolsa
      ? '<a class="aura-btn aura-btn--primary" href="bolsa.html">Ver la bolsa (' + esc(AURA.fmt.articulos(enBolsa)) + ')</a>' +
        '<a class="aura-btn aura-btn--secondary" href="../index.html">Seguir comprando</a>'
      : '<a class="aura-btn aura-btn--primary" href="../index.html">Ir a la tienda</a>' +
        '<a class="aura-btn aura-btn--secondary" href="comparar.html">Comparar todos los modelos</a>';
    return '<div class="aura-card">' +
      '<div class="aura-empty">' +
        '<span class="aura-empty__icon"><i class="bi bi-box-seam" aria-hidden="true"></i></span>' +
        '<h3 class="aura-h3 aura-empty__title">Aún no tienes pedidos</h3>' +
        '<p class="aura-empty__text">Cuando compres ' + esc(nombresFamilias()) + ', aquí podrás seguir su estado paso a paso.</p>' +
        '<div class="aura-empty__actions">' + acciones + '</div>' +
      '</div>' +
    '</div>';
  }

  /* Solo pedidos con algún artículo: un registro roto o a medias de una
     versión anterior no se enseña como «Pedido · Total 0,00 €». */
  function listaDePedidos() {
    return (AURA.orders ? AURA.orders.list() : []).filter(function (o) {
      return isObj(o) && Array.isArray(o.items) && o.items.some(isObj);
    });
  }

  function pintarPedidos() {
    var pedidos = listaDePedidos();
    resumenPedidos.textContent = pedidos.length > 1
      ? pedidos.length + ' pedidos · Del más reciente al más antiguo'
      : (pedidos.length ? '1 pedido' : '');
    resumenPedidos.hidden = !pedidos.length;
    listaPedidos.innerHTML = pedidos.length ? pedidos.map(pedidoHTML).join('') : vacioPedidosHTML();
  }

  /* ---- Datos personales ------------------------------------------------- */

  var datosForm = document.getElementById('datos-form');
  var campoNombre = datosForm.elements.nombre;
  var campoApellidos = datosForm.elements.apellidos;
  var botonGuardar = datosForm.querySelector('[type="submit"]');
  var estadoDatos = document.getElementById('datos-estado');
  var base = { nombre: '', apellidos: '' };   // lo guardado: con qué se compara «hay cambios»

  function hayCambios() {
    return campoNombre.value.trim() !== base.nombre || campoApellidos.value.trim() !== base.apellidos;
  }

  function actualizarCambios() {
    var cambios = hayCambios();
    if (!botonGuardar.classList.contains('is-loading')) { botonGuardar.disabled = !cambios; }
    /* Región viva: solo se reescribe cuando cambia (no en cada pulsación). */
    var texto = cambios ? 'Tienes cambios sin guardar.' : 'No hay cambios sin guardar.';
    if (estadoDatos.textContent !== texto) { estadoDatos.textContent = texto; }
  }

  function rellenar(u) {
    base = { nombre: u.nombre || '', apellidos: u.apellidos || '' };
    campoNombre.value = base.nombre;
    campoApellidos.value = base.apellidos;
    actualizarCambios();
  }

  datosForm.addEventListener('input', actualizarCambios);

  var formDatos = AURA.ui.form(datosForm, {
    nombre: { required: 'Escribe tu nombre.' },
    apellidos: { required: 'Escribe tus apellidos.' }
  }, {
    onSubmit: function (v, e, api) {
      if (!hayCambios()) { return; }
      var antes = { nombre: base.nombre, apellidos: base.apellidos };
      var listo = AURA.ui.busy(botonGuardar, 'Guardando…');
      AURA.auth.update({ nombre: v.nombre, apellidos: v.apellidos }).then(function (r) {
        listo();
        if (!r || !r.ok) {
          actualizarCambios();
          if (r && r.field) { api.setError(r.field, r.error); }
          else { AURA.ui.toast({ kind: 'error', title: 'No hemos podido guardar tus datos', text: (r && r.error) || 'Inténtalo de nuevo.' }); }
          return;
        }
        api.clear();
        rellenar(r.user);
        if (typeof AURA.ui.haptic === 'function') { AURA.ui.haptic('exito'); }   // con el aviso, solo en táctil
        AURA.ui.toast({
          kind: 'ok',
          title: 'Datos guardados',
          text: 'Ahora apareces como ' + r.user.nombre + ' ' + r.user.apellidos + '.',
          action: {
            label: 'Deshacer',
            onClick: function () {
              AURA.auth.update(antes).then(function (r2) {
                if (!r2 || !r2.ok) { return; }
                if (formDatos) { formDatos.clear(); }
                rellenar(r2.user);
                AURA.ui.toast({ kind: 'status', title: 'Cambios deshechos', text: 'Vuelves a aparecer como ' + r2.user.nombre + ' ' + r2.user.apellidos + '.' });
              });
            }
          }
        });
      });
    }
  });

  /* ---- AURA Trade In ---------------------------------------------------- */

  function pintarTradeIn() {
    var t = AURA.tradeIn ? AURA.tradeIn.get() : null;
    if (t) {
      var enBolsa = AURA.bag ? AURA.bag.count() : 0;
      cajaTradeIn.innerHTML =
        '<div class="aura-card cuenta-credito">' +
          /* La misma cifra destacada que el resultado de la calculadora de Trade In */
          '<div class="aura-stat aura-stat--md">' +
            '<p class="aura-stat__value">' + esc(AURA.fmt.eur0(t.value)) + '</p>' +
            '<p class="aura-stat__label">Crédito activo</p>' +
          '</div>' +
          '<div class="aura-stack">' +
            '<h3 class="aura-h4">' + esc(t.deviceName || 'Tu dispositivo actual') + '</h3>' +
            '<p class="aura-body">' + (t.conditionLabel ? esc(t.conditionLabel) + '. ' : '') +
              'Se descuenta automáticamente en la bolsa y al pagar, hasta el total del pedido.</p>' +
            '<div class="aura-cluster cuenta-credito__acciones">' +
              (enBolsa
                ? '<a class="aura-btn aura-btn--primary" href="bolsa.html">Ver la bolsa</a>'
                : '<a class="aura-btn aura-btn--primary" href="../index.html">Ir a la tienda</a>') +
              '<a class="aura-link" href="trade-in.html">Valorar otro dispositivo</a>' +
            '</div>' +
            '<button class="aura-link aura-link--plain aura-link--muted" type="button" data-cuenta-quitar-credito>Quitar el crédito</button>' +
          '</div>' +
        '</div>';
    } else {
      var hasta = AURA.tradeIn && AURA.tradeIn.max ? AURA.tradeIn.max() : 0;
      cajaTradeIn.innerHTML =
        '<div class="aura-card">' +
          '<div class="aura-empty">' +
            '<span class="aura-empty__icon"><i class="bi bi-arrow-repeat" aria-hidden="true"></i></span>' +
            '<h3 class="aura-h3 aura-empty__title">Sin crédito activo</h3>' +
            '<p class="aura-empty__text">Entrega tu dispositivo actual' +
              (hasta > 0 ? ' y llévate hasta ' + esc(AURA.fmt.eur0(hasta)) + ' de descuento' : ' y llévate un descuento') +
              ' en tu próximo dispositivo AURA. Su valor se calcula en un minuto.</p>' +
            '<div class="aura-empty__actions"><a class="aura-btn aura-btn--primary" href="trade-in.html">Valorar mi dispositivo</a></div>' +
          '</div>' +
        '</div>';
    }
  }

  cajaTradeIn.addEventListener('click', function (e) {
    var boton = e.target.closest ? e.target.closest('[data-cuenta-quitar-credito]') : null;
    if (!boton) { return; }
    var previo = AURA.tradeIn.get();
    if (!previo) { return; }
    AURA.tradeIn.clear();                   // emite aura:tradein → pintarTradeIn()
    var panel = document.getElementById('panel-trade-in');
    if (panel) { panel.focus(); }
    AURA.ui.toast({
      kind: 'warn',
      title: 'Crédito retirado',
      text: (previo.deviceName || 'Tu dispositivo') + ' ya no se descontará de tu próxima compra.',
      action: { label: 'Deshacer', onClick: function () { AURA.tradeIn.set(previo); } }
    });
  });

  /* ---- Estados finales: sesión cerrada o ID eliminado -------------------- */

  function mostrarEstado(tipo, email) {
    estado = tipo;
    var html;
    if (tipo === 'eliminado') {
      html =
        '<span class="aura-empty__icon"><i class="bi bi-check-lg" aria-hidden="true"></i></span>' +
        '<h1 class="aura-h2 aura-empty__title" id="cuenta-estado-titulo" tabindex="-1">Tu ID de AURA se ha eliminado</h1>' +
        '<p class="aura-empty__text">Hemos borrado ' + (email ? '<strong class="cuenta-cortar">' + esc(email) + '</strong>' : 'tu ID de AURA') +
          ' y sus pedidos de este navegador. Si vuelves, crear un ID nuevo lleva menos de un minuto.</p>' +
        '<div class="aura-empty__actions">' +
          '<a class="aura-btn aura-btn--primary" href="../index.html">Ir al inicio</a>' +
          '<a class="aura-btn aura-btn--secondary" href="registro.html">Crear un ID de AURA</a>' +
        '</div>';
    } else {
      html =
        '<span class="aura-empty__icon"><i class="bi bi-box-arrow-right" aria-hidden="true"></i></span>' +
        '<h1 class="aura-h2 aura-empty__title" id="cuenta-estado-titulo" tabindex="-1">Has cerrado sesión</h1>' +
        '<p class="aura-empty__text">Tu bolsa sigue aquí. Inicia sesión cuando quieras volver a ver tus pedidos y tus datos.</p>' +
        '<div class="aura-empty__actions">' +
          '<a class="aura-btn aura-btn--primary" href="login.html?volver=cuenta.html">Iniciar sesión</a>' +
          '<a class="aura-btn aura-btn--secondary" href="../index.html">Ir al inicio</a>' +
        '</div>';
    }
    var seccion = document.createElement('section');
    seccion.className = 'aura-section';
    seccion.setAttribute('aria-labelledby', 'cuenta-estado-titulo');
    seccion.innerHTML = '<div class="aura-container aura-container--narrow"><div class="aura-empty cuenta-estado">' + html + '</div></div>';
    if (app.parentNode) { app.parentNode.removeChild(app); }
    main.insertBefore(seccion, main.firstChild);
    try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) { /* nada */ }
    var h1 = document.getElementById('cuenta-estado-titulo');
    if (h1) { h1.focus(); }
  }

  /* ---- Seguridad: cerrar sesión ------------------------------------------ */

  var botonSalir = app.querySelector('[data-cuenta-salir]');
  botonSalir.addEventListener('click', function () {
    estado = 'fuera';                       // que el aviso de aura:auth no repinte la cuenta
    AURA.auth.logout();
    mostrarEstado('fuera');
  });

  /* ---- Seguridad: eliminar el ID de AURA (confirmación en hoja) ---------- */

  if (hoja) {
    var cancelar = hoja.querySelector('[data-cuenta-cancelar]');
    var confirmar = hoja.querySelector('[data-cuenta-eliminar]');

    hoja.addEventListener('aura:sheet-open', function () {
      var u = AURA.auth.user() || usuario;
      hoja.querySelector('[data-eliminar-email]').textContent = u.email;
      var n = listaDePedidos().length;
      hoja.querySelector('[data-eliminar-pedidos]').textContent =
        n === 0 ? 'tu historial de pedidos' : (n === 1 ? 'tu pedido' : 'tus ' + n + ' pedidos');
      if (cancelar) { cancelar.focus(); }   // la opción segura, a mano
    });

    confirmar.addEventListener('click', function () {
      var u = AURA.auth.user();
      if (!u) { return; }
      estado = 'eliminado';
      var ok = AURA.auth.remove();
      if (!ok) {
        estado = '';
        AURA.ui.toast({ kind: 'error', title: 'No hemos podido eliminar tu ID de AURA', text: 'Recarga la página e inténtalo de nuevo.' });
        return;
      }
      var api = AURA.ui.sheet(hoja);
      if (api) { api.close(); }
      /* La página entera pasa a «Tu ID de AURA se ha eliminado» y el foco va a
         ese título: es la confirmación (sin un aviso que repita lo mismo). */
      mostrarEstado('eliminado', u.email);
    });
  }

  /* ---- Eventos del sistema ---------------------------------------------- */

  document.addEventListener('aura:auth', function (e) {
    var u = e.detail ? e.detail.user : AURA.auth.user();
    if (estado) {
      if (u && estado === 'fuera') { window.location.reload(); }   // ha vuelto a entrar en otra pestaña
      return;
    }
    if (!u) { mostrarEstado('fuera'); return; }                     // cerró sesión en otra pestaña
    usuario = u;
    pintarUsuario(u);
    if (hayCambios()) { base = { nombre: u.nombre || '', apellidos: u.apellidos || '' }; actualizarCambios(); }
    else { rellenar(u); }
    pintarPedidos();
  });

  document.addEventListener('aura:orders', function () { if (!estado) { pintarPedidos(); } });
  document.addEventListener('aura:bag', function () {
    if (estado) { return; }
    if (!listaDePedidos().length) { pintarPedidos(); }     // el vacío ofrece «Ver la bolsa»
    if (AURA.tradeIn.get()) { pintarTradeIn(); }            // «Ver la bolsa» o «Ir a la tienda»
  });
  document.addEventListener('aura:tradein', function () { if (!estado) { pintarTradeIn(); } });

  window.addEventListener('pageshow', function (e) {
    if (e.persisted && !estado && !AURA.auth.user()) { irALogin(); }
  });

  /* ---- Arranque ---------------------------------------------------------- */

  pintarUsuario(usuario);
  rellenar(usuario);
  pintarPedidos();
  pintarTradeIn();
  seleccionar(hashActual() || 'pedidos');
  app.hidden = false;

  /* Recién creado en registro.html: bienvenida una sola vez (completado). */
  var bienvenida = null;
  try {
    bienvenida = window.sessionStorage.getItem('aura.cuenta.bienvenida');
    window.sessionStorage.removeItem('aura.cuenta.bienvenida');
  } catch (e) { bienvenida = null; }
  if (bienvenida !== null) {
    AURA.ui.toast({
      kind: 'ok',
      title: 'Tu ID de AURA está listo',
      text: 'Te damos la bienvenida' + (usuario.nombre ? ', ' + usuario.nombre : '') + '. Ya has iniciado sesión.'
    });
  }
})();
