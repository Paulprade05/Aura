/* ==========================================================================
   AURA — Comparador de modelos (comparar.html?familia=ID)

   Todo sale del catálogo (AURA.catalog):
   - columnas: los productos de la familia ordenados por rank;
   - filas: family.compareRows con product.specs, agrupadas por tema;
   - precio y cuota: basePrice con AURA.fmt (nunca el texto escrito a mano);
   - disponibilidad y botón: AURA.catalog.availability() y .cta() (por fechas).

   Escritorio y tableta: tres columnas. Móvil (< 768 px): dos columnas, cada
   una con su selector de modelo justo encima (se compara lo que se ve).
   La familia se sincroniza con ?familia= mediante history.replaceState (se
   conservan los demás parámetros, p. ej. ?hoy= para simular otro día).
   ========================================================================== */
(function (window, document) {
  'use strict';

  var AURA = window.AURA;
  if (!AURA || !AURA.catalog || !AURA.fmt || !AURA.html) { return; }

  var cat = AURA.catalog;
  var fmt = AURA.fmt;
  var esc = AURA.html.esc;
  var MONTHS = (AURA.data && AURA.data.financing && AURA.data.financing.months) || 24;
  var mq = window.matchMedia ? window.matchMedia('(max-width: 767.98px)') : null;

  /* Grupos de filas. Las claves de compareRows que no estén aquí van a
     «Otras características»: si data.js añade una fila, aparece sola. */
  var GROUPS = [
    {
      id: 'rendimiento', icon: 'bi-cpu', keys: ['chip', 'memoria', 'almacenamiento'],
      title: function () { return 'Rendimiento y capacidad'; }
    },
    {
      id: 'pantalla', icon: 'bi-display', keys: ['pantalla', 'camaras', 'camara'],
      title: function (keys) {
        if (keys.indexOf('camaras') !== -1) { return 'Pantalla y cámaras'; }
        if (keys.indexOf('camara') !== -1) { return 'Pantalla y cámara'; }
        return 'Pantalla';
      }
    },
    {
      id: 'energia', icon: 'bi-battery-charging', keys: ['bateria', 'conectividad', 'puertos'],
      title: function (keys) {
        if (keys.indexOf('puertos') !== -1) { return 'Batería y puertos'; }
        if (keys.indexOf('conectividad') !== -1) { return 'Batería y conectividad'; }
        return 'Batería';
      }
    },
    {
      id: 'diseno', icon: 'bi-bounding-box', keys: ['materiales', 'peso', 'accesorios'],
      title: function (keys) { return keys.indexOf('accesorios') !== -1 ? 'Diseño y accesorios' : 'Diseño'; }
    },
    { id: 'software', icon: 'bi-grid', keys: ['sistema'], title: function () { return 'Software'; } },
    { id: 'otros', icon: 'bi-list-ul', keys: [], title: function () { return 'Otras características'; } },
    { id: 'precio', icon: 'bi-tag', keys: ['precio'], title: function () { return 'Precio'; } }
  ];

  /* Una capacidad suelta («256 GB», «1 TB»): varias seguidas son opciones, no detalles. */
  var CAPACITY = /^\d+(?:[.,]\d+)?\s?(?:GB|TB)$/i;

  /* Notas al pie con llamada desde el texto (el resto se numeran a continuación). */
  var NOTE_PRICE = 'cmp-nota-precio';

  function q(sel) { return document.querySelector(sel); }

  var el = {
    lead: q('[data-cmp-lead]'),
    families: q('[data-cmp-families]'),
    modelsTitle: q('[data-cmp-models-title]'),
    pickers: q('[data-cmp-pickers]'),
    heads: q('[data-cmp-heads]'),
    toolbar: q('[data-cmp-toolbar]'),
    specs: q('[data-cmp-specs]'),
    empty: q('[data-cmp-empty]'),
    emptyTitle: q('[data-cmp-empty-title]'),
    emptyText: q('[data-cmp-empty-text]'),
    diff: q('[data-cmp-diff]'),
    status: q('[data-cmp-status]'),
    bar: q('[data-cmp-bar]'),
    barCols: q('[data-cmp-bar-cols]'),
    notes: q('[data-cmp-notes]'),
    notesMore: q('[data-cmp-notes-more]'),
    familyTitle: q('[data-cmp-family-title]'),
    familyText: q('[data-cmp-family-text]'),
    familyLink: q('[data-cmp-family-link]'),
    tradeLink: q('[data-cmp-trade-link]'),
    tradeText: q('[data-cmp-trade-text]'),
    nav: q('[data-aura-nav]')
  };
  if (!el.heads || !el.specs) { return; }

  var EMPTY_DEFAULT = {
    title: el.emptyTitle ? el.emptyTitle.textContent : '',
    text: el.emptyText ? el.emptyText.textContent : ''
  };

  var state = {
    family: '',
    picks: [0, 1],          // móvil: qué modelo (índice por rank) va en cada columna
    diff: !!(el.diff && el.diff.checked),
    compact: !!(mq && mq.matches)
  };


  /* ------------------------------------------------------------------ */
  /* Utilidades                                                         */
  /* ------------------------------------------------------------------ */

  function norm(text) {
    var s = String(text == null ? '' : text).toLowerCase();
    try { if (s.normalize) { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } } catch (e) { /* nada */ }
    return s.replace(/\s+/g, ' ').trim();
  }

  /** ['negro', 'plata', 'azul'] → «negro, plata y azul» (o con «o»). */
  function listES(items, conj) {
    if (items.length < 2) { return items.join(''); }
    return items.slice(0, -1).join(', ') + ' ' + (conj || 'y') + ' ' + items[items.length - 1];
  }

  function availability(p) {
    return cat.availability ? cat.availability(p) : { status: 'disponible', text: '', canBuy: true, preorder: '', release: '' };
  }

  function products() { return cat.products(state.family).slice(0, 3); }

  /** Índices (por rank) de las columnas que se ven. */
  function columns() {
    var n = products().length;
    var all = [];
    for (var i = 0; i < n; i++) { all.push(i); }
    if (!state.compact || n < 3) { return all; }
    return state.picks.slice(0, 2);
  }

  /** «auraPhone 18 Pro Max» → «18 Pro Max» (en el selector de móvil el nombre de la familia sobra). */
  function shortName(p) {
    var fam = cat.family(p.family);
    var prefix = fam && fam.name ? fam.name + ' ' : '';
    return prefix && p.name.indexOf(prefix) === 0 ? p.name.slice(prefix.length) : p.name;
  }

  function specText(p, key) {
    if (key === 'precio') { return 'Desde ' + fmt.eur0(p.basePrice); }
    var v = p.specs && p.specs[key];
    return v == null ? '' : fmt.units(String(v).trim());   // «120 Hz», «1 TB»: cifra y unidad no se separan
  }

  /** Lo que se compara para decidir si una fila es igual en todas las columnas. */
  function compareKey(p, key) {
    return key === 'precio' ? String(Number(p.basePrice) || 0) : norm(specText(p, key));
  }

  /** Entrada sin esperas cuando cambia el contenido (solo transform y opacidad).
      dir: 1 / -1 si se ha ido a la familia de la derecha / izquierda (el
      contenido llega desde ese lado, como la pastilla del segmentado: el
      movimiento apunta al resultado); 0, solo un fundido con un leve ascenso. */
  function enter(node, dir) {
    if (!node) { return; }
    node.classList.remove('cmp-enter--next', 'cmp-enter--prev');
    node.classList.add('cmp-enter');
    if (dir > 0) { node.classList.add('cmp-enter--next'); } else if (dir < 0) { node.classList.add('cmp-enter--prev'); }
    void node.offsetWidth;
    node.classList.remove('cmp-enter', 'cmp-enter--next', 'cmp-enter--prev');
  }

  function familyIndex(id) {
    var fams = cat.families();
    for (var i = 0; i < fams.length; i++) { if (fams[i].id === id) { return i; } }
    return -1;
  }


  /* ------------------------------------------------------------------ */
  /* Familia                                                            */
  /* ------------------------------------------------------------------ */

  function defaultFamily() {
    var fams = cat.families();
    return cat.family('auraphone') ? 'auraphone' : (fams[0] ? fams[0].id : '');
  }

  function params() {
    try { return new URLSearchParams(window.location.search); } catch (e) { return null; }
  }

  /** ?familia=ID; si llega del buscador (?q=…), se intenta deducir la familia. */
  function familyFromUrl() {
    var p = params();
    var raw = p ? p.get('familia') : null;
    var id = raw == null ? '' : String(raw).toLowerCase().trim();
    if (id && cat.family(id)) { return { id: id, canonical: raw === id }; }
    var query = p ? norm(p.get('q')).replace(/\s+/g, '') : '';
    if (query) {
      var found = '';
      cat.families().forEach(function (f) {
        if (!found && query.indexOf(norm(f.name).replace(/\s+/g, '')) !== -1) { found = f.id; }
      });
      cat.products().forEach(function (prod) {
        if (!found && norm(prod.name).replace(/\s+/g, '').indexOf(query) !== -1) { found = prod.family; }
      });
      if (found) { return { id: found, canonical: false }; }
    }
    return { id: defaultFamily(), canonical: false };
  }

  /** Reescribe ?familia= sin perder el resto de parámetros (p. ej. ?hoy=). */
  function syncUrl() {
    try {
      var p = params() || new URLSearchParams('');
      p.set('familia', state.family);
      p.delete('q');
      var url = '?' + p.toString().replace(/%2C/gi, ',') + (window.location.hash || '');
      if (url !== window.location.search + (window.location.hash || '')) {
        window.history.replaceState(window.history.state, '', url);
      }
    } catch (e) { /* file:// u otro contexto sin history: no pasa nada */ }
  }

  function paintFamilyNav() {
    if (!el.families) { return; }
    var links = el.families.querySelectorAll('[data-family]');
    for (var i = 0; i < links.length; i++) {
      var id = links[i].getAttribute('data-family');
      var on = id === state.family;
      links[i].classList.toggle('is-active', on);
      if (on) { links[i].setAttribute('aria-current', 'page'); } else { links[i].removeAttribute('aria-current'); }
      /* Una familia que no está en el catálogo no se ofrece. */
      links[i].hidden = !cat.family(id);
    }
  }

  function paintFamilyTexts() {
    var fam = cat.family(state.family);
    if (!fam) { return; }
    document.title = 'Compara los modelos de ' + fam.name + ' — AURA';
    if (el.lead) { el.lead.textContent = fam.description || fam.tagline || ''; }
    if (el.modelsTitle) { el.modelsTitle.textContent = 'Modelos de ' + fam.name; }
    if (el.familyTitle) { el.familyTitle.textContent = 'Conoce la familia ' + fam.name; }
    if (el.familyText) { el.familyText.textContent = fam.tagline || 'Todo lo que hace especial a cada modelo.'; }
    if (el.familyLink && fam.page) {
      el.familyLink.setAttribute('href', fam.page);
      el.familyLink.textContent = 'Ver ' + fam.name;
    }
    /* AURA Trade In: la cifra y el enlace, de la familia que se compara. */
    var top = AURA.tradeIn && typeof AURA.tradeIn.max === 'function' ? AURA.tradeIn.max(fam.id) : 0;
    if (el.tradeText && top > 0) {
      el.tradeText.textContent = 'Consigue hasta ' + fmt.eur0(top) + ' por tu ' + fam.name +
        ' anterior con AURA Trade In y descuéntalo de tu nuevo modelo.';
    }
    if (el.tradeLink) {
      el.tradeLink.setAttribute('href', 'trade-in.html?familia=' + encodeURIComponent(fam.id) + '#calculadora');
    }
  }


  /* ------------------------------------------------------------------ */
  /* Selectores de modelo (móvil)                                       */
  /* ------------------------------------------------------------------ */

  function renderPickers() {
    if (!el.pickers) { return; }
    var list = products();
    var fam = cat.family(state.family);
    if (list.length < 3) { el.pickers.innerHTML = ''; return; }
    el.pickers.innerHTML = [0, 1].map(function (slot) {
      var id = 'cmp-modelo-' + (slot + 1);
      return '<div class="aura-field cmp-picker">' +
        '<label class="aura-field__label" for="' + id + '">' + (slot ? 'Segundo modelo' : 'Primer modelo') +
          '<span class="visually-hidden"> de ' + esc(fam ? fam.name : '') + '</span></label>' +
        '<div class="aura-field__control">' +
          '<select class="aura-select cmp-picker__select" id="' + id + '" data-pick="' + slot + '">' +
            list.map(function (p, i) {
              return '<option value="' + i + '"' + (state.picks[slot] === i ? ' selected' : '') + '>' + esc(shortName(p)) + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function syncPickers() {
    if (!el.pickers) { return; }
    var selects = el.pickers.querySelectorAll('[data-pick]');
    for (var i = 0; i < selects.length; i++) {
      var slot = Number(selects[i].getAttribute('data-pick'));
      selects[i].value = String(state.picks[slot]);
    }
  }


  /* ------------------------------------------------------------------ */
  /* Cabeceras de modelo                                                */
  /* ------------------------------------------------------------------ */

  /* Cada cabecera es una columna de una rejilla compartida (subgrid): las
     filas que existan en alguna columna existen en todas, aunque vacías, para
     que nombre, acabados, precio y botones queden a la misma altura. */
  function headRows(cols) {
    return {
      badge: cols.some(function (p) { return !!p.badge; }),
      finishes: cols.some(function (p) { return Array.isArray(p.colors) && p.colors.length; }),
      tagline: !state.compact && cols.some(function (p) { return !!p.tagline; }),
      status: cols.some(function (p) { return availability(p).status !== 'disponible'; })
    };
  }

  function rowCount(rows) {
    return 4 + (rows.badge ? 1 : 0) + (rows.finishes ? 1 : 0) + (rows.tagline ? 1 : 0) + (rows.status ? 1 : 0);
  }

  function swatchesHTML(colors) {
    if (!colors.length) { return ''; }
    var names = colors.map(function (c) { return String(c.name).toLowerCase(); });
    return '<p class="aura-swatch-list" role="img" aria-label="' + esc((colors.length === 1 ? 'Acabado: ' : 'Acabados: ') + listES(names)) + '">' +
        colors.map(function (c) {
          return '<span class="aura-swatch-list__dot" style="--swatch:' + esc(c.hex) + '"></span>';
        }).join('') +
      '</p>' +
      '<span class="aura-caption aura-caption--muted" aria-hidden="true">' + colors.length + (colors.length === 1 ? ' acabado' : ' acabados') + '</span>';
  }

  function headHTML(p, slot, rows) {
    var fam = cat.family(p.family);
    var colors = Array.isArray(p.colors) ? p.colors : [];
    /* La foto en el acabado que enseña (el de la foto, como la tarjeta de
       modelo): su alt describe la foto real. */
    var img = cat.image(p);
    var href = cat.url(p);
    var cta = cat.cta(p);
    var a = availability(p);
    var nameId = 'cmp-modelo-nombre-' + slot;

    return '<article class="cmp-head" aria-labelledby="' + nameId + '" data-product="' + esc(p.id) + '" data-status="' + esc(a.status) + '">' +
      '<a class="aura-product-card__media cmp-head__media" href="' + esc(href) + '" tabindex="-1" aria-hidden="true">' +
        /* Primer pantallazo de la página: sin carga diferida. */
        (img.slot ? AURA.html.img(img.slot, { fallback: img.fallback, alt: img.alt || p.name, eager: true }) : '') +
      '</a>' +
      (rows.badge
        ? '<p class="aura-eyebrow aura-eyebrow--mono aura-eyebrow--plain cmp-head__badge">' + esc(p.badge || '') + '</p>'
        : '') +
      /* El nombre de la tarjeta de modelo: misma letra y mismo objetivo táctil de 44 px. */
      '<h3 class="aura-product-card__name cmp-head__name" id="' + nameId + '"><a href="' + esc(href) + '">' + esc(p.name) + '</a></h3>' +
      (rows.finishes ? '<div class="cmp-head__finishes">' + swatchesHTML(colors) + '</div>' : '') +
      (rows.tagline ? '<p class="cmp-head__tagline">' + esc(p.tagline || '') + '</p>' : '') +
      (rows.status
        ? '<p class="aura-product-card__status cmp-head__status">' +
            (a.text ? '<i class="bi bi-calendar-event" aria-hidden="true"></i><span>' + esc(a.text) + '</span>' : '') +
          '</p>'
        : '') +
      '<p class="cmp-head__price">' +
        '<span class="aura-price">Desde ' + esc(fmt.eur0(p.basePrice)) + '</span>' +
        /* La llamada va en el texto de apoyo, nunca en la cifra. */
        '<span class="aura-caption">o ' + esc(fmt.mes(p.basePrice)) + ' durante ' + MONTHS + '&nbsp;meses' +
          '<sup class="aura-footnote-ref"><a href="#' + NOTE_PRICE + '"' + (slot === 0 ? ' id="cmp-ref-precio"' : '') + ' aria-label="Nota 1">1</a></sup></span>' +
      '</p>' +
      '<div class="cmp-head__actions">' +
        /* El botón de 48 px de la guía, como en la tarjeta de modelo. */
        '<a class="aura-btn aura-btn--primary" href="' + esc(href) + '" aria-label="' + esc(cta + ' ' + p.name) + '">' + esc(cta) + '</a>' +
        (fam && fam.page
          ? '<a class="aura-link" href="' + esc(fam.page) + '">Más información<span class="visually-hidden"> sobre ' + esc(fam.name) + '</span></a>'
          : '') +
      '</div>' +
    '</article>';
  }


  /* ------------------------------------------------------------------ */
  /* Especificaciones                                                   */
  /* ------------------------------------------------------------------ */

  function groupsFor(fam) {
    var rows = Array.isArray(fam && fam.compareRows) ? fam.compareRows : [];
    var buckets = GROUPS.map(function (g) { return { def: g, rows: [] }; });
    var other = null;
    buckets.forEach(function (b) { if (b.def.id === 'otros') { other = b; } });
    rows.forEach(function (row) {
      if (!row || !row.key) { return; }
      var target = null;
      buckets.forEach(function (b) { if (!target && b.def.keys.indexOf(row.key) !== -1) { target = b; } });
      (target || other).rows.push(row);
    });
    return buckets.filter(function (b) { return b.rows.length; });
  }

  function cellHTML(p, key) {
    if (key === 'precio') {
      var a = availability(p);
      return '<span class="cmp-cell__main aura-price aura-price--sm">Desde ' + esc(fmt.eur0(p.basePrice)) + '</span>' +
        '<span class="cmp-cell__more">o ' + esc(fmt.mes(p.basePrice)) + ' durante ' + MONTHS + '&nbsp;meses</span>' +
        (a.text ? '<span class="cmp-cell__more cmp-cell__status">' + esc(a.text) + '</span>' : '');
    }
    var v = specText(p, key);
    if (!v) { return '<span class="cmp-cell__main" aria-hidden="true">—</span><span class="visually-hidden">Sin dato</span>'; }
    var parts = v.split(/\s+·\s+/);
    /* «256 GB · 512 GB · 1 TB» son opciones: van juntas en una línea, no como detalles. */
    if (parts.length > 1 && parts.every(function (s) { return CAPACITY.test(s); })) {
      /* La cifra y su unidad no se separan al partir la línea. */
      var options = parts.map(function (s) { return s.replace(/\s+(?=(?:GB|TB)$)/i, ' '); });
      return '<span class="cmp-cell__main">' + esc(listES(options, 'o')) + '</span>';
    }
    return '<span class="cmp-cell__main">' + esc(parts[0]) + '</span>' +
      parts.slice(1).map(function (part) { return '<span class="cmp-cell__more">' + esc(part) + '</span>'; }).join('');
  }

  /** opts.quiet: la etiqueta repite el título del grupo («Precio» bajo «Precio»): solo para lectores de pantalla. */
  function rowHTML(row, cols, opts) {
    var keys = cols.map(function (p) { return compareKey(p, row.key); });
    var same = cols.length > 1 && keys.every(function (k) { return k === keys[0]; });
    var sameText = cols.length === 2 ? 'Igual en ambos' : 'Igual en todos';
    var quiet = !!(opts && opts.quiet) && !same;
    return '<tr class="cmp-row' + (quiet ? ' cmp-row--quiet' : '') + '" role="row" data-key="' + esc(row.key) + '"' + (same ? ' data-same=""' : '') + '>' +
      '<th class="cmp-row__label' + (quiet ? ' visually-hidden' : '') + '" role="rowheader" scope="row">' + esc(row.label || row.key) +
        (same ? ' <span class="aura-badge aura-badge--neutral aura-badge--mono cmp-row__same">' + sameText + '</span>' : '') +
      '</th>' +
      cols.map(function (p) { return '<td class="cmp-cell" role="cell">' + cellHTML(p, row.key) + '</td>'; }).join('') +
    '</tr>';
  }

  function actionsRowHTML(cols) {
    return '<tr class="cmp-row cmp-row--actions" role="row">' +
      '<th class="visually-hidden" role="rowheader" scope="row">Comprar</th>' +
      cols.map(function (p) {
        var cta = cat.cta(p);
        return '<td class="cmp-cell" role="cell"><a class="aura-btn aura-btn--secondary" href="' + esc(cat.url(p)) + '" aria-label="' + esc(cta + ' ' + p.name) + '">' + esc(cta) + '</a></td>';
      }).join('') +
    '</tr>';
  }

  function specsHTML(cols) {
    var fam = cat.family(state.family);
    return groupsFor(fam).map(function (b) {
      var gid = 'cmp-grupo-' + b.def.id;
      var keys = b.rows.map(function (r) { return r.key; });
      var title = b.def.title(keys);
      var body = b.rows.map(function (r) {
        return rowHTML(r, cols, { quiet: b.rows.length === 1 && norm(r.label || r.key) === norm(title) });
      }).join('') +
        (b.def.id === 'precio' ? actionsRowHTML(cols) : '');
      return '<section class="cmp-group" aria-labelledby="' + gid + '" data-group="' + esc(b.def.id) + '">' +
        '<div class="cmp-group__head">' +
          '<span class="aura-feature__icon" aria-hidden="true"><i class="bi ' + b.def.icon + '"></i></span>' +
          '<h3 class="aura-h4 cmp-group__title" id="' + gid + '">' + esc(title) + '</h3>' +
        '</div>' +
        '<table class="cmp-table" role="table" aria-labelledby="' + gid + '">' +
          '<thead class="visually-hidden" role="rowgroup"><tr role="row">' +
            '<th role="columnheader" scope="col">Característica</th>' +
            cols.map(function (p) { return '<th role="columnheader" scope="col">' + esc(p.name) + '</th>'; }).join('') +
          '</tr></thead>' +
          '<tbody role="rowgroup">' + body + '</tbody>' +
        '</table>' +
      '</section>';
    }).join('');
  }

  function setEmpty(show, title, text) {
    if (!el.empty) { return; }
    el.empty.hidden = !show;
    if (el.emptyTitle) { el.emptyTitle.textContent = title || EMPTY_DEFAULT.title; }
    if (el.emptyText) { el.emptyText.textContent = text || EMPTY_DEFAULT.text; }
  }

  /** Oculta (o enseña) las filas iguales y anuncia cuántas quedan. */
  function applyDiff() {
    var rows = el.specs.querySelectorAll('.cmp-row[data-key]');
    var total = rows.length;
    var cols = columns().length;
    var same = 0;
    var shown = 0;
    for (var i = 0; i < rows.length; i++) {
      var isSame = rows[i].hasAttribute('data-same');
      if (isSame) { same++; }
      rows[i].hidden = state.diff && isSame;
      if (!rows[i].hidden) { shown++; }
    }
    var groups = el.specs.querySelectorAll('.cmp-group');
    for (var g = 0; g < groups.length; g++) {
      groups[g].hidden = !groups[g].querySelector('.cmp-row[data-key]:not([hidden])');
    }
    el.specs.classList.toggle('is-diff', state.diff);

    /* Sin modelos (catálogo vacío o familia sin productos): nada que comparar. */
    if (!cols) {
      if (el.toolbar) { el.toolbar.hidden = true; }
      if (el.status) { el.status.textContent = ''; }
      var others = cat.families().some(function (f) { return f.id !== state.family && cat.products(f.id).length; });
      setEmpty(true, 'No hay modelos que comparar', 'Esta familia no tiene modelos en el catálogo en este momento.' + (others ? ' Elige otra familia arriba.' : ''));
      return;
    }
    if (el.toolbar) { el.toolbar.hidden = false; }
    setEmpty(state.diff && total && !shown);

    /* Con un solo modelo no hay nada que diferenciar: el interruptor no se ofrece. */
    if (el.diff) {
      el.diff.disabled = cols < 2;
      var diffLabel = el.diff.closest ? el.diff.closest('.aura-check') : null;
      if (diffLabel) { diffLabel.hidden = cols < 2; }
    }
    if (el.status) {
      var where = cols === 2 ? 'en ambos modelos' : 'en los ' + (cols === 3 ? 'tres' : cols) + ' modelos';
      var text;
      if (cols < 2) {
        text = total + (total === 1 ? ' característica.' : ' características.');
      } else if (!state.diff) {
        text = total + (total === 1 ? ' característica' : ' características') +
          (same ? '; ' + same + (same === 1 ? ' es igual ' : ' son iguales ') + where + '.' : ', todas distintas.');
      } else if (!same) {
        text = 'Todas las características cambian entre estos modelos.';
      } else {
        text = 'Solo lo que cambia: ' + shown + ' de ' + total + ' características.';
      }
      /* El prefijo (solo para lectores de pantalla) da contexto al anunciarse tras cambiar de familia. */
      var fam = cat.family(state.family);
      el.status.innerHTML = (fam ? '<span class="visually-hidden">' + esc(fam.name) + ': </span>' : '') + esc(text);
    }
  }


  /* ------------------------------------------------------------------ */
  /* Cabecera de columnas flotante                                      */
  /* ------------------------------------------------------------------ */

  function barHTML(cols) {
    return cols.map(function (p) {
      return '<div class="cmp-bar__col">' +
        '<p class="cmp-bar__name">' + esc(p.name) + '</p>' +
        '<p class="cmp-bar__price">Desde ' + esc(fmt.eur0(p.basePrice)) + '</p>' +
      '</div>';
    }).join('');
  }

  var barTicking = false;
  function updateBar() {
    barTicking = false;
    if (!el.bar) { return; }
    var top = el.nav ? Math.max(0, el.nav.getBoundingClientRect().bottom) : 0;
    var heads = el.heads.getBoundingClientRect();
    var specs = el.specs.getBoundingClientRect();
    var show = heads.height > 0 && heads.bottom < top && specs.bottom > top + el.bar.offsetHeight + 32;
    el.bar.classList.toggle('is-visible', show);
  }
  function requestBar() {
    if (barTicking) { return; }
    barTicking = true;
    window.requestAnimationFrame(updateBar);
  }


  /* ------------------------------------------------------------------ */
  /* Notas al pie                                                       */
  /* ------------------------------------------------------------------ */

  function renderNotes() {
    if (!el.notes) { return; }
    var legal = function (k) { return AURA.legal ? AURA.legal.text(k) : ''; };
    /* Numerada (llamada junto a cada cuota): precio base y financiación. El
       resto (precios, reservas, cifras, fecha del catálogo, demostración) va
       sin número, en la lista de debajo. */
    el.notes.innerHTML = '<li id="' + NOTE_PRICE + '">' +
      esc('Precio de la configuración base de cada modelo; el precio final depende de las opciones que elijas al comprar. ' + legal('financiacion')) +
      (document.getElementById('cmp-ref-precio')
        ? ' <a class="aura-footnotes__back" href="#cmp-ref-precio" aria-label="Volver al texto de la nota 1"><i class="bi bi-arrow-return-left" aria-hidden="true"></i></a>'
        : '') + '</li>';
    var notes = [{ text: legal('precios') }];
    products().forEach(function (p) {
      var a = availability(p);
      if (a.status === 'disponible') { return; }
      var parts = [];
      if (a.status === 'proximamente') {
        parts.push(a.preorder ? 'reservas a partir del ' + fmt.fecha(a.preorder) : 'reservas muy pronto');
      } else {
        parts.push('ya en reserva');
      }
      if (a.release) { parts.push('primeras entregas a partir del ' + fmt.fecha(a.release)); }
      notes.push({ text: p.name + ': ' + parts.join('; ') + ', según disponibilidad.' });
    });
    notes.push({ text: legal('cifras') });
    if (AURA.data && AURA.data.updated && fmt.fecha(AURA.data.updated)) {
      notes.push({ text: 'Datos del catálogo revisados el ' + fmt.fecha(AURA.data.updated) + '.' });
    }
    notes.push({ text: legal('demo') });
    if (el.notesMore) {
      el.notesMore.innerHTML = notes.filter(function (n) { return n.text; }).map(function (n) {
        return '<li>' + esc(n.text) + '</li>';
      }).join('');
    }
  }


  /* ------------------------------------------------------------------ */
  /* Pintado                                                            */
  /* ------------------------------------------------------------------ */

  function renderColumns(animate, dir) {
    var list = products();
    var cols = columns().map(function (i) { return list[i]; }).filter(Boolean);
    /* Un modelo solo ocupa media fila, no todo el ancho (la rejilla nunca baja de dos columnas). */
    var count = String(Math.max(2, cols.length));
    var rows = headRows(cols);

    el.heads.style.setProperty('--cols', count);
    el.heads.style.setProperty('--rows', String(rowCount(rows)));
    el.heads.innerHTML = cols.map(function (p, slot) { return headHTML(p, slot, rows); }).join('');

    el.specs.style.setProperty('--cols', count);
    el.specs.innerHTML = cols.length ? specsHTML(cols) : '';
    applyDiff();

    if (el.barCols) {
      el.barCols.style.setProperty('--cols', count);
      el.barCols.innerHTML = barHTML(cols);
    }

    if (animate) { enter(el.heads, dir || 0); enter(el.specs, 0); }   // la tabla (superficie grande), solo fundido
    requestBar();
  }

  function render(animate, dir) {
    paintFamilyNav();
    paintFamilyTexts();
    renderPickers();
    renderColumns(animate, dir);
    renderNotes();
  }

  function setFamily(id, opts) {
    opts = opts || {};
    if (!cat.family(id)) { return; }
    var changed = id !== state.family;
    var dir = state.family ? familyIndex(id) - familyIndex(state.family) : 0;
    state.family = id;
    if (changed) { state.picks = [0, 1]; }
    if (opts.url !== false) { syncUrl(); }
    render(!!opts.animate && changed, dir > 0 ? 1 : (dir < 0 ? -1 : 0));
  }


  /* ------------------------------------------------------------------ */
  /* Eventos                                                            */
  /* ------------------------------------------------------------------ */

  if (el.families) {
    el.families.addEventListener('click', function (e) {
      var link = e.target.closest ? e.target.closest('[data-family]') : null;
      if (!link || e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { return; }
      e.preventDefault();
      setFamily(link.getAttribute('data-family'), { animate: true });
    });
  }

  if (el.pickers) {
    el.pickers.addEventListener('change', function (e) {
      var select = e.target;
      if (!select || !select.hasAttribute || !select.hasAttribute('data-pick')) { return; }
      var slot = Number(select.getAttribute('data-pick'));
      var value = Number(select.value);
      var other = slot ? 0 : 1;
      /* Si ese modelo ya estaba en la otra columna, se intercambian. */
      if (state.picks[other] === value) { state.picks[other] = state.picks[slot]; }
      state.picks[slot] = value;
      syncPickers();
      renderColumns(true);
    });
  }

  if (el.diff) {
    el.diff.addEventListener('change', function () {
      state.diff = el.diff.checked;
      applyDiff();
      /* Muchas filas aparecen o se van a la vez: la tabla se funde en su nuevo
         estado en lugar de saltar (skill §14). */
      enter(el.specs, 0);
      requestBar();
    });
  }

  if (mq) {
    var onMedia = function (e) {
      state.compact = e.matches;
      renderColumns(false);
    };
    if (mq.addEventListener) { mq.addEventListener('change', onMedia); } else if (mq.addListener) { mq.addListener(onMedia); }
  }

  window.addEventListener('scroll', requestBar, { passive: true });
  window.addEventListener('resize', requestBar);


  /* ------------------------------------------------------------------ */
  /* Arranque                                                           */
  /* ------------------------------------------------------------------ */

  /* La URL se reescribe solo si no traía una familia válida (?familia=auraphone por defecto). */
  var start = familyFromUrl();
  if (!start.id) {
    /* Catálogo sin familias: la página lo dice en lugar de quedarse vacía. */
    if (el.families) { el.families.hidden = true; }
    renderColumns(false);
    return;
  }
  setFamily(start.id, { url: !start.canonical, animate: false });

  /* Estado de la página, para pruebas y depuración. */
  AURA.pages = AURA.pages || {};
  AURA.pages.comparar = {
    state: function () { return { family: state.family, picks: state.picks.slice(), diff: state.diff, compact: state.compact, columns: columns() }; },
    setFamily: function (id) { setFamily(id, { animate: true }); }
  };
})(window, document);
