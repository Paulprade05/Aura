/* ==========================================================================
   AURA — AURA Trade In (trade-in.html)

   Calculadora en pasos: familia → dispositivo → estado → resultado en vivo.
   Todo sale de AURA.data.tradeIn y de AURA.tradeIn: el valor de cada
   dispositivo (estimate), el mejor valor de una familia (max), el tope por
   dispositivo (cap) y la descripción de cada estado (condition.description).
   El crédito se guarda con AURA.tradeIn.set / get / clear.
   - Validación en línea con AURA.ui.form (si falta un paso, se dice dónde).
   - Respuesta: la cifra grande sigue al valor con el muelle del sistema
     (crítico, sin rebote); con «reducir movimiento», salta sin animar.
   - Aplicar el crédito confirma con un aviso y AURA.ui.haptic('exito') en el
     mismo instante (solo en pantallas táctiles).
   - Quitar o sustituir el crédito no pide confirmación: se hace y se ofrece
     «Deshacer» (el crédito anterior vuelve tal cual).
   - ?familia=ID (desde el comparador) preselecciona la familia si aún no
     hay un crédito guardado.
   - Un crédito guardado con un catálogo anterior (otro valor o por encima
     del tope) se recalcula al cargar: la cifra sale siempre de data.js.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var AURA = window.AURA;
  if (!AURA || !AURA.tradeIn || !AURA.fmt || !AURA.ui || !AURA.html) { return; }

  var fmt = AURA.fmt;
  var esc = AURA.html.esc;
  var cat = AURA.catalog;
  var TI = (AURA.data && AURA.data.tradeIn) || {};
  var DEVICES = Array.isArray(TI.devices) ? TI.devices.filter(Boolean) : [];
  var CONDITIONS = Array.isArray(TI.conditions) ? TI.conditions.filter(Boolean) : [];
  var MINUS = '− ';                 /* «− 200 €»: el signo no se separa de la cifra */
  /* Notas al pie con llamada desde el texto (ids fijos: el HTML las enlaza). */
  var NOTE_VALUES = 'ti-nota-valores';

  /* El mejor estado (el de mayor factor): con él, cada dispositivo vale su «hasta». */
  var BEST = CONDITIONS.reduce(function (acc, c) {
    return !acc || (Number(c.factor) || 0) > (Number(acc.factor) || 0) ? c : acc;
  }, null);

  function q(sel) { return document.querySelector(sel); }
  /* Háptica del sistema (solo táctil): acompaña al aviso, nunca lo sustituye. */
  function haptic(kind) { if (typeof AURA.ui.haptic === 'function') { AURA.ui.haptic(kind); } }

  var el = {
    heroRange: q('[data-ti-range]'),
    calcTitle: q('#calc-titulo'),
    form: q('#ti-form'),
    families: q('[data-ti-families]'),
    devices: q('[data-ti-devices]'),
    conditions: q('[data-ti-conditions]'),
    steps: q('[data-ti-steps]'),
    stepFamily: q('[data-ti-step="familia"]'),
    stepDevice: q('[data-ti-step="dispositivo"]'),
    stepCondition: q('[data-ti-step="estado"]'),
    result: q('.ti-result'),
    value: q('[data-ti-value]'),
    valueLabel: q('[data-ti-value-label]'),
    live: q('[data-ti-live]'),
    deviceLine: q('[data-ti-device-line]'),
    max: q('[data-ti-max]'),
    adjust: q('[data-ti-adjust]'),
    applyMain: q('[data-ti-apply-main]'),
    applyNote: q('[data-ti-apply-note]'),
    credit: q('[data-ti-credit]'),
    creditTitle: q('[data-ti-credit-title]'),
    creditText: q('[data-ti-credit-text]'),
    remove: q('[data-ti-remove]'),
    buybar: q('[data-ti-buybar]'),
    barName: q('[data-ti-bar-name]'),
    barValue: q('[data-ti-bar-value]'),
    faqValor: q('[data-ti-faq-valor]'),
    notes: q('[data-ti-notes]')
  };
  if (!el.form || !el.devices || !el.conditions) { return; }

  /* Sin dispositivos o sin estados en el catálogo no hay nada que calcular:
     la página lo dice y ofrece la recogida gratuita, en lugar de enseñar 0 €. */
  if (!DEVICES.length || !BEST) {
    var empty = q('[data-ti-empty]');
    el.form.hidden = true;
    if (empty) { empty.hidden = false; }
    var buybar = q('[data-ti-buybar]');
    if (buybar) { buybar.hidden = true; }
    return;
  }

  var applyButtons = document.querySelectorAll('[data-ti-apply]');
  var DEFAULT_NOTE = el.applyNote ? el.applyNote.textContent : '';


  /* ------------------------------------------------------------------ */
  /* Datos                                                              */
  /* ------------------------------------------------------------------ */

  function findById(list, id) {
    for (var i = 0; i < list.length; i++) { if (list[i] && list[i].id === id) { return list[i]; } }
    return null;
  }
  function device(id) { return findById(DEVICES, id); }
  function condition(id) { return findById(CONDITIONS, id); }
  function devicesOf(family) { return DEVICES.filter(function (d) { return d.family === family; }); }
  function pct(factor) { return Math.round((Number(factor) || 0) * 100) + ' %'; }   /* «75 %» sin partir */

  /** Lo que vale un dispositivo en el mejor estado (con el tope del catálogo). */
  function top(d) { return d && BEST ? AURA.tradeIn.estimate(d.id, BEST.id) : 0; }

  /** Del dispositivo que menos vale al que más (en el mejor estado). */
  function range(list) {
    var values = list.map(top).filter(function (v) { return v > 0; });
    if (!values.length) { return { lo: 0, hi: 0 }; }
    return { lo: Math.min.apply(null, values), hi: Math.max.apply(null, values) };
  }

  /** Nombre y estado de un crédito guardado (los de un crédito antiguo pueden faltar: se buscan en el catálogo). */
  function creditName(credit) {
    var d = credit && device(credit.deviceId);
    return (credit && credit.deviceName) || (d && d.name) || '';
  }
  function creditCondition(credit) {
    var c = credit && condition(credit.conditionId);
    return (credit && credit.conditionLabel) || (c && c.label) || '';
  }

  /** «auraBook Pro 16″ (AURA M4 Pro)» → { title: «auraBook Pro 16″», note: «AURA M4 Pro» } */
  function splitName(name) {
    var m = /^(.*?)\s*\((.+)\)\s*$/.exec(String(name || ''));
    return m ? { title: m[1], note: m[2] } : { title: String(name || ''), note: '' };
  }

  /** Para textos que se parten: el paréntesis («(AURA M4 Pro)») no se separa por dentro. */
  function display(name) {
    var n = splitName(name);
    return n.note ? n.title + ' (' + n.note.replace(/\s+/g, ' ') + ')' : n.title;
  }

  var state = { family: '', deviceId: '', conditionId: '' };

  /** Lo que muestra el resultado según lo elegido hasta ahora. */
  function compute() {
    var d = device(state.deviceId);
    var c = condition(state.conditionId);
    if (d && c) { return { mode: 'exact', d: d, c: c, max: top(d), value: AURA.tradeIn.estimate(d.id, c.id) }; }
    if (d) { return { mode: 'device', d: d, c: c, max: top(d), value: top(d) }; }
    /* Sin modelo: el mejor valor de la familia; si ya se dijo el estado
       (p. ej. tras cambiar de familia), el mejor valor en ese estado. */
    var value = state.family ? AURA.tradeIn.max(state.family) : 0;
    if (c) {
      value = devicesOf(state.family).reduce(function (acc, dev) {
        return Math.max(acc, AURA.tradeIn.estimate(dev.id, c.id));
      }, 0);
    }
    return { mode: 'family', d: null, c: c, max: 0, value: value };
  }


  /* ------------------------------------------------------------------ */
  /* Cifra grande: muelle del sistema (sin rebote: no hubo gesto)       */
  /* ------------------------------------------------------------------ */

  var counter = typeof AURA.ui.spring === 'function'
    ? AURA.ui.spring({
      from: 0, to: 0, damping: 1, response: 0.45, precision: 0.5, autoStart: false,
      onUpdate: function (v) { if (el.value) { el.value.textContent = fmt.eur0(Math.round(v)); } }
    })
    : null;
  var counted = false;

  function showValue(v, instant) {
    if (!el.value) { return; }
    if (!counter) { el.value.textContent = fmt.eur0(v); return; }
    var reduce = typeof AURA.ui.reducedMotion === 'function' && AURA.ui.reducedMotion();
    if (instant || reduce || !counted) { counter.jump(v); el.value.textContent = fmt.eur0(v); } else { counter.setTarget(v); }
    counted = true;
  }


  /* ------------------------------------------------------------------ */
  /* Pintado                                                            */
  /* ------------------------------------------------------------------ */

  function renderDevices() {
    var list = devicesOf(state.family);
    el.devices.innerHTML = list.map(function (d) {
      var n = splitName(d.name);
      return '<label class="aura-option">' +
        '<input class="aura-option__input" type="radio" name="dispositivo" value="' + esc(d.id) + '"' + (d.id === state.deviceId ? ' checked' : '') + '>' +
        '<span class="aura-option__card">' +
          '<span class="aura-option__body">' +
            '<span class="aura-option__title">' + esc(n.title) + '</span>' +
            (n.note ? '<span class="aura-option__note">' + esc(n.note) + '</span>' : '') +
          '</span>' +
          '<span class="aura-option__price">Hasta ' + esc(fmt.eur0(top(d))) + '</span>' +
        '</span>' +
      '</label>';
    }).join('');
  }

  function renderConditions() {
    el.conditions.innerHTML = CONDITIONS.map(function (c) {
      return '<label class="aura-option">' +
        '<input class="aura-option__input" type="radio" name="estado" value="' + esc(c.id) + '"' + (c.id === state.conditionId ? ' checked' : '') + '>' +
        '<span class="aura-option__card">' +
          '<span class="aura-option__body">' +
            '<span class="aura-option__title">' + esc(c.label) + '</span>' +
            (c.description ? '<span class="aura-option__note">' + esc(c.description) + '</span>' : '') +
          '</span>' +
          '<span class="aura-option__price" data-ti-cond-price="' + esc(c.id) + '"></span>' +
        '</span>' +
      '</label>';
    }).join('');
  }

  /* Con un dispositivo elegido, cada estado dice su cifra; sin él, su porcentaje. */
  function paintConditionPrices() {
    var d = device(state.deviceId);
    var spans = el.conditions.querySelectorAll('[data-ti-cond-price]');
    for (var i = 0; i < spans.length; i++) {
      var c = condition(spans[i].getAttribute('data-ti-cond-price'));
      if (!c) { continue; }
      spans[i].textContent = d ? fmt.eur0(AURA.tradeIn.estimate(d.id, c.id)) : pct(c.factor) + ' del valor';
    }
  }

  function paintSteps(r) {
    if (el.stepFamily) { el.stepFamily.classList.toggle('is-done', !!state.family); }
    if (el.stepDevice) { el.stepDevice.classList.toggle('is-done', !!r.d); }
    if (el.stepCondition) { el.stepCondition.classList.toggle('is-done', !!r.c); }
    if (el.result) { el.result.classList.toggle('is-done', r.mode === 'exact'); }
  }

  function paintApply(r) {
    var credit = AURA.tradeIn.get();
    var same = !!(credit && r.mode === 'exact' && credit.deviceId === r.d.id && credit.conditionId === r.c.id && credit.value === r.value);
    var label = same ? 'Crédito aplicado' : (credit ? 'Sustituir mi crédito' : 'Aplicar a mi compra');
    for (var i = 0; i < applyButtons.length; i++) {
      var b = applyButtons[i];
      if (same) {
        b.innerHTML = '<i class="bi bi-check2" aria-hidden="true"></i>' + label;
        b.setAttribute('aria-disabled', 'true');
      } else {
        b.textContent = label;
        b.removeAttribute('aria-disabled');
      }
    }
    if (el.applyNote) {
      el.applyNote.textContent = same
        ? 'Ya está aplicado: se descontará en tu bolsa. Cambia el modelo o el estado para recalcularlo.'
        : (credit
          ? 'Sustituirá a tu crédito actual de ' + fmt.eur0(credit.value) + (creditName(credit) ? ' por tu ' + display(creditName(credit)) : '') + '.'
          : DEFAULT_NOTE);
    }
  }

  function paintResult(opts) {
    opts = opts || {};
    var r = compute();
    showValue(r.value, opts.instant);

    /* «Hasta» va encima de la cifra (se lee «Hasta 800 €») y la condición, debajo. */
    var prefix = document.querySelector('[data-ti-value-prefix]');
    if (prefix) { prefix.hidden = r.mode === 'exact'; }
    if (el.valueLabel) {
      el.valueLabel.textContent = r.mode === 'exact' ? 'Descuento estimado'
        : (r.mode === 'device' ? 'si está como nuevo' : 'según el modelo');
    }
    if (el.deviceLine) {
      el.deviceLine.textContent = r.mode === 'exact' ? display(r.d.name) + ' · ' + r.c.label
        : (r.mode === 'device' ? display(r.d.name) + ' · Falta su estado' : 'Elige el modelo y su estado para afinar la cifra.');
    }
    if (el.max) { el.max.textContent = r.d ? fmt.eur0(r.max) : '—'; }
    if (el.adjust) {
      el.adjust.textContent = r.mode === 'exact'
        ? (r.max > r.value ? MINUS + fmt.eur0(r.max - r.value) : 'Sin ajuste')
        : '—';
    }
    /* Barra de móvil: una etiqueta corta que nunca se recorta (el modelo y el
       estado ya están a la vista, en los pasos). */
    if (el.barName) { el.barName.textContent = r.mode === 'exact' ? 'Descuento estimado' : 'Tu valor estimado'; }
    if (el.barValue) { el.barValue.textContent = (r.mode === 'exact' ? '' : 'Hasta ') + fmt.eur0(r.value); }

    /* Región viva: una sola frase con el valor final (no cada paso del muelle). */
    if (el.live && !opts.silent) {
      el.live.textContent = r.mode === 'exact'
        ? 'Valor estimado: ' + fmt.eur0(r.value) + '. ' + r.d.name + ', ' + String(r.c.label).toLowerCase() + '.'
        : (r.mode === 'device'
          ? 'Hasta ' + fmt.eur0(r.value) + ' por tu ' + r.d.name + ' si está como nuevo. Elige su estado.'
          : 'Hasta ' + fmt.eur0(r.value) + ', según el modelo.');
    }

    paintSteps(r);
    paintApply(r);
  }

  function paintCredit() {
    var credit = AURA.tradeIn.get();
    if (el.credit) {
      el.credit.hidden = !credit;
      if (credit) {
        if (el.creditTitle) { el.creditTitle.textContent = 'Tienes ' + fmt.eur0(credit.value) + ' de crédito activo'; }
        if (el.creditText) {
          el.creditText.textContent = (display(creditName(credit)) || 'Tu dispositivo') +
            (creditCondition(credit) ? ' · ' + creditCondition(credit) : '') +
            '. Se descontará en tu bolsa al tramitar el pedido.';
        }
      }
    }
    paintApply(compute());
  }

  function paintFamilyRadios() {
    if (!el.families) { return; }
    var radios = el.families.querySelectorAll('input[name="familia"]');
    for (var i = 0; i < radios.length; i++) {
      radios[i].checked = radios[i].value === state.family;
      /* Una familia sin dispositivos en el catálogo de Trade In no se ofrece. */
      var label = radios[i].closest ? radios[i].closest('.aura-segmented__item') : null;
      if (label) { label.hidden = !devicesOf(radios[i].value).length; }
    }
  }

  /* Textos que dependen del catálogo: rango del héroe, preguntas, notas y precios. */
  function paintStaticTexts() {
    var all = range(DEVICES);
    var cap = AURA.tradeIn.cap;
    if (el.heroRange && all.hi) {
      el.heroRange.textContent = all.lo < all.hi
        ? 'entre ' + fmt.eur0(all.lo) + ' y ' + fmt.eur0(all.hi) + ' de descuento'
        : 'hasta ' + fmt.eur0(all.hi) + ' de descuento';
    }
    var factors = CONDITIONS.map(function (c) { return String(c.label).toLowerCase() + ', el ' + pct(c.factor); });
    var capText = cap > 0 ? fmt.eur0(cap) + ' por dispositivo ni ' : '';
    if (el.faqValor && factors.length) {
      el.faqValor.textContent = 'Cada modelo tiene un valor máximo: lo que vale como nuevo. Su estado ajusta esa cifra (' +
        factors.join('; ') + '). El descuento nunca supera ' + capText + 'el importe de tu pedido.';
    }
    if (el.notes) {
      /* Numeradas (con llamada en el texto y «volver»); la letra pequeña
         general (confirmación, precios, demostración) va en la lista sin
         números del HTML. */
      var notes = [
        { id: NOTE_VALUES, ref: 'ti-ref-valores', text: 'Valores de AURA Trade In para dispositivos como nuevos' +
          (all.hi ? ': de ' + fmt.eur0(all.lo) + ' a ' + fmt.eur0(all.hi) + ' según el modelo' : '') +
          '. El estado los ajusta' + (factors.length ? ' (' + factors.join('; ') + ')' : '') +
          ' y el descuento nunca supera ' + capText + 'el importe del pedido.' }
      ];
      el.notes.innerHTML = notes.map(function (n, i) {
        return '<li id="' + n.id + '">' + esc(n.text) +
          ' <a class="aura-footnotes__back" href="#' + n.ref + '" aria-label="Volver al texto de la nota ' + (i + 1) + '"><i class="bi bi-arrow-return-left" aria-hidden="true"></i></a></li>';
      }).join('');
    }
  }

  /* «¿Qué vas a estrenar?»: AURA.html.familyCard ([data-aura-family-cards]). */

  /* ------------------------------------------------------------------ */
  /* Acciones                                                           */
  /* ------------------------------------------------------------------ */

  function setFamily(family) {
    if (!devicesOf(family).length || family === state.family) { return; }
    state.family = family;
    state.deviceId = '';
    renderDevices();
    if (form) { form.clear('dispositivo'); }
    paintConditionPrices();
    paintResult();
  }

  function apply(values) {
    var d = device(values.dispositivo);
    var c = condition(values.estado);
    if (!d || !c) { return; }
    var prev = AURA.tradeIn.get();
    if (prev && prev.deviceId === d.id && prev.conditionId === c.id && prev.value === AURA.tradeIn.estimate(d.id, c.id)) {
      AURA.ui.toast({ kind: 'status', title: 'Este crédito ya está aplicado', text: fmt.eur0(prev.value) + ' por tu ' + display(creditName(prev) || d.name) + '. Se descontará en tu bolsa.' });
      return;
    }
    var saved = AURA.tradeIn.set({ deviceId: d.id, conditionId: c.id });
    if (!saved) {
      AURA.ui.toast({ kind: 'error', title: 'No hemos podido aplicar el crédito', text: 'Revisa el modelo y su estado, y vuelve a intentarlo.' });
      haptic('error');
      return;
    }
    /* Siguiente paso concreto: la bolsa si ya hay algo en ella; si no, la familia del que entregas. */
    var fam = cat && cat.family(d.family);
    var inBag = AURA.bag && typeof AURA.bag.count === 'function' ? AURA.bag.count() : 0;
    var next = inBag
      ? { label: 'Ver la bolsa', href: 'bolsa.html' }
      : { label: fam ? 'Ver ' + fam.name : 'Ir a la tienda', href: (fam && fam.page) || 'index.html' };
    /* Sustituir un crédito sin preguntar, pero con «Deshacer» (el anterior
       vuelve tal cual); el crédito activo ya ofrece «Ver la bolsa» arriba. */
    var action = prev
      ? { label: 'Deshacer', onClick: function () {
          var back = AURA.tradeIn.set(prev);
          if (back) {
            AURA.ui.toast({ kind: 'status', title: 'Vuelves a tener ' + fmt.eur0(back.value) + ' de crédito', text: 'Por tu ' + display(back.deviceName || creditName(prev)) + '.' });
          }
        } }
      : { label: next.label, onClick: function () { window.location.href = next.href; } };
    AURA.ui.toast({
      kind: 'ok',
      title: (prev ? 'Crédito sustituido: ' : 'Crédito aplicado: ') + fmt.eur0(saved.value),
      text: 'Por tu ' + display(saved.deviceName) + '. Se descontará en tu bolsa al tramitar el pedido.',
      action: action
    });
    haptic('exito');                 /* en el mismo instante que el aviso (completado) */
    if (AURA.storage && AURA.storage.persistent === false) {
      AURA.ui.toast({ kind: 'warn', title: 'Este navegador no guarda datos', text: 'El crédito se mantiene mientras no cierres esta página.' });
    }
  }

  var form = AURA.ui.form(el.form, {
    dispositivo: { required: 'Elige el modelo que vas a entregar.' },
    estado: { required: 'Elige en qué estado está.' }
  }, {
    onSubmit: function (values) { apply(values); }
  });

  el.form.addEventListener('change', function (e) {
    var t = e.target;
    if (!t || !t.name) { return; }
    if (t.name === 'familia') { setFamily(t.value); return; }
    if (t.name === 'dispositivo') {
      state.deviceId = t.value;
      paintConditionPrices();
      paintResult();
      return;
    }
    if (t.name === 'estado') {
      state.conditionId = t.value;
      paintResult();
    }
  });

  if (el.remove) {
    el.remove.addEventListener('click', function () {
      var prev = AURA.tradeIn.get();
      if (!prev) { return; }
      AURA.tradeIn.clear();
      /* El aviso desaparece: el foco pasa al título de la calculadora, justo encima. */
      if (el.calcTitle) { try { el.calcTitle.focus({ preventScroll: true }); } catch (err) { el.calcTitle.focus(); } }
      AURA.ui.toast({
        kind: 'warn',
        title: 'Crédito quitado',
        text: 'Ya no se descontarán ' + fmt.eur0(prev.value) + ' de tu bolsa.',
        action: { label: 'Deshacer', onClick: function () { AURA.tradeIn.set(prev); } }
      });
    });
  }

  /* El crédito puede cambiar aquí, en la bolsa o en otra pestaña. */
  document.addEventListener('aura:tradein', paintCredit);

  /* Móvil: la barra de acción acompaña mientras eliges y se aparta en cuanto
     asoma el resumen (la misma cifra y la misma acción: no se enseñan dos veces). */
  var summary = el.result || el.applyMain;
  if (el.buybar && el.steps && summary && 'IntersectionObserver' in window) {
    var stepsInView = false;
    var summaryInView = false;
    var io = new window.IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.target === el.steps) { stepsInView = entry.isIntersecting; } else { summaryInView = entry.isIntersecting; }
      });
      el.buybar.classList.toggle('is-hidden', !(stepsInView && !summaryInView));
    }, { rootMargin: '0px 0px -15% 0px' });
    io.observe(el.steps);
    io.observe(summary);
  }


  /* ------------------------------------------------------------------ */
  /* Arranque: si ya hay crédito, la calculadora lo muestra elegido;     */
  /* si no, la familia de ?familia= (o la primera con dispositivos).    */
  /* ------------------------------------------------------------------ */

  function familyFromUrl() {
    try {
      var id = String(new URLSearchParams(window.location.search).get('familia') || '').toLowerCase().trim();
      return id && devicesOf(id).length ? id : '';
    } catch (e) { return ''; }
  }

  /* Un crédito guardado con otro catálogo (otro valor, o por encima del tope)
     se pone al día antes de enseñarlo: la cifra sale siempre del catálogo. */
  (function syncStoredCredit() {
    var saved = AURA.tradeIn.get();
    if (!saved) { return; }
    var d = device(saved.deviceId);
    var c = condition(saved.conditionId);
    var cap = AURA.tradeIn.cap;
    var expected = d && c ? AURA.tradeIn.estimate(d.id, c.id) : (cap > 0 ? Math.min(cap, saved.value) : saved.value);
    if (expected !== saved.value) { AURA.tradeIn.set(saved); }
  })();

  var credit = AURA.tradeIn.get();
  var creditDevice = credit && device(credit.deviceId);
  var firstFamily = '';
  ['auraphone', 'aurapad', 'aurabook'].concat(DEVICES.map(function (d) { return d.family; })).forEach(function (f) {
    if (!firstFamily && devicesOf(f).length) { firstFamily = f; }
  });
  state.family = creditDevice ? creditDevice.family : (familyFromUrl() || firstFamily);
  state.deviceId = creditDevice ? creditDevice.id : '';
  state.conditionId = creditDevice && condition(credit.conditionId) ? credit.conditionId : '';

  paintStaticTexts();
  paintFamilyRadios();
  renderDevices();
  renderConditions();
  paintConditionPrices();
  paintCredit();
  paintResult({ instant: true, silent: true });

  /* Estado de la página, para pruebas y depuración. */
  AURA.pages = AURA.pages || {};
  AURA.pages.tradeIn = {
    state: function () { var r = compute(); return { family: state.family, deviceId: state.deviceId, conditionId: state.conditionId, mode: r.mode, value: r.value }; }
  };
})(window, document);
