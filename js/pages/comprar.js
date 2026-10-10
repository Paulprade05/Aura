/* ==========================================================================
   AURA — Configurador (comprar.html?producto=ID)
   Todo sale del catálogo (AURA.catalog): nombres, colores, opciones, precios,
   dependencias (requires), disponibilidad por fechas y huecos de imagen. La
   página no guarda precios ni fechas.

   Estado: { producto, colorId, selections, care }. Cada cambio:
     1. Se re-resuelven las selecciones (AURA.catalog.resolve) y, si una opción
        deja de ser compatible, se avisa de lo que se ha ajustado.
     2. Se actualizan en su sitio radios, notas, resumen, barra de compra y
        región viva (sin repintar el grupo que tiene el foco).
     3. Se sincroniza la URL (history.replaceState) para compartir o recargar;
        se conserva ?hoy=AAAA-MM-DD (simulación de fecha para pruebas).

   Acción principal según AURA.catalog.availability(producto):
     disponible   → «Añadir a la bolsa»
     reserva      → «Reservar» (se entrega el día del lanzamiento)
     proximamente → «Avísame cuando abran las reservas»: se explora la
                    configuración y el precio, pero no se añade a la bolsa; el
                    aviso es simulado (se guarda en este navegador y, cuando
                    abren las reservas, esta página lo recuerda).
   ========================================================================== */
(function () {
  'use strict';

  var A = window.AURA;
  if (!A || !A.catalog || !A.bag || !A.fmt) { return; }

  var cat = A.catalog;
  var fmt = A.fmt;
  var esc = A.html && A.html.esc ? A.html.esc : function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var NBSP = '\u00a0';
  var SEP = NBSP + '· ';            // «Negro · 256 GB»: el punto nunca empieza una línea
  var CLAVE_AVISOS = 'aura.comprar.avisos.v1';

  /* Segunda frase (en gris) del título de cada paso, por id de grupo. */
  var PREGUNTAS = {
    almacenamiento: '¿Cuánto espacio necesitas?',
    conectividad: '¿Solo Wi-Fi o también 5G?',
    vidrio: '¿Brillo intenso o cero reflejos?',
    pantalla: '¿Brillo intenso o cero reflejos?',
    chip: '¿Cuánta potencia necesitas?',
    memoria: '¿Cuánta memoria quieres?'
  };

  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function list(v) { return Array.isArray(v) ? v : []; }
  function toast(o) { if (A.ui && A.ui.toast) { return A.ui.toast(o); } return null; }

  var el = {
    familia: q('[data-c-familia]'),
    titulo: q('[data-c-titulo]'),
    desde: q('[data-c-desde]'),
    estado: q('[data-c-estado]'),
    comparar: q('[data-c-comparar]'),
    gama: q('[data-c-gama]'),
    aviso: q('[data-c-aviso]'),
    galeria: q('[data-c-galeria]'),
    galeriaPie: q('[data-c-galeria-pie]'),
    galeriaNota: q('[data-c-galeria-nota]'),
    form: q('#configurador'),
    familias: q('[data-c-familias]'),
    modelos: q('[data-c-modelos]'),
    pasoAcabado: q('[data-c-paso-acabado]'),
    colorNombre: q('[data-c-color-nombre]'),
    colores: q('[data-c-colores]'),
    opciones: q('[data-c-opciones]'),
    pasoCare: q('[data-c-paso-care]'),
    carePregunta: q('[data-c-care-pregunta]'),
    careTexto: q('[data-c-care-texto]'),
    care: q('[data-c-care]'),
    careFaq: q('[data-c-care-faq]'),
    trade: q('[data-c-tradein]'),
    rTitulo: q('[data-c-resumen-titulo]'),
    rConfig: q('[data-c-resumen-config]'),
    rEquipo: q('[data-c-resumen-equipo]'),
    rPrecio: q('[data-c-resumen-precio]'),
    rCare: q('[data-c-resumen-care]'),
    rTrade: q('[data-c-resumen-trade]'),
    rTradeValor: q('[data-c-resumen-trade-valor]'),
    rEnvio: q('[data-c-resumen-envio]'),
    rTotal: q('[data-c-resumen-total]'),
    rNota: q('[data-c-resumen-nota]'),
    entrega: q('[data-c-entrega]'),
    entregaIcono: q('[data-c-entrega-icono]'),
    principal: q('#comprar-anadir'),
    acciones: qa('[data-c-accion]'),
    anadido: q('[data-c-anadido]'),
    anadidoTexto: q('[data-c-anadido-texto]'),
    avisado: q('[data-c-avisado]'),
    avisadoTexto: q('[data-c-avisado-texto]'),
    seguir: q('[data-c-seguir]'),
    barraNombre: q('[data-c-barra-nombre]'),
    barraPrecio: q('[data-c-barra-precio]'),
    barraCuota: q('[data-c-barra-cuota]'),
    anuncio: q('[data-c-anuncio]'),
    meses: qa('[data-c-meses]'),
    notasFechas: q('[data-c-notas-fechas]')
  };
  if (!el.form || !el.galeria || !el.modelos || !el.principal) { return; }

  var estado = { producto: null, colorId: '', selections: {}, care: false };
  var hoyParam = '';          // ?hoy=AAAA-MM-DD válido: se conserva al reescribir la URL
  var anadidoEnSesion = false;
  var avisoAlmacen = false;
  var conAlerta = false;


  /* ------------------------------------------------------------------------
     Utilidades de datos
     ------------------------------------------------------------------------ */

  function meses() {
    var f = A.data && A.data.financing;
    return f && f.months > 0 ? f.months : 24;
  }

  function cents(n) { return Math.round((Number(n) || 0) * 100) / 100; }

  function envioEstandar() {
    var s = A.data && A.data.shipping;
    var v = s ? Number(s.standard) : 0;
    return v > 0 ? cents(v) : 0;
  }

  function familia(p) {
    return cat.family(p.family) || { id: p.family, name: p.family, page: '../index.html' };
  }

  function paginaFamilia(f) { return f && f.page ? f.page : '../index.html'; }

  /* { status: 'proximamente' | 'reserva' | 'disponible', title, label, text, canBuy, preorder, release } */
  function disp(p) {
    if (p && typeof cat.availability === 'function') { return cat.availability(p); }
    return { status: 'disponible', title: '', label: '', text: '', canBuy: true, preorder: '', release: '' };
  }

  /* Qué hace el botón principal: 'anadir', 'reservar' o 'avisar'. */
  function modo(p) {
    var s = disp(p).status;
    return s === 'proximamente' ? 'avisar' : (s === 'reserva' ? 'reservar' : 'anadir');
  }

  /* Modelo con el que se abre una familia: el mejor que ya se puede comprar
     o reservar (si ninguno, el primero). */
  function primeroDe(familiaId) {
    var ps = cat.products(familiaId);
    for (var i = 0; i < ps.length; i++) { if (disp(ps[i]).canBuy) { return ps[i]; } }
    return ps[0] || null;
  }

  function tieneColor(p, colorId) {
    return list(p.colors).some(function (c) { return c.id === colorId; });
  }

  function grupo(p, id) {
    var gs = list(p.options);
    for (var i = 0; i < gs.length; i++) { if (gs[i].id === id) { return gs[i]; } }
    return null;
  }

  function opcionCruda(g, id) {
    var cs = list(g && g.choices);
    for (var i = 0; i < cs.length; i++) { if (cs[i].id === id) { return cs[i]; } }
    return null;
  }

  function copia(o) {
    var out = {};
    Object.keys(o || {}).forEach(function (k) { out[k] = o[k]; });
    return out;
  }

  /* Nota de una opción: la del catálogo o, si no está disponible y no la
     tiene, el motivo (qué otra selección lo impide). */
  function notaDe(p, g, c) {
    if (c.note) { return c.note; }
    if (c.available) { return ''; }
    var cruda = opcionCruda(g, c.id);
    var req = cruda && cruda.requires ? cruda.requires : {};
    var motivos = Object.keys(req).filter(function (gid) {
      return list(req[gid]).indexOf(estado.selections[gid]) === -1;
    }).map(function (gid) {
      var otro = grupo(p, gid);
      return otro ? otro.label.toLowerCase() : gid;
    });
    return motivos.length ? 'No disponible con tu selección de ' + motivos.join(' y ') : 'No disponible con esta configuración';
  }

  /* «AURA M5 Pro · CPU 18 núcleos · GPU 20 núcleos» → título + detalle. */
  function partes(label) {
    var trozos = String(label || '').split(' · ');
    return { titulo: trozos.shift(), detalle: trozos };
  }

  /* «2 TB», «40 núcleos»: la cifra no se separa de su unidad. */
  function cifras(texto) { return String(texto || '').replace(/(\d) (?=\S)/g, '$1' + NBSP); }

  /* Lista «CPU 18 núcleos · GPU 20 núcleos» que solo se parte entre
     elementos, nunca dentro de uno (.comprar-pieza no admite saltos). */
  function piezasHTML(piezas) {
    return piezas.filter(Boolean).map(function (s) {
      return '<span class="comprar-pieza">' + esc(s) + '</span>';
    }).join(SEP);
  }

  function precioOpcion(delta) { return delta ? '+ ' + fmt.eur0(delta) : 'Incluido'; }

  function topeTradeIn() {
    if (!A.tradeIn) { return 0; }
    if (typeof A.tradeIn.max === 'function') { return A.tradeIn.max(); }
    return Number(A.tradeIn.cap) || 0;
  }

  /* Llamada a una nota al pie (la nota existe en el HTML: #nota-N). */
  function ref(n) {
    return '<sup class="aura-footnote-ref"><a href="#nota-' + n + '" id="ref-' + n + '" aria-label="Nota ' + n + '">' + n + '</a></sup>';
  }


  /* ------------------------------------------------------------------------
     Fechas (siempre desde AURA.catalog.today(): respeta ?hoy=)
     ------------------------------------------------------------------------ */

  function hoy() {
    if (typeof cat.today === 'function') { return cat.today(); }
    var d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }

  function fecha(valor) { return A.util && A.util.parseDate ? A.util.parseDate(valor) : null; }

  function sumarLaborables(desde, n) {
    var d = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
    while (n > 0) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) { n--; }
    }
    return d;
  }

  /* «viernes 16 de octubre»: solo la fecha va pegada («16 de octubre»); tras el
     día de la semana sí se puede partir la línea (con texto grande no cabe
     entera). */
  function diaLargo(valor) {
    var d = fecha(valor);
    return d ? DIAS[d.getDay()] + ' ' + junto(fmt.diaMes(d)) : '';
  }

  /* Un nombre de modelo («auraPhone 18 Pro Max») no se parte dentro de una frase. */
  function pegado(texto) { return String(texto || '').replace(/ /g, NBSP); }

  /* «16 de octubre» no se parte entre líneas (espacios indivisibles). */
  function junto(texto) {
    return String(texto || '').replace(/(\d{1,2}) de ([a-záéíóúñ]+)/gi, '$1' + NBSP + 'de' + NBSP + '$2');
  }

  /* Cada fecha, también legible por máquina (temario DIW, semántica):
     <time datetime="2026-10-16">viernes 16 de octubre</time>. El texto se ve igual. */
  function tiempo(valor, texto) {
    var d = fecha(valor);
    var iso = d && A.util && A.util.isoDate ? A.util.isoDate(d) : '';
    return iso ? '<time datetime="' + iso + '">' + esc(texto) + '</time>' : esc(texto);
  }

  /* «entre el martes 6 y el miércoles 7 de octubre» (el mes, una vez si
     coincide), con cada fecha en su <time>. Devuelve HTML. */
  function rangoHTML(d1, d2) {
    var primero = d1.getMonth() === d2.getMonth() ? DIAS[d1.getDay()] + ' ' + d1.getDate() : diaLargo(d1);
    return 'entre el ' + tiempo(d1, primero) + ' y el ' + tiempo(d2, diaLargo(d2));
  }

  /* Línea de entrega del resumen: { icono, html, fecha } */
  function entrega(p) {
    var a = disp(p);
    if (a.status === 'proximamente') {
      return {
        icono: 'bi-calendar-event', fecha: true,
        html: 'Reservas a partir del <strong>' + tiempo(a.preorder, diaLargo(a.preorder)) + '</strong>.' +
          (a.release ? ' Entregas a partir del ' + tiempo(a.release, diaLargo(a.release)) + '.' : '')
      };
    }
    if (a.status === 'reserva') {
      return {
        icono: 'bi-calendar-check', fecha: true,
        html: a.release ? 'Entrega a partir del <strong>' + tiempo(a.release, diaLargo(a.release)) + '</strong>, día del lanzamiento.' : 'Te lo entregamos el día del lanzamiento.'
      };
    }
    var base = hoy();
    return {
      icono: 'bi-truck', fecha: false,
      html: 'Recíbelo <strong>' + rangoHTML(sumarLaborables(base, 2), sumarLaborables(base, 3)) + '</strong>.'
    };
  }


  /* ------------------------------------------------------------------------
     Avisos de reserva (simulados: solo en este navegador)
     ------------------------------------------------------------------------ */

  var avisosEnMemoria = null;   // si localStorage no deja escribir, mandan estos

  function leerAvisos() {
    if (avisosEnMemoria) { return copia(avisosEnMemoria); }
    try {
      var raw = window.localStorage.getItem(CLAVE_AVISOS);
      var v = raw ? JSON.parse(raw) : {};
      return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    } catch (e) { return {}; }
  }

  function guardarAvisos(avisos) {
    try {
      window.localStorage.setItem(CLAVE_AVISOS, JSON.stringify(avisos));
      avisosEnMemoria = null;
      return true;
    } catch (e) {
      avisosEnMemoria = avisos;
      return false;
    }
  }

  function avisoDe(id) {
    var v = leerAvisos()[id];
    return v && typeof v === 'object' ? v : null;
  }

  function fijarAviso(id, aviso) {
    var avisos = leerAvisos();
    if (aviso) { avisos[id] = aviso; } else { delete avisos[id]; }
    return guardarAvisos(avisos);
  }


  /* ------------------------------------------------------------------------
     Pintado
     ------------------------------------------------------------------------ */

  function pintarCabecera() {
    var p = estado.producto;
    var f = familia(p);
    var a = disp(p);
    var verbo = cat.cta(p);
    el.familia.textContent = 'AURA Store / ' + f.name;   // antetítulo mono, como bolsa, checkout y cuenta
    el.titulo.textContent = verbo + ' ' + p.name;
    el.desde.innerHTML = 'Desde ' + esc(fmt.eur0(p.basePrice)) + ' o ' + esc(fmt.mes(p.basePrice)) +
      ' durante ' + meses() + NBSP + 'meses.' + ref(1);

    if (a.status !== 'disponible' && a.text) {
      /* El mismo icono que la línea de entrega del resumen para ese estado. */
      el.estado.innerHTML = '<i class="bi ' + (a.status === 'reserva' ? 'bi-calendar-check' : 'bi-calendar-event') + '" aria-hidden="true"></i>' +
        '<span>' + (a.html || esc(junto(a.text))) + '</span>';   // la fecha, en <time datetime>
      el.estado.hidden = false;
    } else {
      el.estado.hidden = true;
      el.estado.innerHTML = '';
    }

    el.comparar.setAttribute('href', 'comparar.html?familia=' + encodeURIComponent(f.id));
    el.comparar.setAttribute('aria-label', 'Comparar todos los modelos de ' + f.name);
    el.gama.setAttribute('href', paginaFamilia(f));
    el.gama.setAttribute('aria-label', 'Ver la gama ' + f.name);
    if (el.seguir) {
      el.seguir.setAttribute('href', paginaFamilia(f));
      el.seguir.setAttribute('aria-label', 'Seguir comprando: gama ' + f.name);
    }

    /* Título descriptivo y único por modelo (40–65 caracteres, temario DIW):
       «Comprar auraPhone 18 Pro: acabados, precio y cuotas — AURA». */
    document.title = verbo + ' ' + p.name + ': acabados, precio y cuotas — AURA';
    if (A.header && A.header.setActive) { A.header.setActive(f.id); }
    if (A.footer && A.footer.setCrumbs) {
      A.footer.setCrumbs([{ label: f.name, href: paginaFamilia(f) }, verbo + ' ' + p.name]);
    }
    pintarAccion();
  }

  /* Botón del resumen y de la barra: la misma acción, con su etiqueta. Con el
     aviso ya activado, el botón dice que está hecho y deja de ser la acción
     principal (la confirmación y «Cancelar el aviso» van debajo). */
  function pintarAccion() {
    var p = estado.producto;
    var m = modo(p);
    var avisado = m === 'avisar' && !!avisoDe(p.id);
    el.acciones.forEach(function (b) {
      var enBarra = b.hasAttribute('data-c-barra-boton');
      var texto;
      var nombre;
      var icono = '';
      if (avisado) {
        texto = esc('Aviso activado');
        nombre = 'Aviso activado: te recordaremos la apertura de las reservas del ' + p.name;
        icono = 'bi-check-lg';
      } else if (m === 'avisar') {
        /* En la barra de compra del móvil solo cabe «Avísame»; desde 768 px,
           la misma etiqueta que en el resumen. */
        texto = enBarra
          ? '<span>Avísame<span class="comprar-accion__resto"> cuando abran las reservas</span></span>'
          : esc('Avísame cuando abran las reservas');
        nombre = 'Avísame cuando abran las reservas del ' + p.name;
        icono = 'bi-bell';
      } else if (m === 'reservar') {
        texto = esc('Reservar');
        nombre = 'Reservar ' + p.name;
      } else {
        texto = esc('Añadir a la bolsa');
        nombre = 'Añadir a la bolsa: ' + p.name;
      }
      b.innerHTML = (icono ? '<i class="bi ' + icono + '" aria-hidden="true"></i>' : '') + texto;
      b.setAttribute('aria-label', nombre);
      b.setAttribute('data-modo', avisado ? 'avisado' : m);
      b.classList.toggle('aura-btn--primary', !avisado);
      b.classList.toggle('aura-btn--secondary', avisado);
    });
    pintarAvisado();
    pintarAnadido();
  }

  function pintarFamilias() {
    var actual = estado.producto.family;
    el.familias.innerHTML =
      '<p class="aura-legend aura-legend--sm" id="comprar-familia-etiqueta">Familia</p>' +
      '<div class="aura-segmented" role="radiogroup" aria-labelledby="comprar-familia-etiqueta">' +
      cat.families().map(function (f) {
        return '<label class="aura-segmented__item"><input type="radio" name="familia" value="' + esc(f.id) + '"' +
          (f.id === actual ? ' checked' : '') + '><span>' + esc(f.name) + '</span></label>';
      }).join('') +
      '</div>';
    el.familias.hidden = false;
  }

  function insigniaDe(m) {
    var a = disp(m);
    if (a.status === 'disponible' || !a.title) { return ''; }
    /* Reserva: la insignia dorada de la guía; Próximamente: neutra. Siempre con texto. */
    return ' <span class="aura-badge' + (a.status === 'reserva' ? '' : ' aura-badge--neutral') + '">' + esc(a.title) + '</span>';
  }

  function pintarModelos() {
    var p = estado.producto;
    el.modelos.innerHTML = cat.products(p.family).map(function (m) {
      return '<label class="aura-option comprar-modelo">' +
        '<input class="aura-option__input" type="radio" name="producto" value="' + esc(m.id) + '"' + (m.id === p.id ? ' checked' : '') + '>' +
        '<span class="aura-option__card">' +
          '<span class="aura-option__body">' +
            '<span class="aura-option__title">' + esc(m.name) + insigniaDe(m) + '</span>' +
            (m.tagline ? '<span class="aura-option__note">' + esc(m.tagline) + '</span>' : '') +
          '</span>' +
          '<span class="aura-option__price">Desde ' + esc(fmt.eur0(m.basePrice)) + '</span>' +
        '</span>' +
      '</label>';
    }).join('');
  }

  function pintarColores() {
    var p = estado.producto;
    var colores = list(p.colors);
    if (el.pasoAcabado) { el.pasoAcabado.hidden = !colores.length; }
    el.colores.innerHTML = colores.map(function (c) {
      return '<label class="aura-swatch" style="--swatch:' + esc(c.hex) + '">' +
        '<input class="aura-swatch__input" type="radio" name="color" value="' + esc(c.id) + '"' + (c.id === estado.colorId ? ' checked' : '') + '>' +
        '<span class="aura-swatch__dot" aria-hidden="true"></span>' +
        '<span class="visually-hidden">' + esc(c.name) + '</span>' +
      '</label>';
    }).join('');
  }

  function opcionHTML(p, g, c) {
    var t = partes(c.label);
    var nota = notaDe(p, g, c);
    return '<label class="aura-option">' +
      '<input class="aura-option__input" type="radio" name="' + esc(g.id) + '" value="' + esc(c.id) + '"' +
        (c.selected ? ' checked' : '') + (c.available ? '' : ' disabled') + '>' +
      '<span class="aura-option__card">' +
        '<span class="aura-option__body">' +
          '<span class="aura-option__title">' + esc(t.titulo) + '</span>' +
          (t.detalle.length ? '<span class="aura-option__note">' + piezasHTML(t.detalle) + '</span>' : '') +
          '<span class="aura-option__note" data-c-nota' + (nota ? '' : ' hidden') + '>' + esc(cifras(nota)) + '</span>' +
        '</span>' +
        '<span class="aura-option__price">' + esc(precioOpcion(c.delta)) + '</span>' +
      '</span>' +
    '</label>';
  }

  function pintarOpciones() {
    var p = estado.producto;
    el.opciones.innerHTML = list(p.options).map(function (g) {
      var choices = cat.choices(p, g.id, estado.selections);
      if (!choices.length) { return ''; }
      /* Rejilla de dos columnas solo para elecciones cortas y sin notas (p. ej.
         capacidades); el resto, en filas a todo el ancho para que se lean enteras. */
      var cortas = choices.length > 1 && choices.every(function (c) {
        return String(c.label).length <= 12 && String(c.label).indexOf(' · ') === -1 && !c.note;
      });
      var pregunta = PREGUNTAS[g.id];
      return '<fieldset class="aura-fieldset comprar-paso" data-c-grupo="' + esc(g.id) + '">' +
        '<legend class="aura-legend"><h2 class="aura-h3 comprar-paso__titulo">' + esc(g.label) + '.' +
          (pregunta ? ' <span class="aura-text-secondary">' + esc(pregunta) + '</span>' : '') + '</h2></legend>' +
        '<div class="aura-option-group' + (cortas ? ' aura-option-group--2' : '') + '">' +
          choices.map(function (c) { return opcionHTML(p, g, c); }).join('') +
        '</div>' +
      '</fieldset>';
    }).join('');
  }

  /* Actualiza en su sitio (sin repintar: el foco del teclado se conserva). */
  function actualizarOpciones() {
    var p = estado.producto;
    list(p.options).forEach(function (g) {
      var caja = q('[data-c-grupo="' + g.id + '"]', el.opciones);
      if (!caja) { return; }
      var inputs = qa('input[type="radio"]', caja);
      cat.choices(p, g.id, estado.selections).forEach(function (c) {
        var input = null;
        for (var i = 0; i < inputs.length; i++) { if (inputs[i].value === c.id) { input = inputs[i]; break; } }
        if (!input) { return; }
        input.disabled = !c.available;
        input.checked = c.selected;
        var nota = q('[data-c-nota]', input.parentNode);
        if (nota) {
          var texto = cifras(notaDe(p, g, c));
          if (nota.textContent !== texto) { nota.textContent = texto; }
          nota.hidden = !texto;
        }
      });
    });
  }

  function pintarCare() {
    var p = estado.producto;
    var f = familia(p);
    var precio = cat.carePrice(p);
    var care = (A.data && A.data.care) || {};
    if (el.pasoCare) { el.pasoCare.hidden = !(precio > 0); }
    if (!(precio > 0)) { estado.care = false; el.care.innerHTML = ''; return; }
    el.carePregunta.textContent = 'Protege tu nuevo ' + f.name + '.';
    el.careTexto.textContent = care.description || '';
    el.careTexto.hidden = !care.description;
    var opcion = function (valor, titulo, nota, precioTxt, marcado) {
      return '<label class="aura-option">' +
        '<input class="aura-option__input" type="radio" name="auracare" value="' + valor + '"' + (marcado ? ' checked' : '') + '>' +
        '<span class="aura-option__card">' +
          '<span class="aura-option__body">' +
            '<span class="aura-option__title">' + esc(titulo) + '</span>' +
            '<span class="aura-option__note">' + esc(nota) + '</span>' +
          '</span>' +
          (precioTxt ? '<span class="aura-option__price">' + esc(precioTxt) + '</span>' : '') +
        '</span>' +
      '</label>';
    };
    el.care.innerHTML =
      opcion('no', 'Sin AuraCare+', 'Garantía legal incluida', '', !estado.care) +
      opcion('si', 'Con AuraCare+', 'o ' + fmt.mes(precio) + ' durante ' + meses() + NBSP + 'meses', '+ ' + fmt.eur0(precio), estado.care);
    if (el.careFaq && care.description) {
      el.careFaq.textContent = care.description + ' Su precio depende del dispositivo: lo verás en el paso AuraCare+.';
    }
  }

  function pintarTradeIn() {
    var t = A.tradeIn ? A.tradeIn.get() : null;
    if (t) {
      var origen = t.deviceName ? 'Por tu ' + t.deviceName + (t.conditionLabel ? ' (' + t.conditionLabel.toLowerCase() + ')' : '') + '. ' : '';
      el.trade.innerHTML =
        '<div class="aura-note comprar-trade">' +
          '<span class="aura-note__icon"><i class="bi bi-arrow-repeat" aria-hidden="true"></i></span>' +
          '<p class="aura-note__title">Tienes ' + esc(fmt.eur0(t.value)) + ' de crédito' + ref(2) + '</p>' +
          '<p class="aura-note__text">' + esc(origen) + 'Se descuenta del total al tramitar el pedido.</p>' +
          '<p class="aura-note__text comprar-trade__acciones">' +
            '<a class="aura-link aura-link--control" href="trade-in.html">Cambiar la valoración</a>' +
            '<button class="aura-link aura-link--plain" type="button" data-c-quitar-credito>Quitar el crédito</button>' +
          '</p>' +
        '</div>';
    } else {
      var tope = topeTradeIn();
      el.trade.innerHTML =
        '<div class="aura-note comprar-trade">' +
          '<span class="aura-note__icon"><i class="bi bi-arrow-repeat" aria-hidden="true"></i></span>' +
          '<p class="aura-note__title">' + (tope > 0 ? 'Hasta ' + esc(fmt.eur0(tope)) + ' por tu dispositivo actual' : 'Tu dispositivo actual vale más de lo que crees') + ref(2) + '</p>' +
          '<p class="aura-note__text">Valóralo en un minuto. El crédito se guarda y se descuenta del total al tramitar el pedido.</p>' +
          '<p class="aura-note__text comprar-trade__acciones"><a class="aura-link aura-link--control" href="trade-in.html">Valorar mi dispositivo</a></p>' +
        '</div>';
    }
  }

  /* Letra pequeña: cifras y fechas desde el catálogo. */
  function pintarNotas() {
    /* Financiación, envío y Trade In: textos comunes de AURA.legal (data-aura-legal). */
    if (el.notasFechas) {
      var items = cat.products(estado.producto.family).map(function (m) {
        var a = disp(m);
        if (a.status === 'disponible') { return ''; }
        /* Cada fecha en su <time> (HTML ya escapado). */
        var partesHTML = [];
        if (a.status === 'proximamente' && a.preorder) { partesHTML.push('reservas a partir del ' + tiempo(a.preorder, junto(fmt.fecha(a.preorder)))); }
        if (a.release) { partesHTML.push('entregas a partir del ' + tiempo(a.release, junto(fmt.fecha(a.release)))); }
        if (!partesHTML.length) { return ''; }
        return '<li>' + esc(m.name) + ': ' + partesHTML.join(' y ') + '. Fechas previstas en España.</li>';
      }).filter(Boolean);
      el.notasFechas.innerHTML = items.join('');
      el.notasFechas.hidden = !items.length;
    }
  }

  /* Aviso bajo la cabecera: 'falta' (sin modelo en la dirección), 'invalido'
     (modelo que no existe) o 'vacio' (catálogo sin modelos). */
  function pintarAlerta(tipo, pedido) {
    if (!tipo) { el.aviso.hidden = true; el.aviso.innerHTML = ''; return; }
    var aviso = tipo === 'invalido' || tipo === 'vacio';
    var cambia = estado.producto
      ? 'Te mostramos el ' + pegado(estado.producto.name) + ': cambia de familia o de modelo cuando quieras.'
      : 'Cambia de familia o de modelo cuando quieras.';
    var titulo = { falta: 'Elige tu modelo para empezar', invalido: 'No encontramos ese modelo', vacio: 'Ahora mismo no hay modelos a la venta' }[tipo];
    var pedidoCorto = String(pedido || '').length > 40 ? String(pedido).slice(0, 39) + '…' : String(pedido || '');
    var texto = tipo === 'vacio'
      ? 'Vuelve en unos minutos o <a href="soporte.html#contacto">escríbenos desde Soporte</a>.'
      : esc((tipo === 'invalido' && pedidoCorto ? '«' + pedidoCorto + '» no está en la gama actual. ' : '') + cambia);
    el.aviso.innerHTML =
      '<div class="aura-alert' + (aviso ? ' aura-alert--warn' : '') + '" role="status">' +
        '<i class="bi ' + (aviso ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill') + '" aria-hidden="true"></i>' +
        '<p class="aura-alert__title">' + esc(titulo) + '</p>' +
        '<p class="aura-alert__text">' + texto + '</p>' +
      '</div>';
    el.aviso.hidden = false;
  }

  /* ------------------------------------------------------------------------
     Galería: la foto del modelo en el acabado elegido.
     Solo hay foto por color si data.js la declara (imageVariants): casi
     siempre, al tocar otro color, la foto es la misma y NO se funde nada; se
     actualizan su alt y la nota «Imagen en azul glacial · Tu acabado: negro».
     Cuando la foto cambia de verdad (otro modelo, o un color con foto propia),
     la nueva se monta encima, invisible, y en cuanto está decodificada se funde
     sobre la anterior mientras esta se funde a cero (fundido cruzado, sin
     temporizadores de espera: la vieja sigue a la vista hasta entonces). Son
     transiciones de opacidad, así que un cambio nuevo parte del valor en curso;
     volver a la foto que se estaba yendo la recupera sin pedir nada.
     ------------------------------------------------------------------------ */

  function infoImagen() { return cat.image(estado.producto, estado.colorId); }

  /* El alt describe la foto real (catálogo); si faltara, modelo y acabado. */
  function altDe(info) {
    if (info && info.alt) { return info.alt; }
    var color = cat.color(estado.producto, estado.colorId);
    return estado.producto.name + (color ? ' en ' + color.name.toLowerCase() : '');
  }

  /* «auraPhone 18 Pro, negro» (para el anuncio al cambiar de modelo). */
  function nombreConColor() {
    var color = cat.color(estado.producto, estado.colorId);
    return estado.producto.name + (color ? ', ' + color.name.toLowerCase() : '');
  }

  /* Pie de la galería y nota: el pie dice el acabado elegido cuando la foto lo
     enseña; si enseña otro, el pie se calla y la nota bajo la galería lo dice. */
  function pintarPieImagen(info) {
    var p = estado.producto;
    var color = cat.color(p, estado.colorId);
    var otro = !!(!info.exact && info.color && color && info.color.id !== color.id);
    el.galeriaPie.textContent = color ? color.name : '';
    el.galeriaPie.hidden = otro;
    if (!el.galeriaNota) { return; }
    /* Solo en modelos con varios acabados cuya foto enseña uno: ahí el hueco
       de la nota está siempre reservado, así las muestras (debajo en el
       móvil) no se mueven bajo el dedo al aparecer o irse la nota. */
    el.galeriaNota.hidden = !(cat.image(p).color && list(p.colors).length > 1);
    el.galeriaNota.classList.toggle('is-off', !otro);
    el.galeriaNota.innerHTML = otro
      ? '<span class="aura-swatch-list__dot" style="--swatch:' + esc(info.color.hex) + '" aria-hidden="true"></span>' +
        '<span>Imagen en ' + esc(info.color.name.toLowerCase()) + SEP + 'Tu acabado: ' + esc(color.name.toLowerCase()) + '</span>'
      : '';
  }

  /* El fundido cruzado es el de la base (AURA.ui.gallery, §8 de COMPONENTES):
     la misma foto solo cambia su alt; otra se monta encima, invisible, y se
     funde sobre la anterior en cuanto está decodificada. La primera es la
     imagen principal de la página: sin carga diferida y con prioridad. */
  var galeria = null;
  function cambiarImagen() {
    var info = infoImagen();
    pintarPieImagen(info);
    if (!info.slot) { return; }
    galeria = galeria || (A.ui && A.ui.gallery ? A.ui.gallery(el.galeria) : null);
    if (galeria) {
      galeria.show(info.slot, { fallback: info.fallback, alt: altDe(info), priority: true });
      return;
    }
    var actual = qa('.aura-img, .aura-slot', el.galeria);
    if (actual.length && A.slots) { A.slots.set(actual[actual.length - 1], info.slot, { fallback: info.fallback, alt: altDe(info) }); }
  }


  /* ------------------------------------------------------------------------
     Resumen, barra de compra, URL
     ------------------------------------------------------------------------ */

  function calcular() {
    var p = estado.producto;
    var precio = cat.price(p, estado.selections);
    var care = estado.care ? cat.carePrice(p) : 0;
    var unidad = cents(precio + care);
    var descuento = A.tradeIn ? A.tradeIn.discount(unidad) : 0;
    var envio = envioEstandar();
    return { precio: precio, care: care, unidad: unidad, descuento: descuento, envio: envio, total: cents(unidad - descuento + envio) };
  }

  function actualizar(opciones) {
    opciones = opciones || {};
    var p = estado.producto;
    var color = cat.color(p, estado.colorId);
    var nombreColor = color ? color.name : '';
    var etiquetas = cat.optionLabels(p, estado.selections);
    var c = calcular();
    var e = entrega(p);

    el.colorNombre.textContent = nombreColor;

    /* «Tu nuevo auraPhone Duo.»; tras «16″» no se añade el punto. */
    el.rTitulo.textContent = 'Tu nuevo ' + p.name + (/[0-9a-záéíóúñ]$/i.test(p.name) ? '.' : '');
    /* Cada elemento de la configuración («GPU 20 núcleos», «Pantalla
       estándar») va entero en su línea: solo se parte entre elementos. */
    var piezas = [];
    [nombreColor].concat(etiquetas).concat(estado.care ? ['AuraCare+'] : []).forEach(function (t) {
      piezas = piezas.concat(String(t || '').split(' · '));
    });
    el.rConfig.innerHTML = piezasHTML(piezas);
    el.rEquipo.textContent = p.name;
    el.rPrecio.textContent = fmt.eur(c.precio);
    el.rCare.textContent = estado.care ? fmt.eur(c.care) : 'No incluido';
    el.rTrade.hidden = !(c.descuento > 0);
    el.rTradeValor.textContent = '− ' + fmt.eur(c.descuento);
    if (el.rEnvio) { el.rEnvio.textContent = c.envio > 0 ? fmt.eur(c.envio) : 'Gratis'; }
    el.rTotal.textContent = fmt.eur(c.total);
    el.rNota.textContent = 'IVA incluido. O ' + fmt.mes(c.total) + ' durante ' + meses() + NBSP + 'meses.';
    el.entrega.innerHTML = e.html;
    if (el.entregaIcono) { el.entregaIcono.className = 'bi ' + e.icono; }
    el.entrega.parentNode.classList.toggle('comprar-entrega--fecha', e.fecha);

    el.barraNombre.textContent = p.name + (nombreColor ? ' · ' + nombreColor : '');
    el.barraPrecio.textContent = fmt.eur(c.total);
    if (el.barraCuota) { el.barraCuota.textContent = 'o ' + fmt.mes(c.total) + ' durante ' + meses() + NBSP + 'meses'; }

    if (!opciones.silencio && el.anuncio) {
      el.anuncio.textContent = (opciones.prefijo || '') + 'Total: ' + fmt.eur(c.total) + '. O ' + fmt.mes(c.total) + ' durante ' + meses() + NBSP + 'meses.';
    }
    sincronizarURL();
  }

  function sincronizarURL() {
    if (!window.history || typeof window.history.replaceState !== 'function') { return; }
    var p = estado.producto;
    var partesURL = ['producto=' + encodeURIComponent(p.id)];
    if (estado.colorId) { partesURL.push('color=' + encodeURIComponent(estado.colorId)); }
    list(p.options).forEach(function (g) {
      if (estado.selections[g.id]) { partesURL.push(encodeURIComponent(g.id) + '=' + encodeURIComponent(estado.selections[g.id])); }
    });
    if (estado.care) { partesURL.push('auracare=si'); }
    if (hoyParam) { partesURL.push('hoy=' + hoyParam); }
    var url = '?' + partesURL.join('&') + (window.location.hash || '');
    if (url === window.location.search + (window.location.hash || '')) { return; }
    try { window.history.replaceState(window.history.state, '', url); } catch (e) { /* file:// estricto: la página sigue funcionando */ }
  }

  function pintarAnadido() {
    if (!el.anadido) { return; }
    var n = A.bag.count();
    if (!anadidoEnSesion || !n || modo(estado.producto) === 'avisar') { el.anadido.hidden = true; return; }
    el.anadidoTexto.textContent = 'En tu bolsa: ' + fmt.articulos(n) + '.';
    el.anadido.hidden = false;
  }

  function pintarAvisado() {
    if (!el.avisado) { return; }
    var p = estado.producto;
    var a = disp(p);
    var aviso = a.status === 'proximamente' ? avisoDe(p.id) : null;
    el.avisado.hidden = !aviso;
    if (aviso) { el.avisadoTexto.textContent = 'Te lo recordaremos aquí el día que abran las reservas.'; }
  }


  /* ------------------------------------------------------------------------
     Cambios
     ------------------------------------------------------------------------ */

  function pintarProducto(opciones) {
    opciones = opciones || {};
    pintarCabecera();
    if (opciones.modelos) { pintarModelos(); }
    pintarColores();
    pintarOpciones();
    pintarCare();
    pintarTradeIn();
    pintarNotas();
    cambiarImagen();                      // la primera vez la monta
    actualizar({ silencio: opciones.primera, prefijo: opciones.primera ? '' : nombreConColor() + '. ' });
    avisoCumplido();
  }

  function cambiarProducto(nuevo, origen) {
    if (!nuevo || nuevo.id === estado.producto.id) { return; }
    var anterior = estado.producto;
    var colorAnterior = cat.color(anterior, estado.colorId);
    var cambiaFamilia = nuevo.family !== anterior.family;
    estado.producto = nuevo;
    var mantieneColor = tieneColor(nuevo, estado.colorId);
    if (!mantieneColor) { estado.colorId = cat.defaults(nuevo).colorId; }
    /* Se conserva lo que el usuario cambió respecto a la configuración base
       del modelo anterior (p. ej. 512 GB), si existe en el nuevo; lo demás
       parte de la base del nuevo modelo, así su «Desde» sigue siendo cierto. */
    var pedidas = {};
    if (!cambiaFamilia) {
      var base = cat.defaults(anterior).selections;
      Object.keys(estado.selections).forEach(function (k) {
        if (estado.selections[k] !== base[k]) { pedidas[k] = estado.selections[k]; }
      });
    }
    estado.selections = cat.resolve(nuevo, pedidas);
    if (conAlerta) { conAlerta = false; pintarAlerta(null); }
    pintarProducto({ modelos: cambiaFamilia });

    /* Solo se avisa si se pierde un acabado que había elegido la persona (no
       el de serie del modelo anterior): lo demás se ve y se anuncia sin ruido. */
    var eraElegido = colorAnterior && colorAnterior.id !== cat.defaults(anterior).colorId;
    if (origen === 'modelo' && !mantieneColor && eraElegido) {
      var color = cat.color(nuevo, estado.colorId);
      haptica('ajuste');
      toast({
        kind: 'status',
        title: 'Acabado ajustado',
        text: 'El ' + nuevo.name + ' no se fabrica en ' + colorAnterior.name.toLowerCase() + '. Te lo mostramos en ' + (color ? color.name.toLowerCase() : 'su primer acabado') + '.'
      });
    }
  }

  function cambiarOpcion(gid, valor) {
    var p = estado.producto;
    var pedido = copia(estado.selections);
    pedido[gid] = valor;
    var resuelto = cat.resolve(p, pedido);
    var ajustes = [];
    list(p.options).forEach(function (g) {
      if (g.id === gid || resuelto[g.id] === estado.selections[g.id]) { return; }
      var c = opcionCruda(g, resuelto[g.id]);
      ajustes.push(g.label + ': ' + (c ? c.label : resuelto[g.id]));
    });
    estado.selections = resuelto;
    actualizarOpciones();
    actualizar();
    if (ajustes.length) {
      haptica('ajuste');
      toast({
        kind: 'status',
        title: 'Hemos ajustado tu configuración',
        text: ajustes.join(SEP) + '. Así es compatible con lo que acabas de elegir.'
      });
    }
  }

  function alCambiar(e) {
    var t = e.target;
    if (!t || t.type !== 'radio' || !t.checked) { return; }
    switch (t.name) {
      case 'producto':
        cambiarProducto(cat.product(t.value), 'modelo');
        return;
      case 'familia':
        cambiarProducto(primeroDe(t.value), 'familia');
        return;
      case 'color':
        if (!tieneColor(estado.producto, t.value)) { return; }
        estado.colorId = t.value;
        cambiarImagen();
        actualizar();
        return;
      case 'auracare':
        estado.care = t.value === 'si';
        actualizar();
        return;
      default:
        if (grupo(estado.producto, t.name)) { cambiarOpcion(t.name, t.value); }
    }
  }


  /* ------------------------------------------------------------------------
     Acciones
     ------------------------------------------------------------------------ */

  /* Háptica del sistema (solo táctil, en el mismo instante que el aviso). */
  function haptica(tipo) { if (A.ui && A.ui.haptic) { A.ui.haptic(tipo); } }

  function describir(linea) {
    return [linea.colorName].concat(list(linea.optionLabels)).concat(linea.care ? ['AuraCare+'] : []).filter(Boolean).join(SEP);
  }

  function avisarSiNoSeGuarda(guardado, que) {
    if (avisoAlmacen) { return; }
    if (guardado === false || (A.storage && A.storage.persistent === false)) {
      avisoAlmacen = true;
      toast({ kind: 'warn', title: 'Este navegador no guarda datos', text: que + ' durará mientras tengas abierta esta página.' });
    }
  }

  function accion() {
    if (modo(estado.producto) === 'avisar') { avisar(); } else { anadir(); }
  }

  function anadir() {
    var p = estado.producto;
    var a = disp(p);
    if (!a.canBuy) { avisar(); return; }
    var linea = A.bag.add({ productId: p.id, colorId: estado.colorId, selections: estado.selections, care: estado.care, qty: 1 });
    if (!linea) {
      toast({ kind: 'error', title: 'No hemos podido añadirlo a la bolsa', text: 'Vuelve a intentarlo. Tu configuración se conserva en la dirección de esta página.' });
      return;
    }
    /* Vista, aviso y vibración en el mismo instante (causalidad y armonía). */
    haptica('exito');
    var reserva = a.status === 'reserva';
    toast({
      kind: 'ok',
      title: reserva ? 'Reserva añadida a tu bolsa' : 'Añadido a la bolsa',
      text: linea.name + ' · ' + describir(linea) + (linea.qty > 1 ? ' (× ' + linea.qty + ')' : '') +
        (reserva && a.release ? '. Te lo entregamos a partir del ' + diaLargo(a.release) + '.' : ''),
      action: { label: 'Ver bolsa', onClick: function () { window.location.href = 'bolsa.html'; } }
    });
    anadidoEnSesion = true;
    pintarAnadido();
    avisarSiNoSeGuarda(null, 'La bolsa');
  }

  function avisar() {
    var p = estado.producto;
    var a = disp(p);
    if (a.status !== 'proximamente') { anadir(); return; }
    var cuando = diaLargo(a.preorder);
    var texto = 'Las reservas del ' + p.name + ' abren el ' + cuando + '. Te lo recordaremos en esta página.';
    if (avisoDe(p.id)) {
      toast({ kind: 'status', title: 'Ya tienes el aviso activado', text: texto });
      return;
    }
    var guardado = fijarAviso(p.id, { creado: new Date().toISOString(), preorder: a.preorder });
    pintarAccion();
    haptica('exito');
    toast({
      kind: 'ok',
      title: 'Te avisaremos',
      text: texto,
      action: { label: 'Deshacer', onClick: function () { quitarAviso(p.id, { silencio: true }); } }
    });
    avisarSiNoSeGuarda(guardado, 'El aviso');
  }

  function quitarAviso(id, opciones) {
    opciones = opciones || {};
    var quitado = avisoDe(id);
    if (!quitado) { return; }
    var foco = document.activeElement;
    var dentro = foco && el.avisado && el.avisado.contains(foco);
    fijarAviso(id, null);
    pintarAccion();
    if (dentro) { el.principal.focus(); }
    if (opciones.silencio) { return; }
    var p = cat.product(id);
    toast({
      kind: 'warn',
      title: 'Aviso cancelado',
      text: 'Ya no te recordaremos la apertura de las reservas' + (p ? ' del ' + p.name : '') + '.',
      action: {
        label: 'Deshacer',
        onClick: function () { fijarAviso(id, quitado); pintarAccion(); }
      }
    });
  }

  /* Si había un aviso y ya han abierto las reservas (o ya está a la venta),
     esta es la «notificación» simulada: se dice una vez y se borra. */
  function avisoCumplido() {
    var p = estado.producto;
    var a = disp(p);
    if (a.status === 'proximamente' || !avisoDe(p.id)) { return; }
    fijarAviso(p.id, null);
    toast({
      kind: 'ok',
      title: a.status === 'reserva' ? 'Ya puedes reservar el ' + p.name : 'El ' + p.name + ' ya está a la venta',
      text: a.status === 'reserva' && a.release
        ? 'Nos pediste que te avisáramos: las reservas están abiertas y las entregas empiezan el ' + diaLargo(a.release) + '.'
        : 'Nos pediste que te avisáramos. Configúralo y añádelo a la bolsa cuando quieras.'
    });
  }

  function quitarCredito() {
    var guardado = A.tradeIn ? A.tradeIn.get() : null;
    if (!guardado) { return; }
    A.tradeIn.clear();          // emite aura:tradein → se repinta el paso y el resumen
    var enlace = q('a', el.trade);
    if (enlace) { enlace.focus(); }
    toast({
      kind: 'warn',
      title: 'Crédito quitado',
      text: 'Los ' + fmt.eur0(guardado.value) + ' de AURA Trade In ya no se descontarán.',
      action: {
        label: 'Deshacer',
        onClick: function () {
          A.tradeIn.set(guardado);
          var boton = q('[data-c-quitar-credito]', el.trade);
          if (boton) { boton.focus(); }
        }
      }
    });
  }

  function enlazar() {
    el.form.addEventListener('submit', function (e) { e.preventDefault(); });
    el.form.addEventListener('change', alCambiar);
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target : null;
      if (!t) { return; }
      if (t.closest('[data-c-accion]')) { accion(); return; }
      if (t.closest('[data-c-quitar-credito]')) { quitarCredito(); return; }
      if (t.closest('[data-c-cancelar-aviso]')) { quitarAviso(estado.producto.id); }
    });
    document.addEventListener('aura:tradein', function () {
      var foco = document.activeElement;
      var dentro = foco && el.trade.contains(foco);
      pintarTradeIn();
      if (dentro) { var destino = q('a, button', el.trade); if (destino) { destino.focus(); } }
      actualizar({ silencio: true });
    });
    document.addEventListener('aura:bag', pintarAnadido);
    /* Otra pestaña activa o cancela el aviso: esta se pone al día. */
    window.addEventListener('storage', function (e) {
      if (!e || e.key === CLAVE_AVISOS || e.key === null) { pintarAccion(); }
    });
  }


  /* ------------------------------------------------------------------------
     Arranque
     ------------------------------------------------------------------------ */

  function arrancar() {
    var params;
    try { params = new URLSearchParams(window.location.search); } catch (e) { params = { get: function () { return null; } }; }
    /* Los id del catálogo van en minúsculas: «?producto=AURAPHONE-DUO » también vale. */
    var param = function (k) {
      var v = params.get(k);
      return v == null ? '' : String(v).trim().toLowerCase();
    };

    /* ?hoy= se conserva solo si el núcleo lo ha aceptado (es el día que usa). */
    var h = params.get('hoy');
    if (h && /^\d{4}-\d{2}-\d{2}$/.test(h) && fecha(h) && A.util && A.util.isoDate && A.util.isoDate(hoy()) === h) { hoyParam = h; }

    var pedido = params.get('producto') ? String(params.get('producto')).trim() : '';
    var producto = pedido ? cat.product(param('producto')) : null;
    var tipoAlerta = null;
    if (!producto) {
      var fam = param('familia');
      if (!cat.family(fam)) { fam = (cat.families()[0] || {}).id; }
      producto = primeroDe(fam) || primeroDe() || null;
      tipoAlerta = pedido ? 'invalido' : 'falta';
    }
    if (!producto) {
      /* Catálogo vacío (data.js sin productos): nada que configurar. */
      el.titulo.textContent = 'Comprar';
      el.desde.hidden = true;
      el.estado.hidden = true;
      pintarAlerta('vacio', pedido || '');
      /* Sin modelos tampoco hay precios: fuera configurador, barra y notas
         (sus «volver» apuntarían a llamadas que no existen). */
      qa('.comprar-layout, .comprar-head__links, .comprar-buybar, .aura-footnotes').forEach(function (n) { n.hidden = true; });
      document.body.classList.remove('has-buybar');
      return;
    }

    estado.producto = producto;
    var color = param('color');
    estado.colorId = tieneColor(producto, color) ? color : cat.defaults(producto).colorId;
    var pedidas = {};
    list(producto.options).forEach(function (g) {
      var v = param(g.id);
      if (v) { pedidas[g.id] = v; }
    });
    estado.selections = cat.resolve(producto, pedidas);
    estado.care = param('auracare') === 'si';

    el.meses.forEach(function (n) { n.textContent = String(meses()); });

    if (tipoAlerta) {
      conAlerta = true;
      pintarAlerta(tipoAlerta, pedido);
      pintarFamilias();
    }
    pintarProducto({ primera: true, modelos: true });
    enlazar();
  }

  arrancar();
})();
