// =============================================================================
// AURA — Construcción del plugin de Figma «AURA — Guía de estilo»
// -----------------------------------------------------------------------------
// Junta en plugin/code.js el código del plugin (plugin/src/plugin.js, escrito a
// mano) y sus datos, que salen de:
//   · aura-tokens.json            → variables, estilos de color, texto, efecto y retícula
//   · capturas/guia-captura.json  → la guía pintada a 1440 px (captura-guia.js)
//   · capturas/componentes-captura.json y capturas/piezas-*.json
//                                 → variantes de los componentes (captura-componentes.js)
//   · iconos.json                 → trazados SVG de Bootstrap Icons (MIT) que usa la web
// La captura (cajas + estilos calculados) se convierte aquí en marcos con auto
// layout, textos con estilos, imágenes, iconos e instancias de componentes.
//
// Uso:  node build.mjs              → escribe plugin/code.js
//       node build.mjs --imagenes   → además, copias JPG/PNG ligeras en img/ (necesita «sharp»)
//       node build.mjs --informe    → resumen de lo generado
// =============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(AQUI, '../..');
const SITIO = 'https://aura-lyart-beta.vercel.app/';
const ARGS = new Set(process.argv.slice(2));

const leerJSON = (f) => JSON.parse(fs.readFileSync(path.join(AQUI, f), 'utf8'));
const r2 = (n) => Math.round(n * 100) / 100;
const r1 = (n) => Math.round(n * 10) / 10;
// Redondea al entero si está a menos de 0,05 (ruido de la densidad 1,25 del navegador)
const ajuste = (n) => (Math.abs(n - Math.round(n)) < 0.06 ? Math.round(n) : r2(n));

// -----------------------------------------------------------------------------
// 1. TOKENS → variables y estilos
// -----------------------------------------------------------------------------
const TOKENS = leerJSON('aura-tokens.json');

/** Recorre los tokens: fn(ruta[], token) */
function recorrerTokens(nodo, fn, ruta = []) {
  for (const k of Object.keys(nodo)) {
    if (k.startsWith('$')) continue;
    const v = nodo[k];
    if (v && typeof v === 'object' && '$value' in v) fn(ruta.concat(k), v);
    else if (v && typeof v === 'object') recorrerTokens(v, fn, ruta.concat(k));
  }
}
const esAlias = (v) => typeof v === 'string' && /^\{[^{}]+\}$/.test(v);
const aliasANombre = (v) => v.slice(1, -1).split('.').join('/');
const extAura = (t) => (t.$extensions && t.$extensions['com.aura']) || {};

const PORNOMBRE = new Map();            // nombre «A/B/C» → token
recorrerTokens(TOKENS, (ruta, t) => PORNOMBRE.set(ruta.join('/'), t));

function resolver(nombre, prof = 0) {
  const t = PORNOMBRE.get(nombre);
  if (!t) throw new Error('Alias sin destino: ' + nombre);
  if (esAlias(t.$value) && prof < 20) return resolver(aliasANombre(t.$value), prof + 1);
  return t;
}
const colorDeToken = (v) => [v.components[0], v.components[1], v.components[2], v.alpha === undefined ? 1 : v.alpha];
const numeroDeToken = (v) => (typeof v === 'number' ? v : v && typeof v.value === 'number' ? v.value : NaN);

// Ámbitos de las variables (dónde las ofrece Figma)
function ambitos(nombre, tipo) {
  if (tipo === 'COLOR') return nombre.startsWith('Color/Texto/') ? ['ALL_FILLS', 'STROKE_COLOR', 'EFFECT_COLOR'] : ['ALL_FILLS', 'STROKE_COLOR', 'EFFECT_COLOR'];
  if (tipo === 'STRING') return nombre.startsWith('Tipografía/Familia/') ? ['FONT_FAMILY'] : ['ALL_SCOPES'];
  if (nombre.startsWith('Radio/')) return ['CORNER_RADIUS'];
  if (nombre.startsWith('Espaciado/')) return ['GAP'];
  if (nombre.startsWith('Tamaño/')) return ['WIDTH_HEIGHT'];
  if (nombre.startsWith('Borde/')) return ['STROKE_FLOAT'];
  if (nombre.startsWith('Tipografía/Tamaño/')) return ['FONT_SIZE'];
  if (nombre.startsWith('Tipografía/Peso/')) return ['FONT_WEIGHT'];
  if (/^Material\/[^/]+\/Desenfoque Figma$/.test(nombre)) return ['EFFECT_FLOAT'];
  return [];                            // opacidades 0–1, capas, movimiento: solo en la tabla de variables
}

const VARIABLES = [];
recorrerTokens(TOKENS, (ruta, t) => {
  const tipoDTCG = t.$type;
  const nombre = ruta.join('/');
  let tipo;
  if (tipoDTCG === 'color') tipo = 'COLOR';
  else if (tipoDTCG === 'fontFamily') tipo = 'STRING';
  else if (['dimension', 'number', 'duration', 'fontWeight'].includes(tipoDTCG)) tipo = 'FLOAT';
  else return;
  let valor;
  if (esAlias(t.$value)) valor = { a: aliasANombre(t.$value) };
  else if (tipo === 'COLOR') valor = colorDeToken(t.$value).map((n) => Math.round(n * 1e6) / 1e6);
  else if (tipo === 'STRING') valor = Array.isArray(t.$value) ? t.$value[0] : String(t.$value);
  else valor = numeroDeToken(t.$value);
  if (tipo === 'FLOAT' && !(typeof valor === 'number' || valor.a)) throw new Error('Número no válido en ' + nombre);
  const css = extAura(t).css;
  let desc = t.$description || '';
  if (tipoDTCG === 'duration') desc = (desc ? desc + ' ' : '') + '(en segundos)';
  // Sintaxis web: var(--token) o la expresión tal cual (calc(…)) cuando no es una propiedad suelta
  const sintaxis = css && /^--[\w-]+$/.test(css) ? 'var(' + css + ')' : css && /^(calc|min|max|clamp|var)\(/.test(css) ? css : undefined;
  VARIABLES.push({ n: nombre, t: tipo, v: valor, d: desc, sc: ambitos(nombre, tipo), css: sintaxis });
});

// Índice de colores (resueltos) para enlazar los colores calculados de la web con sus variables
const COLORES = [];
for (const v of VARIABLES) {
  if (v.t !== 'COLOR') continue;
  const res = v.v.a ? colorDeToken(resolver(v.v.a).$value) : v.v;
  COLORES.push({ n: v.n, c: [Math.round(res[0] * 255), Math.round(res[1] * 255), Math.round(res[2] * 255), res[3]] });
}

// Estilos de texto: los de «Texto/…» de los tokens
const PESO_CSS = {};
const ESTILOS_TEXTO = [];
recorrerTokens(TOKENS.Texto, (ruta, t) => {
  const e = extAura(t);
  const tamNombre = aliasANombre(t.$value.fontSize);
  const tam = numeroDeToken(resolver(tamNombre).$value);
  const lhPx = e.lineHeightPx !== undefined ? e.lineHeightPx : (e.lineHeightPercent * tam) / 100;
  const ls = t.$value.letterSpacing ? numeroDeToken(t.$value.letterSpacing) : 0;
  ESTILOS_TEXTO.push({
    n: e.figmaStyle || 'Texto/' + ruta.join('/'),
    f: [e.fontFamily, e.fontStyle],
    s: tam,
    lh: e.lineHeightPx !== undefined ? { u: 'PIXELS', v: e.lineHeightPx } : { u: 'PERCENT', v: e.lineHeightPercent },
    ls: { u: 'PERCENT', v: e.letterSpacingPercent || 0 },
    tc: e.textCase || 'ORIGINAL',
    d: (t.$description || '') + (e.css ? '\nCSS: ' + e.css : '') + (e.tabularNums ? '\nCifras tabulares (tnum) en la web.' : ''),
    vs: tamNombre,
    // Para reconocerlo en la captura
    _fam: e.fontFamily === 'Roboto Mono' ? 'mono' : e.fontFamily,
    _peso: e.fontWeightCSS,
    _lh: lhPx,
    _ls: ls,
    _tt: e.textCase === 'UPPER',
    _css: (e.css || '').split('·').map((s) => s.trim()).filter(Boolean),
    _movil: ruta[0] === 'Móvil',
    _nucleo: !!e.nucleo,                // estilo general (Display, H1…, Body, Caption…): vale por medidas
  });
});

// Estilos de color: todos los colores salvo los acabados (esos quedan como variables)
const ESTILOS_COLOR = VARIABLES.filter((v) => v.t === 'COLOR' && !v.n.startsWith('Color/Acabado/') && !v.n.startsWith('Material/'))
  .map((v) => ({ n: v.n, v: v.n, d: v.d }));
recorrerTokens(TOKENS.Degradado, (ruta, t) => {
  const ang = parseFloat(extAura(t).anguloCSS || '180');
  ESTILOS_COLOR.push({ n: 'Degradado/' + ruta.join('/'), d: t.$description || '', g: degradadoLineal(ang, t.$value.map((p) => [p.position].concat(colorDeToken(p.color).map((x, i) => (i < 3 ? Math.round(x * 255) : x)))), 1, 1) });
});

// Estilos de efecto: sombras y materiales (desenfoque de fondo)
const ESTILOS_EFECTO = [];
recorrerTokens(TOKENS.Sombra, (ruta, t) => {
  const capas = t.$value.map((c) => ({
    t: c.inset ? 'I' : 'D',
    x: numeroDeToken(c.offsetX), y: numeroDeToken(c.offsetY), b: numeroDeToken(c.blur), s: numeroDeToken(c.spread),
    c: esAlias(c.color) ? { v: aliasANombre(c.color) } : { c: colorDeToken(c.color).map((x, i) => (i < 3 ? Math.round(x * 255) : x)) },
  }));
  ESTILOS_EFECTO.push({ n: 'Sombra/' + ruta.join('/'), d: (t.$description || '') + (extAura(t).css ? '\nCSS: ' + extAura(t).css : ''), fx: capas });
});
for (const g of ['Fino', 'Regular', 'Grueso']) {
  const v = 'Material/' + g + '/Desenfoque Figma';
  ESTILOS_EFECTO.push({
    n: 'Material/' + g,
    d: 'Desenfoque de fondo del material ' + g.toLowerCase() + ' (CSS ' + numeroDeToken(PORNOMBRE.get('Material/' + g + '/Desenfoque').$value) + ' px, saturación 180 % que Figma no tiene). Úsalo con el relleno Color/Cristal/' + g + '.',
    fx: [{ t: 'B', r: numeroDeToken(PORNOMBRE.get(v).$value), v }],
  });
}

// Retículas
const ESTILOS_RETICULA = [
  { n: 'Retícula/Escritorio · 12 columnas', d: 'Contenedor de 1180 px centrado (--container) en 12 columnas de 80 px con huecos de 20 px (--gap): las rejillas de 2, 3 y 4 columnas de la web caen sobre ellas.', g: [{ p: 'COLUMNS', al: 'CENTER', n: 12, gut: 20, sec: 80, vg: 'Espaciado/Hueco' }] },
  { n: 'Retícula/Teléfono · 4 columnas', d: 'Teléfono (390 px): márgenes laterales de 20 px (--gutter) y 4 columnas con huecos de 20 px.', g: [{ p: 'COLUMNS', al: 'STRETCH', n: 4, gut: 20, off: 20, vg: 'Espaciado/Hueco', vo: 'Espaciado/Móvil/Margen lateral' }] },
  { n: 'Retícula/Base de 4 px', d: 'Todas las medidas de AURA son múltiplos de 2 y casi siempre de 4.', g: [{ p: 'GRID', sec: 4 }] },
];

// -----------------------------------------------------------------------------
// 2. Utilidades de color, degradados y sombras de la captura
// -----------------------------------------------------------------------------
function leerColorCSS(s) {
  if (Array.isArray(s)) return s;
  if (!s || s === 'transparent' || s === 'none') return null;
  s = String(s).trim();
  let m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(s);
  if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : +m[4]];
  m = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/.exec(s);
  if (m) return [Math.round(m[1] * 255), Math.round(m[2] * 255), Math.round(m[3] * 255), m[4] === undefined ? 1 : +m[4]];
  m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(s);
  if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16), m[2] ? parseInt(m[2], 16) / 255 : 1];
  if (s === 'white') return [255, 255, 255, 1];
  if (s === 'black') return [0, 0, 0, 1];
  return null;
}

// Preferencias por papel cuando varios tokens comparten color
const PREF = {
  texto: ['Color/Texto/', 'Color/Acento/Texto', 'Color/Dorado/', 'Color/Estado/', 'Color/Vibrancia/', 'Color/Acento/', 'Color/Campo/'],
  fondo: ['Color/Fondo/', 'Color/Relleno/', 'Color/Campo/Fondo', 'Color/Cristal/', 'Color/Acento/', 'Color/Dorado/', 'Color/Estado/', 'Color/Luz/', 'Color/Texto/', 'Color/Línea/'],
  borde: ['Color/Línea/', 'Color/Campo/Borde', 'Color/Acento/', 'Color/Estado/', 'Color/Dorado/', 'Color/Texto/', 'Color/Fondo/'],
  efecto: ['Color/Acento/', 'Color/Estado/', 'Color/Dorado/', 'Color/Línea/', 'Color/Relleno/'],
  muestra: ['Color/Acabado/'],
};
const cacheColor = new Map();
let coloresEnlazados = 0, coloresSueltos = 0;
/**
 * Color capturado [r,g,b,a] → pintura: { v: variable } o { c: [r,g,b,a] }
 * roles: { fondo|borde|texto: [variables exactas, por orden] } de la capa (ver rolesDe): si una de
 * ellas tiene ese color, gana a cualquier otra variable del mismo valor.
 */
function pintura(c, papel, prefs, roles) {
  c = leerColorCSS(c);
  if (!c) return null;
  const exactos = (roles && roles[papel]) || [];
  const clave = c.join(',') + '|' + papel + '|' + (prefs || []).join(',') + '|' + exactos.join(',');
  if (cacheColor.has(clave)) return cacheColor.get(clave);
  const iguales = COLORES.filter((t) => Math.abs(t.c[0] - c[0]) <= 1 && Math.abs(t.c[1] - c[1]) <= 1 && Math.abs(t.c[2] - c[2]) <= 1 && Math.abs(t.c[3] - c[3]) <= 0.006);
  let res;
  const exacto = exactos.find((n) => iguales.some((t) => t.n === n));
  if (exacto) {
    res = { v: exacto };
    coloresEnlazados++;
  } else if (iguales.length) {
    const orden = (prefs || []).concat(PREF[papel] || [], ['Color/']);
    const rango = (n) => { const i = orden.findIndex((p) => n.startsWith(p)); return i < 0 ? 99 : i; };
    const conAcabado = papel === 'muestra';
    const cand = iguales.filter((t) => conAcabado || !t.n.startsWith('Color/Acabado/'));
    if (cand.length) {
      cand.sort((a, b) => rango(a.n) - rango(b.n) || a.n.localeCompare(b.n));
      res = { v: cand[0].n };
      coloresEnlazados++;
    }
  }
  if (!res) { res = { c: [c[0], c[1], c[2], r2(c[3] * 1000) / 1000] }; coloresSueltos++; }
  cacheColor.set(clave, res);
  return res;
}

// Variable que corresponde a cada capa de los componentes según su papel (relleno, borde, texto),
// para que el enlace sea el que toca y no el primero que tenga el mismo valor
const GRUPO_BOTON = { Primario: 'Primario', Secundario: 'Secundario', Inverso: 'Inverso', Terciario: 'Fantasma', Destructivo: 'Destructivo' };
function rolesDe(ctx, cs) {
  const v = ctx.v || {};
  if (ctx.comp === 'Botón' && v.Tipo) {
    if (v.Tipo === 'Enlace') return { texto: v.Estado === 'Hover' ? ['Color/Acento/Texto hover', 'Color/Acento/Texto'] : ['Color/Acento/Texto'] };
    if (v.Estado === 'Desactivado') return { fondo: ['Color/Botón/Desactivado/Fondo'], borde: ['Color/Botón/Desactivado/Borde destructivo'], texto: ['Color/Botón/Desactivado/Texto'] };
    const g = 'Color/Botón/' + GRUPO_BOTON[v.Tipo] + '/';
    const activo = v.Estado === 'Hover' || v.Estado === 'Foco';
    return {
      fondo: (activo ? [g + 'Fondo hover'] : []).concat([g + 'Fondo']),
      borde: (activo ? [g + 'Borde hover'] : []).concat([g + 'Borde', g + 'Fondo']),
      texto: (activo ? [g + 'Texto hover'] : []).concat([g + 'Texto']),
    };
  }
  if (ctx.comp === 'Campo de texto' && v.Estado) {
    const e = v.Estado;
    if (cs.includes('aura-field__hint')) return { texto: ['Color/Texto/Terciario'] };
    if (cs.includes('aura-field__label')) return { texto: [e === 'Foco' ? 'Color/Campo/Etiqueta foco' : e === 'Error' ? 'Color/Campo/Etiqueta error' : 'Color/Campo/Etiqueta'] };
    if (cs.includes('aura-field__icon')) return { texto: [e === 'Foco' ? 'Color/Campo/Icono foco' : e === 'Error' ? 'Color/Campo/Icono error' : 'Color/Campo/Icono'] };
    if (cs.includes('aura-field__toggle')) return { texto: ['Color/Texto/Secundario'] };
    if (cs.includes('aura-field__help')) return { texto: ['Color/Campo/Ayuda'] };
    if (cs.includes('aura-field__error')) return { texto: ['Color/Estado/Error'] };
  }
  return null;
}

// Nombres de otra marca que la web hereda en algunos textos: no pasan a Figma
const SIN_MARCAS = [
  [/Liquid Retina XDR/g, 'AURA XDR'],
  [/Ultra Retina XDR/g, 'AURA XDR Ultra'],
  [/Cupertino \/ 37,3349°(\s)N/g, 'Madrid / 40,4168°$1N'],
  [/Skill apple-design/g, 'Skill de diseño de interfaces'],
  [/apple-touch-icon\.png/g, 'icono de acceso directo (180 px)'],
  [/apple-touch-icon/g, '…-touch-icon'],
  [/ · SF Mono/g, ''],
  [/SF Mono, /g, ''],
  [/ en retina\b/g, ' en pantallas de alta densidad'],
];
const sinMarcas = (t) => SIN_MARCAS.reduce((s, [re, por]) => s.replace(re, por), t);

// Separa por comas de primer nivel (no dentro de paréntesis)
function partirComas(s) {
  const res = [];
  let prof = 0, ini = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') prof++;
    else if (s[i] === ')') prof--;
    else if (s[i] === ',' && prof === 0) { res.push(s.slice(ini, i).trim()); ini = i + 1; }
  }
  res.push(s.slice(ini).trim());
  return res.filter(Boolean);
}
const RE_COLOR = /(rgba?\([^)]*\)|color\(srgb[^)]*\)|#[0-9a-f]{3,8}\b|transparent)/i;

/** Paradas «color [pos]» → [[pos 0-1, r,g,b,a]] (longitud de referencia en px para las paradas en px) */
function paradas(partes, largo) {
  const ps = [];
  for (const p of partes) {
    const m = RE_COLOR.exec(p);
    if (!m) continue;
    const col = m[1].toLowerCase() === 'transparent' ? null : leerColorCSS(m[1]);
    const resto = p.replace(m[1], '').trim();
    const posiciones = resto.split(/\s+/).filter(Boolean).map((x) => (x.endsWith('%') ? parseFloat(x) / 100 : x.endsWith('px') ? parseFloat(x) / (largo || 1) : NaN));
    if (!posiciones.length) ps.push({ col, pos: null });
    else posiciones.forEach((pos) => ps.push({ col, pos }));
  }
  if (!ps.length) return null;
  if (ps[0].pos === null) ps[0].pos = 0;
  if (ps[ps.length - 1].pos === null) ps[ps.length - 1].pos = 1;
  for (let i = 1; i < ps.length - 1; i++) {
    if (ps[i].pos === null) {
      let j = i; while (ps[j].pos === null) j++;
      const a = ps[i - 1].pos, b = ps[j].pos;
      for (let k = i; k < j; k++) ps[k].pos = a + ((b - a) * (k - i + 1)) / (j - i + 1);
    }
  }
  // «transparent» toma el color de la parada vecina con alfa 0 (Figma no premultiplica)
  ps.forEach((p, i) => {
    if (!p.col) {
      const v = ps[i - 1] && ps[i - 1].col ? ps[i - 1].col : ps[i + 1] && ps[i + 1].col ? ps[i + 1].col : [0, 0, 0, 1];
      p.col = [v[0], v[1], v[2], 0];
    } else if (p.col[3] === 0) {
      const v = (ps[i - 1] && ps[i - 1].col && ps[i - 1].col[3] > 0 && ps[i - 1].col) || (ps[i + 1] && ps[i + 1].col && ps[i + 1].col[3] > 0 && ps[i + 1].col);
      if (v) p.col = [v[0], v[1], v[2], 0];
    }
  });
  return ps.map((p) => [r2(Math.max(0, Math.min(1, p.pos))), p.col[0], p.col[1], p.col[2], r2(p.col[3] * 1000) / 1000]);
}

/** Matriz de un degradado lineal CSS (ángulo en grados) en una caja w × h */
function degradadoLineal(ang, stops, w, h) {
  const rad = (ang * Math.PI) / 180;
  const dx = Math.sin(rad), dy = -Math.cos(rad);
  const L = Math.abs(w * dx) + Math.abs(h * dy) || 1;
  const a = (w * dx) / L, b = (h * dy) / L;
  return { g: 'L', m: [[r2(a * 1000) / 1000, r2(b * 1000) / 1000, r2((0.5 - 0.5 * a - 0.5 * b) * 1000) / 1000], [r2(-b * 1000) / 1000, r2(a * 1000) / 1000, r2((0.5 + 0.5 * b - 0.5 * a) * 1000) / 1000]], s: stops };
}

function degradadoCSS(texto, w, h) {
  const m = /^(repeating-)?(linear|radial)-gradient\((.*)\)$/s.exec(texto.trim());
  if (!m || m[1]) return null;
  const partes = partirComas(m[3]);
  if (m[2] === 'linear') {
    let ang = 180;
    if (!RE_COLOR.test(partes[0])) {
      const p = partes.shift();
      const g = /(-?[\d.]+)deg/.exec(p);
      if (g) ang = +g[1];
      else if (/to\s/.test(p)) {
        const dirs = { 'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270, 'to top right': 45, 'to right top': 45, 'to bottom right': 135, 'to right bottom': 135, 'to bottom left': 225, 'to left bottom': 225, 'to top left': 315, 'to left top': 315 };
        ang = dirs[p.trim()] !== undefined ? dirs[p.trim()] : 180;
      }
    }
    const rad = (ang * Math.PI) / 180;
    const largo = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad));
    const st = paradas(partes, largo);
    return st ? degradadoLineal(ang, st, w, h) : null;
  }
  // radial: [forma tamaño] [at x y], paradas
  let cx = 0.5, cy = 0.5, rx = null, ry = null, forma = 'ellipse', tam = 'farthest-corner';
  if (!RE_COLOR.test(partes[0]) || /\bat\b/.test(partes[0])) {
    const p = partes.shift();
    const [antes, despues] = p.split(/\bat\b/).map((x) => (x || '').trim());
    if (despues) {
      const xy = despues.split(/\s+/);
      const pos = (v, total) => (v === 'center' ? 0.5 : v === 'left' || v === 'top' ? 0 : v === 'right' || v === 'bottom' ? 1 : v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v) / total);
      cx = pos(xy[0] || 'center', w); cy = pos(xy[1] || 'center', h);
    }
    const tok = antes.split(/\s+/).filter(Boolean);
    const dims = tok.filter((t) => /[\d.]+(%|px)/.test(t));
    if (tok.includes('circle')) forma = 'circle';
    const kw = tok.find((t) => /closest|farthest/.test(t));
    if (kw) tam = kw;
    if (dims.length) {
      rx = dims[0].endsWith('%') ? parseFloat(dims[0]) / 100 * w : parseFloat(dims[0]);
      ry = dims[1] ? (dims[1].endsWith('%') ? parseFloat(dims[1]) / 100 * h : parseFloat(dims[1])) : rx;
    }
  }
  const px = cx * w, py = cy * h;
  if (rx === null) {
    const dl = [px, w - px], dv = [py, h - py];
    if (tam === 'closest-side') { rx = Math.min(...dl); ry = Math.min(...dv); }
    else if (tam === 'farthest-side') { rx = Math.max(...dl); ry = Math.max(...dv); }
    else {
      const ex = tam.startsWith('closest') ? Math.min(...dl) : Math.max(...dl);
      const ey = tam.startsWith('closest') ? Math.min(...dv) : Math.max(...dv);
      rx = ex * Math.SQRT2; ry = ey * Math.SQRT2;
    }
    if (forma === 'circle') { const r = tam.endsWith('side') ? Math.min(rx, ry) : Math.hypot(rx / Math.SQRT2, ry / Math.SQRT2); rx = ry = r; }
  }
  const st = paradas(partes, Math.max(rx, ry));
  if (!st) return null;
  const nx = rx / w, ny = ry / h;
  return { g: 'R', m: [[r2(1000 / (2 * nx)) / 1000, 0, r2((0.5 - cx / (2 * nx)) * 1000) / 1000], [0, r2(1000 / (2 * ny)) / 1000, r2((0.5 - cy / (2 * ny)) * 1000) / 1000]], s: st };
}

/** background-image → pinturas (de abajo arriba, como Figma) */
function fondosImagen(bi, w, h) {
  if (!bi || bi === 'none') return [];
  const capas = partirComas(bi).map((c) => (/gradient\(/.test(c) ? degradadoCSS(c, w, h) : null)).filter(Boolean);
  return capas.reverse();
}

function sombras(s, papel, prefs, opacidad = 1) {
  if (!s || s === 'none') return [];
  return partirComas(s).map((capa) => {
    const m = RE_COLOR.exec(capa);
    const col = m ? leerColorCSS(m[1]) : [0, 0, 0, 1];
    const resto = (m ? capa.replace(m[1], '') : capa).trim();
    const inset = /\binset\b/.test(resto);
    const nums = resto.replace('inset', '').trim().split(/\s+/).filter(Boolean).map(parseFloat);
    if (!col || col[3] * opacidad <= 0.001) return null;
    const c = [col[0], col[1], col[2], r2(col[3] * opacidad * 1000) / 1000];
    return { t: inset ? 'I' : 'D', x: nums[0] || 0, y: nums[1] || 0, b: nums[2] || 0, s: nums[3] || 0, c: pintura(c, 'efecto', prefs) };
  }).filter(Boolean);
}

// ¿Las capas coinciden con un estilo de sombra de los tokens?
function estiloSombra(capas) {
  for (const e of ESTILOS_EFECTO) {
    if (e.fx.length !== capas.length || e.fx[0].t === 'B') continue;
    const igual = e.fx.every((f, i) => {
      const c = capas[i];
      if (f.t !== c.t || Math.abs(f.x - c.x) > 0.3 || Math.abs(f.y - c.y) > 0.3 || Math.abs(f.b - c.b) > 0.3 || Math.abs(f.s - c.s) > 0.3) return false;
      const ca = f.c.v ? COLORES.find((t) => t.n === f.c.v).c : f.c.c;
      const cb = c.c.v ? COLORES.find((t) => t.n === c.c.v).c : c.c.c;
      return Math.abs(ca[0] - cb[0]) <= 1 && Math.abs(ca[1] - cb[1]) <= 1 && Math.abs(ca[2] - cb[2]) <= 1 && Math.abs(ca[3] - cb[3]) <= 0.01;
    });
    if (igual) return e.n;
  }
  return null;
}

function desenfoque(bf) {
  const m = /blur\(([\d.]+)px\)/.exec(bf || '');
  if (!m) return null;
  const css = +m[1];
  const mat = { 16: 'Fino', 24: 'Regular', 40: 'Grueso' }[css];
  return mat ? { t: 'B', r: css * 2, v: 'Material/' + mat + '/Desenfoque Figma' } : { t: 'B', r: css * 2 };
}

// -----------------------------------------------------------------------------
// 3. Letra: familias, pesos y estilos de texto
// -----------------------------------------------------------------------------
const FUENTES = new Set();
function fuente(ff, fw) {
  let fam, est;
  if (ff === 'mono') { fam = 'Roboto Mono'; est = fw >= 700 ? 'Bold' : fw >= 600 ? 'SemiBold' : fw >= 500 ? 'Medium' : 'Regular'; }
  else if (/Kanit/i.test(ff)) { fam = 'Kanit'; est = fw >= 700 ? 'Bold' : fw >= 600 ? 'SemiBold' : fw >= 500 ? 'Medium' : 'Regular'; }
  else { fam = 'Inter'; est = fw >= 700 ? 'Bold' : fw >= 600 ? 'Semi Bold' : fw >= 500 ? 'Medium' : 'Regular'; }
  const k = fam + '|' + est;
  FUENTES.add(k);
  return k;
}
ESTILOS_TEXTO.forEach((e) => FUENTES.add(e.f.join('|')));

const famDe = (ff) => (ff === 'mono' ? 'mono' : /Kanit/i.test(ff) ? 'Kanit' : 'Inter');
const pesoFigma = (fam, fw) => (fam === 'Inter' ? (fw >= 700 ? 700 : fw >= 600 ? 600 : fw >= 500 ? 500 : 400) : fw);

/** Estilo de texto de los tokens que coincide con un tramo (o null) */
function estiloDeTokens(st, clases) {
  const fam = famDe(st.ff);
  const cand = ESTILOS_TEXTO.filter((e) => e._fam === fam && Math.abs(e.s - st.fs) < 0.3
    && pesoFigma(fam, e._peso) === pesoFigma(fam, st.fw)
    && (!st.lh || Math.abs(e._lh - st.lh) < 0.6)
    && Math.abs(e._ls - (st.ls || 0)) < 0.06
    && e._tt === (st.tt === 'uppercase'));
  if (!cand.length) return null;
  const porClase = cand.find((e) => e._css.some((sel) => clases.some((c) => sel.split(/\s+/).pop().replace(/^\./, '').split(/[:.]/)[0] === c)));
  if (porClase) return porClase.n;
  // Sin la clase de la web, solo un estilo general: los de un papel concreto (Formulario/…, Contenido/…,
  // Pie/…) no se ponen a un texto ajeno solo porque coincidan las medidas
  const generales = cand.filter((e) => e._nucleo && !e._movil);
  return generales.length ? generales[0].n : null;
}

// Estilos propios de la maquetación de la guía («Guía/…»), por clase g-
const NOMBRES_GUIA = {
  'g-title': 'Portada · título', 'g-lead': 'Portada · entradilla', 'g-signal': 'Portada · señal', 'g-logo': 'Logotipo',
  'g-kicker': 'Cabecera · etiqueta', 'g-pill': 'Cabecera · versión', 'g-tab': 'Pestaña', 'g-tab__top': 'Pestaña · número',
  'g-tab__state': 'Pestaña · estado', 'g-orb__label': 'Mono pequeño', 'g-hero__meta': 'Portada · datos', 'g-index': 'Capítulo · número',
  'g-aside__title': 'Capítulo · título', 'g-aside__desc': 'Capítulo · descripción', 'g-aside__state': 'Capítulo · estado',
  'g-eyebrow': 'Antetítulo', 'g-statement': 'Frase', 'g-tag': 'Etiqueta', 'g-intro': 'Introducción', 'g-sub__title': 'Bloque · título',
  'g-sub__meta': 'Bloque · meta', 'g-text': 'Texto', 'g-card__label': 'Tarjeta · etiqueta', 'g-card__title': 'Tarjeta · título',
  'g-card__text': 'Tarjeta · texto', 'g-note__title': 'Nota · título', 'g-note__text': 'Nota · texto', 'g-swatch__name': 'Muestra · nombre',
  'g-swatch__hex': 'Muestra · valor', 'g-swatch__use': 'Muestra · uso', 'g-swatch__var': 'Muestra · variable', 'g-spec__name': 'Escala · nombre',
  'g-spec__meta': 'Escala · medidas', 'g-spec__class': 'Escala · clase', 'g-demo__caption': 'Pie de muestra', 'g-code': 'Código',
  'g-mono': 'Mono', 'g-quote': 'Cita', 'g-do__mark': 'Sí o no', 'g-matrix__name': 'Matriz · nombre', 'g-matrix__meta': 'Matriz · medidas',
  'g-matrix__head': 'Matriz · cabecera', 'g-state__label': 'Estado', 'g-linkrow__label': 'Enlace · etiqueta', 'g-linkrow__text': 'Enlace · texto',
  'g-family__glyph': 'Familia · muestra', 'g-family__top': 'Familia · cabecera', 'g-family__use': 'Familia · uso', 'g-surface__title': 'Superficie · título',
  'g-surface__text': 'Superficie · texto', 'g-fieldcard__head': 'Campo · cabecera', 'g-flag': 'Bandera', 'g-icon': 'Icono · nombre', 'g-kv': 'Clave y valor',
  'g-strip': 'Fotograma · pie', 'g-timeline__seg': 'Línea de tiempo', 'g-timeline__ticks': 'Línea de tiempo · marcas', 'g-stage__meta': 'Escenario · meta',
  'g-footer__brand': 'Pie · marca', 'g-footer__tagline': 'Pie · lema', 'g-footer__sections': 'Pie · capítulos', 'g-footer__right': 'Pie · datos',
  'g-wire': 'Esquema', 'g-steps-list': 'Pasos', 'g-photo': 'Foto · pie', 'g-navspec__title': 'Navegación · título', 'g-navspec__local': 'Navegación · local',
  'g-navspec__global': 'Navegación · global', 'g-view': 'Vista',
};
const ESTILOS_GUIA = new Map();          // nombre → definición
const firmaGuia = new Map();            // nombre → firma
function estiloGuia(st, clasesCtx, tag) {
  let base = null;
  for (const c of clasesCtx) if (NOMBRES_GUIA[c]) { base = NOMBRES_GUIA[c]; break; }
  if (!base && tag) base = { caption: 'Tabla · título', th: 'Tabla · cabecera', td: 'Tabla · celda', thb: 'Tabla · fila', num: 'Tabla · cifra' }[tag] || null;
  if (!base) return null;
  const fam = famDe(st.ff);
  const firma = [fam, st.fs, pesoFigma(fam, st.fw), st.lh, st.ls || 0, st.tt || ''].join('|');
  let nombre = 'Guía/' + base;
  for (let i = 2; firmaGuia.has(nombre) && firmaGuia.get(nombre) !== firma; i++) nombre = 'Guía/' + base + ' ' + i;
  if (!firmaGuia.has(nombre)) {
    firmaGuia.set(nombre, firma);
    ESTILOS_GUIA.set(nombre, {
      n: nombre, f: fuente(st.ff, st.fw).split('|'), s: st.fs,
      lh: st.lh ? { u: 'PIXELS', v: st.lh } : { u: 'AUTO' }, ls: { u: 'PIXELS', v: st.ls || 0 },
      tc: st.tt === 'uppercase' ? 'UPPER' : 'ORIGINAL', d: 'Maquetación de la guía (no forma parte del sistema).',
    });
  }
  return nombre;
}

// -----------------------------------------------------------------------------
// 4. Imágenes e iconos
// -----------------------------------------------------------------------------
const IMAGENES = {};                    // clave → { url1, url2, w, h }
function claveImagen(src) {
  const ruta = src.replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '').split('?')[0];
  let clave = ruta.replace(/^img\//, '').replace(/^(400|800)\//, '').replace(/\.(webp|png|jpe?g)$/i, '');
  const png = /\.png$/i.test(ruta);
  if (!IMAGENES[clave]) {
    IMAGENES[clave] = {
      url1: SITIO + 'guia-de-estilo/figma/img/' + clave + (png ? '.png' : '.jpg'),
      url2: SITIO + (png ? ruta : ruta.replace(/^img\/(?!400\/|800\/|seq\/|og\/)/, 'img/800/')),
      orig: ruta,
    };
  }
  return clave;
}
const ICONOS = leerJSON('iconos.json');
const ICONOS_USADOS = new Set(['plus', 'arrow-up-right', 'chevron-right', 'chevron-down']);
function icono(nombre) {
  if (!ICONOS[nombre]) { console.warn('  · icono sin trazado: ' + nombre); return null; }
  ICONOS_USADOS.add(nombre);
  return nombre;
}

// SVG de una máscara «url("data:image/svg+xml,…")» pintado con un color
function svgDeMascara(msk, color) {
  const m = /url\("?data:image\/svg\+xml(?:;charset=utf-8)?,(.*?)"?\)$/s.exec(msk || '');
  if (!m) return null;
  let svg = decodeURIComponent(m[1].replace(/\\"/g, '"'));
  const hex = '#' + color.slice(0, 3).map((n) => n.toString(16).padStart(2, '0')).join('');
  svg = svg.replace(/(fill|stroke)=(['"])(#000|#000000|black|currentColor)\2/gi, '$1=$2' + hex + '$2');
  if (!/fill=/.test(svg.replace(/<svg[^>]*>/, ''))) svg = svg.replace(/<path /g, '<path fill="' + hex + '" ');
  return svg;
}

// -----------------------------------------------------------------------------
// 5. De la captura a nodos de Figma (LIR)
// -----------------------------------------------------------------------------
// Nodos: F (marco), T (texto), I (instancia), IMG, ICO (icono), SVG, E (elipse/arco)
const clases = (o) => (o && o.c ? o.c.split(/\s+/).filter(Boolean) : []);
const tiene = (o, c) => clases(o).includes(c);
const caja = (o) => ({ x: o.b[0], y: o.b[1], w: o.b[2], h: o.b[3] });

function nombreCapa(o) {
  const cs = clases(o);
  const c = cs.find((x) => /^(aura|g)-/.test(x) && !/^(aura|g)-(static|white|gold|blue|muted|num)$/.test(x)) || cs.find((x) => !/^(bi|m[tbsexy]?-\d|p[tbsexy]?-\d|d-|gap-|align-|justify-|lab-|is-)/.test(x));
  if (!c) return o.t;
  return c.replace(/^aura-/, '').replace(/^g-/, 'guía · ').replace(/__/g, ' · ').replace(/--/g, ' · ').replace(/-/g, ' ');
}

// Variantes que existen (para sustituir por instancias solo cuando la combinación existe)
const VARIANTES_EXISTENTES = new Set();
const claveVariante = (comp, v) => comp + '|' + (v ? Object.keys(v).sort().map((k) => k + '=' + v[k]).join(',') : '');

/** Contexto de compilación */
function ctxHijo(ctx, o) {
  const cs = clases(o);
  return Object.assign({}, ctx, { clases: cs.concat(ctx.clases || []), tag: o.t, prof: (ctx.prof || 0) + 1, raiz: false, roles: rolesDe(ctx, cs) || ctx.roles });
}

// ---- Texto ----
function convertirTramos(tramos, ctx, base) {
  const res = [];
  for (const tr of tramos) {
    if (!tr.t) continue;
    const st = tr.st;
    const run = { t: sinMarcas(tr.t), f: fuente(st.ff, st.fw), s: r2(st.fs), lh: st.lh ? r2(st.lh) : 0, ls: r2(st.ls || 0) };
    const p = pintura(st.co || [245, 245, 247, 1], 'texto', ctx.prefs, ctx.roles);
    if (p) run.co = p;
    if (st.tt === 'uppercase') run.tt = 'UPPER';
    else if (st.tt === 'lowercase') run.tt = 'LOWER';
    else if (st.tt === 'capitalize') run.tt = 'TITLE';
    if (st.td) run.td = st.td === 'S' ? 'STRIKETHROUGH' : 'UNDERLINE';
    run._st = st;
    res.push(run);
  }
  return res;
}

/** Nodo de texto a partir de tramos. medida: caja del texto; contenedor: caja del elemento */
function nodoTexto(tramos, ctx, opts) {
  const runs = convertirTramos(tramos, ctx);
  if (!runs.length) return null;
  // Estilo del nodo: el del tramo más largo
  const dom = runs.slice().sort((a, b) => b.t.length - a.t.length)[0];
  const tagCtx = opts.tagTabla || null;
  const ts = estiloDeTokens(dom._st, ctx.clases || []) || estiloGuia(dom._st, ctx.clases || [], tagCtx);
  runs.forEach((r) => { delete r._st; });
  const t = { k: 'T', runs };
  if (ts) t.ts = ts;
  if (opts.nombre) t.n = opts.nombre;
  const ta = opts.ta;
  if (ta === 'center') t.ta = 'CENTER';
  else if (ta === 'right' || ta === 'end') t.ta = 'RIGHT';
  const unaLinea = (opts.lineas || 1) <= 1 && !runs.some((r) => r.t.includes('\n'));
  const anchoTexto = opts.medida ? opts.medida.w : opts.contenedor.w;
  const holgura = opts.contenedor ? opts.contenedor.w - anchoTexto : 0;
  if (unaLinea && (!t.ta || opts.ajustar || holgura < 4)) {
    t.sw = 'H';                         // ancho automático: no se parte por una diferencia mínima de métrica
    t.w = r2(anchoTexto);
  } else {
    t.sw = 'F';
    t.w = r2(Math.max(anchoTexto, opts.contenedor ? opts.contenedor.w : 0));
  }
  t.h = r2(opts.medida ? opts.medida.h : opts.contenedor.h);
  return t;
}

// ---- Marco base (rellenos, bordes, radios, efectos) ----
function marcoBase(o, ctx, nombre) {
  const s = o.s || {};
  const f = { k: 'F', n: nombre || nombreCapa(o), w: r2(o.b[2]), h: r2(o.b[3]) };
  const fills = [];
  if (s.bg) fills.push(pintura(s.bg, 'fondo', ctx.prefs, ctx.roles));
  if (!s.bsz) fondosImagen(s.bi, o.b[2], o.b[3]).forEach((g) => fills.push(g));   // los mosaicos (damero) no pasan
  if (fills.length) f.fi = fills.filter(Boolean);
  if (s.bw) {
    const bw = s.bw;
    const lado = bw.findIndex((x) => x > 0);
    const col = s.bc && s.bc[lado];
    const p = pintura(col, 'borde', ctx.prefs, ctx.roles);
    if (p) {
      f.st = [p];
      f.bw = bw[0] === bw[1] && bw[1] === bw[2] && bw[2] === bw[3] ? bw[0] : bw;
      if (s.bd) f.bd = 1;
    }
  }
  if (s.br) {
    const br = s.br.map((r) => Math.min(r, 9999));
    f.r = br[0] === br[1] && br[1] === br[2] && br[2] === br[3] ? br[0] : br;
  }
  const fx = sombras(s.sh, 'efecto', ctx.prefs);
  if (s.bf) { const d = desenfoque(s.bf); if (d) fx.push(d); }
  if (fx.length) {
    const est = !s.bf && estiloSombra(fx);
    if (est) f.fxs = est; else f.fx = fx;
  }
  if (s.op !== undefined && s.op < 1) f.op = s.op;
  if (s.ov) f.cl = 1;
  if (s.mb) f.bm = s.mb.toUpperCase().replace(/-/g, '_');
  return f;
}

// Fusiona en el marco las capas absolutas (::before / ::after) que lo cubren entero
function fusionarCapa(f, ps, o, ctx) {
  const s = ps.s || {};
  const op = s.op !== undefined ? s.op : 1;
  const extra = [];
  if (s.bg) { const p = pintura([s.bg[0], s.bg[1], s.bg[2], r2(s.bg[3] * op * 1000) / 1000], 'fondo', ctx.prefs, ctx.roles); if (p) extra.push(p); }
  fondosImagen(s.bi, o.b[2], o.b[3]).forEach((g) => { if (op < 1) g.s = g.s.map((p) => [p[0], p[1], p[2], p[3], r2(p[4] * op * 1000) / 1000]); extra.push(g); });
  if (extra.length) f.fi = (f.fi || []).concat(extra);
  const fx = sombras(s.sh, 'efecto', ctx.prefs, op);
  if (s.bf) { const d = desenfoque(s.bf); if (d) fx.push(d); }
  if (fx.length) {
    const previas = f.fx || (f.fxs ? ESTILOS_EFECTO.find((e) => e.n === f.fxs).fx : []);
    delete f.fxs;
    f.fx = previas.concat(fx);
    const est = !f.fx.some((e) => e.t === 'B') && estiloSombra(f.fx);
    if (est) { f.fxs = est; delete f.fx; }
  }
}

// Caja de un pseudoelemento absoluto, relativa al elemento
function cajaPseudo(ps, o) {
  const bw = (o.s && o.s.bw) || [0, 0, 0, 0];
  const pw = o.b[2] - bw[1] - bw[3], ph = o.b[3] - bw[0] - bw[2];
  const num = (v) => (v === undefined || v === 'auto' ? null : parseFloat(v));
  const l = num(ps.l), t = num(ps.t), r = num(ps.r), b = num(ps.b);
  const x = bw[3] + (l !== null ? l : r !== null ? pw - r - ps.w : 0);
  const y = bw[0] + (t !== null ? t : b !== null ? ph - b - ps.h : 0);
  return { x, y, w: ps.w, h: ps.h };
}

function nodoPseudo(ps, o, ctx, nombre) {
  if (ps.tx) {
    return nodoTexto([{ t: ps.tx, st: ps.st }], ctx, { medida: { w: (ps.st.fs || 12) * 0.6 * ps.tx.length, h: ps.st.lh || ps.st.fs * 1.4 }, contenedor: { w: 0, h: 0 }, ajustar: true, nombre });
  }
  const s = ps.s || {};
  if (ps.msk && s.bg) {
    const svg = svgDeMascara(ps.msk, s.bg);
    if (svg) return { k: 'SVG', n: nombre, svg, w: r2(ps.w), h: r2(ps.h) };
  }
  const f = marcoBase({ b: [0, 0, ps.w, ps.h], s }, ctx, nombre);
  f.lm = 'N';
  return f;
}

// ---- Instancias de componentes ----
function textoDe(o) {
  if (o.tx) return sinMarcas(o.tx.map((r) => r.t).join(''));
  if (o.x) return sinMarcas(o.x.map((r) => r.t).join(''));
  return (o.k || []).map(textoDe).join('');
}
const buscarNodo = (o, pred) => { if (pred(o)) return o; for (const k of o.k || []) { const r = buscarNodo(k, pred); if (r) return r; } return null; };
const buscarTodos = (o, pred, res = []) => { if (pred(o)) res.push(o); for (const k of o.k || []) buscarTodos(k, pred, res); return res; };

function estadoDe(o, estados) {
  const cs = clases(o);
  const a = o.a || {};
  if (a.disabled) return estados.desactivado || 'Desactivado';
  if (cs.includes('is-loading')) return 'Carga';
  if (cs.includes('is-pressed')) return 'Pulsado';
  if (cs.includes('is-hover') || cs.includes('lab-hover')) return 'Hover';
  if (cs.includes('lab-focus')) return 'Foco';
  return 'Normal';
}

/** Si el elemento es un componente conocido, devuelve su instancia (o null) */
function instancia(o, ctx) {
  if (ctx.sinInstancias || !o.c) return null;
  if (ctx.raiz && ctx.comp) return null;      // la raíz de un componente no se sustituye por sí misma
  const cs = clases(o);
  const a = o.a || {};
  const inst = (comp, v, p, ov) => {
    if (!VARIANTES_EXISTENTES.has(claveVariante(comp, v))) return null;
    const n = { k: 'I', comp, w: r2(o.b[2]), h: r2(o.b[3]) };
    if (v) n.v = v;
    if (p && Object.keys(p).length) n.p = p;
    if (ov && ov.length) n.ov = ov;
    return n;
  };
  if (cs.includes('aura-btn') && ctx.comp !== 'Botón') {
    const tipo = cs.includes('aura-btn--primary') ? 'Primario' : cs.includes('aura-btn--secondary') ? 'Secundario' : cs.includes('aura-btn--inverse') ? 'Inverso' : cs.includes('aura-btn--destructive') ? 'Destructivo' : 'Terciario';
    const n = inst('Botón', { Tipo: tipo, Estado: estadoDe(o, {}) }, propsBoton(o));
    if (n && cs.includes('aura-btn--block')) n.sw = 'F';
    return n;
  }
  if (cs.includes('aura-link') && ctx.comp !== 'Botón' && (o.tx || o.k)) {
    const txt = textoDe(o).replace(/[  ]?›\s*$/, '').trim();
    const p = { Etiqueta: txt, 'Flecha ›': !cs.includes('aura-link--plain') };
    const ov = cs.includes('aura-link--muted') ? [{ n: 'Etiqueta', fi: pintura(o.tx ? o.tx[0].st.co : [161, 161, 166, 1], 'texto') }] : null;
    return inst('Botón', { Tipo: 'Enlace', Estado: estadoDe(o, {}) }, p, ov);
  }
  if (cs.includes('aura-icon-btn')) {
    const ico = buscarNodo(o, (x) => x.ico);
    return inst('Botón de icono', { Estilo: cs.includes('aura-icon-btn--solid') ? 'Sólido' : 'Transparente', Estado: estadoDe(o, {}) }, ico && icono(ico.ico) ? { Icono: { ico: ico.ico } } : null);
  }
  if (cs.includes('aura-badge') && ctx.comp !== 'Insignia') {
    const tipo = cs.includes('aura-badge--blue') ? 'Azul' : cs.includes('aura-badge--ok') ? 'Completado' : cs.includes('aura-badge--warn') ? 'Aviso' : cs.includes('aura-badge--error') ? 'Error' : cs.includes('aura-badge--neutral') ? 'Neutro' : 'Dorado';
    if (buscarNodo(o, (x) => x.ico)) return null;
    return inst('Insignia', { Tipo: tipo, Estilo: cs.includes('aura-badge--mono') ? 'Mono' : 'Píldora' }, { Texto: textoDe(o).trim() });
  }
  if (cs.includes('aura-chip') && ctx.comp !== 'Chip') {
    const ico = buscarNodo(o, (x) => x.ico);
    const tipo = o.t === 'button' || o.t === 'a' ? 'Pulsable' : 'Etiqueta';
    const estado = cs.includes('is-active') || a['aria-pressed'] === 'true' ? 'Activo' : estadoDe(o, {});
    const p = { Texto: textoDe(o).trim(), Icono: !!ico };
    if (ico && icono(ico.ico)) p['Icono · cuál'] = { ico: ico.ico };
    return inst('Chip', { Tipo: tipo, Estado: tipo === 'Etiqueta' ? 'Normal' : estado }, p);
  }
  if (cs.includes('aura-field') && ctx.comp !== 'Campo de texto') return instanciaCampo(o, ctx, inst);
  if ((cs.includes('aura-check') || cs.includes('aura-radio')) && ctx.comp !== 'Casilla') {
    const input = buscarNodo(o, (x) => x.t === 'input');
    const ia = Object.assign({}, (input && input.a) || {}, o.a || {});
    const estado = ia.disabled ? 'Desactivada' : cs.includes('is-invalid') || ctx.invalido ? 'Error' : ia.checked === true ? 'Marcada' : 'Normal';
    const lab = buscarNodo(o, (x) => /__label$/.test(clases(x).join(' ')) || (x.c || '').includes('__label'));
    return inst('Casilla', { Tipo: cs.includes('aura-radio') ? 'Radio' : 'Casilla', Estado: estado }, { Etiqueta: lab ? textoDe(lab).trim() : textoDe(o).trim() });
  }
  if (cs.includes('aura-swatch') && ctx.comp !== 'Muestra de color') {
    const input = buscarNodo(o, (x) => x.t === 'input');
    const dot = buscarNodo(o, (x) => tiene(x, 'aura-swatch__dot'));
    const color = dot && dot.s && dot.s.bg;
    const elegida = (o.a && o.a.checked === true) || (input && input.a && input.a.checked === true);
    const n = inst('Muestra de color', { 'Tamaño': 'Grande', Estado: elegida ? 'Elegida' : 'Normal' }, null, color ? [{ n: 'Color', fi: pintura(color, 'muestra') }] : null);
    return n;
  }
  if (cs.includes('aura-swatch-list__dot') && ctx.comp !== 'Muestra de color') {
    return inst('Muestra de color', { 'Tamaño': 'Punto', Estado: 'Normal' }, null, o.s && o.s.bg ? [{ n: 'Color', fi: pintura(o.s.bg, 'muestra') }] : null);
  }
  if (cs.includes('aura-segmented__item') && ctx.comp !== 'Opción de segmentado') {
    const input = buscarNodo(o, (x) => x.t === 'input');
    const elegida = a.checked === true || (input && input.a && input.a.checked === true) || cs.includes('is-active') || a['aria-current'] || a['aria-pressed'] === 'true';
    return inst('Opción de segmentado', { Estado: elegida ? 'Elegida' : estadoDe(o, {}) }, { Texto: textoDe(o).trim() });
  }
  if (cs.includes('aura-note') && ctx.comp !== 'Nota') {
    const ico = buscarNodo(o, (x) => x.ico);
    const p = { 'Título': textoDe(buscarNodo(o, (x) => tiene(x, 'aura-note__title')) || {}).trim() };
    const tx = buscarNodo(o, (x) => tiene(x, 'aura-note__text'));
    if (tx && buscarTodos(o, (x) => tiene(x, 'aura-note__text')).length === 1 && !(tx.tx || []).some((r) => r.st.ff === 'mono')) p.Texto = textoDe(tx).trim(); else return null;
    if (ico && icono(ico.ico)) p.Icono = { ico: ico.ico };
    return inst('Nota', { Tipo: cs.includes('aura-note--blue') ? 'Azul' : 'Dorado' }, p);
  }
  if (cs.includes('aura-toast') && ctx.comp !== 'Aviso') {
    const tipo = cs.includes('aura-toast--ok') ? 'Completado' : cs.includes('aura-toast--warn') ? 'Aviso' : cs.includes('aura-toast--error') ? 'Error' : 'Estado';
    const accion = buscarNodo(o, (x) => tiene(x, 'aura-toast__action'));
    const p = { 'Título': textoDe(buscarNodo(o, (x) => tiene(x, 'aura-toast__title')) || {}).trim(), Texto: textoDe(buscarNodo(o, (x) => tiene(x, 'aura-toast__text')) || {}).trim(), 'Acción visible': !!accion };
    if (accion) p['Acción'] = textoDe(accion).trim();
    return inst('Aviso', { Tipo: tipo }, p);
  }
  if (cs.includes('aura-alert') && ctx.comp !== 'Alerta') {
    const tipo = cs.includes('aura-alert--ok') ? 'Completado' : cs.includes('aura-alert--warn') ? 'Aviso' : cs.includes('aura-alert--error') ? 'Error' : 'Información';
    return inst('Alerta', { Tipo: tipo }, { 'Título': textoDe(buscarNodo(o, (x) => tiene(x, 'aura-alert__title')) || {}).trim(), Texto: textoDe(buscarNodo(o, (x) => tiene(x, 'aura-alert__text')) || {}).trim() });
  }
  if (o.t === 'li' && ctx.enNotasAlPie && ctx.comp !== 'Nota al pie') {
    return inst('Nota al pie', null, { Texto: textoDe(o).trim(), 'Número': (o.mk && o.mk.t) || '1.' });
  }
  if (cs.includes('aura-product-card') && ctx.comp !== 'Tarjeta de producto') return instanciaTarjeta(o, ctx, inst);
  if (cs.includes('aura-family-card') && ctx.comp !== 'Tarjeta de familia') return instanciaFamilia(o, ctx, inst);
  return null;
}

function propsBoton(o) {
  const p = {};
  const hijos = o.k || [];
  const iTexto = hijos.findIndex((h) => h.x || h.tx);
  const etiqueta = (o.tx ? textoDe(o) : hijos.filter((h) => h.x || h.tx).map(textoDe).join(' ')).replace(/[  ]?›\s*$/, '').trim();
  if (etiqueta) p.Etiqueta = etiqueta;
  const icos = hijos.map((h, i) => [h, i]).filter(([h]) => h.ico !== undefined);
  const antes = icos.find(([, i]) => iTexto < 0 || i < iTexto);
  const despues = icos.find(([, i]) => iTexto >= 0 && i > iTexto);
  p['Icono delante'] = !!antes;
  p['Icono detrás'] = !!despues;
  if (antes && icono(antes[0].ico)) p['Icono · delante'] = { ico: antes[0].ico };
  if (despues && icono(despues[0].ico)) p['Icono · detrás'] = { ico: despues[0].ico };
  return p;
}

function instanciaCampo(o, ctx, inst) {
  const cs = clases(o);
  const control = buscarNodo(o, (x) => tiene(x, 'aura-field__control'));
  if (!control) return null;
  // Solo campos sencillos: etiqueta, control, ayuda / error
  const raros = (o.k || []).filter((h) => !h.x && !/aura-field__(label|control|help|error)/.test(h.c || ''));
  if (raros.length) return null;
  const entrada = buscarNodo(control, (x) => /^(input|select|textarea)$/.test(x.t));
  if (!entrada) return null;
  const tipo = entrada.t === 'select' ? 'Selector' : entrada.t === 'textarea' ? 'Área de texto' : (entrada.a && entrada.a.type === 'password') || cs.includes('aura-field--toggle') ? 'Contraseña' : 'Texto';
  const estado = entrada.a && entrada.a.disabled ? 'Desactivado' : cs.includes('is-invalid') ? 'Error' : cs.includes('is-valid') ? 'Válido' : cs.includes('is-focused') ? 'Foco' : (entrada.c || '').includes('lab-hover') ? 'Hover' : 'Normal';
  const label = buscarNodo(o, (x) => tiene(x, 'aura-field__label'));
  const hint = label && buscarNodo(label, (x) => tiene(x, 'aura-field__hint'));
  const etiqueta = label ? (label.tx ? label.tx.map((r) => r.t).join('') : (label.k || []).filter((h) => h.x).map(textoDe).join(' ')).trim() : '';
  const flag = label && buscarNodo(label, (x) => tiene(x, 'g-flag'));
  const help = buscarNodo(o, (x) => tiene(x, 'aura-field__help'));
  const err = buscarNodo(o, (x) => tiene(x, 'aura-field__error'));
  const ico = buscarNodo(control, (x) => x.ico && tiene(x, 'aura-field__icon'));
  const p = {
    Etiqueta: etiqueta + (flag ? '' : ''),
    'Pista visible': !!hint, 'Ayuda visible': !!help, Icono: !!ico,
    Texto: entrada.tx ? entrada.tx.map((r) => r.t).join('') : '',
  };
  if (hint) p.Pista = textoDe(hint).trim();
  if (help) p.Ayuda = textoDe(help).trim();
  if (err) p.Error = textoDe(err).trim();
  if (ico && icono(ico.ico)) p['Icono · cuál'] = { ico: ico.ico };
  const ov = [];
  // Texto escrito (no placeholder) en un estado que en el componente lleva placeholder
  if (entrada.tx && !entrada.ph && (estado === 'Normal' || estado === 'Hover')) ov.push({ n: 'Texto', fi: pintura(entrada.tx[0].st.co, 'texto') });
  if (entrada.ph && (estado === 'Foco' || estado === 'Error' || estado === 'Válido' || estado === 'Desactivado')) ov.push({ n: 'Texto', fi: pintura(entrada.tx[0].st.co, 'texto') });
  const n = inst('Campo de texto', { Tipo: tipo, Estado: estado }, p, ov);
  if (n) n.sw = 'F';
  return n;
}

function instanciaTarjeta(o, ctx, inst) {
  if (!MAESTRAS['Tarjeta de producto'] || MAESTRAS['Tarjeta de producto'] === o) return null;
  const t = (cls) => { const n = buscarNodo(o, (x) => tiene(x, cls)); return n ? textoDe(n).trim() : null; };
  const p = {};
  const eb = buscarNodo(o, (x) => tiene(x, 'aura-eyebrow'));
  p['Antetítulo visible'] = !!eb;
  if (eb) p['Antetítulo'] = textoDe(eb).trim();
  const campos = { Nombre: 'aura-product-card__name', Acabado: 'aura-product-card__finish', Texto: 'aura-product-card__text' };
  for (const [k, c] of Object.entries(campos)) { const v = t(c); if (v !== null) p[k] = v; }
  const st = buscarNodo(o, (x) => tiene(x, 'aura-product-card__status'));
  p['Disponibilidad visible'] = !!st;
  if (st) p.Disponibilidad = textoDe(st).trim();
  const precio = buscarNodo(o, (x) => tiene(x, 'aura-price'));
  if (precio) p.Precio = textoDe(precio).trim();
  const cuota = buscarNodo(o, (x) => tiene(x, 'aura-caption') && buscarNodo(o, (y) => tiene(y, 'aura-product-card__price') && buscarNodo(y, (z) => z === x)));
  if (cuota) p.Cuota = textoDe(cuota).trim();
  const ov = [];
  const img = buscarNodo(o, (x) => x.src);
  if (img) ov.push({ n: 'Foto', img: claveImagen(img.src) });
  const dots = buscarTodos(o, (x) => tiene(x, 'aura-swatch-list__dot'));
  for (let i = 0; i < 5; i++) {
    if (dots[i]) ov.push({ n: 'Muestra ' + (i + 1), vis: true, fi: pintura(dots[i].s.bg, 'muestra') });
    else ov.push({ n: 'Muestra ' + (i + 1), vis: false });
  }
  const btn = buscarNodo(o, (x) => tiene(x, 'aura-btn'));
  if (btn) ov.push({ n: 'Botón', p: propsBoton(btn) });
  const n = inst('Tarjeta de producto', null, p, ov);
  if (n) { n.sw = 'F'; n.sh = 'F'; }
  return n;
}

function instanciaFamilia(o, ctx, inst) {
  if (!MAESTRAS['Tarjeta de familia'] || MAESTRAS['Tarjeta de familia'] === o) return null;
  const body = buscarNodo(o, (x) => tiene(x, 'aura-family-card__body'));
  if (!body) return null;
  const p = {};
  const eb = buscarNodo(body, (x) => tiene(x, 'aura-eyebrow')); if (eb) p.Familia = textoDe(eb).trim();
  const h = buscarNodo(body, (x) => tiene(x, 'aura-h4')); if (h) p.Lema = textoDe(h).trim();
  const txt = (body.k || []).find((x) => tiene(x, 'aura-caption')); if (txt) p.Texto = textoDe(txt).trim();
  const foot = buscarNodo(body, (x) => tiene(x, 'aura-family-card__foot'));
  if (foot) {
    const pr = buscarNodo(foot, (x) => tiene(x, 'aura-caption')); if (pr) p.Precio = textoDe(pr).trim();
    const ln = buscarNodo(foot, (x) => tiene(x, 'aura-link')); if (ln) p._enlace = textoDe(ln).replace(/[  ]?›\s*$/, '').trim();
  }
  const ov = [];
  const img = buscarNodo(o, (x) => x.src);
  if (img) ov.push({ n: 'Foto', img: claveImagen(img.src) });
  if (p._enlace) { ov.push({ n: 'Enlace', p: { Etiqueta: p._enlace } }); delete p._enlace; }
  const n = inst('Tarjeta de familia', null, p, ov);
  if (n) { n.sw = 'F'; n.sh = 'F'; }
  return n;
}

const MAESTRAS = {};                    // componente → nodo de la captura que hace de maestro

// ---- Compilación de un elemento ----
function compilar(o, ctx) {
  if (o.x) return null;                 // los textos anónimos los trata el contenedor
  const sust = instancia(o, ctx);
  if (sust) return sust;
  const s = o.s || {};
  const cs = clases(o);

  // Atómicos
  if (o.src !== undefined) {
    if (!o.src) return null;
    const n = { k: 'IMG', n: 'Foto', src: claveImagen(o.src), w: r2(o.b[2]), h: r2(o.b[3]), fit: s.of === 'cover' ? 'FILL' : s.of === 'contain' || s.of === 'scale-down' ? 'FIT' : 'FILL' };
    if (s.br) n.r = s.br[0];
    if (s.mb) n.bm = s.mb.toUpperCase().replace(/-/g, '_');
    if (s.op !== undefined && s.op < 1) n.op = s.op;
    return n;
  }
  if (o.svg) return { k: 'SVG', n: 'Gráfica', svg: o.svg, w: r2(o.b[2]), h: r2(o.b[3]) };
  if (o.ico !== undefined) {
    if (!icono(o.ico)) return null;
    const tam = r2(o.st.fs || 16);
    const n = { k: 'ICO', n: 'Icono', i: o.ico, s: tam, w: tam, h: tam, co: pintura(o.st.co, 'texto', ctx.prefs, rolesDe(ctx, clases(o)) || ctx.roles) };
    // Un icono con caja propia (fondo, borde, relleno) va dentro de su marco
    if (s.bg || s.bw || s.p) {
      const f = marcoBase(o, ctx);
      Object.assign(f, { lm: 'H', pa: 'CENTER', ca: 'CENTER', c: [n] });
      return f;
    }
    return n;
  }
  if (cs.includes('aura-spinner')) {
    const col = s.bc ? s.bc.find((c) => c) : [255, 255, 255, 1];
    const d = Math.min(o.b[2], o.b[3]);
    const g = (s.bw && Math.max(...s.bw)) || 2;
    return { k: 'E', n: 'Cargando', w: r2(d), h: r2(d), fi: [pintura(col, 'texto', ctx.prefs, ctx.roles)], arc: [0, 4.71, r2(1 - (2 * g) / d)] };
  }

  const c2 = ctxHijo(ctx, o);
  if (cs.includes('aura-footnotes__list')) c2.enNotasAlPie = true;
  if (cs.includes('is-invalid')) c2.invalido = true;
  if (o.t === 'table') c2.enTabla = true;

  // Elemento de texto puro
  if (o.tx) return elementoTexto(o, c2);
  return contenedor(o, c2);
}

function tieneCaja(s) {
  return !!(s.bg || s.bw || s.bi || s.sh || s.bf || s.ol);
}

function elementoTexto(o, ctx) {
  const s = o.s || {};
  const medida = o.tb ? { x: o.tb[0], y: o.tb[1], w: o.tb[2], h: o.tb[3] } : null;
  const bw = s.bw || [0, 0, 0, 0], p = s.p || [0, 0, 0, 0];
  const interior = { w: o.b[2] - bw[1] - bw[3] - p[1] - p[3], h: o.b[3] - bw[0] - bw[2] - p[0] - p[2] };
  let tagTabla = null;
  if (ctx.enTabla) {
    if (o.t === 'caption') tagTabla = 'caption';
    else if (o.t === 'th') tagTabla = (ctx.clases || []).includes('g-num') ? 'num' : o.s && o.tx[0] && o.tx[0].st.ff === 'mono' && o.tx[0].st.tt ? 'th' : 'thb';
    else if (o.t === 'td') tagTabla = (ctx.clases || []).includes('g-num') ? 'num' : 'td';
  }
  const enLinea = /^inline/.test(s.d || '') || ctx.padreFila;
  const t = nodoTexto(o.tx, ctx, { medida, contenedor: interior, lineas: o.ln, ta: s.ta, tagTabla, ajustar: enLinea });
  if (!t) return null;
  if (o.t === 'input' || o.t === 'textarea' || o.t === 'select') { t.n = 'Texto'; t.h = r2(o.tx[0].st.lh || o.tx[0].st.fs * 1.5); }
  // Con caja visible, relleno o marcador: marco con el texto dentro. Un bloque con relleno (la cinta, el
  // título de una tabla) también: un texto de Figma no tiene relleno y se perdería ese espacio.
  const conRelleno = !!s.p && s.p.some((v) => v > 0.5);
  if (tieneCaja(s) || (s.p && (enLinea || o.t === 'input' || o.t === 'textarea' || o.t === 'select' || o.t === 'td' || o.t === 'th')) || conRelleno || o.mk || (s.pos === 'abs') || o.pb || o.pa) {
    const f = marcoBase(o, ctx);
    f.lm = 'H';
    if (f.st) { f.sil = 1; f.pad = p.slice().map(r2); } else f.pad = [bw[0] + p[0], bw[1] + p[1], bw[2] + p[2], bw[3] + p[3]].map(r2);
    f.ca = 'CENTER';
    if (o.t === 'textarea') f.ca = 'MIN';
    f.pa = t.ta === 'CENTER' ? 'CENTER' : t.ta === 'RIGHT' ? 'MAX' : 'MIN';
    if (medida && !enLinea) {
      // posición vertical real del texto dentro de la caja
      const arriba = medida.y - (o.b[1] + bw[0] + p[0]);
      if (arriba > 2 && o.t !== 'input' && o.t !== 'select') { f.ca = 'MIN'; f.pad[0] = r2(f.pad[0] + arriba); }
    }
    if (t.sw === 'F') t.sl = 1;          // el texto llena el ancho del marco
    f.c = [t];
    const padH = f.pad[1] + f.pad[3] + (f.sil ? bw[1] + bw[3] : 0);
    const ajustado = Math.abs(o.b[2] - (t.w + padH)) < 2.5;
    f.sw = enLinea && ajustado && !/^(input|select|textarea)$/.test(o.t) ? 'H' : 'F';
    if (o.t === 'select') {
      // El chevrón del selector es una imagen de fondo en la web
      const ico = icono('chevron-down');
      if (ico) f.c.push({ k: 'ICO', n: 'Chevrón', i: ico, s: 16, w: 16, h: 16, co: pintura(t.runs[0].co && t.runs[0].co.c ? t.runs[0].co.c : [161, 161, 166, 1], 'texto'), x: r2(o.b[2] - 32), y: r2((o.b[3] - 16) / 2), ab: 1, cn: ['MAX', 'CENTER'] });
    }
    const bordeV = f.sil ? bw[0] + bw[2] : 0;
    f.sh = Math.abs(o.b[3] - (t.h + f.pad[0] + f.pad[2] + bordeV)) < 1.5 ? 'H' : 'F';
    añadirAbsolutos(f, o, ctx);
    return f;
  }
  // Texto suelto: la caja del elemento (bloque) o la del texto (en línea)
  if (!enLinea && t.sw === 'F') t.w = r2(Math.max(interior.w, 1));
  return t;
}

// Elementos de flujo de un contenedor: elementos, textos anónimos y pseudoelementos
function elementosDeFlujo(o, ctx) {
  const items = [];
  const abs = [];
  const add = (it) => { if (it.nodo) items.push(it); };
  if (o.pb) (o.pb.pos === 'absolute' || o.pb.pos === 'fixed' ? abs : items).push({ tipo: 'ps', ps: o.pb, cual: 'antes' });
  for (const h of o.k || []) {
    if (h.x) { items.push({ tipo: 'x', h, b: caja(h) }); continue; }
    if (h.s && h.s.pos === 'abs') { abs.push({ tipo: 'el', h, b: caja(h) }); continue; }
    items.push({ tipo: 'el', h, b: caja(h) });
  }
  if (o.pa) (o.pa.pos === 'absolute' || o.pa.pos === 'fixed' ? abs : items).push({ tipo: 'ps', ps: o.pa, cual: 'despues' });
  return { items, abs };
}

function añadirAbsolutos(f, o, ctx) {
  const { abs } = elementosDeFlujo(o, ctx);
  const capas = [];
  for (const it of abs) {
    if (it.tipo === 'ps') {
      const ps = it.ps;
      const b = cajaPseudo(ps, o);
      // Fuera de la caja (efecto de borde bajo una barra): no se dibuja
      if (b.y >= o.b[3] - 0.5 || b.y + b.h <= 0.5 || b.x >= o.b[2] - 0.5 || b.x + b.w <= 0.5) continue;
      const cubre = Math.abs(b.x) <= 1.6 && Math.abs(b.y) <= 1.6 && Math.abs(b.w - o.b[2]) <= 3.2 && Math.abs(b.h - o.b[3]) <= 3.2;
      if (cubre && !ps.tx && !ps.msk && !(ps.s && ps.s.bw)) { fusionarCapa(f, ps, o, ctx); continue; }
      const n = nodoPseudo(ps, o, ctx, it.cual === 'antes' ? 'Capa ::before' : 'Capa ::after');
      if (!n) continue;
      n.x = r2(b.x); n.y = r2(b.y); n.ab = 1;
      capas.push(n);
    } else {
      const n = compilar(it.h, Object.assign({}, ctx, { padreFila: false }));
      if (!n) continue;
      n.x = r2(it.b.x - o.b[0]); n.y = r2(it.b.y - o.b[1]); n.ab = 1;
      if (n.k === 'T') n.sw = n.sw || 'H';
      capas.push(n);
    }
  }
  // Marcador de lista (1., •): fuera de la caja, a la izquierda
  if (o.mk) {
    const t = nodoTexto([{ t: o.mk.t, st: o.mk.st }], ctx, { medida: { w: o.mk.st.fs * 1.2, h: o.mk.st.lh || o.mk.st.fs * 1.5 }, contenedor: { w: 0, h: 0 }, ajustar: true, nombre: 'Marcador' });
    if (t) { t.ta = 'RIGHT'; t.sw = 'F'; t.w = r2(o.mk.st.fs * 1.6); t.x = r2(-o.mk.st.fs * 1.9); t.y = 0; t.ab = 1; capas.push(t); }
  }
  // Contorno de foco (outline): anillo separado del borde
  const ol = o.s && o.s.ol;
  if (ol && ol[1]) {
    let off = ol[2];
    if ([0.8, 1.6, 2.4, 3.2].some((v) => Math.abs(v - off) < 0.05)) off = Math.round(off * 1.25);
    const ow = ol[0];
    const r = o.s.br ? o.s.br[0] : 0;
    capas.push({ k: 'F', n: 'Contorno de foco', lm: 'N', x: r2(-off - ow), y: r2(-off - ow), w: r2(o.b[2] + 2 * (off + ow)), h: r2(o.b[3] + 2 * (off + ow)), st: [pintura(ol[1], 'borde', ['Color/Foco/'])], bw: ow, r: r ? r2(r + off + ow) : 0, ab: 1, cn: ['STRETCH', 'STRETCH'] });
  }
  const W = o.b[2], Hh = o.b[3];
  capas.forEach((n) => {
    if (n.cn) return;
    const w = n.w || 0, h = n.h || 0, x = n.x || 0, y = n.y || 0;
    const hor = x <= 1.5 && Math.abs(x + w - W) <= 1.5 ? 'STRETCH' : Math.abs(x + w / 2 - W / 2) < 1.5 && x > 1 ? 'CENTER' : W - (x + w) < x ? 'MAX' : 'MIN';
    const ver = y <= 1.5 && Math.abs(y + h - Hh) <= 1.5 ? 'STRETCH' : Math.abs(y + h / 2 - Hh / 2) < 1.5 && y > 1 ? 'CENTER' : Hh - (y + h) < y ? 'MAX' : 'MIN';
    n.cn = [hor, ver];
  });
  if (capas.length) {
    f.c = (f.c || []).concat(capas);
    if (!f.cl) f.cl = 0;
  }
}

// ---- Contenedor: decide el auto layout a partir de las cajas ----
function contenedor(o, ctx) {
  const s = o.s || {};
  const f = marcoBase(o, ctx);
  const { items } = elementosDeFlujo(o, ctx);
  const bw = s.bw || [0, 0, 0, 0], p = s.p || [0, 0, 0, 0];
  const cb = { x: o.b[0] + bw[3] + p[3], y: o.b[1] + bw[0] + p[0], w: o.b[2] - bw[1] - bw[3] - p[1] - p[3], h: o.b[3] - bw[0] - bw[2] - p[0] - p[2] };
  const esFlex = /flex/.test(s.d || '');
  const fila = esFlex && /^row/.test(s.fd || 'row');
  const columna = esFlex && /^column/.test(s.fd || '');
  const gapCSS = s.g ? (fila ? s.g[1] : s.g[0]) : 0;

  // Compila los elementos de flujo
  const reales = [];
  for (const it of items) {
    let n = null;
    const cHijo = Object.assign({}, ctx, { padreFila: fila });
    if (it.tipo === 'x') n = nodoTexto(it.h.x, cHijo, { medida: it.b, contenedor: it.b, lineas: it.h.ln, ta: s.ta, ajustar: true });
    else if (it.tipo === 'ps') n = nodoPseudo(it.ps, o, cHijo, it.cual === 'antes' ? '::before' : '::after');
    else n = compilar(it.h, cHijo);
    if (!n) continue;
    reales.push({ n, b: it.b || null, it });
  }
  if (!reales.length) {
    f.lm = 'N';
    añadirAbsolutos(f, o, ctx);
    return f;
  }

  const conCaja = reales.filter((r) => r.b);
  const solapanV = (a, b) => Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  const monotonoV = conCaja.every((r, i) => i === 0 || r.b.y >= conCaja[i - 1].b.y + conCaja[i - 1].b.h - 1.5);
  const monotonoH = conCaja.every((r, i) => i === 0 || r.b.x >= conCaja[i - 1].b.x + conCaja[i - 1].b.w - 1.5);
  const unaLinea = conCaja.every((r) => conCaja.every((q) => solapanV(r.b, q.b) > -1));

  let modo;
  if (fila && unaLinea && (monotonoH || /reverse/.test(s.fd))) modo = 'H';
  else if (columna && monotonoV) modo = 'V';
  else if (conCaja.length <= 1 && fila) modo = 'H';
  else if (monotonoV) modo = 'V';
  else if (unaLinea && monotonoH) modo = 'H';
  else modo = 'FILAS';

  if (modo === 'FILAS') {
    // Agrupa en filas (por solape vertical) y comprueba que cada fila va de izquierda a derecha
    const orden = conCaja.slice().sort((a, b) => a.b.y - b.b.y || a.b.x - b.b.x);
    const filas = [];
    for (const r of orden) {
      const f0 = filas.find((fl) => fl.some((q) => solapanV(q.b, r.b) > Math.min(q.b.h, r.b.h) * 0.5));
      if (f0) f0.push(r); else filas.push([r]);
    }
    filas.forEach((fl) => fl.sort((a, b) => a.b.x - b.b.x));
    const filasOk = filas.every((fl) => fl.every((r, i) => i === 0 || r.b.x >= fl[i - 1].b.x + fl[i - 1].b.w - 1.5));
    filas.sort((a, b) => Math.min(...a.map((r) => r.b.y)) - Math.min(...b.map((r) => r.b.y)));
    const cajaFila = (fl) => { const x0 = Math.min(...fl.map((r) => r.b.x)), y0 = Math.min(...fl.map((r) => r.b.y)); return { x: x0, y: y0, w: Math.max(...fl.map((r) => r.b.x + r.b.w)) - x0, h: Math.max(...fl.map((r) => r.b.y + r.b.h)) - y0 }; };
    const filasMono = filas.every((fl, i) => i === 0 || cajaFila(fl).y >= cajaFila(filas[i - 1]).y + cajaFila(filas[i - 1]).h - 1.5);
    if (filasOk && filasMono && reales.length === conCaja.length) {
      const nodosFila = filas.map((fl, i) => {
        if (fl.length === 1) return { n: fl[0].n, b: fl[0].b };
        const b = cajaFila(fl);
        const marco = { k: 'F', n: 'Fila ' + (i + 1), lm: 'H', w: r2(b.w), h: r2(b.h), sh: 'H', sw: 'F', ca: 'MIN' };
        organizar(marco, fl, 'H', b, { gapCSS: s.g ? s.g[1] : 0, jc: s.jc, ai: s.ai, ctx, esFlex });
        return { n: marco, b };
      });
      f.lm = 'V';
      organizar(f, nodosFila, 'V', cb, { gapCSS: s.g ? s.g[0] : 0, jc: 'normal', ai: 'normal', ctx, esFlex: false, o });
    } else {
      // Posiciones absolutas (solapes): marco sin auto layout
      f.lm = 'N';
      f.c = reales.map((r) => {
        const n = r.n;
        if (r.b) { n.x = r2(r.b.x - o.b[0]); n.y = r2(r.b.y - o.b[1]); } else { n.x = 0; n.y = 0; }
        if (n.k === 'T' && !n.sw) n.sw = 'H';
        return n;
      });
    }
  } else {
    f.lm = modo;
    // Una fila flex que se ha partido en líneas (o una columna que va en fila) no conserva su justify/align:
    // se coloca por las medidas
    const traspuesto = (modo === 'V' && fila) || (modo === 'H' && columna) || (!esFlex && /grid/.test(s.d || ''));
    if (traspuesto) organizar(f, reales, modo, cb, { gapCSS: s.g ? (modo === 'V' ? s.g[0] : s.g[1]) : 0, jc: 'normal', ai: 'normal', ctx, esFlex: false, o });
    else organizar(f, reales, modo, cb, { gapCSS, jc: s.jc, ai: s.ai, ji: s.ji, ctx, esFlex, o });
  }
  // Lo que en la web empieza por debajo del borde inferior del contenedor no se ve (el panel de un
  // acordeón cerrado, que el navegador recorta): en Figma va oculto, y se puede mostrar a mano
  if (f.lm === 'V' && !f.cl) {
    const fondo = cb.y + cb.h - 0.5;     // borde inferior del contenido (sin relleno ni borde)
    reales.forEach((r) => {
      if (!r.b || r.b.h <= 0.5 || r.b.y < fondo) return;
      r.n.oculto = 1;
      (f.c || []).forEach((h) => { if ((h.n === 'Margen' || h.n === 'Alineación') && h.c && h.c[0] === r.n) h.oculto = 1; });
    });
  }
  // Tamaño del contenedor: abraza si es en línea (o un flex sin caja en una fila)… salvo que mida más que su contenido
  if (/^inline/.test(s.d || '') || ctx.padreFila && esFlex && !s.bw && !s.bg) f.sw = f.sw || 'H';
  if (f.sw === 'H' && f.lm !== 'N') {
    const flujo = (f.c || []).filter((n) => !n.ab);
    const bordeH = f.sil ? bw[1] + bw[3] : 0;
    const anchoHijo = (n) => (n.k === 'ICO' ? n.s : n.w || 0);
    const contenido = f.lm === 'H'
      ? flujo.reduce((a, n) => a + anchoHijo(n), 0) + Math.max(0, flujo.length - 1) * (f.gap || 0)
      : Math.max(0, ...flujo.map(anchoHijo));
    if (o.b[2] - (contenido + (f.pad ? f.pad[1] + f.pad[3] : 0) + bordeH) > 1.5 && f.pa !== 'SPACE_BETWEEN') f.sw = 'F';
  }
  añadirAbsolutos(f, o, ctx);
  return f;
}

/** Coloca los hijos en un auto layout: hueco, rellenos, alineación y tamaños */
function organizar(f, reales, modo, cb, opts) {
  const H = modo === 'H';
  const conCaja = reales.filter((r) => r.b);
  const ini = (b) => (H ? b.x : b.y), fin = (b) => (H ? b.x + b.w : b.y + b.h);
  const cIni = H ? cb.x : cb.y, cFin = H ? cb.x + cb.w : cb.y + cb.h;
  const centrado = /center/.test(opts.jc || '') ? 'CENTER' : /space-between/.test(opts.jc || '') ? 'SPACE_BETWEEN' : /flex-end|^end/.test(opts.jc || '') ? 'MAX' : 'MIN';
  const esFlexPrincipal = opts.esFlex;
  // Huecos medidos entre elementos consecutivos
  const huecos = [];
  for (let i = 1; i < conCaja.length; i++) huecos.push(ini(conCaja[i].b) - fin(conCaja[i - 1].b));
  let base;
  if (esFlexPrincipal && opts.gapCSS) base = opts.gapCSS;
  else if (huecos.length) base = Math.max(0, Math.min(...huecos));
  else base = opts.gapCSS || 0;
  if (base < 0.3) base = 0;
  const hijos = [];
  const espaciador = (d) => ({ k: 'F', n: 'Espacio', w: H ? ajuste(d) : 1, h: H ? 1 : ajuste(d), sw: H ? 'F' : 'L', sh: 'F', lm: 'N' });
  // Un hueco mayor que el general: en auto layout, un «Espacio» suma su medida MÁS otro hueco (va entre
  // dos elementos), así que mide hueco − 2 × base. Si el hueco no llega al doble, el elemento anterior
  // se envuelve en un «Margen» con ese relleno de más (como el margen de la web).
  const margenes = new Map();
  let iCaja = 0, previo = null;
  for (const r of reales) {
    if (r.b && iCaja > 0 && centrado !== 'SPACE_BETWEEN') {
      const hueco = huecos[iCaja - 1];
      const d = hueco - base;
      if (d > 0.6) {
        if (hueco - 2 * base >= 0.6) hijos.push(espaciador(hueco - 2 * base));
        else if (previo) margenes.set(previo, d);
      }
    }
    if (r.b) { iCaja++; previo = r.n; }
    hijos.push(r.n);
  }
  f.gap = ajuste(base);
  // Rellenos: el principal medido (incluye márgenes), salvo con alineación central o al final
  const s = (opts.o && opts.o.s) || {};
  const bw = s.bw || [0, 0, 0, 0], p = s.p || [0, 0, 0, 0];
  const padCSS = [bw[0] + p[0], bw[1] + p[1], bw[2] + p[2], bw[3] + p[3]];   // con borde (se resta abajo si el trazo entra en el layout)
  const exterior = opts.o ? { x: opts.o.b[0], y: opts.o.b[1], w: opts.o.b[2], h: opts.o.b[3] } : { x: cb.x, y: cb.y, w: cb.w, h: cb.h };
  let pad = padCSS.slice();
  if (!opts.o) pad = [0, 0, 0, 0];
  if (conCaja.length && (centrado === 'MIN' || !esFlexPrincipal)) {
    // Solo se mide desde un borde si el primer (o último) hijo tiene caja: un pseudoelemento no la tiene
    const primeroConCaja = !!reales[0].b, ultimoConCaja = !!reales[reales.length - 1].b;
    const primero = ini(conCaja[0].b), ultimo = fin(conCaja[conCaja.length - 1].b);
    if (H) { if (primeroConCaja) { pad[3] = Math.max(0, primero - exterior.x); if (!opts.o) pad[3] = Math.max(0, primero - cb.x); } }
    else { if (primeroConCaja) pad[0] = Math.max(0, primero - exterior.y); if (ultimoConCaja) pad[2] = Math.max(0, exterior.y + exterior.h - ultimo); }
  }
  if (f.st && opts.o) { f.sil = 1; for (let i = 0; i < 4; i++) pad[i] = Math.max(0, pad[i] - bw[i]); }
  f.pad = pad.map(ajuste);
  f.pa = esFlexPrincipal ? centrado : 'MIN';
  // Eje cruzado
  const ancho = H ? cb.h : cb.w;
  const cIniX = H ? cb.y : cb.x;
  const alinea = (r) => {
    if (!r.b) return 'MIN';
    const a = H ? r.b.y : r.b.x, l = H ? r.b.h : r.b.w;
    if (Math.abs(l - ancho) < 1.5) return 'LLENA';
    const izq = a - cIniX, der = cIniX + ancho - (a + l);
    if (Math.abs(izq - der) < 1.5 && izq > 1) return 'CENTER';
    if (der < 1 && izq > 1) return 'MAX';
    return 'MIN';
  };
  let ca = 'MIN';
  const ai = opts.ai || '';
  if (H && /center/.test(ai)) ca = 'CENTER';
  else if (H && /baseline/.test(ai)) ca = 'BASELINE';
  else if (/flex-end|^end/.test(ai)) ca = 'MAX';
  else if (!H && /center/.test(ai)) ca = 'CENTER';
  else {
    const alin = conCaja.map(alinea).filter((a) => a !== 'LLENA');
    if (alin.length && alin.every((a) => a === 'CENTER')) ca = 'CENTER';
    else if (alin.length && alin.every((a) => a === 'MAX')) ca = 'MAX';
  }
  if (H && ca === 'MIN' && conCaja.length) {
    // con alineación arriba, el relleno superior real
    pad[0] = Math.max(0, Math.min(...conCaja.map((r) => r.b.y)) - exterior.y - (f.sil ? bw[0] : 0));
    if (!opts.o) pad[0] = Math.max(0, Math.min(...conCaja.map((r) => r.b.y)) - cb.y);
    f.pad = pad.map(ajuste);
  }
  if (!H && ca === 'MIN' && conCaja.length && !opts.o) {
    pad[3] = Math.max(0, Math.min(...conCaja.map((r) => r.b.x)) - cb.x);
    f.pad = pad.map(ajuste);
  }
  f.ca = ca;
  // Tamaño de cada hijo en el eje cruzado y principal
  for (const r of reales) {
    const n = r.n;
    if (!r.b) continue;
    const a = alinea(r);
    if (a === 'LLENA' && !H && n.k !== 'T') { if (n.k !== 'I' || n.sw === 'F') n.sw = 'L'; }
    if (a === 'LLENA' && H && n.k === 'F' && n.lm !== 'N' && n.sh !== 'F') n._llenaAlto = 1;
    if (H && conCaja.length === 1 && (n.k === 'F' || (n.k === 'I' && n.sw === 'F')) && Math.abs(r.b.w - cb.w) < 1.5) n.sw = 'L';
    if (!H && a !== 'LLENA' && ca === 'MIN' && a !== 'MIN' && n.k !== 'T') {
      // Hijo con otra alineación: se envuelve en una fila que llena el ancho
      const env = { k: 'F', n: 'Alineación', lm: 'H', sw: 'L', sh: 'H', w: r2(ancho), h: r2(r.b.h), pa: a === 'CENTER' ? 'CENTER' : 'MAX', ca: 'MIN', gap: 0, pad: [0, 0, 0, 0], c: [n] };
      const i = hijos.indexOf(n);
      if (i >= 0) hijos[i] = env;
    }
    if (n.k === 'T' && !H && a === 'LLENA' && n.sw === 'F') n.sl = 1;
  }
  f.c = hijos;
  // Alto / ancho propios del contenedor
  if (H) {
    const maxHijo = conCaja.length ? Math.max(...conCaja.map((r) => r.b.h)) : 0;
    const contenido = maxHijo + f.pad[0] + f.pad[2] + (f.sil ? bw[0] + bw[2] : 0);
    if (!f.sh) f.sh = Math.abs(f.h - contenido) < 1.5 || f.h < contenido ? 'H' : 'F';
    if (f.sh === 'H' && ca !== 'MIN' && f.h - contenido > 1.5) f.sh = 'F';
  } else if (!f.sh) {
    f.sh = esFlexPrincipal && centrado !== 'MIN' ? 'F' : 'H';
  }
  // Un marco que recorta y mide menos que su contenido (panel cerrado de un acordeón, carrusel…) conserva su alto
  if (f.cl && conCaja.length) {
    const ext = H ? Math.max(...conCaja.map((r) => r.b.y + r.b.h)) - Math.min(...conCaja.map((r) => r.b.y)) : conCaja.reduce((a, r) => a + r.b.h, 0);
    if (f.h + 1 < ext) f.sh = 'F';
  }
  // Llenar el alto solo si el padre lo fija o hay otro hijo que lo marque (si no, se hundiría)
  if (H) {
    const llenan = reales.filter((r) => r.n._llenaAlto);
    const otros = reales.filter((r) => !r.n._llenaAlto && r.b);
    llenan.forEach((r) => {
      if (f.sh === 'F' || otros.some((q) => q.b.h >= r.b.h - 1)) r.n.sh = 'L';
      delete r.n._llenaAlto;
    });
  }
  // Márgenes de más (ver arriba): el elemento va dentro de un marco con ese relleno detrás
  if (margenes.size) {
    f.c = f.c.map((h) => {
      const interior = h.n === 'Alineación' && h.c && h.c.length === 1 ? h.c[0] : h;
      const d = margenes.get(interior);
      return d ? envolverMargen(h, d, H) : h;
    });
  }
}

/** Marco transparente que añade «d» px detrás de un elemento (abajo en vertical, a la derecha en horizontal) */
function envolverMargen(n, d, H) {
  const llenaCruz = H ? n.sh === 'L' : n.sw === 'L' || (n.k === 'T' && !!n.sl);
  const ancho = n.k === 'ICO' ? n.s : n.w || 0, alto = n.k === 'ICO' ? n.s : n.h || 0;
  return {
    k: 'F', n: 'Margen', lm: H ? 'H' : 'V', w: r2(ancho + (H ? d : 0)), h: r2(alto + (H ? 0 : d)),
    pad: H ? [0, ajuste(d), 0, 0] : [0, 0, ajuste(d), 0], gap: 0, pa: 'MIN', ca: 'MIN',
    sw: H ? 'H' : llenaCruz ? 'L' : 'H', sh: H ? (llenaCruz ? 'L' : 'H') : 'H', c: [n],
  };
}

// -----------------------------------------------------------------------------
// 6. Componentes (variantes capturadas) y propiedades
// -----------------------------------------------------------------------------
const CAPTURA_COMP = leerJSON('capturas/componentes-captura.json');
const PIEZAS = ['capturas/piezas-auraphone-1440.json', 'capturas/piezas-auraphone-390.json'].filter((f) => fs.existsSync(path.join(AQUI, f))).map(leerJSON);
const CAPTURA_GUIA = leerJSON('capturas/guia-captura.json');

const DEFINICION = {
  'Botón': { orden: ['Tipo', 'Estado'], prefs: ['Color/Botón/', 'Color/Foco/'], d: 'Botón de AURA: 48 px de alto, píldora (radio 999) y 24 px a los lados; Inter 15 / 600. Una sola primaria por contexto; desactivado legible (3,01:1). Pulsado = escala .97 (en la web, al instante, en pointerdown). Enlace: acción de baja intensidad con «›».' },
  'Botón de icono': { orden: ['Estilo', 'Estado'], d: 'Botón de icono de 44 px (objetivo táctil). Su nombre va como texto oculto en la web. Pulsado = escala .92.' },
  'Insignia': { orden: ['Estilo', 'Tipo'], d: 'Insignia: píldora de 24 px con dorado suave (Inter 12 / 650) o etiqueta técnica mono en mayúsculas (radio 8). El color lo da el tipo.' },
  'Chip': { orden: ['Tipo', 'Estado'], d: 'Chip: 28 px (etiqueta) o 36 px (pulsable, 44 px en táctil). Activo: contorno azul de texto y tinte azul.' },
  'Campo de texto': { orden: ['Tipo', 'Estado'], prefs: ['Color/Campo/', 'Color/Foco/'], d: 'Campo de 56 px con etiqueta persistente (13 / 500), icono de apoyo, ayuda y error con icono. Foco: borde azul de texto + anillo de 4 px al 40 % + cristal.' },
  'Casilla': { orden: ['Tipo', 'Estado'], d: 'Casilla y radio de 20 px en una fila de 44 px; el orden es control → etiqueta.' },
  'Muestra de color': { orden: ['Tamaño', 'Estado'], prefs: ['Color/Acabado/'], d: 'Muestra de acabado: 32 px en un objetivo de 44 (elegida con anillo azul de 2 px separado 3) o punto informativo de 12 px. Cambia el color en la capa «Color».' },
  'Opción de segmentado': { orden: ['Estado'], d: 'Opción del control segmentado: 40 px (44 en táctil), Inter 14 / 500.' },
  'Segmentado': { d: 'Control segmentado de cuatro opciones: una sola pastilla elegida sobre Relleno 2.' },
  'Nota': { orden: ['Tipo'], d: 'Nota de uso de las páginas: icono dorado sobre dorado suave (o azul, informativa).' },
  'Aviso': { orden: ['Tipo'], d: 'Aviso (toast) de material fino: estado, completado, aviso y error; con acción opcional.' },
  'Alerta': { orden: ['Tipo'], d: 'Mensaje dentro del formulario o de la página: siempre icono + texto.' },
  'Nota al pie': { d: 'Nota al pie numerada con «volver al texto».' },
  'Tarjeta de producto': { d: 'Tarjeta de modelo: foto real (la primera vista del acabado por defecto) sobre el halo azul, antetítulo, nombre, acabado en azul, puntos de color, texto, disponibilidad, precio y botón.' },
  'Tarjeta de familia': { d: 'Tarjeta de familia: foto, antetítulo de familia, lema, texto, «Desde» y enlace a la familia.' },
  'Barra global': { orden: ['Tamaño'], d: 'Barra global: material regular negro de 56 px, marca, familias y acciones (buscar, bolsa, cuenta).' },
  'Cinta': { orden: ['Tamaño'], d: 'Cinta de aviso bajo la barra global (Inter 13).' },
  'Barra local': { orden: ['Tamaño'], d: 'Barra local de familia: material regular de 52 px, título (sube arriba del todo), secciones y «Comprar ›».' },
  'Pie': { orden: ['Tamaño'], d: 'Pie global sobre --bg-footer: marca, lema, directorio, redes y legal.' },
};

// Marca las propiedades en los nodos de cada componente (por clases y posición)
function marcarPropiedades(comp, raiz, o) {
  const props = [];
  const add = (n, t, d) => { if (!props.find((p) => p.n === n)) props.push({ n, t, d }); };
  const recorrer = (n, fn) => { fn(n); (n.c || []).forEach((h) => recorrer(h, fn)); };
  const textos = []; recorrer(raiz, (n) => { if (n.k === 'T') textos.push(n); });
  const icos = []; recorrer(raiz, (n) => { if (n.k === 'ICO') icos.push(n); });
  const porTexto = (txt) => textos.find((t) => t.runs.map((r) => r.t).join('').trim() === txt);
  const marcarTexto = (t, nombre) => { if (!t) return; t.n = nombre; t.pr = Object.assign(t.pr || {}, { characters: nombre }); add(nombre, 'TEXT', t.runs.map((r) => r.t).join('')); };
  const marcarIcono = (i, bool, swap, def) => {
    if (!i) return;
    i.n = bool || swap;
    i.pr = Object.assign(i.pr || {}, swap ? { mainComponent: swap } : {}, bool ? { visible: bool } : {});
    if (bool) add(bool, 'BOOLEAN', def);
    if (swap) add(swap, 'INSTANCE_SWAP', { ico: i.i });
    if (bool && !def) i.oculto = 1;
  };
  const txt = (cls) => { const el = buscarNodo(o, (x) => tiene(x, cls)); return el ? porTexto(textoDe(el).replace(/[  ]?›\s*$/, '').trim()) || porTexto(textoDe(el).trim()) : null; };
  if (comp === 'Botón') {
    // Enlace: el «›» va en su propia capa para poder ocultarlo («Flecha ›»)
    const conFlecha = textos.find((t) => /›\s*$/.test(t.runs.map((r) => r.t).join('')) && t.runs.map((r) => r.t).join('').trim() !== '›');
    if (conFlecha) {
      const ultimo = conFlecha.runs[conFlecha.runs.length - 1];
      const flechaRun = Object.assign({}, ultimo, { t: '›' });
      ultimo.t = ultimo.t.replace(/[  ]*›\s*$/, '');
      if (!ultimo.t) conFlecha.runs.pop();
      const flecha = { k: 'T', runs: [flechaRun], ts: conFlecha.ts, sw: 'H', w: r2(flechaRun.s * 0.4), h: conFlecha.h };
      const padre = raiz.c && raiz.c.includes(conFlecha) ? raiz : null;
      if (padre) {
        padre.c.splice(padre.c.indexOf(conFlecha) + 1, 0, flecha);
        padre.lm = 'H'; padre.gap = r2(flechaRun.s * 0.3); padre.ca = 'CENTER';
      }
      textos.push(flecha);
    }
    const lab = textos.find((t) => !/^\s*[ ]?›\s*$/.test(t.runs.map((r) => r.t).join('')));
    marcarTexto(lab, 'Etiqueta');
    const flecha = textos.find((t) => /^\s*[ ]?›\s*$/.test(t.runs.map((r) => r.t).join('')));
    if (flecha) { flecha.n = 'Flecha'; flecha.pr = { visible: 'Flecha ›' }; add('Flecha ›', 'BOOLEAN', true); }
    const enHijos = raiz.c || [];
    const iLab = enHijos.indexOf(lab);
    const icoAntes = enHijos.find((n, i) => n.k === 'ICO' && i < iLab);
    const icoDespues = enHijos.find((n, i) => n.k === 'ICO' && i > iLab);
    marcarIcono(icoAntes, 'Icono delante', 'Icono · delante', false);
    marcarIcono(icoDespues, 'Icono detrás', 'Icono · detrás', false);
  } else if (comp === 'Botón de icono') {
    marcarIcono(icos[0], null, 'Icono');
  } else if (comp === 'Insignia' || comp === 'Opción de segmentado') {
    marcarTexto(textos[0], 'Texto');
  } else if (comp === 'Chip') {
    marcarTexto(textos[0], 'Texto');
    marcarIcono(icos[0], 'Icono', 'Icono · cuál', true);
  } else if (comp === 'Campo de texto') {
    const lab = buscarNodo(o, (x) => tiene(x, 'aura-field__label'));
    const labTxt = lab ? (lab.tx ? lab.tx.map((r) => r.t).join('') : (lab.k || []).filter((h) => h.x).map(textoDe).join(' ')).trim() : null;
    marcarTexto(labTxt && porTexto(labTxt), 'Etiqueta');
    const hint = txt('aura-field__hint');
    if (hint) { marcarTexto(hint, 'Pista'); hint.pr.visible = 'Pista visible'; add('Pista visible', 'BOOLEAN', true); }
    marcarTexto(textos.find((t) => t.n === 'Texto'), 'Texto');
    const help = txt('aura-field__help');
    if (help) { marcarTexto(help, 'Ayuda'); help.pr.visible = 'Ayuda visible'; add('Ayuda visible', 'BOOLEAN', true); }
    marcarTexto(txt('aura-field__error'), 'Error');
    const fi = buscarNodo(o, (x) => x.ico && tiene(x, 'aura-field__icon'));
    if (fi) marcarIcono(icos.find((i) => i.i === fi.ico), 'Icono', 'Icono · cuál', true);
  } else if (comp === 'Casilla') {
    marcarTexto(txt('aura-check__label') || txt('aura-radio__label'), 'Etiqueta');
  } else if (comp === 'Nota') {
    marcarTexto(txt('aura-note__title'), 'Título'); marcarTexto(txt('aura-note__text'), 'Texto'); marcarIcono(icos[0], null, 'Icono');
  } else if (comp === 'Aviso') {
    marcarTexto(txt('aura-toast__title'), 'Título'); marcarTexto(txt('aura-toast__text'), 'Texto');
    const ac = txt('aura-toast__action');
    if (ac) { marcarTexto(ac, 'Acción'); }
    // La acción es un marco con el texto: la visibilidad va en el marco
    recorrer(raiz, (n) => { if (n !== raiz && n.k === 'F' && (n.c || []).includes(ac)) { n.pr = { visible: 'Acción visible' }; n.n = 'Acción'; add('Acción visible', 'BOOLEAN', true); } });
    if (ac && !props.find((p) => p.n === 'Acción visible')) { ac.pr.visible = 'Acción visible'; add('Acción visible', 'BOOLEAN', true); }
  } else if (comp === 'Alerta') {
    marcarTexto(txt('aura-alert__title'), 'Título'); marcarTexto(txt('aura-alert__text'), 'Texto');
  } else if (comp === 'Nota al pie') {
    const li = o;
    const t = textos.find((x) => x.n !== 'Marcador');
    marcarTexto(t, 'Texto');
    const mk = textos.find((x) => x.n === 'Marcador');
    if (mk) marcarTexto(mk, 'Número');
  } else if (comp === 'Tarjeta de producto') {
    const eb = buscarNodo(o, (x) => tiene(x, 'aura-eyebrow'));
    const ebT = eb && porTexto(textoDe(eb).trim());
    if (ebT) { marcarTexto(ebT, 'Antetítulo'); ebT.pr.visible = 'Antetítulo visible'; add('Antetítulo visible', 'BOOLEAN', true); }
    marcarTexto(txt('aura-product-card__name'), 'Nombre');
    marcarTexto(txt('aura-product-card__finish'), 'Acabado');
    marcarTexto(txt('aura-product-card__text'), 'Texto');
    const st = buscarNodo(o, (x) => tiene(x, 'aura-product-card__status'));
    if (st) {
      const stT = porTexto(textoDe(st).trim()) || textos.find((t) => t.runs.map((r) => r.t).join('').includes(textoDe(st).trim().slice(0, 12)));
      marcarTexto(stT, 'Disponibilidad');
      recorrer(raiz, (n) => { if (n !== raiz && n.k === 'F' && /status/.test(n.n || '')) { n.pr = { visible: 'Disponibilidad visible' }; n.n = 'Disponibilidad'; add('Disponibilidad visible', 'BOOLEAN', true); } });
    }
    marcarTexto(txt('aura-price'), 'Precio');
    const cuota = buscarNodo(o, (x) => tiene(x, 'aura-product-card__price'));
    const cuotaC = cuota && buscarNodo(cuota, (x) => tiene(x, 'aura-caption'));
    if (cuotaC) marcarTexto(porTexto(textoDe(cuotaC).trim()), 'Cuota');
    // Puntos de color: cinco ranuras (las que sobran, ocultas en la instancia)
    let i = 0;
    recorrer(raiz, (n) => { if (n.k === 'I' && n.comp === 'Muestra de color') { i++; n.n = 'Muestra ' + i; n.expuesta = 1; } });
    recorrer(raiz, (n) => {
      if (n.k === 'F' && /swatch list/.test(n.n || '')) {
        const plantilla = (n.c || []).find((h) => h.k === 'I');
        while (plantilla && n.c.filter((h) => h.k === 'I').length < 5) {
          const k = n.c.filter((h) => h.k === 'I').length + 1;
          n.c.push(Object.assign({}, plantilla, { n: 'Muestra ' + k, oculto: 1, ov: undefined }));
        }
      }
    });
    recorrer(raiz, (n) => { if (n.k === 'I' && n.comp === 'Botón') { n.n = 'Botón'; n.expuesta = 1; } });
    recorrer(raiz, (n) => { if (n.k === 'IMG') n.n = 'Foto'; });
  } else if (comp === 'Tarjeta de familia') {
    const body = buscarNodo(o, (x) => tiene(x, 'aura-family-card__body'));
    const eb = buscarNodo(body, (x) => tiene(x, 'aura-eyebrow')); if (eb) marcarTexto(porTexto(textoDe(eb).trim()), 'Familia');
    const h = buscarNodo(body, (x) => tiene(x, 'aura-h4')); if (h) marcarTexto(porTexto(textoDe(h).trim()), 'Lema');
    const tx = (body.k || []).find((x) => tiene(x, 'aura-caption')); if (tx) marcarTexto(porTexto(textoDe(tx).trim()), 'Texto');
    const foot = buscarNodo(body, (x) => tiene(x, 'aura-family-card__foot'));
    if (foot) {
      const pr = buscarNodo(foot, (x) => tiene(x, 'aura-caption')); if (pr) marcarTexto(porTexto(textoDe(pr).trim()), 'Precio');
    }
    recorrer(raiz, (n) => { if (n.k === 'I' && n.comp === 'Botón') { n.n = 'Enlace'; n.expuesta = 1; } });
    recorrer(raiz, (n) => { if (n.k === 'IMG') n.n = 'Foto'; });
  } else if (comp === 'Muestra de color') {
    // La capa «Color» es la que se cambia en cada instancia
    let punto = null;
    recorrer(raiz, (n) => { if (!punto && n !== raiz && n.k === 'F' && /dot/.test(n.n || '')) punto = n; });
    if (punto) punto.n = 'Color';
    else if (raiz.fi && !(raiz.c || []).length) {
      raiz.c = [{ k: 'F', n: 'Color', lm: 'N', x: 0, y: 0, w: raiz.w, h: raiz.h, fi: raiz.fi, r: raiz.r, fx: raiz.fx, fxs: raiz.fxs, cl: 0 }];
      delete raiz.fi; delete raiz.fx; delete raiz.fxs;
      if (raiz.lm !== 'H' && raiz.lm !== 'V') raiz.lm = 'N';
    }
  } else if (comp === 'Barra local') {
    const t = buscarNodo(o, (x) => tiene(x, 'aura-localnav__title'));
    if (t) marcarTexto(porTexto(textoDe(t).trim()), 'Título');
  }
  return props;
}

// Enlaza radios, rellenos, huecos y altos de los componentes a sus variables cuando el valor es de los tokens
const RADIOS = { 6: 'Radio/2XS', 8: 'Radio/XS', 12: 'Radio/SM', 16: 'Radio/MD', 20: 'Radio/LG', 28: 'Radio/XL', 999: 'Radio/Píldora' };
const ESCALA = new Set([2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 72, 80, 104, 120]);
const espacio = (n) => (ESCALA.has(n) ? 'Espaciado/Escala/' + n : undefined);
const ALTOS = { 'Botón': [48, 'Tamaño/Alto/Botón'], 'Botón de icono': [44, 'Tamaño/Alto/Botón de icono'], 'Opción de segmentado': [40, 'Tamaño/Alto/Segmentado ítem'], 'Barra global': [56, 'Tamaño/Alto/Barra global'], 'Barra local': [52, 'Tamaño/Alto/Barra local'] };
// Tokens propios de cada componente (Espaciado/Componente/… si el nombre no lleva grupo), por capa
// («raiz» o el nombre de la capa) y lado: t r b l, v (arriba y abajo), h (a los lados) y gap.
// Tienen prioridad sobre la escala general (Espaciado/Escala/…).
const MEDIDAS_COMPONENTE = {
  'Botón': [{ capa: 'raiz', v: { 8: 'Botón vertical' }, h: { 24: 'Botón horizontal' }, gap: { 8: 'Botón hueco' } }],
  'Campo de texto': [
    { capa: /^(input|select|textarea)$/, v: { 15: 'Campo vertical' }, h: { 16: 'Campo horizontal', 44: 'Campo con icono' } },
    { capa: 'raiz', gap: { 8: 'Campo hueco' } },
  ],
  'Insignia': [{ capa: 'raiz', v: { 4: 'Insignia vertical' }, h: { 10: 'Insignia horizontal' } }],
  'Chip': [{ capa: 'raiz', h: { 12: 'Chip horizontal' } }],
  'Segmentado': [{ capa: 'raiz', v: { 4: 'Segmentado marco' }, h: { 4: 'Segmentado marco' }, gap: { 2: 'Segmentado hueco' } }],
  'Opción de segmentado': [{ capa: 'raiz', h: { 18: 'Segmentado ítem' } }],
  'Tarjeta de producto': [{ capa: /body$/, v: { 24: 'Tarjeta de producto' }, h: { 24: 'Tarjeta de producto' }, gap: { 8: 'Tarjeta de producto hueco' } }],
  'Tarjeta de familia': [{ capa: /body$/, v: { 24: 'Tarjeta de producto' }, h: { 24: 'Tarjeta de producto' } }],
  'Pie': [
    { capa: 'raiz', t: { 64: 'Pie arriba', 40: 'Espaciado/Móvil/Pie arriba' }, b: { 32: 'Pie abajo' } },
    { capa: /^container$/, h: { 40: 'Espaciado/Margen lateral', 20: 'Espaciado/Móvil/Margen lateral' } },
  ],
  'Barra global': [{ capa: /^container$/, h: { 40: 'Espaciado/Margen lateral', 20: 'Espaciado/Móvil/Margen lateral' } }, { capa: /^nav · link$/, h: { 14: 'Enlace de barra' } }],
  'Barra local': [{ capa: /^container$/, h: { 40: 'Espaciado/Margen lateral', 20: 'Espaciado/Móvil/Margen lateral' } }, { capa: /^localnav · link$/, h: { 10: 'Enlace local' } }],
  'Cinta': [{ capa: /^container$/, h: { 40: 'Espaciado/Margen lateral', 20: 'Espaciado/Móvil/Margen lateral' } }],
};
const nombreEspaciado = (n) => (n.startsWith('Espaciado/') ? n : 'Espaciado/Componente/' + n);
// Ruido de la captura (densidad 1,25 y bordes restados: 9,8 · 15,8 · 63,8…): al entero si está a ≤ 0,25
const redondo = (x) => (Math.abs(x - Math.round(x)) <= 0.25 ? Math.round(x) : x);
function enlazarMedidasComponente(raiz, comp, v) {
  const reglas = MEDIDAS_COMPONENTE[comp] || [];
  const LADOS = ['t', 'r', 'b', 'l'];
  const rec = (n) => {
    if (n.k === 'F') {
      const auto = n.lm === 'H' || n.lm === 'V';
      // Un círculo (radio = mitad del lado) no se enlaza a un radio de la escala: si cambiara el token,
      // dejaría de ser un círculo
      const circulo = typeof n.r === 'number' && n.r !== 999 && Math.abs(n.r * 2 - Math.min(n.w || 0, n.h || 0)) < 0.6;
      if (typeof n.r === 'number' && RADIOS[n.r] && !circulo && !n.vr) n.vr = RADIOS[n.r];
      if (auto && n.pad) n.pad = n.pad.map(redondo);
      if (auto && n.gap) n.gap = redondo(n.gap);
      const propias = reglas.filter((r) => (r.capa === 'raiz' ? n === raiz : r.capa instanceof RegExp && r.capa.test(n.n || '')));
      const token = (lado, valor) => {
        for (const r of propias) {
          const m = r[lado] || (lado === 't' || lado === 'b' ? r.v : r.h);
          if (m && m[valor]) return nombreEspaciado(m[valor]);
        }
        return undefined;
      };
      if (auto && n.pad && !n.vp) {
        const vp = n.pad.map((x, i) => token(LADOS[i], x) || espacio(x) || null);
        if (vp.some(Boolean)) n.vp = vp;
      }
      if (auto && n.gap && n.pa !== 'SPACE_BETWEEN' && !n.vg) {
        const propio = propias.map((r) => r.gap && r.gap[n.gap]).find(Boolean);
        const vg = propio ? nombreEspaciado(propio) : espacio(n.gap);
        if (vg) n.vg = vg;
      }
      if (comp === 'Campo de texto' && n.n === 'Texto' && n.sh === 'F' && Math.abs(n.h - 56) < 0.5) n.vh = 'Tamaño/Alto/Campo';
      if (comp === 'Campo de texto' && /^(input|select)$/.test(n.n || '') && Math.abs(n.h - 56) < 0.5) n.vh = 'Tamaño/Alto/Campo';
      // Una medida enlazada es una medida fija (abrazar el contenido rompería el enlace)
      if (n.vh) n.sh = 'F';
      if (n.vw) n.sw = 'F';
    }
    (n.c || []).forEach(rec);
  };
  rec(raiz);
  let alto = ALTOS[comp];
  if (comp === 'Chip') alto = v && v.Tipo === 'Pulsable' ? [36, 'Tamaño/Alto/Chip pulsable'] : [28, 'Tamaño/Alto/Chip'];
  if (comp === 'Botón' && v && v.Tipo === 'Enlace') alto = null;
  if (alto && Math.abs(raiz.h - alto[0]) < 0.5) { raiz.vh = alto[1]; raiz.sh = 'F'; if (comp === 'Botón de icono') { raiz.vw = 'Tamaño/Alto/Botón de icono'; raiz.sw = 'F'; } }
}

// Caja de un icono (botón de icono, cerrar, mostrar contraseña, icono de nota…): si el relleno capturado
// no da su medida al abrazar (la web centra el icono en una caja fija), la caja es fija y lo centra
function cajasDeIcono(n) {
  (n.c || []).forEach(cajasDeIcono);
  if (n.k !== 'F' || !(n.lm === 'H' || n.lm === 'V')) return;
  const flujo = (n.c || []).filter((h) => !h.ab);
  if (flujo.length !== 1 || flujo[0].k !== 'ICO') return;
  const ico = flujo[0], pad = n.pad || [0, 0, 0, 0];
  const bordes = n.sil && typeof n.bw === 'number' ? 2 * n.bw : 0;
  const altoAbrazado = pad[0] + pad[2] + ico.s + bordes, anchoAbrazado = pad[1] + pad[3] + ico.s + bordes;
  const cuadraAlto = n.sh !== 'H' || Math.abs(altoAbrazado - n.h) < 0.6;
  const cuadraAncho = n.sw !== 'H' || Math.abs(anchoAbrazado - n.w) < 0.6;
  const enteros = pad.every((p) => Math.abs(p - Math.round(p)) < 0.05);
  if (cuadraAlto && cuadraAncho && enteros) return;
  n.pad = [0, 0, 0, 0]; delete n.vp;
  n.gap = 0; delete n.vg;
  n.pa = 'CENTER'; n.ca = 'CENTER';
  if (n.sw !== 'L') n.sw = 'F';
  if (n.sh !== 'L') n.sh = 'F';
}

// ---- Arreglos de estructura de algunos componentes (lo que la captura de una rejilla CSS no da) ----
function rehacerComponente(nombre, raiz, v) {
  if (nombre === 'Nota') rehacerNota(raiz);
  else if (nombre === 'Alerta') rehacerAlerta(raiz);
  else if (nombre === 'Barra global' || nombre === 'Barra local') repartirBarra(nombre, raiz, v || {});
  else if (nombre === 'Muestra de color') sacarAnillos(raiz);
  const tam = v && v['Tamaño'];
  if (tam === 'Teléfono') anchoTelefono(raiz);
  if (tam === 'Escritorio' && Math.abs(raiz.w - 1440) < 0.5) { raiz.w = 1440; raiz.vw = 'Tamaño/Punto de corte/Escritorio'; }
}

const sinPosicion = (n) => { delete n.x; delete n.y; delete n.ab; delete n.cn; return n; };

// Nota (rejilla icono | título + texto): auto layout horizontal con el icono en su caja de 36 px y una
// columna vertical; rellenos 18 / 20 y huecos 16 y 4 de aura.css
function rehacerNota(raiz) {
  const hijos = raiz.c || [];
  const caja = hijos.find((n) => n.k === 'F' && /icon/.test(n.n || ''));
  const titulo = hijos.find((n) => n.k === 'T' && n.n === 'Título');
  const texto = hijos.find((n) => n.k === 'T' && n.n === 'Texto');
  if (!caja || !titulo || !texto) { console.warn('  · Nota: estructura inesperada, se deja como está'); return; }
  [caja, titulo, texto].forEach(sinPosicion);
  const bw = typeof raiz.bw === 'number' ? raiz.bw : 0;
  Object.assign(caja, { lm: 'H', w: 36, h: 36, sw: 'F', sh: 'F', pad: [0, 0, 0, 0], gap: 0, pa: 'CENTER', ca: 'CENTER', vw: 'Tamaño/Contenedor/Nota', vh: 'Tamaño/Contenedor/Nota' });
  delete caja.vp; delete caja.vg;
  const ancho = r2(raiz.w - 2 * bw - 40 - 36 - 16);
  Object.assign(titulo, { sw: 'F', sl: 1, w: ancho });
  Object.assign(texto, { sw: 'F', sl: 1, w: ancho });
  const columna = { k: 'F', n: 'Contenido', lm: 'V', w: ancho, h: r2(titulo.h + 4 + texto.h), sw: 'L', sh: 'H', gap: 4, pad: [0, 0, 0, 0], pa: 'MIN', ca: 'MIN', c: [titulo, texto] };
  Object.assign(raiz, {
    lm: 'H', sw: 'F', sh: 'H', pad: [18, 20, 18, 20], sil: 1, gap: 16, pa: 'MIN', ca: 'MIN', c: [caja, columna],
    vp: ['Espaciado/Componente/Nota vertical', 'Espaciado/Componente/Nota horizontal', 'Espaciado/Componente/Nota vertical', 'Espaciado/Componente/Nota horizontal'],
  });
}

// Mensaje (rejilla icono | título + texto): icono de 16 px en su línea (1,3 × 16) con 2 px arriba, y la
// columna; rellenos 14 / 16 y huecos 12 y 2 de aura.css
function rehacerAlerta(raiz) {
  const hijos = raiz.c || [];
  const ico = hijos.find((n) => n.k === 'ICO');
  const titulo = hijos.find((n) => n.k === 'T' && n.n === 'Título');
  const texto = hijos.find((n) => n.k === 'T' && n.n === 'Texto');
  if (!ico || !titulo || !texto) { console.warn('  · Alerta: estructura inesperada, se deja como está'); return; }
  [ico, titulo, texto].forEach(sinPosicion);
  const bw = typeof raiz.bw === 'number' ? raiz.bw : 0;
  const caja = { k: 'F', n: 'Icono', lm: 'V', w: ico.s, h: r2(2 + 1.3 * ico.s), sw: 'H', sh: 'F', pad: [2, 0, 0, 0], gap: 0, pa: 'CENTER', ca: 'CENTER', c: [ico] };
  const ancho = r2(raiz.w - 2 * bw - 32 - ico.s - 12);
  Object.assign(titulo, { sw: 'F', sl: 1, w: ancho });
  Object.assign(texto, { sw: 'F', sl: 1, w: ancho });
  const columna = { k: 'F', n: 'Contenido', lm: 'V', w: ancho, h: r2(titulo.h + 2 + texto.h), sw: 'L', sh: 'H', gap: 2, pad: [0, 0, 0, 0], pa: 'MIN', ca: 'MIN', c: [titulo, texto] };
  Object.assign(raiz, {
    lm: 'H', sw: 'F', sh: 'H', pad: [14, 16, 14, 16], sil: 1, gap: 12, pa: 'MIN', ca: 'MIN', c: [caja, columna],
    vp: ['Espaciado/Componente/Mensaje vertical', 'Espaciado/Componente/Mensaje horizontal', 'Espaciado/Componente/Mensaje vertical', 'Espaciado/Componente/Mensaje horizontal'],
  });
}

// Barras: reparto flexible en lugar de huecos y rellenos medidos. Global de escritorio = rejilla
// 1fr · auto · 1fr de la web (marca y acciones llenan a partes iguales y los enlaces quedan centrados);
// en el teléfono, las acciones llenan y van a la derecha. Local: los enlaces llenan y van a la derecha
// (margin-left: auto en la web); en el teléfono, un «Espacio» que llena.
function repartirBarra(nombre, raiz, v) {
  const cont = (raiz.c || []).find((n) => n.n === 'container');
  if (!cont || !cont.c) return;
  const telefono = v['Tamaño'] === 'Teléfono';
  if (nombre === 'Barra global') {
    cont.c = cont.c.filter((n) => n.n !== 'Espacio');
    const marca = cont.c.find((n) => n.n === 'brand');
    const acciones = cont.c.find((n) => /actions$/.test(n.n || ''));
    if (marca && !telefono) { marca.sw = 'L'; marca.pa = 'MIN'; }
    if (acciones) { acciones.sw = 'L'; acciones.pa = 'MAX'; }
    cont.pa = 'MIN';
    cont.gap = telefono ? 8 : 16;
    delete cont.vg;
  } else {
    const enlaces = cont.c.find((n) => /links$/.test(n.n || ''));
    if (enlaces) { enlaces.pad = [0, 0, 0, 0]; delete enlaces.vp; enlaces.sw = 'L'; enlaces.pa = 'MAX'; }
    cont.c.filter((n) => n.n === 'Espacio').forEach((n) => { n.sw = 'L'; n.w = 1; });
  }
}

// Muestra de color: el anillo de «Elegida» y de «Foco» sale de la capa «Color» a la raíz, para que
// «Color» pueda recortar su contenido (Figma solo pinta la sombra con extensión —spread— así)
function sacarAnillos(raiz) {
  const color = (raiz.c || []).find((n) => n.n === 'Color');
  if (!color || !(color.c || []).length || raiz.lm !== 'V') return;
  const pad = raiz.pad || [0, 0, 0, 0];
  const cx = raiz.ca === 'CENTER' ? (raiz.w - color.w) / 2 : pad[3];
  const cy = pad[0];
  const fuera = color.c.filter((h) => h.ab && ((h.x || 0) < -0.5 || (h.y || 0) < -0.5 || (h.x || 0) + (h.w || 0) > color.w + 0.5 || (h.y || 0) + (h.h || 0) > color.h + 0.5));
  if (!fuera.length) return;
  color.c = color.c.filter((h) => !fuera.includes(h));
  fuera.forEach((h) => { h.x = r2(cx + (h.x || 0)); h.y = r2(cy + (h.y || 0)); h.cn = ['CENTER', 'CENTER']; raiz.c.push(h); });
}

// Variantes «Teléfono»: 390 px exactos (la captura daba 390,4 por el redondeo de la densidad 1,25)
function anchoTelefono(raiz) {
  const rec = (n) => {
    if (typeof n.w === 'number' && n.w >= 300 && Math.abs((n.w % 1) - 0.4) < 0.05) n.w = Math.round(n.w - 0.4);
    (n.c || []).forEach(rec);
  };
  rec(raiz);
  raiz.w = 390;
  raiz.vw = 'Tamaño/Punto de corte/Teléfono';
}

function compilarComponentes() {
  const grupos = new Map();
  const entradas = CAPTURA_COMP.variantes.concat(...PIEZAS.map((p) => p.variantes));
  for (const e of entradas) {
    if (!grupos.has(e.comp)) grupos.set(e.comp, []);
    grupos.get(e.comp).push(e);
    VARIANTES_EXISTENTES.add(claveVariante(e.comp, e.v));
  }
  // Maestros tomados de la guía: tarjetas de producto y de familia
  const todos = CAPTURA_GUIA.partes.flatMap((p) => p.nodos);
  const tarjeta = buscarNodo({ k: todos }, (x) => tiene(x, 'aura-product-card'));
  const familia = buscarNodo({ k: todos }, (x) => tiene(x, 'aura-family-card'));
  if (tarjeta) { MAESTRAS['Tarjeta de producto'] = tarjeta; grupos.set('Tarjeta de producto', [{ comp: 'Tarjeta de producto', v: null, nodo: tarjeta }]); VARIANTES_EXISTENTES.add(claveVariante('Tarjeta de producto', null)); }
  if (familia) { MAESTRAS['Tarjeta de familia'] = familia; grupos.set('Tarjeta de familia', [{ comp: 'Tarjeta de familia', v: null, nodo: familia }]); VARIANTES_EXISTENTES.add(claveVariante('Tarjeta de familia', null)); }

  const ORDEN = ['Botón', 'Botón de icono', 'Insignia', 'Chip', 'Campo de texto', 'Casilla', 'Muestra de color', 'Opción de segmentado', 'Segmentado', 'Nota', 'Aviso', 'Alerta', 'Nota al pie', 'Tarjeta de producto', 'Tarjeta de familia', 'Barra global', 'Cinta', 'Barra local', 'Pie'];
  const res = [];
  for (const nombre of ORDEN) {
    const lista = grupos.get(nombre);
    if (!lista) continue;
    const def = DEFINICION[nombre] || {};
    const variantes = [];
    let props = [];
    for (const e of lista) {
      const ctx = { comp: nombre, v: e.v || null, prefs: def.prefs || [], clases: [], raiz: true };
      if (nombre === 'Nota al pie') ctx.enNotasAlPie = false;
      let raiz = compilar(e.nodo, ctx);
      if (!raiz) continue;
      if (raiz.k !== 'F') raiz = { k: 'F', n: nombre, lm: 'H', w: raiz.w, h: raiz.h, sw: 'H', sh: 'H', pad: [0, 0, 0, 0], gap: 0, c: [raiz] };
      // Medidas en origen (el componente empieza en 0, 0)
      raiz.x = 0; raiz.y = 0; delete raiz.ab;
      // «Pulsado»: en la web es transform: scale(), que no cambia la caja. En Figma se queda con las
      // medidas (y los enlaces a tokens) de «Normal» y la escala va en la descripción de la variante.
      const tr = e.nodo.s && e.nodo.s.tr;
      const m = tr && /matrix\(([\d.]+), 0, 0, ([\d.]+)/.exec(tr);
      const nota = m && Math.abs(+m[1] - 1) > 0.001
        ? 'Pulsado: en la web, escala ' + String(+m[1]).replace('.', ',') + ' (transform: scale(' + +m[1] + ')) al instante en pointerdown; la caja no cambia, así que aquí tiene las mismas medidas que Normal. Valor en Movimiento/Escala de pulsación/….'
        : '';
      const ps = marcarPropiedades(nombre, raiz, e.nodo);
      rehacerComponente(nombre, raiz, e.v);
      cajasDeIcono(raiz);
      enlazarMedidasComponente(raiz, nombre, e.v);
      ps.forEach((p) => { if (!props.find((q) => q.n === p.n)) props.push(p); });
      raiz.n = e.v ? Object.entries(e.v).map(([k, v]) => k + '=' + v).join(', ') : nombre;
      variantes.push(nota ? { v: e.v, raiz, d: nota } : { v: e.v, raiz });
    }
    // Una propiedad de texto se queda con el valor de la primera variante que la tiene
    res.push({ n: nombre, d: def.d || '', orden: def.orden || null, variantes, props });
  }
  return res;
}

// -----------------------------------------------------------------------------
// 7. Capítulos de la guía
// -----------------------------------------------------------------------------
function compilarGuia() {
  const capitulos = [];
  for (const parte of CAPTURA_GUIA.partes) {
    const ctx = { prefs: [], clases: [], raiz: true };
    let raiz;
    if (parte.nodos.length === 1) {
      raiz = compilar(parte.nodos[0], ctx);
    } else {
      const hijos = parte.nodos.map((n) => ({ n: compilar(n, ctx), b: caja(n) })).filter((h) => h.n);
      const y0 = Math.min(...hijos.map((h) => h.b.y)), y1 = Math.max(...hijos.map((h) => h.b.y + h.b.h));
      raiz = { k: 'F', n: parte.nombre, lm: 'V', w: 1440, h: r2(y1 - y0), fi: [pintura([0, 0, 0, 1], 'fondo')] };
      organizar(raiz, hijos, 'V', { x: 0, y: y0, w: 1440, h: y1 - y0 }, { gapCSS: 0, jc: 'normal', ai: 'normal', ctx, esFlex: false });
      raiz.pad = [0, 0, 0, 0];
    }
    if (!raiz) continue;
    cajasDeIcono(raiz);
    raiz.n = parte.id === 'portada' ? 'Portada' : parte.id === 'pie' ? 'Cierre' : parte.nombre;
    raiz.w = 1440; raiz.sw = 'F'; raiz.sh = 'H'; raiz.x = 0; raiz.y = 0;
    if (!raiz.fi || !raiz.fi.length) raiz.fi = [pintura([0, 0, 0, 1], 'fondo')];
    raiz.cl = 1;
    if (parte.id === 'portada') raiz.c.push(bandaLogotipo());
    capitulos.push({ id: parte.id, n: raiz.n, raiz });
  }
  return capitulos;
}

// Franja de la portada con el logotipo real del sitio (img/aura.png, cargado de producción)
function bandaLogotipo() {
  const texto = (t, st, cls) => nodoTexto([{ t, st }], { clases: [cls] }, { medida: { w: 600, h: st.lh }, contenedor: { w: 600, h: st.lh }, ajustar: true });
  const gris = [161, 161, 166, 1], tenue = [142, 142, 147, 1];
  return {
    k: 'F', n: 'Logotipo', lm: 'H', w: 1440, h: 200, sw: 'L', sh: 'H', gap: 32, pad: [56, 72, 56, 72], ca: 'CENTER',
    fi: [pintura([0, 0, 0, 1], 'fondo')], st: [{ c: [45, 45, 49, 1] }], bw: [1, 0, 0, 0],
    c: [
      { k: 'IMG', n: 'Logotipo AURA', src: claveImagen('/img/aura.png'), w: 88, h: 88, fit: 'FIT' },
      { k: 'F', n: 'Marca', lm: 'V', w: 700, h: 88, sw: 'H', sh: 'H', gap: 8, pad: [0, 0, 0, 0], c: [
        texto('AURA', { ff: 'Kanit', fs: 36, fw: 600, co: [245, 245, 247, 1], lh: 36, ls: 2.16 }, 'aura-brand__word'),
        texto('Logotipo del sitio · img/aura.png (512 × 512) · en la barra y el pie: img/aura-72.png', { ff: 'Inter', fs: 15, fw: 400, co: gris, lh: 22.05 }, 'g-aside__desc'),
        texto('Se carga de ' + SITIO + ' al ejecutar el plugin', { ff: 'mono', fs: 11, fw: 400, co: tenue, lh: 17.6, ls: 0.66, tt: 'uppercase' }, 'g-sub__meta'),
      ] },
    ],
  };
}

// Anexo del capítulo 14: todas las fotos reales por acabado (de los tokens)
function compilarAnexoFotos() {
  const tarjetas = [];
  const vistos = new Set();
  recorrerTokens(TOKENS.Color.Acabado, (ruta, t) => {
    const e = extAura(t);
    const fotos = e.fotos || [];
    const [producto, acabado] = ruta;
    const clave = fotos.map((f) => f.archivo).join('|') + '|' + acabado;
    const repetida = vistos.has(clave);
    if (repetida) { const t0 = tarjetas.find((t) => t._clave === clave); if (t0) t0._productos.push(producto); return; }
    vistos.add(clave);
    const hex = t.$value.hex;
    const fotosNodos = fotos.slice(0, 3).map((f, i) => ({ k: 'IMG', n: 'Foto · ' + f.vista, src: claveImagen(f.archivo), w: i === 0 ? 300 : 146, h: i === 0 ? 225 : 109.5, fit: 'FIT', bm: 'LIGHTEN' }));
    const media = { k: 'F', n: 'Fotos', lm: 'V', w: 300, h: 340, sw: 'F', sh: 'H', gap: 8, pad: [0, 0, 0, 0], c: [
      { k: 'F', n: 'Principal', lm: 'N', w: 300, h: 225, sw: 'F', sh: 'F', r: 12, cl: 1, fi: [pintura([0, 0, 0, 1], 'fondo'), { g: 'R', m: [[0.714, 0, 0.143], [0, 0.833, -0.017]], s: [[0, 0, 113, 227, 0.16], [0.7, 0, 113, 227, 0]] }], c: fotosNodos[0] ? [Object.assign(fotosNodos[0], { x: 0, y: 0 })] : [] },
      { k: 'F', n: 'Otras vistas', lm: 'H', w: 300, h: 109.5, sw: 'F', sh: 'H', gap: 8, pad: [0, 0, 0, 0], c: fotosNodos.slice(1).map((n) => ({ k: 'F', n: 'Vista', lm: 'N', w: 146, h: 109.5, sw: 'F', sh: 'F', r: 8, cl: 1, fi: [pintura([10, 10, 11, 1], 'fondo')], c: [Object.assign(n, { x: 0, y: 0 })] })) },
    ] };
    const muestra = { k: 'I', comp: 'Muestra de color', v: { 'Tamaño': 'Punto', Estado: 'Normal' }, w: 12, h: 12, ov: [{ n: 'Color', fi: { v: 'Color/Acabado/' + producto + '/' + acabado } }] };
    const st = (txt, fs, fw, col, ff = 'Inter', extra = {}) => [{ t: txt, st: Object.assign({ ff, fs, fw, co: col, lh: Math.round(fs * 1.4 * 100) / 100 }, extra) }];
    const textos = { k: 'F', n: 'Datos', lm: 'V', w: 300, h: 80, sw: 'F', sh: 'H', gap: 6, pad: [0, 0, 0, 0], c: [
      { k: 'F', n: 'Nombre', lm: 'H', w: 300, h: 20, sw: 'F', sh: 'H', gap: 8, ca: 'CENTER', pad: [0, 0, 0, 0], c: [muestra, nodoTexto(st(acabado, 15, 500, [245, 245, 247, 1]), { clases: ['g-card__title'] }, { medida: { w: 200, h: 21 }, contenedor: { w: 200, h: 21 }, ajustar: true })] },
      nodoTexto(st(producto, 13, 400, [161, 161, 166, 1]), { clases: ['g-card__text'] }, { medida: { w: 300, h: 18 }, contenedor: { w: 300, h: 18 }, ajustar: true }),
      nodoTexto(st(hex + (e.porDefecto ? ' · por defecto' : '') + (fotos.length ? '' : ' · sin foto propia'), 11, 400, [229, 169, 60, 1], 'mono', { ls: 0.66, tt: 'uppercase' }), { clases: ['g-sub__meta'] }, { medida: { w: 300, h: 17 }, contenedor: { w: 300, h: 17 }, ajustar: true }),
    ] };
    tarjetas.push({ _clave: clave, _productos: [producto], _textoProducto: textos.c[1], k: 'F', n: producto + ' · ' + acabado, lm: 'V', w: 332, h: 470, sw: 'F', sh: 'H', gap: 16, pad: [16, 16, 20, 16], r: 12, fi: [pintura([22, 22, 23, 1], 'fondo')], st: [{ c: [45, 45, 49, 1] }], bw: 1, c: [media, textos] });
  });
  tarjetas.forEach((t) => {
    if (t._productos.length > 1) { t._textoProducto.runs[0].t = t._productos.join(' · '); t.n = t._productos.join(' · ') + ' · ' + t.n.split(' · ').pop(); }
    delete t._clave; delete t._productos; delete t._textoProducto;
  });
  const filas = [];
  for (let i = 0; i < tarjetas.length; i += 4) filas.push({ k: 'F', n: 'Fila', lm: 'H', w: 1376, h: 470, sw: 'F', sh: 'H', gap: 16, pad: [0, 0, 0, 0], c: tarjetas.slice(i, i + 4) });
  const titulo = (txt, fs, fw, col, ff, extra) => nodoTexto([{ t: txt, st: Object.assign({ ff, fs, fw, co: col, lh: Math.round(fs * 1.2 * 100) / 100 }, extra || {}) }], { clases: extra && extra.cls ? [extra.cls] : [] }, { medida: { w: 1000, h: fs * 1.2 }, contenedor: { w: 1000, h: fs * 1.2 }, ajustar: true });
  return {
    id: 'anexo-fotos', n: '14 · Anexo · Todas las fotos por acabado',
    raiz: { k: 'F', n: '14 · Anexo · Todas las fotos por acabado', lm: 'V', w: 1440, h: 4000, sw: 'F', sh: 'H', gap: 24, pad: [90, 32, 88, 32], fi: [pintura([11, 11, 13, 1], 'fondo')], cl: 1, x: 0, y: 0, c: [
      titulo('14 · Anexo', 12, 400, [229, 169, 60, 1], 'mono', { cls: 'g-index' }),
      titulo('Todas las fotos reales, por acabado', 42, 500, [245, 245, 247, 1], 'Kanit', { cls: 'g-statement', ls: -0.34 }),
      nodoTexto([{ t: 'Cada acabado de data.js con sus vistas (la primera es la de la tarjeta, la bolsa y el checkout), su muestra enlazada a la variable Color/Acabado/… y su valor. Fotos cargadas de producción (' + SITIO + ').', st: { ff: 'Inter', fs: 15, fw: 400, co: [161, 161, 166, 1], lh: 24 } }], { clases: ['g-intro'] }, { medida: { w: 736, h: 48 }, contenedor: { w: 736, h: 48 }, lineas: 2 }),
    ].concat(filas) },
  };
}

// -----------------------------------------------------------------------------
// 8. Montaje de code.js
// -----------------------------------------------------------------------------
function construir() {
  const t0 = Date.now();
  const componentes = compilarComponentes();
  const capitulos = compilarGuia();
  const anexo = compilarAnexoFotos();
  const i14 = capitulos.findIndex((c) => c.id === 'imagen');
  capitulos.splice(i14 >= 0 ? i14 + 1 : capitulos.length, 0, anexo);
  const iconos = {};
  [...ICONOS_USADOS].sort().forEach((n) => { if (ICONOS[n]) iconos[n] = ICONOS[n]; });
  Object.keys(ICONOS).filter((k) => k !== '_licencia').forEach((n) => { iconos[n] = ICONOS[n]; });

  const DATOS = {
    version: '2.0',
    generado: new Date().toISOString().slice(0, 10),
    sitio: SITIO,
    fuentes: [...FUENTES].sort(),
    variables: VARIABLES,
    estilosColor: ESTILOS_COLOR,
    estilosTexto: ESTILOS_TEXTO.map((e) => { const r = Object.assign({}, e); Object.keys(r).filter((k) => k.startsWith('_')).forEach((k) => delete r[k]); return r; }),
    estilosGuia: [...ESTILOS_GUIA.values()],
    estilosEfecto: ESTILOS_EFECTO,
    reticulas: ESTILOS_RETICULA,
    iconos,
    licenciaIconos: ICONOS._licencia,
    imagenes: IMAGENES,
    componentes,
    capitulos,
  };
  const fuente = fs.readFileSync(path.join(AQUI, 'plugin/src/plugin.js'), 'utf8');
  // Los trazados de Bootstrap Icons van en DATOS.iconos: la licencia MIT pide copiar su aviso completo
  const licencia = fs.readFileSync(path.join(AQUI, 'LICENSE-bootstrap-icons.txt'), 'utf8').trim().split(/\r?\n/).map((l) => ('//   ' + l).trimEnd()).join('\n');
  const cabecera = '// AURA — Guía de estilo para Figma. ARCHIVO GENERADO por guia-de-estilo/figma/build.mjs:\n'
    + '// no lo edites a mano; cambia plugin/src/plugin.js (código) o los tokens / capturas (datos) y vuelve a construir.\n'
    + '// Iconos: ' + ICONOS._licencia + '. Su licencia (también en guia-de-estilo/figma/LICENSE-bootstrap-icons.txt):\n'
    + licencia + '\n';
  const datos = '/* eslint-disable */\n// prettier-ignore\n/** @type {DatosAURA} */\nconst DATOS = ' + JSON.stringify(DATOS) + ';\n\n';
  const salida = fuente.replace('/*@@DATOS@@*/', () => datos);
  if (salida === fuente) throw new Error('plugin/src/plugin.js no tiene la marca /*@@DATOS@@*/');
  fs.writeFileSync(path.join(AQUI, 'plugin/code.js'), cabecera + salida);
  const kb = Math.round(Buffer.byteLength(cabecera + salida) / 1024);
  const contar = (n) => 1 + (n.c || []).reduce((a, h) => a + contar(h), 0);
  console.log('plugin/code.js · ' + kb + ' KB · ' + (Date.now() - t0) + ' ms');
  console.log('  variables ' + VARIABLES.length + ' · estilos de color ' + ESTILOS_COLOR.length + ' · de texto ' + ESTILOS_TEXTO.length + ' (+ ' + ESTILOS_GUIA.size + ' de la guía) · de efecto ' + ESTILOS_EFECTO.length + ' · retículas ' + ESTILOS_RETICULA.length);
  console.log('  componentes ' + componentes.length + ' (' + componentes.reduce((a, c) => a + c.variantes.length, 0) + ' variantes) · capítulos ' + capitulos.length + ' · nodos ' + capitulos.reduce((a, c) => a + contar(c.raiz), 0) + ' · imágenes ' + Object.keys(IMAGENES).length + ' · iconos ' + Object.keys(iconos).length);
  console.log('  colores enlazados a variables ' + coloresEnlazados + ' · sueltos ' + coloresSueltos);
  if (ARGS.has('--informe')) {
    const sinStyle = []; const rec = (n) => { if (n.k === 'T' && !n.ts) sinStyle.push(n.runs.map((r) => r.t).join('').slice(0, 40)); (n.c || []).forEach(rec); };
    capitulos.forEach((c) => rec(c.raiz));
    console.log('  textos sin estilo: ' + sinStyle.length);
    console.log(componentes.map((c) => '  · ' + c.n + ': ' + c.variantes.length + ' variantes · props ' + c.props.map((p) => p.n + ':' + p.t).join(', ')).join('\n'));
  }
  return DATOS;
}

// -----------------------------------------------------------------------------
// 9. Copias ligeras de las imágenes (JPG / PNG) para figma.createImageAsync
// -----------------------------------------------------------------------------
async function copiarImagenes() {
  let sharp;
  try {
    const req = createRequire(process.env.SHARP_DESDE ? path.resolve(process.env.SHARP_DESDE) + '/' : import.meta.url);
    sharp = req('sharp');
  } catch (e) {
    console.log('Para las copias de imágenes hace falta «sharp»: npm i sharp (o SHARP_DESDE=<carpeta con node_modules>).');
    return;
  }
  let n = 0, bytes = 0;
  for (const [clave, im] of Object.entries(IMAGENES)) {
    const destino = path.join(AQUI, 'img', clave + (/\.png$/i.test(im.orig) ? '.png' : '.jpg'));
    // Fuente: la foto grande (1600 px) si existe, aunque la guía pinte la de 400 u 800
    const grande = path.join(REPO, im.orig.replace(/^img\/(400|800)\//, 'img/'));
    const original = fs.existsSync(grande) ? grande : path.join(REPO, im.orig);
    if (!fs.existsSync(original)) { console.warn('  · falta ' + im.orig); continue; }
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    let img = sharp(original);
    const meta = await img.metadata();
    const ancho = /^og\//.test(clave) ? 1200 : /^seq\//.test(clave) ? 960 : 800;
    if (meta.width > ancho) img = img.resize({ width: ancho });
    if (/\.png$/i.test(im.orig)) await img.png({ compressionLevel: 9 }).toFile(destino);
    else await img.flatten({ background: '#000000' }).jpeg({ quality: 80, mozjpeg: true }).toFile(destino);
    const m2 = await sharp(destino).metadata();
    im.w = m2.width; im.h = m2.height;
    bytes += fs.statSync(destino).size; n++;
  }
  console.log('img/: ' + n + ' copias · ' + Math.round(bytes / 1024) + ' KB');
}

construir();
if (ARGS.has('--imagenes')) await copiarImagenes();
