/* ==========================================================================
   AURA — soporte.html (script clásico, después de aura-ui.js)

   1. Datos del catálogo en los textos: modelos de cada familia, reserva del
      auraPhone Duo según su disponibilidad del día, cuotas de financiación,
      envío exprés, precios de AuraCare+, Trade In («hasta X €» y tope) y la
      lista de productos del formulario. Nada de esto se escribe a mano en el
      HTML: al cambiar data.js, la página se actualiza sola. Las fechas de la
      reserva van en <time datetime>.
   2. Buscador local: filtra temas y preguntas en cada pulsación (sin espera
      artificial), con estado vacío que invita a escribir a soporte. Un enlace
      a algo que el filtro o un acordeón cerrado esconden lo muestra antes.
   3. Formulario de contacto simulado: validación en línea con AURA.ui.form,
      tema y puesto que llegan en la URL (?tema=empleo&puesto=AU-0412, desde
      acerca.html) y confirmación en el propio formulario con un número de
      caso ficticio (con AURA.ui.haptic('exito') en táctil).
   ========================================================================== */
(function (window, document) {
  'use strict';

  var AURA = window.AURA;
  if (!AURA || !AURA.catalog || !AURA.ui) { return; }

  function $(selector, root) { return (root || document).querySelector(selector); }
  function $$(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }

  /* Texto comparable: minúsculas, sin acentos ni signos («¿Devolución?» → «devolucion»). */
  function norm(text) {
    var s = String(text == null ? '' : text).toLowerCase();
    if (s.normalize) { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); }
    return s.replace(/[^a-z0-9+]+/g, ' ').trim();
  }

  /* ['a', 'b', 'c'] → «a, b y c» */
  function enumerar(items) {
    if (items.length < 2) { return items.join(''); }
    return items.slice(0, -1).join(', ') + ' y ' + items[items.length - 1];
  }

  function parametro(nombre) {
    try { return new URLSearchParams(window.location.search).get(nombre) || ''; } catch (e) { return ''; }
  }


  /* ------------------------------------------------------------------------
     1. Datos del catálogo
     ------------------------------------------------------------------------ */

  /* «16 de octubre» dentro de <time datetime="2026-10-16"> (temario DIW,
     semántica): se lee igual y la fecha queda también en formato máquina.
     iso es el día 'AAAA-MM-DD' de AURA.catalog.availability ('' si no hay). */
  function fechaHTML(iso) {
    var texto = AURA.fmt.diaMes(iso);
    return texto ? '<time datetime="' + AURA.html.esc(iso) + '">' + AURA.html.esc(texto) + '</time>' : '';
  }

  /* Pregunta de la reserva: el texto depende del día (próximamente / reserva).
     Disponible ya, la pregunta y su sugerencia desaparecen (pintarCatalogo).
     Todo lo que no es una fecha va escapado. */
  function pintarReserva(p, a) {
    var texto = $('[data-soporte-duo-estado]');
    var cta = $('[data-soporte-duo-cta]');
    if (!p || !a || a.status === 'disponible') { return; }
    var nombre = AURA.html.esc(p.name);
    var abre = fechaHTML(a.preorder);
    var llega = fechaHTML(a.release);
    var pago = 'pagas al reservar y te lo enviamos para que llegue el día de su salida.';
    if (texto) {
      if (a.status === 'proximamente') {
        texto.innerHTML = (abre ? 'Las reservas del ' + nombre + ' se abren el ' + abre : 'Las reservas del ' + nombre + ' se abrirán muy pronto') +
          (llega ? ' y las entregas empiezan el ' + llega + '. ' : '. ') +
          'Mientras tanto, puedes configurarlo y ver su precio. Cuando se abran, pulsa «Reservar»: ' + pago;
      } else {
        texto.innerHTML = 'Las reservas del ' + nombre + ' ya están abiertas' +
          (llega ? ' y las entregas empiezan el ' + llega + '. ' : '. ') +
          'Configúralo como cualquier otro auraPhone y pulsa «Reservar»: ' + pago;
      }
    }
    if (cta) {
      cta.textContent = AURA.catalog.cta(p) + ' el ' + p.name;
      cta.setAttribute('href', AURA.catalog.url(p));
    }
  }

  function pintarCatalogo() {
    /* Modelos actuales de cada familia (un nombre nunca se parte en dos líneas) */
    $$('[data-soporte-modelos]').forEach(function (el) {
      var lista = AURA.catalog.products(el.getAttribute('data-soporte-modelos'));
      el.innerHTML = lista.map(function (p) {
        return '<span class="soporte-modelo">' + AURA.html.esc(p.name) + '</span>';
      }).join('&nbsp;· ');   // el separador nunca empieza una línea
      el.hidden = !lista.length;
    });

    /* Lo que solo tiene sentido mientras un producto no está disponible (la
       pregunta de la reserva y su sugerencia): fuera en cuanto lo está. */
    $$('[data-soporte-requiere]').forEach(function (el) {
      var p = AURA.catalog.product(el.getAttribute('data-soporte-requiere'));
      var a = p ? AURA.catalog.availability(p) : null;
      if (!a || a.status === 'disponible') {
        el.hidden = true;
        el.setAttribute('data-soporte-fuera', '');
      } else if (el.tagName === 'DETAILS') {
        pintarReserva(p, a);
      }
    });

    /* Meses de financiación */
    var meses = AURA.data && AURA.data.financing ? Number(AURA.data.financing.months) : 0;
    $$('[data-soporte-meses]').forEach(function (el) { if (meses > 0) { el.textContent = String(meses); } });

    /* Envío exprés */
    var envio = AURA.data && AURA.data.shipping;
    var expres = envio && typeof envio.express === 'number' ? envio.express : null;
    $$('[data-soporte-expres]').forEach(function (el) {
      el.textContent = expres === null ? '' : ' (' + (expres > 0 ? AURA.fmt.eur(expres) : 'gratis') + ')';
    });
    /* La llamada «IVA incluido» solo acompaña a un precio que se ve */
    $$('[data-soporte-expres-ref]').forEach(function (el) { el.hidden = !(expres > 0); });

    /* AuraCare+: descripción y precio por familia */
    var care = AURA.data && AURA.data.care;
    var descripcion = $('[data-soporte-care-descripcion]');
    if (descripcion && care && care.description) { descripcion.textContent = care.description; }
    var precios = $('[data-soporte-care-precios]');
    if (precios) {
      var partes = AURA.catalog.families().map(function (f) {
        var precio = AURA.catalog.carePrice(f.id);
        return precio ? AURA.fmt.eur0(precio) + ' en ' + f.name : '';
      }).filter(Boolean);
      if (partes.length) { precios.textContent = 'Cuesta ' + enumerar(partes) + ', por dispositivo.'; }
    }

    /* AURA Trade In: el mejor valor posible y el tope por dispositivo */
    var maximo = AURA.tradeIn && AURA.tradeIn.max ? AURA.tradeIn.max() : 0;
    $$('[data-soporte-tradein-max]').forEach(function (el) { if (maximo > 0) { el.textContent = AURA.fmt.eur0(maximo); } });
    var tope = AURA.tradeIn ? Number(AURA.tradeIn.cap) : 0;
    $$('[data-soporte-tradein-tope]').forEach(function (el) {
      el.textContent = tope > 0 && isFinite(tope) ? ', con un máximo de ' + AURA.fmt.eur0(tope) + ' por dispositivo' : '';
    });

    /* Productos del formulario, agrupados por familia */
    var select = $('[data-soporte-productos]');
    if (select) {
      AURA.catalog.families().forEach(function (f) {
        var grupo = document.createElement('optgroup');
        grupo.label = f.name;
        AURA.catalog.products(f.id).forEach(function (p) {
          var opcion = document.createElement('option');
          opcion.value = p.id;
          opcion.textContent = p.name;
          grupo.appendChild(opcion);
        });
        if (grupo.children.length) { select.appendChild(grupo); }
      });
      var otro = document.createElement('option');
      otro.value = 'otro';
      otro.textContent = 'Otro dispositivo AURA';
      select.appendChild(otro);
    }
  }


  /* ------------------------------------------------------------------------
     2. Buscador local
     ------------------------------------------------------------------------ */

  var VACIAS = ['de', 'del', 'la', 'el', 'los', 'las', 'lo', 'le', 'un', 'una', 'unos', 'unas', 'y', 'o', 'a', 'al', 'en',
    'mi', 'mis', 'tu', 'tus', 'con', 'por', 'para', 'que', 'como', 'cual', 'cuando', 'donde', 'es', 'se', 'me', 'puedo',
    'quiero', 'hay', 'sobre', 'mas', 'muy', 'no', 'si'];

  /* Palabras de la consulta: sin vacías y sin plural, para buscar por prefijo
     («devoluciones» → «devolucion», «pagos» → «pago»). */
  function palabras(consulta) {
    var q = norm(consulta);
    if (!q) { return []; }
    return q.split(' ').filter(function (w) { return w && VACIAS.indexOf(w) === -1; }).map(function (w) {
      if (w.length > 4 && /es$/.test(w)) { return w.slice(0, -2); }
      if (w.length > 3 && /s$/.test(w)) { return w.slice(0, -1); }
      return w;
    });
  }

  /* Devuelve la función que deja ver un destino (o null si no hay buscador). */
  function iniciarBuscador() {
    var form = $('#soporte-buscador');
    var input = $('#soporte-q');
    if (!form || !input) { return null; }
    var estado = $('#soporte-q-estado');
    var estadoInicial = estado ? estado.textContent : '';
    var vacio = $('#sin-resultados');
    var temas = $('#temas');
    var preguntas = $('#preguntas');
    var limpiar = $$('[data-soporte-limpiar]');
    var botonCampo = $('.aura-field__control [data-soporte-limpiar]', form);
    var sugerencias = $$('[data-soporte-sugerencia]').filter(function (b) { return !b.hasAttribute('data-soporte-fuera'); });
    var tactil = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

    /* Índice: se construye después de pintar los datos del catálogo. */
    var items = $$('[data-soporte-item]').filter(function (el) { return !el.hasAttribute('data-soporte-fuera'); }).map(function (el) {
      var titulo = el.querySelector('summary, h4');
      return {
        el: el,
        faq: el.tagName === 'DETAILS',
        titulo: norm(titulo ? titulo.textContent : ''),
        texto: norm(el.textContent + ' ' + (el.getAttribute('data-soporte-claves') || ''))
      };
    });

    function plural(n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); }

    function aplicar() {
      var crudo = input.value;
      var lista = palabras(crudo);
      var hay = lista.length > 0;
      var nTemas = 0;
      var nPreguntas = 0;

      items.forEach(function (it) {
        var coincide = !hay || lista.every(function (w) { return it.texto.indexOf(w) !== -1; });
        it.el.hidden = !coincide;
        if (coincide) { if (it.faq) { nPreguntas++; } else { nTemas++; } }
      });
      $$('[data-soporte-grupo]').forEach(function (g) {
        g.hidden = !g.querySelector('[data-soporte-item]:not([hidden])');
      });
      if (temas) { temas.hidden = hay && !nTemas; }
      if (preguntas) { preguntas.hidden = hay && !nPreguntas; }
      if (vacio) { vacio.hidden = !hay || nTemas + nPreguntas > 0; }

      var visible = crudo.trim();
      $$('[data-soporte-consulta]').forEach(function (el) { el.textContent = visible; });
      if (botonCampo) { botonCampo.hidden = !crudo; }

      var q = lista.join(' ');
      sugerencias.forEach(function (b) {
        b.setAttribute('aria-pressed', q && palabras(b.getAttribute('data-soporte-sugerencia')).join(' ') === q ? 'true' : 'false');
      });

      if (estado) {
        if (!hay) {
          estado.textContent = estadoInicial;
        } else if (!nTemas && !nPreguntas) {
          estado.textContent = 'Sin resultados para «' + visible + '».';
        } else {
          var partes = [];
          if (nTemas) { partes.push(plural(nTemas, 'tema', 'temas')); }
          if (nPreguntas) { partes.push(plural(nPreguntas, 'pregunta', 'preguntas')); }
          estado.textContent = enumerar(partes) + ' para «' + visible + '». Pulsa ' + (tactil ? 'Buscar' : 'Intro') + ' para ir al primer resultado.';
        }
      }
      return { temas: nTemas, preguntas: nPreguntas };
    }

    function fijar(valor) {
      input.value = valor;
      return aplicar();
    }

    /* Intro: lleva al mejor resultado (y abre la pregunta, si lo es). Gana el
       primero cuyo título contiene la búsqueda; si ninguno, el primero visible. */
    function irAlPrimero() {
      var lista = palabras(input.value);
      var visibles = items.filter(function (it) { return !it.el.hidden; });
      var primero = null;
      visibles.some(function (it) {
        if (lista.length && lista.every(function (w) { return it.titulo.indexOf(w) !== -1; })) { primero = it; return true; }
        return false;
      });
      primero = primero || visibles[0];
      if (!primero) { return; }
      if (primero.faq) {
        primero.el.open = true;
        primero.el.querySelector('summary').focus();
      } else if (primero.el.matches('a')) {
        primero.el.focus();
      } else {
        var enlace = primero.el.querySelector('a');
        if (enlace) { enlace.focus(); }
      }
    }

    input.addEventListener('input', aplicar);
    input.addEventListener('search', aplicar);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && input.value) {
        e.preventDefault();
        fijar('');
      }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      aplicar();
      irAlPrimero();
    });

    limpiar.forEach(function (b) {
      b.addEventListener('click', function () {
        fijar('');
        input.focus();
      });
    });

    sugerencias.forEach(function (b) {
      b.addEventListener('click', function () {
        var valor = b.getAttribute('data-soporte-sugerencia');
        fijar(b.getAttribute('aria-pressed') === 'true' ? '' : valor);
      });
    });

    /* Tarjetas de tema que llevan a las preguntas ya filtradas
       (la navegación al ancla #preguntas la hace el propio enlace). */
    $$('[data-soporte-consulta-tema]').forEach(function (a) {
      a.addEventListener('click', function () { fijar(a.getAttribute('data-soporte-consulta-tema')); });
    });

    /* soporte.html?q=… llega con la búsqueda hecha */
    var inicial = parametro('q');
    if (inicial) { input.value = inicial.slice(0, 120); }
    aplicar();

    /* Si el filtro esconde el destino de un enlace (los «Temas» de la barra
       local, una nota al pie de una pregunta filtrada), se quita antes de ir. */
    return function (destino) {
      if (destino && input.value && destino.closest('[hidden]') && !destino.closest('[data-soporte-fuera]')) { fijar(''); }
    };
  }

  /* Un enlace interno (barra local, notas al pie y su «volver») nunca lleva a
     algo escondido: quita el filtro si hace falta y abre la pregunta que lo
     contiene antes de que el navegador se desplace. */
  function iniciarAnclas(mostrar) {
    /* Devuelve true si ha tenido que abrir una pregunta cerrada. */
    function revelar(id) {
      var destino = id ? document.getElementById(id) : null;
      if (!destino) { return false; }
      if (mostrar) { mostrar(destino); }
      var detalle = destino.closest('details');
      if (detalle && !detalle.open && !detalle.hidden) { detalle.open = true; return true; }
      return false;
    }

    /* La base deja visible el contenido de una pregunta en el mismo fotograma
       en que se abre (aura.css, acordeón). Por si un navegador lo retrasara, se
       comprueba antes de navegar al ancla (desplazamiento, :target y punto de
       foco); normalmente no espera nada. */
    function visible(detalle) {
      try { return window.getComputedStyle(detalle, '::details-content').contentVisibility !== 'hidden'; } catch (e) { return true; }
    }
    function irA(id) {
      var destino = document.getElementById(id);
      var detalle = destino && destino.closest('details');
      var intentos = 0;
      (function esperar() {
        if (detalle && !visible(detalle) && intentos++ < 30) { window.requestAnimationFrame(esperar); return; }
        var actual = '';
        try { actual = decodeURIComponent(window.location.hash.slice(1)); } catch (e) { /* ancla inválida */ }
        if (actual !== id) { window.location.hash = id; } else if (destino) { destino.scrollIntoView({ block: 'start' }); }
      })();
    }

    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || e.defaultPrevented) { return; }
      var id = a.getAttribute('href').slice(1);
      try { id = decodeURIComponent(id); } catch (err) { /* id tal cual */ }
      if (revelar(id) && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) {
        e.preventDefault();
        irA(id);
      }
    }, true);
    if (window.location.hash) {
      try { revelar(decodeURIComponent(window.location.hash.slice(1))); } catch (e) { /* ancla inválida */ }
    }
  }


  /* ------------------------------------------------------------------------
     3. Formulario de contacto
     ------------------------------------------------------------------------ */

  function numeroDeCaso() {
    var n;
    try {
      var buf = new Uint32Array(1);
      window.crypto.getRandomValues(buf);
      n = buf[0] % 900000;
    } catch (e) {
      n = Math.floor(Math.random() * 900000);
    }
    return 'AU-SOP-' + String(100000 + n);
  }

  function iniciarFormulario() {
    var formEl = $('#soporte-form');
    if (!formEl) { return; }
    var mensaje = formEl.elements.mensaje;
    var contador = $('[data-soporte-contador]', formEl);
    var enviado = $('#soporte-enviado');

    function contar() {
      if (contador && mensaje) { contador.textContent = AURA.fmt.num(mensaje.value.length); }
    }

    /* Con sesión iniciada, nombre y correo ya están puestos (pedir solo lo necesario). */
    function rellenar() {
      var u = AURA.auth && AURA.auth.user();
      if (!u) { return; }
      if (!formEl.elements.nombre.value) { formEl.elements.nombre.value = ((u.nombre || '') + ' ' + (u.apellidos || '')).trim(); }
      if (!formEl.elements.email.value) { formEl.elements.email.value = u.email || ''; }
    }

    /* ?tema=empleo&puesto=AU-0412 (desde acerca.html): tema elegido y el puesto
       ya escrito en el mensaje. Un tema o un puesto que no existen se ignoran. */
    function desdeLaUrl() {
      var tema = parametro('tema');
      var puesto = parametro('puesto').toUpperCase();
      if (!/^AU-\d{4}$/.test(puesto)) { puesto = ''; }
      if (puesto) { tema = 'empleo'; }
      var select = formEl.elements.tema;
      if (select && tema) {
        var existe = Array.prototype.some.call(select.options, function (o) { return o.value === tema; });
        if (existe) { select.value = tema; }
      }
      if (puesto && mensaje && !mensaje.value) {
        mensaje.value = 'Quiero optar al puesto con referencia ' + puesto + '. ';
      }
    }

    if (mensaje) { mensaje.addEventListener('input', contar); }
    rellenar();
    desdeLaUrl();
    contar();
    document.addEventListener('aura:auth', rellenar);

    /* La confirmación se retira en cuanto se empieza otra consulta. */
    formEl.addEventListener('input', function () { if (enviado && !enviado.hidden) { enviado.hidden = true; } });

    var f = AURA.ui.form(formEl, {
      nombre: { required: 'Escribe tu nombre para saber cómo dirigirnos a ti.' },
      email: { required: 'Escribe tu correo para poder responderte.', email: true },
      tema: { required: 'Elige el tema que más se parezca a tu consulta.' },
      mensaje: {
        required: 'Cuéntanos en qué podemos ayudarte.',
        minLength: { value: 20, message: 'Danos un poco más de detalle: al menos 20 caracteres.' },
        maxLength: { value: 1000, message: 'Resume un poco: como máximo 1.000 caracteres.' }
      },
      privacidad: { required: 'Acepta la política de privacidad para que podamos responderte.' }
    }, {
      onSubmit: function (v, e, form) {
        var caso = numeroDeCaso();
        var email = String(v.email || '').trim();

        formEl.reset();
        form.clear();
        rellenar();
        contar();

        /* Completado: la confirmación aparece junto al botón y recibe el foco
           (el lector de pantalla la lee entera). */
        if (enviado) {
          $('[data-soporte-caso]', enviado).textContent = caso;
          $('[data-soporte-caso-email]', enviado).textContent = email;
          enviado.hidden = false;
          enviado.focus();
        } else {
          AURA.ui.toast({ kind: 'ok', title: 'Consulta enviada', text: 'Caso ' + caso + '. Te responderemos en ' + email + '.' });
        }
        /* Háptica de completado, en el mismo instante que la confirmación
           (solo en pantallas táctiles; el rechazo ya vibra en AURA.ui.form). */
        if (typeof AURA.ui.haptic === 'function') { AURA.ui.haptic('exito'); }
      }
    });

    /* Sin AURA.ui.form, el formulario nunca se envía de verdad (sitio estático). */
    if (!f) { formEl.addEventListener('submit', function (e) { e.preventDefault(); }); }
  }


  pintarCatalogo();
  iniciarAnclas(iniciarBuscador());
  iniciarFormulario();

})(window, document);
