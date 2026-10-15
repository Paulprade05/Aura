// Genera los tokens de AURA para Figma a partir de una sola definición:
//   guia-de-estilo/figma/aura-tokens.json               → W3C Design Tokens (DTCG 2025.10, como lo importa Figma)
//   guia-de-estilo/figma/aura-tokens.tokens-studio.json → Tokens Studio for Figma ("value"/"type")
// Los valores salen de css/aura.css (:root y las clases de componente), medidos en el navegador a 1440 y 390 px.
// Uso (desde guia-de-estilo/figma/): node gen-tokens.mjs  · después, node build.mjs para rehacer el plugin
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const REPO = process.argv[2] || path.resolve(AQUI, '../..');   // raíz del repositorio (este archivo está en guia-de-estilo/figma/)
const SALIDA = path.join(REPO, 'guia-de-estilo/figma');

/* ---------------------------------------------------------------------------
   Utilidades de color
   --------------------------------------------------------------------------- */
const r6 = (n) => Math.round(n * 1e6) / 1e6;
const r3 = (n) => Math.round(n * 1e3) / 1e3;
function leerColor(s) {
  s = s.trim();
  let m = /^#([0-9a-f]{6})$/i.exec(s);
  if (m) {
    const h = m[1];
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
  }
  m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(s);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  throw new Error('Color no reconocido: ' + s);
}
const hex2 = (n) => n.toString(16).padStart(2, '0');
const hex6 = (c) => '#' + hex2(c.r) + hex2(c.g) + hex2(c.b);
const esAlias = (v) => typeof v === 'string' && /^\{[^{}]+\}$/.test(v);
const colorDTCG = (v) => {
  if (esAlias(v)) return v;
  const c = leerColor(v);
  return { colorSpace: 'srgb', components: [r6(c.r / 255), r6(c.g / 255), r6(c.b / 255)], alpha: c.a, hex: hex6(c) };
};
const colorTS = (v) => {
  if (esAlias(v)) return v;
  const c = leerColor(v);
  return c.a === 1 ? hex6(c) : `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`;
};

/* ---------------------------------------------------------------------------
   Constructores de tokens (hoja = objeto con t: tipo)
   d: descripción (uso) · css: variable o clase de aura.css · ts: tipo de Tokens Studio
   --------------------------------------------------------------------------- */
const C = (v, d, css) => ({ t: 'color', v, d, css });
const Dm = (ts) => (v, d, css) => ({ t: 'dimension', v, d, css, ts });
const Radio = Dm('borderRadius');
const Esp = Dm('spacing');
const Tam = Dm('sizing');
const Borde = Dm('borderWidth');
const Dim = Dm('dimension');
const N = (v, d, css) => ({ t: 'number', v, d, css, ts: 'number' });
const Op = (v, d, css) => ({ t: 'number', v, d, css, ts: 'opacity' });
const Ms = (ms, d, css) => ({ t: 'duration', v: ms, d, css });
const Bz = (v, d, css) => ({ t: 'cubicBezier', v, d, css });
const Fam = (v, d, css, figma) => ({ t: 'fontFamily', v, d, css, figma });
const Peso = (v, d, figma) => ({ t: 'fontWeight', v, d, figma });
// Sombra: capas [x, y, blur, spread, color, inset?]
const Sombra = (capas, d, css) => ({ t: 'shadow', v: capas, d, css });
const Degradado = (angulo, paradas, d, css) => ({ t: 'gradient', v: paradas, angulo, d, css, ext: { anguloCSS: `${angulo}deg` } });
const Transicion = (dur, curva, d, css) => ({ t: 'transition', v: { dur, curva }, d, css });

/* ---------------------------------------------------------------------------
   1. COLOR
   --------------------------------------------------------------------------- */
const color = {
  $d: 'Paleta de AURA (modo oscuro único). Valores de :root en css/aura.css; usos de la guía v2, capítulo 01.',
  Fondo: {
    Principal: C('#000000', 'Lienzo principal y contraste máximo.', '--bg-main'),
    Secundario: C('#161617', 'Tarjetas, paneles y agrupación de contenido (Elevación / 01).', '--bg-secondary'),
    Elevado: C('#1d1d1f', 'Capas sobre una tarjeta; popover sólido; tarjeta elevada y de acceso.', '--bg-elevated'),
    Franja: C('#0a0a0b', 'Secciones alternas, casi negras (.aura-section--band).', '--bg-band'),
    Pie: C('#111113', 'Fondo del pie global.', '--bg-footer'),
  },
  Acento: {
    Azul: C('#0071e3', 'Acciones, foco y estados interactivos: relleno del primario (blanco encima, 4,70:1) y contornos. Como texto no llega a AA (4,47:1).', '--accent'),
    Hover: C('#0074e8', 'Relleno del primario al pasar el ratón (4,50:1 con blanco).', '--accent-hover'),
    Texto: C('#1787f7', 'Azul para TEXTO: enlaces, iconos, foco y contorno del secundario en hover (5,85:1 sobre negro, 5,03:1 sobre tarjeta).', '--accent-link'),
    'Texto hover': C('#4aa3ff', 'Etiqueta del secundario en hover y en foco, y enlaces sin clase (7,97:1 sobre negro).', '--accent-link-hover'),
    Brillante: C('#1787f7', 'Solo trazos: borde del secundario en hover. Hoy vale lo mismo que Color/Acento/Texto (#1787f7), pero es otro token en aura.css: cambiar uno no cambia el otro.', '--accent-bright'),
    Suave: C('rgba(0, 113, 227, 0.16)', 'Fondo de lo elegido (opción, chip activo, paso actual) y tinte del secundario.', '--accent-soft'),
    Anillo: C('rgba(0, 113, 227, 0.4)', 'Anillo de 4 px de los campos en foco (guía §04).', '--accent-ring'),
    'Selección': C('rgba(0, 113, 227, 0.6)', 'Fondo del texto seleccionado (texto blanco encima).', '::selection'),
  },
  Dorado: {
    Base: C('#e5a93c', 'Distinción, metadatos y acentos selectivos: antetítulos, insignias, cronología (10,07:1 sobre negro). Nunca rellena una superficie.', '--gold'),
    Suave: C('rgba(229, 169, 60, 0.14)', 'Fondo de insignias, iconos de nota y de AuraCare+.', '--gold-soft'),
  },
  Texto: {
    Primario: C('#f5f5f7', 'Títulos y contenido de alta prioridad (19,29:1 sobre negro).', '--text-primary'),
    Secundario: C('#a1a1a6', 'Cuerpo, notas y contexto auxiliar (8,16:1 sobre negro; 7,03:1 sobre tarjeta).', '--text-secondary'),
    Terciario: C('#8e8e93', 'Notas, metadatos y etiquetas mono (6,44:1 sobre negro).', '--text-tertiary'),
    Placeholder: C('#98989d', 'Ejemplo dentro del campo (6,30:1; ≥ 4,7:1 también en foco).', '--text-placeholder'),
    Desactivado: C('#6e6e73', 'Etiquetas de controles desactivados (3,01:1 sobre #252528).', '--text-disabled'),
    Blanco: C('#ffffff', 'Etiqueta sobre el azul, hover de enlaces de navegación y elementos activos.', '--bs-emphasis-color'),
    Negro: C('#000000', 'Etiqueta del botón inverso.', '.aura-btn--inverse'),
  },
  Estado: {
    Completado: C('#30d158', 'Confirmaciones y requisitos cumplidos. Siempre con icono y texto.', '--ok'),
    Aviso: C('#ffd60a', 'Advertencias antes de un problema.', '--warn'),
    Error: C('#ff453a', 'Validación, sistema y acciones destructivas (6,16:1 sobre negro).', '--error'),
    'Completado suave': C('rgba(48, 209, 88, 0.14)', 'Fondo de la insignia de completado.', '.aura-badge--ok'),
    'Aviso suave': C('rgba(255, 214, 10, 0.12)', 'Fondo de la insignia de aviso.', '.aura-badge--warn'),
    'Error suave': C('rgba(255, 69, 58, 0.14)', 'Fondo de la insignia de error y hover del botón destructivo.', '.aura-badge--error'),
    'Completado borde': C('rgba(48, 209, 88, 0.45)', 'Borde del mensaje de confirmación.', '.aura-alert--ok'),
    'Aviso borde': C('rgba(255, 214, 10, 0.45)', 'Borde del mensaje de aviso.', '.aura-alert--warn'),
    'Error borde': C('rgba(255, 69, 58, 0.55)', 'Borde del mensaje de error.', '.aura-alert--error'),
    'Válido borde': C('rgba(48, 209, 88, 0.7)', 'Borde del campo válido (.is-valid).', '.aura-field.is-valid'),
    'Destructivo borde': C('rgba(255, 69, 58, 0.7)', 'Contorno del botón destructivo.', '.aura-btn--destructive'),
    'Anillo de error': C('rgba(255, 69, 58, 0.32)', 'Anillo de 4 px de un campo con error en foco.', '.aura-field.is-invalid :focus'),
  },
  'Línea': {
    Fina: C('rgba(255, 255, 255, 0.1)', 'Separadores de lista y borde de tarjetas, teselas y tablas.', '--hairline'),
    Marcada: C('rgba(255, 255, 255, 0.18)', 'Bordes visibles: chips, insignias de tabla, pasos.', '--hairline-strong'),
    'Filo de luz': C('rgba(255, 255, 255, 0.16)', 'Borde superior de un material: la luz lo toca.', '--edge-light'),
    Campo: C('rgba(255, 255, 255, 0.36)', 'Límite de campos, casillas y opciones (3,14:1 sobre negro; 3,35:1 sobre tarjeta).', '--field-border'),
    'Campo hover': C('rgba(255, 255, 255, 0.5)', 'El mismo límite con el ratón encima (5,32:1).', '--field-border-hover'),
  },
  Relleno: {
    1: C('rgba(255, 255, 255, 0.04)', 'Reposo: chips, opciones, casillas, cifras en tarjeta.', '--fill-1'),
    2: C('rgba(255, 255, 255, 0.08)', 'Segmentado, icono de característica, hover de filas.', '--fill-2'),
    3: C('rgba(255, 255, 255, 0.12)', 'Capa de hover del botón fantasma y del botón de icono; pulsado.', '--fill-3'),
    Elegido: C('rgba(255, 255, 255, 0.16)', 'Pastilla elegida del segmentado.', '--fill-selected'),
    Desactivado: C('#252528', 'Botón desactivado (primario, secundario e inverso).', '--fill-disabled'),
    'Inverso hover': C('#e8e8ed', 'Hover del botón inverso.', '--inverse-hover'),
    'Icono sólido hover': C('rgba(255, 255, 255, 0.2)', 'Hover del botón de icono sólido.', '.aura-icon-btn--solid:hover'),
    Tirador: C('rgba(255, 255, 255, 0.32)', 'Tirador de la hoja inferior.', '.aura-sheet__grabber'),
  },
  Campo: {
    Fondo: C('rgba(255, 255, 255, 0.085)', 'Campo en reposo sobre la base negra (se ve #161617).', '--field-bg'),
    'Fondo foco': C('rgba(255, 255, 255, 0.12)', 'Campo en foco: gana «cristal» (≈ #1f1f24).', '--field-bg-focus'),
    'Fondo en superficie': C('{Color.Relleno.1}', 'Campo en reposo dentro de una tarjeta, hoja o popover (ya elevados).', '--field-bg (en superficie)'),
    'Fondo foco en superficie': C('rgba(255, 255, 255, 0.07)', 'Campo en foco dentro de una superficie elevada.', '--field-bg-focus (en superficie)'),
    Borde: C('{Color.Línea.Campo}', 'Borde del campo en reposo.', '.aura-input'),
    'Borde hover': C('{Color.Línea.Campo hover}', 'Borde del campo con el ratón encima.', '.aura-input:hover'),
    'Borde foco': C('{Color.Acento.Texto}', 'Borde de 1 px del campo en foco.', '.aura-input:focus'),
    'Borde error': C('{Color.Estado.Error}', 'Borde del campo con error.', '.aura-field.is-invalid'),
    'Borde desactivado': C('{Color.Línea.Fina}', 'Borde del campo desactivado (fondo transparente).', '.aura-input:disabled'),
    Etiqueta: C('{Color.Texto.Secundario}', 'Etiqueta en reposo (Inter 13 / 500).', '.aura-field__label'),
    'Etiqueta foco': C('{Color.Acento.Texto}', 'Etiqueta del campo en foco.', '.aura-field:focus-within .aura-field__label'),
    'Etiqueta error': C('{Color.Estado.Error}', 'Etiqueta del campo con error (con el mensaje y su icono debajo).', '.aura-field.is-invalid .aura-field__label'),
    Icono: C('{Color.Texto.Terciario}', 'Icono de apoyo en reposo (azul en foco, rojo en error).', '.aura-field__icon'),
    'Icono foco': C('{Color.Acento.Texto}', 'Icono de apoyo del campo en foco.', '.aura-field:focus-within .aura-field__icon'),
    'Icono error': C('{Color.Estado.Error}', 'Icono de apoyo del campo con error.', '.aura-field.is-invalid .aura-field__icon'),
    Ayuda: C('{Color.Texto.Terciario}', 'Texto de ayuda bajo el campo.', '.aura-field__help'),
    'Filo de foco': C('{Color.Línea.Fina}', 'Filo claro interior (inset 0 1px) del campo en foco.', '.aura-input:focus'),
  },
  'Botón': {
    Primario: {
      Fondo: C('{Color.Acento.Azul}', 'Relleno y borde del primario.', '.aura-btn--primary'),
      'Fondo hover': C('{Color.Acento.Hover}', 'Relleno del primario en hover (el halo pasa de .55 a 1).', '.aura-btn--primary:hover'),
      Texto: C('{Color.Texto.Blanco}', 'Etiqueta del primario.', '.aura-btn--primary'),
    },
    Secundario: {
      Borde: C('{Color.Acento.Azul}', 'Contorno del secundario en reposo (4,5:1 sobre negro como límite de control).', '.aura-btn--secondary'),
      'Borde hover': C('{Color.Acento.Brillante}', 'Contorno del secundario en hover.', '.aura-btn--secondary:hover'),
      Texto: C('{Color.Acento.Texto}', 'Etiqueta del secundario.', '.aura-btn--secondary'),
      'Texto hover': C('{Color.Acento.Texto hover}', 'Etiqueta del secundario en hover y en foco.', '.aura-btn--secondary:hover'),
      'Fondo hover': C('{Color.Acento.Suave}', 'Tinte azul del secundario en hover y en foco.', '.aura-btn--secondary:hover'),
    },
    Inverso: {
      Fondo: C('{Color.Texto.Primario}', 'Relleno y borde del inverso (tema claro).', '.aura-btn--inverse'),
      'Fondo hover': C('{Color.Relleno.Inverso hover}', 'Relleno del inverso en hover.', '.aura-btn--inverse:hover'),
      Texto: C('{Color.Texto.Negro}', 'Etiqueta del inverso.', '.aura-btn--inverse'),
    },
    Fantasma: {
      Texto: C('{Color.Texto.Primario}', 'Etiqueta del botón fantasma (terciaria: «Cancelar»).', '.aura-btn--ghost'),
      'Fondo hover': C('{Color.Relleno.3}', 'Capa de hover del fantasma.', '.aura-btn--ghost:hover'),
    },
    Destructivo: {
      Texto: C('{Color.Estado.Error}', 'Etiqueta del destructivo (solo lo irreversible).', '.aura-btn--destructive'),
      Borde: C('{Color.Estado.Destructivo borde}', 'Contorno del destructivo.', '.aura-btn--destructive'),
      'Fondo hover': C('{Color.Estado.Error suave}', 'Capa de hover del destructivo.', '.aura-btn--destructive:hover'),
    },
    Desactivado: {
      Fondo: C('{Color.Relleno.Desactivado}', 'Relleno de cualquier botón desactivado (sin borde).', '.aura-btn:disabled'),
      Texto: C('{Color.Texto.Desactivado}', 'Etiqueta de cualquier botón desactivado.', '.aura-btn:disabled'),
      'Borde destructivo': C('{Color.Línea.Marcada}', 'El destructivo desactivado conserva un contorno neutro.', '.aura-btn--destructive:disabled'),
    },
  },
  Foco: {
    Contorno: C('{Color.Acento.Texto}', 'Contorno de foco de 2 px a 3 px del elemento (:focus-visible).', ':focus-visible'),
    Anillo: C('{Color.Acento.Anillo}', 'Anillo de foco de campos, casillas y muestras.', '--accent-ring'),
  },
  Cristal: {
    Barra: C('rgba(0, 0, 0, 0.72)', 'Barra global (negra) con el filtro regular; etiqueta sobre una foto.', '--glass-nav-bg'),
    'Menú': C('rgba(0, 0, 0, 0.86)', 'Menú móvil a pantalla completa (negro) con el filtro grueso.', '--glass-nav-thick-bg'),
    Fino: C('rgba(29, 29, 31, 0.72)', 'Material fino: avisos y tarjeta de cristal (desenfoque 16 px).', '--glass-thin-bg'),
    Regular: C('rgba(22, 22, 23, 0.74)', 'Material regular: popover, barra local, panel de cifras sobre foto (desenfoque 24 px).', '--glass-regular-bg'),
    Grueso: C('rgba(22, 22, 23, 0.88)', 'Material grueso: hoja, buscador, barra de compra (desenfoque 40 px).', '--glass-thick-bg'),
    'Aviso sólido': C('#2a2a2d', 'Aviso con una tarea modal abierta (nunca cristal sobre cristal).', 'html.aura-lock .aura-toast'),
    Velo: C('rgba(0, 0, 0, 0.58)', 'Velo de las tareas modales (hoja, buscador, menú).', '--scrim'),
  },
  Vibrancia: {
    Etiqueta: C('rgba(245, 245, 247, 0.82)', 'Texto sobre material: controles y texto de apoyo con peso (enlaces de barra).', '--vibrant-label'),
    Secundario: C('rgba(245, 245, 247, 0.74)', 'Texto secundario dentro de un material.', '--vibrant-secondary'),
    Terciario: C('rgba(245, 245, 247, 0.62)', 'Texto terciario y placeholder dentro de un material.', '--vibrant-tertiary'),
  },
  Luz: {
    'Panel de producto': C('rgba(0, 113, 227, 0.16)', 'Halo radial (70 % × 60 % en 50 % 62 %) tras la foto de la tarjeta de modelo y de familia, sobre #000.', '.aura-product-card__media'),
    'Galería': C('rgba(0, 113, 227, 0.22)', 'Halo radial (60 % × 55 % en 50 % 56 %) del configurador y de los héroes con halo.', '.aura-gallery · .aura-media--halo'),
    'Sección': C('rgba(0, 113, 227, 0.18)', 'Resplandor de fondo de una sección (.aura-halo), hasta 30 rem de radio.', '.aura-halo'),
    Cifra: C('rgba(0, 113, 227, 0.26)', 'Resplandor circular de la gran cifra.', '.aura-stat--xl'),
    Hueco: C('rgba(0, 113, 227, 0.24)', 'Resplandor del hueco de imagen (sobre degradado #111113 → #08080a).', '.aura-slot'),
  },
};

/* Acabados de producto (data.js): aproximaciones para pintar las muestras */
function acabados() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(REPO, 'js/data.js'), 'utf8'), ctx);
  const datos = ctx.window.AURA_DATA;
  const grupo = { $d: 'Acabados de cada modelo (js/data.js). Son aproximaciones para pintar las muestras de color, no colores de interfaz. En $extensions, las fotos reales de cada acabado (la primera es la de tarjeta) y si es el acabado por defecto.' };
  for (const p of datos.products) {
    const nombre = p.name.replace(/\./g, ',');
    grupo[nombre] = {};
    for (const c of p.colors) {
      const fotos = (p.photos && p.photos[c.id]) || [];
      const h = C(c.hex, `Muestra «${c.name}» de ${p.name}.` + (fotos.length ? '' : ' Sin foto propia: la web enseña la del acabado por defecto («Imagen en …»).'), `data.js · ${p.id}/${c.id}`);
      h.ext = {
        producto: p.id,
        acabado: c.id,
        porDefecto: p.imageColor === c.id,
        fotos: fotos.map((f) => ({ archivo: `img/${f.slot}.webp`, vista: f.vista })),
      };
      grupo[nombre][c.name] = h;
    }
  }
  return grupo;
}
color['Acabado'] = acabados();

/* ---------------------------------------------------------------------------
   2. RADIOS
   --------------------------------------------------------------------------- */
const radio = {
  $d: 'Radios (aura.css :root). 20 px en superficies grandes, 12 px en tarjetas pequeñas y tabla.',
  '2XS': Radio(6, 'Solo la caja de las casillas de verificación (20 px de lado).', '--radius-2xs'),
  XS: Radio(8, 'Etiquetas, filas de lista, insignia mono, icono de nota y de AuraCare+.', '--radius-xs'),
  SM: Radio(12, 'Campos, tabla, tarjetas pequeñas y de cifra, mensajes, icono de característica.', '--radius-sm'),
  MD: Radio(16, 'Opciones, notas, avisos, miniaturas, hueco de imagen, panel de cifras sobre foto.', '--radius-md'),
  LG: Radio(20, 'Tarjetas, teselas, imágenes, popover, galería, tarjeta de acceso.', '--radius-lg'),
  XL: Radio(28, 'Solo hojas y buscador (overlays grandes).', '--radius-xl'),
  'Píldora': Radio(999, 'Botones, chips, insignias, segmentado, contador.', '--radius-pill'),
};

/* ---------------------------------------------------------------------------
   3. ESPACIADO (escala con los valores que usa aura.css + usos con nombre)
   --------------------------------------------------------------------------- */
const escala = {};
for (const px of [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 72, 80, 104, 120]) {
  escala[px] = Esp(px, `${px / 16} rem.`, `${px / 16}rem`);
}
const E = (px) => `{Espaciado.Escala.${px}}`;
const espaciado = {
  $d: 'Espaciado en px (1 rem = 16 px). Los valores fluidos (clamp) se dan a 1440 px y, en «Móvil», a 390 px.',
  Escala: escala,
  'Margen lateral': Esp(E(40), 'Margen lateral del contenedor: clamp(1.25rem, 4vw, 2.5rem) → 40 px a 1440.', '--gutter'),
  Hueco: Esp(E(20), 'Hueco de rejillas, bento, tarjetas y carrusel.', '--gap'),
  'Sección': Esp(E(120), 'Relleno vertical de .aura-section: clamp(4rem, 9vw, 7.5rem).', '.aura-section'),
  'Sección compacta': Esp(E(64), 'Relleno vertical de .aura-section--tight (tareas y notas al pie).', '.aura-section--tight'),
  'Héroe': Esp(115.2, 'Relleno vertical del héroe: clamp(3.5rem, 8vw, 7.5rem) → 115,2 px a 1440.', '.aura-hero'),
  Bloque: Esp(E(104), 'Entre dos bloques de una misma sección: clamp(3.5rem, 8vw, 6.5rem).', '--space-block'),
  Cifras: Esp(E(64), 'Antes y después de una fila de cifras: clamp(2.5rem, 5vw, 4rem).', '--space-stats'),
  'Cabecera de sección': Esp(E(14), 'Hueco entre antetítulo, titular y entradilla de la cabecera de sección.', '.aura-section-head'),
  'Bajo la cabecera': Esp(E(56), 'Margen inferior de la cabecera de sección: clamp(2rem, 4vw, 3.5rem).', '.aura-section-head'),
  'Columnas del héroe': Esp(E(72), 'Hueco entre texto e imagen del héroe y del bloque texto + imagen: clamp(2rem, 5vw, 5rem).', '.aura-hero__inner · .aura-split'),
  'Columnas de tienda': Esp(57.6, 'Hueco entre contenido y columna lateral: clamp(2rem, 4vw, 4rem) → 57,6 px a 1440.', '.aura-layout'),
  'Texto del héroe': Esp(E(20), 'Hueco entre las piezas del texto del héroe y del bloque texto + imagen.', '.aura-hero__copy'),
  Pila: Esp(E(16), 'Hueco por defecto de .aura-stack.', '--stack'),
  Grupo: Esp(E(12), 'Hueco por defecto de .aura-cluster (filas de botones).', '--cluster'),
  Formulario: Esp(E(18), 'Hueco entre campos de un formulario.', '.aura-form'),
  'Columnas de formulario': Esp(E(12), 'Hueco entre las dos columnas de una fila de formulario.', '.aura-form__row'),
  Componente: {
    'Botón horizontal': Esp(E(24), 'Relleno lateral del botón (48 / 999 / 24).', '.aura-btn'),
    'Botón vertical': Esp(E(8), 'Relleno vertical del botón (el alto lo fija el mínimo de 48 px).', '.aura-btn'),
    'Botón hueco': Esp(E(8), 'Hueco entre etiqueta e icono del botón.', '.aura-btn'),
    'Campo horizontal': Esp(E(16), 'Relleno lateral del campo (44 px con icono, 48 px con el ojo).', '.aura-input'),
    'Campo vertical': Esp(15, 'Relleno vertical del campo (alto mínimo 56 px).', '.aura-input'),
    'Campo hueco': Esp(E(8), 'Hueco entre etiqueta, campo y ayuda.', '.aura-field'),
    'Campo con icono': Esp(44, 'Relleno izquierdo del campo con icono de apoyo.', '.aura-field__icon ~ .aura-input'),
    'Insignia horizontal': Esp(E(10), 'Relleno lateral de la insignia.', '.aura-badge'),
    'Insignia vertical': Esp(E(4), 'Relleno vertical de la insignia.', '.aura-badge'),
    'Chip horizontal': Esp(E(12), 'Relleno lateral del chip informativo (14 px si es pulsable).', '.aura-chip'),
    'Segmentado marco': Esp(E(4), 'Relleno del carril del segmentado.', '.aura-segmented'),
    'Segmentado ítem': Esp(E(18), 'Relleno lateral de cada opción del segmentado.', '.aura-segmented__item'),
    'Segmentado hueco': Esp(E(2), 'Hueco entre opciones del segmentado.', '.aura-segmented'),
    'Opción horizontal': Esp(E(20), 'Relleno lateral de la tarjeta-opción.', '.aura-option__card'),
    'Opción vertical': Esp(E(14), 'Relleno vertical de la tarjeta-opción.', '.aura-option__card'),
    'Tarjeta': Esp(E(32), 'Relleno de .aura-card: clamp(1.25rem, 2.5vw, 2rem).', '.aura-card'),
    Tesela: Esp(E(28), 'Relleno de la tesela: clamp(1.25rem, 2.4vw, 1.75rem).', '.aura-tile'),
    'Tarjeta de producto': Esp(E(24), 'Relleno del cuerpo de la tarjeta de modelo y de familia: clamp(1.125rem, 2vw, 1.5rem).', '.aura-product-card__body'),
    'Tarjeta de producto hueco': Esp(E(8), 'Hueco entre las piezas del cuerpo de la tarjeta de modelo.', '.aura-product-card__body'),
    Resumen: Esp(E(28), 'Relleno del resumen pegajoso: clamp(1.25rem, 2.5vw, 1.75rem).', '.aura-summary'),
    Acceso: Esp(44, 'Relleno de la tarjeta de inicio de sesión: clamp(1.5rem, 5vw, 2.75rem).', '.aura-auth-card'),
    'Galería': Esp(E(48), 'Relleno de la galería del configurador: clamp(1rem, 4vw, 3rem).', '.aura-gallery'),
    Popover: Esp(E(16), 'Relleno del popover.', '.aura-popover'),
    'Nota vertical': Esp(E(18), 'Relleno vertical de la nota de uso.', '.aura-note'),
    'Nota horizontal': Esp(E(20), 'Relleno lateral de la nota de uso.', '.aura-note'),
    'Mensaje horizontal': Esp(E(16), 'Relleno lateral del mensaje de formulario.', '.aura-alert'),
    'Mensaje vertical': Esp(E(14), 'Relleno vertical del mensaje de formulario.', '.aura-alert'),
    'Pie arriba': Esp(E(64), 'Relleno superior del pie: clamp(2.5rem, 5vw, 4rem).', '.aura-footer'),
    'Pie abajo': Esp(E(32), 'Relleno inferior del pie.', '.aura-footer'),
    'Enlace de barra': Esp(E(14), 'Relleno lateral de cada enlace de la barra global (12 px entre 992 y 1199).', '.aura-nav__link'),
    'Enlace local': Esp(E(10), 'Relleno lateral de cada enlace de la barra local.', '.aura-localnav__link'),
  },
  'Móvil': {
    $d: 'Los mismos usos a 390 px (teléfono de referencia).',
    'Margen lateral': Esp(E(20), 'clamp(1.25rem, 4vw, 2.5rem) a 390 px.', '--gutter'),
    'Sección': Esp(E(64), 'Relleno vertical de .aura-section a 390 px.', '.aura-section'),
    'Sección compacta': Esp(E(40), 'Relleno vertical de .aura-section--tight a 390 px.', '.aura-section--tight'),
    'Héroe': Esp(E(56), 'Relleno vertical del héroe a 390 px.', '.aura-hero'),
    Bloque: Esp(E(56), 'Entre bloques de una sección a 390 px.', '--space-block'),
    Cifras: Esp(E(40), 'Antes y después de las cifras a 390 px.', '--space-stats'),
    'Bajo la cabecera': Esp(E(32), 'Margen inferior de la cabecera de sección a 390 px.', '.aura-section-head'),
    'Columnas del héroe': Esp(E(32), 'Hueco entre texto e imagen (apilados) a 390 px.', '.aura-hero__inner'),
    'Columnas de tienda': Esp(E(32), 'Hueco entre contenido y resumen (apilados) a 390 px.', '.aura-layout'),
    'Tarjeta': Esp(E(20), 'Relleno de .aura-card a 390 px.', '.aura-card'),
    Tesela: Esp(E(20), 'Relleno de la tesela a 390 px.', '.aura-tile'),
    'Tarjeta de producto': Esp(E(18), 'Relleno del cuerpo de la tarjeta de modelo a 390 px.', '.aura-product-card__body'),
    Resumen: Esp(E(20), 'Relleno del resumen a 390 px.', '.aura-summary'),
    Acceso: Esp(E(24), 'Relleno de la tarjeta de acceso a 390 px.', '.aura-auth-card'),
    'Galería': Esp(E(16), 'Relleno de la galería a 390 px.', '.aura-gallery'),
    'Pie arriba': Esp(E(40), 'Relleno superior del pie a 390 px.', '.aura-footer'),
  },
};

/* ---------------------------------------------------------------------------
   4. TAMAÑOS: alturas de componentes, iconos, anchos y puntos de corte
   --------------------------------------------------------------------------- */
const tamano = {
  $d: 'Medidas fijas de los componentes y del layout (px).',
  Alto: {
    'Botón': Tam(48, 'Alto mínimo del botón: un solo tamaño (48 / 999 / 24), no hay --sm.', '.aura-btn'),
    Campo: Tam(56, 'Alto mínimo de campo y selector (texto de 16 px).', '.aura-input'),
    'Área de texto': Tam(120, 'Alto mínimo del área de texto.', '.aura-textarea'),
    'Botón de icono': Tam(44, 'Botón de icono (cerrar, flechas, ojo, cantidad): 44 × 44.', '.aura-icon-btn'),
    'Objetivo táctil': Tam(44, 'Objetivo mínimo en pantallas táctiles.', '(pointer: coarse)'),
    'Objetivo con ratón': Tam(24, 'Objetivo mínimo con puntero fino.', 'WCAG 2.5.8'),
    Chip: Tam(28, 'Chip informativo.', '.aura-chip'),
    'Chip pulsable': Tam(36, 'Chip que es un botón o enlace (44 px en táctil).', 'button.aura-chip'),
    'Segmentado ítem': Tam(40, 'Opción del segmentado (44 px en táctil); el carril mide 48.', '.aura-segmented__item'),
    'Opción': Tam(68, 'Alto mínimo de la tarjeta-opción del configurador.', '.aura-option__card'),
    'Barra global': Tam(56, 'Barra global.', '--nav-h'),
    'Barra local': Tam(52, 'Barra local de las páginas de familia.', '--localnav-h'),
    'Fila de acordeón': Tam(64, 'Alto mínimo de una pregunta del acordeón.', '.aura-accordion__summary'),
    'Fila de menú': Tam(56, 'Enlace del menú móvil.', '.aura-menu__link'),
    'Fila de lista': Tam(44, 'Fila pulsable de popover, buscador y menú secundario.', '.aura-popover__links a'),
    'Enlace del pie': Tam(30, 'Enlace del directorio del pie con ratón (44 en táctil).', '.aura-footer__list a'),
  },
  Icono: {
    Campo: Tam(16, 'Icono de apoyo del campo y tamaño mínimo de un icono suelto.', '.aura-field__icon'),
    Barra: Tam(17, 'Iconos de barras y botones de icono, dentro de su caja de 44 px.', '.aura-nav__action .bi'),
    Tarjeta: Tam(18, 'Icono de característica y de aviso.', '.aura-feature__icon'),
    'Vacío': Tam(28, 'Icono del estado vacío.', '.aura-empty__icon'),
  },
  Contenedor: {
    $d: 'Cajas que alojan un icono.',
    'Característica': Tam(40, 'Pastilla del icono de característica (radio 12).', '.aura-feature__icon'),
    Nota: Tam(36, 'Icono de la nota de uso (radio 8, dorado suave).', '.aura-note__icon'),
    AuraCare: Tam(32, 'Icono de AuraCare+ en la bolsa (radio 8).', '.aura-bag-line__care-icon'),
    'Acordeón': Tam(32, 'Círculo del «+» del acordeón.', '.aura-accordion__icon'),
    'Hueco de imagen': Tam(48, 'Círculo del icono del hueco de imagen.', '.aura-slot__icon'),
    'Vacío': Tam(72, 'Círculo del estado vacío.', '.aura-empty__icon'),
    Paso: Tam(28, 'Número de un paso del checkout.', '.aura-steps__num'),
  },
  Control: {
    Casilla: Tam(20, 'Caja de casilla y radio (radio 6 / círculo).', '.aura-check__box'),
    'Muestra': Tam(32, 'Punto de la muestra de color, dentro de un objetivo de 44 px.', '.aura-swatch__dot'),
    'Muestra objetivo': Tam(44, 'Objetivo de la muestra de color.', '.aura-swatch'),
    'Punto de color': Tam(12, 'Punto informativo de color de la tarjeta de modelo.', '.aura-swatch-list__dot'),
    'Punto del carrusel': Tam(8, 'Punto del carrusel (×1,25 el activo).', '.aura-carousel__dot'),
    Contador: Tam(18, 'Contador de la bolsa.', '.aura-nav__count'),
    'Tirador ancho': Tam(36, 'Tirador de la hoja inferior.', '.aura-sheet__grabber'),
    'Tirador alto': Tam(5, 'Tirador de la hoja inferior.', '.aura-sheet__grabber'),
  },
  Marca: {
    Normal: Tam(28, 'Logotipo en barra y pie (img/aura-72.png).', '.aura-brand__mark'),
    Grande: Tam(36, 'Logotipo en la tarjeta de acceso.', '.aura-brand--lg .aura-brand__mark'),
  },
  Ancho: {
    Contenedor: Tam(1180, 'Ancho de contenido de .aura-container.', '--container'),
    'Contenedor con márgenes': Tam(1260, 'Contenedor más los dos márgenes laterales a 1440 px.', '.aura-container'),
    'Contenedor estrecho': Tam(800, 'Preguntas frecuentes, texto legal, buscador y formularios largos.', '.aura-container--narrow'),
    'Contenedor ancho': Tam(1440, 'Bloques que piden más anchura; también el ancho de los marcos de la guía.', '.aura-container--wide'),
    'Cabecera de sección': Tam(736, 'Ancho máximo de la cabecera de sección (46 rem).', '.aura-section-head'),
    'Texto del héroe': Tam(544, 'Ancho máximo del texto del héroe partido (34 rem).', '.aura-hero__copy'),
    'Héroe centrado': Tam(832, 'Ancho máximo del texto del héroe centrado y de la cita (52 rem).', '.aura-hero--center .aura-hero__copy'),
    'Imagen centrada': Tam(960, 'Ancho máximo de la imagen del héroe centrado (60 rem).', '.aura-hero--center .aura-hero__media'),
    'Columna lateral': Tam(384, 'Columna lateral de bolsa, checkout y cuenta (entre 320 y 384).', '.aura-layout--aside'),
    'Columna lateral mínima': Tam(320, 'Mínimo de la columna lateral.', '.aura-layout--aside'),
    'Popover mínimo': Tam(256, 'Ancho mínimo del popover.', '.aura-popover'),
    'Popover máximo': Tam(384, 'Ancho máximo del popover.', '.aura-popover'),
    'Popover de bolsa': Tam(352, 'Popover de la bolsa.', '.aura-bag-popover'),
    Avisos: Tam(400, 'Columna de avisos desde 576 px.', '.aura-toasts'),
    'Hoja lateral': Tam(448, 'Cajón lateral desde 768 px.', '.aura-sheet__panel'),
    'Hoja inferior': Tam(640, 'Hoja inferior centrada desde 768 px.', '.aura-sheet--bottom'),
    Acceso: Tam(520, 'Tarjeta de inicio de sesión.', '.aura-auth-card'),
    'Acceso ancho': Tam(560, 'Tarjeta de registro.', '.aura-auth-card--wide'),
    'Tabla mínima': Tam(672, 'Ancho mínimo de la tabla comparativa (544 por debajo de 576 px).', '.aura-table'),
    'Diapositiva': Tam(416, 'Diapositiva del carrusel: min(84 %, 26 rem).', '--aura-slide'),
    'Diapositiva ancha': Tam(864, 'Diapositiva del carrusel ancho: min(88 %, 54 rem).', '.aura-carousel--wide'),
  },
  'Punto de corte': {
    $d: 'Anchos de ventana donde cambia el layout (los de las rejillas van en em: crecen con el texto).',
    'Teléfono': Tam(390, 'Teléfono de referencia: una columna, márgenes de 20 px.', '390 px'),
    SM: Tam(576, 'Filas de formulario a dos columnas; avisos a la derecha.', '≥ 576 px (36 em)'),
    MD: Tam(768, 'Hoja → cajón lateral; .aura-grid--3 a tres columnas.', '≥ 768 px (48 em)'),
    LG: Tam(992, 'Héroe a dos columnas, barra global con enlaces, resumen pegajoso.', '≥ 992 px'),
    XL: Tam(1200, '«Iniciar sesión» visible, .aura-grid--4 en una fila.', '≥ 1200 px (75 em)'),
    Escritorio: Tam(1440, 'Escritorio de referencia (los valores de estos tokens).', '1440 px'),
  },
};

/* ---------------------------------------------------------------------------
   5. BORDES, OPACIDAD, CAPAS
   --------------------------------------------------------------------------- */
const borde = {
  $d: 'Grosores de línea.',
  'Línea': Borde(1, 'Bordes de tarjetas, campos, botones y separadores.', 'border: 1px'),
  'Contorno de foco': Borde(2, 'Contorno de :focus-visible (3 px con «más contraste»).', ':focus-visible'),
  'Separación del foco': Dim(3, 'Separación entre el elemento y su contorno de foco.', 'outline-offset'),
  'Anillo de foco': Borde(4, 'Anillo azul al 40 % de los campos en foco.', '.aura-input:focus'),
};
const opacidad = {
  $d: 'Opacidades (0–1). En Figma, la opacidad de una capa enlazada a una variable va en %: multiplica por 100.',
  Pulsado: Op(0.6, 'Enlaces, barras y filas se atenúan al instante en la pulsación.', '.aura-link:active'),
  'Pulsado sin movimiento': Op(0.7, 'Pulsación de botones y controles con «reducir movimiento» (sin escala).', '@media (prefers-reduced-motion)'),
  'Tarjeta pulsada': Op(0.8, 'Tarjeta, opción o muestra pulsada con «reducir movimiento».', '@media (prefers-reduced-motion)'),
  'Halo en reposo': Op(0.55, 'Opacidad del halo del botón primario en reposo.', '.aura-btn--primary::after'),
  'Halo en hover': Op(1, 'Opacidad del halo del botón primario en hover.', '.aura-btn--primary:hover::after'),
  'Casilla desactivada': Op(0.45, 'Casilla o radio desactivados (y su etiqueta).', '.aura-check__input:disabled ~ *'),
  'Punto inactivo': Op(0.4, 'Punto inactivo del carrusel (3,7:1 sobre negro).', '.aura-carousel__dot::before'),
};
const capa = {
  $d: 'Capas (z-index).',
  'Barra local': N(1020, 'Barra local.', '--z-localnav'),
  'Barra de compra': N(1025, 'Barra de compra fija.', '--z-buybar'),
  'Barra global': N(1030, 'Barra global.', '--z-nav'),
  Overlay: N(1050, 'Buscador y menú móvil.', '--z-overlay'),
  Hoja: N(1060, 'Hoja y cajón.', '--z-sheet'),
  Aviso: N(1080, 'Avisos.', '--z-toast'),
};

/* ---------------------------------------------------------------------------
   6. SOMBRAS, MATERIALES Y DEGRADADOS
   --------------------------------------------------------------------------- */
const sombra = {
  $d: 'Sombras: más profundas cuanto mayor la superficie. Tarjetas y teselas no llevan sombra (las separa su borde).',
  1: Sombra([[0, 1, 2, 0, 'rgba(0, 0, 0, 0.5)']], 'Pastilla del segmentado.', '--shadow-1'),
  2: Sombra([[0, 14, 36, -10, 'rgba(0, 0, 0, 0.7)'], [0, 2, 8, 0, 'rgba(0, 0, 0, 0.4)']], 'Lo que flota a la altura de la página: popover, tarjeta elevada, tarjeta de acceso, paneles de cristal, avisos.', '--shadow-2'),
  3: Sombra([[0, 36, 90, -16, 'rgba(0, 0, 0, 0.85)'], [0, 10, 28, 0, 'rgba(0, 0, 0, 0.55)']], 'Lo que tapa la página: hoja y buscador.', '--shadow-3'),
  'Halo primario': Sombra([[0, 0, 0, 1, 'rgba(23, 135, 247, 0.22)'], [0, 10, 30, -6, 'rgba(0, 113, 227, 0.85)']], 'Halo de energía del botón primario: al 55 % en reposo y al 100 % en hover (es una capa con opacidad).', '--glow-accent'),
  'Foco de campo': Sombra([[0, 0, 0, 4, '{Color.Acento.Anillo}'], [0, 1, 0, 0, 'rgba(255, 255, 255, 0.1)', true]], 'Campo en foco: anillo azul de 4 px pegado al borde + filo claro interior.', '.aura-input:focus'),
  'Foco de error': Sombra([[0, 0, 0, 4, '{Color.Estado.Anillo de error}'], [0, 1, 0, 0, 'rgba(255, 255, 255, 0.1)', true]], 'Campo con error en foco.', '.aura-field.is-invalid .aura-input:focus'),
  'Foco de control': Sombra([[0, 0, 0, 5, '{Color.Acento.Anillo}']], 'Casilla o radio con foco de teclado (además del contorno de 2 px).', '.aura-check__input:focus-visible + .aura-check__box'),
  Pastilla: Sombra([[0, 1, 0, 0, 'rgba(255, 255, 255, 0.12)', true], [0, 1, 2, 0, 'rgba(0, 0, 0, 0.5)']], 'Pastilla elegida del segmentado: filo de luz + --shadow-1.', '.aura-segmented__thumb'),
  'Filo de luz': Sombra([[0, 1, 0, 0, '{Color.Línea.Filo de luz}', true]], 'Filo superior interior del icono de característica.', '.aura-feature__icon'),
  'Muestra': Sombra([[0, 0, 0, 1, 'rgba(255, 255, 255, 0.42)', true], [0, 3, 4, 0, 'rgba(255, 255, 255, 0.14)', true]], 'Aro (≥ 3:1 con acabados negros) y brillo de la muestra de color.', '.aura-swatch__dot'),
  'Barra de compra': Sombra([[0, -12, 32, -12, 'rgba(0, 0, 0, 0.7)']], 'Sombra hacia arriba de la barra de compra fija.', '.aura-buybar'),
};
const material = {
  $d: 'Materiales de cristal: fondo + desenfoque del mismo nivel, siempre juntos. «Desenfoque» es el valor CSS (backdrop-filter: blur); «Desenfoque Figma» es el radio equivalente del desenfoque de fondo de Figma (el doble). La saturación (180 %) no existe en Figma.',
  Fino: {
    Fondo: C('{Color.Cristal.Fino}', 'Fondo del material fino.', '--glass-thin-bg'),
    Desenfoque: Dim(16, 'blur(16px) saturate(180%).', '--glass-thin-filter'),
    'Desenfoque Figma': Dim(32, 'Radio del desenfoque de fondo en Figma.', '--glass-thin-filter'),
  },
  Regular: {
    Fondo: C('{Color.Cristal.Regular}', 'Fondo del material regular.', '--glass-regular-bg'),
    Desenfoque: Dim(24, 'blur(24px) saturate(180%).', '--glass-regular-filter'),
    'Desenfoque Figma': Dim(48, 'Radio del desenfoque de fondo en Figma.', '--glass-regular-filter'),
  },
  Grueso: {
    Fondo: C('{Color.Cristal.Grueso}', 'Fondo del material grueso.', '--glass-thick-bg'),
    Desenfoque: Dim(40, 'blur(40px) saturate(180%).', '--glass-thick-filter'),
    'Desenfoque Figma': Dim(80, 'Radio del desenfoque de fondo en Figma.', '--glass-thick-filter'),
  },
  'Saturación': N(1.8, 'saturate(180%) de los tres materiales (no se traslada a Figma).', '--glass-*-filter'),
};
const degradado = {
  $d: 'Degradados estáticos (nunca se animan). Las posiciones van de 0 a 1; la dirección está en la descripción.',
  'Protección de foto': Degradado(0, [['rgba(0, 0, 0, 0.92)', 0], ['rgba(0, 0, 0, 0.55)', 0.34], ['rgba(0, 0, 0, 0)', 0.64]], 'De abajo arriba: protege el texto sobre una foto (tesela --cover, escena con texto abajo).', '--photo-scrim'),
  'Efecto de borde': Degradado(180, [['rgba(0, 0, 0, 0.35)', 0], ['rgba(0, 0, 0, 0)', 1]], 'De arriba abajo, 16 px bajo una barra pegada (con el desenfoque regular que se desvanece).', '.aura-nav::after'),
  'Hueco de imagen': Degradado(180, [['#111113', 0], ['#08080a', 1]], 'De arriba abajo: fondo del hueco de imagen (con el resplandor Color/Luz/Hueco encima).', '.aura-slot'),
};

/* ---------------------------------------------------------------------------
   7. MOVIMIENTO
   --------------------------------------------------------------------------- */
const muelle = (amort, resp, d) => ({
  $d: d,
  'Amortiguación': N(amort, 'damping de AURA.ui.spring (1 = crítico, sin rebote).', 'AURA.ui.spring'),
  Respuesta: N(resp, 'response de AURA.ui.spring (s); no es una duración.', 'AURA.ui.spring'),
  'Rigidez Figma': N(r3(Math.pow((2 * Math.PI) / resp, 2)), 'Stiffness del muelle personalizado de Figma (masa 1): (2π / response)².', 'AURA.ui.spring'),
  'Amortiguación Figma': N(r3((4 * Math.PI * amort) / resp), 'Damping del muelle personalizado de Figma (masa 1): 4π · damping / response.', 'AURA.ui.spring'),
});
const movimiento = {
  $d: 'Movimiento (guía v2, capítulo 12). Solo se animan transform y opacity (y filter al materializar cristal); el color nunca se anima.',
  'Duración': {
    'Pulsación': Ms(100, 'Respuesta en pointerdown: scale() inmediato.', '--dur-press'),
    Marca: Ms(120, 'Marca de casilla y radio.', '--dur-check'),
    'Reducir movimiento': Ms(150, 'Fundido de los overlays con «reducir movimiento».', '--dur-rm'),
    Corta: Ms(160, 'Halo, capa de hover, «›» del enlace.', '--dur-1'),
    Salida: Ms(200, 'Salida de popover, aviso, buscador y menú; fundido de la galería.', '--dur-exit'),
    Media: Ms(240, 'Foto que llega, tarjetas, menú de la barra local.', '--dur-2'),
    Entrada: Ms(320, 'Desplazamiento de entrada de aviso, buscador y menú.', '--dur-enter'),
    'Aparición': Ms(400, 'Opacidad de data-aura-reveal.', '[data-aura-reveal]'),
    'Desplazamiento de aparición': Ms(600, 'Desplazamiento de data-aura-reveal (con la curva de entrada).', '[data-aura-reveal]'),
    Larga: Ms(560, 'Cifras que aparecen por partes (="stat").', '--dur-3'),
  },
  Curva: {
    Entrada: Bz([0.2, 0.8, 0.2, 1], 'Entrada.', '--ease-out'),
    Salida: Bz([0.8, 0, 0.8, 0.2], 'Salida: la de entrada espejada.', '--ease-in'),
    'Pulsación': Bz([0, 0, 0.58, 1], 'ease-out de CSS: la pulsación (transform 100 ms).', 'ease-out'),
    Fundido: Bz([0.25, 0.1, 0.25, 1], 'ease de CSS: fundidos de opacidad (halo, capa de hover).', 'ease'),
  },
  'Transición': {
    'Pulsación': Transicion('{Movimiento.Duración.Pulsación}', '{Movimiento.Curva.Pulsación}', 'transform 100 ms ease-out.', '.aura-btn'),
    Hover: Transicion('{Movimiento.Duración.Corta}', '{Movimiento.Curva.Fundido}', 'Capa de hover y halo: opacity 160 ms ease.', '.aura-btn::before'),
    Entrada: Transicion('{Movimiento.Duración.Entrada}', '{Movimiento.Curva.Entrada}', 'Entrada de aviso, buscador y menú.', '.aura-toast.is-visible'),
    Salida: Transicion('{Movimiento.Duración.Salida}', '{Movimiento.Curva.Salida}', 'Salida por el mismo camino.', '.aura-toast'),
  },
  Muelle: {
    $d: 'Muelles de aura-ui.js (lo que se arrastra). Figma: Smart Animate con «Muelle personalizado», masa 1.',
    'Por defecto': muelle(1, 0.35, 'Segmentado y valor por defecto: crítico, 99 % en 370 ms.'),
    Hoja: muelle(1, 0.3, 'Hoja con botón, velo o Esc: crítico, 99 % en 317 ms.'),
    'Hoja con impulso': muelle(0.8, 0.3, 'Hoja soltada con impulso: rebote del 1,52 %.'),
    'Carrusel con impulso': muelle(0.8, 0.4, 'Carrusel con impulso (response hasta 0,6 si el dedo iba más lento).'),
    Carrusel: muelle(1, 0.4, 'Carrusel sin impulso, flechas y teclado: crítico, 99 % en 423 ms.'),
  },
  'Escala de pulsación': {
    'Botón': N(0.97, 'scale(.97) del botón.', '.aura-btn:active'),
    'Botón de icono': N(0.92, 'scale(.92) de botones de icono y acciones de barra.', '.aura-icon-btn:active'),
    Chip: N(0.96, 'scale(.96) de chips y segmentado.', 'button.aura-chip:active'),
    Tarjeta: N(0.985, 'scale(.985) de tarjetas y opciones.', 'a.aura-card:active'),
    Casilla: N(0.88, 'scale(.88) de casillas, radios y cantidad.', '.aura-check:active'),
    'Muestra': N(0.9, 'scale(.9) de la muestra de color.', '.aura-swatch:active'),
  },
  'Aparición': {
    Desplazamiento: Dim(20, 'Desplazamiento vertical inicial de data-aura-reveal (1,25 rem).', '[data-aura-reveal]'),
    Escala: N(0.96, 'Escala inicial de data-aura-reveal="scale".', '[data-aura-reveal="scale"]'),
    Escalonado: Ms(60, 'Retraso por elemento de una fila: el índice del elemento (--i = 0, 1, 2…) por 60 ms, como mucho dos (120 ms); en el teléfono, 0.', 'calc(min(var(--i, 0), 2) * 60ms)'),
  },
  'Física': {
    'Deceleración': N(0.998, 'Proyección del impulso como el desplazamiento normal.', 'AURA.ui.project'),
    'Deceleración ágil': N(0.99, 'Proyección para lo que encaja por puntos (carrusel, segmentado).', 'AURA.ui.project'),
    Goma: N(0.55, 'Constante del efecto goma en los bordes.', 'AURA.ui.rubberband'),
    Umbral: Dim(10, 'Distancia antes de decidir la dirección de un arrastre.', 'aura-ui.js'),
    Retroceso: N(0.965, 'Escala de la página que retrocede bajo una hoja o el buscador.', 'html.aura-recede'),
  },
};

/* ---------------------------------------------------------------------------
   8. TIPOGRAFÍA
   Roles: [ruta, familia (D Kanit · I Inter · M mono), peso, tamaño 1440, interlineado, tracking em,
           clase css, color, núcleo, extra { movil: [tamaño, tracking?], mayus, tabular, lhPx, d }]
   --------------------------------------------------------------------------- */
const ROLES = [
  ['Display', 'D', 500, 72, 1.05, -0.025, '.aura-display', 'Texto.Primario', true, { movil: [40.28, -0.016], d: 'Momento héroe: 36 → 72 px (40 a 390). Un solo Display por página.' }],
  ['H1', 'D', 500, 56, 1.08, -0.02, '.aura-h1', 'Texto.Primario', true, { movil: [34, -0.012], d: 'Hero Title: 34 → 56 px.' }],
  ['H2', 'D', 500, 42, 1.14, -0.015, '.aura-h2', 'Texto.Primario', true, { movil: [28, -0.01], d: 'Section Title: 28 → 42 px.' }],
  ['H3', 'D', 500, 28, 1.22, -0.008, '.aura-h3 · .aura-product-card__name', 'Texto.Primario', true, { movil: [22.125], d: 'Card Title: 22 → 28 px. También el nombre de la tarjeta de modelo.' }],
  ['H4', 'D', 500, 20, 1.3, -0.004, '.aura-h4 · .aura-legend · .aura-table-card__title · .aura-summary__title', 'Texto.Primario', true, { d: 'Subtitle: 20 px. También leyenda, título de tabla y de resumen.' }],
  ['Lead', 'I', 400, 21, 1.5, -0.003, '.aura-lead', 'Texto.Secundario', true, { movil: [17.56], d: 'Entradilla: 17 → 21 px, 44ch ≈ 56 caracteres.' }],
  ['Body', 'I', 400, 16, 1.6, 0, '.aura-body', 'Texto.Secundario', true, { d: 'Cuerpo: 16 px, 53ch ≈ 68 caracteres.' }],
  ['Small', 'I', 400, 14, 1.5, 0, '.aura-small · .aura-feature__text · .aura-product-card__text', 'Texto.Secundario', true, { d: 'Texto de componente (tarjetas y características).' }],
  ['Caption', 'I', 400, 13, 1.45, 0.006, '.aura-caption · .aura-field__help · .aura-ribbon__text', 'Texto.Secundario', true, { d: 'Pies, ayudas de campo y cinta.' }],
  ['Nota', 'I', 400, 12, 1.55, 0.012, '.aura-footnotes__list · .aura-table__note', 'Texto.Secundario', true, { d: 'Notas al pie y disponibilidad bajo un precio (65ch).' }],
  ['Eyebrow', 'I', 650, 12, 1.35, 0.04, '.aura-eyebrow', 'Dorado.Base', true, { d: 'Antetítulo con punto dorado de 6 px (anillo de 3 px al 24 %).' }],
  ['Eyebrow mono', 'M', 500, 11, 1.35, 0.12, '.aura-eyebrow--mono', 'Dorado.Base', true, { mayus: true, d: 'Cabecera de sección y etiquetas técnicas («Novedades / 2026»).' }],
  ['Eyebrow grande', 'D', 500, 22, 1.2, -0.004, '.aura-eyebrow--lg', 'Dorado.Base', true, { movil: [18], d: 'Nombre de producto sobre un titular héroe: 18 → 22 px, sin punto.' }],
  ['Insignia', 'I', 650, 12, 1.3, 0.02, '.aura-badge · .aura-chip', 'Dorado.Base', true, { d: 'Insignia (píldora de 24 px, dorado suave) y chip.' }],
  ['Insignia mono', 'M', 500, 11, 1.3, 0.1, '.aura-badge--mono', 'Dorado.Base', true, { mayus: true, d: 'Estados de pedido y «Demostración» (radio 8); el color lo da la variante (--neutral, --ok…).' }],
  ['Botón', 'I', 600, 15, 1.2, 0, '.aura-btn', 'Texto.Blanco', true, { d: 'Etiqueta del botón: Inter 15 / 600 (sustituye al 14 / 400 de la v1).' }],
  ['Enlace', 'I', 500, 16, 1.6, 0, '.aura-link', 'Acento.Texto', true, { d: 'Enlace contextual «›»: Inter 500 al tamaño del texto que acompaña (aquí, el cuerpo).' }],
  ['Precio', 'D', 500, 20, 1.2, -0.005, '.aura-price', 'Texto.Primario', true, { tabular: true, d: 'Precio: cifras tabulares, sin partir.' }],
  ['Precio pequeño', 'D', 500, 16, 1.2, 0, '.aura-price--sm', 'Texto.Primario', false, { tabular: true, d: 'Cuota mensual.' }],
  ['Precio grande', 'D', 500, 36, 1.1, -0.014, '.aura-price--lg', 'Texto.Primario', true, { tabular: true, movil: [28], d: 'Precio del configurador: 28 → 36 px.' }],
  ['Precio compacto', 'I', 600, 14, 1.2, 0, '.aura-bag-line--compact .aura-price', 'Texto.Primario', false, { tabular: true, d: 'Precio en la línea compacta (bolsa, checkout, popover), a juego con el nombre.' }],
  ['Mono', 'M', 400, 12, 1.6, 0.08, '.aura-mono', 'Texto.Terciario', true, { mayus: true, d: 'Etiquetas técnicas cortas («AU-2026-000123»). Nunca para leer un párrafo.' }],
  ['Cifra', 'D', 500, 38, 1.05, -0.016, '.aura-stat__value', 'Texto.Primario', true, { tabular: true, movil: [26], d: 'Cifra: 26 → 38 px.' }],
  ['Cifra grande', 'D', 500, 79.2, 1, -0.03, '.aura-stat--lg .aura-stat__value', 'Texto.Primario', false, { tabular: true, movil: [48], d: 'Cifra destacada de página de producto: clamp(3rem, 2.25rem + 3cqi, 5rem) → 79,2 px a 1440 (máx. 80).' }],
  ['Cifra destacada', 'D', 500, 76, 1, -0.035, '.aura-stat--md .aura-stat__value', 'Texto.Primario', false, { tabular: true, movil: [56], d: 'La gran cifra en una columna estrecha: 56 → 76 px.' }],
  ['Cifra XL', 'D', 500, 160, 0.9, -0.04, '.aura-stat--xl .aura-stat__value', 'Texto.Primario', false, { tabular: true, movil: [86.8], d: 'La gran cifra («22 horas»): 80 → 160 px, sobre un resplandor circular.' }],
  ['Cifra de característica', 'D', 500, 24, 1.15, -0.01, '.aura-feature__value · .aura-summary__row--total dd', 'Texto.Primario', false, { d: 'Valor de característica («AURA H2») y total del resumen.' }],
  ['Etiqueta de cifra', 'I', 400, 13, 1.4, 0.006, '.aura-stat__label', 'Texto.Secundario', false, { d: 'Lo que explica una cifra.' }],
  ['Etiqueta de cifra grande', 'I', 400, 16, 1.45, 0, '.aura-stat--lg .aura-stat__label', 'Texto.Secundario', false, { d: 'Texto bajo la cifra destacada (máx. 18 rem).' }],
  ['Etiqueta de cifra XL', 'M', 400, 12, 1.4, 0.14, '.aura-stat--xl .aura-stat__label', 'Dorado.Base', false, { mayus: true, d: 'Etiqueta mono dorada de la gran cifra.' }],
  ['Navegación/Enlace global', 'I', 450, 13, 1.6, 0.01, '.aura-nav__link', 'Vibrancia.Etiqueta', false, { d: 'Enlaces de la barra global (activo: blanco, 600, raya azul de 2 px).' }],
  ['Navegación/Enlace local', 'I', 450, 12, 1.6, 0.012, '.aura-localnav__link', 'Vibrancia.Etiqueta', false, { movil: [15, 0], d: 'Enlaces de la barra local (activo: blanco, 600). Por debajo de 992 px se pliegan en un menú: 15 px, sin tracking, interlineado 24, filas de 44 px.' }],
  ['Navegación/Título local', 'D', 500, 19, 52 / 19, -0.004, '.aura-localnav__title', 'Texto.Primario', false, { lhPx: 52, d: 'Nombre de la página en la barra local; ocupa todo su alto (interlineado = 52 px).' }],
  ['Navegación/Marca', 'D', 600, 18, 1, 0.06, '.aura-brand__word', 'Texto.Primario', false, { d: 'Palabra «AURA» junto al logotipo de 28 px.' }],
  ['Navegación/Marca grande', 'D', 600, 22, 1, 0.06, '.aura-brand--lg .aura-brand__word', 'Texto.Primario', false, { d: 'Palabra «AURA» junto al logotipo de 36 px (tarjeta de acceso).' }],
  ['Navegación/Menú móvil', 'D', 500, 28, 1.2, -0.012, '.aura-menu__link', 'Texto.Primario', false, { d: 'Enlaces del menú móvil a pantalla completa (filas de 56 px).' }],
  ['Navegación/Migas', 'I', 400, 13, 1.5, 0.006, '.aura-crumbs', 'Texto.Secundario', false, { d: 'Migas de pan del pie (separador «›» terciario).' }],
  ['Formulario/Etiqueta', 'I', 500, 13, 1.4, 0.006, '.aura-field__label', 'Campo.Etiqueta', false, { d: 'Etiqueta persistente del campo (azul en foco, roja con error).' }],
  ['Formulario/Pista', 'I', 400, 13, 1.4, 0.006, '.aura-field__hint', 'Texto.Terciario', false, { d: 'Pista a la derecha de la etiqueta («Opcional», «8 caracteres como mínimo»).' }],
  ['Formulario/Campo', 'I', 400, 16, 1.5, 0, '.aura-input · .aura-select · .aura-textarea', 'Texto.Primario', false, { d: 'Valor y placeholder del campo: 16 px (sin zoom automático en móvil).' }],
  ['Formulario/Leyenda pequeña', 'I', 400, 14, 1.5, 0.004, '.aura-legend--sm', 'Texto.Secundario', false, { d: 'Leyenda de un grupo de radios o casillas.' }],
  ['Formulario/Casilla', 'I', 400, 14, 22 / 14, 0.002, '.aura-check · .aura-radio', 'Texto.Secundario', false, { lhPx: 22, d: 'Etiqueta de casilla y radio (fila de 44 px).' }],
  ['Formulario/Opción', 'I', 600, 16, 1.35, 0, '.aura-option__title', 'Texto.Primario', false, { d: 'Título de la tarjeta-opción del configurador.' }],
  ['Formulario/Nota de opción', 'I', 400, 13, 1.4, 0.006, '.aura-option__note · .aura-option__price', 'Texto.Secundario', false, { d: 'Nota y precio de la tarjeta-opción.' }],
  ['Formulario/Buscador', 'D', 500, 28, 1.6, -0.01, '.aura-search__input', 'Texto.Primario', false, { movil: [20.68], d: 'Campo del buscador: 20 → 28 px.' }],
  ['Formulario/Segmentado', 'I', 500, 14, 1.6, 0.002, '.aura-segmented__item', 'Texto.Secundario', false, { d: 'Opción del segmentado (elegida: blanco).' }],
  ['Contenido/Tesela', 'I', 400, 15, 1.5, 0, '.aura-tile__text', 'Texto.Secundario', false, { d: 'Texto de una tesela del bento (52ch).' }],
  ['Contenido/Título de característica', 'I', 600, 15, 1.35, 0, '.aura-feature__title', 'Texto.Primario', false, { d: 'Título de una característica.' }],
  ['Contenido/Acabado', 'I', 400, 13, 1.6, 0.006, '.aura-product-card__finish', 'Acento.Texto', false, { d: 'Acabado de la tarjeta de modelo: la única excepción azul sin ser pulsable.' }],
  ['Contenido/Cita', 'D', 500, 36, 1.2, -0.014, '.aura-quote__text', 'Texto.Primario', false, { movil: [24.62], d: 'Cita: 24 → 36 px, con comilla dorada.' }],
  ['Contenido/Pregunta', 'D', 500, 20, 1.3, -0.004, '.aura-accordion__summary', 'Texto.Primario', false, { movil: [17.56], d: 'Pregunta del acordeón: 17 → 20 px (fila mínima de 64 px).' }],
  ['Contenido/Tabla', 'I', 400, 14, 1.5, 0, '.aura-table', 'Texto.Primario', false, { movil: [13], d: 'Celdas de la tabla comparativa (13 px por debajo de 576).' }],
  ['Contenido/Cabecera de tabla', 'I', 600, 14, 1.5, 0, '.aura-table thead th', 'Texto.Primario', false, { movil: [13], d: 'Nombre de modelo en la cabecera (destacado: dorado). 13 px por debajo de 576.' }],
  ['Contenido/Etiqueta de tabla', 'M', 500, 11, 1.5, 0.12, '.aura-table thead th:first-child', 'Texto.Terciario', false, { mayus: true, d: 'Primera celda de la cabecera de la tabla.' }],
  ['Contenido/Título de cronología', 'D', 500, 22, 1.25, -0.006, '.aura-timeline__title · .aura-sheet__title', 'Texto.Primario', false, { d: 'Hito de la cronología y título de la hoja.' }],
  ['Contenido/Fecha de cronología', 'M', 500, 12, 1.6, 0.12, '.aura-timeline__when', 'Dorado.Base', false, { mayus: true, d: 'Fecha de un hito.' }],
  ['Contenido/Título de nota', 'I', 600, 14, 1.4, 0, '.aura-note__title · .aura-bag-line__care-title', 'Texto.Primario', false, { d: 'Título de la nota de uso y de AuraCare+ en la bolsa.' }],
  ['Contenido/Texto de nota', 'I', 400, 14, 1.55, 0, '.aura-note__text', 'Texto.Secundario', false, { d: 'Texto de la nota de uso (60ch).' }],
  ['Contenido/Título de mensaje', 'I', 600, 14, 1.5, 0, '.aura-alert__title', 'Texto.Primario', false, { d: 'Título del mensaje de formulario o de página (siempre con icono y texto).' }],
  ['Tienda/Línea de bolsa', 'D', 500, 19, 1.25, -0.004, '.aura-bag-line__name', 'Texto.Primario', false, { d: 'Nombre del producto en la bolsa.' }],
  ['Tienda/Título de acceso', 'D', 500, 28, 1.22, -0.01, '.aura-auth-card__title', 'Texto.Primario', false, { movil: [24.7], d: 'Título de la tarjeta de inicio de sesión y registro: 24 → 28 px.' }],
  ['Overlay/Título de popover', 'D', 500, 18, 1.3, 0, '.aura-popover__title', 'Texto.Primario', false, { d: 'Título del popover (bolsa).' }],
  ['Overlay/Título de aviso', 'I', 600, 14, 1.35, 0, '.aura-toast__title', 'Texto.Primario', false, { d: 'Título de un aviso.' }],
  ['Overlay/Texto de aviso', 'I', 450, 13, 1.4, 0.008, '.aura-toast__text', 'Vibrancia.Etiqueta', false, { d: 'Texto de un aviso (vibrancia: algo más de peso sobre cristal).' }],
  ['Pie/Encabezado', 'I', 600, 14, 1.3, 0.004, '.aura-footer__heading', 'Texto.Primario', false, { d: 'Etiqueta de columna del pie (Inter, como el prototipo).' }],
  ['Pie/Texto', 'I', 400, 13, 1.5, 0.006, '.aura-footer · .aura-footer__list a', 'Texto.Secundario', false, { d: 'Enlaces y texto del pie.' }],
  ['Pie/Lema', 'I', 400, 14, 1.55, 0.002, '.aura-footer__tagline', 'Texto.Secundario', false, { d: 'Lema bajo la marca del pie.' }],
  ['Pie/Legal', 'I', 400, 12, 1.5, 0.012, '.aura-footer__legal · .aura-footer__demo', 'Texto.Terciario', false, { d: 'Copyright, enlaces legales y aviso de demostración.' }],
];

// Equivalencias de familia y peso
const FAMILIA = { D: 'Display', I: 'Interfaz', M: 'Mono' };
const PESO_DTCG = { 400: 'Regular', 450: 'Navegación', 500: 'Medio', 600: 'Seminegrita', 650: 'Etiqueta', 700: 'Negrita' };
// Estilo de Figma de cada familia y peso (los pesos intermedios 450 y 650 de Inter no existen: se redondean hacia abajo)
const ESTILO_FIGMA = {
  D: { 500: 'Medium', 600: 'SemiBold' },
  I: { 400: 'Regular', 450: 'Regular', 500: 'Medium', 600: 'Semi Bold', 650: 'Semi Bold', 700: 'Bold' },
  M: { 400: 'Regular', 500: 'Medium' },
};
const NOMBRE_FAMILIA_TS = { D: 'Kanit', I: 'Inter', M: 'Mono' };

const tipografia = {
  $d: 'Tipografía: Kanit lidera, Inter explica. Tamaños a 1440 px; «Móvil», a 390 px.',
  Familia: {
    Display: Fam('Kanit', 'Titulares, cifras, precios y momentos de marca (pesos 500 y 600).', '--font-display', 'Kanit'),
    Interfaz: Fam('Inter', 'Cuerpo, etiquetas y controles (400–700, eje óptico 14–32).', '--font-ui', 'Inter'),
    Mono: Fam('Roboto Mono', 'Etiquetas técnicas cortas en mayúsculas. La web usa la monoespaciada del sistema (ui-monospace; Consolas en Windows); en Figma, Roboto Mono.', '--font-mono', 'Roboto Mono'),
  },
  Peso: {
    Regular: Peso(400, 'Cuerpo y textos de apoyo.', { Inter: 'Regular', 'Roboto Mono': 'Regular' }),
    'Navegación': Peso(450, 'Enlaces de barra y textos sobre cristal (vibrancia). En Figma: Inter Regular.', { Inter: 'Regular' }),
    Medio: Peso(500, 'Titulares Kanit, etiquetas de campo, enlace contextual, segmentado.', { Kanit: 'Medium', Inter: 'Medium', 'Roboto Mono': 'Medium' }),
    Seminegrita: Peso(600, 'Botón, títulos de característica y de opción, marca (Kanit).', { Kanit: 'SemiBold', Inter: 'Semi Bold' }),
    Etiqueta: Peso(650, 'Antetítulo, insignia y chip. En Figma: Inter Semi Bold.', { Inter: 'Semi Bold' }),
    Negrita: Peso(700, 'Contador de la bolsa.', { Inter: 'Bold' }),
  },
  'Tamaño': {},
};
const texto = { $d: 'Estilos de texto. Cada uno remite a su familia, peso y tamaño; el tracking se da en px a ese tamaño (en em en $extensions).' };

// Rellena un árbol por ruta «A/B»
const poner = (arbol, ruta, hoja) => {
  const partes = ruta.split('/');
  let n = arbol;
  for (const p of partes.slice(0, -1)) n = n[p] || (n[p] = {});
  n[partes[partes.length - 1]] = hoja;
};
const movilTexto = {};
const movilTamano = {};
for (const [ruta, f, peso, tam, lh, ls, css, col, nucleo, x] of ROLES) {
  const mk = (size, lsEm, esMovil) => {
    const pathTam = (esMovil ? 'Móvil/' : '') + ruta;
    return {
      t: 'typography',
      v: { fam: f, peso, sizeRef: `{Tipografía.Tamaño.${pathTam.replace(/\//g, '.')}}`, size, lh, lsEm, lhPx: x.lhPx },
      d: (esMovil ? 'A 390 px. ' : '') + x.d,
      css,
      ext: {
        figmaStyle: 'Texto/' + pathTam,
        fontFamily: { D: 'Kanit', I: 'Inter', M: 'Roboto Mono' }[f],
        fontStyle: ESTILO_FIGMA[f][peso],
        fontWeightCSS: peso,
        letterSpacingEm: lsEm,
        letterSpacingPercent: r3(lsEm * 100),
        lineHeightPercent: x.lhPx ? r3((x.lhPx / size) * 100) : r3(lh * 100),
        ...(x.lhPx ? { lineHeightPx: x.lhPx } : {}),
        textCase: x.mayus ? 'UPPER' : 'ORIGINAL',
        tabularNums: !!x.tabular,
        color: `{Color.${col}}`,
        nucleo,
        ...(x.movil && !esMovil ? { movil: `{Texto.Móvil.${ruta.replace(/\//g, '.')}}` } : {}),
      },
    };
  };
  poner(tipografia['Tamaño'], ruta, Dm('fontSizes')(tam, `Tamaño de ${ruta} a 1440 px.`, css));
  poner(texto, ruta, mk(tam, ls, false));
  if (x.movil) {
    const [tm, lsm] = x.movil;
    poner(movilTamano, ruta, Dm('fontSizes')(tm, `Tamaño de ${ruta} a 390 px.`, css));
    poner(movilTexto, ruta, mk(tm, lsm === undefined ? ls : lsm, true));
  }
}
tipografia['Tamaño']['Móvil'] = movilTamano;
texto['Móvil'] = movilTexto;

/* ---------------------------------------------------------------------------
   Árbol completo
   --------------------------------------------------------------------------- */
const ARBOL = {
  Color: color,
  Radio: radio,
  Espaciado: espaciado,
  'Tamaño': tamano,
  Borde: borde,
  Opacidad: opacidad,
  Capa: capa,
  'Tipografía': tipografia,
  Texto: texto,
  Sombra: sombra,
  Material: material,
  Degradado: degradado,
  Movimiento: movimiento,
};

/* ---------------------------------------------------------------------------
   Emisión DTCG
   --------------------------------------------------------------------------- */
const px = (n) => ({ value: n, unit: 'px' });
const esHoja = (n) => n && typeof n === 'object' && typeof n.t === 'string' && 'v' in n;
function valorDTCG(h) {
  switch (h.t) {
    case 'color': return colorDTCG(h.v);
    case 'dimension': return esAlias(h.v) ? h.v : px(h.v);
    case 'number': return h.v;
    case 'duration': return esAlias(h.v) ? h.v : { value: r6(h.v / 1000), unit: 's' };
    case 'cubicBezier': return h.v;
    case 'fontFamily': return h.v;
    case 'fontWeight': return h.v;
    case 'typography': {
      const v = h.v;
      return {
        fontFamily: `{Tipografía.Familia.${FAMILIA[v.fam]}}`,
        fontSize: v.sizeRef,
        fontWeight: `{Tipografía.Peso.${PESO_DTCG[v.peso]}}`,
        letterSpacing: px(r3(v.lsEm * v.size)),
        lineHeight: v.lhPx ? r6(v.lhPx / v.size) : v.lh,
      };
    }
    case 'shadow': return h.v.map(([x, y, b, s, c, inset]) => ({ color: colorDTCG(c), offsetX: px(x), offsetY: px(y), blur: px(b), spread: px(s), inset: !!inset }));
    case 'gradient': return h.v.map(([c, p]) => ({ color: colorDTCG(c), position: p }));
    case 'transition': return { duration: h.v.dur, delay: { value: 0, unit: 's' }, timingFunction: h.v.curva };
    default: throw new Error('Tipo sin emisor DTCG: ' + h.t);
  }
}
function emitirDTCG(n) {
  const o = {};
  if (n.$d) o.$description = n.$d;
  for (const [k, v] of Object.entries(n)) {
    if (k === '$d') continue;
    if (esHoja(v)) {
      const t = { $type: v.t, $value: valorDTCG(v) };
      if (v.d) t.$description = v.d;
      const ext = { ...(v.css ? { css: v.css } : {}), ...(v.ext || {}), ...(v.figma ? { figma: v.figma } : {}) };
      if (v.t === 'typography') { /* ya va en ext */ }
      if (Object.keys(ext).length) t.$extensions = { 'com.aura': ext };
      o[k] = t;
    } else if (v && typeof v === 'object') {
      o[k] = emitirDTCG(v);
    }
  }
  return o;
}

/* ---------------------------------------------------------------------------
   Emisión Tokens Studio
   --------------------------------------------------------------------------- */
const tsPx = (n) => String(r3(n));
const tsPct = (n) => `${r3(n * 100)}%`;
function valorTS(h, ruta) {
  switch (h.t) {
    case 'color': return { type: 'color', value: colorTS(h.v) };
    case 'dimension': {
      const tipo = h.ts || 'dimension';
      if (esAlias(h.v)) return { type: tipo, value: h.v };
      return { type: tipo, value: tipo === 'dimension' ? `${r3(h.v)}px` : tsPx(h.v) };
    }
    case 'number': return h.ts === 'opacity' ? { type: 'opacity', value: tsPct(h.v) } : { type: 'number', value: h.v };
    case 'duration': return { type: 'other', value: `${h.v}ms` };
    case 'cubicBezier': return { type: 'other', value: `cubic-bezier(${h.v.join(', ')})` };
    case 'fontFamily': return { type: 'fontFamilies', value: h.v };
    case 'typography': {
      const v = h.v;
      const r = ruta.replace(/^Texto\./, '');
      return {
        type: 'typography',
        value: {
          fontFamily: `{Tipografía.Familia.${FAMILIA[v.fam]}}`,
          fontWeight: `{Tipografía.Peso.${NOMBRE_FAMILIA_TS[v.fam]}.${ESTILO_FIGMA[v.fam][v.peso]}}`,
          fontSize: v.sizeRef,
          lineHeight: `{Tipografía.Interlineado.${r}}`,
          letterSpacing: `{Tipografía.Tracking.${r}}`,
          paragraphSpacing: '0',
          textCase: h.ext.textCase === 'UPPER' ? 'uppercase' : 'none',
          textDecoration: 'none',
        },
      };
    }
    case 'shadow': return {
      type: 'boxShadow',
      value: h.v.map(([x, y, b, s, c, inset]) => ({ x: String(x), y: String(y), blur: String(b), spread: String(s), color: colorTS(c), type: inset ? 'innerShadow' : 'dropShadow' })),
    };
    case 'gradient': {
      return { type: 'color', value: `linear-gradient(${h.angulo}deg, ${h.v.map(([c, p]) => `${colorTS(c)} ${r3(p * 100)}%`).join(', ')})` };
    }
    case 'transition': return { type: 'other', value: `${h.v.dur} ${h.v.curva}` };
    default: throw new Error('Tipo sin emisor TS: ' + h.t);
  }
}
function emitirTS(n, ruta = '') {
  const o = {};
  for (const [k, v] of Object.entries(n)) {
    if (k === '$d') continue;
    const r = ruta ? `${ruta}.${k}` : k;
    if (esHoja(v)) {
      if (v.t === 'fontWeight') continue;   // en Tokens Studio, los pesos van por familia (abajo)
      const t = valorTS(v, r);
      if (v.d) t.description = v.d + (v.css ? ` · ${v.css}` : '');
      o[k] = t;
    } else if (v && typeof v === 'object') {
      o[k] = emitirTS(v, r);
    }
  }
  return o;
}

const dtcg = {
  $description: 'AURA — Tokens de diseño v2 para Figma (formato W3C Design Tokens, DTCG 2025.10). Fuente: css/aura.css (manda) › guía de estilo v2 › v1. Colores en sRGB con alfa; medidas en px (1 rem = 16 px); duraciones en s. Los valores fluidos se dan a 1440 px y su versión «Móvil» a 390 px. Figma importa como variables los colores, dimensiones, números, familias y duraciones; tipografía, sombras, degradados, curvas y transiciones son para el plugin, Tokens Studio u otras herramientas.',
  ...emitirDTCG(ARBOL),
};

// Tokens Studio: un solo conjunto «AURA», pesos por familia e interlineado y tracking por rol
const ts = emitirTS(ARBOL);
ts['Tipografía'].Peso = {
  Kanit: {
    Medium: { type: 'fontWeights', value: 'Medium', description: 'Kanit 500: titulares, cifras y precios.' },
    SemiBold: { type: 'fontWeights', value: 'SemiBold', description: 'Kanit 600: palabra «AURA» de la marca.' },
  },
  Inter: {
    Regular: { type: 'fontWeights', value: 'Regular', description: 'Inter 400 (y 450 de la web: Figma no tiene ese peso).' },
    Medium: { type: 'fontWeights', value: 'Medium', description: 'Inter 500.' },
    'Semi Bold': { type: 'fontWeights', value: 'Semi Bold', description: 'Inter 600 (y 650 de antetítulo, insignia y chip).' },
    Bold: { type: 'fontWeights', value: 'Bold', description: 'Inter 700.' },
  },
  Mono: {
    Regular: { type: 'fontWeights', value: 'Regular', description: 'Roboto Mono 400.' },
    Medium: { type: 'fontWeights', value: 'Medium', description: 'Roboto Mono 500.' },
  },
};
ts['Tipografía'].Interlineado = {};
ts['Tipografía'].Tracking = {};
(function recorrer(n, ruta) {
  for (const [k, v] of Object.entries(n)) {
    if (k === '$d') continue;
    const r = ruta ? `${ruta}/${k}` : k;
    if (esHoja(v) && v.t === 'typography') {
      const lh = v.v.lhPx ? String(v.v.lhPx) : tsPct(v.v.lh);
      poner(ts['Tipografía'].Interlineado, r, { type: 'lineHeights', value: lh, description: `Interlineado de Texto/${r}${v.v.lhPx ? ' (px)' : ''}.` });
      poner(ts['Tipografía'].Tracking, r, { type: 'letterSpacing', value: `${r3(v.v.lsEm * 100)}%`, description: `Tracking de Texto/${r} (${v.v.lsEm} em).` });
    } else if (v && typeof v === 'object' && !esHoja(v)) recorrer(v, r);
  }
})(texto, '');

const tokensStudio = {
  AURA: ts,
  $themes: [
    { id: 'aura-oscuro', name: 'Oscuro', group: 'AURA', selectedTokenSets: { AURA: 'enabled' } },
  ],
  $metadata: { tokenSetOrder: ['AURA'] },
};

// JSON legible: indentado de 2, pero los objetos y listas cortos (un color, una medida, una capa
// de sombra) en una sola línea.
function compacto(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(compacto).join(', ') + ']';
  return '{ ' + Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${compacto(x)}`).join(', ') + ' }';
}
function bonito(v, sangria = '') {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  const plano = compacto(v);
  const tieneTexto = /"\$?description"/.test(plano);
  if (!tieneTexto && plano.length <= 110) return plano;
  const dentro = sangria + '  ';
  if (Array.isArray(v)) return '[\n' + v.map((x) => dentro + bonito(x, dentro)).join(',\n') + '\n' + sangria + ']';
  return '{\n' + Object.entries(v).map(([k, x]) => `${dentro}${JSON.stringify(k)}: ${bonito(x, dentro)}`).join(',\n') + '\n' + sangria + '}';
}
// Comprobación: el formato compacto no cambia el contenido
for (const doc of [dtcg, tokensStudio]) {
  if (JSON.stringify(JSON.parse(bonito(doc))) !== JSON.stringify(doc)) throw new Error('El formato compacto altera el JSON');
}
fs.mkdirSync(SALIDA, { recursive: true });
fs.writeFileSync(path.join(SALIDA, 'aura-tokens.json'), bonito(dtcg) + '\n');
fs.writeFileSync(path.join(SALIDA, 'aura-tokens.tokens-studio.json'), bonito(tokensStudio) + '\n');
console.log('Escritos en', SALIDA);
