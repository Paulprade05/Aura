/* ==========================================================================
   AURA — Legal (assets/js/pages/legal.js)
   Script clásico, después de aura-ui.js.
   ========================================================================== */
/* legal.html — «Tus datos de AURA»: resumen de lo guardado y borrado con
   confirmación (irreversible) y aviso de completado. */
(function (window, document) {
  'use strict';
  var AURA = window.AURA;
  if (!AURA || !AURA.ui || !AURA.keys) { return; }

  var PREFIJO = 'aura.';
  var panel = document.getElementById('tus-datos');
  var hoja = document.getElementById('legal-borrar');
  if (!panel || !hoja) { return; }
  var boton = panel.querySelector('[data-aura-sheet-open="legal-borrar"]');
  var ayuda = panel.querySelector('[data-legal-ayuda]');
  var ayudaInicial = ayuda ? ayuda.textContent : '';

  function almacen(nombre) {
    try { var a = window[nombre]; a.getItem(PREFIJO); return a; } catch (e) { return null; }
  }
  function claves(nombre) {
    var a = almacen(nombre);
    var out = [];
    if (!a) { return out; }
    try {
      for (var i = 0; i < a.length; i++) {
        var k = a.key(i);
        if (k && k.indexOf(PREFIJO) === 0) { out.push(k); }
      }
    } catch (e) { /* nada */ }
    return out;
  }
  function leer(clave, porDefecto) {
    var a = almacen('localStorage');
    try {
      var raw = a ? a.getItem(clave) : null;
      return raw == null ? porDefecto : JSON.parse(raw);
    } catch (e) { return porDefecto; }
  }

  function estado() {
    var usuarios = leer(AURA.keys.users, {});
    var pedidos = leer(AURA.keys.orders, []);
    var credito = AURA.tradeIn.get();
    return {
      bolsa: AURA.bag.count(),
      cuentas: usuarios && typeof usuarios === 'object' ? Object.keys(usuarios).length : 0,
      pedidos: Array.isArray(pedidos) ? pedidos.length : 0,
      tradein: credito ? Number(credito.value) || 0 : 0,
      usuario: AURA.auth.user(),
      claves: claves('localStorage').length + claves('sessionStorage').length
    };
  }
  function vacio(s) { return !s.claves && !s.bolsa && !s.cuentas && !s.pedidos && !s.tradein && !s.usuario; }

  function pintar() {
    var s = estado();
    function dato(nombre, texto, etiqueta) {
      var el = panel.querySelector('[data-legal-dato="' + nombre + '"]');
      if (!el) { return; }
      el.textContent = texto;
      var label = el.nextElementSibling;
      if (etiqueta && label) { label.textContent = etiqueta; }
    }
    dato('bolsa', String(s.bolsa), s.bolsa === 1 ? 'Artículo en la bolsa' : 'Artículos en la bolsa');
    dato('cuentas', String(s.cuentas), s.cuentas === 1 ? 'ID de AURA creado' : 'ID de AURA creados');
    dato('pedidos', String(s.pedidos), s.pedidos === 1 ? 'Pedido guardado' : 'Pedidos guardados');
    dato('tradein', s.tradein ? AURA.fmt.eur0(s.tradein) : '—');
    var sesion = panel.querySelector('[data-legal-sesion]');
    if (sesion) {
      var u = s.usuario;
      var nombre = u ? ((u.nombre || '') + ' ' + (u.apellidos || '')).trim() : '';
      sesion.textContent = u
        ? 'Sesión iniciada como ' + (nombre ? nombre + ' (' + u.email + ')' : u.email) +
          (u.remember === false ? ', solo hasta que cierres esta pestaña.' : ', mantenida en este dispositivo.') +
          (u.creado && AURA.fmt.fecha(u.creado) ? ' ID de AURA creado el ' + AURA.fmt.fecha(u.creado) + '.' : '')
        : 'No hay ninguna sesión iniciada.';
    }
    var nada = vacio(s);
    if (boton) { boton.disabled = nada; }
    if (ayuda) {
      ayuda.textContent = nada
        ? 'No hay datos de AURA guardados en este navegador: no hay nada que borrar.'
        : (AURA.storage && AURA.storage.persistent === false
          ? 'Este navegador no deja guardar datos: lo que hagas se olvida al cerrar la pestaña.'
          : ayudaInicial);
    }
    return s;
  }

  function enumerar(items) {
    if (items.length < 2) { return items.join(''); }
    return items.slice(0, -1).join(', ') + ' y ' + items[items.length - 1];
  }

  /* Al abrir la confirmación, se dice exactamente qué se va a borrar. */
  hoja.addEventListener('aura:sheet-open', function () {
    var s = estado();
    var partes = [];
    if (s.bolsa) { partes.push(AURA.fmt.articulos(s.bolsa) + ' de la bolsa'); }
    if (s.cuentas) { partes.push(s.cuentas === 1 ? '1 ID de AURA' : s.cuentas + ' ID de AURA'); }
    if (s.pedidos) { partes.push(s.pedidos === 1 ? '1 pedido' : s.pedidos + ' pedidos'); }
    if (s.tradein) { partes.push('el crédito de Trade In'); }
    if (s.usuario) { partes.push('la sesión iniciada'); }
    var lista = hoja.querySelector('[data-legal-lista]');
    if (lista) { lista.textContent = partes.length ? enumerar(partes) : 'todos los datos de AURA'; }
  });

  function borrar() {
    try { AURA.bag.clear(); } catch (e) { /* nada */ }
    try { AURA.tradeIn.clear(); } catch (e) { /* nada */ }
    try { AURA.auth.logout(); } catch (e) { /* nada */ }
    ['localStorage', 'sessionStorage'].forEach(function (nombre) {
      var a = almacen(nombre);
      claves(nombre).forEach(function (k) { try { a.removeItem(k); } catch (e) { /* nada */ } });
    });
    try { AURA.header.refresh(); } catch (e) { /* nada */ }

    var api = AURA.ui.sheet(hoja);
    if (api) { api.close(); }
    pintar();
    /* El botón queda desactivado: el foco pasa al título del panel, no se pierde. */
    var titulo = document.getElementById('tus-datos-titulo');
    if (titulo) { titulo.focus(); }

    AURA.ui.toast({
      kind: 'ok',
      title: 'Datos borrados',
      text: 'Este navegador ya no guarda nada de AURA: ni bolsa, ni cuentas, ni pedidos.'
    });
  }

  var confirmar = hoja.querySelector('[data-legal-borrar]');
  if (confirmar) { confirmar.addEventListener('click', borrar); }

  /* El resumen se mantiene al día (también si otra pestaña cambia algo). */
  ['aura:bag', 'aura:auth', 'aura:tradein', 'aura:orders'].forEach(function (ev) {
    document.addEventListener(ev, pintar);
  });
  window.addEventListener('storage', pintar);
  pintar();
})(window, document);

/* legal.html — «Créditos de las imágenes» (#imagenes): una lista accesible,
   agrupada por página, con la miniatura, lo que se ve en la foto (la
   descripción real), el autor enlazado, la fuente (enlace a la foto
   original), la licencia enlazada y los cambios hechos («recortada y
   ajustada de tono»). Datos: window.AURA_CREDITS (assets/js/creditos.js,
   generado; solo se carga en esta página). Independiente del bloque de
   «Tus datos»: si aquel no está, esto se pinta igual. */
(function (window, document) {
  'use strict';
  var AURA = window.AURA || {};
  var caja = document.querySelector('[data-legal-creditos]');
  var lista = window.AURA_CREDITS;
  if (!caja || !Array.isArray(lista) || !lista.length) { return; }

  function esc(texto) {
    if (AURA.html && typeof AURA.html.esc === 'function') { return AURA.html.esc(texto); }
    return String(texto == null ? '' : texto).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* Solo enlaces web (nada de javascript: ni rutas raras en un dato generado). */
  function url(u) { u = String(u || ''); return /^https:\/\/[^\s"'<>]+$/.test(u) ? u : ''; }

  /* Las fotos de producto (tarjetas, configurador, bolsa) salen del catálogo. */
  var producto = {};
  try {
    (AURA.catalog ? AURA.catalog.products() : []).forEach(function (p) {
      if (!p.image) { return; }
      producto[p.image] = true;
      Object.keys(p.imageVariants || {}).forEach(function (c) { producto[p.image + '-' + c] = true; });
    });
  } catch (e) { producto = {}; }

  var GRUPOS = [
    { id: 'productos', titulo: 'Productos: tarjetas, configurador y bolsa', test: function (s) { return !!producto[s]; } },
    { id: 'inicio', titulo: 'Inicio', test: function (s) { return s.indexOf('inicio-') === 0; } },
    { id: 'auraphone', titulo: 'auraPhone', test: function (s) { return s.indexOf('auraphone-') === 0; } },
    { id: 'aurapad', titulo: 'auraPad', test: function (s) { return s.indexOf('aurapad-') === 0; } },
    { id: 'aurabook', titulo: 'auraBook', test: function (s) { return s.indexOf('aurabook-') === 0; } },
    { id: 'acerca', titulo: 'Acerca de AURA', test: function (s) { return s.indexOf('acerca-') === 0; } },
    { id: 'trade-in', titulo: 'AURA Trade In', test: function (s) { return s.indexOf('trade-in-') === 0; } },
    { id: 'otras', titulo: 'Soporte y otras páginas', test: function () { return true; } }
  ];
  var porGrupo = {};
  lista.forEach(function (c) {
    if (!c || !c.slot) { return; }
    for (var i = 0; i < GRUPOS.length; i++) {
      if (GRUPOS[i].test(c.slot)) { (porGrupo[GRUPOS[i].id] = porGrupo[GRUPOS[i].id] || []).push(c); return; }
    }
  });

  function enlace(href, texto, extra) {
    var h = url(href);
    return h ? '<a href="' + esc(h) + '" rel="noopener">' + esc(texto) + (extra || '') + '</a>' : esc(texto);
  }

  function item(c) {
    /* Solo la descripción de lo que se ve (nunca el título original del banco de imágenes, que nombra marcas). */
    var desc = c.descripcion || 'Foto sin descripción';
    var img = AURA.html && AURA.html.img
      ? AURA.html.img(c.slot, { className: 'legal-credito__img', alt: '', width: 1600, height: 1200 })
      : '<img class="legal-credito__img" src="../img/' + esc(c.slot) + '.webp" width="1600" height="1200" alt="" loading="lazy" decoding="async">';
    return '<li class="legal-credito">' +
      '<div class="legal-credito__media">' + img + '</div>' +
      '<div class="legal-credito__body">' +
        '<p class="legal-credito__desc">' + esc(desc) + '</p>' +
        '<dl class="legal-credito__meta">' +
          '<div><dt>Autor</dt><dd>' + enlace(c.autorUrl, c.autor || 'Sin nombre') + '</dd></div>' +
          '<div><dt>Fuente</dt><dd>' + enlace(c.url, c.fuente || 'Original', '<span class="visually-hidden">: foto original</span>') + '</dd></div>' +
          '<div><dt>Licencia</dt><dd>' + enlace(c.licenciaUrl, c.licencia || 'Licencia libre') + '</dd></div>' +
          (c.modificada !== false ? '<div><dt>Cambios</dt><dd>Recortada y ajustada de tono' + (c.retocada ? '; logotipos o textos de pantalla borrados' : '') + '</dd></div>' : '') +
        '</dl>' +
      '</div>' +
    '</li>';
  }

  var html = '<p class="legal-creditos__total aura-caption">' + lista.length + ' fotos, agrupadas por la página en la que aparecen.</p>';
  GRUPOS.forEach(function (g) {
    var items = porGrupo[g.id];
    if (!items || !items.length) { return; }
    var idTitulo = 'creditos-' + g.id;
    html += '<section class="legal-creditos__grupo" aria-labelledby="' + idTitulo + '">' +
      '<h3 class="legal-creditos__titulo" id="' + idTitulo + '">' + esc(g.titulo) + ' <span class="legal-creditos__n">(' + items.length + ')</span></h3>' +
      '<ul class="legal-creditos__lista">' + items.map(item).join('') + '</ul>' +
    '</section>';
  });
  caja.innerHTML = html;

  /* Llegar con legal.html#imagenes: el ancla ya existe (la sección está en el HTML). */
})(window, document);
