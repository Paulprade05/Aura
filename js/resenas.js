/* ==========================================================================
   AURA — Reseñas (js/resenas.js)
   Script clásico, sin dependencias: se carga al final del <body>.

   Pinta en cada <section data-aura-reviews="FAMILIA"> la valoración media y
   las opiniones de los clientes, e inyecta los datos estructurados
   (JSON-LD: AggregateRating + Review) calculados con las MISMAS reseñas que se
   ven en pantalla (Google exige que lo marcado coincida con lo visible).

   FAMILIA: auraphone | aurapad | aurabook | aurapods | todas

   Arquitectura (tema «Reseñas Web Profesionales»):
     Google Business Profile → Places API (New) → JSON → este JS → HTML/CSS

   1. Si AURA_REVIEWS_CONFIG tiene placeId y apiKey, se piden a Google las
      reseñas reales (fetchGoogle) y se muestra «Fuente: Google».
   2. Si no (o si la petición falla), se usan las reseñas de DEMOSTRACIÓN de
      abajo, etiquetadas como tales en pantalla. AURA es una marca ficticia:
      no tiene ficha en Google, y no se inventan opiniones pasándolas por reales.

   Para activar Google: rellena placeId y apiKey (clave restringida por
   dominio HTTP referrer y a la API «Places API (New)»). No subas una clave
   sin restringir a un repositorio público.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var CONFIG = window.AURA_REVIEWS_CONFIG || {
    placeId: '',                 // p. ej. 'ChIJ…' (Google Business Profile)
    apiKey: '',                  // clave de Places API (New), restringida por dominio
    maxReviews: 6,               // máximo de tarjetas por sección
    siteName: 'AURA',
    siteUrl: 'https://aura-lyart-beta.vercel.app/'
  };

  /* --- Reseñas de demostración: concretas, con fecha, nombre y valoración;
         incluyen valoraciones medias y críticas (no se ocultan las negativas). --- */
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

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function dateText(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
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

  function fmtNum(n) { return String(n).replace('.', ','); }

  /* --- Google Places API (New): reseñas reales cuando hay placeId y apiKey --- */
  function fetchGoogle() {
    if (!CONFIG.placeId || !CONFIG.apiKey || !window.fetch) { return Promise.reject(new Error('sin-config')); }
    var url = 'https://places.googleapis.com/v1/places/' + encodeURIComponent(CONFIG.placeId) + '?languageCode=es';
    return window.fetch(url, {
      headers: {
        'X-Goog-Api-Key': CONFIG.apiKey,
        'X-Goog-FieldMask': 'rating,userRatingCount,googleMapsUri,reviews'
      }
    }).then(function (res) {
      if (!res.ok) { throw new Error('http-' + res.status); }
      return res.json();
    }).then(function (j) {
      var list = (j.reviews || []).map(function (r) {
        return {
          autor: r.authorAttribution && r.authorAttribution.displayName || 'Cliente de Google',
          fecha: String(r.publishTime || '').slice(0, 10),
          nota: r.rating,
          familia: 'todas',
          producto: '',
          texto: r.text && r.text.text || ''
        };
      }).filter(function (r) { return r.texto; });
      return { source: 'google', list: list, rating: j.rating, count: j.userRatingCount, url: j.googleMapsUri };
    });
  }

  function load() {
    return fetchGoogle().catch(function () {
      return { source: 'demo', list: DEMO.slice() };
    });
  }

  function card(r, source) {
    return '<li class="aura-review">' +
      '<article class="aura-card aura-review__card">' +
        '<header class="aura-review__head">' +
          '<span class="aura-review__avatar" aria-hidden="true">' + esc((r.autor || '?').charAt(0)) + '</span>' +
          '<div><p class="aura-review__name">' + esc(r.autor) + '</p>' +
          '<p class="aura-review__meta">' + dateText(r.fecha) + (r.producto ? ' · ' + esc(r.producto) : '') + '</p></div>' +
        '</header>' +
        '<p class="aura-review__rating">' + stars(r.nota) + '<span class="visually-hidden">Valoración: ' + esc(r.nota) + ' de 5</span></p>' +
        '<blockquote class="aura-review__text">' + esc(r.texto) + '</blockquote>' +
        '<p class="aura-review__origin">' + (source === 'google' ? 'Fuente: Google' : 'Reseña de demostración') + '</p>' +
      '</article></li>';
  }

  function jsonLd(list, avg, count, source, familia) {
    var org = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': CONFIG.siteUrl + '#organizacion',
      name: CONFIG.siteName,
      url: CONFIG.siteUrl,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: String(avg),
        bestRating: '5',
        worstRating: '1',
        reviewCount: String(count)
      },
      review: list.map(function (r) {
        return {
          '@type': 'Review',
          author: { '@type': 'Person', name: r.autor },
          datePublished: r.fecha,
          reviewBody: r.texto,
          reviewRating: { '@type': 'Rating', ratingValue: String(r.nota), bestRating: '5', worstRating: '1' }
        };
      })
    };
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.setAttribute('data-aura-reviews-ld', familia);
    s.textContent = JSON.stringify(org);
    document.head.appendChild(s);
  }

  function render(root, result) {
    var familia = root.getAttribute('data-aura-reviews') || 'todas';
    var list = result.list.filter(function (r) { return familia === 'todas' || r.familia === familia || r.familia === 'todas'; });
    var max = Number(root.getAttribute('data-max')) || CONFIG.maxReviews || 6;
    list = list.slice(0, max);
    var out = root.querySelector('[data-aura-reviews-out]');
    if (!out) { return; }
    if (!list.length) { root.hidden = true; return; }

    var avg = result.source === 'google' && result.rating ? Math.round(result.rating * 10) / 10 : average(list);
    var count = result.source === 'google' && result.count ? result.count : list.length;
    var note = result.source === 'google'
      ? 'Opiniones publicadas en Google' + (result.url ? '. <a class="aura-link" href="' + esc(result.url) + '" rel="noopener">Ver todas en Google</a>' : '')
      : 'Opiniones de demostración: AURA es un proyecto ficticio y estas reseñas no proceden de clientes reales.';

    out.innerHTML =
      '<div class="aura-reviews__summary">' +
        '<p class="aura-reviews__avg"><span class="visually-hidden">Valoración media: </span>' + fmtNum(avg) + '<span aria-hidden="true"> / 5</span><span class="visually-hidden"> de 5</span></p>' +
        '<div>' + stars(avg) + '<p class="aura-reviews__count">' + count + (count === 1 ? ' reseña' : ' reseñas') + '</p></div>' +
      '</div>' +
      '<ul class="aura-reviews__list" role="list">' + list.map(function (r) { return card(r, result.source); }).join('') + '</ul>' +
      '<p class="aura-reviews__note">' + note + '</p>';
    out.removeAttribute('aria-busy');
    jsonLd(list, avg, count, result.source, familia);
  }

  function init() {
    var roots = Array.prototype.slice.call(document.querySelectorAll('[data-aura-reviews]'));
    if (!roots.length) { return; }
    load().then(function (result) {
      roots.forEach(function (root) { render(root, result); });
    });
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
  window.AURA_REVIEWS = { demo: DEMO, config: CONFIG };
})(window, document);
