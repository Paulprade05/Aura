/* ==========================================================================
   AURA — Interfaz (assets/js/aura-ui.js)

   Se carga al final del <body>, después de aura-core.js. Script clásico.
   Todo cuelga de window.AURA.ui.

   Contiene
     1. Utilidades y «reducir movimiento»
     2. Física: spring(), project(), rubberband()
     3. Gesto de arrastre (Pointer Events)
     4. Respuesta en la pulsación (.is-pressed) y efecto de borde de la barra
     5. Capas: bloqueo de scroll, foco atrapado, Esc
     6. Popover · buscador · menú móvil
     7. Hoja / cajón            [data-aura-sheet]  (+ la página retrocede)
     8. Carrusel                [data-aura-carousel]
     8 bis. Segmentado          .aura-segmented (pastilla que se desliza)
     8 ter. Galería             AURA.ui.gallery() (fundido cruzado)
     9. Aparición               [data-aura-reveal]
    10. Catálogo en pantalla    [data-aura-lineup] · [data-aura-compare]
    11. Avisos                  AURA.ui.toast() (se apartan con el dedo) · AURA.ui.haptic()
    12. Formularios             AURA.ui.form() · contraseña · cantidad
    13. Barra local, barra de compra e inicialización

   Reglas de la skill «apple-design» que gobiernan este archivo
   - La respuesta empieza en pointerdown; nada de temporizadores en la ruta de
     entrada (§1).
   - Lo que se arrastra sigue al dedo 1:1 desde el punto de agarre (§2).
   - Todo movimiento ligado a un gesto es un muelle: arranca del valor que hay
     en pantalla, conserva la velocidad al cambiar de objetivo y se puede
     agarrar en pleno vuelo. Nunca se bloquea la entrada (§3, §4).
   - Al soltar, el muelle hereda la velocidad del dedo (§5) y el destino sale
     de proyectar el impulso (§6). Rebote (damping .8) solo si el gesto
     llevaba impulso; abrir o cerrar con un botón, amortiguación crítica.
   - En cuanto se reconoce un arrastre, la pulsación que había empezado se
     cancela (§10).
   - Se entra y se sale por el mismo camino y desde el disparador (§7).
   - En los extremos, efecto goma (§9). Umbral de ~10 px para decidir (§10).
   - Solo transform y opacity, con requestAnimationFrame (§11).
   - Con «reducir movimiento», fundidos cortos en lugar de muelles (§14).
   ========================================================================== */

(function (window, document) {
  'use strict';

  var AURA = window.AURA = window.AURA || {};
  var ui = AURA.ui = AURA.ui || {};
  var html = document.documentElement;


  /* ------------------------------------------------------------------------
     1. Utilidades
     ------------------------------------------------------------------------ */

  function safe(fn) {
    try { return fn(); } catch (e) {
      try { if (window.console && console.warn) { console.warn('[AURA]', e); } } catch (e2) { /* nada */ }
    }
    return undefined;
  }

  function now() {
    return window.performance && typeof window.performance.now === 'function' ? window.performance.now() : Date.now();
  }

  var raf = typeof window.requestAnimationFrame === 'function'
    ? function (fn) { return window.requestAnimationFrame(fn); }
    : function (fn) { return window.setTimeout(function () { fn(now()); }, 16); };
  var caf = typeof window.cancelAnimationFrame === 'function'
    ? function (id) { window.cancelAnimationFrame(id); }
    : function (id) { window.clearTimeout(id); };

  /* Number(null) y Number('') valen 0: un atributo ausente debe dar el valor por defecto. */
  function num(v, fallback) {
    if (v === null || v === undefined || v === '') { return fallback; }
    v = Number(v);
    return isFinite(v) ? v : fallback;
  }
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function each(nodes, fn) { if (!nodes) { return; } for (var i = 0; i < nodes.length; i++) { fn(nodes[i], i); } }
  function toArray(nodes) { var out = []; each(nodes, function (n) { out.push(n); }); return out; }

  function esc(v) {
    return AURA.util && AURA.util.esc ? AURA.util.esc(v)
      : String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; });
  }

  function closest(node, selector) {
    if (node && node.nodeType === 3) { node = node.parentNode; }
    return node && typeof node.closest === 'function' ? node.closest(selector) : null;
  }

  function $(target) {
    if (!target) { return null; }
    if (typeof target !== 'string') { return target; }
    return document.getElementById(target) || safe(function () { return document.querySelector(target); }) || null;
  }

  function fire(el, name, detail) {
    safe(function () {
      el.dispatchEvent(new window.CustomEvent(name, { bubbles: true, detail: detail || {} }));
    });
  }

  function focusEl(el) {
    if (!el || typeof el.focus !== 'function') { return; }
    try { el.focus({ preventScroll: true }); } catch (e) { safe(function () { el.focus(); }); }
  }

  /* «Reducir movimiento»: se consulta al arrancar y se escuchan los cambios. */
  var reduced = false;
  var reduceListeners = [];
  safe(function () {
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced = !!mq.matches;
    var onChange = function (e) {
      reduced = !!e.matches;
      reduceListeners.forEach(function (fn) { safe(function () { fn(reduced); }); });
    };
    if (mq.addEventListener) { mq.addEventListener('change', onChange); } else if (mq.addListener) { mq.addListener(onChange); }
  });

  ui.reducedMotion = function () { return reduced; };


  /* ------------------------------------------------------------------------
     2. Física
     ------------------------------------------------------------------------ */

  var MAX_FRAME = 1 / 15;    // tras una pausa larga (pestaña en segundo plano) no se da un salto
  /* Duración típica de un fotograma (s), medida entre fotogramas seguidos de
     cualquier muelle (60 Hz, 120 Hz…). La usa el PRIMER fotograma de un muelle
     como mínimo: ese fotograma se ve un intervalo después del último del dedo. */
  var frameDt = 1 / 60;

  /**
   * Un paso EXACTO del oscilador amortiguado (masa 1) durante `h` segundos,
   * como matriz 2×2 que lleva [desplazamiento, velocidad] al instante h:
   *   x' = a·x + b·v      v' = c·x + d·v
   * Es la solución analítica (casos ζ < 1, ζ = 1 y ζ > 1), así que no hay error
   * de integración: el rebote es el que piden damping y response, sea cual sea
   * el paso. (Un Euler semiimplícito a 1/240 s amortiguaba de más: con 0.8 /
   * 0.3 rebotaba un 0,9 % en lugar del 1,5 % exacto.)
   */
  function springStep(omega, zeta, h) {
    var e, s, co, wd, r1, r2, e1, e2, k;
    if (Math.abs(zeta - 1) < 1e-4) {                       // crítico
      e = Math.exp(-omega * h);
      return [e * (1 + omega * h), e * h, -e * omega * omega * h, e * (1 - omega * h)];
    }
    if (zeta < 1) {                                        // subamortiguado: rebota
      wd = omega * Math.sqrt(1 - zeta * zeta);
      e = Math.exp(-zeta * omega * h);
      co = Math.cos(wd * h);
      s = Math.sin(wd * h);
      return [e * (co + zeta * omega * s / wd), e * s / wd, -e * omega * omega * s / wd, e * (co - zeta * omega * s / wd)];
    }
    k = Math.sqrt(zeta * zeta - 1);                        // sobreamortiguado
    r1 = -omega * (zeta - k);
    r2 = -omega * (zeta + k);
    e1 = Math.exp(r1 * h);
    e2 = Math.exp(r2 * h);
    return [
      e1 - r1 * (e2 - e1) / (r2 - r1), (e2 - e1) / (r2 - r1),
      r1 * e1 - r1 * (r2 * e2 - r1 * e1) / (r2 - r1), (r2 * e2 - r1 * e1) / (r2 - r1)
    ];
  }

  /**
   * Muelle interrumpible. Se describe como en la skill, con dos parámetros de
   * diseño: `damping` (razón de amortiguamiento; 1 = sin rebote) y `response`
   * (segundos; no es una duración). De ahí, con masa 1:
   *   rigidez = (2π / response)²      amortiguación = 4π · damping / response
   *
   * Avanza en cada fotograma de requestAnimationFrame exactamente el tiempo
   * transcurrido, con la solución analítica del oscilador (springStep): no es
   * una aproximación numérica ni depende de un paso fijo.
   * setTarget() cambia el objetivo SIN tocar la velocidad actual, así que una
   * inversión en pleno vuelo no tiene «muro de ladrillo». Para ceder la
   * velocidad de un gesto: setTarget(destino, { velocity: pxPorSegundo }).
   */
  function spring(options) {
    options = options || {};
    var damping = 1;
    var response = 0.35;
    var stepCache = { h: -1, m: null };   // paso exacto del último dt (casi siempre el mismo: 1/60 s)
    var precision = num(options.precision, 0.01) > 0 ? num(options.precision, 0.01) : 0.01;
    var restSpeed = num(options.restSpeed, precision * 20);
    var onUpdate = typeof options.onUpdate === 'function' ? options.onUpdate : null;
    var onRest = typeof options.onRest === 'function' ? options.onRest : null;
    var frame = 0;
    var last = 0;
    var startedAt = 0;

    function configure(o) {
      if (o.damping != null) { damping = Math.max(0, num(o.damping, damping)); }
      if (o.response != null) { response = Math.max(0.02, num(o.response, response)); }
      /* ω0 = √rigidez = 2π/response; ζ = amortiguación / (2·ω0) = damping. */
      stepCache.h = -1;
    }

    /* Avanza exactamente h segundos (solución analítica: vale cualquier h, así
       que no hay paso fijo ni restos que se queden sin aplicar). */
    function advance(h) {
      if (!(h > 0)) { return; }
      if (Math.abs(stepCache.h - h) > 1e-7) { stepCache.h = h; stepCache.m = springStep((2 * Math.PI) / response, damping, h); }
      var m = stepCache.m;
      /* El desplazamiento se mide respecto al objetivo actual. */
      var x = ctrl.value - ctrl.target;
      var v = ctrl.velocity;
      ctrl.value = ctrl.target + m[0] * x + m[1] * v;
      ctrl.velocity = m[2] * x + m[3] * v;
    }
    configure(options);

    var from = num(options.from, 0);
    var ctrl = {
      value: from,
      velocity: num(options.velocity, 0),
      target: num(options.to, from),
      running: false,
      setTarget: setTarget,
      stop: stop,
      jump: jump
    };

    function notify() {
      if (onUpdate) { try { onUpdate(ctrl.value, ctrl); } catch (e) { /* un fallo al pintar no detiene el muelle */ } }
    }

    /* Dos relojes, sin mezclarlos: entre fotogramas, el de
       requestAnimationFrame (el inicio de cada fotograma); en el PRIMER
       fotograma tras start(), el tiempo real transcurrido desde que se soltó
       (now() − startedAt), pero nunca menos de un fotograma (frameDt). El
       navegador entrega pointerup al principio del fotograma y el primer tick
       corre ~1 ms después, en ese mismo fotograma: con solo ese milisegundo, la
       hoja o el carrusel avanzaban la sexta parte de lo que llevaba el dedo y
       se veía un frenazo justo en la costura (§5). Lo que se pinta en ese
       fotograma se ve un intervalo después del último fotograma del dedo, así
       que se avanza ese intervalo. (Antes aún: se restaba la marca del
       fotograma a now(), el dt salía negativo y el muelle se quedaba quieto.) */
    function tick(time) {
      frame = 0;
      if (!ctrl.running) { return; }
      var t = num(time, now());
      var dt;
      if (last) {
        dt = clamp((t - last) / 1000, 0, MAX_FRAME);
        if (dt > 1 / 250 && dt < 1 / 20) { frameDt = frameDt * 0.8 + dt * 0.2; }   // media móvil del intervalo real
      } else {
        dt = clamp(Math.max((now() - startedAt) / 1000, frameDt), 0, MAX_FRAME);
      }
      last = t;
      advance(dt);
      if (Math.abs(ctrl.target - ctrl.value) <= precision && Math.abs(ctrl.velocity) <= restSpeed) {
        ctrl.value = ctrl.target;
        ctrl.velocity = 0;
        ctrl.running = false;
        notify();
        if (onRest && !ctrl.running) { try { onRest(ctrl.value, ctrl); } catch (e) { /* nada */ } }
        return;
      }
      notify();
      if (ctrl.running && !frame) { frame = raf(tick); }
    }

    function start() {
      if (!ctrl.running) {
        ctrl.running = true;
        last = 0;                        // el primer tick fija el reloj de fotogramas (ver tick)
        startedAt = now();
      }
      if (!frame) { frame = raf(tick); }
    }

    /** Nuevo objetivo. opts: { velocity, damping, response }. Conserva la velocidad si no se indica otra. */
    function setTarget(to, opts) {
      if (opts) {
        configure(opts);
        if (opts.velocity != null && isFinite(Number(opts.velocity))) { ctrl.velocity = Number(opts.velocity); }
      }
      ctrl.target = num(to, ctrl.target);
      start();
      return ctrl;
    }

    /** Detiene la animación donde esté. value y velocity quedan como estaban (para agarrar en pleno vuelo). */
    function stop() {
      ctrl.running = false;
      if (frame) { caf(frame); frame = 0; }
      return ctrl;
    }

    /** Coloca el valor sin animar (reducir movimiento, redimensionado). */
    function jump(value) {
      stop();
      ctrl.value = ctrl.target = num(value, ctrl.value);
      ctrl.velocity = 0;
      notify();
      return ctrl;
    }

    if (options.autoStart !== false && (ctrl.target !== ctrl.value || ctrl.velocity !== 0)) { start(); }
    return ctrl;
  }

  /**
   * Proyección de impulso: cuánto seguiría avanzando un gesto soltado a
   * `velocity` px/s. Función exacta de la skill (decaimiento exponencial, la
   * misma que la deceleración del scroll), no v²/2a.
   */
  function project(initialVelocity, decelerationRate) {
    if (decelerationRate == null) { decelerationRate = 0.998; }
    return (initialVelocity / 1000) * decelerationRate / (1 - decelerationRate);
  }

  /** Efecto goma: cuanto más se rebasa el límite, menos sigue el elemento. Función exacta de la skill. */
  function rubberband(overshoot, dimension, constant) {
    if (constant == null) { constant = 0.55; }
    return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
  }

  /* Inversa del efecto goma: qué exceso real produce un desplazamiento visible
     dado. Sirve para agarrar en pleno vuelo, más allá del límite, sin salto. */
  function unrubberband(shown, dimension, constant) {
    if (constant == null) { constant = 0.55; }
    var limit = dimension * 0.98;           // la goma nunca llega a mostrar más que `dimension`
    var d = Math.min(Math.abs(shown), limit);
    var out = (d * dimension) / (constant * dimension - constant * d);
    return shown < 0 ? -out : out;
  }

  ui.spring = spring;
  ui.project = project;
  ui.rubberband = rubberband;


  /* ------------------------------------------------------------------------
     3. Gesto de arrastre
     Detecta el gesto desde el primer movimiento y decide a los ~10 px
     (histéresis): si domina el eje propio, es nuestro; si no, se suelta y la
     página hace scroll. El puntero se captura al reconocer el arrastre —no en
     pointerdown— para que un toque normal siga llegando a los enlaces y botones
     de dentro. Guarda un historial corto para la velocidad de salida.
     ------------------------------------------------------------------------ */

  var DRAG_THRESHOLD = 10;      // px
  var HISTORY_MS = 100;         // ventana para medir la velocidad de salida
  var STALE_MS = 60;            // si el dedo se paró antes de soltar, la velocidad es 0

  /* Marca de tiempo del evento (mismo reloj que performance.now()): la
     velocidad sale de cuándo se movió el dedo, no de cuándo corrió el
     manejador. Navegadores antiguos dan una hora absoluta: entonces, now(). */
  function evTime(e) {
    var t = e && e.timeStamp;
    return t > 0 && t < 1e11 ? t : now();
  }

  function dragGesture(el, handlers) {
    var g = null;

    function axisDelta(x, y) {
      return g.axis === 'x' ? { main: x - g.x0, cross: y - g.y0 } : { main: y - g.y0, cross: x - g.x0 };
    }

    function listen(on) {
      var fn = on ? 'addEventListener' : 'removeEventListener';
      window[fn]('pointermove', onMove, true);
      window[fn]('pointerup', onUp, true);
      window[fn]('pointercancel', onCancel, true);
    }

    function begin(e) {
      g.active = true;
      g.gx = e.clientX;                 // punto de agarre: el seguimiento empieza aquí, sin salto
      g.gy = e.clientY;
      g.delta = 0;
      g.history = [];
      g.t = evTime(e);
      /* El arrastre ha ganado: el toque pierde con decisión (skill §10). El
         botón o la tarjeta sobre la que empezó deja de verse pulsado. */
      releasePress();
      try { el.setPointerCapture(g.id); } catch (err) { /* el puntero ya no existe */ }
      if (handlers.start) { handlers.start(g, e); }
    }

    function finish() {
      var done = g;
      g = null;
      listen(false);
      if (done && done.active) { try { el.releasePointerCapture(done.id); } catch (err) { /* nada */ } }
      return done;
    }

    function onDown(e) {
      if (e.isPrimary === false || (e.pointerType === 'mouse' && e.button !== 0)) { return; }
      if (g) {
        if (g.active) { return; }
        finish();                        // un gesto pendiente que nunca recibió su pointerup (se soltó fuera de la ventana)
      }
      if (handlers.accept && !handlers.accept(e)) { return; }
      g = {
        id: e.pointerId, type: e.pointerType || 'mouse', target: e.target,
        axis: handlers.axis ? handlers.axis(e) : 'x',
        x0: e.clientX, y0: e.clientY, gx: e.clientX, gy: e.clientY,
        active: false, moved: false, inFlight: false, delta: 0, history: [],
        /** Anota el valor que hay en pantalla (para la velocidad de salida), con la hora del evento. */
        track: function (value) {
          var t = this.t || now();
          this.history.push({ t: t, v: value });
          while (this.history.length > 2 && t - this.history[0].t > HISTORY_MS) { this.history.shift(); }
        },
        /** Velocidad de salida en unidades/segundo; 0 si el dedo se había parado antes de soltar. */
        velocity: function () {
          var h = this.history;
          if (h.length < 2) { return 0; }
          var a = h[0], b = h[h.length - 1];
          if ((this.upT || now()) - b.t > STALE_MS || b.t - a.t < 1) { return 0; }
          return ((b.v - a.v) / (b.t - a.t)) * 1000;
        }
      };
      listen(true);
      /* Agarrado en pleno vuelo: ya es un arrastre, sin esperar al umbral. */
      if (handlers.grab && handlers.grab(e, g)) {
        g.inFlight = true;
        begin(e);
      }
    }

    function onMove(e) {
      if (!g || e.pointerId !== g.id) { return; }
      if (!g.active) {
        var d = axisDelta(e.clientX, e.clientY);
        if (Math.abs(d.main) < DRAG_THRESHOLD && Math.abs(d.cross) < DRAG_THRESHOLD) { return; }
        if (Math.abs(d.main) <= Math.abs(d.cross) || (handlers.allow && !handlers.allow(d.main, g, e))) {
          finish();                      // no es nuestro gesto: se cede a la página
          return;
        }
        begin(e);
      }
      g.t = evTime(e);
      g.delta = g.axis === 'x' ? e.clientX - g.gx : e.clientY - g.gy;
      if (Math.abs(g.delta) > 3) { g.moved = true; }
      if (handlers.move) { handlers.move(g, e); }
    }

    function onUp(e) {
      if (!g || e.pointerId !== g.id) { return; }
      var done = finish();
      done.upT = evTime(e);
      if (done.active && handlers.end) { handlers.end(done, e); }
    }

    function onCancel(e) {
      if (!g || e.pointerId !== g.id) { return; }
      var done = finish();
      done.history = [];                 // gesto cancelado: sin impulso
      if (done.active && handlers.end) { handlers.end(done, e); }
    }

    /* En táctil, el navegador se queda el gesto en cuanto empieza a hacer scroll.
       Si el movimiento es nuestro hay que decírselo en el primer touchmove. */
    function onTouchMove(e) {
      if (!g || g.type !== 'touch') { return; }
      if (g.active) { if (e.cancelable) { e.preventDefault(); } return; }
      var t = e.touches && e.touches[0];
      if (!t) { return; }
      var d = axisDelta(t.clientX, t.clientY);
      if (Math.abs(d.main) > Math.abs(d.cross) && (!handlers.allow || handlers.allow(d.main, g, e))) {
        if (e.cancelable) { e.preventDefault(); }
      }
    }

    el.addEventListener('pointerdown', onDown);
    /* Si el navegador retira la captura a medio arrastre (el elemento sale del
       documento, pointercancel), el gesto termina sin impulso. Solo cuenta la
       captura del PROPIO elemento: en táctil el navegador captura antes, de
       forma implícita, el descendiente tocado, y al pedir la captura en begin()
       ese descendiente recibe un lostpointercapture que burbujea hasta aquí.
       Sin este filtro ningún arrastre táctil pasaba del primer movimiento. */
    el.addEventListener('lostpointercapture', function (e) {
      if (e.target !== el) { return; }
      if (g && g.active && e.pointerId === g.id) { onCancel(e); }
    });
    safe(function () { el.addEventListener('touchmove', onTouchMove, { passive: false }); });
    return { cancel: function () { if (g) { finish(); } } };
  }

  /* Tras un arrastre real, el clic que llega después no debe abrir enlaces.
     e.detail === 0 son clics de teclado: esos nunca se cancelan. */
  function clickGuard(el) {
    var until = 0;
    el.addEventListener('click', function (e) {
      if (e.detail !== 0 && now() < until) {
        e.preventDefault();
        e.stopPropagation();
      }
      until = 0;
    }, true);
    return function () { until = now() + 350; };
  }


  /* ------------------------------------------------------------------------
     4. Respuesta en la pulsación y efecto de borde
     ------------------------------------------------------------------------ */

  /* Todo lo que se puede pulsar responde en pointerdown (lista paralela a la de aura.css, §1 de las docs). */
  var PRESSABLE = '.aura-btn, .aura-icon-btn, .aura-nav__action, button.aura-chip, a.aura-chip, ' +
    '.aura-stepper__btn, .aura-field__toggle, .aura-option, .aura-swatch, a.aura-card, .aura-card--interactive, ' +
    '.aura-segmented__item, .aura-check, .aura-radio, .aura-carousel__dot, .aura-toast__action, .aura-toast__close, ' +
    '.aura-link, .aura-nav__link, a.aura-localnav__title, .aura-localnav__link, .aura-menu__link, .aura-menu__secondary a, ' +
    '.aura-popover__links a, .aura-search__item, .aura-footer__social-link, .aura-localnav__toggle, ' +
    /* Enlaces grandes y de texto (v1.3): la tarjeta de modelo responde entera
       al tocar su foto o su nombre; los enlaces de texto se atenúan. */
    '.aura-product-card__media, .aura-product-card__name a, a.aura-bag-line__media, .aura-bag-line__name a, ' +
    '.aura-accordion__summary, .aura-accordion__panel a, .aura-prose a, .aura-footer__list a, .aura-footer__legal-links a, ' +
    '.aura-crumbs a, .aura-brand, .aura-footnote-ref > a, .aura-footnotes__back';
  var PRESS_SLOP = 10;   // px de margen: se puede salir y volver sin perder la pulsación
  var pressed = null;

  function releasePress() {
    if (!pressed) { return; }
    pressed.el.classList.remove('is-pressed');
    pressed = null;
    window.removeEventListener('pointermove', onPressMove, true);
  }

  function onPressMove(e) {
    if (!pressed || e.pointerId !== pressed.id) { return; }
    var r = pressed.el.getBoundingClientRect();
    var inside = e.clientX >= r.left - PRESS_SLOP && e.clientX <= r.right + PRESS_SLOP &&
      e.clientY >= r.top - PRESS_SLOP && e.clientY <= r.bottom + PRESS_SLOP;
    pressed.el.classList.toggle('is-pressed', inside);
  }

  function initPress() {
    /* El resaltado se pone en pointerdown, no al soltar: sin latencia (skill §1). */
    document.addEventListener('pointerdown', function (e) {
      if (e.button > 0) { return; }
      var el = closest(e.target, PRESSABLE);
      releasePress();
      if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true' || el.classList.contains('is-disabled')) { return; }
      /* Una etiqueta (opción, casilla, muestra) cuyo control está desactivado no responde. */
      if (el.tagName === 'LABEL' && el.control && el.control.disabled) { return; }
      pressed = { el: el, id: e.pointerId };
      el.classList.add('is-pressed');
      window.addEventListener('pointermove', onPressMove, true);
    }, true);
    window.addEventListener('pointerup', releasePress, true);
    window.addEventListener('pointercancel', releasePress, true);
    window.addEventListener('blur', releasePress);
    document.addEventListener('dragstart', releasePress, true);
  }

  /* Efecto de borde: la barra solo se separa del contenido cuando hay contenido
     debajo. (Con barra local, la global no flota: el CSS no pinta su borde y es
     .aura-localnav la que lo muestra al quedarse pegada; ver initLocalnav.) */
  function initScrollEdge() {
    var scrolled = null;
    function update() {
      var on = (window.pageYOffset || html.scrollTop || 0) > 4;
      if (on === scrolled) { return; }
      scrolled = on;
      each(document.querySelectorAll('[data-aura-nav]'), function (nav) { nav.classList.toggle('is-scrolled', on); });
    }
    window.addEventListener('scroll', update, { passive: true });
    update();

    /* Tabla comparativa: la columna fija solo marca su borde cuando hay
       columnas pasando por debajo (el scroll no burbujea: se escucha en captura). */
    document.addEventListener('scroll', function (e) {
      var wrap = e.target;
      if (!wrap || !wrap.classList || !wrap.classList.contains('aura-table-wrap')) { return; }
      wrap.classList.toggle('is-scrolled', wrap.scrollLeft > 1);
    }, { capture: true, passive: true });
  }


  /* ------------------------------------------------------------------------
     5. Capas: bloqueo de scroll, foco atrapado, Esc
     ------------------------------------------------------------------------ */

  var layers = [];        // pila: la última es la que cierra Esc
  var lockCount = 0;
  var INERT = !!window.HTMLElement && 'inert' in window.HTMLElement.prototype;
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
    'select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

  function lock() {
    lockCount++;
    if (lockCount === 1) { html.classList.add('aura-lock'); }
  }

  function unlock() {
    lockCount = Math.max(0, lockCount - 1);
    if (!lockCount) { html.classList.remove('aura-lock'); }
  }

  /* «Velar para enfocar» (skill §12): una tarea modal (hoja inferior,
     buscador) empuja la página hacia atrás, además de velarla. Se escala
     (solo `scale`, un 3,5 %) lo que hay detrás —<main>, el pie y las barras—
     alrededor del centro de la pantalla: cada elemento recibe su propio
     transform-origin para que todos encojan hacia el mismo punto y no se abra
     ninguna costura. Lo que queda a la vista alrededor es el lienzo negro.
     La hoja lo liga 1:1 a su muelle (recedeSet en cada fotograma); el
     buscador, con una transición. Con «reducir movimiento» no hay escala. */
  var RECEDE_SCALE = 0.035;
  var RECEDE_TARGETS = 'main, aura-footer, .aura-nav, .aura-ribbon';
  var HAS_SCALE = !!safe(function () { return window.CSS && window.CSS.supports && window.CSS.supports('scale', '1'); });
  var recede = { owner: null, els: [], timer: 0 };

  function recedeBegin(owner) {
    if (reduced || (recede.owner && recede.owner !== owner)) { return false; }
    window.clearTimeout(recede.timer);
    if (recede.owner === owner) { return true; }
    recede.owner = owner;
    var vh = window.innerHeight || html.clientHeight || 0;
    recede.els = toArray(document.querySelectorAll(RECEDE_TARGETS)).filter(function (el) {
      return el.getClientRects().length > 0 && !closest(el.parentNode, '.aura-sheet, .aura-search, .aura-menu, main, aura-footer');
    });
    recede.els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      el.style.transformOrigin = '50% ' + Math.round(vh / 2 - r.top) + 'px';
    });
    html.classList.add('aura-recede');
    return true;
  }

  /* p: 0 = página en su sitio, 1 = del todo atrás. */
  function recedeSet(owner, p, transition) {
    if (recede.owner !== owner) { return; }
    var s = 1 - RECEDE_SCALE * clamp(p, 0, 1);
    recede.els.forEach(function (el) {
      el.style.transition = transition || '';
      if (HAS_SCALE) { el.style.scale = s.toFixed(4); } else { el.style.transform = 'scale(' + s.toFixed(4) + ')'; }
    });
  }

  function recedeEnd(owner, delay) {
    if (recede.owner !== owner) { return; }
    var done = function () {
      if (recede.owner !== owner) { return; }
      recede.els.forEach(function (el) {
        el.style.transition = '';
        el.style.transformOrigin = '';
        if (HAS_SCALE) { el.style.scale = ''; } else { el.style.transform = ''; }
      });
      html.classList.remove('aura-recede');
      recede = { owner: null, els: [], timer: 0 };
    };
    window.clearTimeout(recede.timer);
    if (delay) { recede.timer = window.setTimeout(done, delay); } else { done(); }
  }

  /* Hojas y barras fijas no pueden vivir dentro de lo que se escala (un
     position: fixed dentro de un ancestro con transform se recoloca respecto
     a él): se sacan una vez, justo detrás de <main>, sin cambiar el orden de
     lectura. Las páginas las buscan por id o atributo en `document`. */
  function relocate(el) {
    if (!el || !el.parentNode) { return; }
    var host = closest(el.parentNode, 'main, aura-footer');
    if (!host || !host.parentNode) { return; }
    var anchor = host.nextSibling;
    while (anchor && anchor.nodeType === 1 && anchor._auraRelocated) { anchor = anchor.nextSibling; }
    host.parentNode.insertBefore(el, anchor);
    el._auraRelocated = true;
  }

  /* Deja inerte todo lo que no sea la capa (ni los avisos). Devuelve la función que lo deshace. */
  function isolate(el) {
    var touched = [];
    var node = el;
    while (node && node.parentNode && node !== document.body && node.parentNode.children) {
      var siblings = node.parentNode.children;
      for (var i = 0; i < siblings.length; i++) {
        var s = siblings[i];
        if (s === node || /^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(s.tagName) || s.id === 'aura-toasts') { continue; }
        if (INERT) {
          if (!s.inert) { s.inert = true; touched.push(s); }
        } else if (s.getAttribute('aria-hidden') !== 'true') {
          s.setAttribute('aria-hidden', 'true');
          touched.push(s);
        }
      }
      node = node.parentNode;
    }
    return function () {
      touched.forEach(function (s) { if (INERT) { s.inert = false; } else { s.removeAttribute('aria-hidden'); } });
      touched = [];
    };
  }

  function focusables(container) {
    return toArray(container.querySelectorAll(FOCUSABLE)).filter(function (el) {
      return el.getClientRects().length > 0;
    });
  }

  function pushLayer(layer) {
    layers.push(layer);
    return layer;
  }

  function removeLayer(layer) {
    var i = layers.indexOf(layer);
    if (i >= 0) { layers.splice(i, 1); }
  }

  function topModal() {
    for (var i = layers.length - 1; i >= 0; i--) { if (layers[i].modal) { return layers[i]; } }
    return null;
  }

  function initLayers() {
    document.addEventListener('keydown', function (e) {
      var key = e.key;
      if (key === 'Escape' || key === 'Esc') {
        var top = layers[layers.length - 1];
        if (top) {                        // ninguna capa atrapa: Esc siempre saca
          e.preventDefault();
          top.close({ focus: true });
        }
        return;
      }
      if (key !== 'Tab') { return; }
      var modal = topModal();
      if (!modal) { return; }
      var items = focusables(modal.container);
      var active = document.activeElement;
      if (!items.length) { e.preventDefault(); focusEl(modal.container); return; }
      var first = items[0];
      var last = items[items.length - 1];
      var outside = !modal.container.contains(active) || active === modal.container;
      if (e.shiftKey && (active === first || outside)) { e.preventDefault(); focusEl(last); }
      else if (!e.shiftKey && (active === last || !modal.container.contains(active))) { e.preventDefault(); focusEl(first); }
    });

    /* Si el foco se escapa de una tarea modal (navegadores sin `inert`), vuelve a ella. */
    document.addEventListener('focusin', function (e) {
      var modal = topModal();
      if (!modal || modal.container.contains(e.target) || closest(e.target, '#aura-toasts')) { return; }
      focusEl(focusables(modal.container)[0] || modal.container);
    });
  }


  /* ------------------------------------------------------------------------
     6. Popover · buscador · menú móvil
     Sus entradas y salidas son transiciones CSS de transform + opacity sobre
     .is-open (curvas espejadas, ver aura.css): no dependen de un gesto y el
     navegador las invierte desde el valor en curso si se interrumpen.
     ------------------------------------------------------------------------ */

  var popover = null;   // { el, trigger, layer }
  var POPOVER_MARGIN = 12;   // px libres como mínimo entre el popover y el borde de la ventana

  /* Caja del popover SIN la escala de su estado cerrado (la que tendrá abierto). */
  function popoverBox(el) {
    var cs = window.getComputedStyle(el);
    var scale = 1;
    var m = /matrix\(([^,]+),/.exec(cs.transform || '');
    if (m) { scale = num(parseFloat(m[1]), 1) || 1; }
    var origin = (cs.transformOrigin || '0px 0px').split(' ');
    var ox = num(parseFloat(origin[0]), 0);
    var oy = num(parseFloat(origin[1]), 0);
    var r = el.getBoundingClientRect();
    return { left: r.left - ox * (1 - scale), top: r.top - oy * (1 - scale), width: el.offsetWidth, height: el.offsetHeight };
  }

  /* Control de colisión: si el popover se saldría de la ventana (p. ej. un
     disparador a la derecha en un móvil de 360 px), se desplaza en horizontal
     con la propiedad independiente `translate` —`transform` es la que anima la
     materialización— hasta quedar dentro, con POPOVER_MARGIN de aire. */
  function fitPopover(el) {
    el.style.translate = '';
    var box = popoverBox(el);
    var vw = html.clientWidth || window.innerWidth || 0;
    if (!vw) { return; }
    var dx = 0;
    if (box.left + box.width > vw - POPOVER_MARGIN) { dx = (vw - POPOVER_MARGIN) - (box.left + box.width); }
    if (box.left + dx < POPOVER_MARGIN) { dx = POPOVER_MARGIN - box.left; }
    if (Math.abs(dx) >= 1) { el.style.translate = Math.round(dx) + 'px 0'; }
  }

  /* El popover se materializa desde su disparador: transform-origin = centro del
     botón, medido respecto a la caja SIN transformar del popover (ya desplazada
     por fitPopover, si hizo falta). */
  function setPopoverOrigin(el, trigger) {
    var box = popoverBox(el);
    var t = trigger.getBoundingClientRect();
    var x = clamp(t.left + t.width / 2 - box.left, 0, box.width);
    var above = t.top + t.height / 2 > box.top + box.height / 2;
    el.style.setProperty('--aura-origin', Math.round(x) + 'px ' + (above ? '100%' : '0'));
  }

  function setExpanded(selector, value) {
    each(safe(function () { return document.querySelectorAll(selector); }), function (t) {
      t.setAttribute('aria-expanded', value ? 'true' : 'false');
    });
  }

  function closePopover(opts) {
    if (!popover) { return; }
    var p = popover;
    popover = null;
    removeLayer(p.layer);
    p.el.classList.remove('is-open');
    p.el.setAttribute('aria-hidden', 'true');
    setExpanded('[data-aura-popover-toggle="' + p.el.id + '"]', false);
    if (opts && opts.focus && p.trigger) { focusEl(p.trigger); }
    fire(p.el, 'aura:popover-close');
  }

  function openPopover(target, trigger) {
    var el = $(target);
    if (!el) { return; }
    if (popover && popover.el === el) { return; }
    closePopover();
    trigger = trigger || safe(function () { return document.querySelector('[data-aura-popover-toggle="' + el.id + '"]'); });
    safe(function () { fitPopover(el); });
    if (trigger) { safe(function () { setPopoverOrigin(el, trigger); }); }
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    setExpanded('[data-aura-popover-toggle="' + el.id + '"]', true);
    popover = { el: el, trigger: trigger || null, layer: pushLayer({ modal: false, container: el, close: closePopover }) };
    focusEl(el);
    fire(el, 'aura:popover-open');
  }

  function initPopover() {
    document.addEventListener('click', function (e) {
      var trigger = closest(e.target, '[data-aura-popover-toggle]');
      if (!trigger) { return; }
      var el = document.getElementById(trigger.getAttribute('data-aura-popover-toggle'));
      if (!el) { return; }
      e.preventDefault();
      if (popover && popover.el === el) { closePopover({ focus: true }); } else { openPopover(el, trigger); }
    });
    /* Pulsar fuera lo cierra (sin robar el foco: el usuario ya está en otra cosa). */
    document.addEventListener('pointerdown', function (e) {
      if (!popover) { return; }
      if (popover.el.contains(e.target) || (popover.trigger && popover.trigger.contains(e.target))) { return; }
      closePopover();
    }, true);
    document.addEventListener('focusin', function (e) {
      if (!popover) { return; }
      if (popover.el.contains(e.target) || (popover.trigger && popover.trigger.contains(e.target))) { return; }
      closePopover();
    });
    /* Girar el móvil o cambiar el tamaño de la ventana con uno abierto: vuelve a caber. */
    window.addEventListener('resize', function () {
      if (!popover) { return; }
      var p = popover;
      safe(function () { fitPopover(p.el); if (p.trigger) { setPopoverOrigin(p.el, p.trigger); } });
    });
  }

  ui.popover = {
    open: function (target, trigger) { safe(function () { openPopover(target, $(trigger)); }); },
    close: function () { safe(function () { closePopover(); }); },
    isOpen: function (target) { return !!popover && (!target || popover.el === $(target)); }
  };

  /* Buscador y menú comparten mecánica: tarea modal con velo (o a pantalla
     completa), scroll bloqueado, foco atrapado, Esc y foco de vuelta al disparador. */
  function makeOverlay(cfg) {
    var st = { open: false, layer: null, release: null, trigger: null };

    function node() { return document.getElementById(cfg.id); }

    function open(trigger) {
      var el = node();
      if (!el || st.open) { return; }
      if (cfg.canOpen && !cfg.canOpen(el)) { return; }
      closePopover();
      st.open = true;
      st.trigger = trigger || document.activeElement || null;
      el.style.pointerEvents = '';
      el.classList.add('is-open');
      el.setAttribute('aria-hidden', 'false');
      setExpanded(cfg.openSelector, true);
      lock();
      st.release = isolate(el);
      st.layer = pushLayer({ modal: true, container: el, close: close });
      if (cfg.onOpen) { safe(function () { cfg.onOpen(el, st.trigger); }); }
      fire(el, cfg.event + '-open');
    }

    function close(opts) {
      var el = node();
      if (!el || !st.open) { return; }
      st.open = false;
      el.classList.remove('is-open');
      el.setAttribute('aria-hidden', 'true');
      el.style.pointerEvents = 'none';        // mientras se desvanece no bloquea la página
      setExpanded(cfg.openSelector, false);
      removeLayer(st.layer);
      if (st.release) { st.release(); st.release = null; }
      unlock();
      if ((!opts || opts.focus !== false) && st.trigger && document.contains(st.trigger)) { focusEl(st.trigger); }
      if (cfg.onClose) { safe(function () { cfg.onClose(el); }); }
      fire(el, cfg.event + '-close');
    }

    document.addEventListener('click', function (e) {
      var opener = closest(e.target, cfg.openSelector);
      if (opener) { e.preventDefault(); if (st.open) { close(); } else { open(opener); } return; }
      if (st.open && closest(e.target, cfg.closeSelector)) { e.preventDefault(); close(); }
    });

    return { open: open, close: close, isOpen: function () { return st.open; }, el: node };
  }

  var searchOverlay = null;
  var menuOverlay = null;

  function searchItems(el) { return toArray(el.querySelectorAll('.aura-search__item')); }

  function paintSearch(el, value) {
    var results = el.querySelector('[data-aura-search-results]');
    var status = el.querySelector('[data-aura-search-status]');
    if (results && AURA.search) { results.innerHTML = AURA.search.html(value); }
    if (status && AURA.search) { status.textContent = AURA.search.status(value); }
  }

  function moveSearchActive(el, step) {
    var items = searchItems(el);
    if (!items.length) { return; }
    var current = -1;
    items.forEach(function (it, i) { if (it.classList.contains('is-active')) { current = i; } it.classList.remove('is-active'); });
    var next = current < 0 ? (step > 0 ? 0 : items.length - 1) : (current + step + items.length) % items.length;
    items[next].classList.add('is-active');
    safe(function () { items[next].scrollIntoView({ block: 'nearest' }); });
  }

  function initSearch() {
    searchOverlay = makeOverlay({
      id: 'aura-search',
      event: 'aura:search',
      openSelector: '[data-aura-search-open]',
      closeSelector: '[data-aura-search-close]',
      onOpen: function (el, trigger) {
        var input = el.querySelector('.aura-search__input');
        var panel = el.querySelector('.aura-search__panel');
        if (input) { input.value = ''; }
        paintSearch(el, '');
        if (panel && trigger && trigger.getBoundingClientRect) {
          var t = trigger.getBoundingClientRect();
          panel.style.transformOrigin = Math.round(t.left + t.width / 2) + 'px 0px';   // nace de su disparador (se materializa desde la lupa)
        }
        /* La página retrocede mientras el panel baja (misma curva de entrada). */
        if (recedeBegin('search')) {
          safe(function () { void document.body.offsetWidth; });
          recedeSet('search', 1, 'scale 320ms cubic-bezier(.2, .8, .2, 1), transform 320ms cubic-bezier(.2, .8, .2, 1)');
        }
        focusEl(input || el);
      },
      onClose: function () {
        /* Vuelve por el mismo camino, con la curva espejada. */
        recedeSet('search', 0, 'scale 200ms cubic-bezier(.8, 0, .8, .2), transform 200ms cubic-bezier(.8, 0, .8, .2)');
        recedeEnd('search', 220);
      }
    });

    /* Se filtra en cada pulsación, sin esperas (skill §1: nada de «debounce» en la entrada). */
    document.addEventListener('input', function (e) {
      var el = closest(e.target, '.aura-search');
      if (el && e.target.classList.contains('aura-search__input')) { safe(function () { paintSearch(el, e.target.value); }); }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') { return; }
      var el = closest(e.target, '.aura-search');
      if (!el || !e.target.classList || !e.target.classList.contains('aura-search__input')) { return; }
      e.preventDefault();
      moveSearchActive(el, e.key === 'ArrowDown' ? 1 : -1);
    });

    document.addEventListener('submit', function (e) {
      var form = closest(e.target, '.aura-search__form');
      if (!form) { return; }
      e.preventDefault();
      var el = closest(form, '.aura-search');
      var item = el.querySelector('.aura-search__item.is-active') || el.querySelector('.aura-search__item');
      if (item) { item.click(); }
    });

    document.addEventListener('click', function (e) {
      if (closest(e.target, '.aura-search__item') && searchOverlay.isOpen()) { searchOverlay.close({ focus: false }); }
    });
  }

  function initMenu() {
    menuOverlay = makeOverlay({
      id: 'aura-menu',
      event: 'aura:menu',
      openSelector: '[data-aura-menu-open]',
      closeSelector: '[data-aura-menu-close]',
      /* En escritorio el menú no se pinta (display: none): abrirlo bloquearía la página sin mostrar nada. */
      canOpen: function () {
        return !safe(function () { return window.matchMedia('(min-width: 992px)').matches; });
      },
      onOpen: function (el, trigger) {
        /* Se materializa desde el botón que lo abre (el CSS trae un origen de reserva). */
        if (trigger && trigger.getBoundingClientRect) {
          var t = trigger.getBoundingClientRect();
          if (t.width) { el.style.transformOrigin = Math.round(t.left + t.width / 2) + 'px ' + Math.round(t.top + t.height / 2) + 'px'; }
        }
        focusEl(el.querySelector('[data-aura-menu-close]') || el);
      }
    });

    document.addEventListener('click', function (e) {
      if (menuOverlay.isOpen() && closest(e.target, '.aura-menu a[href]')) { menuOverlay.close({ focus: false }); }
    });

    /* Al pasar a escritorio el menú deja de existir: se cierra. */
    safe(function () {
      var mq = window.matchMedia('(min-width: 992px)');
      var onChange = function (e) { if (e.matches) { menuOverlay.close({ focus: false }); } };
      if (mq.addEventListener) { mq.addEventListener('change', onChange); } else if (mq.addListener) { mq.addListener(onChange); }
    });
  }

  ui.search = {
    open: function (trigger) { if (searchOverlay) { searchOverlay.open($(trigger)); } },
    close: function () { if (searchOverlay) { searchOverlay.close(); } }
  };
  ui.menu = {
    open: function (trigger) { if (menuOverlay) { menuOverlay.open($(trigger)); } },
    close: function () { if (menuOverlay) { menuOverlay.close(); } }
  };


  /* ------------------------------------------------------------------------
     7. Hoja / cajón
     `pos` es la distancia en px desde la posición abierta en el sentido del
     cierre: 0 = abierta, size = cerrada (fuera de pantalla). El velo va ligado
     1:1 a ese avance. Entra y sale por el mismo lado.
     ------------------------------------------------------------------------ */

  /* Abrir o cerrar con un botón, el velo o Esc: amortiguación crítica (sin
     rebote: no ha habido impulso). Al soltar un arrastre con impulso, el
     valor de la skill para hojas y cajones, con rebote (damping .8). */
  var SHEET_SPRING = { damping: 1, response: 0.3 };
  var SHEET_FLICK_SPRING = { damping: 0.8, response: 0.3 };
  var FLICK_SPEED = 220;                                // px/s a partir de los cuales manda el signo de la velocidad
  var REDUCED_FADE = 200;                               // ms: el fundido de la hoja con «reducir movimiento» (aura.css 8.1)
  var allSheets = [];

  function sheetMeasure(s) {
    var axis = 'y';
    safe(function () {
      axis = (window.getComputedStyle(s.panel).getPropertyValue('--aura-sheet-axis') || 'y').trim() || 'y';
    });
    s.axis = axis === 'x' ? 'x' : 'y';
    s.size = Math.max(1, s.axis === 'x' ? s.panel.offsetWidth : s.panel.offsetHeight);
  }

  function sheetRender(s, pos) {
    s.pos = pos;
    var p = pos.toFixed(2);
    var progress = clamp(1 - pos / s.size, 0, 1);
    s.panel.style.transform = s.axis === 'x' ? 'translate3d(' + p + 'px, 0, 0)' : 'translate3d(0, ' + p + 'px, 0)';
    if (s.scrim) { s.scrim.style.opacity = progress.toFixed(3); }
    /* La página retrocede ligada 1:1 al avance de la hoja (solo la inferior). */
    if (s.receding) { recedeSet(s, progress); }
  }

  function sheetClearInline(s) {
    s.panel.style.transform = '';
    s.panel.style.pointerEvents = '';
    s.root.style.pointerEvents = '';
    if (s.scrim) { s.scrim.style.opacity = ''; }
  }

  /* La hoja inferior (eje y) empuja la página hacia atrás; el cajón lateral
     de escritorio, no (llega desde el borde, como un panel paralelo). */
  function sheetRecede(s) {
    if (s.receding || reduced || s.axis !== 'y') { return; }
    s.receding = recedeBegin(s);
  }
  function sheetUnrecede(s) {
    if (!s.receding) { return; }
    s.receding = false;
    recedeEnd(s);
  }

  /* Estado modal: scroll bloqueado, resto de la página inerte, foco atrapado, Esc. */
  function sheetEngage(s) {
    if (s.engaged) { return; }
    s.engaged = true;
    closePopover();
    if (!s.locked) { s.locked = true; lock(); }
    s.release = isolate(s.root);
    s.layer = pushLayer({ modal: true, container: s.panel, close: function (o) { sheetClose(s, o); } });
    s.root.setAttribute('aria-hidden', 'false');
    if (s.root.id) { setExpanded('[data-aura-sheet-open="' + s.root.id + '"]', true); }
    s.root.style.pointerEvents = '';
    s.panel.style.pointerEvents = '';
  }

  function sheetDisengage(s, opts) {
    if (!s.engaged) { return; }
    s.engaged = false;
    removeLayer(s.layer);
    if (s.release) { s.release(); s.release = null; }
    if (s.root.id) { setExpanded('[data-aura-sheet-open="' + s.root.id + '"]', false); }
    /* El foco vuelve al disparador en el momento de pedir el cierre: el teclado
       no espera a que termine la animación. */
    if ((!opts || opts.focus !== false) && s.trigger && document.contains(s.trigger)) { focusEl(s.trigger); }
  }

  function sheetFocus(s) {
    focusEl(s.panel.querySelector('[autofocus]') || s.panel);
  }

  function sheetFinishOpen(s) {
    s.root.classList.remove('is-animating', 'is-dragging');
    s.panel.style.transform = '';          // el reposo abierto lo define el CSS (.is-open)
    if (s.scrim) { s.scrim.style.opacity = ''; }
    s.pos = 0;
  }

  function sheetFinishClose(s) {
    window.clearTimeout(s.fadeTimer);
    s.fadeTimer = 0;
    s.spring.stop();
    s.spring.value = s.spring.target = 0;
    s.spring.velocity = 0;
    s.visible = false;
    s.open = false;
    s.root.classList.remove('is-open', 'is-animating', 'is-dragging', 'is-releasing');
    sheetClearInline(s);
    sheetUnrecede(s);
    s.root.setAttribute('aria-hidden', 'true');
    sheetDisengage(s, { focus: false });
    if (s.locked) { s.locked = false; unlock(); }
    fire(s.root, 'aura:sheet-close');
  }

  /* Muelle según el gesto: rebote (damping .8) solo si se soltó con impulso. */
  function sheetSpring(v) {
    var base = v != null && Math.abs(v) > FLICK_SPEED ? SHEET_FLICK_SPRING : SHEET_SPRING;
    var cfg = { damping: base.damping, response: base.response };
    if (v != null) { cfg.velocity = v; }
    return cfg;
  }

  function sheetOpen(s, trigger) {
    if (trigger) { s.trigger = trigger; } else if (!s.visible) { s.trigger = document.activeElement; }
    var wasOpen = s.open && s.visible;
    s.open = true;
    sheetEngage(s);

    if (reduced) {
      /* Sin muelle ni estilos en línea: el CSS hace un fundido de 200 ms. Si
         se estaba fundiendo tras un arrastre, vuelve desde donde está. */
      window.clearTimeout(s.fadeTimer);
      s.fadeTimer = 0;
      s.spring.stop();
      sheetClearInline(s);
      s.root.classList.remove('is-animating', 'is-dragging', 'is-releasing');
      s.root.classList.add('is-open');
      s.visible = true;
      s.pos = 0;
    } else if (!s.visible) {
      s.root.classList.add('is-open', 'is-animating');
      s.visible = true;
      sheetMeasure(s);
      sheetRecede(s);
      s.spring.stop();
      s.spring.value = s.size;             // arranca de donde está en pantalla: fuera, por su lado
      s.spring.velocity = 0;
      sheetRender(s, s.size);
      s.spring.setTarget(0, sheetSpring());
    } else if (s.spring.running || s.pos !== 0) {
      /* Reabrir en pleno cierre: mismo muelle, nuevo objetivo, misma velocidad. */
      s.root.classList.add('is-animating');
      s.spring.value = s.pos;
      s.spring.setTarget(0, sheetSpring());
    }
    sheetFocus(s);
    if (!wasOpen) { fire(s.root, 'aura:sheet-open'); }
  }

  function sheetClose(s, opts) {
    if (!s.visible) { return; }
    opts = opts || {};
    s.open = false;
    sheetDisengage(s, opts);
    if (reduced) { sheetFinishClose(s); return; }
    /* Mientras sale no bloquea la página, pero el panel se puede volver a coger. */
    s.root.style.pointerEvents = 'none';
    s.panel.style.pointerEvents = 'auto';
    s.root.classList.add('is-animating');
    /* En reposo, eje y tamaño se vuelven a leer: si la ventana cruzó los 768 px
       con la hoja abierta (girar una tableta), el cajón lateral ya es una hoja
       inferior y debe salir hacia abajo, con su altura real. En pleno vuelo se
       conservan: el muelle sigue el camino por el que iba. */
    if (!s.spring.running || !s.size) { sheetMeasure(s); }
    s.spring.value = s.pos;
    s.spring.setTarget(s.size, sheetSpring(opts.velocity));
  }

  /* «Reducir movimiento» y arrastre: el usuario mueve la hoja 1:1 (eso no es
     movimiento vestibular: lo hace él). Al soltar no hay muelle: si se cierra,
     se funde (200 ms) desde donde la dejó el dedo; si se queda, vuelve a su
     sitio en el acto con un fundido corto que suaviza el cambio. */
  function sheetReducedRelease(s, close) {
    s.root.classList.remove('is-dragging');
    if (close) {
      s.open = false;
      sheetDisengage(s, {});
      s.root.style.pointerEvents = 'none';
      s.root.classList.add('is-releasing');   // conserva el transform en línea mientras se funde
      s.root.classList.remove('is-open');
      window.clearTimeout(s.fadeTimer);
      s.fadeTimer = window.setTimeout(function () { if (!s.open) { sheetFinishClose(s); } }, REDUCED_FADE + 20);
      return;
    }
    sheetClearInline(s);
    s.pos = 0;
    safe(function () {
      if (s.panel.animate) { s.panel.animate([{ opacity: 0.7 }, { opacity: 1 }], { duration: 150, easing: 'ease' }); }
    });
  }

  function initSheet(root) {
    if (!root || root._auraSheet) { return root ? root._auraSheet : null; }
    var panel = root.querySelector('.aura-sheet__panel');
    if (!panel) { return null; }
    pruneDetached();
    relocate(root);                       // fuera de <main>: la página puede retroceder sin arrastrarla

    var scrim = null;
    each(root.children, function (c) { if (c.classList && c.classList.contains('aura-scrim')) { scrim = c; } });
    if (!scrim) {
      scrim = document.createElement('div');
      scrim.className = 'aura-scrim';
      scrim.setAttribute('data-aura-sheet-close', '');
      root.insertBefore(scrim, root.firstChild);
    }
    if (!panel.querySelector('.aura-sheet__grabber')) {
      var grabber = document.createElement('div');
      grabber.className = 'aura-sheet__grabber';
      grabber.setAttribute('aria-hidden', 'true');
      panel.insertBefore(grabber, panel.firstChild);
    }
    if (!panel.hasAttribute('tabindex')) { panel.setAttribute('tabindex', '-1'); }
    if (!root.hasAttribute('aria-hidden')) { root.setAttribute('aria-hidden', 'true'); }

    var s = {
      root: root, panel: panel, scrim: scrim,
      open: false, visible: false, engaged: false, locked: false,
      pos: 0, size: 0, axis: 'y', trigger: null, layer: null, release: null, spring: null
    };

    s.spring = spring({
      from: 0, to: 0, damping: SHEET_SPRING.damping, response: SHEET_SPRING.response, precision: 0.2, autoStart: false,
      onUpdate: function (value) {
        if (!s.visible) { return; }
        sheetRender(s, value);
        /* Al cerrar, en cuanto está fuera de pantalla ya no hay nada que animar. */
        if (!s.open && value >= s.size) { sheetFinishClose(s); }
      },
      onRest: function () {
        if (!s.visible) { return; }
        if (s.open) { sheetFinishOpen(s); } else { sheetFinishClose(s); }
      }
    });

    var guard = clickGuard(panel);

    /* Con «reducir movimiento» también se arrastra (el tirador lo promete):
       solo cambia cómo termina (sheetReducedRelease). */
    dragGesture(panel, {
      axis: function () { sheetMeasure(s); return s.axis; },
      accept: function (e) {
        if (!s.visible || (reduced && !s.open)) { return false; }
        if (closest(e.target, 'input, textarea, select, [contenteditable="true"], [data-aura-no-drag]')) { return false; }
        s.fromHandle = !!closest(e.target, '.aura-sheet__grabber, .aura-sheet__header');
        s.dragBody = closest(e.target, '.aura-sheet__body');
        /* Con ratón solo se arrastra desde el tirador o la cabecera (el cuerpo es para seleccionar texto). */
        return s.fromHandle || e.pointerType !== 'mouse';
      },
      /* Desde el contenido solo es nuestro si va en el sentido del cierre y no hay scroll que deshacer. */
      allow: function (main) {
        if (s.fromHandle) { return true; }
        if (main <= 0) { return false; }
        return s.axis === 'x' || !s.dragBody || s.dragBody.scrollTop <= 0;
      },
      grab: function (e) {
        if (reduced || !s.spring.running || closest(e.target, 'a, button, label')) { return false; }
        s.spring.stop();                 // se agarra en pleno vuelo, donde esté
        return true;
      },
      start: function (g) {
        s.spring.stop();
        s.root.classList.add('is-dragging', 'is-animating');
        /* Posición real equivalente a la que se ve (por si se agarra durante un rebote). */
        g.base = s.pos < 0 ? -unrubberband(-s.pos, s.size) : s.pos;
      },
      move: function (g) {
        var raw = g.base + g.delta;
        /* Hacia el lado contrario al cierre no hay nada: resistencia progresiva. */
        var shown = raw < 0 ? -rubberband(-raw, s.size) : Math.min(raw, s.size * 1.1);
        sheetRender(s, shown);
        g.track(shown);
      },
      end: function (g) {
        s.root.classList.remove('is-dragging');
        if (g.moved) { guard(); }
        var v = g.velocity();
        /* Con impulso decide el SIGNO de la velocidad; sin impulso, dónde acabaría
           (posición + proyección) respecto a la mitad del recorrido. */
        var close = Math.abs(v) > FLICK_SPEED ? v > 0 : (s.pos + project(v)) > s.size / 2;
        if (reduced) {
          s.root.classList.remove('is-animating');
          sheetReducedRelease(s, close);
          return;
        }
        s.spring.value = s.pos;
        if (close) {
          sheetClose(s, { velocity: v });
        } else {
          s.open = true;
          sheetEngage(s);
          s.root.classList.add('is-animating');
          s.spring.setTarget(0, sheetSpring(v));   // rebote solo si se soltó con impulso
        }
      }
    });

    root.addEventListener('click', function (e) {
      if (closest(e.target, '[data-aura-sheet-close]')) { e.preventDefault(); sheetClose(s, {}); }
    });

    s.api = {
      el: root,
      open: function (trigger) { safe(function () { sheetOpen(s, $(trigger)); }); return s.api; },
      close: function () { safe(function () { sheetClose(s, {}); }); return s.api; },
      toggle: function (trigger) { if (s.open) { s.api.close(); } else { s.api.open(trigger); } return s.api; },
      isOpen: function () { return s.open; }
    };
    root._auraSheet = s.api;
    root._auraSheetState = s;
    allSheets.push(s);
    return s.api;
  }

  function initSheetTriggers() {
    document.addEventListener('click', function (e) {
      var trigger = closest(e.target, '[data-aura-sheet-open]');
      if (!trigger) { return; }
      var api = initSheet(document.getElementById(trigger.getAttribute('data-aura-sheet-open')));
      if (!api) { return; }
      e.preventDefault();
      api.open(trigger);
    });

    /* Si el usuario activa «reducir movimiento» a media animación, se termina en el acto. */
    reduceListeners.push(function (on) {
      if (!on) { return; }
      allSheets.forEach(function (s) {
        if (!s.visible) { return; }
        s.spring.stop();
        sheetUnrecede(s);
        if (s.open) { sheetFinishOpen(s); } else { sheetFinishClose(s); }
      });
      if (recede.owner === 'search') { recedeEnd('search'); }
    });
  }

  /** Controlador de una hoja: AURA.ui.sheet('id' | elemento) → { open, close, toggle, isOpen, el } */
  ui.sheet = function (target) { return safe(function () { return initSheet($(target)); }) || null; };


  /* ------------------------------------------------------------------------
     8. Carrusel
     `pos` es el desplazamiento en px (0 … max). La pista se mueve con
     translate3d(-pos). Sin transiciones CSS: arrastre directo y muelle.
     ------------------------------------------------------------------------ */

  var CAROUSEL_RESPONSE = 0.4;
  var CAROUSEL_MAX_RESPONSE = 0.6;
  var CAROUSEL_DECELERATION = 0.99;   // «más ágil» de la skill: un carrusel encaja por diapositivas, no hace scroll libre
  var CAROUSEL_FLICK = 200;           // px/s: por encima, manda el SIGNO de la velocidad (una diapositiva en ese sentido)
  var allCarousels = [];

  function initCarousel(root) {
    if (!root || root._auraCarousel) { return root ? root._auraCarousel : null; }
    var viewport = root.querySelector('.aura-carousel__viewport');
    var track = root.querySelector('.aura-carousel__track');
    if (!viewport || !track) { return null; }
    pruneDetached();

    /* index = punto de ajuste más cercano (sigue al dedo); announced = el último comunicado. */
    var c = { root: root, pos: 0, max: 0, width: 1, snaps: [0], offsets: [0], index: 0, announced: 0, slides: [] };
    var controls, dotsBox, counter, prevBtn, nextBtn, status;
    var dots = [];
    var wheelTimer = 0;
    var wheelRaw = null;                  // posición real durante un gesto de rueda (la que se ve lleva goma)

    root.classList.add('is-ready');
    viewport.scrollLeft = 0;
    if (!viewport.hasAttribute('tabindex')) { viewport.setAttribute('tabindex', '0'); }
    /* aria-roledescription solo vale en un elemento con rol (ARIA 1.2): si el
       autor no puso role="region", se pone aquí. */
    if (root.hasAttribute('aria-roledescription') && !root.hasAttribute('role')) { root.setAttribute('role', 'region'); }

    /* --- Controles --- */
    controls = root.querySelector('.aura-carousel__controls');
    if (!controls) {
      controls = document.createElement('div');
      controls.className = 'aura-carousel__controls';
      controls.innerHTML =
        '<div class="aura-carousel__dots"></div>' +
        '<button class="aura-icon-btn aura-icon-btn--solid" type="button" data-aura-carousel-prev aria-label="Anterior"><i class="bi bi-chevron-left" aria-hidden="true"></i></button>' +
        '<button class="aura-icon-btn aura-icon-btn--solid" type="button" data-aura-carousel-next aria-label="Siguiente"><i class="bi bi-chevron-right" aria-hidden="true"></i></button>';
      root.appendChild(controls);
    }
    dotsBox = controls.querySelector('.aura-carousel__dots');
    /* Si los puntos (44 px en táctil) no caben, se cambian por un contador
       «3 de 9»: las flechas siguen siendo los controles y el estado se anuncia. */
    counter = controls.querySelector('.aura-carousel__counter');
    if (!counter && dotsBox) {
      counter = document.createElement('p');
      counter.className = 'aura-carousel__counter';
      counter.setAttribute('aria-hidden', 'true');
      dotsBox.parentNode.insertBefore(counter, dotsBox.nextSibling);
    }
    prevBtn = root.querySelector('[data-aura-carousel-prev]');
    nextBtn = root.querySelector('[data-aura-carousel-next]');
    status = root.querySelector('[data-aura-carousel-status]');
    if (!status) {
      status = document.createElement('p');
      status.className = 'visually-hidden';
      status.setAttribute('aria-live', 'polite');
      status.setAttribute('data-aura-carousel-status', '');
      root.appendChild(status);
    }

    function render(pos) {
      c.pos = pos;
      track.style.transform = 'translate3d(' + (-pos).toFixed(2) + 'px, 0, 0)';
    }

    var sp = spring({
      from: 0, to: 0, damping: 1, response: CAROUSEL_RESPONSE, precision: 0.2, autoStart: false,
      onUpdate: render,
      onRest: function () { root.classList.remove('is-animating'); }
    });

    function nearest(pos) {
      var best = 0;
      var dist = Infinity;
      for (var i = 0; i < c.snaps.length; i++) {
        var d = Math.abs(c.snaps[i] - pos);
        if (d < dist) { dist = d; best = i; }
      }
      return best;
    }

    /* Primera y última diapositiva que se ven enteras en un punto de ajuste (para
       el texto de estado). Con --bleed cuenta también lo que se ve entero en el
       margen hasta el borde de la pantalla (c.padL / c.padR). */
    function slideAt(index) {
      var snap = c.snaps[index] - (c.padL || 0);
      for (var i = 0; i < c.offsets.length; i++) { if (c.offsets[i] >= snap - 1) { return i; } }
      return c.offsets.length - 1;
    }
    function lastSlideAt(index) {
      var right = c.snaps[index] + c.width + (c.padR || 0) + 1;
      var last = slideAt(index);
      for (var i = last + 1; i < c.offsets.length; i++) {
        if (c.offsets[i] + c.slides[i].offsetWidth <= right) { last = i; } else { break; }
      }
      return last;
    }

    /* Una posición por diapositiva: «Diapositiva 2 de 5». Si caben varias por
       vista: «Posición 2 de 3: diapositivas 4 a 6 de 9». */
    function label(index) {
      var total = c.snaps.length;
      if (!c.slides.length) { return ''; }
      if (total === c.slides.length) { return 'Diapositiva ' + (index + 1) + ' de ' + total; }
      var first = slideAt(index) + 1;
      var last = lastSlideAt(index) + 1;
      return 'Posición ' + (index + 1) + ' de ' + total + ': ' +
        (last > first ? 'diapositivas ' + first + ' a ' + last : 'diapositiva ' + first) + ' de ' + c.slides.length;
    }

    function buildDots() {
      if (!dotsBox) { dots = []; return; }
      var total = c.snaps.length;
      if (dots.length === total && dotsBox.children.length === total) { return; }
      var out = '';
      for (var i = 0; i < total; i++) {
        out += '<button class="aura-carousel__dot" type="button" aria-label="Ir a la ' +
          (total === c.slides.length ? 'diapositiva ' : 'posición ') + (i + 1) + ' de ' + total + '"></button>';
      }
      dotsBox.innerHTML = out;
      dots = toArray(dotsBox.children);
    }

    function paint(announce) {
      dots.forEach(function (d, i) {
        var on = i === c.index;
        d.classList.toggle('is-active', on);
        if (on) { d.setAttribute('aria-current', 'true'); } else { d.removeAttribute('aria-current'); }
      });
      var atStart = c.index <= 0;
      var atEnd = c.index >= c.snaps.length - 1;
      /* Un botón que se desactiva con el foco puesto lo perdería: se pasa al otro. */
      if (prevBtn && atStart && document.activeElement === prevBtn) { focusEl(nextBtn && !atEnd ? nextBtn : viewport); }
      if (nextBtn && atEnd && document.activeElement === nextBtn) { focusEl(prevBtn && !atStart ? prevBtn : viewport); }
      if (prevBtn) { prevBtn.disabled = atStart; }
      if (nextBtn) { nextBtn.disabled = atEnd; }
      if (counter) { counter.textContent = (c.index + 1) + ' de ' + c.snaps.length; }
      if (announce && status) { status.textContent = label(c.index); }
    }

    /* Puntos o contador: los puntos no encogen (44 × 44 px en táctil); si no
       caben en la fila, se muestra el contador en su lugar. */
    function fitDots() {
      if (!dotsBox || !counter) { return; }
      controls.classList.remove('is-counter');
      if (controls.hidden || !dots.length) { return; }
      controls.classList.toggle('is-counter', dotsBox.scrollWidth > dotsBox.clientWidth + 1);
    }

    /* Las fotos de las diapositivas que aún no se ven se piden en cuanto el
       carrusel se acerca a la pantalla (a una pantalla de distancia). La carga
       diferida del navegador no ve lo que queda fuera de la ventana del
       carrusel (overflow recortado) y no las pedía hasta que asomaban: llegaban
       a mitad del gesto y la diapositiva entraba vacía. Así, al arrastrar,
       cada diapositiva llega con su foto. */
    var near = false;
    function primeImages() {
      if (!near) { return; }
      each(track.querySelectorAll('img[loading="lazy"]'), function (img) { img.loading = 'eager'; });
    }
    safe(function () {
      if (typeof window.IntersectionObserver !== 'function') { near = true; return; }
      var io = new window.IntersectionObserver(function (entries) {
        if (!entries.some(function (en) { return en.isIntersecting; })) { return; }
        near = true;
        io.disconnect();
        primeImages();
      }, { rootMargin: '100% 0px' });
      io.observe(root);
    });

    function measure() {
      primeImages();                      // también lo que la página haya metido después en la pista
      c.slides = toArray(track.children);
      c.width = Math.max(1, track.clientWidth);
      var cs = safe(function () { return window.getComputedStyle(viewport); });
      c.padL = cs ? Math.max(0, num(parseFloat(cs.paddingLeft), 0) - 8) : 0;    // 8 px = el relleno normal de la ventana
      c.padR = cs ? Math.max(0, num(parseFloat(cs.paddingRight), 0) - 8) : 0;
      c.max = Math.max(0, track.scrollWidth - track.clientWidth);
      var first = c.slides.length ? c.slides[0].offsetLeft : 0;
      c.offsets = c.slides.map(function (sl) { return sl.offsetLeft - first; });
      var snaps = [];
      c.offsets.forEach(function (o) {
        var v = Math.min(o, c.max);
        if (!snaps.length || Math.abs(snaps[snaps.length - 1] - v) > 1) { snaps.push(v); }
      });
      c.snaps = snaps.length ? snaps : [0];
      c.index = clamp(c.index, 0, c.snaps.length - 1);
      controls.hidden = c.max <= 0;       // si todo cabe, no hay nada que controlar
      buildDots();
      fitDots();
    }

    /* Con «reducir movimiento» no hay desplazamiento: un fundido corto marca el cambio. */
    function fade() {
      safe(function () {
        if (track.animate) { track.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 200, easing: 'ease' }); }
      });
    }

    function goTo(index, opts) {
      opts = opts || {};
      index = clamp(Math.round(num(index, 0)), 0, c.snaps.length - 1);
      var changed = index !== c.announced;
      c.index = c.announced = index;
      paint(true);
      var target = c.snaps[index];
      if (reduced || opts.immediate) {
        sp.jump(target);
        root.classList.remove('is-animating');
        if (reduced && changed && !opts.immediate) { fade(); }
      } else {
        root.classList.add('is-animating');
        sp.value = c.pos;                 // siempre desde lo que hay en pantalla
        var cfg = { damping: opts.damping != null ? opts.damping : 1, response: opts.response || CAROUSEL_RESPONSE };
        if (opts.velocity != null) { cfg.velocity = opts.velocity; }
        sp.setTarget(target, cfg);        // sin `velocity`, conserva la que lleve
      }
      if (changed) { fire(root, 'aura:carousel-change', { index: c.index, count: c.snaps.length }); }
    }

    function refresh() {
      measure();
      c.announced = c.index;
      sp.jump(c.snaps[c.index]);
      root.classList.remove('is-animating');
      paint(false);
      /* Si cambió el contenido (la página llenó la pista después), el texto de
         estado se pone al día sin anunciarlo: no es un cambio del usuario. */
      var key = c.slides.length + '/' + c.snaps.length;
      if (status && key !== c.statusKey) {
        c.statusKey = key;
        status.removeAttribute('aria-live');
        status.textContent = label(c.index);
        status.setAttribute('aria-live', 'polite');
      }
    }

    /* Lo que se ve para una posición real: 1:1 dentro de los límites, goma fuera. */
    function present(raw) {
      if (raw < 0) { return -rubberband(-raw, c.width); }
      if (raw > c.max) { return c.max + rubberband(raw - c.max, c.width); }
      return raw;
    }
    function toRaw(shown) {
      if (shown < 0) { return -unrubberband(-shown, c.width); }
      if (shown > c.max) { return c.max + unrubberband(shown - c.max, c.width); }
      return shown;
    }

    var guard = clickGuard(viewport);

    dragGesture(viewport, {
      axis: function () { return 'x'; },
      accept: function (e) {
        return !closest(e.target, 'input, textarea, select, [contenteditable="true"], [data-aura-no-drag]');
      },
      grab: function () {
        if (!sp.running) { return false; }
        sp.stop();                        // agarrado en pleno vuelo: se queda bajo el dedo
        root.classList.remove('is-animating');
        guard();                          // como en un scroll: tocar para parar no abre enlaces
        return true;
      },
      start: function (g) {
        measure();
        sp.stop();
        window.clearTimeout(wheelTimer);
        wheelRaw = null;
        root.classList.add('is-dragging');
        g.base = toRaw(c.pos);
      },
      move: function (g) {
        var shown = present(g.base - g.delta);     // 1:1 con el dedo desde el punto de agarre
        render(shown);
        g.track(shown);
        var i = nearest(shown);
        if (i !== c.index) { c.index = i; paint(false); }
      },
      end: function (g) {
        root.classList.remove('is-dragging');
        if (g.moved || g.inFlight) { guard(); }
        var v = g.velocity();
        var pos = clamp(c.pos, 0, c.max);
        var target;
        if (Math.abs(v) > CAROUSEL_FLICK) {
          /* Golpe: una diapositiva en el sentido del gesto, nunca más (el
             siguiente punto de ajuste por delante de donde se soltó). */
          target = v > 0 ? nextSnap(pos) : prevSnap(pos);
        } else {
          /* Sin golpe: el punto más cercano a donde iba (proyección ágil),
             como mucho uno más allá del que hay bajo el dedo. */
          var here = nearest(pos);
          target = clamp(nearest(clamp(pos + project(v, CAROUSEL_DECELERATION), 0, c.max)), here - 1, here + 1);
        }
        target = clamp(target, 0, c.snaps.length - 1);
        /* Cesión de velocidad (§5). Si el muelle tuviera que ir mucho más
           deprisa que el dedo para llegar (un tirón tras soltar), se alarga su
           respuesta: nunca acelera por encima de ~1,5 veces lo que llevaba el
           gesto. Rebote (damping .8) solo con impulso. */
        var dist = Math.abs(c.snaps[target] - c.pos);
        var response = CAROUSEL_RESPONSE;
        var speed = Math.abs(v);
        var pulls = speed > CAROUSEL_FLICK && (2 * Math.PI / response) * dist > 1.5 * speed;
        if (pulls) { response = clamp((2 * Math.PI * dist) / (1.5 * speed), CAROUSEL_RESPONSE, CAROUSEL_MAX_RESPONSE); }
        /* Rebote solo si el impulso del dedo basta para llegar (lo lleva él);
           si el muelle tiene que tirar, amortiguación crítica: nada de latigazo. */
        goTo(target, { velocity: v, damping: speed > CAROUSEL_FLICK && !pulls ? 0.8 : 1, response: response });
      }
    });

    /* Siguiente / anterior punto de ajuste estrictamente por delante / por detrás de `pos`. */
    function nextSnap(pos) {
      for (var i = 0; i < c.snaps.length; i++) { if (c.snaps[i] > pos + 1) { return i; } }
      return c.snaps.length - 1;
    }
    function prevSnap(pos) {
      for (var i = c.snaps.length - 1; i >= 0; i--) { if (c.snaps[i] < pos - 1) { return i; } }
      return 0;
    }

    viewport.addEventListener('dragstart', function (e) { e.preventDefault(); });
    viewport.addEventListener('scroll', function () { if (viewport.scrollLeft) { viewport.scrollLeft = 0; } });

    /* Trackpad / rueda horizontal: desplazamiento directo (1:1, con goma en
       los extremos como el dedo) y, al parar, ajuste con muelle crítico desde
       el reposo: la velocidad del muelle que se interrumpió no se reutiliza
       (daría un tirón hacia el lado de antes). */
    safe(function () {
      viewport.addEventListener('wheel', function (e) {
        if (c.max <= 0 || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) { return; }
        e.preventDefault();
        sp.stop();
        sp.velocity = 0;
        root.classList.remove('is-animating');
        /* Desde lo que hay en pantalla: si otra cosa movió la pista (un muelle,
           goTo), la posición real se vuelve a leer. */
        if (wheelRaw === null || Math.abs(present(wheelRaw) - c.pos) > 0.5) { wheelRaw = toRaw(c.pos); }
        wheelRaw = clamp(wheelRaw + (e.deltaMode === 1 ? e.deltaX * 16 : e.deltaX), -c.width, c.max + c.width);
        render(present(wheelRaw));
        var i = nearest(clamp(c.pos, 0, c.max));
        if (i !== c.index) { c.index = i; paint(false); }
        window.clearTimeout(wheelTimer);
        wheelTimer = window.setTimeout(function () {
          wheelRaw = null;
          goTo(nearest(clamp(c.pos, 0, c.max)), { velocity: 0, damping: 1 });
        }, 140);
      }, { passive: false });
    });

    root.addEventListener('click', function (e) {
      if (closest(e.target, '[data-aura-carousel-prev]')) { goTo(c.index - 1); return; }
      if (closest(e.target, '[data-aura-carousel-next]')) { goTo(c.index + 1); return; }
      var dot = closest(e.target, '.aura-carousel__dot');
      if (dot) { goTo(dots.indexOf(dot)); }
    });

    root.addEventListener('keydown', function (e) {
      if (c.max <= 0 || e.altKey || e.ctrlKey || e.metaKey) { return; }
      if (closest(e.target, 'input, textarea, select, [contenteditable="true"]')) { return; }
      var target = null;
      if (e.key === 'ArrowRight') { target = c.index + 1; }
      else if (e.key === 'ArrowLeft') { target = c.index - 1; }
      else if (e.key === 'Home') { target = 0; }
      else if (e.key === 'End') { target = c.snaps.length - 1; }
      if (target === null) { return; }
      e.preventDefault();
      goTo(target);
    });

    /* Foco de teclado en una diapositiva que no se ve entera: se trae a la vista. */
    track.addEventListener('focusin', function (e) {
      viewport.scrollLeft = 0;
      var keyboard = safe(function () { return e.target.matches(':focus-visible'); });
      if (!keyboard) { return; }
      for (var i = 0; i < c.slides.length; i++) {
        if (!c.slides[i].contains(e.target)) { continue; }
        var left = c.offsets[i];
        var right = left + c.slides[i].offsetWidth;
        if (left < c.pos - 1 || right > c.pos + c.width + 1) { goTo(nearest(Math.min(left, c.max))); }
        break;
      }
    });

    /* Un ancla dentro de una diapositiva que no se ve (#nota, location.hash, un
       enlace de la página): el carrusel va a esa diapositiva antes del salto. */
    function goToTarget() {
      var id = safe(function () { return decodeURIComponent(String(window.location.hash || '').slice(1)); });
      var target = id ? document.getElementById(id) : null;
      if (!target || !track.contains(target)) { return; }
      for (var i = 0; i < c.slides.length; i++) {
        if (c.slides[i].contains(target)) { goTo(nearest(Math.min(c.offsets[i], c.max)), { immediate: true }); break; }
      }
    }
    window.addEventListener('hashchange', function () { safe(goToTarget); });

    var ro = null;
    var onResize = function () { safe(refresh); };
    safe(function () {
      if (typeof window.ResizeObserver === 'function') {
        ro = new window.ResizeObserver(onResize);
        ro.observe(viewport);
      } else {
        window.addEventListener('resize', onResize);
      }
    });
    /* Si la página quita el carrusel del DOM (lo repinta con innerHTML), se suelta todo. */
    c.destroy = function () {
      sp.stop();
      window.clearTimeout(wheelTimer);
      if (ro) { ro.disconnect(); ro = null; } else { window.removeEventListener('resize', onResize); }
    };

    refresh();                            // pinta puntos y pone el estado inicial (sin anunciarlo)
    safe(goToTarget);                     // la página se abrió con #ancla dentro de una diapositiva

    c.api = {
      el: root,
      goTo: function (i, o) { safe(function () { goTo(i, o); }); return c.api; },
      next: function () { return c.api.goTo(c.index + 1); },
      prev: function () { return c.api.goTo(c.index - 1); },
      refresh: function () { safe(refresh); return c.api; },
      index: function () { return c.index; },
      count: function () { return c.snaps.length; }
    };
    c.settle = function () { sp.jump(c.snaps[clamp(c.index, 0, c.snaps.length - 1)]); root.classList.remove('is-animating'); };
    root._auraCarousel = c.api;
    allCarousels.push(c);
    return c.api;
  }

  reduceListeners.push(function (on) {
    pruneDetached();
    if (on) { allCarousels.forEach(function (c) { safe(c.settle); }); }
  });

  /* Carruseles y hojas que ya no están en el documento (la página los repintó
     con innerHTML): se paran sus muelles, se desconectan sus observadores y,
     si una hoja se quitó abierta, se devuelve la página a su estado (sin
     bloqueo de scroll, sin inert, sin capa en la pila de Esc). */
  function pruneDetached() {
    allSheets = allSheets.filter(function (s) {
      if (document.contains(s.root)) { return true; }
      safe(function () {
        s.spring.stop();
        window.clearTimeout(s.fadeTimer);
        sheetUnrecede(s);
        if (s.engaged) {
          s.engaged = false;
          removeLayer(s.layer);
          if (s.release) { s.release(); s.release = null; }
        }
        if (s.locked) { s.locked = false; unlock(); }
      });
      return false;
    });
    allCarousels = allCarousels.filter(function (c) {
      if (document.contains(c.root)) { return true; }
      safe(c.destroy);
      return false;
    });
  }

  /** Controlador de un carrusel: AURA.ui.carousel(el | selector) → { goTo, next, prev, refresh, index, count, el } */
  ui.carousel = function (target) { return safe(function () { return initCarousel($(target)); }) || null; };


  /* ------------------------------------------------------------------------
     8 bis. Control segmentado: pastilla que se desliza   [.aura-segmented]
     La selección es una sola pastilla (.aura-segmented__thumb) que viaja de
     un ítem a otro con un muelle crítico, desde donde esté en pantalla
     (interrumpible), en lugar de saltar. En las variantes de radios y de
     botones también se arrastra: 1:1 con el dedo, goma en los extremos y, al
     soltar, el ítem más cercano a donde iba (proyección), que se activa con
     click() (las páginas no cambian: reciben su `change` o su `click`). La
     pastilla sigue al estado, lo ponga quien lo ponga (:checked —también
     `input.checked = …` desde JS—, .is-active, aria-current, aria-pressed,
     aria-selected). Sin JS, el ítem activo pinta su propio fondo, como antes.

     Solo se anima transform (skill §11): el avance es translate3d y el ancho
     que acompaña al avance (los ítems no miden lo mismo) es un scaleX sobre
     el ancho real de la caja, que solo se escribe en reposo. Con texto grande
     el control se reparte en filas (.is-wrapped) en lugar de esconder
     opciones: la pastilla viaja también en vertical, con su propio muelle
     (X e Y independientes, §3), y deja de arrastrarse (§15, §16).
     ------------------------------------------------------------------------ */

  var SEG_SPRING = { damping: 1, response: 0.35 };
  var SEG_ON = '.is-active, [aria-current]:not([aria-current="false"]), [aria-pressed="true"], [aria-selected="true"]';
  var CHECKED = safe(function () { return Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked'); });

  function segItems(el) {
    return toArray(el.children).filter(function (c) { return c.classList && c.classList.contains('aura-segmented__item') && !c.hidden; });
  }
  function segActive(el) {
    var items = segItems(el);
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.matches(SEG_ON) || it.querySelector('input:checked')) { return it; }
    }
    return null;
  }

  function initSegmented(el) {
    if (!el || !el.classList) { return null; }
    if (el._auraSeg) { el._auraSeg.sync(true); return el._auraSeg; }   // ya iniciado: se recoloca la pastilla
    var st = { x: 0, y: 0, w: 0, base: 0, xFrom: 0, span: 0, wFrom: 0, wTo: 0, active: null, placed: false, wrapped: false };
    var thumb = document.createElement('span');
    thumb.className = 'aura-segmented__thumb';
    thumb.setAttribute('aria-hidden', 'true');
    el.insertBefore(thumb, el.firstChild);
    el.classList.add('has-thumb');
    var draggable = !el.querySelector('a.aura-segmented__item');

    /* Ancho real de la caja: solo en reposo (es maquetación). */
    function setBase(w) {
      if (Math.abs(w - st.base) < 0.01) { return; }
      st.base = w;
      thumb.style.width = w.toFixed(2) + 'px';
    }
    /* Pinta con transform: avance (x, y) y ancho visible (scaleX sobre el
       ancho de la caja, con origen en el centro: se compensa en la x). */
    function paint() {
      var s = st.base > 0 ? st.w / st.base : 1;
      var tx = st.x - st.base * (1 - s) / 2;
      thumb.style.transform = 'translate3d(' + tx.toFixed(2) + 'px, ' + st.y.toFixed(2) + 'px, 0)' +
        (Math.abs(s - 1) > 0.0005 ? ' scaleX(' + s.toFixed(4) + ')' : '');
    }
    function render(x) {
      st.x = x;
      /* El ancho acompaña al avance (los ítems no miden lo mismo). */
      var w = st.wTo;
      if (Math.abs(st.span) > 0.5) { w = st.wFrom + (st.wTo - st.wFrom) * clamp((x - st.xFrom) / st.span, 0, 1); }
      st.w = w;
      paint();
    }
    /* En reposo, el ancho de la caja pasa a ser el del ítem y la escala vuelve a 1. */
    function settle() {
      if (sp.running || spY.running) { return; }
      st.w = st.wTo;
      setBase(st.wTo);
      paint();
    }

    var sp = spring({ from: 0, to: 0, damping: SEG_SPRING.damping, response: SEG_SPRING.response, precision: 0.1, autoStart: false, onUpdate: render, onRest: settle });
    var spY = spring({ from: 0, to: 0, damping: SEG_SPRING.damping, response: SEG_SPRING.response, precision: 0.1, autoStart: false,
      onUpdate: function (y) { st.y = y; paint(); }, onRest: settle });

    function currentWidth() { return st.w || st.base || 0; }

    /* Con texto grande (o una ventana estrecha) el control no cabe en una
       fila: el CSS lo reparte en varias (flex-wrap) y aquí se marca
       .is-wrapped, que solo cambia el radio del contenedor: medir no mueve
       nada más (ningún bucle de ResizeObserver). */
    function measureWrap() {
      var items = segItems(el);
      var wrapped = false;
      for (var i = 1; i < items.length; i++) { if (Math.abs(items[i].offsetTop - items[0].offsetTop) > 1) { wrapped = true; break; } }
      st.wrapped = wrapped;
      el.classList.toggle('is-wrapped', wrapped);
    }

    function place(item, opts) {
      opts = opts || {};
      st.active = item;
      if (!item || !item.offsetWidth) { thumb.style.visibility = 'hidden'; st.placed = false; return; }
      thumb.style.visibility = '';
      thumb.style.height = item.offsetHeight + 'px';
      var x = item.offsetLeft;
      var y = item.offsetTop;
      var w = item.offsetWidth;
      if (!opts.animate || !st.placed || reduced) {
        sp.stop(); spY.stop();
        st.xFrom = x; st.span = 0; st.wFrom = st.wTo = w;
        sp.value = sp.target = x; sp.velocity = 0;
        spY.value = spY.target = y; spY.velocity = 0;
        st.x = x; st.y = y; st.w = w;
        setBase(w);
        paint();
        /* Con «reducir movimiento», sin desplazamiento: aparece en su sitio con un fundido corto. */
        if (opts.animate && st.placed && reduced) {
          safe(function () { if (thumb.animate) { thumb.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 150, easing: 'ease' }); } });
        }
        st.placed = true;
        return;
      }
      st.xFrom = st.x; st.wFrom = currentWidth() || w; st.wTo = w; st.span = x - st.x;
      if (!st.base) { setBase(w); }
      sp.value = st.x;
      var cfg = { damping: SEG_SPRING.damping, response: SEG_SPRING.response };
      if (opts.velocity != null) { cfg.velocity = opts.velocity; }
      sp.setTarget(x, cfg);
      /* Otra fila (control repartido): Y con su propio muelle, desde donde esté. */
      if (Math.abs(y - st.y) > 0.5 || spY.running) {
        spY.value = st.y;
        spY.setTarget(y, { damping: SEG_SPRING.damping, response: SEG_SPRING.response });
      }
    }

    function sync(animate) {
      if (thumb.parentNode !== el) { el.insertBefore(thumb, el.firstChild); }   // la página repintó el control
      watchInputs();
      if (el.classList.contains('is-dragging')) { return; }                     // mientras se arrastra manda el dedo
      var item = segActive(el);
      thumb.classList.toggle('is-pressed', !!item && item.classList.contains('is-pressed'));
      if (item === st.active && st.placed && !animate) { return; }
      if (item === st.active && st.placed && !sp.running && !spY.running &&
        Math.abs(st.x - item.offsetLeft) < 0.5 && Math.abs(st.y - item.offsetTop) < 0.5) { return; }
      place(item, { animate: animate !== false });
    }

    /* `input.checked = true` desde JS no lanza ningún evento ni toca atributos:
       se intercepta en cada radio del control (solo en estas instancias) para
       que la pastilla siga también a lo que marque la página por código. */
    var queued = false;
    function queueSync() {
      if (queued) { return; }
      queued = true;
      var run = function () { queued = false; safe(function () { sync(true); }); };
      if (window.Promise) { window.Promise.resolve().then(run); } else { window.setTimeout(run, 0); }
    }
    function watchInputs() {
      if (!CHECKED || !CHECKED.set) { return; }
      each(el.querySelectorAll('input[type="radio"], input[type="checkbox"]'), function (input) {
        if (input._auraSegWatch) { return; }
        input._auraSegWatch = true;
        safe(function () {
          Object.defineProperty(input, 'checked', {
            configurable: true,
            enumerable: CHECKED.enumerable,
            get: function () { return CHECKED.get.call(this); },
            set: function (v) { CHECKED.set.call(this, v); queueSync(); }
          });
        });
      });
    }

    el.addEventListener('change', function () { safe(function () { sync(true); }); });
    safe(function () {
      new window.MutationObserver(function () { safe(function () { measureWrap(); sync(true); }); })
        .observe(el, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden', 'aria-current', 'aria-pressed', 'aria-selected'] });
    });
    /* Cambios de tamaño (fuentes, giro, texto grande): se reparte en filas si
       hace falta y se recoloca sin animar. */
    safe(function () {
      if (typeof window.ResizeObserver === 'function') {
        new window.ResizeObserver(function () {
          safe(function () {
            measureWrap();
            if (!sp.running && !spY.running && !el.classList.contains('is-dragging')) { place(segActive(el), { animate: false }); }
          });
        }).observe(el);
      }
    });

    if (draggable) {
      var guard = clickGuard(el);
      dragGesture(el, {
        axis: function () { return 'x'; },
        accept: function (e) {
          var item = closest(e.target, '.aura-segmented__item');
          /* Solo se arrastra la pastilla (el ítem elegido), en una sola fila y si
             el control no desborda (entonces el gesto es scroll). */
          return !!item && item === segActive(el) && !st.wrapped && el.scrollWidth <= el.clientWidth + 1 && !item.querySelector('input:disabled');
        },
        start: function (g) {
          sp.stop(); spY.stop();
          el.classList.add('is-dragging');
          st.span = 0; st.wFrom = st.wTo = currentWidth();
          g.base = st.x;
        },
        move: function (g) {
          var items = segItems(el);
          var min = items[0].offsetLeft;
          var max = items[items.length - 1].offsetLeft + items[items.length - 1].offsetWidth - currentWidth();
          var raw = g.base + g.delta;
          var shown = raw < min ? min - rubberband(min - raw, el.clientWidth) : (raw > max ? max + rubberband(raw - max, el.clientWidth) : raw);
          render(shown);
          g.track(shown);
        },
        end: function (g) {
          el.classList.remove('is-dragging');
          if (g.moved) { guard(); }
          var v = g.velocity();
          var center = st.x + project(v, 0.99) + currentWidth() / 2;
          var items = segItems(el).filter(function (it) { return !it.querySelector('input:disabled') && !it.disabled; });
          var best = null;
          var dist = Infinity;
          items.forEach(function (it) {
            var d = Math.abs(it.offsetLeft + it.offsetWidth / 2 - center);
            if (d < dist) { dist = d; best = it; }
          });
          if (!best) { return; }
          var was = segActive(el);
          place(best, { animate: true, velocity: v });   // hereda la velocidad del dedo
          if (best !== was) {
            var target = best.querySelector('input') || best;
            safe(function () { target.click(); });
          }
        }
      });
    }

    measureWrap();
    watchInputs();
    place(segActive(el), { animate: false });
    el._auraSeg = { el: el, sync: function (animate) { safe(function () { sync(animate !== false); }); } };
    return el._auraSeg;
  }

  /** Inicia un segmentado o, si ya lo está, recoloca su pastilla: AURA.ui.segmented(el) → { el, sync(animar?) } */
  ui.segmented = function (target) { return safe(function () { return initSegmented($(target)); }) || null; };


  /* ------------------------------------------------------------------------
     8 ter. Galería: fundido cruzado al cambiar de foto   [.aura-gallery]
     AURA.ui.gallery(el).show(slot, { fallback, alt, priority }) deja a la
     vista la foto de ese hueco. Si ya está (a la vista o yéndose), solo se
     actualiza su alt y vuelve. Si es otra, se monta encima, invisible
     (.is-entering), y en cuanto está decodificada se funde sobre la anterior
     mientras esta se funde a cero (.is-leaving) y se retira: nunca hay un
     bache a negro y no hay temporizadores de espera (la vieja sigue a la
     vista hasta entonces). Son transiciones de opacidad, así que un cambio
     nuevo parte del valor en curso, también con «reducir movimiento» (un
     fundido no es movimiento vestibular). Si el hueco no existe, la base
     prueba sus reservas y, si pone el marcador, se promueve el marcador.
     ------------------------------------------------------------------------ */

  function initGallery(el) {
    if (!el || !el.classList) { return null; }
    if (el._auraGallery) { return el._auraGallery; }
    var want = null;              // el último hueco pedido: manda sobre los anteriores
    var turn = 0;

    function photos() {
      return toArray(el.children).filter(function (c) { return c.classList && (c.classList.contains('aura-img') || c.classList.contains('aura-slot')); });
    }
    function setAlt(f, alt) {
      if (alt == null) { return; }
      if (f.tagName === 'IMG') { f.setAttribute('alt', alt); } else if (f.getAttribute('role') === 'img') { f.setAttribute('aria-label', alt); }
    }
    /* La que se va se retira al terminar su fundido (o poco después, si ya
       estaba a 0). Si en ese tiempo se recupera, se queda: cada salida lleva su turno. */
    function retire(f) {
      var mine = f._auraLeave = ++turn;
      var done = function () {
        if (f._auraLeave !== mine || !f.classList.contains('is-leaving')) { return; }
        f._auraLeave = 0;
        if (f.parentNode) { f.parentNode.removeChild(f); }
      };
      f.addEventListener('transitionend', function (e) { if (e.target === f && e.propertyName === 'opacity') { done(); } });
      window.setTimeout(done, 400);
    }
    /* Deja a la vista `dest` y funde a cero las demás. */
    function front(dest) {
      photos().forEach(function (f) {
        if (f === dest) {
          f._auraLeave = 0;
          f.classList.remove('is-leaving', 'is-entering');
          f.removeAttribute('aria-hidden');
        } else if (!f.classList.contains('is-leaving')) {
          f.classList.remove('is-entering');
          f.classList.add('is-leaving');
          f.setAttribute('aria-hidden', 'true');
          retire(f);
        }
      });
    }
    function insert(htmlText) {
      var tpl = document.createElement('template');
      tpl.innerHTML = htmlText;
      var node = tpl.content.firstElementChild;
      var caption = el.querySelector('.aura-gallery__caption');
      el.insertBefore(node, caption && caption.parentNode === el ? caption : null);
      return node;
    }

    function show(slot, opts) {
      opts = opts || {};
      if (!slot || !AURA.html || !AURA.html.img) { return; }
      want = slot;
      var current = photos();
      if (!current.length) {
        insert(AURA.html.img(slot, { fallback: opts.fallback, alt: opts.alt || '', priority: !!opts.priority, eager: true }));
        return;
      }
      var same = null;
      current.forEach(function (f) { if (f.getAttribute('data-slot') === slot) { same = f; } });
      if (same) { setAlt(same, opts.alt); front(same); return; }

      var next = insert(AURA.html.img(slot, { fallback: opts.fallback, alt: opts.alt || '', eager: true, className: 'is-entering' }));
      next.setAttribute('aria-hidden', 'true');
      var promote = function (f) {
        if (!f || !f.parentNode || want !== slot) { return; }      // mientras tanto se pidió otra
        void window.getComputedStyle(f).opacity;                   // parte de 0 aunque llegue en el mismo fotograma
        front(f);
      };
      var onFail = function () {
        next.addEventListener('load', function () { promote(next); }, { once: true });
        document.addEventListener('aura:slot', function onSlot(e) {
          if (!e.detail || e.detail.slot !== slot) { return; }
          document.removeEventListener('aura:slot', onSlot);
          promote(e.detail.el);
        });
      };
      if (typeof next.decode === 'function') { next.decode().then(function () { promote(next); }, onFail); }
      else if (next.complete && next.naturalWidth) { promote(next); }
      else { onFail(); }
    }

    el._auraGallery = { el: el, show: function (slot, opts) { safe(function () { show(slot, opts); }); return el._auraGallery; } };
    return el._auraGallery;
  }

  /** Galería con fundido cruzado: AURA.ui.gallery(el).show('slot', { fallback, alt, priority }) */
  ui.gallery = function (target) { return safe(function () { return initGallery($(target)); }) || null; };


  /* ------------------------------------------------------------------------
     9. Aparición al entrar en pantalla
     ------------------------------------------------------------------------ */

  var revealObserver = null;

  function showAll(rootEl) {
    each((rootEl || document).querySelectorAll('[data-aura-reveal]'), function (el) { el.classList.add('is-visible'); });
  }

  function reveal(rootEl) {
    var scope = rootEl && rootEl.querySelectorAll ? rootEl : document;
    var els = toArray(scope.querySelectorAll('[data-aura-reveal]:not(.is-visible)'));
    if (scope !== document && scope.hasAttribute && scope.hasAttribute('data-aura-reveal') && !scope.classList.contains('is-visible')) { els.push(scope); }
    if (!els.length) { return; }
    if (typeof window.IntersectionObserver !== 'function') {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    if (!revealObserver) {
      revealObserver = new window.IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var passed = !en.isIntersecting && en.boundingClientRect.bottom < 0;          // ya quedó por encima
          var enough = en.isIntersecting && (en.intersectionRatio >= 0.15 || en.intersectionRect.height >= 120);
          if (passed || enough) {
            en.target.classList.add('is-visible');     // una sola vez
            revealObserver.unobserve(en.target);
          }
        });
      }, { threshold: [0, 0.05, 0.15], rootMargin: '0px 0px -8% 0px' });
    }
    els.forEach(function (el) { revealObserver.observe(el); });
  }

  ui.reveal = function (rootEl) { safe(function () { reveal($(rootEl)); }); };

  /* Si este script llega tarde (va detrás del bundle de Bootstrap del CDN) y el
     «seguro» del CSS ya mostró contenido a los 2,5 s, ese contenido se queda
     como está: se marca .is-visible ANTES de añadir .aura-ui, así que no vuelve
     a opacidad 0 ni se funde otra vez. Antes de 2,5 s el seguro no ha podido
     actuar y no hace falta mirar nada. */
  function keepFailsafe() {
    if (now() < 2500) { return; }
    each(document.querySelectorAll('[data-aura-reveal]:not(.is-visible)'), function (el) {
      if (parseFloat(window.getComputedStyle(el).opacity) > 0.99) { el.classList.add('is-visible'); }
    });
  }


  /* ------------------------------------------------------------------------
     10. Catálogo en pantalla: tarjetas de modelo y tabla comparativa
     ------------------------------------------------------------------------ */

  function headingTag(el, fallback) {
    var tag = (el.getAttribute('data-aura-heading') || '').toLowerCase();
    return /^h[1-6]$/.test(tag) ? tag : fallback;
  }

  /* Las tarjetas son las de AURA.html.productCard (una sola copia del marcado). */
  function lineupHTML(family, tag) {
    return AURA.catalog.products(family).slice(0, 3).map(function (p) {
      return AURA.html.productCard(p, { heading: tag });
    }).join('');
  }

  function renderLineup(el, family) {
    if (!el || !AURA.catalog) { return; }
    if (family) { el.setAttribute('data-aura-lineup', family); }
    family = el.getAttribute('data-aura-lineup');
    el.classList.add('aura-lineup');
    el.innerHTML = lineupHTML(family, headingTag(el, 'h3'));
  }

  var compareCount = 0;

  function compareHTML(el, family) {
    var cat = AURA.catalog;
    var fam = cat.family(family);
    var products = cat.products(family).slice(0, 3);
    if (!fam || !products.length) { return ''; }
    var tag = headingTag(el, 'h3');
    var title = el.getAttribute('data-aura-compare-title') || 'Especificaciones técnicas';
    var id = 'aura-cmp-' + family + '-titulo';
    if (document.getElementById(id) && !el.querySelector('#' + id)) { id += '-' + (++compareCount); }
    var featured = function (i) { return i === 0 ? ' class="is-featured"' : ''; };

    /* La fila «precio» sale siempre de basePrice (nunca de un texto escrito a
       mano) y lleva debajo la disponibilidad si el modelo aún no está a la venta. */
    var rows = (Array.isArray(fam.compareRows) ? fam.compareRows : []).map(function (row) {
      var isPrice = row.key === 'precio';
      return '<tr' + (isPrice ? ' class="aura-table__row--price"' : '') + '><th scope="row">' + esc(row.label) + '</th>' +
        products.map(function (p, i) {
          if (isPrice) {
            var a = cat.availability(p);
            return '<td' + featured(i) + '>' + esc('Desde ' + AURA.fmt.eur0(p.basePrice)) +
              (a.text ? '<span class="aura-table__note">' + esc(a.text) + '</span>' : '') + '</td>';
          }
          var value = p.specs && p.specs[row.key];
          return '<td' + featured(i) + '>' + esc(value ? AURA.fmt.units(value) : '—') + '</td>';   // cifra y unidad juntas
        }).join('') + '</tr>';
    }).join('');

    return '<div class="aura-table-card">' +
      '<div class="aura-table-card__head">' +
        '<' + tag + ' class="aura-table-card__title" id="' + id + '">' + esc(title) + '</' + tag + '>' +
        '<p class="aura-eyebrow aura-eyebrow--mono aura-eyebrow--plain aura-eyebrow--muted">Comparativa / AURA Labs</p>' +
      '</div>' +
      '<p class="aura-table-card__hint">Desliza la tabla para ver todos los modelos.</p>' +
      '<div class="aura-table-wrap" role="region" aria-labelledby="' + id + '" tabindex="0">' +
        '<table class="aura-table">' +
          '<thead><tr><th scope="col">Característica</th>' +
            products.map(function (p, i) { return '<th scope="col"' + featured(i) + '>' + esc(p.name) + '</th>'; }).join('') +
          '</tr></thead>' +
          '<tbody>' + rows +
            '<tr class="aura-table__row--actions"><th scope="row"><span class="visually-hidden">Comprar</span></th>' +
              products.map(function (p, i) {
                var cta = cat.cta(p);
                /* La fila de acciones al pie de una tabla repite la compra: secundaria
                   en todas las columnas (la destacada ya la marca su color), igual
                   que la fila final de comparar.html. La primaria es la de la tarjeta
                   o la cabecera de cada modelo. */
                return '<td' + featured(i) + '><a class="aura-btn aura-btn--secondary" href="' + esc(cat.url(p)) + '" aria-label="' + esc(cta + ' ' + p.name) + '">' + esc(cta) + '</a></td>';
              }).join('') +
            '</tr>' +
          '</tbody>' +
        '</table>' +
      '</div>' +
    '</div>';
  }

  function renderCompare(el, family) {
    if (!el || !AURA.catalog) { return; }
    if (family) { el.setAttribute('data-aura-compare', family); }
    family = el.getAttribute('data-aura-compare');
    var out = compareHTML(el, family);
    if (out) { el.innerHTML = out; }
  }

  /** Repinta las tarjetas de una familia: AURA.ui.lineup(el, 'aurapad') */
  ui.lineup = function (target, family) { safe(function () { var el = $(target); renderLineup(el, family); reveal(el); }); };
  /** Repinta la tabla comparativa: AURA.ui.compare(el, 'aurapad') */
  ui.compare = function (target, family) { safe(function () { renderCompare($(target), family); }); };


  /* ------------------------------------------------------------------------
     11. Avisos: estado, completado, aviso y error
     ------------------------------------------------------------------------ */

  var TOAST_KINDS = {
    status: { cls: 'aura-toast--status', icon: 'bi-info-circle-fill', role: 'status', live: 'polite' },
    ok: { cls: 'aura-toast--ok', icon: 'bi-check-circle-fill', role: 'status', live: 'polite' },
    warn: { cls: 'aura-toast--warn', icon: 'bi-exclamation-triangle-fill', role: 'alert', live: 'assertive' },
    error: { cls: 'aura-toast--error', icon: 'bi-x-octagon-fill', role: 'alert', live: 'assertive' }
  };
  var MAX_TOASTS = 3;
  var liveToasts = [];
  var TOAST_EXIT_SPEED = 220;           // px/s en el sentido de salida: con eso basta para apartarlo
  var TOAST_SPRING = { damping: 1, response: 0.3 };
  var HAS_TRANSLATE = !!safe(function () { return window.CSS && window.CSS.supports && window.CSS.supports('translate', '0 0'); });

  /* Avisos apilados (skill §7, §11): cuando llega o se va uno, los demás se
     deslizan a su nuevo sitio (FLIP con la propiedad `translate`, que no
     pisa el `transform` de su entrada y salida) en lugar de saltar. */
  function toastTops(region) {
    return toArray(region.children).map(function (t) { return { el: t, top: t.getBoundingClientRect().top }; });
  }
  function toastFlip(region, before) {
    if (reduced || !HAS_TRANSLATE) { return; }
    before.forEach(function (b) {
      if (b.el.parentNode !== region || !b.el.animate) { return; }
      var d = b.top - b.el.getBoundingClientRect().top;
      if (Math.abs(d) < 0.5) { return; }
      safe(function () {
        b.el.animate([{ translate: '0 ' + d.toFixed(2) + 'px' }, { translate: '0 0' }], { duration: 320, easing: 'cubic-bezier(.2, .8, .2, 1)' });
      });
    });
  }

  function toastRegion() {
    var region = document.getElementById('aura-toasts');
    if (!region) {
      region = document.createElement('div');
      region.className = 'aura-toasts';
      region.id = 'aura-toasts';
      region.setAttribute('role', 'region');
      region.setAttribute('aria-label', 'Avisos');
      document.body.appendChild(region);
    }
    return region;
  }

  /**
   * AURA.ui.toast({ title, text, kind: 'status'|'ok'|'warn'|'error', action: { label, onClick }, duration })
   * Devuelve { el, close }. Duración: 5 s (8 s con acción); los errores no se cierran solos.
   */
  function toast(options) {
    if (typeof options === 'string') { options = { title: options }; }
    options = options || {};
    if (!document.body) { return { el: null, close: function () {} }; }
    var kindName = TOAST_KINDS[options.kind] ? options.kind : 'status';
    var kind = TOAST_KINDS[kindName];
    var hasAction = isObj(options.action) && options.action.label;
    var duration = options.duration != null ? num(options.duration, 0) : (kindName === 'error' ? 0 : (hasAction ? 8000 : 5000));

    var el = document.createElement('div');
    el.className = 'aura-toast ' + kind.cls;
    el.setAttribute('role', kind.role);
    el.setAttribute('aria-live', kind.live);
    el.setAttribute('aria-atomic', 'true');
    el.innerHTML =
      '<i class="aura-toast__icon bi ' + kind.icon + '" aria-hidden="true"></i>' +
      '<div class="aura-toast__body"><p class="aura-toast__title"></p>' + (options.text ? '<p class="aura-toast__text"></p>' : '') + '</div>' +
      (hasAction ? '<button class="aura-toast__action" type="button"></button>' : '') +
      '<button class="aura-toast__close" type="button" aria-label="Cerrar el aviso"><i class="bi bi-x" aria-hidden="true"></i></button>';

    var timer = 0;
    var remaining = duration;
    var startedAt = 0;
    var closed = false;
    var dragging = false;
    var handle = { el: el, close: close };

    /* Al retirarlo del todo, los que quedan se deslizan a su sitio. */
    var removed = false;
    function remove() {
      if (removed) { return; }
      removed = true;
      var region = el.parentNode;
      if (!region) { return; }
      var before = toastTops(region);
      region.removeChild(el);
      toastFlip(region, before);
    }

    /* Deja de contar como vivo (sin tocar aún su aspecto). */
    function retire() {
      closed = true;
      window.clearTimeout(timer);
      var i = liveToasts.indexOf(handle);
      if (i >= 0) { liveToasts.splice(i, 1); }
    }

    function close() {
      if (closed) { return; }
      retire();
      if (swipe) { swipe.stop(); }
      el.style.transform = '';
      el.style.opacity = '';
      el.classList.remove('is-dragging');
      el.classList.remove('is-visible');      // sale por donde entró
      el.addEventListener('transitionend', function (e) { if (e.target === el) { remove(); } });
      window.setTimeout(remove, 260);
    }

    /* Apartar con el dedo (skill §2, §6, §9): en el teléfono, hacia arriba
       (los avisos salen por arriba); desde 576 px, donde se apilan a la
       derecha, hacia la derecha. 1:1 con el dedo, goma en el sentido
       contrario; al soltar, sale con la velocidad heredada si iba hacia fuera
       con impulso o si su proyección pasa de la mitad; si no, vuelve. */
    var swipe = null;
    var sw = { axis: 'y', dir: -1, size: 1, pos: 0 };
    function swipeRender(pos) {
      sw.pos = pos;
      var p = pos.toFixed(2);
      el.style.transform = sw.axis === 'x' ? 'translate3d(' + p + 'px, 0, 0)' : 'translate3d(0, ' + p + 'px, 0)';
      el.style.opacity = clamp(1 - Math.max(0, pos * sw.dir) / sw.size, 0, 1).toFixed(3);
    }
    function swipeSettle() {
      dragging = false;
      el.classList.remove('is-dragging');
      el.style.transform = '';
      el.style.opacity = '';
      sw.pos = 0;
      if (!el.matches || !el.matches(':hover')) { resume(); }
    }
    swipe = spring({
      from: 0, to: 0, damping: TOAST_SPRING.damping, response: TOAST_SPRING.response, precision: 0.3, autoStart: false,
      onUpdate: function (value) {
        swipeRender(value);
        /* Ya fuera de la pantalla: se retira (los demás se deslizan). */
        if (closed && value * sw.dir >= sw.size - 1) { swipe.stop(); remove(); }
      },
      onRest: function () {
        if (closed) { remove(); return; }
        swipeSettle();
      }
    });
    dragGesture(el, {
      axis: function () {
        sw.axis = safe(function () { return window.matchMedia('(min-width: 576px)').matches; }) ? 'x' : 'y';
        sw.dir = sw.axis === 'x' ? 1 : -1;
        var r = el.getBoundingClientRect();
        /* Distancia hasta salir de la pantalla por su lado. */
        sw.size = Math.max(1, sw.axis === 'x' ? (html.clientWidth || window.innerWidth) - r.left : r.bottom) + 8;
        return sw.axis;
      },
      accept: function () { return !closed; },
      start: function (g) {
        dragging = true;
        swipe.stop();
        pause();
        el.classList.add('is-dragging');
        g.base = sw.pos;
      },
      move: function (g) {
        var raw = g.base + g.delta;
        var shown = raw * sw.dir < 0 ? rubberband(raw, sw.size) : raw;   // hacia dentro: resistencia
        swipeRender(shown);
        g.track(shown);
      },
      end: function (g) {
        var v = g.velocity();
        var out = v * sw.dir > TOAST_EXIT_SPEED || (sw.pos + project(v)) * sw.dir > sw.size / 2;
        if (reduced) {
          /* Sin muelle: sale fundiéndose desde donde lo dejó el dedo, o vuelve. */
          if (out) {
            retire();
            el.style.transition = 'opacity 150ms ease';
            el.style.opacity = '0';
            window.setTimeout(remove, 170);
          } else {
            swipeSettle();
          }
          return;
        }
        swipe.value = sw.pos;
        if (out) {
          /* Sale con la velocidad del dedo (y su opacidad baja con el camino). */
          retire();
          swipe.setTarget(sw.dir * sw.size, { velocity: v, damping: TOAST_SPRING.damping, response: TOAST_SPRING.response });
          return;
        }
        swipe.setTarget(0, { velocity: v, damping: TOAST_SPRING.damping, response: TOAST_SPRING.response });
      }
    });

    function resume() {
      if (closed || !(remaining > 0)) { return; }
      window.clearTimeout(timer);
      startedAt = now();
      timer = window.setTimeout(close, remaining);
    }

    function pause() {
      if (closed || !timer) { return; }
      window.clearTimeout(timer);
      timer = 0;
      remaining = Math.max(1500, remaining - (now() - startedAt));
    }

    el.querySelector('.aura-toast__close').addEventListener('click', close);
    if (hasAction) {
      el.querySelector('.aura-toast__action').addEventListener('click', function (e) {
        if (typeof options.action.onClick === 'function') { safe(function () { options.action.onClick(e); }); }
        close();
      });
    }
    el.addEventListener('pointerenter', pause);
    el.addEventListener('pointerleave', resume);
    el.addEventListener('focusin', pause);
    el.addEventListener('focusout', resume);

    var region = toastRegion();
    var before = toastTops(region);
    region.insertBefore(el, region.firstChild);
    /* El texto se escribe con el nodo ya en la región viva para que se anuncie. */
    el.querySelector('.aura-toast__title').textContent = options.title || '';
    if (options.text) { el.querySelector('.aura-toast__text').textContent = options.text; }
    if (hasAction) { el.querySelector('.aura-toast__action').textContent = options.action.label; }
    void el.offsetWidth;
    toastFlip(region, before);            // con su alto ya definitivo: los que estaban bajan deslizándose, no de golpe
    el.classList.add('is-visible');

    liveToasts.push(handle);
    while (liveToasts.length > MAX_TOASTS) { liveToasts[0].close(); }
    resume();
    return handle;
  }

  ui.toast = function (options) {
    return safe(function () { return toast(options); }) || { el: null, close: function () {} };
  };

  /* Retroalimentación háptica (skill §13). Un único servicio para todo el
     sitio, con tres caracteres que se corresponden con su causa:
       'exito'  → 12 ms        (añadir a la bolsa, pedido hecho)
       'error'  → 10·60·10 ms  (un envío rechazado por errores)
       'ajuste' → 8 ms         (el sistema corrigió una elección)
     Solo en pantallas táctiles y donde exista la API; se llama en el mismo
     tick que el cambio visual (el aviso o el error pintado). Nunca sustituye
     al mensaje: lo acompaña. No se usa en carrusel, hoja ni navegación. */
  var HAPTICS = { exito: 12, error: [10, 60, 10], ajuste: 8 };
  ui.haptic = function (kind) {
    return !!safe(function () {
      if (!window.navigator || typeof window.navigator.vibrate !== 'function') { return false; }
      if (!window.matchMedia || !window.matchMedia('(pointer: coarse)').matches) { return false; }
      return window.navigator.vibrate(HAPTICS[kind] || HAPTICS.exito);
    });
  };


  /* ------------------------------------------------------------------------
     12. Formularios
     ------------------------------------------------------------------------ */

  var MESSAGES = {
    required: 'Rellena este campo para continuar.',
    requiredCheck: 'Marca esta casilla para continuar.',
    requiredChoice: 'Elige una opción para continuar.',
    emailAt: 'Falta la arroba. Escribe una dirección como nombre@correo.com.',
    emailDomain: 'Falta el dominio. Escribe una dirección como nombre@correo.com.',
    email: 'Revisa la dirección. Debe ser como nombre@correo.com.',
    minLength: 'Usa al menos {n} caracteres.',
    maxLength: 'Usa como máximo {n} caracteres.',
    pattern: 'Revisa el formato de este campo.',
    match: 'Los dos campos no coinciden.',
    custom: 'Revisa este campo.'
  };
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var CHOICE = '.aura-check, .aura-radio, .aura-option, .aura-swatch, .aura-segmented__item';
  var formIds = 0;

  /* Una regla puede ser un valor (true, 8, /re/, 'campo') o { value, message }. */
  function ruleOf(spec, key) {
    if (spec == null || spec === false) { return null; }
    if (isObj(spec) && !(spec instanceof RegExp)) {
      return { value: spec.value === undefined ? (key === 'match' ? spec.field : true) : spec.value, message: spec.message };
    }
    if (typeof spec === 'string' && (key === 'required' || key === 'email')) { return { value: true, message: spec }; }
    return { value: spec, message: null };
  }

  /**
   * Validación en línea. rules = { nombreDelCampo: { required, email, minLength,
   * maxLength, pattern, match, custom, messages } }.
   * - Mientras se escribe por primera vez no se marca el error; aparece al salir
   *   del campo o al enviar, y desde entonces se revalida en cada pulsación.
   * - Devuelve { form, validate, validateField, values, setError, clear }.
   */
  function form(target, rules, opts) {
    var el = $(target);
    if (!el || el.tagName !== 'FORM') { return null; }
    rules = rules || {};
    opts = opts || {};
    el.setAttribute('novalidate', '');
    var touched = {};
    var submitted = false;

    /* Todos los controles con ese name (para pintar o limpiar su estado)… */
    function allControls(name) {
      var c = el.elements[name];
      if (!c) { return []; }
      return c.tagName ? [c] : toArray(c);
    }

    /* …y los que cuentan ahora: ni desactivados (también por un <fieldset
       disabled>) ni dentro de un bloque [hidden] o [inert]. Así se declaran los
       campos condicionales: se oculta su bloque y dejan de validarse. */
    function active(c) {
      if (!c || c.disabled) { return false; }
      if (safe(function () { return c.matches(':disabled'); })) { return false; }
      return !closest(c, '[hidden], [inert]');
    }

    function controls(name) {
      return allControls(name).filter(active);
    }

    function value(name) {
      var list = controls(name);
      if (!list.length) { return ''; }
      var first = list[0];
      if (first.type === 'checkbox') {
        if (list.length === 1) { return first.checked; }
        return list.filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
      }
      if (first.type === 'radio') {
        for (var i = 0; i < list.length; i++) { if (list[i].checked) { return list[i].value; } }
        return '';
      }
      return first.value;
    }

    /* Como el envío nativo: los campos desactivados u ocultos no se incluyen. */
    function values() {
      var out = {};
      each(el.elements, function (c) {
        if (c.name && !(c.name in out) && active(c)) { out[c.name] = value(c.name); }
      });
      return out;
    }

    function isEmpty(v) {
      return v === '' || v === false || v == null || (Array.isArray(v) && !v.length) || (typeof v === 'string' && !v.trim());
    }

    function message(rule, key, parsed, fallbackKey, n) {
      var text = (parsed && parsed.message) || (rule.messages && rule.messages[key]) || MESSAGES[fallbackKey || key];
      return String(text).replace('{n}', n);
    }

    /* Devuelve el mensaje de error del campo o '' si es válido. */
    function check(name) {
      var rule = rules[name];
      var list = controls(name);
      if (!rule || !list.length) { return ''; }
      var v = value(name);
      var text = typeof v === 'string' ? v.trim() : v;
      var r;

      if (isEmpty(text)) {
        r = ruleOf(rule.required, 'required');
        if (!r || !r.value) { return ''; }
        var type = list[0].type;
        return message(rule, 'required', r, type === 'checkbox' ? 'requiredCheck' : (type === 'radio' || list[0].tagName === 'SELECT' ? 'requiredChoice' : 'required'));
      }
      r = ruleOf(rule.email, 'email');
      if (r && r.value && !EMAIL_RE.test(text)) {
        var at = String(text).indexOf('@');
        return message(rule, 'email', r, at === -1 ? 'emailAt' : (!/@[^\s@]+\.[^\s@]{2,}$/.test(text) ? 'emailDomain' : 'email'));
      }
      r = ruleOf(rule.minLength, 'minLength');
      if (r && String(v).length < num(r.value, 0)) { return message(rule, 'minLength', r, null, r.value); }
      r = ruleOf(rule.maxLength, 'maxLength');
      if (r && String(v).length > num(r.value, Infinity)) { return message(rule, 'maxLength', r, null, r.value); }
      r = ruleOf(rule.pattern, 'pattern');
      if (r && r.value) {
        var re = r.value instanceof RegExp ? r.value : safe(function () { return new RegExp(r.value); });
        if (re) { re.lastIndex = 0; if (!re.test(String(text))) { return message(rule, 'pattern', r); } }
      }
      r = ruleOf(rule.match, 'match');
      if (r && r.value && value(r.value) !== v) { return message(rule, 'match', r); }
      if (typeof rule.custom === 'function') {
        var result = safe(function () { return rule.custom(v, values(), el); });
        if (typeof result === 'string' && result) { return result; }
        if (result === false) { return message(rule, 'custom', null); }
      }
      return '';
    }

    /* Dónde se pinta el estado de un campo (tabla de docs/COMPONENTES.md §7):
       - su .aura-field (también una casilla suelta, envuelta en .aura-field);
       - si no hay, su .aura-fieldset (grupo de radios, opciones o casillas);
       - si tampoco, la etiqueta de la casilla suelta, o el contenedor común de
         las opciones de un grupo. */
    function box(name) {
      var list = allControls(name);
      var c = list[0];
      if (!c) { return null; }
      var b = closest(c, '.aura-field') || closest(c, '.aura-fieldset');
      if (b) { return b; }
      var choice = closest(c, CHOICE);
      if (choice) { return list.length > 1 && choice.parentNode ? choice.parentNode : choice; }
      return c.parentNode;
    }

    /* El mensaje nunca va DENTRO de una etiqueta (pasaría a formar parte del
       nombre accesible de la casilla y, al pulsarlo, la marcaría): con una
       casilla suelta sin .aura-field se coloca justo después de su <label>. */
    function errorNode(name) {
      var b = box(name);
      if (!b) { return null; }
      var afterLabel = b.matches && b.matches(CHOICE);
      var node = null;
      if (afterLabel) {
        var next = b.nextElementSibling;
        if (next && next.classList.contains('aura-field__error')) { node = next; }
      } else if (b.classList.contains('aura-field')) {
        node = b.querySelector('.aura-field__error');
      } else {
        /* En un grupo, solo un mensaje hijo directo: los de sus .aura-field interiores son de otros campos. */
        each(b.children, function (ch) { if (!node && ch.classList.contains('aura-field__error')) { node = ch; } });
      }
      if (!node) {
        node = document.createElement('p');
        node.className = 'aura-field__error';
        if (afterLabel) { b.parentNode.insertBefore(node, b.nextSibling); } else { b.appendChild(node); }
      }
      if (!node.id) { node.id = 'aura-error-' + (++formIds); }
      allControls(name).forEach(function (c) {
        var ids = (c.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
        if (ids.indexOf(node.id) === -1) { ids.push(node.id); c.setAttribute('aria-describedby', ids.join(' ')); }
      });
      return node;
    }

    /* state: 'invalid' | 'valid' | 'neutral' (tabla de docs/COMPONENTES.md §7) */
    function paint(name, state, text) {
      var b = box(name);
      var node = errorNode(name);
      if (!b) { return; }
      b.classList.toggle('is-invalid', state === 'invalid');
      b.classList.toggle('is-valid', state === 'valid');
      allControls(name).forEach(function (c) {
        if (state === 'invalid') { c.setAttribute('aria-invalid', 'true'); } else { c.removeAttribute('aria-invalid'); }
      });
      if (node) { node.textContent = state === 'invalid' ? text : ''; }
    }

    function validateField(name) {
      /* Campo que no cuenta ahora (oculto o desactivado): sin error pendiente. */
      if (!controls(name).length) { paint(name, 'neutral', ''); return true; }
      var text = check(name);
      if (text) { paint(name, 'invalid', text); return false; }
      paint(name, isEmpty(value(name)) ? 'neutral' : 'valid', '');
      return true;
    }

    function validate() {
      var ok = true;
      var first = null;
      Object.keys(rules).forEach(function (name) {
        if (!allControls(name).length) { return; }
        if (!controls(name).length) { touched[name] = false; paint(name, 'neutral', ''); return; }
        touched[name] = true;
        if (!validateField(name)) { ok = false; if (!first) { first = controls(name)[0]; } }
      });
      if (first) { focusEl(first); safe(function () { first.scrollIntoView({ block: 'center' }); }); }
      return ok;
    }

    function dependents(name) {
      Object.keys(rules).forEach(function (other) {
        var r = ruleOf(rules[other].match, 'match');
        if (r && r.value === name && touched[other]) { validateField(other); }
      });
    }

    function onInput(e) {
      var name = e.target && e.target.name;
      if (!name) { return; }
      if (rules[name]) {
        var immediate = e.type === 'change' && /^(checkbox|radio|select-one|select-multiple)$/.test(e.target.type || '');
        if (immediate) { touched[name] = true; }
        if (touched[name] || submitted) {
          validateField(name);
        } else {
          /* Primera escritura: se premia lo correcto, pero aún no se señala el error. */
          paint(name, !check(name) && !isEmpty(value(name)) ? 'valid' : 'neutral', '');
        }
      }
      dependents(name);
    }

    function onBlur(e) {
      var name = e.target && e.target.name;
      if (!name || !rules[name]) { return; }
      touched[name] = true;
      validateField(name);
    }

    function onSubmit(e) {
      submitted = true;
      if (!validate()) {
        /* Con errores no se envía, y los listeners de `submit` añadidos después
           no se ejecutan. La vibración de error acompaña (mismo tick) a los
           mensajes ya pintados y al foco en el primero. */
        ui.haptic('error');
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      if (typeof opts.onSubmit === 'function') {
        e.preventDefault();
        safe(function () { opts.onSubmit(values(), e, api); });
      }
    }

    el.addEventListener('input', function (e) { safe(function () { onInput(e); }); });
    el.addEventListener('change', function (e) { safe(function () { onInput(e); }); });
    el.addEventListener('focusout', function (e) { safe(function () { onBlur(e); }); });
    el.addEventListener('submit', function (e) { safe(function () { onSubmit(e); }); });

    var api = {
      form: el,
      validate: validate,
      validateField: function (name) { touched[name] = true; return validateField(name); },
      values: values,
      /** Error que no sale de las reglas (p. ej. «ese correo ya tiene un ID de AURA»). */
      setError: function (name, text) {
        touched[name] = true;
        paint(name, 'invalid', text);
        focusEl(controls(name)[0]);
      },
      /** Quita los estados de un campo o de todos. */
      clear: function (name) {
        (name ? [name] : Object.keys(rules)).forEach(function (n) { touched[n] = false; paint(n, 'neutral', ''); });
        if (!name) { submitted = false; }
      }
    };
    el._auraForm = api;
    return api;
  }

  ui.form = function (target, rules, opts) { return safe(function () { return form(target, rules, opts); }) || null; };
  ui.messages = MESSAGES;

  /** Requisitos de una contraseña: { length, upper, lower, number, symbol } */
  ui.passwordRules = function (value, min) {
    value = String(value == null ? '' : value);
    return {
      length: value.length >= (min || 8),
      upper: /[A-ZÁÉÍÓÚÜÑ]/.test(value),
      lower: /[a-záéíóúüñ]/.test(value),
      number: /\d/.test(value),
      symbol: /[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ\s]/.test(value)
    };
  };

  function paintPasswordRules(input) {
    var field = closest(input, '.aura-field');
    if (!field) { return; }
    var items = field.querySelectorAll('.aura-rules__item[data-rule]');
    if (!items.length) { return; }
    each(items, function (item) {
      var state = ui.passwordRules(input.value, num(item.getAttribute('data-min'), 8));
      var met = !!state[item.getAttribute('data-rule')];
      item.classList.toggle('is-met', met);
      var hidden = item.querySelector('.visually-hidden');
      if (hidden) { hidden.textContent = met ? 'Cumplido: ' : 'Pendiente: '; }
    });
  }

  function initFormHelpers() {
    /* Lista de requisitos de la contraseña: se actualiza en cada pulsación. */
    document.addEventListener('input', function (e) {
      if (e.target && e.target.tagName === 'INPUT') { safe(function () { paintPasswordRules(e.target); }); }
    });

    /* Mostrar / ocultar la contraseña. */
    document.addEventListener('click', function (e) {
      var button = closest(e.target, '[data-aura-password-toggle]');
      if (!button) { return; }
      var control = closest(button, '.aura-field__control') || button.parentNode;
      var input = control ? control.querySelector('input') : null;
      if (!input) { return; }
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.setAttribute('aria-pressed', show ? 'true' : 'false');
      button.setAttribute('aria-label', show ? 'Ocultar la contraseña' : 'Mostrar la contraseña');
      var icon = button.querySelector('.bi');
      if (icon) { icon.classList.toggle('bi-eye', !show); icon.classList.toggle('bi-eye-slash', show); }
    });

    /* Cantidad (opcional): <div class="aura-stepper" data-aura-stepper data-min="1" data-max="99">.
       Sin el atributo, la lógica es de la página. Emite 'aura:step' con { value, delta }. */
    document.addEventListener('click', function (e) {
      var button = closest(e.target, '[data-aura-step]');
      var stepper = button ? closest(button, '[data-aura-stepper]') : null;
      if (!stepper) { return; }
      var output = stepper.querySelector('.aura-stepper__value');
      var min = num(stepper.getAttribute('data-min'), 1);
      var max = num(stepper.getAttribute('data-max'), 99);
      var delta = num(button.getAttribute('data-aura-step'), 0);
      var current = num(parseInt(output ? output.textContent : '1', 10), min);
      var next = clamp(current + delta, min, max);
      if (output) { output.textContent = String(next); }
      var buttons = toArray(stepper.querySelectorAll('[data-aura-step]'));
      var off = buttons.map(function (b) {
        var d = num(b.getAttribute('data-aura-step'), 0);
        return d < 0 ? next <= min : next >= max;
      });
      /* Un botón que se desactiva con el foco puesto lo perdería (caería a
         <body>): antes de desactivarlo, el foco pasa al otro botón. */
      buttons.forEach(function (b, i) {
        if (off[i] && document.activeElement === b) {
          var other = null;
          buttons.forEach(function (o, j) { if (!other && j !== i && !off[j]) { other = o; } });
          focusEl(other || output || stepper);
        }
      });
      buttons.forEach(function (b, i) { b.disabled = off[i]; });
      if (next !== current) { fire(stepper, 'aura:step', { value: next, delta: next - current }); }
    });

    /* Botón en carga (AURA.ui.busy): ni se reenvía el formulario (Intro en un
       campo) ni se repite la acción del botón mientras dure. Se intercepta en
       captura, antes que cualquier otro listener de la página. */
    document.addEventListener('submit', function (e) {
      var f = e.target;
      if (f && f._auraBusy > 0) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
    document.addEventListener('click', function (e) {
      var b = closest(e.target, 'button, a, [role="button"]');
      if (b && b._auraBusy) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
  }

  /**
   * Estado de carga de un botón: AURA.ui.busy(boton, 'Procesando…') → función que lo restaura.
   * Mientras dura: .is-loading, aria-busy y aria-disabled en el botón, y ni el
   * botón ni su formulario se pueden volver a activar (Intro en un campo, doble
   * clic, Espacio): el guardia de initFormHelpers cancela submit y click.
   */
  ui.busy = function (target, label) {
    var button = $(target);
    if (!button || button._auraBusy) { return function () {}; }
    var original = button.innerHTML;
    var hadAriaDisabled = button.getAttribute('aria-disabled');
    var form = button.form || closest(button, 'form');
    button._auraBusy = true;
    if (form) { form._auraBusy = (form._auraBusy || 0) + 1; }
    button.classList.add('is-loading');
    button.setAttribute('aria-busy', 'true');
    button.setAttribute('aria-disabled', 'true');
    button.innerHTML = '<span class="aura-spinner" aria-hidden="true"></span>' + esc(label || 'Procesando…');
    return function () {
      if (!button._auraBusy) { return; }
      button._auraBusy = false;
      if (form) { form._auraBusy = Math.max(0, (form._auraBusy || 0) - 1); }
      button.classList.remove('is-loading');
      button.removeAttribute('aria-busy');
      if (hadAriaDisabled === null) { button.removeAttribute('aria-disabled'); } else { button.setAttribute('aria-disabled', hadAriaDisabled); }
      button.innerHTML = original;
    };
  };


  /* ------------------------------------------------------------------------
     13. Barra local, barra de compra e inicialización
     ------------------------------------------------------------------------ */

  /* Barra local:
     - efecto de borde: .is-stuck solo cuando se ha quedado pegada arriba y el
       contenido pasa por debajo (nunca una línea fija);
     - fundido en los bordes de sus enlaces cuando desbordan en horizontal, para
       que se vea que hay más secciones (.has-more-start / .has-more-end);
     - marca la sección que cruza el centro de la pantalla. */
  /* En el teléfono (< 768 px) los enlaces de la barra local no caben junto al
     título y «Comprar»: un chevrón los despliega en un menú bajo la barra (como
     en la referencia). Esc, un enlace, un toque fuera o pasar a ≥ 768 px lo
     cierran; el foco vuelve al chevrón. */
  var LOCALNAV_MENU = '(max-width: 767.98px)';
  function initLocalnavMenu(nav) {
    var strip = nav.querySelector('.aura-localnav__links');
    var inner = nav.querySelector('.aura-localnav__inner');
    if (!strip || !inner || nav.querySelector('.aura-localnav__toggle')) { return; }
    if (!strip.id) { strip.id = 'aura-localnav-' + Math.random().toString(36).slice(2, 8); }
    var name = nav.getAttribute('aria-label') || '';
    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'aura-localnav__toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', strip.id);
    toggle.setAttribute('aria-label', name ? 'Secciones de ' + name : 'Secciones');
    toggle.innerHTML = '<i class="bi bi-chevron-down" aria-hidden="true"></i>';
    inner.insertBefore(toggle, strip);
    nav.classList.add('has-menu');
    var mq = window.matchMedia ? window.matchMedia(LOCALNAV_MENU) : null;

    function setOpen(open, focusBack) {
      if (open && mq && !mq.matches) { open = false; }
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (!open && focusBack) { focusEl(toggle); }
    }
    toggle.addEventListener('click', function () { setOpen(!nav.classList.contains('is-open')); });
    strip.addEventListener('click', function (e) {
      if (closest(e.target, 'a') && nav.classList.contains('is-open')) { setOpen(false); }
    });
    nav.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { e.preventDefault(); setOpen(false, true); }
    });
    document.addEventListener('pointerdown', function (e) {
      if (nav.classList.contains('is-open') && !nav.contains(e.target)) { setOpen(false); }
    }, true);
    nav.addEventListener('focusout', function (e) {
      if (nav.classList.contains('is-open') && e.relatedTarget && !nav.contains(e.relatedTarget)) { setOpen(false); }
    });
    if (mq) {
      var onChange = function () { if (!mq.matches) { setOpen(false); } };
      if (mq.addEventListener) { mq.addEventListener('change', onChange); } else if (mq.addListener) { mq.addListener(onChange); }
    }
  }

  function initLocalnav(nav) {
    if (!nav || nav._auraLocalnav || typeof window.IntersectionObserver !== 'function') { return; }
    nav._auraLocalnav = true;
    safe(function () { initLocalnavMenu(nav); });

    /* Pegada = su borde superior toca el de la ventana (con 1 px de margen negativo deja de verse entera). */
    new window.IntersectionObserver(function (entries) {
      var en = entries[entries.length - 1];
      nav.classList.toggle('is-stuck', en.intersectionRatio < 1 && en.boundingClientRect.top < 1);
    }, { rootMargin: '-1px 0px 0px 0px', threshold: [1] }).observe(nav);

    var strip = nav.querySelector('.aura-localnav__links');
    if (strip) {
      var edges = function () {
        var more = strip.scrollWidth - strip.clientWidth > 1;
        strip.classList.toggle('has-more-start', more && strip.scrollLeft > 1);
        strip.classList.toggle('has-more-end', more && strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 1);
      };
      strip.addEventListener('scroll', edges, { passive: true });
      if (typeof window.ResizeObserver === 'function') { new window.ResizeObserver(function () { safe(edges); }).observe(strip); }
      else { window.addEventListener('resize', edges); }
      edges();
    }

    var links = toArray(nav.querySelectorAll('.aura-localnav__link[href^="#"]'));
    var sections = [];
    links.forEach(function (link) {
      var section = document.getElementById(decodeURIComponent(link.getAttribute('href').slice(1)));
      if (section) { sections.push({ el: section, link: link, on: false }); }
    });
    if (!sections.length) { return; }
    /* En el orden del documento (el de los enlaces puede ser otro). */
    sections.sort(function (a, b) { return a.el.compareDocumentPosition(b.el) & 4 ? -1 : 1; });

    /* «¿Dónde estoy?» (skill §16): la sección que cruza la franja central de
       la pantalla; si la franja cae en un bloque sin enlace (ecosistema,
       ventajas, llamada final…), sigue marcado el último enlace por el que se
       ha pasado, en lugar de quedarse la barra sin ninguno. Antes de la
       primera sección con enlace (el héroe), ninguno. */
    function paint() {
      var active = null;
      sections.forEach(function (s) { if (s.on && !active) { active = s; } });
      if (!active) {
        var line = (window.innerHeight || html.clientHeight || 0) * 0.45;
        sections.forEach(function (s) { if (s.el.getBoundingClientRect().top <= line) { active = s; } });
      }
      sections.forEach(function (s) {
        var on = s === active;
        s.link.classList.toggle('is-active', on);
        if (on) { s.link.setAttribute('aria-current', 'true'); } else { s.link.removeAttribute('aria-current'); }
      });
      if (active) {
        /* Mantiene el enlace activo a la vista si la barra se desplaza en horizontal. */
        var boxEl = active.link.parentNode;
        if (boxEl && boxEl.scrollWidth > boxEl.clientWidth) {
          var b = boxEl.getBoundingClientRect();
          var l = active.link.getBoundingClientRect();
          if (l.left < b.left || l.right > b.right) { boxEl.scrollLeft += l.left - b.left - (b.width - l.width) / 2; }
        }
      }
    }

    var io = new window.IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        sections.forEach(function (s) { if (s.el === en.target) { s.on = en.isIntersecting; } });
      });
      paint();
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (s) { io.observe(s.el); });
  }

  /* Barra de compra: data-aura-buybar="#selector" la esconde mientras ese
     elemento (el botón principal de la página) está a la vista. */
  /* Toda barra de compra: fuera de <main> (la página puede retroceder bajo
     una tarea modal sin arrastrarla) y su alto real en --buybar-h, que el pie
     reserva (con texto grande la barra crece a dos filas). */
  function initBuybarBox(bar) {
    if (!bar || bar._auraBuybarBox) { return; }
    bar._auraBuybarBox = true;
    relocate(bar);
    var write = function () {
      var h = bar.offsetHeight;
      if (h > 0) { html.style.setProperty('--buybar-h', Math.ceil(h) + 'px'); }
    };
    safe(function () {
      if (typeof window.ResizeObserver === 'function') { new window.ResizeObserver(function () { safe(write); }).observe(bar); }
      else { window.addEventListener('resize', write); }
    });
    write();
  }

  function initBuybar(bar) {
    initBuybarBox(bar);
    if (!bar || bar._auraBuybar || typeof window.IntersectionObserver !== 'function') { return; }
    var selector = bar.getAttribute('data-aura-buybar');
    var target = selector ? safe(function () { return document.querySelector(selector); }) : null;
    if (!target) { return; }
    bar._auraBuybar = true;
    new window.IntersectionObserver(function (entries) {
      bar.classList.toggle('is-hidden', entries[entries.length - 1].isIntersecting);
    }).observe(target);
  }

  /**
   * Inicializa los componentes por atributo dentro de `root` (por defecto, todo
   * el documento). Llámalo después de insertar HTML nuevo con JS.
   */
  /* Bloques de tienda que salen del catálogo (§12.9):
     - [data-aura-perks="FAMILIA"]: las cuatro ventajas de comprar en AURA;
     - [data-aura-family-cards]: una tarjeta por familia;
     - [data-aura-from="FAMILIA"]: «Desde X € o Y €/mes durante 24 meses.»;
     - [data-aura-buy="FAMILIA"]: el enlace del modelo de entrada (AURA.catalog.entry). */
  function renderStore(scope) {
    var H = AURA.html || {};
    var cat = AURA.catalog;
    if (!cat) { return; }
    each(scope.querySelectorAll('[data-aura-perks]'), function (el) {
      if (!H.storePerks) { return; }
      el.innerHTML = H.storePerks(el.getAttribute('data-aura-perks') || '', { heading: el.getAttribute('data-aura-heading') || 'h3' });
      el.classList.add('aura-perks');
    });
    each(scope.querySelectorAll('[data-aura-family-cards]'), function (el) {
      if (!H.familyCard) { return; }
      el.innerHTML = cat.families().map(function (f) {
        return H.familyCard(f.id, { heading: el.getAttribute('data-aura-heading') || 'h3' });
      }).join('');
    });
    each(scope.querySelectorAll('[data-aura-from]'), function (el) {
      var list = cat.products(el.getAttribute('data-aura-from'));
      var min = list.reduce(function (m, p) { var v = num(p.basePrice, 0); return v > 0 && (!m || v < m) ? v : m; }, 0);
      var months = (AURA.data && AURA.data.financing && AURA.data.financing.months) || 24;
      el.hidden = !(min > 0);
      if (min > 0) { el.textContent = 'Desde ' + AURA.fmt.eur0(min) + ' o ' + AURA.fmt.mes(min) + ' durante ' + months + '\u00a0meses.'; }
    });
    each(scope.querySelectorAll('[data-aura-buy]'), function (el) {
      var p = cat.entry ? cat.entry(el.getAttribute('data-aura-buy')) : null;
      if (!p) { return; }
      el.setAttribute('href', cat.url(p));
      /* Botón corto («Comprar» de la barra local): el verbo según la
         disponibilidad y el nombre del modelo en aria-label. */
      if (el.hasAttribute('data-aura-buy-short')) {
        var verb = cat.cta(p);
        el.textContent = verb;
        el.setAttribute('aria-label', verb + ' ' + p.name);
      }
    });
  }

  function init(rootEl) {
    var scope = rootEl && rootEl.querySelectorAll ? rootEl : document;
    /* Primero lo que genera marcado; después lo que lo observa. */
    safe(function () { renderStore(scope); });
    each(scope.querySelectorAll('[data-aura-lineup]'), function (el) { safe(function () { renderLineup(el); }); });
    each(scope.querySelectorAll('[data-aura-compare]'), function (el) { safe(function () { renderCompare(el); }); });
    each(scope.querySelectorAll('[data-aura-carousel]'), function (el) { safe(function () { initCarousel(el); }); });
    each(scope.querySelectorAll('[data-aura-sheet]'), function (el) { safe(function () { initSheet(el); }); });
    each(scope.querySelectorAll('[data-aura-localnav], .aura-localnav'), function (el) { safe(function () { initLocalnav(el); }); });
    each(scope.querySelectorAll('[data-aura-buybar]'), function (el) { safe(function () { initBuybar(el); }); });
    each(scope.querySelectorAll('.aura-buybar'), function (el) { safe(function () { initBuybarBox(el); }); });
    each(scope.querySelectorAll('.aura-segmented'), function (el) { safe(function () { initSegmented(el); }); });
    safe(function () { reveal(scope); });
    safe(function () { if (AURA.slots) { AURA.slots.scan(scope); } });
  }
  ui.init = function (rootEl) { safe(function () { init($(rootEl)); }); };

  /* Red de seguridad: el HTML que una página inserte más tarde con JS se
     inicializa solo (si no, un [data-aura-reveal] nuevo se quedaría invisible). */
  var AUTO = '[data-aura-reveal], [data-aura-carousel], [data-aura-sheet], [data-aura-lineup], [data-aura-compare], [data-aura-localnav], .aura-localnav, [data-aura-buybar], .aura-buybar, .aura-segmented';

  function initAdded(node) {
    if (!node || node.nodeType !== 1 || !node.querySelectorAll) { return; }
    watchImages(node);
    if (AURA.legal && (node.hasAttribute('data-aura-legal') || node.querySelector('[data-aura-legal]'))) { AURA.legal.fill(node.parentNode || node); }
    var self = node.matches && node.matches(AUTO);
    if (!self && !node.querySelector(AUTO)) { return; }
    if (self) {
      /* init() solo mira dentro del nodo: el propio nodo se trata aquí. */
      if (node.hasAttribute('data-aura-lineup') && !node.children.length) { renderLineup(node); }
      if (node.hasAttribute('data-aura-compare') && !node.children.length) { renderCompare(node); }
      if (node.hasAttribute('data-aura-carousel')) { initCarousel(node); }
      if (node.hasAttribute('data-aura-sheet')) { initSheet(node); }
      if (node.hasAttribute('data-aura-localnav') || node.classList.contains('aura-localnav')) { initLocalnav(node); }
      if (node.hasAttribute('data-aura-buybar')) { initBuybar(node); }
      if (node.classList.contains('aura-buybar')) { initBuybarBox(node); }
      if (node.classList.contains('aura-segmented')) { initSegmented(node); }
    }
    each(node.querySelectorAll('[data-aura-lineup]'), function (el) { if (!el.children.length) { safe(function () { renderLineup(el); }); } });
    each(node.querySelectorAll('[data-aura-compare]'), function (el) { if (!el.children.length) { safe(function () { renderCompare(el); }); } });
    each(node.querySelectorAll('[data-aura-carousel]'), function (el) { safe(function () { initCarousel(el); }); });
    each(node.querySelectorAll('[data-aura-sheet]'), function (el) { safe(function () { initSheet(el); }); });
    each(node.querySelectorAll('[data-aura-localnav], .aura-localnav'), function (el) { safe(function () { initLocalnav(el); }); });
    each(node.querySelectorAll('[data-aura-buybar]'), function (el) { safe(function () { initBuybar(el); }); });
    each(node.querySelectorAll('.aura-buybar'), function (el) { safe(function () { initBuybarBox(el); }); });
    each(node.querySelectorAll('.aura-segmented'), function (el) { safe(function () { initSegmented(el); }); });
    reveal(node);
  }

  /* Huecos de imagen insertados con JS (innerHTML): además del aviso global
     de aura-core.js, cada <img data-slot> escucha su propio error y se revisa
     al entrar en el documento. Así nunca se queda a la vista el icono de
     imagen rota del navegador, aunque el error llegue antes de que la página
     termine de pintar o mientras la imagen aún no está conectada. */
  function watchImage(img) {
    if (!img || img._auraWatched) { return; }
    img._auraWatched = true;
    img.addEventListener('error', function () {
      if (img.parentNode && AURA.slots) { AURA.slots.scan(img.parentNode); }
    });
  }
  function watchImages(node) {
    var imgs = node.matches && node.matches('img[data-slot]') ? [node] : toArray(node.querySelectorAll('img[data-slot]'));
    if (!imgs.length) { return; }
    imgs.forEach(watchImage);
    if (AURA.slots) { AURA.slots.scan(node.parentNode || node); }
  }

  /* La marca de pulgadas (″, U+2033) se dibuja siempre con Inter: Kanit la
     pinta como unas comillas rectas y la mono como unas comillas tipográficas,
     así que «auraPad Pro 13″» salía de tres formas. En los textos con Kanit o
     mono, cada ″ va en un <span class="aura-inch"> (aura.css le da Inter). */
  var INCH = '\u2033';
  function fixInches(rootNode) {
    if (!rootNode || !document.createTreeWalker) { return; }
    var start = rootNode.nodeType === 3 ? rootNode.parentNode : rootNode;
    if (!start || start.nodeType !== 1) { return; }
    var nodes = [];
    if (rootNode.nodeType === 3) {
      if (rootNode.nodeValue.indexOf(INCH) !== -1) { nodes.push(rootNode); }
    } else {
      var walker = document.createTreeWalker(start, 4, null);
      for (var t = walker.nextNode(); t; t = walker.nextNode()) {
        if (t.nodeValue.indexOf(INCH) !== -1) { nodes.push(t); }
      }
    }
    nodes.forEach(function (text) {
      var parent = text.parentNode;
      if (!parent || parent.nodeType !== 1 || parent.classList.contains('aura-inch') ||
        closest(parent, 'script, style, textarea, title, option, svg')) { return; }
      var cs = window.getComputedStyle(parent);
      var family = String(cs.fontFamily || '').toLowerCase();
      if (family.indexOf('kanit') !== 0 && family.indexOf('mono') === -1 && family.indexOf('consolas') === -1) { return; }
      var parts = text.nodeValue.split(INCH);
      /* En un contenedor flex o grid (el antetítulo es inline-flex con un hueco
         para su punto), cada trozo de texto y cada <span> son elementos
         distintos y el hueco los separaba: «AURAPAD AIR 13 ″». El texto entero
         va en un solo <span> (un único elemento, como era el nodo de texto). */
      var flow = /flex|grid/.test(String(cs.display || ''));
      var frag = document.createDocumentFragment();
      var box = frag;
      if (flow) {
        box = document.createElement('span');
        box.className = 'aura-inch-run';
        frag.appendChild(box);
      }
      parts.forEach(function (p, i) {
        if (p) { box.appendChild(document.createTextNode(p)); }
        if (i < parts.length - 1) {
          var s = document.createElement('span');
          s.className = 'aura-inch';
          s.textContent = INCH;
          box.appendChild(s);
        }
      });
      parent.replaceChild(frag, text);
    });
  }
  ui.fixInches = function (rootNode) { safe(function () { fixInches(rootNode || document.body); }); };

  function watchDom() {
    if (typeof window.MutationObserver !== 'function' || !document.body) { return; }
    new window.MutationObserver(function (records) {
      var removed = false;
      records.forEach(function (rec) {
        if (rec.removedNodes && rec.removedNodes.length) { removed = true; }
        each(rec.addedNodes, function (node) { safe(function () { initAdded(node); }); });
        each(rec.addedNodes, function (node) { if (node.nodeType === 1 || node.nodeType === 3) { safe(function () { fixInches(node); }); } });
      });
      if (removed && (allSheets.length || allCarousels.length)) { safe(pruneDetached); }
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* --- Arranque --- */
  if (!ui._started && document.addEventListener && html && html.classList) {
    ui._started = true;
    safe(initPress);
    safe(initScrollEdge);
    safe(initLayers);
    safe(initPopover);
    safe(initSearch);
    safe(initMenu);
    safe(initSheetTriggers);
    safe(initFormHelpers);

    /* Un marcador .aura-slot que sustituye a una imagen con data-aura-reveal hereda su aparición. */
    document.addEventListener('aura:slot', function (e) {
      var el = e && e.detail && e.detail.el;
      if (el && el.hasAttribute && el.hasAttribute('data-aura-reveal')) { safe(function () { reveal(el); }); }
    });
    safe(function () { window.addEventListener('beforeprint', function () { showAll(document); }); });

    /* .aura-ui desactiva el «seguro» del CSS que muestra el contenido a los 2,5 s
       (lo que el seguro ya mostró se queda visible: keepFailsafe). */
    safe(keepFailsafe);
    html.classList.add('aura-ui');

    /* Si el navegador se queda sin espacio a mitad de sesión, se dice una vez. */
    document.addEventListener('aura:storage', function () {
      if (ui._storageWarned) { return; }
      ui._storageWarned = true;
      ui.toast({ kind: 'warn', title: 'No se ha podido guardar en este navegador', text: 'Tus cambios se mantienen mientras no cierres esta página.' });
    });
    init(document);
    safe(function () { fixInches(document.body); });
    safe(watchDom);
  }

})(window, document);
