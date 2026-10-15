/* =============================================================================
   AURA — Captura de la guía de estilo para el plugin de Figma
   -----------------------------------------------------------------------------
   Recorre la guía ya pintada (guia-de-estilo.html a 1440 px de ancho) y guarda,
   para cada elemento visible, su caja, los estilos calculados que Figma puede
   reproducir (flex, huecos, rellenos, bordes, radios, sombras, cristal, letra…)
   y el texto con sus tramos. build.mjs convierte esa captura en marcos con auto
   layout, textos, imágenes e instancias de los componentes.

   Uso (solo hace falta si cambia la guía):
     1. Abre guia-de-estilo.html en Chrome o Edge con la ventana a 1440 px de
        ancho de página (DevTools → «Toggle device toolbar» → 1440 × 900).
     2. Pega este archivo entero en la consola y pulsa Intro: se descarga
        «guia-captura.json».
     3. Muévelo a guia-de-estilo/figma/ y ejecuta «node build.mjs».
   ============================================================================= */
(function () {
  'use strict';

  var r2 = function (n) { return Math.round(n * 100) / 100; };
  var px = function (s) { var n = parseFloat(s); return isNaN(n) ? 0 : n; };

  // Colores calculados («rgb(…)», «rgba(…)», «color(srgb …)») → [r, g, b, a] con r, g, b en 0–255
  function color(s) {
    if (!s || s === 'transparent') return null;
    var m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(s);
    var c = null;
    if (m) {
      var a = m[4] === undefined ? 1 : (m[4].slice(-1) === '%' ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
      c = [+m[1], +m[2], +m[3], a];
    } else {
      m = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/.exec(s);
      if (m) c = [m[1] * 255, m[2] * 255, m[3] * 255, m[4] === undefined ? 1 : +m[4]];
    }
    if (!c) return s;                      // formato desconocido: se guarda tal cual
    c = [Math.round(c[0]), Math.round(c[1]), Math.round(c[2]), Math.round(c[3] * 1000) / 1000];
    return c[3] === 0 ? null : c;
  }

  var INLINE_TAGS = /^(A|ABBR|B|BDI|BDO|CITE|CODE|DATA|DFN|EM|I|KBD|MARK|Q|S|SAMP|SMALL|SPAN|STRONG|SUB|SUP|TIME|U|VAR|WBR|BR|DEL|INS|LABEL)$/;
  var ATOMICOS = 'img, svg, input, select, textarea, video, canvas, iframe, .bi';

  function caja(el) {
    var r = el.getBoundingClientRect();
    return [r2(r.left + window.scrollX), r2(r.top + window.scrollY), r2(r.width), r2(r.height)];
  }

  function oculto(el, cs) {
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return true;
    if (parseFloat(cs.opacity) === 0) return true;
    // Sin cajas: no se pinta (contenido de un <details> cerrado, display: none heredado…)
    if (el.getClientRects && el.getClientRects().length === 0 && cs.display !== 'contents') return true;
    if (el.classList && (el.classList.contains('visually-hidden') || el.classList.contains('aura-skip'))) return true;
    if (cs.position === 'absolute' && cs.clip && /rect\(0(px)?,? 0(px)?,? 0(px)?,? 0(px)?\)/.test(cs.clip)) return true;
    if (cs.clipPath && /inset\(50%\)/.test(cs.clipPath)) return true;
    return false;
  }

  // Estilos de letra de un elemento (para los tramos de texto)
  function letra(cs) {
    var o = {
      ff: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
      fs: px(cs.fontSize),
      fw: parseInt(cs.fontWeight, 10) || 400,
      co: color(cs.color),
    };
    if (/monospace|Consolas/i.test(cs.fontFamily) && !/Inter|Kanit/.test(o.ff)) o.ff = 'mono';
    if (cs.fontStyle === 'italic') o.it = 1;
    if (cs.letterSpacing !== 'normal' && px(cs.letterSpacing) !== 0) o.ls = r2(px(cs.letterSpacing));
    o.lh = cs.lineHeight === 'normal' ? 0 : r2(px(cs.lineHeight));
    if (cs.textTransform && cs.textTransform !== 'none') o.tt = cs.textTransform;
    var td = cs.textDecorationLine || cs.textDecoration;
    if (td && /underline|line-through/.test(td)) o.td = /line-through/.test(td) ? 'S' : 'U';
    if (cs.verticalAlign === 'super' || cs.verticalAlign === 'sub') o.va = cs.verticalAlign;
    return o;
  }

  function espacios(texto, ws) {
    if (/^pre/.test(ws)) return texto.replace(/\r/g, '');
    if (ws === 'pre-line') return texto.replace(/[ \t]+/g, ' ');
    return texto.replace(/[\s​]+/g, function (m) { return m.indexOf(' ') >= 0 ? m.replace(/[^ ]/g, '') || ' ' : ' '; });
  }

  // Contenido de un pseudoelemento de texto («›», contadores conocidos)
  function textoPseudo(el, cs, cual) {
    var c = cs.content;
    if (!c || c === 'none' || c === 'normal') return null;
    var m = /^"((?:[^"\\]|\\.)*)"/.exec(c);
    if (m) return m[1].replace(/\\(.)/g, '$1');
    if (/^counter\(/.test(c)) {           // listas numeradas de la guía (01, 02…)
      var li = el.closest('li') || el;
      var n = 1, h = li;
      while ((h = h.previousElementSibling)) n++;
      return /leading-zero/.test(c) ? (n < 10 ? '0' + n : String(n)) : String(n);
    }
    return null;
  }

  // Pseudoelemento como caja (puntos, filetes, capas) o como texto
  function pseudo(el, cual) {
    var cs = getComputedStyle(el, cual);
    if (!cs.content || cs.content === 'none' || cs.content === 'normal') return null;
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return null;
    var tx = textoPseudo(el, cs, cual);
    var o = { pos: cs.position, d: cs.display };
    var vis = estilosCaja(cs, null);
    var w = px(cs.width), h = px(cs.height);
    if (tx && tx.trim() && !vis.bg && !vis.bw) {
      o.tx = tx; o.st = letra(cs);
      o.ml = r2(px(cs.marginLeft)); o.mr = r2(px(cs.marginRight));
      if (cs.position === 'absolute' || cs.position === 'fixed') { o.w = r2(px(cs.width)); o.h = r2(px(cs.height)); o.t = cs.top; o.l = cs.left; o.r = cs.right; o.b = cs.bottom; }
      return o;
    }
    if (!(w > 0.4 && h > 0.4) || !(vis.bg || vis.bi || vis.bw || vis.sh)) return null;
    o.w = r2(w); o.h = r2(h); o.s = vis;
    var mascara = cs.webkitMaskImage || cs.maskImage;
    if (mascara && mascara !== 'none') o.msk = mascara;   // icono dibujado con máscara (su color es el fondo)
    if (cs.position === 'absolute' || cs.position === 'fixed') {
      o.t = cs.top; o.l = cs.left; o.r = cs.right; o.b = cs.bottom;
    }
    o.ml = r2(px(cs.marginLeft)); o.mr = r2(px(cs.marginRight)); o.mt = r2(px(cs.marginTop));
    if (cs.transform && cs.transform !== 'none') o.tr = cs.transform;
    if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') o.mb = cs.mixBlendMode;
    return o;
  }

  // Lo que Figma puede reproducir de la caja de un elemento
  function estilosCaja(cs, el) {
    var s = {};
    var bg = color(cs.backgroundColor);
    if (bg) s.bg = bg;
    if (cs.backgroundImage && cs.backgroundImage !== 'none') {
      s.bi = cs.backgroundImage;
      // Un fondo en mosaico (background-size en px, como el damero) no se puede pasar a Figma tal cual
      if (cs.backgroundSize && /\d+px/.test(cs.backgroundSize)) s.bsz = cs.backgroundSize;
    }
    var bw = [px(cs.borderTopWidth), px(cs.borderRightWidth), px(cs.borderBottomWidth), px(cs.borderLeftWidth)];
    var est = [cs.borderTopStyle, cs.borderRightStyle, cs.borderBottomStyle, cs.borderLeftStyle];
    for (var i = 0; i < 4; i++) if (est[i] === 'none' || est[i] === 'hidden') bw[i] = 0;
    // Con una densidad de 1,25 el navegador pinta 1 px como 0,8: se vuelve a 1
    bw = bw.map(function (v) { return v > 0 && v < 1 ? 1 : r2(v); });
    if (bw[0] || bw[1] || bw[2] || bw[3]) {
      s.bw = bw;
      s.bc = [color(cs.borderTopColor), color(cs.borderRightColor), color(cs.borderBottomColor), color(cs.borderLeftColor)];
      if (/dashed|dotted/.test(est.join(' '))) s.bd = 1;
    }
    var w = el ? el.getBoundingClientRect().width : px(cs.width);
    var h = el ? el.getBoundingClientRect().height : px(cs.height);
    var rad = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(function (v) {
      var p = v.split(' ')[0];
      return p.slice(-1) === '%' ? r2(parseFloat(p) / 100 * Math.min(w, h)) : r2(px(p));
    });
    if (rad[0] || rad[1] || rad[2] || rad[3]) s.br = rad;
    if (cs.boxShadow && cs.boxShadow !== 'none') s.sh = cs.boxShadow;
    if (parseFloat(cs.opacity) < 1) s.op = r2(parseFloat(cs.opacity));
    var bf = cs.backdropFilter || cs.webkitBackdropFilter;
    if (bf && bf !== 'none') s.bf = bf;
    if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') s.mb = cs.mixBlendMode;
    if (cs.outlineStyle && cs.outlineStyle !== 'none' && px(cs.outlineWidth) > 0) {
      s.ol = [Math.max(1, Math.round(px(cs.outlineWidth))), color(cs.outlineColor), px(cs.outlineOffset)];
    }
    return s;
  }

  function hijosVisibles(el) {
    var res = [];
    el.childNodes.forEach(function (n) {
      if (n.nodeType === 3) { if (n.nodeValue.length) res.push(n); return; }
      if (n.nodeType !== 1) return;
      var cs = getComputedStyle(n);
      if (cs.display === 'contents') { res.push.apply(res, hijosVisibles(n)); return; }
      if (oculto(n, cs)) return;
      if (/^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|LINK|META|LEGEND)$/.test(n.tagName) && !(n.tagName === 'LEGEND' && !n.classList.contains('visually-hidden'))) return;
      res.push(n);
    });
    return res;
  }

  // ¿El nodo es contenido en línea (texto o elemento inline sin cajas dentro)?
  function enLinea(n) {
    if (n.nodeType === 3) return true;
    if (n.matches(ATOMICOS)) return false;
    if (n.tagName === 'BR') return true;
    var cs = getComputedStyle(n);
    if (cs.display !== 'inline' || cs.position === 'absolute' || cs.position === 'fixed') return false;
    if (!INLINE_TAGS.test(n.tagName)) return false;
    var pb = getComputedStyle(n, '::before'), pa = getComputedStyle(n, '::after');
    if (cajaPseudo(pb) || cajaPseudo(pa)) return false;
    return hijosVisibles(n).every(enLinea);
  }
  function cajaPseudo(cs) {
    if (!cs.content || cs.content === 'none' || cs.content === 'normal') return false;
    if (/^"[^"]+"/.test(cs.content) && !color(cs.backgroundColor) && px(cs.borderTopWidth) === 0) return false;   // «›», «·»: es texto
    if (cs.display === 'none' || parseFloat(cs.opacity) === 0) return false;
    return cs.display !== 'inline' && px(cs.width) > 0.4 && px(cs.height) > 0.4;
  }

  // Márgenes de un pseudoelemento de texto como espacios («·» entre enlaces, «›» tras un enlace)
  function margenes(cs, t) {
    var esp = function (m) { return m >= 3 ? ' ' : m > 0.5 ? '\u2009' : ''; };
    return esp(px(cs.marginLeft)) + t + esp(px(cs.marginRight));
  }

  // Tramos de texto de una lista de nodos en línea
  function tramos(nodos, padre) {
    var res = [];
    function anadir(t, st) {
      if (!t) return;
      var ult = res[res.length - 1];
      if (ult && JSON.stringify(ult.st) === JSON.stringify(st)) ult.t += t; else res.push({ t: t, st: st });
    }
    function rec(n, csPadre) {
      if (n.nodeType === 3) { anadir(espacios(n.nodeValue, csPadre.whiteSpace), letra(csPadre)); return; }
      if (n.tagName === 'BR') { anadir('\n', letra(csPadre)); return; }
      var cs = getComputedStyle(n);
      var pb = getComputedStyle(n, '::before');
      var tb = textoPseudo(n, pb, '::before');
      if (tb && pb.display !== 'none') anadir(margenes(pb, tb), letra(pb));
      hijosVisibles(n).forEach(function (h) { rec(h, cs); });
      var pa = getComputedStyle(n, '::after');
      var ta = textoPseudo(n, pa, '::after');
      if (ta && pa.display !== 'none') anadir(margenes(pa, ta), letra(pa));
    }
    var csP = getComputedStyle(padre);
    nodos.forEach(function (n) { rec(n, csP); });
    // Espacios: sin dobles ni en los extremos (salvo en «pre»)
    if (!/^pre/.test(csP.whiteSpace)) {
      var prevEsp = true;
      res.forEach(function (r) {
        var t = '';
        for (var i = 0; i < r.t.length; i++) {
          var ch = r.t[i];
          if (ch === ' ') { if (!prevEsp) t += ch; prevEsp = true; }
          else if (ch === '\n') { t = t.replace(/ $/, ''); t += ch; prevEsp = true; }
          else { t += ch; prevEsp = false; }
        }
        r.t = t;
      });
      while (res.length && !res[res.length - 1].t.replace(/ +$/, '')) res.pop();
      if (res.length) res[res.length - 1].t = res[res.length - 1].t.replace(/ +$/, '');
      res = res.filter(function (r) { return r.t.length; });
    }
    return res;
  }

  function medidaTexto(nodos) {
    var rg = document.createRange();
    rg.setStartBefore(nodos[0]);
    rg.setEndAfter(nodos[nodos.length - 1]);
    // Sin los espacios de los extremos (no se dibujan y desplazarían la caja)
    var primero = nodos[0], ultimo = nodos[nodos.length - 1];
    if (primero.nodeType === 3) { var i0 = primero.nodeValue.search(/\S/); if (i0 > 0) rg.setStart(primero, i0); }
    if (ultimo.nodeType === 3) { var m = /\s*$/.exec(ultimo.nodeValue); var i1 = ultimo.nodeValue.length - (m ? m[0].length : 0); if (i1 > 0 && i1 < ultimo.nodeValue.length) rg.setEnd(ultimo, i1); }
    var rects = Array.prototype.filter.call(rg.getClientRects(), function (r) { return r.width > 0.5 && r.height > 0.5; });
    if (!rects.length) return null;
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, tops = [];
    rects.forEach(function (r) {
      x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
      if (!tops.some(function (t) { return Math.abs(t - r.top) < 3; })) tops.push(r.top);
    });
    return { b: [r2(x0 + window.scrollX), r2(y0 + window.scrollY), r2(x1 - x0), r2(y1 - y0)], ln: tops.length };
  }

  var ESTILOS_SVG = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'opacity', 'font-size', 'font-weight', 'letter-spacing', 'text-anchor', 'dominant-baseline'];
  function svgEnLinea(svg) {
    var copia = svg.cloneNode(true);
    var orig = [svg].concat(Array.prototype.slice.call(svg.querySelectorAll('*')));
    var dest = [copia].concat(Array.prototype.slice.call(copia.querySelectorAll('*')));
    orig.forEach(function (o, i) {
      var d = dest[i];
      var cs = getComputedStyle(o);
      ESTILOS_SVG.forEach(function (p) {
        var v = cs.getPropertyValue(p);
        if (v && v !== 'normal' && v !== 'auto' && !(p === 'stroke-dasharray' && v === 'none')) d.setAttribute(p, v.replace(/px$/, ''));
      });
      if (o.tagName === 'text' || o.tagName === 'tspan') {
        d.setAttribute('font-family', /Kanit/.test(cs.fontFamily) ? 'Kanit' : /Inter/.test(cs.fontFamily) ? 'Inter' : 'Roboto Mono');
      }
      d.removeAttribute('class'); d.removeAttribute('style'); d.removeAttribute('aria-hidden'); d.removeAttribute('focusable');
    });
    var b = svg.getBoundingClientRect();
    copia.setAttribute('width', r2(b.width)); copia.setAttribute('height', r2(b.height));
    copia.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return copia.outerHTML;
  }

  var ATRIBUTOS = ['data-lab', 'type', 'disabled', 'checked', 'aria-pressed', 'aria-current', 'aria-expanded', 'aria-invalid', 'data-mark', 'href', 'alt', 'role', 'colspan', 'rowspan', 'scope'];

  function capturar(el) {
    var cs = getComputedStyle(el);
    var o = { t: el.tagName.toLowerCase() };
    if (el.getAttribute('class')) o.c = el.getAttribute('class');
    if (el.id) o.id = el.id;
    o.b = caja(el);
    var a = {};
    ATRIBUTOS.forEach(function (n) { if (el.hasAttribute(n)) a[n] = el.getAttribute(n) || true; });
    if (el.tagName === 'INPUT' && (el.type === 'radio' || el.type === 'checkbox')) a.checked = el.checked;
    var control = el.tagName !== 'INPUT' && el.querySelector(':scope > input[type=radio], :scope > input[type=checkbox]');
    if (control) { a.checked = control.checked; if (control.disabled) a.disabled = true; if (control.classList.contains('lab-focus')) a.foco = true; }
    var sw = cs.getPropertyValue('--swatch').trim();
    if (sw) a.swatch = color(getComputedStyle(el).getPropertyValue('--swatch').trim()) || sw;
    if (Object.keys(a).length) o.a = a;
    // Marcador de lista (1., 2.… o •): no está en el DOM
    if (cs.display === 'list-item' && cs.listStyleType !== 'none' && cs.listStylePosition === 'outside') {
      var n = 1, h = el;
      while ((h = h.previousElementSibling)) n++;
      var tipo = cs.listStyleType;
      o.mk = { t: /decimal/.test(tipo) ? (tipo === 'decimal-leading-zero' && n < 10 ? '0' : '') + n + '.' : tipo === 'disc' ? '•' : tipo === 'circle' ? '◦' : '▪', st: letra(getComputedStyle(el, '::marker')) };
    }

    var s = estilosCaja(cs, el);
    s.d = cs.display;
    if (cs.position === 'absolute' || cs.position === 'fixed') s.pos = 'abs';
    if (/flex/.test(cs.display)) {
      s.fd = cs.flexDirection; if (cs.flexWrap !== 'nowrap') s.fw = 1;
      s.jc = cs.justifyContent; s.ai = cs.alignItems;
    }
    if (/grid/.test(cs.display)) { s.jc = cs.justifyContent; s.ai = cs.alignItems; s.ji = cs.justifyItems; s.gtc = cs.gridTemplateColumns; }
    var g = [px(cs.rowGap), px(cs.columnGap)];
    if (g[0] || g[1]) s.g = g;
    var p = [px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)];
    if (p[0] || p[1] || p[2] || p[3]) s.p = p;
    if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') s.ov = 1;
    if (cs.textAlign && cs.textAlign !== 'start' && cs.textAlign !== 'left') s.ta = cs.textAlign;
    if (cs.transform && cs.transform !== 'none') s.tr = cs.transform;
    if (cs.alignSelf && cs.alignSelf !== 'auto') s.as = cs.alignSelf;
    if (el.tagName === 'IMG' || el.tagName === 'VIDEO') s.of = cs.objectFit;
    o.s = s;

    // Elementos atómicos
    if (el.tagName === 'IMG') {
      o.src = (el.currentSrc || el.src || '').replace(location.origin, '');
      return o;
    }
    if (el.tagName === 'svg' || el.tagName === 'SVG') { o.svg = svgEnLinea(el); return o; }
    if (el.classList.contains('bi')) {
      var nombre = Array.prototype.find.call(el.classList, function (c) { return /^bi-/.test(c); });
      o.ico = nombre ? nombre.slice(3) : '';
      o.st = letra(cs);
      return o;
    }
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) {
      var valor = el.tagName === 'SELECT' ? (el.selectedOptions[0] ? el.selectedOptions[0].textContent : '') : el.value;
      if (el.type === 'password' && valor) valor = valor.replace(/./g, '•');
      var ph = !valor && el.placeholder;
      if (el.type === 'radio' || el.type === 'checkbox') return o;
      o.tx = [{ t: (valor || el.placeholder || '').trim(), st: letra(ph ? getComputedStyle(el, '::placeholder') : cs) }];
      if (ph) o.ph = 1;
      return o;
    }

    var pb = pseudo(el, '::before'), pa = pseudo(el, '::after');
    var hijos = hijosVisibles(el);
    var abs = function (p) { return p && (p.pos === 'absolute' || p.pos === 'fixed'); };
    var soloLinea = hijos.length && hijos.every(enLinea) && !(pb && !pb.tx && !abs(pb)) && !(pa && !pa.tx && !abs(pa));
    if (soloLinea) {
      var tr = tramos(hijos, el);
      var esp = function (m) { return m >= 3 ? ' ' : m > 0.5 ? '\u2009' : ''; };
      if (pb && pb.tx && !abs(pb)) tr.unshift({ t: esp(pb.ml) + pb.tx + esp(pb.mr), st: pb.st });
      if (pa && pa.tx && !abs(pa)) tr.push({ t: esp(pa.ml) + pa.tx + esp(pa.mr), st: pa.st });
      if (abs(pb)) o.pb = pb;
      if (abs(pa)) o.pa = pa;
      if (tr.length) {
        o.tx = tr;
        var m = medidaTexto(hijos);
        if (m) { o.tb = m.b; o.ln = m.ln; }
      }
      return o;
    }
    if (pb) o.pb = pb;
    if (pa) o.pa = pa;
    // Contenido mixto o de bloque: grupos de texto anónimo + elementos
    var k = [], grupo = [];
    function cerrar() {
      if (!grupo.length) return;
      var hayTexto = grupo.some(function (n) { return n.nodeType === 1 || n.nodeValue.trim(); });
      if (hayTexto) {
        var tr = tramos(grupo, el);
        var m = medidaTexto(grupo);
        if (tr.length && m) k.push({ x: tr, b: m.b, ln: m.ln });
      }
      grupo = [];
    }
    hijos.forEach(function (h) {
      if (enLinea(h)) grupo.push(h);
      else { cerrar(); k.push(capturar(h)); }
    });
    cerrar();
    if (k.length) o.k = k;
    return o;
  }

  // Si el sistema pide «reducir movimiento» (o menos transparencia, o más contraste), la captura se
  // hace igualmente con la versión normal de la guía: esas reglas @media se apagan mientras se captura.
  function preferenciasNeutras() {
    var cambiadas = [];
    function rec(reglas) {
      Array.prototype.forEach.call(reglas, function (r) {
        if (r.type === 4 && /prefers-reduced-motion:\s*reduce|prefers-reduced-transparency:\s*reduce|prefers-contrast:\s*more|forced-colors:\s*active/.test(r.media.mediaText)) {
          cambiadas.push([r, r.media.mediaText]);
          r.media.mediaText = 'not all';
        }
        if (r.cssRules) rec(r.cssRules);
      });
    }
    Array.prototype.forEach.call(document.styleSheets, function (h) { try { rec(h.cssRules); } catch (e) { /* otro origen */ } });
    return function restaurar() { cambiadas.forEach(function (c) { c[0].media.mediaText = c[1]; }); };
  }
  window.preferenciasNeutrasAURA = preferenciasNeutras;

  function capturarGuia() {
    // Sin barra de desplazamiento: la página se maqueta a 1440 px justos
    var html = document.documentElement;
    var antes = html.style.overflow, antesGutter = html.style.scrollbarGutter;
    html.style.overflow = 'hidden';
    html.style.scrollbarGutter = 'auto';
    window.scrollTo(0, 0);
    var restaurar = preferenciasNeutras();
    try { return capturarPartes(); } finally { html.style.overflow = antes; html.style.scrollbarGutter = antesGutter; restaurar(); }
  }

  function capturarPartes() {
    var partes = [];
    var cab = document.querySelector('.g-header');
    var heroe = document.querySelector('.g-hero');
    var tabs = document.querySelector('.g-tabs');
    partes.push({ id: 'portada', nombre: 'Portada', nodos: [cab, heroe, tabs].filter(Boolean).map(capturar) });
    document.querySelectorAll('section.g-section').forEach(function (s) {
      var idx = s.querySelector('.g-index');
      var tit = s.querySelector('.g-aside__title');
      partes.push({ id: s.id, nombre: (idx ? idx.textContent.trim() + ' · ' : '') + (tit ? tit.textContent.trim() : s.id), nodos: [capturar(s)] });
    });
    var pie = document.querySelector('.g-footer');
    if (pie) partes.push({ id: 'pie', nombre: 'Pie de la guía', nodos: [capturar(pie)] });
    return {
      version: 1,
      fecha: new Date().toISOString(),
      url: location.href,
      ancho: window.innerWidth,
      partes: partes,
    };
  }

  // La web pinta la mono con la del sistema (ui-monospace; Consolas en Windows); Figma usará Roboto Mono, que es más ancha
  // que Consolas: la captura se hace con Roboto Mono para que las medidas sean las que tendrá Figma.
  function prepararFuentes() {
    var listo = Promise.resolve();
    if (!document.getElementById('aura-captura-mono')) {
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600;700&display=swap';
      document.head.appendChild(l);
      listo = new Promise(function (ok) { l.onload = ok; l.onerror = ok; setTimeout(ok, 5000); });
      var st = document.createElement('style');
      st.id = 'aura-captura-mono';
      st.textContent = ':root{--font-mono:"Roboto Mono",ui-monospace,monospace!important}';
      document.head.appendChild(st);
    }
    return listo.then(function () {
      return Promise.all(['400', '500', '600', '700'].map(function (w) { return document.fonts.load(w + ' 12px "Roboto Mono"'); }));
    }).then(function () { return document.fonts.ready; });
  }
  window.prepararCapturaAURA = prepararFuentes;
  window.capturarGuiaAURA = capturarGuia;
  window.capturarElementoAURA = capturar;
  if (!window.__auraCapturaSinDescarga) {
    prepararFuentes().then(function () {
      var datos = capturarGuia();
      var blob = new Blob([JSON.stringify(datos)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'guia-captura.json';
      document.body.appendChild(a); a.click(); a.remove();
      console.log('AURA: captura lista (' + Math.round(blob.size / 1024) + ' KB). Muévela a guia-de-estilo/figma/ y ejecuta node build.mjs.');
    });
  }
})();
