/* =============================================================================
   AURA — Captura de los componentes (variantes y estados) para el plugin de Figma
   -----------------------------------------------------------------------------
   Pinta cada variante con las clases reales de css/aura.css (los estados de
   :hover, :focus-visible y :active se fuerzan con una copia de sus reglas) y la
   captura con captura-guia.js (que se carga antes). Con «?pagina» captura las
   piezas grandes de una página real (barra global, cinta, barra local y pie).

   Uso (solo si cambian los componentes):
     1. Abre guia-de-estilo.html a 1440 px y pega captura-guia.js y después este
        archivo en la consola: se descarga «componentes-captura.json».
     2. Para las barras y el pie: abre auraphone.html a 1440 y a 390 px, pega
        los dos archivos y ejecuta  await prepararCapturaAURA(); capturarPiezasAURA()  (descarga
        «piezas-<página>-<ancho>.json»).
     3. Deja los JSON en guia-de-estilo/figma/capturas/ y ejecuta node build.mjs.
   ============================================================================= */
(function () {
  'use strict';
  if (!window.capturarElementoAURA) throw new Error('Carga antes captura-guia.js');

  // --- 1. Estados forzados: copia de las reglas con :hover, :focus-visible y :active ---
  function forzarEstados() {
    if (document.getElementById('aura-lab-estados')) return;
    var css = [];
    function convertir(sel) {
      return sel.replace(/:hover/g, '.lab-hover').replace(/:focus-visible/g, '.lab-focus').replace(/:focus-within/g, '.lab-focus-within')
        .replace(/:active/g, '.lab-active').replace(/:focus(?![-\w])/g, '.lab-focus');
    }
    function rec(reglas, envoltura) {
      Array.prototype.forEach.call(reglas, function (r) {
        if (r.type === 1 && /:hover|:focus|:active/.test(r.selectorText)) {
          var t = convertir(r.selectorText) + '{' + r.style.cssText + '}';
          css.push(envoltura ? envoltura.replace('§', t) : t);
        } else if (r.cssRules && r.type === 4) {
          rec(r.cssRules, '@media ' + r.media.mediaText + '{§}');
        } else if (r.cssRules && r.type === 12) {
          rec(r.cssRules, '@supports ' + r.conditionText + '{§}');
        }
      });
    }
    Array.prototype.forEach.call(document.styleSheets, function (h) {
      try { rec(h.cssRules, null); } catch (e) { /* hojas de otro origen (Bootstrap): no hacen falta */ }
    });
    var st = document.createElement('style');
    st.id = 'aura-lab-estados';
    st.textContent = css.join('\n') + '\n*,*::before,*::after{transition:none!important;animation:none!important}';
    document.head.appendChild(st);
  }

  // --- 2. Variantes ---
  var BOTONES = [
    ['Primario', 'aura-btn--primary', 'Comprar'],
    ['Secundario', 'aura-btn--secondary', 'Más información'],
    ['Inverso', 'aura-btn--inverse', 'Explorar AURA'],
    ['Terciario', 'aura-btn--ghost', 'Ver la bolsa'],
    ['Destructivo', 'aura-btn--destructive', 'Borrar datos'],
  ];
  var ESTADOS_BOTON = [
    ['Normal', '', ''], ['Hover', 'is-hover', ''], ['Pulsado', 'is-pressed', ''], ['Foco', 'lab-focus', ''],
    ['Desactivado', '', ' disabled'], ['Carga', 'is-loading', ' aria-busy="true"'],
  ];
  function icono(n, extra) { return '<span class="bi bi-' + n + (extra ? ' ' + extra : '') + '" aria-hidden="true"></span>'; }

  function variantes() {
    var v = [];
    BOTONES.forEach(function (b) {
      ESTADOS_BOTON.forEach(function (e) {
        var dentro = e[0] === 'Carga'
          ? '<span class="aura-spinner" aria-hidden="true"></span>' + b[2] + icono('arrow-up-right')
          : icono('plus') + b[2] + icono('arrow-up-right');
        v.push({ comp: 'Botón', v: { Tipo: b[0], Estado: e[0] }, html: '<button class="aura-btn ' + b[1] + ' ' + e[1] + '" type="button"' + e[2] + '>' + dentro + '</button>' });
      });
    });
    [['Normal', ''], ['Hover', 'lab-hover'], ['Pulsado', 'is-pressed'], ['Foco', 'lab-focus']].forEach(function (e) {
      v.push({ comp: 'Botón', v: { Tipo: 'Enlace', Estado: e[0] }, html: '<a class="aura-link aura-link--control ' + e[1] + '" href="#">Comprar</a>' });
    });

    [['Transparente', ''], ['Sólido', 'aura-icon-btn--solid']].forEach(function (s) {
      [['Normal', '', ''], ['Hover', 'lab-hover', ''], ['Pulsado', 'is-pressed', ''], ['Foco', 'lab-focus', ''], ['Desactivado', '', ' disabled']].forEach(function (e) {
        v.push({ comp: 'Botón de icono', v: { Estilo: s[0], Estado: e[0] }, html: '<button class="aura-icon-btn ' + s[1] + ' ' + e[1] + '" type="button"' + e[2] + '>' + icono('chevron-right') + '</button>' });
      });
    });

    [['Dorado', ''], ['Azul', 'aura-badge--blue'], ['Completado', 'aura-badge--ok'], ['Aviso', 'aura-badge--warn'], ['Error', 'aura-badge--error'], ['Neutro', 'aura-badge--neutral']].forEach(function (t) {
      [['Píldora', '', 'Nuevo'], ['Mono', 'aura-badge--mono', 'Entregado']].forEach(function (s) {
        v.push({ comp: 'Insignia', v: { Tipo: t[0], Estilo: s[0] }, html: '<span class="aura-badge ' + t[1] + ' ' + s[1] + '">' + s[2] + '</span>' });
      });
    });

    v.push({ comp: 'Chip', v: { Tipo: 'Etiqueta', Estado: 'Normal' }, html: '<span class="aura-chip">' + icono('truck') + ' Envío gratis</span>' });
    [['Normal', ''], ['Hover', 'lab-hover'], ['Activo', 'is-active'], ['Foco', 'lab-focus']].forEach(function (e) {
      v.push({ comp: 'Chip', v: { Tipo: 'Pulsable', Estado: e[0] }, html: '<button class="aura-chip ' + e[1] + '" type="button">' + icono('truck') + ' Envío gratis</button>' });
    });

    var CAMPOS = {
      Texto: function (cls, val, extra, inp) {
        return '<div class="aura-field ' + cls + '"><label class="aura-field__label">Correo electrónico <span class="aura-field__hint">Opcional</span></label>' +
          '<div class="aura-field__control"><span class="aura-field__icon bi bi-envelope" aria-hidden="true"></span><input class="aura-input ' + inp + '" type="email" placeholder="tu@correo.com" value="' + val + '"' + extra + '></div>' +
          '<p class="aura-field__help">Te enviaremos aquí la confirmación del pedido.</p><p class="aura-field__error">Falta el dominio. Escribe una dirección como nombre@correo.com.</p></div>';
      },
      'Contraseña': function (cls, val, extra, inp) {
        return '<div class="aura-field aura-field--toggle ' + cls + '"><label class="aura-field__label">Contraseña <span class="aura-field__hint">8 caracteres como mínimo</span></label>' +
          '<div class="aura-field__control"><span class="aura-field__icon bi bi-lock" aria-hidden="true"></span><input class="aura-input ' + inp + '" type="password" placeholder="Tu contraseña" value="' + (val ? 'AuraCosmos' : '') + '"' + extra + '>' +
          '<button class="aura-field__toggle" type="button" aria-pressed="false"' + extra + '>' + icono('eye') + '</button></div>' +
          '<p class="aura-field__help">Con una mayúscula y un número.</p><p class="aura-field__error">La contraseña no cumple los requisitos.</p></div>';
      },
      Selector: function (cls, val, extra, inp) {
        return '<div class="aura-field ' + cls + '"><label class="aura-field__label">Dispositivo que entregas <span class="aura-field__hint">Opcional</span></label>' +
          '<div class="aura-field__control"><span class="aura-field__icon bi bi-phone" aria-hidden="true"></span><select class="aura-select ' + inp + '"' + extra + '><option>auraPhone 16 Pro</option></select></div>' +
          '<p class="aura-field__help">Lo valoramos al recibirlo.</p><p class="aura-field__error">Elige un dispositivo para continuar.</p></div>';
      },
      'Área de texto': function (cls, val, extra, inp) {
        return '<div class="aura-field ' + cls + '"><label class="aura-field__label">¿En qué podemos ayudarte? <span class="aura-field__hint">Opcional</span></label>' +
          '<div class="aura-field__control"><textarea class="aura-textarea ' + inp + '" rows="3" placeholder="Cuéntanos qué ocurre"' + extra + '>' + (val ? 'Mi auraPhone no carga.' : '') + '</textarea></div>' +
          '<p class="aura-field__help">Te respondemos en menos de 24 horas.</p><p class="aura-field__error">Cuéntanos qué ocurre para poder ayudarte.</p></div>';
      },
    };
    var ESTADOS_CAMPO = [
      ['Normal', '', '', '', ''], ['Hover', '', '', '', 'lab-hover'], ['Foco', 'is-focused', 'tu@correo.com', '', ''],
      ['Error', 'is-invalid', 'lucia@correo', ' aria-invalid="true"', ''], ['Válido', 'is-valid', 'lucia@correo.com', '', ''],
      ['Desactivado', '', 'tu@correo.com', ' disabled', ''],
    ];
    Object.keys(CAMPOS).forEach(function (tipo) {
      ESTADOS_CAMPO.forEach(function (e) {
        v.push({ comp: 'Campo de texto', v: { Tipo: tipo, Estado: e[0] }, ancho: 360, html: CAMPOS[tipo](e[1], e[2], e[3], e[4]) });
      });
    });

    [['Casilla', 'check', 'checkbox', 'Mantener la sesión iniciada'], ['Radio', 'radio', 'radio', 'Envío estándar gratuito']].forEach(function (t) {
      [['Normal', '', '', ''], ['Marcada', '', ' checked', ''], ['Hover', 'lab-hover', '', ''], ['Foco', '', ' checked', 'lab-focus'], ['Error', 'is-invalid', '', ''], ['Desactivada', '', ' disabled', '']].forEach(function (e) {
        v.push({ comp: 'Casilla', v: { Tipo: t[0], Estado: e[0] }, html: '<label class="aura-' + t[1] + ' ' + e[1] + '"><input class="aura-' + t[1] + '__input ' + e[3] + '" type="' + t[2] + '"' + e[2] + '><span class="aura-' + t[1] + '__box" aria-hidden="true"></span><span class="aura-' + t[1] + '__label">' + t[3] + '</span></label>' });
      });
    });

    [['Normal', '', ''], ['Elegida', ' checked', ''], ['Foco', ' checked', 'lab-focus']].forEach(function (e) {
      v.push({ comp: 'Muestra de color', v: { 'Tamaño': 'Grande', Estado: e[0] }, html: '<div class="aura-swatches"><label class="aura-swatch"><input class="aura-swatch__input ' + e[2] + '" type="radio"' + e[1] + '><span class="aura-swatch__dot" style="--swatch:#1d1d1f"></span></label></div>', sel: '.aura-swatch' });
    });
    v.push({ comp: 'Muestra de color', v: { 'Tamaño': 'Punto', Estado: 'Normal' }, html: '<ul class="aura-swatch-list"><li class="aura-swatch-list__dot" style="--swatch:#1d1d1f"></li></ul>', sel: '.aura-swatch-list__dot' });

    [['Normal', '', ''], ['Hover', '', 'lab-hover'], ['Elegida', ' checked', ''], ['Foco', ' checked', 'lab-focus']].forEach(function (e) {
      var foco = e[0] === 'Foco' ? ' class="lab-focus"' : '';
      v.push({ comp: 'Opción de segmentado', v: { Estado: e[0] }, html: '<fieldset class="aura-segmented"><label class="aura-segmented__item ' + (e[0] === 'Hover' ? 'lab-hover' : '') + '"><input type="radio"' + e[1] + foco + '><span>auraPhone</span></label></fieldset>', sel: '.aura-segmented__item' });
    });
    v.push({ comp: 'Segmentado', v: null, html: '<fieldset class="aura-segmented">' + ['auraPhone', 'auraPad', 'auraBook', 'auraPods'].map(function (n, i) {
      return '<label class="aura-segmented__item"><input type="radio" name="lab-seg"' + (i === 0 ? ' checked' : '') + '><span>' + n + '</span></label>';
    }).join('') + '</fieldset>' });

    [['Dorado', '', 'lightbulb'], ['Azul', 'aura-note--blue', 'info-circle']].forEach(function (t) {
      v.push({ comp: 'Nota', v: { Tipo: t[0] }, ancho: 480, html: '<div class="aura-note ' + t[1] + '"><span class="aura-note__icon">' + icono(t[2]) + '</span><p class="aura-note__title">Nota de uso</p><p class="aura-note__text">Un texto breve que explica cuándo y cómo se usa la pieza.</p></div>' });
    });

    var AVISOS = [
      ['Estado', 'status', 'info-circle-fill', 'Sesión iniciada', 'Hola de nuevo, Lucía.', ''],
      ['Completado', 'ok', 'check-circle-fill', 'Añadido a la bolsa', 'auraPods Pro 3 · Blanco', 'Ver bolsa'],
      ['Aviso', 'warn', 'exclamation-triangle-fill', 'Artículo eliminado', 'auraPad Air 13″ ya no está en tu bolsa.', 'Deshacer'],
      ['Error', 'error', 'x-octagon-fill', 'No se ha podido guardar', 'Revisa la conexión e inténtalo de nuevo.', 'Reintentar'],
    ];
    AVISOS.forEach(function (a) {
      v.push({ comp: 'Aviso', v: { Tipo: a[0] }, ancho: 400, html: '<div class="aura-toasts aura-toasts--static"><div class="aura-toast aura-toast--' + a[1] + ' is-visible"><span class="aura-toast__icon bi bi-' + a[2] + '" aria-hidden="true"></span><div class="aura-toast__body"><p class="aura-toast__title">' + a[3] + '</p><p class="aura-toast__text">' + a[4] + '</p></div>' + (a[5] ? '<span class="aura-toast__action">' + a[5] + '</span>' : '') + '<span class="aura-toast__close">' + icono('x') + '</span></div></div>', sel: '.aura-toast' });
    });

    [['Información', '', 'info-circle-fill', 'Pedido de demostración', 'Los pagos son simulados y nunca se guardan datos de tarjeta.'],
     ['Completado', 'aura-alert--ok', 'check-circle-fill', 'Datos guardados', 'Tu dirección de envío se ha actualizado.'],
     ['Aviso', 'aura-alert--warn', 'exclamation-triangle-fill', 'Entrega en 2–3 semanas', 'Este acabado tiene más demanda de la prevista.'],
     ['Error', 'aura-alert--error', 'exclamation-octagon-fill', 'No hemos podido iniciar sesión', 'El ID de AURA o la contraseña no coinciden.']].forEach(function (a) {
      v.push({ comp: 'Alerta', v: { Tipo: a[0] }, ancho: 480, html: '<div class="aura-alert ' + a[1] + '">' + icono(a[2]) + '<p class="aura-alert__title">' + a[3] + '</p><p class="aura-alert__text">' + a[4] + '</p></div>' });
    });

    v.push({ comp: 'Nota al pie', v: null, ancho: 640, html: '<div class="aura-footnotes"><ol class="aura-footnotes__list"><li>La autonomía depende del uso, la configuración y otros factores; los resultados reales pueden variar. <a class="aura-footnotes__back" href="#">' + icono('arrow-return-left') + '<span class="visually-hidden">Volver al texto</span></a></li></ol></div>', sel: '.aura-footnotes__list > li' });
    return v;
  }

  // --- 3. Pintar y capturar ---
  function capturarComponentes() {
    forzarEstados();
    var html = document.documentElement;
    var antes = html.style.overflow, antesGutter = html.style.scrollbarGutter;
    html.style.overflow = 'hidden';
    html.style.scrollbarGutter = 'auto';
    window.scrollTo(0, 0);
    var restaurar = window.preferenciasNeutrasAURA();
    var lab = document.createElement('div');
    lab.id = 'aura-lab';
    lab.setAttribute('style', 'position:absolute;left:0;top:0;width:1440px;padding:40px;background:#000;z-index:2147483000;display:grid;gap:24px;justify-items:start');
    document.body.appendChild(lab);
    var res = [];
    try {
      variantes().forEach(function (it) {
        var caja = document.createElement('div');
        caja.setAttribute('style', 'background:#000;' + (it.ancho ? 'width:' + it.ancho + 'px;' : ''));
        caja.innerHTML = it.html;
        lab.appendChild(caja);
        var el = it.sel ? caja.querySelector(it.sel) : caja.firstElementChild;
        // La escala de «Pulsado» se guarda aparte y se captura sin ella (el plugin la vuelve a aplicar)
        var tr = getComputedStyle(el).transform;
        if (tr && tr !== 'none') el.style.setProperty('transform', 'none', 'important');
        var nodo = window.capturarElementoAURA(el);
        if (tr && tr !== 'none') { nodo.s = nodo.s || {}; nodo.s.tr = tr; }
        res.push({ comp: it.comp, v: it.v, nodo: nodo });
        lab.removeChild(caja);
      });
    } finally {
      lab.remove();
      html.style.overflow = antes; html.style.scrollbarGutter = antesGutter;
      restaurar();
    }
    return { version: 1, fecha: new Date().toISOString(), url: location.href, ancho: window.innerWidth, variantes: res };
  }

  // --- 4. Piezas de una página real (barra global, cinta, barra local, pie) ---
  function capturarPiezas() {
    forzarEstados();
    document.querySelectorAll('[data-aura-reveal]').forEach(function (el) { el.classList.add('is-visible'); });
    var html = document.documentElement;
    var antes = html.style.overflow, antesGutter = html.style.scrollbarGutter;
    html.style.overflow = 'hidden';
    html.style.scrollbarGutter = 'auto';
    window.scrollTo(0, 0);
    var restaurar = window.preferenciasNeutrasAURA();
    var piezas = [];
    try {
      [['Barra global', '.aura-nav'], ['Cinta', '.aura-ribbon'], ['Barra local', '.aura-localnav'], ['Pie', '.aura-footer']].forEach(function (p) {
        var el = document.querySelector(p[1]);
        if (el) piezas.push({ comp: p[0], v: { 'Tamaño': window.innerWidth >= 768 ? 'Escritorio' : 'Teléfono' }, nodo: window.capturarElementoAURA(el) });
      });
    } finally { html.style.overflow = antes; html.style.scrollbarGutter = antesGutter; restaurar(); }
    return { version: 1, fecha: new Date().toISOString(), url: location.href, ancho: window.innerWidth, variantes: piezas };
  }

  function descargar(datos, nombre) {
    var blob = new Blob([JSON.stringify(datos)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
  }

  window.capturarComponentesAURA = capturarComponentes;
  window.capturarPiezasAURA = function (sinDescarga) {
    var d = capturarPiezas();
    if (!sinDescarga) descargar(d, 'piezas-' + location.pathname.split('/').pop().replace('.html', '') + '-' + window.innerWidth + '.json');
    return d;
  };
  if (!window.__auraCapturaSinDescarga) window.prepararCapturaAURA().then(function () { descargar(capturarComponentes(), 'componentes-captura.json'); });
})();
