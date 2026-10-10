/* ==========================================================================
   AURA — auraphone.html
   Lógica propia de la página de familia auraPhone. Script clásico: se carga
   después de aura-ui.js y usa solo window.AURA.

   1. Precios, disponibilidad, cifras y topes pintados desde el catálogo
      (data.js): ninguna cifra de precio, fecha ni estado escrita a mano.
   2. Notas al pie numeradas según las que se ven.
   3. Aviso del auraPhone Duo mientras está «Próximamente» (hoja + formulario
      con validación en línea + avisos con «Deshacer»). Se guarda solo en
      este navegador.
   ========================================================================== */
(function () {
  'use strict';

  var AURA = window.AURA;
  if (!AURA || !AURA.catalog || !AURA.fmt) { return; }

  var cat = AURA.catalog;
  var fmt = AURA.fmt;
  var ui = AURA.ui || null;
  var datos = AURA.data || {};
  var FAMILIA = 'auraphone';
  var DUO_ID = 'auraphone-duo';
  var meses = (datos.financing && Number(datos.financing.months) > 0) ? Number(datos.financing.months) : 24;

  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function one(sel, root) { return (root || document).querySelector(sel); }
  function esc(texto) {
    if (AURA.html && typeof AURA.html.esc === 'function') { return AURA.html.esc(texto); }
    return String(texto == null ? '' : texto).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function nbsp(texto) { return String(texto).replace(/\s+/g, ' '); }
  function mayuscula(texto) { return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : ''; }

  /* Escribe el texto en todos los [data-ap="clave"] y los muestra (o los oculta si no hay texto). */
  function pintar(clave, texto) {
    all('[data-ap="' + clave + '"]').forEach(function (el) {
      el.textContent = texto || '';
      el.hidden = !texto;
    });
  }

  function mostrarBloque(clave, visible) {
    all('[data-ap-bloque="' + clave + '"]').forEach(function (el) { el.hidden = !visible; });
  }

  function disponibilidad(p) {
    return typeof cat.availability === 'function'
      ? cat.availability(p)
      : { status: 'disponible', title: '', label: '', text: '', canBuy: true, preorder: '', release: '' };
  }

  function hoy() { return typeof cat.today === 'function' ? cat.today() : new Date(); }

  /* «16 de octubre» si es de este año; «16 de octubre de 2027» si no. */
  function diaLegible(iso) {
    var d = AURA.util && typeof AURA.util.parseDate === 'function' ? AURA.util.parseDate(iso) : null;
    if (!d) { return ''; }
    return d.getFullYear() === hoy().getFullYear() ? fmt.diaMes(iso) : fmt.fecha(iso);
  }

  /* «16 de octubre de 2026» dentro de <time datetime="2026-10-16">: la fecha
     exacta para la máquina y la legible para la persona. */
  function fechaHtml(iso) {
    var texto = esc(fmt.fecha(iso));
    return /^\d{4}-\d{2}-\d{2}$/.test(String(iso || '')) ? '<time datetime="' + esc(iso) + '">' + texto + '</time>' : texto;
  }


  /* ------------------------------------------------------------------------
     1. Datos del catálogo
     ------------------------------------------------------------------------ */

  var productos = cat.products(FAMILIA);

  /* «Desde …» de la gama: el precio base más bajo de la familia. */
  var minimo = productos.reduce(function (min, p) {
    var precio = Number(p.basePrice) || 0;
    return precio > 0 && (min === null || precio < min) ? precio : min;
  }, null);
  /* En el héroe la llamada a la nota va antes del punto (el punto está en el HTML). */
  var desde = minimo !== null ? 'Desde ' + fmt.eur0(minimo) + ' o ' + fmt.mes(minimo) + ' durante ' + meses + ' meses' : '';
  pintar('desde-heroe', desde);
  mostrarBloque('desde', !!desde);

  /* «Comprar auraPhone» (barra local, héroe y llamada final): data-aura-buy de
     la base, con el modelo de entrada (AURA.catalog.entry), como en auraPad y auraBook. */

  /* Cifras del auraPhone Duo, sacadas de sus specs y highlights:
     pantallas (″), peso, grosores y Touch ID. Lo que no se reconozca no se pinta. */
  function cifrasDuo(p) {
    var specs = p.specs || {};
    var out = [];
    var pulgadas = String(specs.pantalla || '').match(/\d+(?:,\d+)?\s*″/g) || [];
    if (pulgadas[0]) { out.push({ valor: pulgadas[0], texto: pulgadas.length > 1 ? 'Pantalla interior plegable' : 'Pantalla' }); }
    if (pulgadas[1]) { out.push({ valor: pulgadas[1], texto: 'Pantalla exterior' }); }

    /* «Titanio de grado 5 · …» → «De peso, en titanio» */
    var material = /^(titanio|aluminio|acero)\b/i.exec(String(specs.materiales || '').trim());
    String(specs.peso || '').split('·').forEach(function (parte) {
      parte = parte.trim();
      var m = /^(\d+(?:[.,]\d+)?\s*(?:kg|g))$/.exec(parte);
      if (m) {
        out.push({ valor: m[1], texto: 'De peso' + (material ? ', en ' + material[1].toLowerCase() : '') });
        return;
      }
      m = /^(\d+(?:,\d+)?\s*(?:mm|cm))(?:\s+(.+))?$/.exec(parte);
      if (m) { out.push({ valor: m[1], texto: 'De grosor' + (m[2] ? ', ' + m[2] : '') }); }
    });

    (p.highlights || []).some(function (h) {
      var m = /Touch ID(?:\s+(en [^,.;:]+))?/.exec(String(h));
      if (m) { out.push({ valor: 'Touch ID', texto: m[1] ? mayuscula(m[1].trim()) : 'Desbloqueo con la huella' }); }
      return !!m;
    });
    return out;
  }

  /* auraPhone Duo: precio, disponibilidad, llamada a la acción y cifras. */
  var duo = cat.product(DUO_ID);
  var dispDuo = duo ? disponibilidad(duo) : null;

  if (!duo) {
    /* Si el Duo sale de la gama, su sección (y su enlace de la barra local) dejan de tener sentido. */
    all('[data-ap-duo], .aura-localnav__link[href="#duo"]').forEach(function (el) { el.hidden = true; });
  } else {
    pintar('duo-precio', 'Desde ' + fmt.eur0(duo.basePrice));
    pintar('duo-cuota', 'o ' + fmt.mes(duo.basePrice) + ' durante ' + meses + ' meses');
    mostrarBloque('duo-precio', Number(duo.basePrice) > 0);

    var cta = one('[data-ap="duo-cta"]');
    if (cta) {
      cta.href = cat.url(duo);
      cta.textContent = cat.cta(duo) + ' ' + duo.name;
    }

    /* «Próximamente · Reserva a partir del 16 de octubre» / «Reserva · Entregas a partir del 23 de octubre» */
    var enVenta = dispDuo.status === 'disponible';
    pintar('duo-estado', enVenta ? '' : String(dispDuo.text || ''));   // la fecha ya trae espacios indivisibles
    mostrarBloque('duo-estado', !enVenta && !!dispDuo.text);

    /* Nota del Duo, con cada fecha en <time datetime="AAAA-MM-DD"> (HTML ya escapado). */
    var fechas = [];
    if (dispDuo.status === 'proximamente' && dispDuo.preorder) { fechas.push('reserva a partir del ' + fechaHtml(dispDuo.preorder)); }
    if (dispDuo.status === 'reserva') { fechas.push('reservas abiertas'); }
    if (!enVenta && dispDuo.release) { fechas.push('entregas a partir del ' + fechaHtml(dispDuo.release)); }
    var notaDuo = fechas.length ? esc(duo.name) + ': ' + fechas.join(' y ') + '. Las fechas pueden cambiar según la demanda.' : '';
    all('[data-ap="nota-duo"]').forEach(function (el) {
      el.innerHTML = notaDuo;
      el.hidden = !notaDuo;
    });
    var liDuo = one('#nota-duo');
    if (liDuo) { liDuo.hidden = !notaDuo; }

    var lista = one('[data-ap-cifras]');
    var cifras = cifrasDuo(duo);
    if (lista && cifras.length) {
      lista.innerHTML = cifras.map(function (c, i) {
        return '<li class="aura-stat aura-stat--card" data-aura-reveal style="--i:' + i + '">' +
          '<p class="aura-stat__value">' + esc(nbsp(c.valor)) + '</p>' +
          '<p class="aura-stat__label">' + esc(c.texto) + '</p></li>';
      }).join('');
      /* Columnas sin huérfanas (auraphone.css decide cuándo caben, según el
         ancho en rem): todas en una fila hasta seis; si no caben, 3 o 2. */
      var n = cifras.length;
      var md = n <= 3 ? n : (n % 3 === 0 ? 3 : (n % 2 === 0 ? 2 : 3));
      lista.style.setProperty('--cifras', String(n <= 6 ? n : md));
      lista.style.setProperty('--cifras-md', String(md));
      lista.hidden = false;
    }
  }



  /* ------------------------------------------------------------------------
     2. Notas al pie: se numeran por orden entre las visibles; cada llamada
        lleva el número de su nota y se oculta si su nota no está.
     ------------------------------------------------------------------------ */

  function numerarNotas() {
    var notas = one('[data-ap-notas]');
    if (!notas) { return; }
    var n = 0;
    Array.prototype.forEach.call(notas.children, function (li) {
      if (li.tagName !== 'LI' || !li.id) { return; }
      var visible = !li.hidden;
      if (visible) { n += 1; li.value = n; }
      var refs = all('a[href="#' + li.id + '"]').filter(function (a) { return !notas.contains(a); });
      refs.forEach(function (a) {
        var sup = a.closest('.aura-footnote-ref') || a;
        sup.hidden = !visible;
        if (visible) {
          a.textContent = String(n);
          a.setAttribute('aria-label', 'Nota ' + n);
        }
      });
      var volver = one('.aura-footnotes__back', li);
      if (volver) {
        volver.hidden = !refs.some(function (a) { return !a.closest('[hidden]'); });
        /* Enlace de solo icono: nombre (aria-label) y texto emergente (title) con el número nuevo. */
        if (visible) {
          volver.setAttribute('aria-label', 'Volver al texto de la nota ' + n);
          volver.setAttribute('title', 'Volver al texto de la nota ' + n);
        }
      }
    });
  }
  numerarNotas();


  /* ------------------------------------------------------------------------
     3. Aviso del auraPhone Duo: solo mientras aún no se puede reservar
     ------------------------------------------------------------------------ */

  var hoja = one('#aviso-duo');
  var formEl = one('#aviso-duo-form');
  var abrir = all('[data-ap-aviso]');
  var estadoAviso = all('[data-ap="aviso-estado"]');

  if (!duo || !dispDuo || dispDuo.status !== 'proximamente' || !dispDuo.preorder ||
      !hoja || !formEl || !ui || typeof ui.form !== 'function' || typeof ui.sheet !== 'function') {
    abrir.forEach(function (b) { b.hidden = true; });
    estadoAviso.forEach(function (el) { el.hidden = true; });
    return;
  }

  var CLAVE = 'aura.avisos.v1';
  var memoria = {};
  var soloMemoria = false;          // tras un fallo al guardar, manda la copia en memoria

  function esObjeto(v) { return Object.prototype.toString.call(v) === '[object Object]'; }

  function leerAvisos() {
    if (soloMemoria) { return memoria; }
    try {
      var raw = window.localStorage.getItem(CLAVE);
      var v = raw ? JSON.parse(raw) : {};
      return esObjeto(v) ? v : {};
    } catch (e) {
      return memoria;
    }
  }
  function guardarAvisos(avisos) {
    memoria = avisos;
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(avisos));
      soloMemoria = false;
      return true;
    } catch (e) {
      soloMemoria = true;
      return false;
    }
  }
  /* Un aviso guardado solo vale si es un objeto con un correo con forma de correo
     (datos de versiones antiguas o manipulados a mano se ignoran). */
  function avisoActual() {
    var a = leerAvisos()[DUO_ID];
    return esObjeto(a) && typeof a.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email.trim()) ? a : null;
  }
  function fijarAviso(aviso) {
    var avisos = leerAvisos();
    var copia = {};
    Object.keys(avisos).forEach(function (k) { copia[k] = avisos[k]; });
    if (aviso) { copia[DUO_ID] = aviso; } else { delete copia[DUO_ID]; }
    return guardarAvisos(copia);
  }

  var cuando = 'el ' + diaLegible(dispDuo.preorder);
  var sheet = ui.sheet(hoja);
  var cancelar = one('[data-ap-aviso-cancelar]', hoja);
  var enviar = one('[data-ap="aviso-enviar"]', hoja);
  var email = formEl.elements.email;
  var novedades = formEl.elements.novedades;

  pintar('aviso-texto', 'Te escribiremos ' + cuando + ', cuando abran las reservas del ' + duo.name +
    '. Solo ese correo, salvo que nos pidas también las novedades.');

  /* Botón de la sección + línea de estado: reflejan si ya hay un aviso. */
  function pintarEstado() {
    var aviso = avisoActual();
    abrir.forEach(function (b) {
      b.hidden = false;
      var etiqueta = one('[data-ap="aviso-boton"]', b);
      if (etiqueta) { etiqueta.textContent = aviso ? 'Cambiar el aviso' : 'Avísame'; }
      var extra = one('[data-ap="aviso-boton-extra"]', b);
      if (extra) { extra.textContent = aviso ? ' del ' + duo.name : ' cuando abran las reservas'; }
      var icono = one('.bi', b);
      if (icono) { icono.className = 'bi ' + (aviso ? 'bi-bell-fill' : 'bi-bell'); }
    });
    estadoAviso.forEach(function (el) {
      el.innerHTML = aviso
        ? '<i class="bi bi-check-circle-fill" aria-hidden="true"></i>Te avisaremos en ' + esc(aviso.email.trim()) + ' ' + esc(cuando) + '.'
        : '';
      el.hidden = !aviso;
    });
    if (cancelar) { cancelar.hidden = !aviso; }
    if (enviar) { enviar.textContent = aviso ? 'Guardar los cambios' : 'Activar el aviso'; }
  }

  function avisarSiNoSeGuarda(guardado) {
    if (guardado) { return; }
    ui.toast({
      kind: 'warn',
      title: 'Este navegador no guarda datos',
      text: 'El aviso durará mientras tengas abierta esta página.'
    });
  }

  var form = ui.form(formEl, {
    email: { required: 'Escribe tu correo para que podamos avisarte.', email: true }
  }, {
    onSubmit: function (valores) {
      var anterior = avisoActual();
      var aviso = {
        email: String(valores.email || '').trim(),
        novedades: !!valores.novedades,
        producto: DUO_ID,
        evento: 'reserva',
        fecha: dispDuo.preorder,
        creado: new Date().toISOString()
      };
      var guardado = fijarAviso(aviso);
      pintarEstado();
      if (sheet) { sheet.close(); }
      ui.toast({
        kind: 'ok',
        title: anterior ? 'Aviso actualizado' : 'Aviso activado',
        text: 'Te escribiremos a ' + aviso.email + ' ' + cuando + '.',
        action: {
          label: 'Deshacer',
          onClick: function () {
            avisarSiNoSeGuarda(fijarAviso(anterior));
            pintarEstado();
            ui.toast({
              kind: 'status',
              title: anterior ? 'Aviso restaurado' : 'Aviso desactivado',
              text: anterior ? 'Seguimos avisándote en ' + anterior.email + '.' : 'No te escribiremos sobre el ' + duo.name + '.'
            });
          }
        }
      });
      /* Éxito: la vibración acompaña al aviso que acaba de aparecer, en el mismo instante. */
      if (typeof ui.haptic === 'function') { ui.haptic('exito'); }
      avisarSiNoSeGuarda(guardado);
    }
  });

  /* Al abrir: el formulario parte del aviso guardado o, si no hay, del correo del ID de AURA. */
  hoja.addEventListener('aura:sheet-open', function () {
    var aviso = avisoActual();
    var usuario = AURA.auth && typeof AURA.auth.user === 'function' ? AURA.auth.user() : null;
    if (form) { form.clear(); }
    if (email) { email.value = aviso ? aviso.email.trim() : (usuario && usuario.email) || ''; }
    if (novedades) { novedades.checked = !!(aviso && aviso.novedades); }
    pintarEstado();
  });

  /* Cancelar no pide confirmación: se deshace desde el aviso. */
  if (cancelar) {
    cancelar.addEventListener('click', function () {
      var quitado = avisoActual();
      if (!quitado) { return; }
      var guardado = fijarAviso(null);
      pintarEstado();
      if (sheet) { sheet.close(); }
      ui.toast({
        kind: 'status',
        title: 'Aviso cancelado',
        text: 'Ya no te escribiremos sobre el ' + duo.name + '.',
        action: {
          label: 'Deshacer',
          onClick: function () {
            avisarSiNoSeGuarda(fijarAviso(quitado));
            pintarEstado();
            ui.toast({ kind: 'ok', title: 'Aviso recuperado', text: 'Te escribiremos a ' + quitado.email + ' ' + cuando + '.' });
          }
        }
      });
      avisarSiNoSeGuarda(guardado);
    });
  }

  /* Otra pestaña cambia (o borra) el aviso: esta se pone al día. */
  window.addEventListener('storage', function (e) {
    if (e.key === CLAVE || e.key === null) { soloMemoria = false; pintarEstado(); }
  });

  pintarEstado();
}());
