# AURA — Guía de estilo para Figma

Figma no abre el HTML ni el PDF de la guía. Esta carpeta trae la guía de estilo v2 lista para Figma de tres maneras:

1. **Un plugin** que la construye en un archivo de Figma: variables, estilos, componentes con variantes y la guía entera, capítulo a capítulo. Es la opción recomendada.
2. **Los tokens en JSON**, para importarlos como variables (con el importador de Figma o con Tokens Studio).
3. **La guía publicada**, para pasarla tal cual con un plugin de HTML a Figma.

| Archivo | Qué es |
|---|---|
| `plugin/manifest.json` · `plugin/code.js` | El plugin «AURA — Guía de estilo» (JavaScript sin compilar). |
| `aura-tokens.json` | Tokens en formato W3C Design Tokens (DTCG): colores con alfa, medidas, tipografía, sombras, movimiento… |
| `aura-tokens.tokens-studio.json` | Los mismos tokens para el plugin Tokens Studio for Figma. |
| `img/` | Copias ligeras en JPG / PNG de las fotos y el logotipo que usa el plugin (Figma no admite WebP). |
| `LICENSE-bootstrap-icons.txt` | Licencia MIT de Bootstrap Icons, cuyos trazados van dentro del plugin. |
| `capturas/` · `iconos.json` | Los datos con los que se construye el plugin (ver «Para mantenerlo»). |
| `gen-tokens.mjs` · `build.mjs` · `captura-guia.js` · `captura-componentes.js` · `plugin/src/plugin.js` | Las herramientas y el código fuente del plugin. |

---

## 1. El plugin (recomendado)

### Instalarlo (una vez)

Los plugins en desarrollo solo se pueden importar en **la aplicación de escritorio de Figma** (en el navegador no se puede).

1. Abre la aplicación de escritorio de Figma y crea un archivo de diseño nuevo (**Archivo nuevo de diseño**).
2. En el menú principal: **Plugins → Desarrollo → Importar plugin desde manifiesto…**
3. Elige `guia-de-estilo/figma/plugin/manifest.json` de esta carpeta.
4. El plugin aparece en **Plugins → Desarrollo → AURA — Guía de estilo**.

### Ejecutarlo

1. En un archivo **nuevo** (mejor), ve a **Plugins → Desarrollo → AURA — Guía de estilo**.
2. Espera: va diciendo abajo lo que hace («Componentes: Botón (1/19)», «Guía: 03 · Botones & Acciones (5/21)», «Fotos: 40 de 108»…). Tarda **entre uno y tres minutos**, según el equipo y la red (más mientras las fotos lleguen por el respaldo, ver «Requisitos»); no cierres el archivo mientras tanto.
3. Al terminar se cierra solo con un resumen: variables, estilos, componentes, marcos y fotos. Si algo no ha ido bien, lo resume y lo detalla en la consola (**Plugins → Desarrollo → Mostrar/ocultar consola**).

### Qué crea

**Variables** — colección **«AURA»**, modo **«Oscuro»**: 454 variables (136 de color, 315 numéricas y 3 de texto), 96 de ellas alias (p. ej. `Color/Botón/Primario/Fondo` → `Color/Acento/Azul`).

| Grupo | Qué tiene |
|---|---|
| `Color/…` (133) | Fondo, Acento, Dorado, Texto, Estado, Línea, Relleno, Campo (también etiqueta e icono en foco y con error), Botón, Foco, Cristal, Vibrancia, Luz y los 33 acabados de producto (`Color/Acabado/<modelo>/<color>`), todos con su alfa. |
| `Radio/…` (7) · `Espaciado/…` (84) · `Tamaño/…` (64) · `Borde/…` (4) | Radios 6–999, escala de espaciado 2–120 y sus usos (`Espaciado/Componente/…`), alturas (botón 48, campo 56, barras 56 / 52…), contenedores, anchos y puntos de corte. |
| `Tipografía/…` (95) | Familias (Kanit, Inter, Roboto Mono), pesos y el tamaño de cada estilo de texto. |
| `Opacidad/…` · `Capa/…` · `Material/…` · `Movimiento/…` | Opacidades (0–1), capas (z-index), desenfoques de los cristales y duraciones (en segundos), muelles, escalas de pulsación… |

Cada variable lleva su descripción (el uso de la guía), su ámbito (solo aparece donde tiene sentido: radios en las esquinas, espaciados en huecos y rellenos…) y su sintaxis web (`var(--accent)`, o la expresión cuando no es una propiedad suelta, como `calc(min(var(--i, 0), 2) * 60ms)` en el escalonado).

**Estilos locales**, enlazados a las variables:

- **Color** (103): `Color/…` y los degradados `Degradado/…`.
- **Texto** (86): `Texto/Display`, `Texto/H1`…`Texto/H4`, `Texto/Lead`, `Texto/Body`, `Texto/Small`, `Texto/Caption`, `Texto/Nota`, `Texto/Eyebrow` (+ mono y grande), `Texto/Insignia`, `Texto/Botón`, `Texto/Enlace`, `Texto/Precio` (y sus tamaños), `Texto/Mono`, `Texto/Cifra…`, `Texto/Navegación/…`, `Texto/Formulario/…` (con `Pista`), `Texto/Contenido/…` (con `Título de mensaje`), `Texto/Tienda/…`, `Texto/Overlay/…`, `Texto/Pie/…`, con la escala real de `css/aura.css` a 1440 px, y **`Texto/Móvil/…`** (18) con los tamaños a 390 px (también la cabecera de tabla a 13 px y los enlaces de la barra local en su menú, 15 / 24). El tamaño de cada estilo está enlazado a su variable. Un estilo de un papel concreto (`Formulario/…`, `Contenido/…`, `Pie/…`) solo se aplica a las capas de ese papel; los generales (`Display`, `H1`, `Body`, `Caption`…), a cualquier texto con esas medidas.
- **Efecto** (14): `Sombra/1`, `Sombra/2`, `Sombra/3`, `Sombra/Halo primario`, focos de campo, error y control, pastilla, filo de luz… y `Material/Fino`, `Material/Regular`, `Material/Grueso` (desenfoque de fondo).
- **Retícula** (3): escritorio (12 columnas en el contenedor de 1180), teléfono (4 columnas, márgenes de 20) y base de 4 px.
- Además, 93 estilos `Guía/…` para la maquetación de la propia guía (títulos de capítulo, tarjetas, tablas…): no son del sistema y se pueden ignorar.

**Página «Componentes»** — 115 iconos (`Icono/…`, Bootstrap Icons) y 19 componentes, 127 variantes, todos con auto layout. Rellenos y trazos van enlazados a la variable de su papel (el fondo del botón inverso a `Color/Botón/Inverso/Fondo`, la etiqueta de un campo en foco a `Color/Campo/Etiqueta foco`…), y radios, rellenos, huecos y alturas, a sus tokens (primero los `Espaciado/Componente/…`; los círculos, sin radio enlazado para que sigan siendo círculos):

| Componente | Variantes | Propiedades |
|---|---|---|
| Botón | Tipo (Primario, Secundario, Inverso, Terciario, Destructivo, Enlace) × Estado (Normal, Hover, Pulsado, Foco, Desactivado, Carga; el enlace, sin las dos últimas) | Etiqueta · Icono delante / detrás (con intercambio de icono) · Flecha › |
| Botón de icono | Estilo (Transparente, Sólido) × Estado | Icono |
| Insignia | Tipo (Dorado, Azul, Completado, Aviso, Error, Neutro) × Estilo (Píldora, Mono) | Texto |
| Chip | Etiqueta y Pulsable (Normal, Hover, Activo, Foco) | Texto · Icono |
| Campo de texto | Tipo (Texto, Contraseña, Selector, Área de texto) × Estado (Normal, Hover, Foco, Error, Válido, Desactivado) | Etiqueta · Pista · Texto · Ayuda · Error · Icono |
| Casilla | Casilla y Radio × Estado (Normal, Marcada, Hover, Foco, Error, Desactivada) | Etiqueta |
| Muestra de color | Grande (Normal, Elegida, Foco) y Punto | — (cambia el color de la capa «Color») |
| Opción de segmentado · Segmentado | Estado (Normal, Hover, Elegida, Foco) | Texto |
| Nota · Aviso · Alerta · Nota al pie | por tipo | Título · Texto · Acción… (la nota y la alerta: icono + columna de título y texto, que crecen con el texto) |
| Tarjeta de producto · Tarjeta de familia | — | Antetítulo, nombre, acabado, texto, disponibilidad, precio, cuota… (foto real, puntos de color y botón editables) |
| Barra global · Cinta · Barra local · Pie | Tamaño (Escritorio 1440, Teléfono 390) | Título (barra local). Reparto flexible: en la barra global de escritorio, marca y acciones llenan a partes iguales y los enlaces quedan centrados (como la rejilla de la web); en la local, los enlaces van a la derecha. |

No hay tamaño «Pequeño» de botón: la guía usa un solo tamaño (48 / 999 / 24). Las variantes «Pulsado» tienen las mismas medidas y enlaces que «Normal»: en la web, la pulsación es una escala (0,97 en los botones, 0,92 en los de icono) que no cambia la caja; la escala va en la descripción de la variante y en `Movimiento/Escala de pulsación/…`.

**Página «Guía de estilo AURA»** — un marco de 1440 px por capítulo, como la guía web y en su orden: Portada (con el logotipo), 00 Fuentes y desviaciones, 01 Colores, 02 Tipografía, 03 Botones, 04 Formularios, 05 Iconografía y marca, 06 Materiales, 07 Layout y retícula, 08 Navegación, 09 Componentes de contenido, 10 Tienda, 11 Overlays, 12 Movimiento, 13 Escena con scroll, 14 Imagen y fotografía (+ un anexo con todas las fotos reales por acabado), 15 Accesibilidad, 16 Voz y tono, 17 Familias y plantillas y el cierre. Todo es editable: auto layout, textos con sus estilos, colores enlazados a las variables e **instancias** de los componentes (botones, campos, insignias, tarjetas, avisos…) donde la guía los enseña. Las instancias que en la web son más anchas que su contenido (botones con ancho mínimo, avisos y mensajes a todo el ancho de su columna) toman ese ancho.

### Requisitos

- **Fuentes**: Kanit (Medium y SemiBold), Inter (Regular, Medium, Semi Bold, Bold) y Roboto Mono. Las tres son de Google Fonts y ya están en Figma. Si falta alguna, el plugin usa la más parecida (Inter en lugar de Kanit, por ejemplo) y lo dice al final.
- **Conexión a internet** para las fotos y el logotipo, que se cargan de la web publicada (`https://aura-lyart-beta.vercel.app`):
  - Primero prueba las copias JPG/PNG de `guia-de-estilo/figma/img/`. **Solo estarán en la web cuando esta carpeta se suba al repositorio y se despliegue** (hoy dan 404).
  - Mientras tanto, cada foto llega por el **respaldo**: el plugin descarga la WebP original de `img/800/…` y la convierte a JPG en una ventana oculta. Funciona igual, pero tarda más (hasta 15 s por foto si la red va lenta) y es la parte que menos se ha podido probar sin Figma.
  - Cada descarga tiene un límite de 20 s. Sin conexión (o si una foto no llega), queda como un rectángulo de reserva con el nombre del archivo; en las fotos de las tarjetas (capas de una instancia) solo el relleno oscuro. Lo demás se crea igual.

### Si se ejecuta dos veces

- Las **variables** y los **estilos** se reutilizan y se actualizan por nombre: no se duplican. Si en la colección «AURA» ya hay una variable con el mismo nombre pero de otro tipo, se usa (o se crea una sola vez) «… (AURA)» del tipo correcto, y los enlaces apuntan a esa.
- Las **páginas** existentes no se tocan: se crean «Guía de estilo AURA (2)» y «Componentes (2)», y el mensaje final lo dice. Para empezar de cero, borra antes las dos páginas (o usa un archivo nuevo).

---

## 2. Solo los tokens, como variables

El plugin ya crea las variables. Usa esto si solo quieres los tokens (por ejemplo, en un archivo de librería), o para mantenerlos al día desde Tokens Studio.

### Con el importador de variables de Figma

Si tu versión de Figma permite importar variables desde un archivo de tokens (formato W3C Design Tokens):

1. Con nada seleccionado, abre las **Variables locales** desde el panel derecho.
2. Usa la opción de **importar** y selecciona `aura-tokens.json`.
3. Se crean las variables de color, dimensión, número, familia y duración (448). La tipografía compuesta, las sombras, los degradados y las curvas no son variables en Figma: para tenerlos como estilos, usa el plugin.

Para que el plugin reutilice esas variables en lugar de crear otras, la colección debe llamarse **«AURA»**: renómbrala antes de ejecutarlo.

### Con Tokens Studio for Figma

Los nombres de los menús pueden cambiar un poco según la versión del plugin.

1. Instala **Tokens Studio for Figma** (Comunidad de Figma) y ábrelo en tu archivo.
2. Deja el almacenamiento en **Local document** (pestaña **Settings**).
3. En la pestaña **Tokens**, carga `aura-tokens.tokens-studio.json` con **Load from file / folder** (en el menú «…» de arriba a la derecha), o cambia a la vista **JSON** y pega su contenido.
4. Activa el set **«AURA»** y el tema **«Oscuro»**.
5. En **Styles & Variables**, usa **Create variables** y después **Create styles** (color, tipografía y sombras).

Los colores, las medidas y los estilos de texto y de sombra se llaman igual que los del plugin (`Color/Fondo/Principal`, `Texto/Display`, `Sombra/2`…), así que se reutilizan. Tokens Studio trae además grupos que el plugin no crea como variables: los pesos por familia (`Tipografía/Peso/Kanit|Inter|Mono/…`), y un interlineado y un tracking por estilo de texto (`Tipografía/Interlineado/…` y `Tipografía/Tracking/…`, 86 de cada). Si usas **Create variables**, aparecen como unas 180 variables más en la colección.

---

## 3. Alternativa: la guía web, tal cual

Para tener una copia visual rápida de la guía (sin variables ni componentes):

1. Instala un plugin de HTML a Figma, por ejemplo **html.to.design**.
2. Pega la dirección `https://aura-lyart-beta.vercel.app/guia-de-estilo/guia-de-estilo.html`.
3. Elige un ancho de **1440 px** (escritorio) e importa.

El resultado se parece a la web, pero sus colores y textos no están enlazados a las variables ni a los estilos, y los botones y campos no son instancias de componentes: para trabajar con el sistema, usa el plugin.

---

## 4. Qué no se traslada (y cómo se aproxima)

| En la web | En Figma |
|---|---|
| **Animaciones** (muelles, curvas, apariciones, pulsación en `pointerdown`) | No se animan. Sus valores están en las variables `Movimiento/…` (con la rigidez y la amortiguación del «muelle personalizado» de Smart Animate) y en el capítulo 12. «Pulsado» conserva las medidas de «Normal» y lleva la escala en su descripción. |
| **Hover, foco y estados** | Variantes de cada componente. El contorno de foco (separado 3 px del borde) es una capa «Contorno de foco» que sigue el tamaño del componente. |
| **Sombras con extensión** (`box-shadow` con spread: anillos de foco, halos) | Figma solo pinta la extensión en rectángulos o en marcos con relleno que recortan su contenido. El plugin activa «Recortar contenido» cuando nada se sale; si se sale algo (el contorno de foco), el relleno y las sombras pasan a un rectángulo «Fondo y sombra» al fondo; y los anillos de una capa sin relleno se dibujan como una capa «Anillo» con trazo. |
| **Escena con scroll** (`[data-aura-scrub]`) | No avanza con el scroll: el capítulo 13 enseña el escenario con su fotograma, los textos encima, la tira de fotogramas y la línea de tiempo. |
| **Materiales con `backdrop-filter`** | Relleno translúcido + **desenfoque de fondo** de Figma (estilos `Material/…`, con un radio del doble que el CSS). La saturación al 180 % no existe en Figma. |
| **Fotos con «aclarar»** (`mix-blend-mode: lighten`) | Se mantiene: la capa de la foto usa el modo de fusión Aclarar sobre el halo azul. |
| **Tamaños fluidos** (`clamp()`) | Valores a 1440 px y estilos `Texto/Móvil/…` a 390 px. |
| **Márgenes** distintos del hueco general | Un auto layout tiene un solo hueco: donde la web separa más, va un marco «Espacio» (si el hueco es al menos el doble) o el elemento dentro de un marco «Margen» con ese relleno de más. |
| **Contenido plegado** (el panel de un acordeón cerrado) | Va oculto; se muestra con el ojo de la capa. |
| **Monoespaciada del sistema** (ui-monospace; Consolas en Windows) | Roboto Mono. Las medidas de la guía se tomaron ya con ella. |
| **Pesos 450 y 650 de Inter** y su **eje óptico** | Inter Regular y Semi Bold; Figma no aplica el eje óptico como el navegador, así que un texto largo puede partir una línea antes o después (los textos crecen en alto, no se cortan). |
| **Cifras tabulares** (precios) | La API de Figma no permite fijarlas en un estilo: actívalas a mano en **Tipo → Opciones de fuente** si hace falta. |
| **Fondos en mosaico** (el damero de las muestras con alfa) | Se omiten; queda el color de base. |
| **Comportamiento** (carruseles, hojas que se arrastran, validación, bolsa) | Solo su aspecto en un estado concreto. |

---

## 5. Para mantenerlo

El plugin se genera; no edites `plugin/code.js` a mano.

- **Código del plugin**: `plugin/src/plugin.js` (JavaScript ES2017, sin módulos).
- **Tokens**: `gen-tokens.mjs` es la definición (sale de `css/aura.css` y de `js/data.js`) y escribe `aura-tokens.json` y `aura-tokens.tokens-studio.json`. Para cambiar un token, cámbialo ahí y ejecuta `node gen-tokens.mjs` desde esta carpeta.
- **Datos de la guía**: `capturas/*.json` (la guía y los componentes tal como los pinta el navegador) e `iconos.json`.
- **Reconstruir**: `node build.mjs` desde esta carpeta (Node 18 o posterior). Con `--imagenes` rehace las copias de `img/` (necesita el paquete `sharp`: `npm i sharp`, o `SHARP_DESDE=<carpeta con node_modules>`). Con `--informe`, un resumen.
- **Si cambia la guía o los componentes**, vuelve a capturar en Chrome o Edge con la página a 1440 px de ancho (DevTools → barra de dispositivos → 1440 × 900):
  1. En `guia-de-estilo.html`, pega en la consola `captura-guia.js` (descarga `guia-captura.json`) y después `captura-componentes.js` (descarga `componentes-captura.json`).
  2. En `html/auraphone.html`, a 1440 y a 390 px, pega los dos archivos y ejecuta `await prepararCapturaAURA(); capturarPiezasAURA()` (descarga `piezas-auraphone-<ancho>.json`).
  3. Deja los JSON en `capturas/` y ejecuta `node build.mjs`.
- **Fotos**: tras cambiar `img/`, súbela con el resto y despliega la web: el plugin las busca en `https://aura-lyart-beta.vercel.app/guia-de-estilo/figma/img/…`.

Iconos: [Bootstrap Icons](https://icons.getbootstrap.com) 1.11.3, licencia MIT (texto completo en `LICENSE-bootstrap-icons.txt` y en la cabecera de `plugin/code.js`).

---

## 6. Qué no se ha podido probar

El plugin no se ha ejecutado en Figma real. Se ha comprobado contra los tipos oficiales de la API (`@figma/plugin-typings`, también en modo estricto), en dos simulaciones del objeto `figma` (normal, sin red, sin interfaz que responda, sin Kanit ni Roboto Mono, con las copias publicadas, dos veces seguidas, con una variable en conflicto y en un archivo con contenido) y pintando sus datos en HTML para revisarlos a ojo. Lo que solo Figma puede confirmar:

- El respaldo de las fotos (WebP convertida en la ventana oculta), mientras `img/` no esté publicada.
- Cómo parte Figma las líneas con Inter y Kanit: los textos crecen en alto, pero un salto distinto puede mover lo que hay debajo.
- Que «Recortar contenido», el rectángulo «Fondo y sombra» y las capas «Anillo» pinten las sombras con extensión igual que la web.
