// @ts-check
// =============================================================================
// AURA — Guía de estilo · plugin de Figma (código escrito a mano)
// -----------------------------------------------------------------------------
// Crea en el archivo abierto:
//   1. La colección de variables «AURA» (modo «Oscuro») con colores, medidas,
//      tipografía y movimiento, con sus alias.
//   2. Estilos locales de color, texto, efecto y retícula enlazados a ellas.
//   3. Una página «Componentes» con los iconos y los componentes con variantes.
//   4. Una página «Guía de estilo AURA» con un marco de 1440 px por capítulo.
// Los datos (tokens, capturas de la guía y de los componentes, iconos) los
// inserta build.mjs en la constante DATOS: este archivo no se ejecuta solo.
// JavaScript sin compilar ni módulos (ES2017), como lo acepta Figma.
// =============================================================================

/*@@DATOS@@*/

/**
 * @typedef {{ v?: string, c?: number[], g?: 'L'|'R', m?: number[][], s?: number[][] }} PinturaLIR
 * @typedef {{ t: 'D'|'I'|'B', x?: number, y?: number, b?: number, s?: number, r?: number, c?: PinturaLIR, v?: string }} EfectoLIR
 * @typedef {{ t: string, f: string, s: number, lh: number, ls: number, co?: PinturaLIR, tt?: string, td?: string }} TramoLIR
 * @typedef {Object} NodoLIR
 * @property {string} k                 Tipo: F, T, I, IMG, ICO, SVG, E
 * @property {string} [n]               Nombre de la capa
 * @property {number} [w]
 * @property {number} [h]
 * @property {number} [x]
 * @property {number} [y]
 * @property {number} [ab]              Posición absoluta dentro de un auto layout
 * @property {string} [sw]              Ancho: F fijo, H abrazar, L llenar
 * @property {string} [sh]              Alto: F fijo, H abrazar, L llenar
 * @property {number} [sl]              Texto que llena el ancho
 * @property {string} [lm]              H, V o N (sin auto layout)
 * @property {number[]} [pad]
 * @property {number} [gap]
 * @property {string} [pa]
 * @property {string} [ca]
 * @property {PinturaLIR[]} [fi]
 * @property {PinturaLIR[]} [st]
 * @property {number|number[]} [bw]
 * @property {number} [bd]
 * @property {number} [sil]
 * @property {number|number[]} [r]
 * @property {EfectoLIR[]} [fx]
 * @property {string} [fxs]
 * @property {number} [op]
 * @property {number} [cl]
 * @property {string} [bm]
 * @property {NodoLIR[]} [c]
 * @property {TramoLIR[]} [runs]
 * @property {string} [ts]
 * @property {string} [ta]
 * @property {string} [comp]
 * @property {Object<string,string>} [v]
 * @property {Object<string,any>} [p]
 * @property {Array<any>} [ov]
 * @property {string} [src]
 * @property {string} [fit]
 * @property {string} [i]
 * @property {number} [s]
 * @property {PinturaLIR} [co]
 * @property {string} [svg]
 * @property {number[]} [arc]
 * @property {Object<string,string>} [pr]
 * @property {number} [oculto]
 * @property {number} [expuesta]
 * @property {string} [vr]
 * @property {Array<string|null>} [vp]
 * @property {string} [vg]
 * @property {string} [vh]
 * @property {string} [vw]
 * @property {string[]} [cn]           Restricciones (MIN, MAX, CENTER, STRETCH, SCALE) de un hijo absoluto
 */
/**
 * @typedef {{ n: string, f: string[], s: number, lh: { u: string, v?: number }, ls: { u: string, v: number }, tc: string, d: string, vs?: string }} EstiloTextoDatos
 * @typedef {Object} DatosAURA
 * @property {string} version
 * @property {string} generado
 * @property {string} sitio
 * @property {string[]} fuentes
 * @property {Array<{ n: string, t: string, v: number[]|number|string|{ a: string }, d: string, sc: string[], css?: string }>} variables
 * @property {Array<{ n: string, d: string, v?: string, g?: PinturaLIR }>} estilosColor
 * @property {EstiloTextoDatos[]} estilosTexto
 * @property {EstiloTextoDatos[]} estilosGuia
 * @property {Array<{ n: string, d: string, fx: EfectoLIR[] }>} estilosEfecto
 * @property {Array<{ n: string, d: string, g: Array<Object<string, any>> }>} reticulas
 * @property {Object<string, string>} iconos
 * @property {string} licenciaIconos
 * @property {Object<string, { url1: string, url2: string, orig: string, w?: number, h?: number }>} imagenes
 * @property {Array<{ n: string, d: string, orden: string[]|null, variantes: Array<{ v: Object<string,string>|null, raiz: NodoLIR, d?: string }>, props: Array<{ n: string, t: string, d: any }> }>} componentes
 * @property {Array<{ id: string, n: string, raiz: NodoLIR }>} capitulos
 */

var COLECCION = 'AURA';
var MODO = 'Oscuro';
var PAGINA_GUIA = 'Guía de estilo AURA';
var PAGINA_COMPONENTES = 'Componentes';

var estado = {
  /** @type {Map<string, Variable>} */ variables: new Map(),
  /** @type {VariableCollection|null} */ coleccion: null,
  modo: '',
  /** @type {Map<string, PaintStyle>} */ estilosPintura: new Map(),
  /** @type {Map<string, TextStyle>} */ estilosTexto: new Map(),
  /** @type {Map<string, EffectStyle>} */ estilosEfecto: new Map(),
  /** @type {Map<string, GridStyle>} */ estilosReticula: new Map(),
  /** @type {Map<string, ComponentNode>} */ iconos: new Map(),
  /** @type {Map<string, {nodo: ComponentNode|ComponentSetNode, variantes: Map<string, ComponentNode>}>} */ componentes: new Map(),
  /** @type {Map<string, FontName>} */ fuentes: new Map(),
  /** @type {Set<string>} */ disponibles: new Set(),
  /** @type {string[]} */ avisos: [],
  /** @type {string[]} */ paginasNuevas: [],
  /** @type {Array<{nodo: SceneNode, clave: string, fit: string}>} */ imagenes: [],
  /** @type {Array<{nodo: SceneNode, pr: Object<string,string>}>} */ referencias: [],
  cuenta: { variables: 0, variablesNuevas: 0, estilos: 0, componentes: 0, variantes: 0, marcos: 0, nodos: 0, instancias: 0, imagenes: 0, imagenesFallidas: 0 },
};

// -----------------------------------------------------------------------------
// Utilidades
// -----------------------------------------------------------------------------
/** @param {string} msg @param {number} [ms] */
function avisar(msg, ms) {
  figma.notify('AURA · ' + msg, { timeout: ms || 2500 });
}
/** Cede el hilo para que Figma pinte y no se congele la interfaz */
function respiro() {
  return new Promise(function (r) { setTimeout(r, 0); });
}
/** @param {number[]} c @returns {RGB} */
function rgb(c) { return { r: c[0] / 255, g: c[1] / 255, b: c[2] / 255 }; }
/** @param {number[]} c @returns {RGBA} */
function rgba(c) { return { r: c[0] / 255, g: c[1] / 255, b: c[2] / 255, a: c[3] === undefined ? 1 : c[3] }; }
/** @param {number|undefined} n */
function medida(n) { return Math.max(0.01, Math.round((n || 0) * 100) / 100); }

/** Valor (ya resuelto) de una variable de color de los datos, en 0–1 */
/** @param {string} nombre @returns {number[]} */
function colorDeVariable(nombre) {
  for (var i = 0; i < 30; i++) {
    var def = DATOS.variables.find(function (v) { return v.n === nombre; });
    if (!def) return [0, 0, 0, 1];
    if (Array.isArray(def.v)) return /** @type {number[]} */ (def.v);
    nombre = /** @type {any} */ (def.v).a;
  }
  return [0, 0, 0, 1];
}

/**
 * Pintura de Figma a partir de la de los datos (enlazada a su variable si la tiene)
 * @param {PinturaLIR} p
 * @returns {Paint}
 */
function pintura(p) {
  if (p.v) {
    var c = colorDeVariable(p.v);
    /** @type {SolidPaint} */
    var solida = { type: 'SOLID', color: { r: c[0], g: c[1], b: c[2] }, opacity: c[3] };
    var variable = estado.variables.get(p.v);
    if (variable) {
      solida = { type: 'SOLID', color: { r: c[0], g: c[1], b: c[2] }, opacity: 1 };
      solida = figma.variables.setBoundVariableForPaint(solida, 'color', variable);
    }
    return solida;
  }
  if (p.g) {
    var m = p.m || [[1, 0, 0], [0, 1, 0]];
    /** @type {Transform} */
    var t = [[m[0][0], m[0][1], m[0][2]], [m[1][0], m[1][1], m[1][2]]];
    return {
      type: p.g === 'R' ? 'GRADIENT_RADIAL' : 'GRADIENT_LINEAR',
      gradientTransform: t,
      gradientStops: (p.s || []).map(function (s) { return { position: s[0], color: { r: s[1] / 255, g: s[2] / 255, b: s[3] / 255, a: s[4] } }; }),
    };
  }
  var col = p.c || [0, 0, 0, 1];
  return { type: 'SOLID', color: rgb(col), opacity: col[3] === undefined ? 1 : col[3] };
}

/**
 * @param {EfectoLIR} e
 * @returns {Effect}
 */
function efecto(e) {
  if (e.t === 'B') {
    /** @type {Effect} */
    var blur = /** @type {any} */ ({ type: 'BACKGROUND_BLUR', radius: e.r || 0, visible: true, blurType: 'NORMAL' });
    var vb = e.v ? estado.variables.get(e.v) : null;
    if (vb) blur = figma.variables.setBoundVariableForEffect(blur, 'radius', vb);
    return blur;
  }
  var p = e.c || { c: [0, 0, 0, 1] };
  var col = p.v ? colorDeVariable(p.v).slice() : [(p.c || [0])[0] / 255, (p.c || [0, 0])[1] / 255, (p.c || [0, 0, 0])[2] / 255, (p.c || [0, 0, 0, 1])[3]];
  /** @type {DropShadowEffect|InnerShadowEffect} */
  var sombra = {
    type: e.t === 'I' ? 'INNER_SHADOW' : 'DROP_SHADOW',
    color: { r: col[0], g: col[1], b: col[2], a: col[3] },
    offset: { x: e.x || 0, y: e.y || 0 },
    radius: e.b || 0,
    spread: e.s || 0,
    visible: true,
    blendMode: 'NORMAL',
  };
  if (e.t !== 'I') /** @type {any} */ (sombra).showShadowBehindNode = false;
  var vc = p.v ? estado.variables.get(p.v) : null;
  if (vc) return figma.variables.setBoundVariableForEffect(sombra, 'color', vc);
  return sombra;
}

// -----------------------------------------------------------------------------
// 1. Fuentes (con alternativas si un estilo no existe)
// -----------------------------------------------------------------------------
var ALTERNATIVAS_ESTILO = {
  'Regular': ['Regular', 'Book', 'Normal'],
  'Medium': ['Medium', 'Regular'],
  'SemiBold': ['SemiBold', 'Semi Bold', 'Medium', 'Bold', 'Regular'],
  'Semi Bold': ['Semi Bold', 'SemiBold', 'Medium', 'Bold', 'Regular'],
  'Bold': ['Bold', 'SemiBold', 'Semi Bold', 'Medium', 'Regular'],
};
var ALTERNATIVAS_FAMILIA = {
  'Kanit': ['Kanit', 'Inter'],
  'Inter': ['Inter', 'Roboto'],
  'Roboto Mono': ['Roboto Mono', 'Source Code Pro', 'IBM Plex Mono', 'JetBrains Mono', 'Inter'],
};

async function cargarFuentes() {
  var lista = await figma.listAvailableFontsAsync();
  lista.forEach(function (f) { estado.disponibles.add(f.fontName.family + '|' + f.fontName.style); });
  var necesarias = DATOS.fuentes.slice();
  DATOS.estilosTexto.concat(DATOS.estilosGuia).forEach(function (e) { necesarias.push(e.f[0] + '|' + e.f[1]); });
  necesarias.push('Inter|Regular');
  var unicas = necesarias.filter(function (v, i, a) { return a.indexOf(v) === i; });
  for (var i = 0; i < unicas.length; i++) {
    var partes = unicas[i].split('|');
    var fn = resolverFuente(partes[0], partes[1]);
    try {
      await figma.loadFontAsync(fn);
      estado.fuentes.set(unicas[i], fn);
      if (fn.family !== partes[0] || fn.style !== partes[1]) estado.avisos.push('Fuente ' + partes[0] + ' ' + partes[1] + ' → ' + fn.family + ' ' + fn.style);
    } catch (e) {
      estado.avisos.push('No se pudo cargar ' + fn.family + ' ' + fn.style);
      estado.fuentes.set(unicas[i], { family: 'Inter', style: 'Regular' });
    }
  }
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
}

/** @param {string} familia @param {string} est @returns {FontName} */
function resolverFuente(familia, est) {
  var familias = ALTERNATIVAS_FAMILIA[familia] || [familia, 'Inter'];
  var estilos = ALTERNATIVAS_ESTILO[est] || [est, 'Regular'];
  for (var i = 0; i < familias.length; i++) {
    for (var j = 0; j < estilos.length; j++) {
      if (estado.disponibles.has(familias[i] + '|' + estilos[j])) return { family: familias[i], style: estilos[j] };
    }
  }
  return { family: 'Inter', style: 'Regular' };
}
/** @param {string} clave @returns {FontName} */
function fuente(clave) {
  return estado.fuentes.get(clave) || estado.fuentes.get('Inter|Regular') || { family: 'Inter', style: 'Regular' };
}

// -----------------------------------------------------------------------------
// 2. Variables
// -----------------------------------------------------------------------------
async function crearVariables() {
  var colecciones = await figma.variables.getLocalVariableCollectionsAsync();
  /** @type {VariableCollection} */
  var col = colecciones.find(function (c) { return c.name === COLECCION; }) || figma.variables.createVariableCollection(COLECCION);
  if (col.modes.length === 1 && col.modes[0].name !== MODO && !col.modes.some(function (m) { return m.name === MODO; }) && col.variableIds.length === 0) {
    col.renameMode(col.modes[0].modeId, MODO);
  }
  var modo = col.modes.find(function (m) { return m.name === MODO; }) || col.modes[0];
  estado.coleccion = col;
  estado.modo = modo.modeId;
  var existentes = (await figma.variables.getLocalVariablesAsync()).filter(function (v) { return v.variableCollectionId === col.id; });
  /** @type {Map<string, Variable>} */
  var porNombre = new Map();
  existentes.forEach(function (v) { porNombre.set(v.name, v); });

  // Primera pasada: crear o reutilizar. Se guardan siempre con su nombre de los datos, que es el que
  // usan los alias, los estilos y los dibujos para encontrarlas.
  DATOS.variables.forEach(function (d) {
    var v = porNombre.get(d.n);
    if (v && v.resolvedType !== d.t) {
      // Ya hay una con ese nombre y otro tipo: se usa (o se crea una vez) «… (AURA)» del tipo correcto
      var alternativo = d.n + ' (AURA)';
      var i = 2;
      var otra = porNombre.get(alternativo);
      while (otra && otra.resolvedType !== d.t) { alternativo = d.n + ' (AURA ' + i + ')'; otra = porNombre.get(alternativo); i++; }
      estado.avisos.push('La variable «' + d.n + '» ya existía con otro tipo (' + v.resolvedType + '): se usa «' + alternativo + '»' + (otra ? '' : ', creada ahora'));
      v = otra;
      if (!v) {
        v = figma.variables.createVariable(alternativo, /** @type {VariableCollection} */ (col), /** @type {VariableResolvedDataType} */ (d.t));
        porNombre.set(alternativo, v);
        estado.cuenta.variablesNuevas++;
      }
    }
    if (!v) {
      v = figma.variables.createVariable(d.n, /** @type {VariableCollection} */ (col), /** @type {VariableResolvedDataType} */ (d.t));
      porNombre.set(d.n, v);
      estado.cuenta.variablesNuevas++;
    }
    v.description = d.d || '';
    try { v.scopes = /** @type {VariableScope[]} */ (d.sc); } catch (e) { /* ámbito no admitido en esta versión */ }
    if (d.css) { try { v.setVariableCodeSyntax('WEB', d.css); } catch (e) { /* sin sintaxis de código */ } }
    estado.variables.set(d.n, v);
  });
  // Segunda pasada: valores y alias
  DATOS.variables.forEach(function (d) {
    var v = /** @type {Variable} */ (estado.variables.get(d.n));
    /** @type {VariableValue} */
    var valor;
    var val = /** @type {any} */ (d.v);
    if (val && val.a) {
      var destino = estado.variables.get(val.a);
      if (!destino) { estado.avisos.push('Alias sin destino: ' + d.n); return; }
      valor = figma.variables.createVariableAlias(destino);
    } else if (d.t === 'COLOR') {
      valor = { r: val[0], g: val[1], b: val[2], a: val[3] };
    } else {
      valor = val;
    }
    try { v.setValueForMode(estado.modo, valor); } catch (e) { estado.avisos.push('Valor no aplicado en ' + d.n + ': ' + e); }
  });
  estado.cuenta.variables = DATOS.variables.length;
}

// -----------------------------------------------------------------------------
// 3. Estilos
// -----------------------------------------------------------------------------
async function crearEstilos() {
  // Color (y degradados)
  var pinturas = await figma.getLocalPaintStylesAsync();
  DATOS.estilosColor.forEach(function (e) {
    var st = pinturas.find(function (p) { return p.name === e.n; }) || figma.createPaintStyle();
    st.name = e.n;
    st.description = e.d || '';
    var def = /** @type {any} */ (e);
    st.paints = [def.v ? pintura({ v: def.v }) : pintura(def.g)];
    estado.estilosPintura.set(e.n, st);
    estado.cuenta.estilos++;
  });
  // Texto: los del sistema y los de la maquetación de la guía
  var textos = await figma.getLocalTextStylesAsync();
  DATOS.estilosTexto.concat(DATOS.estilosGuia).forEach(function (e) {
    var st = textos.find(function (t) { return t.name === e.n; }) || figma.createTextStyle();
    st.name = e.n;
    st.fontName = fuente(e.f[0] + '|' + e.f[1]);
    st.fontSize = e.s;
    st.lineHeight = e.lh.u === 'AUTO' ? { unit: 'AUTO' } : { unit: /** @type {'PIXELS'|'PERCENT'} */ (e.lh.u), value: /** @type {number} */ (e.lh.v) };
    st.letterSpacing = { unit: /** @type {'PIXELS'|'PERCENT'} */ (e.ls.u), value: e.ls.v };
    st.textCase = /** @type {TextCase} */ (e.tc || 'ORIGINAL');
    st.description = e.d || '';
    var def = /** @type {any} */ (e);
    if (def.vs && estado.variables.get(def.vs)) {
      try { st.setBoundVariable('fontSize', /** @type {Variable} */ (estado.variables.get(def.vs))); } catch (err) { /* sin enlace de tamaño */ }
    }
    estado.estilosTexto.set(e.n, st);
    estado.cuenta.estilos++;
  });
  // Efecto
  var efectos = await figma.getLocalEffectStylesAsync();
  DATOS.estilosEfecto.forEach(function (e) {
    var st = efectos.find(function (x) { return x.name === e.n; }) || figma.createEffectStyle();
    st.name = e.n;
    st.description = e.d || '';
    st.effects = e.fx.map(function (f) { return efecto(/** @type {EfectoLIR} */ (f)); });
    estado.estilosEfecto.set(e.n, st);
    estado.cuenta.estilos++;
  });
  // Retícula
  var reticulas = await figma.getLocalGridStylesAsync();
  DATOS.reticulas.forEach(function (e) {
    var st = reticulas.find(function (x) { return x.name === e.n; }) || figma.createGridStyle();
    st.name = e.n;
    st.description = e.d || '';
    st.layoutGrids = e.g.map(function (g) {
      var d = /** @type {any} */ (g);
      /** @type {LayoutGrid} */
      var rg;
      if (d.p === 'GRID') {
        rg = { pattern: 'GRID', sectionSize: d.sec, visible: true, color: { r: 0.09, g: 0.53, b: 0.97, a: 0.1 } };
      } else {
        rg = /** @type {any} */ ({ pattern: 'COLUMNS', alignment: d.al, gutterSize: d.gut, count: d.n, visible: true, color: { r: 0.9, g: 0.66, b: 0.24, a: 0.1 } });
        if (d.sec !== undefined && d.al !== 'STRETCH') /** @type {any} */ (rg).sectionSize = d.sec;
        if (d.off !== undefined) /** @type {any} */ (rg).offset = d.off;
        var vg = d.vg && estado.variables.get(d.vg);
        if (vg) rg = figma.variables.setBoundVariableForLayoutGrid(rg, 'gutterSize', vg);
        var vo = d.vo && estado.variables.get(d.vo);
        if (vo) rg = figma.variables.setBoundVariableForLayoutGrid(rg, 'offset', vo);
      }
      return rg;
    });
    estado.estilosReticula.set(e.n, st);
    estado.cuenta.estilos++;
  });
}

// -----------------------------------------------------------------------------
// 4. Páginas (si ya existen, se crea otra con sufijo y se dice al final)
// -----------------------------------------------------------------------------
/** @param {string} base */
function nombreLibre(base) {
  var nombres = figma.root.children.map(function (p) { return p.name; });
  if (nombres.indexOf(base) < 0) return base;
  var i = 2;
  while (nombres.indexOf(base + ' (' + i + ')') >= 0) i++;
  estado.avisos.push('Ya había una página «' + base + '»: se ha creado «' + base + ' (' + i + ')» y no se ha tocado la anterior');
  estado.paginasNuevas.push(base + ' (' + i + ')');
  return base + ' (' + i + ')';
}

function prepararPaginas() {
  var actual = figma.currentPage;
  /** @type {PageNode} */
  var guia;
  // En un archivo nuevo (una sola página vacía) se usa esa página para la guía
  if (figma.root.children.length === 1 && actual.children.length === 0 && /^(Page|Página) 1$/.test(actual.name)) {
    guia = actual;
    guia.name = PAGINA_GUIA;
  } else {
    guia = figma.createPage();
    guia.name = nombreLibre(PAGINA_GUIA);
  }
  var comps = figma.createPage();
  comps.name = nombreLibre(PAGINA_COMPONENTES);
  return { guia: guia, componentes: comps };
}

// -----------------------------------------------------------------------------
// 5. Dibujo de los nodos (marcos, textos, instancias, imágenes, iconos)
// -----------------------------------------------------------------------------
/** @param {SceneNode} nodo */
function esAutoLayout(nodo) {
  return 'layoutMode' in nodo && /** @type {FrameNode} */ (nodo).layoutMode !== 'NONE';
}

/**
 * Aplica tamaño y posición respecto al padre (después de añadirlo)
 * @param {SceneNode} nodo @param {NodoLIR} n @param {BaseNode & ChildrenMixin} padre
 */
function colocar(nodo, n, padre) {
  var padreAuto = padre && 'layoutMode' in padre && /** @type {FrameNode} */ (/** @type {unknown} */ (padre)).layoutMode !== 'NONE';
  var sn = /** @type {FrameNode} */ (/** @type {unknown} */ (nodo));
  if (padreAuto && n.ab) {
    sn.layoutPositioning = 'ABSOLUTE';
    sn.x = n.x || 0; sn.y = n.y || 0;
  } else if (!padreAuto && padre && padre.type !== 'PAGE' && (n.x !== undefined || n.y !== undefined)) {
    sn.x = n.x || 0; sn.y = n.y || 0;
  }
  if (n.cn && 'constraints' in nodo) {
    try { /** @type {ConstraintMixin} */ (/** @type {unknown} */ (nodo)).constraints = { horizontal: /** @type {ConstraintType} */ (n.cn[0]), vertical: /** @type {ConstraintType} */ (n.cn[1]) }; } catch (e) { /* sin restricciones */ }
  }
  if (!('layoutSizingHorizontal' in nodo)) return;
  var propio = esAutoLayout(nodo) || nodo.type === 'TEXT';
  /** @param {string|undefined} modo @param {string|undefined} enlace @returns {'FIXED'|'HUG'|'FILL'} */
  var conv = function (modo, enlace) {
    if (enlace) return 'FIXED';         // medida enlazada a una variable: abrazar o llenar la perdería
    if (modo === 'L' && padreAuto && !n.ab) return 'FILL';
    if (modo === 'H' && propio) return 'HUG';
    return 'FIXED';
  };
  try {
    if (nodo.type === 'TEXT') {
      if (n.sl && padreAuto && !n.ab) sn.layoutSizingHorizontal = 'FILL';
    } else {
      sn.layoutSizingHorizontal = conv(n.sw || 'F', n.vw);
      sn.layoutSizingVertical = conv(n.sh || 'F', n.vh);
    }
  } catch (e) { /* combinación no admitida: se queda fijo */ }
}

/**
 * Enlaza medidas a variables cuando el valor es de los tokens
 * @param {FrameNode|ComponentNode} f @param {NodoLIR} n
 */
function enlazarMedidas(f, n) {
  /** @param {VariableBindableNodeField} campo @param {string|null|undefined} nombre */
  var enlazar = function (campo, nombre) {
    var v = nombre ? estado.variables.get(nombre) : null;
    if (v) { try { f.setBoundVariable(campo, v); } catch (e) { /* campo no enlazable aquí */ } }
  };
  if (n.vr) ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'].forEach(function (c) { enlazar(/** @type {VariableBindableNodeField} */ (c), n.vr); });
  if (n.vp && f.layoutMode !== 'NONE') {
    enlazar('paddingTop', n.vp[0]); enlazar('paddingRight', n.vp[1]); enlazar('paddingBottom', n.vp[2]); enlazar('paddingLeft', n.vp[3]);
  }
  if (n.vg && f.layoutMode !== 'NONE') enlazar('itemSpacing', n.vg);
  if (n.vh) enlazar('height', n.vh);
  if (n.vw) enlazar('width', n.vw);
}

// -----------------------------------------------------------------------------
// Sombras con extensión (spread). Figma solo pinta el spread en rectángulos y elipses, o en marcos con
// relleno visible y «Recortar contenido». Para cada marco que lo lleva:
//   · 'recorte': tiene relleno y nada se sale de su caja → se activa «Recortar contenido».
//   · 'capa':    tiene relleno pero algo se sale (el contorno de foco) → el relleno y las sombras pasan a
//                un rectángulo «Fondo y sombra» al fondo del marco, que no recorta.
//   · 'anillo':  no tiene relleno → cada anillo (sombra sin desenfoque ni desplazamiento) se dibuja como
//                una capa «Anillo» con trazo; el resto de sombras se quedan sin extensión.
// -----------------------------------------------------------------------------
/** @param {NodoLIR} n @returns {EfectoLIR[]} */
function efectosDe(n) {
  if (n.fxs) {
    var def = DATOS.estilosEfecto.find(function (e) { return e.n === n.fxs; });
    return def ? def.fx : [];
  }
  return n.fx || [];
}
/** @param {EfectoLIR} e */
function conExtension(e) { return (e.t === 'D' || e.t === 'I') && !!e.s; }
/** @param {EfectoLIR} e */
function esAnillo(e) { return e.t === 'D' && !e.x && !e.y && !e.b && (e.s || 0) > 0; }
/** ¿Algún hijo absoluto se sale de la caja del marco? @param {NodoLIR} n */
function desborda(n) {
  return (n.c || []).some(function (h) {
    if (!h.ab) return false;
    var x = h.x || 0, y = h.y || 0;
    var w = h.k === 'ICO' ? (h.s || h.w || 0) : (h.w || 0), alto = h.k === 'ICO' ? (h.s || h.h || 0) : (h.h || 0);
    return x < -0.5 || y < -0.5 || x + w > (n.w || 0) + 0.5 || y + alto > (n.h || 0) + 0.5;
  });
}
/** @param {NodoLIR} n @returns {''|'recorte'|'capa'|'anillo'} */
function planSombras(n) {
  if (!efectosDe(n).some(conExtension)) return '';
  if ((n.fi || []).length) return desborda(n) ? 'capa' : 'recorte';
  return 'anillo';
}

/**
 * Propiedades visuales de un marco (o componente)
 * @param {FrameNode|ComponentNode} f @param {NodoLIR} n @param {string} plan  (ver planSombras)
 */
async function estilarMarco(f, n, plan) {
  f.name = n.n || 'Marco';
  // Con plan 'capa', el relleno va en el rectángulo «Fondo y sombra» (aplicarPlanSombras)
  f.fills = plan === 'capa' ? [] : (n.fi || []).map(pintura);
  f.clipsContent = !!n.cl || plan === 'recorte';
  if (n.lm === 'H' || n.lm === 'V') {
    f.layoutMode = n.lm === 'H' ? 'HORIZONTAL' : 'VERTICAL';
    var pad = n.pad || [0, 0, 0, 0];
    f.paddingTop = pad[0]; f.paddingRight = pad[1]; f.paddingBottom = pad[2]; f.paddingLeft = pad[3];
    f.itemSpacing = n.pa === 'SPACE_BETWEEN' ? 0 : (n.gap || 0);
    f.primaryAxisAlignItems = /** @type {'MIN'|'MAX'|'CENTER'|'SPACE_BETWEEN'} */ (n.pa || 'MIN');
    f.counterAxisAlignItems = /** @type {'MIN'|'MAX'|'CENTER'|'BASELINE'} */ (n.ca || 'MIN');
    if (n.sil) f.strokesIncludedInLayout = true;
  } else {
    f.layoutMode = 'NONE';
  }
  f.resize(medida(n.w), medida(n.h));
  if (n.st && n.st.length) {
    f.strokes = n.st.map(pintura);
    f.strokeAlign = 'INSIDE';
    if (Array.isArray(n.bw)) {
      f.strokeTopWeight = n.bw[0]; f.strokeRightWeight = n.bw[1]; f.strokeBottomWeight = n.bw[2]; f.strokeLeftWeight = n.bw[3];
    } else {
      f.strokeWeight = n.bw || 1;
    }
    if (n.bd) f.dashPattern = [4, 4];
  }
  if (n.r !== undefined) {
    if (Array.isArray(n.r)) {
      f.topLeftRadius = n.r[0]; f.topRightRadius = n.r[1]; f.bottomRightRadius = n.r[2]; f.bottomLeftRadius = n.r[3];
    } else {
      f.cornerRadius = n.r;
    }
  }
  if (plan === 'capa') {
    // las sombras van con el relleno, en el rectángulo
  } else if (plan === 'anillo') {
    // los anillos pasan a capas con trazo; las demás sombras, sin extensión
    f.effects = efectosDe(n).filter(function (e) { return !esAnillo(e); }).map(function (e) {
      return efecto(conExtension(e) ? /** @type {EfectoLIR} */ (Object.assign({}, e, { s: 0 })) : e);
    });
  } else if (n.fxs && estado.estilosEfecto.get(n.fxs)) {
    await f.setEffectStyleIdAsync(/** @type {EffectStyle} */ (estado.estilosEfecto.get(n.fxs)).id);
  } else if (n.fx && n.fx.length) {
    f.effects = n.fx.map(efecto);
  }
  if (n.op !== undefined) f.opacity = n.op;
  if (n.bm) { try { f.blendMode = /** @type {BlendMode} */ (n.bm); } catch (e) { /* modo no admitido */ } }
  enlazarMedidas(f, n);
}

/**
 * Radios de un marco de los datos aplicados a otro nodo (con su variable si la tiene)
 * @param {RectangleNode|FrameNode} nodo @param {NodoLIR} n @param {number} [extra]  px de más (anillos)
 */
function copiarRadios(nodo, n, extra) {
  var mas = extra || 0;
  /** @param {number} r */
  var radio = function (r) { return r > 0 ? r + mas : 0; };
  if (Array.isArray(n.r)) {
    nodo.topLeftRadius = radio(n.r[0]); nodo.topRightRadius = radio(n.r[1]); nodo.bottomRightRadius = radio(n.r[2]); nodo.bottomLeftRadius = radio(n.r[3]);
  } else if (n.r) {
    nodo.cornerRadius = radio(n.r);
  }
  var v = !mas && n.vr ? estado.variables.get(n.vr) : null;
  if (v) {
    ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'].forEach(function (c) {
      try { nodo.setBoundVariable(/** @type {VariableBindableNodeField} */ (c), /** @type {Variable} */ (v)); } catch (e) { /* sin enlace */ }
    });
  }
}

/**
 * Capa absoluta al fondo de un marco, con restricciones para que siga su tamaño
 * @param {FrameNode|ComponentNode} f @param {RectangleNode|FrameNode} capa
 * @param {number} x @param {number} y @param {number} w @param {number} h
 */
function capaAlFondo(f, capa, x, y, w, h) {
  f.insertChild(0, capa);
  if (esAutoLayout(f)) capa.layoutPositioning = 'ABSOLUTE';
  capa.x = x; capa.y = y;
  capa.resize(medida(w), medida(h));
  capa.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
}

/**
 * Segunda parte del plan de sombras, ya con el tamaño final del marco
 * @param {FrameNode|ComponentNode} f @param {NodoLIR} n @param {string} plan
 */
async function aplicarPlanSombras(f, n, plan) {
  if (plan === 'capa') {
    var fondo = figma.createRectangle();
    fondo.name = 'Fondo y sombra';
    fondo.fills = (n.fi || []).map(pintura);
    capaAlFondo(f, fondo, 0, 0, f.width, f.height);
    copiarRadios(fondo, n);
    var conEstilo = false;
    if (n.fxs && estado.estilosEfecto.get(n.fxs)) {
      try {
        await fondo.setEffectStyleIdAsync(/** @type {EffectStyle} */ (estado.estilosEfecto.get(n.fxs)).id);
        conEstilo = true;
      } catch (e) { /* sin estilo: las mismas sombras, sueltas */ }
    }
    if (!conEstilo) fondo.effects = efectosDe(n).map(efecto);
  } else if (plan === 'anillo') {
    // de mayor a menor, para que el más ancho quede debajo
    var anillos = efectosDe(n).filter(esAnillo).sort(function (a, b) { return (a.s || 0) - (b.s || 0); });
    anillos.forEach(function (e) {
      var s = e.s || 0;
      var anillo = figma.createFrame();
      anillo.name = 'Anillo';
      anillo.fills = [];
      anillo.clipsContent = false;
      anillo.strokes = [pintura(e.c || { c: [0, 0, 0, 1] })];
      anillo.strokeAlign = 'INSIDE';
      anillo.strokeWeight = s;
      copiarRadios(anillo, n, s);
      capaAlFondo(f, anillo, -s, -s, f.width + 2 * s, f.height + 2 * s);
    });
  }
}

/**
 * Coloca los hijos absolutos según sus restricciones cuando el marco ya tiene su tamaño final
 * (al abrazar el contenido puede medir otra cosa que en la captura: p. ej., el botón sin iconos)
 * @param {FrameNode|ComponentNode} f @param {NodoLIR} n @param {Array<{n: NodoLIR, nodo: SceneNode}>} hijos
 */
function reajustarAbsolutos(f, n, hijos) {
  var W0 = n.w || 0, H0 = n.h || 0, W = f.width, H = f.height;
  if (Math.abs(W - W0) < 0.5 && Math.abs(H - H0) < 0.5) return;
  hijos.forEach(function (par) {
    var h = par.n, nodo = /** @type {FrameNode|TextNode} */ (/** @type {unknown} */ (par.nodo));
    if (!h.ab || !h.cn || nodo.removed) return;
    var x = h.x || 0, y = h.y || 0;
    var w = nodo.width, alto = nodo.height;
    // Medidas de la captura (las que fijan los márgenes respecto al marco)
    var w0 = h.k === 'ICO' ? (h.s || w) : (h.w || w), h0 = h.k === 'ICO' ? (h.s || alto) : (h.h || alto);
    var nx = x, ny = y, nw = w, nh = alto;
    if (h.cn[0] === 'STRETCH') nw = W - x - (W0 - x - w0);
    else if (h.cn[0] === 'MAX') nx = W - (W0 - x - w0) - w;
    else if (h.cn[0] === 'CENTER') nx = W / 2 + (x + w0 / 2 - W0 / 2) - w / 2;
    else if (h.cn[0] === 'SCALE' && W0 > 0) { nx = x * W / W0; nw = w0 * W / W0; }
    if (h.cn[1] === 'STRETCH') nh = H - y - (H0 - y - h0);
    else if (h.cn[1] === 'MAX') ny = H - (H0 - y - h0) - alto;
    else if (h.cn[1] === 'CENTER') ny = H / 2 + (y + h0 / 2 - H0 / 2) - alto / 2;
    else if (h.cn[1] === 'SCALE' && H0 > 0) { ny = y * H / H0; nh = h0 * H / H0; }
    try {
      if (nodo.type !== 'TEXT' && (Math.abs(nw - w) > 0.01 || Math.abs(nh - alto) > 0.01)) nodo.resize(medida(nw), medida(nh));
      nodo.x = nx; nodo.y = ny;
    } catch (e) { /* se queda donde estaba */ }
  });
}

/**
 * Dibuja un nodo de los datos dentro de «padre»
 * @param {NodoLIR} n
 * @param {BaseNode & ChildrenMixin} padre
 * @param {boolean} [comoComponente]
 * @returns {Promise<SceneNode|null>}
 */
async function dibujar(n, padre, comoComponente) {
  /** @type {SceneNode|null} */
  var nodo = null;
  try {
    if (n.k === 'F') nodo = await dibujarMarco(n, padre, !!comoComponente);
    else if (n.k === 'T') nodo = await dibujarTexto(n, padre);
    else if (n.k === 'I') nodo = await dibujarInstancia(n, padre);
    else if (n.k === 'IMG') nodo = dibujarImagen(n, padre);
    else if (n.k === 'ICO') nodo = dibujarIcono(n, padre);
    else if (n.k === 'SVG') nodo = dibujarSVG(n, padre);
    else if (n.k === 'E') nodo = dibujarArco(n, padre);
  } catch (e) {
    estado.avisos.push('No se pudo dibujar «' + (n.n || n.k) + '»: ' + (e && /** @type {any} */ (e).message ? /** @type {any} */ (e).message : e));
    return null;
  }
  if (nodo) {
    estado.cuenta.nodos++;
    if (n.pr) estado.referencias.push({ nodo: nodo, pr: n.pr });
    if (n.oculto) nodo.visible = false;
    if (n.expuesta && nodo.type === 'INSTANCE') estado.referencias.push({ nodo: nodo, pr: { expuesta: '1' } });
  }
  return nodo;
}

/** @param {NodoLIR} n @param {BaseNode & ChildrenMixin} padre @param {boolean} comoComponente */
async function dibujarMarco(n, padre, comoComponente) {
  var f = comoComponente ? figma.createComponent() : figma.createFrame();
  var plan = planSombras(n);
  await estilarMarco(f, n, plan);
  padre.appendChild(f);
  var hijos = n.c || [];
  /** @type {Array<{n: NodoLIR, nodo: SceneNode}>} */
  var dibujados = [];
  for (var i = 0; i < hijos.length; i++) {
    var hijo = await dibujar(hijos[i], f, false);
    if (hijo) dibujados.push({ n: hijos[i], nodo: hijo });
    if (estado.cuenta.nodos % 400 === 0) await respiro();
  }
  colocar(f, n, padre);
  // Con el tamaño final (abrazar, llenar): capas absolutas según sus restricciones y sombras
  reajustarAbsolutos(f, n, dibujados);
  await aplicarPlanSombras(f, n, plan);
  return f;
}

/** Medidas en px de un estilo de texto de los datos */
/** @param {string} nombre */
function defEstiloTexto(nombre) {
  return DATOS.estilosTexto.concat(DATOS.estilosGuia).find(function (e) { return e.n === nombre; }) || null;
}

/** @param {NodoLIR} n @param {BaseNode & ChildrenMixin} padre */
async function dibujarTexto(n, padre) {
  var runs = n.runs || [];
  var texto = runs.map(function (r) { return r.t; }).join('');
  if (!texto) return null;
  var t = figma.createText();
  var base = runs[0];
  t.fontName = fuente(base.f);
  t.characters = texto;
  var def = n.ts ? defEstiloTexto(n.ts) : null;
  var estilo = n.ts ? estado.estilosTexto.get(n.ts) : null;
  if (estilo && def) {
    await t.setTextStyleIdAsync(estilo.id);
  } else {
    t.fontSize = base.s;
    t.lineHeight = base.lh ? { unit: 'PIXELS', value: base.lh } : { unit: 'AUTO' };
    t.letterSpacing = { unit: 'PIXELS', value: base.ls || 0 };
    if (base.tt) t.textCase = /** @type {TextCase} */ (base.tt);
  }
  // Tramos: solo lo que cambia respecto al estilo (o al primer tramo)
  var ref = def ? { f: def.f[0] + '|' + def.f[1], s: def.s, tt: def.tc === 'ORIGINAL' ? undefined : def.tc } : { f: base.f, s: base.s, tt: base.tt };
  var pos = 0;
  var mismoColor = runs.every(function (r) { return JSON.stringify(r.co) === JSON.stringify(runs[0].co); });
  for (var i = 0; i < runs.length; i++) {
    var r = runs[i];
    var a = pos, b = pos + r.t.length;
    pos = b;
    if (b <= a) continue;
    if (r.f !== ref.f) t.setRangeFontName(a, b, fuente(r.f));
    if (Math.abs(r.s - ref.s) > 0.01 || r.f !== ref.f) {
      t.setRangeFontSize(a, b, r.s);
      t.setRangeLineHeight(a, b, r.lh ? { unit: 'PIXELS', value: r.lh } : { unit: 'AUTO' });
      t.setRangeLetterSpacing(a, b, { unit: 'PIXELS', value: r.ls || 0 });
    }
    if ((r.tt || undefined) !== (ref.tt || undefined)) t.setRangeTextCase(a, b, /** @type {TextCase} */ (r.tt || 'ORIGINAL'));
    if (r.td) t.setRangeTextDecoration(a, b, /** @type {TextDecoration} */ (r.td));
    if (!mismoColor && r.co) t.setRangeFills(a, b, [pintura(r.co)]);
  }
  if (mismoColor && base.co) t.fills = [pintura(base.co)];
  if (n.ta) t.textAlignHorizontal = /** @type {'LEFT'|'CENTER'|'RIGHT'|'JUSTIFIED'} */ (n.ta);
  if (n.n) t.name = n.n;
  if (n.sw === 'H') {
    t.textAutoResize = 'WIDTH_AND_HEIGHT';
  } else {
    // Primero el ancho de la web (caja fija) y después altura automática: así el alto lo da el texto
    // en Figma, que puede partir líneas en otro sitio, y no la altura de la captura
    t.textAutoResize = 'NONE';
    t.resize(medida(n.w), medida(n.h));
    t.textAutoResize = 'HEIGHT';
  }
  padre.appendChild(t);
  colocar(t, n, padre);
  return t;
}

/** @param {NodoLIR} n @param {BaseNode & ChildrenMixin} padre */
async function dibujarInstancia(n, padre) {
  var info = estado.componentes.get(n.comp || '');
  if (!info) return null;
  /** @type {ComponentNode|undefined} */
  var comp;
  if (n.v) comp = info.variantes.get(claveVariante(n.v));
  else comp = info.nodo.type === 'COMPONENT' ? info.nodo : undefined;
  if (!comp) return null;
  var inst = comp.createInstance();
  padre.appendChild(inst);
  if (n.p) aplicarPropiedades(inst, n.p);
  if (n.sw === 'F' || n.sh === 'F') {
    try { inst.resize(n.sw === 'F' ? medida(n.w) : inst.width, n.sh === 'F' ? medida(n.h) : inst.height); } catch (e) { /* tamaño mínimo */ }
  } else if (n.w && inst.width + 1 < n.w) {
    // En la web es más ancha que su contenido (min-width, rejilla, bloque): se le da ese ancho
    try { inst.resize(medida(n.w), inst.height); } catch (e) { /* se queda con su ancho */ }
  }
  (n.ov || []).forEach(function (ov) {
    var capa = inst.findOne(function (x) { return x.name === ov.n; });
    if (!capa) return;
    if (ov.vis !== undefined) capa.visible = !!ov.vis;
    if (ov.fi && 'fills' in capa) {
      var paint = pintura(ov.fi);
      if (capa.type === 'INSTANCE') {
        // Muestra de color anidada: se pinta su capa «Color»
        var dentro = capa.findOne(function (x) { return x.name === 'Color'; });
        if (dentro && 'fills' in dentro) /** @type {GeometryMixin} */ (/** @type {unknown} */ (dentro)).fills = [paint];
      } else {
        /** @type {GeometryMixin} */ (/** @type {unknown} */ (capa)).fills = [paint];
      }
    }
    if (ov.img) estado.imagenes.push({ nodo: capa, clave: ov.img, fit: 'FIT' });
    if (ov.p && capa.type === 'INSTANCE') aplicarPropiedades(capa, ov.p);
  });
  colocar(inst, n, padre);
  estado.cuenta.instancias++;
  return inst;
}

/** @param {Object<string,string>} v */
function claveVariante(v) {
  return Object.keys(v).sort().map(function (k) { return k + '=' + v[k]; }).join(',');
}

/**
 * Propiedades de una instancia por su nombre visible («Etiqueta» → «Etiqueta#12:3»)
 * @param {InstanceNode} inst @param {Object<string,any>} props
 */
function aplicarPropiedades(inst, props) {
  var defs = inst.componentProperties;
  /** @type {Object<string, string|boolean>} */
  var cambios = {};
  Object.keys(props).forEach(function (nombre) {
    var clave = Object.keys(defs).find(function (k) { return k.split('#')[0] === nombre; });
    if (!clave) return;
    var valor = props[nombre];
    if (valor && typeof valor === 'object' && valor.ico) {
      var ic = estado.iconos.get(valor.ico);
      if (!ic) return;
      cambios[clave] = ic.id;
    } else if (defs[clave].type === 'TEXT') {
      if (typeof valor === 'string' && valor.length) cambios[clave] = valor;
    } else if (defs[clave].type === 'BOOLEAN') {
      cambios[clave] = !!valor;
    }
  });
  if (Object.keys(cambios).length) {
    try { inst.setProperties(cambios); } catch (e) { estado.avisos.push('Propiedades no aplicadas: ' + e); }
  }
}

/** @param {NodoLIR} n @param {BaseNode & ChildrenMixin} padre */
function dibujarImagen(n, padre) {
  var f = figma.createFrame();
  f.name = n.n || 'Foto';
  f.resize(medida(n.w), medida(n.h));
  f.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.075 } }];
  f.clipsContent = true;
  if (n.r) f.cornerRadius = /** @type {number} */ (n.r);
  if (n.bm) { try { f.blendMode = /** @type {BlendMode} */ (n.bm); } catch (e) { /* modo no admitido */ } }
  if (n.op !== undefined) f.opacity = n.op;
  padre.appendChild(f);
  colocar(f, n, padre);
  estado.imagenes.push({ nodo: f, clave: n.src || '', fit: n.fit === 'FIT' ? 'FIT' : 'FILL' });
  return f;
}

/** @param {NodoLIR} n @param {BaseNode & ChildrenMixin} padre */
function dibujarIcono(n, padre) {
  var comp = estado.iconos.get(n.i || '');
  if (!comp) return null;
  var inst = comp.createInstance();
  inst.name = n.n || 'Icono';
  inst.resize(medida(n.s || 16), medida(n.s || 16));
  if (n.co) pintarIcono(inst, pintura(n.co));
  padre.appendChild(inst);
  colocar(inst, n, padre);
  return inst;
}

/** @param {SceneNode} nodo @param {Paint} paint */
function pintarIcono(nodo, paint) {
  if ('children' in nodo) {
    /** @type {ChildrenMixin} */ (/** @type {unknown} */ (nodo)).children.forEach(function (h) { pintarIcono(h, paint); });
  } else if (nodo.type === 'VECTOR' || nodo.type === 'ELLIPSE' || nodo.type === 'RECTANGLE' || nodo.type === 'POLYGON' || nodo.type === 'STAR' || nodo.type === 'LINE') {
    if (Array.isArray(nodo.fills) && nodo.fills.length) nodo.fills = [paint];
    if (Array.isArray(nodo.strokes) && nodo.strokes.length) nodo.strokes = [paint];
  }
}

/** @param {NodoLIR} n @param {BaseNode & ChildrenMixin} padre */
function dibujarSVG(n, padre) {
  var s = figma.createNodeFromSvg(n.svg || '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');
  s.name = n.n || 'SVG';
  s.fills = [];
  s.clipsContent = false;
  // Los iconos de máscara vienen a su viewBox (16 px): se escalan a la caja de la web
  if (n.w && s.width > 0 && Math.abs(s.width - n.w) > 0.5) {
    try { s.rescale(n.w / s.width); } catch (e) { /* tamaño original */ }
  }
  padre.appendChild(s);
  colocar(s, n, padre);
  return s;
}

/** @param {NodoLIR} n @param {BaseNode & ChildrenMixin} padre */
function dibujarArco(n, padre) {
  var e = figma.createEllipse();
  e.name = n.n || 'Arco';
  e.resize(medida(n.w), medida(n.h));
  e.fills = (n.fi || []).map(pintura);
  if (n.arc) e.arcData = { startingAngle: n.arc[0], endingAngle: n.arc[1], innerRadius: n.arc[2] };
  padre.appendChild(e);
  colocar(e, n, padre);
  return e;
}

// -----------------------------------------------------------------------------
// 6. Iconos y componentes (página «Componentes»)
// -----------------------------------------------------------------------------
/**
 * Marco de sección con título y descripción
 * @param {PageNode} pagina @param {string} titulo @param {string} texto @param {number} x @param {number} y
 * @returns {Promise<FrameNode>}
 */
async function seccion(pagina, titulo, texto, x, y) {
  var f = figma.createFrame();
  f.name = titulo;
  f.layoutMode = 'VERTICAL';
  f.itemSpacing = 24;
  f.paddingTop = 48; f.paddingBottom = 48; f.paddingLeft = 48; f.paddingRight = 48;
  f.fills = [pintura({ v: 'Color/Fondo/Principal' })];
  f.strokes = [pintura({ c: [45, 45, 49, 1] })];
  f.strokeWeight = 1;
  f.cornerRadius = 20;
  f.clipsContent = false;
  pagina.appendChild(f);
  f.x = x; f.y = y;
  f.layoutSizingHorizontal = 'HUG';
  f.layoutSizingVertical = 'HUG';
  var t = figma.createText();
  t.fontName = fuente('Kanit|Medium');
  t.characters = titulo;
  var st = estado.estilosTexto.get('Texto/H3');
  var conEstilo = false;
  if (st) {
    try { await t.setTextStyleIdAsync(st.id); conEstilo = true; } catch (e) { /* sin estilo: tamaño a mano */ }
  }
  if (!conEstilo) t.fontSize = 28;
  t.fills = [pintura({ v: 'Color/Texto/Primario' })];
  f.appendChild(t);
  if (texto) {
    var d = figma.createText();
    d.fontName = fuente('Inter|Regular');
    d.characters = texto;
    d.fontSize = 14;
    d.lineHeight = { unit: 'PIXELS', value: 21 };
    d.fills = [pintura({ v: 'Color/Texto/Secundario' })];
    d.textAutoResize = 'NONE';
    d.resize(640, 21);
    d.textAutoResize = 'HEIGHT';
    f.appendChild(d);
  }
  return f;
}

/** @param {PageNode} pagina */
async function crearIconos(pagina) {
  var nombres = Object.keys(DATOS.iconos).sort();
  var sec = await seccion(pagina, 'Iconos', 'Bootstrap Icons (licencia MIT) que usa la web, como componentes de 16 px: cámbialos en las instancias con «Intercambiar instancia». ' + DATOS.licenciaIconos + '. Texto de la licencia: guia-de-estilo/figma/LICENSE-bootstrap-icons.txt.', 0, 0);
  var rejilla = figma.createFrame();
  rejilla.name = 'Rejilla de iconos';
  rejilla.layoutMode = 'HORIZONTAL';
  rejilla.layoutWrap = 'WRAP';
  rejilla.itemSpacing = 32;
  rejilla.counterAxisSpacing = 32;
  rejilla.fills = [];
  rejilla.resize(1200, 100);
  sec.appendChild(rejilla);
  rejilla.layoutSizingHorizontal = 'FIXED';
  rejilla.layoutSizingVertical = 'HUG';
  var paint = pintura({ v: 'Color/Texto/Primario' });
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i];
    try {
      var svg = figma.createNodeFromSvg(DATOS.iconos[nombre]);
      var comp = figma.createComponent();
      comp.name = 'Icono/' + nombre;
      comp.resize(16, 16);
      comp.fills = [];
      comp.clipsContent = false;
      svg.children.slice().forEach(function (h) {
        comp.appendChild(h);
        if ('constraints' in h) h.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
      });
      svg.remove();
      pintarIcono(comp, paint);
      comp.description = 'Bootstrap Icons · bi-' + nombre;
      rejilla.appendChild(comp);
      estado.iconos.set(nombre, comp);
    } catch (e) {
      estado.avisos.push('Icono ' + nombre + ': ' + e);
    }
  }
  return sec;
}

/**
 * Crea un componente (o un conjunto de variantes) con sus propiedades
 * @param {any} def  { n, d, orden, variantes: [{ v, raiz }], props: [{ n, t, d }] }
 * @param {FrameNode} contenedor
 */
async function crearComponente(def, contenedor) {
  // Cada nodo creado va con su definición: si una variante no se pudiera dibujar, las demás
  // conservan su clave, su fila y su columna
  /** @type {Array<{nodo: ComponentNode, va: any}>} */
  var pares = [];
  /** @type {Array<Array<{nodo: SceneNode, pr: Object<string,string>}>>} */
  var refsPorVariante = [];
  for (var i = 0; i < def.variantes.length; i++) {
    var va = def.variantes[i];
    estado.referencias = [];
    var nodo = /** @type {ComponentNode} */ (await dibujar(va.raiz, contenedor, true));
    if (!nodo) continue;
    nodo.name = va.v ? Object.keys(va.v).map(function (k) { return k + '=' + va.v[k]; }).join(', ') : def.n;
    pares.push({ nodo: nodo, va: va });
    refsPorVariante.push(estado.referencias);
  }
  estado.referencias = [];
  if (!pares.length) return null;
  var nodos = pares.map(function (p) { return p.nodo; });
  /** @type {ComponentNode|ComponentSetNode} */
  var destino;
  /** @type {Map<string, ComponentNode>} */
  var variantes = new Map();
  if (pares[0].va.v) {
    var conjunto = figma.combineAsVariants(nodos, contenedor);
    conjunto.name = def.n;
    distribuirVariantes(conjunto, pares, def);
    destino = conjunto;
    pares.forEach(function (p) {
      variantes.set(claveVariante(p.va.v), p.nodo);
      // Nota de la variante (p. ej., la escala de «Pulsado» en la web)
      if (p.va.d) p.nodo.description = p.va.d;
    });
  } else {
    destino = nodos[0];
    destino.name = def.n;
  }
  destino.description = def.d || '';
  // Propiedades
  /** @type {Object<string,string>} */
  var claves = {};
  (def.props || []).forEach(function (p) {
    var defecto = p.d;
    if (p.t === 'INSTANCE_SWAP') {
      var ic = estado.iconos.get(defecto && defecto.ico);
      if (!ic) return;
      defecto = ic.id;
    }
    if (p.t === 'TEXT' && typeof defecto !== 'string') defecto = String(defecto || '');
    if (p.t === 'BOOLEAN') defecto = !!defecto;
    try {
      claves[p.n] = destino.addComponentProperty(p.n, /** @type {ComponentPropertyType} */ (p.t), defecto);
    } catch (e) {
      estado.avisos.push('Propiedad «' + p.n + '» de ' + def.n + ': ' + e);
    }
  });
  refsPorVariante.forEach(function (refs) {
    refs.forEach(function (r) {
      if (r.pr.expuesta) {
        try { /** @type {InstanceNode} */ (r.nodo).isExposedInstance = true; } catch (e) { /* no se puede exponer */ }
        return;
      }
      /** @type {Object<string,string>} */
      var ref = {};
      Object.keys(r.pr).forEach(function (campo) { if (claves[r.pr[campo]]) ref[campo] = claves[r.pr[campo]]; });
      if (!Object.keys(ref).length) return;
      try { /** @type {any} */ (r.nodo).componentPropertyReferences = ref; } catch (e) { estado.avisos.push('Referencia en ' + def.n + ': ' + e); }
    });
  });
  estado.componentes.set(def.n, { nodo: destino, variantes: variantes });
  estado.cuenta.componentes++;
  estado.cuenta.variantes += nodos.length;
  if (pares.length < def.variantes.length) estado.avisos.push(def.n + ': ' + (def.variantes.length - pares.length) + ' variantes sin dibujar');
  return destino;
}

/**
 * Coloca las variantes en filas (primera propiedad) y columnas (segunda)
 * @param {ComponentSetNode} conjunto @param {Array<{nodo: ComponentNode, va: any}>} pares @param {any} def
 */
function distribuirVariantes(conjunto, pares, def) {
  var orden = def.orden || Object.keys(pares[0].va.v);
  /** @param {{va: any}} p */
  var fila = function (p) { return p.va.v[orden[0]]; };
  /** @param {{va: any}} p */
  var columna = function (p) { return orden[1] ? p.va.v[orden[1]] : ''; };
  /** @type {string[]} */ var filas = [];
  /** @type {string[]} */ var cols = [];
  pares.forEach(function (p) {
    if (filas.indexOf(fila(p)) < 0) filas.push(fila(p));
    if (cols.indexOf(columna(p)) < 0) cols.push(columna(p));
  });
  var anchoCol = cols.map(function (c) { return Math.max.apply(null, pares.filter(function (p) { return columna(p) === c; }).map(function (p) { return p.nodo.width; }).concat([1])); });
  var altoFila = filas.map(function (f) { return Math.max.apply(null, pares.filter(function (p) { return fila(p) === f; }).map(function (p) { return p.nodo.height; }).concat([1])); });
  var hueco = 32, margen = 32;
  pares.forEach(function (p) {
    var fi = filas.indexOf(fila(p)), ci = cols.indexOf(columna(p));
    var x = margen, y = margen;
    for (var a = 0; a < ci; a++) x += anchoCol[a] + hueco;
    for (var b = 0; b < fi; b++) y += altoFila[b] + hueco;
    p.nodo.x = x; p.nodo.y = y;
  });
  var w = margen * 2 + anchoCol.reduce(function (a, b) { return a + b; }, 0) + hueco * (cols.length - 1);
  var h = margen * 2 + altoFila.reduce(function (a, b) { return a + b; }, 0) + hueco * (filas.length - 1);
  conjunto.resizeWithoutConstraints(Math.max(w, 1), Math.max(h, 1));
  conjunto.fills = [pintura({ c: [10, 10, 11, 1] })];
  conjunto.strokes = [pintura({ c: [151, 71, 255, 1] })];
  conjunto.dashPattern = [6, 4];
  conjunto.cornerRadius = 16;
}

/** @param {PageNode} pagina */
async function crearComponentes(pagina) {
  var y = 0;
  var iconos = await crearIconos(pagina);
  y = iconos.height + 120;
  var x = 0, altoFila = 0;
  for (var i = 0; i < DATOS.componentes.length; i++) {
    var def = DATOS.componentes[i];
    avisar('Componentes: ' + def.n + ' (' + (i + 1) + '/' + DATOS.componentes.length + ')', 1500);
    var sec = await seccion(pagina, def.n, def.d, x, y);
    await crearComponente(def, sec);
    await respiro();
    // Secciones en columnas de unos 3000 px de ancho
    if (x + sec.width > 3200 && x > 0) { x = 0; y += altoFila + 120; sec.x = x; sec.y = y; altoFila = 0; }
    x += sec.width + 120;
    altoFila = Math.max(altoFila, sec.height);
    if (x > 3200) { x = 0; y += altoFila + 120; altoFila = 0; }
  }
}

// -----------------------------------------------------------------------------
// 7. Guía (un marco por capítulo)
// -----------------------------------------------------------------------------
/** @param {PageNode} pagina */
async function crearGuia(pagina) {
  var x = 0, y = 0, col = 0, altoFila = 0;
  /** @type {SceneNode[]} */
  var marcos = [];
  for (var i = 0; i < DATOS.capitulos.length; i++) {
    var cap = DATOS.capitulos[i];
    avisar('Guía: ' + cap.n + ' (' + (i + 1) + '/' + DATOS.capitulos.length + ')', 1500);
    var marco = await dibujar(/** @type {NodoLIR} */ (cap.raiz), pagina, false);
    if (!marco) continue;
    marco.name = cap.n;
    marco.x = x; marco.y = y;
    // El capítulo de layout lleva la retícula de escritorio (se ve con Mayús + G)
    var reticula = estado.estilosReticula.get('Retícula/Escritorio · 12 columnas');
    if (cap.id === 'layout' && reticula && marco.type === 'FRAME') {
      try { await marco.setGridStyleIdAsync(reticula.id); } catch (e) { /* sin retícula */ }
    }
    marcos.push(marco);
    estado.cuenta.marcos++;
    altoFila = Math.max(altoFila, marco.height);
    col++;
    x += 1440 + 200;
    if (col === 5) { col = 0; x = 0; y += altoFila + 400; altoFila = 0; }
    await respiro();
  }
  return marcos;
}

// -----------------------------------------------------------------------------
// 8. Imágenes (fotos reales de producción)
// -----------------------------------------------------------------------------
var UI_DECODIFICAR = '<script>\n'
  + 'onmessage = async function (e) {\n'
  + '  var m = e.data && e.data.pluginMessage;\n'
  + '  if (!m || m.tipo !== "decodificar") return;\n'
  + '  try {\n'
  + '    var r = await fetch(m.url);\n'
  + '    if (!r.ok) throw new Error("HTTP " + r.status);\n'
  + '    var bmp = await createImageBitmap(await r.blob());\n'
  + '    var c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;\n'
  + '    c.getContext("2d").drawImage(bmp, 0, 0);\n'
  + '    var blob = await new Promise(function (ok) { c.toBlob(ok, "image/jpeg", 0.86); });\n'
  + '    var bytes = new Uint8Array(await blob.arrayBuffer());\n'
  + '    parent.postMessage({ pluginMessage: { tipo: "imagen", id: m.id, bytes: bytes } }, "*");\n'
  + '  } catch (err) { parent.postMessage({ pluginMessage: { tipo: "imagen", id: m.id, error: String(err) } }, "*"); }\n'
  + '};\n'
  + '</script>';

var ui = { abierta: false, siguiente: 1, /** @type {Map<number, function(any): void>} */ pendientes: new Map() };

/** Decodifica una WebP de la web en la interfaz oculta (respaldo si falta la copia JPG) */
/** @param {string} url @returns {Promise<Uint8Array>} */
function decodificarEnUI(url) {
  if (!ui.abierta) {
    figma.showUI(UI_DECODIFICAR, { visible: false });
    figma.ui.onmessage = function (m) {
      if (!m || m.tipo !== 'imagen') return;
      var fn = ui.pendientes.get(m.id);
      if (fn) { ui.pendientes.delete(m.id); fn(m); }
    };
    ui.abierta = true;
  }
  var id = ui.siguiente++;
  return new Promise(function (ok, mal) {
    var t = setTimeout(function () { ui.pendientes.delete(id); mal(new Error('tiempo agotado')); }, 15000);
    ui.pendientes.set(id, function (m) {
      clearTimeout(t);
      if (m.error) mal(new Error(m.error)); else ok(m.bytes);
    });
    figma.ui.postMessage({ tipo: 'decodificar', url: url, id: id });
  });
}

/** Límite de cada descarga: si la red se queda colgada, la foto pasa a su rectángulo de reserva */
var ESPERA_IMAGEN = 20000;
/** @template T @param {Promise<T>} promesa @param {number} ms @returns {Promise<T>} */
function conLimite(promesa, ms) {
  /** @type {any} */
  var reloj = null;
  var limite = new Promise(function (ok, mal) { reloj = setTimeout(function () { mal(new Error('tiempo agotado')); }, ms); });
  return Promise.race([promesa, limite]).then(
    function (r) { clearTimeout(reloj); return /** @type {T} */ (r); },
    function (e) { clearTimeout(reloj); throw e; }
  );
}

/** @type {Map<string, Promise<Image|null>>} */
var cacheImagenes = new Map();
/** @param {string} clave @returns {Promise<Image|null>} */
function cargarImagen(clave) {
  if (cacheImagenes.has(clave)) return /** @type {Promise<Image|null>} */ (cacheImagenes.get(clave));
  var im = DATOS.imagenes[clave];
  var p = (async function () {
    if (!im) return null;
    try {
      return await conLimite(figma.createImageAsync(im.url1), ESPERA_IMAGEN);
    } catch (e1) {
      try {
        // La copia JPG/PNG aún no está publicada: la original de la web (PNG/JPG tal cual; WebP, decodificada)
        if (/\.(png|jpe?g)$/i.test(im.url2)) return await conLimite(figma.createImageAsync(im.url2), ESPERA_IMAGEN);
        var bytes = await decodificarEnUI(im.url2);
        return figma.createImage(bytes);
      } catch (e2) {
        return null;
      }
    }
  })();
  cacheImagenes.set(clave, p);
  return p;
}

async function rellenarImagenes() {
  var lista = estado.imagenes.slice();
  var hechos = 0;
  var siguiente = 0;
  async function trabajador() {
    while (siguiente < lista.length) {
      var it = lista[siguiente++];
      var img = await cargarImagen(it.clave);
      hechos++;
      if (hechos % 10 === 0) avisar('Fotos: ' + hechos + ' de ' + lista.length, 1200);
      if (it.nodo.removed) continue;
      var geo = /** @type {GeometryMixin} */ (/** @type {unknown} */ (it.nodo));
      if (img) {
        geo.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: /** @type {'FIT'|'FILL'} */ (it.fit) }];
        estado.cuenta.imagenes++;
      } else {
        estado.cuenta.imagenesFallidas++;
        reservaImagen(it.nodo, it.clave);
      }
    }
  }
  var trabajadores = [];
  for (var i = 0; i < 6; i++) trabajadores.push(trabajador());
  await Promise.all(trabajadores);
}

/** ¿El nodo es (o está dentro de) una instancia? A sus capas no se les pueden añadir hijos */
/** @param {BaseNode} nodo */
function dentroDeInstancia(nodo) {
  for (var a = /** @type {BaseNode|null} */ (nodo); a; a = a.parent) { if (a.type === 'INSTANCE') return true; }
  return false;
}

/** Rectángulo de reserva con el nombre del archivo */
/** @param {SceneNode} nodo @param {string} clave */
function reservaImagen(nodo, clave) {
  var geo = /** @type {GeometryMixin} */ (/** @type {unknown} */ (nodo));
  geo.fills = [{ type: 'SOLID', color: { r: 0.067, g: 0.067, b: 0.075 } }];
  // En la foto de una tarjeta (capa de una instancia) se queda solo el relleno: no admite el texto
  if (nodo.type !== 'FRAME' || dentroDeInstancia(nodo)) return;
  /** @type {TextNode|null} */
  var t = null;
  try {
    t = figma.createText();
    t.fontName = fuente('Roboto Mono|Regular');
    t.characters = 'img/' + clave + '\n(sin conexión)';
    t.fontSize = 11;
    t.fills = [pintura({ v: 'Color/Texto/Terciario' })];
    t.textAlignHorizontal = 'CENTER';
    nodo.appendChild(t);
    if (nodo.layoutMode !== 'NONE') t.layoutPositioning = 'ABSOLUTE';
    t.x = Math.max(0, (nodo.width - t.width) / 2);
    t.y = Math.max(0, (nodo.height - t.height) / 2);
  } catch (e) {
    // que no quede un texto suelto en la página
    if (t && !t.removed) { try { t.remove(); } catch (e2) { /* ya no está */ } }
  }
}

// -----------------------------------------------------------------------------
// 9. Principal
// -----------------------------------------------------------------------------
async function principal() {
  var inicio = Date.now();
  avisar('Preparando la guía de estilo…', 2000);
  await cargarFuentes();
  avisar('Variables y estilos…', 1500);
  await crearVariables();
  await crearEstilos();
  var paginas = prepararPaginas();
  await figma.setCurrentPageAsync(paginas.componentes);
  await crearComponentes(paginas.componentes);
  await figma.setCurrentPageAsync(paginas.guia);
  var marcos = await crearGuia(paginas.guia);
  avisar('Cargando las fotos de producto…', 2000);
  await rellenarImagenes();
  if (marcos.length) figma.viewport.scrollAndZoomIntoView([marcos[0]]);
  var c = estado.cuenta;
  var seg = Math.round((Date.now() - inicio) / 1000);
  var resumen = 'AURA listo en ' + seg + ' s: ' + c.variables + ' variables (' + c.variablesNuevas + ' nuevas) · '
    + c.estilos + ' estilos · ' + c.componentes + ' componentes (' + c.variantes + ' variantes) · '
    + c.marcos + ' marcos de la guía · ' + c.imagenes + ' fotos'
    + (c.imagenesFallidas ? ' (' + c.imagenesFallidas + ' sin cargar: rectángulo de reserva)' : '')
    + (estado.paginasNuevas.length ? ' · Ya existían: creadas «' + estado.paginasNuevas.join('» y «') + '» (variables y estilos actualizados por nombre)' : '')
    + (estado.avisos.length > estado.paginasNuevas.length ? ' · ' + (estado.avisos.length - estado.paginasNuevas.length) + ' avisos (consola)' : '');
  if (estado.avisos.length) console.warn('AURA · avisos:\n' + estado.avisos.join('\n'));
  console.log(resumen);
  figma.closePlugin(resumen);
}

principal().catch(function (e) {
  console.error(e);
  figma.closePlugin('AURA · error: ' + (e && e.message ? e.message : e));
});
