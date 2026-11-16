/* ==========================================================================
   AURA — Reseñas (js/resenas.js)
   Script clásico, sin dependencias: se carga al final del <body>.

   Pinta en cada <section data-aura-reviews="FAMILIA"> la valoración media y
   las opiniones, y deja opinar a los clientes que HAN COMPRADO el producto.

   FAMILIA: auraphone | aurapad | aurabook | aurapods | todas

   Reseñas de clientes (API /api/reviews, Neon Postgres)
     · Solo puede publicar quien tiene sesión y un pedido con ese producto: lo
       comprueba el servidor (el formulario solo es la comodidad).
     · Cada cliente tiene una reseña por producto; puede editarla.
     · Llevan la etiqueta «Compra verificada».
   Reseñas de demostración (array DEMO)
     · Rellenan la sección mientras hay pocas reseñas de clientes y se etiquetan
       como «Reseña de demostración». AURA es una marca ficticia.
   Datos estructurados (JSON-LD): solo con reseñas de clientes reales; las de
   demostración no se marcan.

   Opcional: con AURA_REVIEWS_CONFIG.placeId y apiKey se leerían las de Google
   Places API (New) en lugar de las de demostración.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var CONFIG = window.AURA_REVIEWS_CONFIG || {
    placeId: '', apiKey: '', maxReviews: 6,
    siteName: 'AURA', siteUrl: 'https://aura-lyart-beta.vercel.app/'
  };

  /* Ruta base del sitio, deducida de este script (js/resenas.js o ../js/resenas.js). */
  var BASE = (function () {
    var s = document.currentScript && document.currentScript.getAttribute('src');
    return s ? s.replace(/js\/resenas\.js.*$/, '') : '';
  })();

  var DEMO = [
    { autor: 'Marta L.',  fecha: '2026-10-28', nota: 5, familia: 'auraphone', producto: 'auraPhone 18 Pro',
      texto: 'Vengo de un móvil de hace cuatro años. La batería me dura el día entero con el doble de uso y la cámara de noche se nota desde la primera foto. El Trade In me descontó 310 € y todo fue en una tarde.' },
    { autor: 'Javier R.', fecha: '2026-11-04', nota: 4, familia: 'auraphone', producto: 'auraPhone Duo',
      texto: 'Plegado cabe en el bolsillo y abierto trabajo con dos apps a la vez. Le quito una estrella por el precio y porque el pliegue se nota al tacto; la pantalla, espectacular.' },
    { autor: 'Lucía M.',  fecha: '2026-10-19', nota: 5, familia: 'aurapad',   producto: 'auraPad Pro 11″',
      texto: 'Lo uso para ilustrar y tomar apuntes en la universidad. El lápiz no tiene retardo apreciable y la autonomía me da para una semana de clases sin cargarlo.' },
    { autor: 'Andrés P.', fecha: '2026-11-09', nota: 3, familia: 'aurapad',   producto: 'auraPad Air 13″',
      texto: 'Rinde muy bien, pero el cargador no viene en la caja y la entrega tardó cinco días en lugar de los dos prometidos. El soporte me atendió rápido y me compensaron con AuraCare+ un mes.' },
    { autor: 'Carmen S.', fecha: '2026-10-31', nota: 5, familia: 'aurabook',  producto: 'auraBook Pro 14″',
      texto: 'Edito vídeo 4K en el tren y el ventilador casi no se oye. Exporto un proyecto de 10 minutos en menos de la mitad de tiempo que con mi portátil anterior.' },
    { autor: 'Pablo G.',  fecha: '2026-11-07', nota: 4, familia: 'aurabook',  producto: 'auraBook Air 15″',
      texto: 'Ligero, silencioso y con una pantalla muy cómoda para trabajar horas. Echo en falta más puertos; con un adaptador lo resuelvo.' },
    { autor: 'Elena V.',  fecha: '2026-11-02', nota: 5, familia: 'aurapods',  producto: 'auraPods Pro 3',
      texto: 'La cancelación de ruido en la oficina abierta marca la diferencia. Se emparejan con el auraPhone en un segundo y el estuche aguanta toda la semana.' },
    { autor: 'Sergio T.', fecha: '2026-11-10', nota: 4, familia: 'aurapods',  producto: 'auraPods Max 2',
      texto: 'Sonido muy equilibrado y comodísimos con gafas. Pesan algo más que otros de su gama, pero la calidad de los materiales lo compensa.' }
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtNum(n) { return String(n).replace('.', ','); }

  function dateText(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    if (!m) { return esc(iso); }
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    var txt = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    return '<time datetime="' + m[1] + '-' + m[2] + '-' + m[3] + '">' + esc(txt) + '</time>';
  }

  function stars(n) {
    var out = '';
    for (var i = 1; i <= 5; i++) {
      out += '<span class="bi ' + (i <= Math.round(n) ? 'bi-star-fill' : 'bi-star') + '" aria-hidden="true"></span>';
    }
    return '<span class="aura-stars">' + out + '</span>';
  }

  function average(list) {
    if (!list.length) { return 0; }
    var sum = 0;
    list.forEach(function (r) { sum += Number(r.nota); });
    return Math.round((sum / list.length) * 10) / 10;
  }

  function productName(id) {
    var d = window.AURA && window.AURA.data && window.AURA.data.products;
    var p = (d || []).filter(function (x) { return x.id === id; })[0];
    return p ? p.name : id;
  }

  function api(method, path, body) {
    var opts = { method: method, credentials: 'same-origin', headers: {} };
    if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    return window.fetch(path, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (json) { return { status: res.status, json: json }; });
    }).catch(function () { return { status: 0, json: {} }; });
  }

  /* --- Carga: reseñas de clientes (servidor) o, si no hay servidor, solo las de demostración --- */
  function load(fam) {
    return api('GET', '/api/reviews' + (fam && fam !== 'todas' ? '?familia=' + encodeURIComponent(fam) : '')).then(function (r) {
      if (r.status === 200 && r.json && Array.isArray(r.json.reviews)) {
        return { server: true, real: r.json.reviews.map(function (x) {
          return { autor: x.autor, fecha: x.creado, nota: x.nota, familia: x.familia, producto: productName(x.producto), texto: x.texto, verificada: true };
        }), user: r.json.user, comprados: r.json.comprados || [], mine: r.json.mine || [] };
      }
      return { server: false, real: [], user: null, comprados: [], mine: [] };
    });
  }

  /* --- Tarjeta --- */
  function card(r) {
    var origin = r.verificada ? '<span class="bi bi-patch-check-fill" aria-hidden="true"></span> Compra verificada' : 'Reseña de demostración';
    return '<li class="aura-review"><article class="aura-card aura-review__card">' +
      '<header class="aura-review__head">' +
        '<span class="aura-review__avatar" aria-hidden="true">' + esc((r.autor || '?').charAt(0)) + '</span>' +
        '<div><p class="aura-review__name">' + esc(r.autor) + '</p>' +
        '<p class="aura-review__meta">' + dateText(r.fecha) + (r.producto ? ' · ' + esc(r.producto) : '') + '</p></div>' +
      '</header>' +
      '<p class="aura-review__rating">' + stars(r.nota) + '<span class="visually-hidden">Valoración: ' + esc(r.nota) + ' de 5</span></p>' +
      '<blockquote class="aura-review__text">' + esc(r.texto) + '</blockquote>' +
      '<p class="aura-review__origin' + (r.verificada ? ' is-verified' : '') + '">' + origin + '</p>' +
    '</article></li>';
  }

  function jsonLd(real, avg, familia) {
    var old = document.querySelector('script[data-aura-reviews-ld="' + familia + '"]');
    if (old) { old.remove(); }
    if (!real.length) { return; }          // sin reseñas de clientes no se marca nada
    var org = {
      '@context': 'https://schema.org', '@type': 'Organization', '@id': CONFIG.siteUrl + '#organizacion',
      name: CONFIG.siteName, url: CONFIG.siteUrl,
      aggregateRating: { '@type': 'AggregateRating', ratingValue: String(avg), bestRating: '5', worstRating: '1', reviewCount: String(real.length) },
      review: real.map(function (r) {
        return { '@type': 'Review', author: { '@type': 'Person', name: r.autor }, datePublished: String(r.fecha).slice(0, 10),
          reviewBody: r.texto, reviewRating: { '@type': 'Rating', ratingValue: String(r.nota), bestRating: '5', worstRating: '1' } };
      })
    };
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.setAttribute('data-aura-reviews-ld', familia);
    s.textContent = JSON.stringify(org);
    document.head.appendChild(s);
  }

  /* --- Lista y resumen --- */
  function renderList(root, st) {
    var fam = root.getAttribute('data-aura-reviews') || 'todas';
    var max = Number(root.getAttribute('data-max')) || CONFIG.maxReviews || 6;
    var demo = DEMO.filter(function (r) { return fam === 'todas' || r.familia === fam; });
    var real = st.real.slice(0, max);
    var list = real.concat(demo.slice(0, Math.max(0, max - real.length)));
    var out = root.querySelector('[data-aura-reviews-out]');
    if (!out) { return; }
    var basis = st.real.length ? st.real : demo;
    var avg = average(basis);
    var note = st.real.length
      ? 'Las reseñas con «Compra verificada» son de clientes que han comprado el producto en AURA.' + (real.length < list.length ? ' Las de demostración rellenan la lista mientras hay pocas: AURA es un proyecto ficticio y no proceden de clientes reales.' : '')
      : 'Opiniones de demostración: AURA es un proyecto ficticio y estas reseñas no proceden de clientes reales.';
    out.innerHTML =
      '<div class="aura-reviews__summary">' +
        '<p class="aura-reviews__avg"><span class="visually-hidden">Valoración media: </span>' + fmtNum(avg) + '<span aria-hidden="true"> / 5</span><span class="visually-hidden"> de 5</span></p>' +
        '<div>' + stars(avg) + '<p class="aura-reviews__count">' + basis.length + (basis.length === 1 ? ' reseña' : ' reseñas') + (st.real.length ? ' de clientes' : '') + '</p></div>' +
      '</div>' +
      '<ul class="aura-reviews__list" role="list">' + list.map(card).join('') + '</ul>' +
      '<p class="aura-reviews__note">' + note + '</p>';
    out.removeAttribute('aria-busy');
    jsonLd(st.real, average(st.real), fam);
  }

  /* --- Formulario: solo para quien ha comprado --- */
  function renderForm(root, st, reload) {
    var fam = root.getAttribute('data-aura-reviews') || 'todas';
    var box = root.querySelector('[data-aura-reviews-form]');
    if (!box) {
      box = document.createElement('div');
      box.setAttribute('data-aura-reviews-form', '');
      box.className = 'aura-reviews__form';
      root.querySelector('.aura-container').appendChild(box);
    }
    if (!st.server) { box.innerHTML = ''; return; }          // sin servidor no se puede opinar

    var famName = fam === 'todas' ? 'AURA' : (window.AURA && window.AURA.data && (window.AURA.data.families || []).filter(function (f) { return f.id === fam; })[0] || {}).name || fam;
    var head = '<h3 class="aura-reviews__form-title">Deja tu opinión</h3>';

    if (!st.user) {
      box.innerHTML = head + '<p class="aura-body">Solo pueden opinar los clientes que han comprado el producto. <a class="aura-link" href="' + BASE + 'html/login.html">Inicia sesión</a> para comprobar tus compras.</p>';
      return;
    }
    var ids = st.comprados.filter(function (id) { return fam === 'todas' || id.indexOf(fam + '-') === 0; });
    if (!ids.length) {
      box.innerHTML = head + '<p class="aura-body">Solo pueden opinar los clientes que han comprado el producto, y todavía no tienes ningún pedido' + (fam === 'todas' ? '' : ' de ' + esc(famName)) + '. Cuando compres, podrás valorarlo aquí.</p>';
      return;
    }

    var opts = ids.map(function (id) { return '<option value="' + esc(id) + '">' + esc(productName(id)) + '</option>'; }).join('');
    var radios = '';
    for (var i = 1; i <= 5; i++) {
      radios += '<input class="aura-rate__input" type="radio" name="nota-' + fam + '" id="nota-' + fam + '-' + i + '" value="' + i + '"' + (i === 5 ? ' required' : '') + '>' +
        '<label class="aura-rate__star" for="nota-' + fam + '-' + i + '" data-v="' + i + '"><span class="bi bi-star-fill" aria-hidden="true"></span><span class="visually-hidden">' + i + (i === 1 ? ' estrella' : ' estrellas') + '</span></label>';
    }
    box.innerHTML = head +
      '<form class="aura-reviews__formbody" novalidate>' +
        '<div class="aura-field"><label class="aura-field__label" for="rv-producto-' + fam + '">Producto que has comprado</label>' +
          '<select class="aura-select" id="rv-producto-' + fam + '" name="producto">' + opts + '</select></div>' +
        '<fieldset class="aura-rate"><legend class="aura-field__label">Tu valoración</legend><div class="aura-rate__row">' + radios + '</div></fieldset>' +
        '<div class="aura-field"><label class="aura-field__label" for="rv-texto-' + fam + '">Tu opinión (entre 20 y 600 caracteres)</label>' +
          '<textarea class="aura-textarea" id="rv-texto-' + fam + '" name="texto" rows="4" maxlength="600" aria-describedby="rv-estado-' + fam + '"></textarea></div>' +
        '<p class="aura-reviews__status" id="rv-estado-' + fam + '" role="status" aria-live="polite"></p>' +
        '<button class="aura-btn aura-btn--primary" type="submit">Publicar reseña</button>' +
      '</form>';

    var form = box.querySelector('form');
    var sel = form.elements.producto;
    var area = form.elements.texto;
    var status = box.querySelector('.aura-reviews__status');

    function paint() {
      var v = Number((form.querySelector('input[type=radio]:checked') || {}).value || 0);
      Array.prototype.forEach.call(form.querySelectorAll('.aura-rate__star'), function (l) { l.classList.toggle('is-on', Number(l.getAttribute('data-v')) <= v); });
    }
    function prefill() {
      var mine = st.mine.filter(function (m) { return m.producto === sel.value; })[0];
      area.value = mine ? mine.texto : '';
      var r = form.querySelector('input[type=radio][value="' + (mine ? mine.nota : 0) + '"]');
      Array.prototype.forEach.call(form.querySelectorAll('input[type=radio]'), function (x) { x.checked = false; });
      if (r) { r.checked = true; }
      form.querySelector('button').textContent = mine ? 'Actualizar mi reseña' : 'Publicar reseña';
      paint();
    }
    sel.addEventListener('change', prefill);
    form.addEventListener('change', paint);
    prefill();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nota = Number((form.querySelector('input[type=radio]:checked') || {}).value || 0);
      var texto = area.value.trim();
      if (!nota) { status.textContent = 'Elige una valoración de 1 a 5 estrellas.'; return; }
      if (texto.length < 20) { status.textContent = 'Cuéntanos un poco más: escribe al menos 20 caracteres.'; area.focus(); return; }
      status.textContent = 'Publicando…';
      api('POST', '/api/reviews', { producto: sel.value, nota: nota, texto: texto }).then(function (r) {
        if (r.status === 200) { status.textContent = 'Gracias: tu reseña ya está publicada.'; reload(true); return; }
        status.textContent = r.status === 403 ? 'Solo puedes opinar sobre productos que has comprado.'
          : r.status === 401 ? 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
          : 'No hemos podido publicar tu reseña. Inténtalo de nuevo.';
      });
    });
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-aura-reviews]'), function (root) {
      var fam = root.getAttribute('data-aura-reviews') || 'todas';
      function run(keepStatus) {
        load(fam).then(function (st) {
          renderList(root, st);
          var msg = keepStatus && root.querySelector('.aura-reviews__status');
          var keep = msg ? msg.textContent : '';
          renderForm(root, st, run);
          if (keep) { var s2 = root.querySelector('.aura-reviews__status'); if (s2) { s2.textContent = keep; } }
        });
      }
      run(false);
      document.addEventListener('aura:auth', function () { run(false); });
    });
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
  window.AURA_REVIEWS = { demo: DEMO, config: CONFIG };
})(window, document);
