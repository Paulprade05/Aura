# AURA — Referencia de componentes

Contrato de marcado del sistema de diseño (`assets/css/aura.css`). Guía viva: `componentes.html`.

- Prefijo `.aura-`, modificadores `--x`, estados `.is-x`. Los estados los pone el JS o el propio HTML.
- Las utilidades de Bootstrap 5.3 (`d-flex`, `gap-3`, `mt-4`, `text-center`, `visually-hidden`, `row`/`col`…) están disponibles y se pueden combinar. No uses los componentes de Bootstrap (`.btn`, `.card`, `.navbar`, `.modal`…): todos tienen equivalente AURA.
- Todo el texto en español de España. La marca es siempre AURA: nunca la marca original ni sus nombres de producto (ver equivalencias del encargo).
- Toda página nueva cumple la lista de [§15 Accesibilidad y metadatos (temario DIW)](#15-accesibilidad-y-metadatos-temario-diw): `<head>` completo y comentado, un `h1`, tablas con `<caption>`, formularios con `label for` y validación HTML5, ARIA solo donde el HTML no llega, y **cero fallos en el test TAW** ([§15.9](#159-test-taw-wcag-2x-aa)).

## Cambios de la v2.1 (14 de octubre de 2026): accesibilidad según el test TAW

El test TAW (tawdis.net, WCAG 2.x nivel AA) daba «Falla» en la portada por cinco técnicas y pedía revisar otras tres. Las reglas nuevas valen para todo el sitio y para cualquier página nueva; están en la guía de estilo (capítulos 04, 05, 08, 09, 10 y 15) y, con el marcado, en cada sección de este documento. Resumen y detalle en [§15.9](#159-test-taw-wcag-2x-aa):

| Técnica TAW | Regla |
| --- | --- |
| H44 / H65 controles sin etiquetar | Todo `input`, `select` y `textarea` lleva `id` y un `<label for="ese id">` con texto. TAW **no cuenta** la etiqueta que envuelve al control ni `aria-label`: en radios, casillas, muestras de color, tarjetas-opción y segmentados, la etiqueta que envuelve lleva además `for` (sin cambiar el diseño). Sin etiqueta a la vista (el buscador), `<label class="visually-hidden" for>`, no `aria-label`. Los ids que pinta el JS son únicos: componente + nombre + valor ([§7](#casilla-y-radio)). |
| H71 selección sin agrupar | Todo grupo de radios, y de casillas con el mismo `name`, va en `<fieldset>` con `<legend>` (`.visually-hidden` si no se ve). El segmentado de radios **es** el `<fieldset class="aura-segmented">`, con su `<legend class="visually-hidden">` de primer hijo, sin `role="radiogroup"` ni `aria-label`. Una casilla suelta lleva su propio `name` ([§5](#chip-insignia-segmentado)). |
| F89 enlaces sin contenido | Ningún enlace sin texto. La foto de la tarjeta de modelo y la miniatura de la bolsa dejan de ser enlaces (`<div class="…__media">`); la tarjeta entera se sigue pulsando con el **enlace estirado** del nombre ([§6](#tarjeta-de-modelo)). Un enlace o botón de solo icono lleva su nombre como texto: `<span class="visually-hidden">…</span>` dentro, no en `aria-label` ([§5](#botón-de-icono-44-px)). |
| H2 enlaces seguidos al mismo destino | Dos enlaces consecutivos nunca van al mismo sitio: los iconos sociales del pie van a `#newsroom`, `#historia` y `#oportunidades` de Acerca ([§12.2](#122-aura-footer)); la foto y el nombre de una tarjeta ya son un solo enlace; el título de la barra local enlaza a `#top` (sube arriba del todo) con «: volver arriba» en texto oculto, así no repite ni el destino ni el texto del enlace de la cabecera ([§4](#barra-local-páginas-de-familia)). |
| H32 formulario sin envío | Todo `<form>` tiene un botón de envío real (`type="submit"`). La lupa del buscador es ese botón (`.aura-search__submit`, «Buscar» oculto) ([§12.1](#buscador)). Una muestra que no se envía no es un `<form>`. |
| G140 etiquetas de presentación | Iconos con `<span class="bi bi-…" aria-hidden="true"></span>`, nunca `<i>`; nada de `<b>` ni `<i>` para dar estilo (`<strong>` / `<em>` si es énfasis, `<span>` con clase si es aspecto). El CSS apunta a `.bi`, no a `i`. |
| C28 medidas absolutas en `style` | Lo que el JS escribe en línea (la pastilla del segmentado) va en `rem` o en variables CSS, nunca en `px`; en el HTML, `style` solo para variables (`--i`, `--swatch`, `--c`). |
| H30 mismo texto, destinos distintos | «Comprar», «Configurar», «Reservar», «Más información», «Comparar todos los modelos»: el nombre del producto o de la familia va en un `<span class="visually-hidden">` **dentro** del enlace (`Comprar<span class="visually-hidden"> auraPhone 18 Pro</span>`), no en `aria-label`. |

**Qué deben hacer las páginas**: pasar el comprobador antes de publicar (0 «falla»), escribir los controles con `label for` aunque ya estén envueltos, agrupar todo radio en su `fieldset`, no enlazar una foto sin texto, dar a cada botón de icono su texto oculto, poner un `type="submit"` en cada formulario y no usar `<i>`, `<b>` ni `px` en un `style`. Lo que generan `aura-core.js` y `aura-ui.js` (cabecera, buscador, menú, pie, tarjetas, tablas, carrusel, avisos, muestras de color, barra local) ya cumple.

## Cambios de la v2.0 (13 de octubre de 2026): auditoría de scroll, fotos y coherencia con la guía

La base, la guía de estilo v2.0 (`guia-de-estilo/guia-de-estilo.html`) y este documento pasan a la misma versión (`aura.css`: «Sistema de diseño (v2.0)»). **Qué fuente manda**: la guía v2, después los prototipos de página y después la v1; cada desviación de la v1 está en la guía §00 con su motivo. Qué cambia (detalle en cada sección):

| Área | Cambio |
| --- | --- |
| Scroll | La tabla comparativa ya no se queda con la rueda ni con el dedo: `.aura-table-wrap` con `overflow-y: hidden` (1 px de más, del caption o del filo de la última fila, bastaba para perder una muesca o un arrastre entero) ([§6](#tabla-comparativa)). Los carruseles devuelven el gesto vertical a la página (`overscroll-behavior: auto` con `.is-ready`) y no tienen `touchmove` no pasivo. `html { scroll-behavior: auto }`: los saltos a un ancla son inmediatos ([§13](#movimiento)). |
| Escena con scroll | El fundido de los textos se mide en píxeles: 150 px por entrada y salida (`SCRUB_FADE_PX`), como mucho un tercio del tramo. Reglas de ritmo: `data-length` ≤ 340 (2,4 pantallas), como mucho 3 mensajes, cada uno ≥ 400 px al 100 %. Por http(s) y con el lienzo en la GPU, los fotogramas cercanos se decodifican de antemano fuera del hilo principal (`createImageBitmap` del Blob) y al pintar solo se escalan; sin GPU y por `file://`, como antes ([§10 bis](#10-bis-escena-que-avanza-con-el-scroll)). |
| Apariciones | `[data-aura-reveal]` se dispara al asomar (`threshold: [0]`, `rootMargin: '0px 0px 5% 0px'`), con fundido de 400 / 600 ms y escalonado de 60 ms × `--i` hasta 2, sin retraso en el teléfono ([§11](#11-movimiento)). |
| Color | `--accent-link` pasa a #1787f7 (el de la v1 y del prototipo de Inicio: 5,85:1 sobre negro, 5,03:1 sobre tarjeta) y `--accent-link-hover` #4aa3ff; el secundario en hover y en foco pone su etiqueta en `--accent-link-hover`. Nuevo `--field-border-hover` (50 %; blanco con «más contraste»). Superficies solo de la paleta (tabla, tesela `--cover`, tarjeta de acceso) y base #000 en los paneles de foto, también `.aura-gallery` (el halo se queda). Los trazos decorativos (aro del primario, icono del marcador de imagen, `.aura-glow`) pasan al mismo azul (`rgba(23, 135, 247, …)`). Única excepción a «lo que no se pulsa no va en azul»: el acabado de la tarjeta de modelo ([§1](#tokens-root), [§13](#color)). |
| Tipografía | Medida en caracteres reales: `.aura-lead` 44ch, `.aura-body` y `.aura-prose` 53ch (≈ 56 y 68 caracteres), notas y características 60ch, notas al pie 65ch. Roles que faltaban en la guía: texto de componente (14 / 1,5), botón (15 / 600), nota (12 / 1,55 / 400, también la de tabla), navegación y cifras (con las clases que ya los llevan; para un texto suelto de ese rol, `.aura-small`, Inter 14 / 1,5). Pie sin palabras sueltas; `.aura-gallery__caption` en Inter 13; tablas con `text-wrap: balance`. «USB-⁠C» con guion normal + WORD JOINER (U+2060): no se parte y el guion es de Inter (el U+2011 de la v1.7 salía de Segoe UI) ([§14.2](#142-aurafmt)). Fuentes de reserva con métricas ajustadas (`size-adjust`) detrás de Inter y Kanit: el texto no salta al llegar la fuente ([§2](#2-tipografía)). |
| Fotos | **Galería por color**: `photos` en `data.js` (bloque generado `FOTOS`), `AURA.catalog.views(p, color)` y `catalog.image(p, color, vista?)`; fotos reales igualadas (`img/<diseño>-<color>-<vista>.webp`, fondo #000, escala fija por tipo, exposición común, pantalla AURA común). Comprar enseña todas las vistas del acabado con una tira de miniaturas. `srcset` de 400 / 800 / 1600 px con `sizes` por hueco. La galería ajusta la foto a su caja (sin corte ni desfase). Bolsa, popover y checkout dicen «Imagen en …» si la foto es de otro acabado ([§1](#huecos-de-imagen), [§8](#galería-del-configurador), [§14.3](#143-auracatalog)). |
| Layout | `.aura-grid--4` a cuatro columnas desde 1200 px (75 em; dos entre 576 y 1199). Tokens `--space-block` y `--space-stats` para el ritmo vertical. La cinta lleva un texto corto en el teléfono. La barra local pliega sus enlaces en el menú del chevrón mientras no caben (por debajo de 992 px) y llega con `.has-menu` en el HTML (sin salto al cargar) ([§3](#3-layout), [§4](#barra-local-páginas-de-familia), [§12.1](#121-aura-header)). |
| Tienda | En comprar la barra de compra va también en escritorio (`--always`, excepción documentada) y lleva el acabado en su propia línea (`.aura-buybar__color`). Las páginas que pintan con JS no saltan al cargar: comprar, comparar, cuenta, bolsa y checkout ocultan sin sacar del flujo lo que aún no está pintado hasta su `.is-ready`, con la red de seguridad `aura-ready-fallback` (2,5 s); Trade In escribe ya en el HTML el texto de su titular. `html.aura-has-session` (de `aura-core.js`, en el `<head>`) marca la sesión antes del primer pintado y lo usan checkout y cuenta ([§8](#barra-de-compra-fija-móvil)). |
| Materiales y radios | `--glass-nav-thick-bg` (el menú móvil, negro al 86 %), `--radius-2xs` (6 px, casillas), duraciones con token (`--dur-check`, `--dur-rm`, `--dur-exit`, `--dur-enter`). Sombras: `--shadow-2` es de popover, tarjeta elevada, tarjeta de acceso y paneles de cristal; las tarjetas no llevan sombra ([§1](#tokens-root)). |
| Iconos | Nunca por debajo de 16 px, salvo en línea con un texto menor (1em). El chevrón de la barra local, 17 px. La marca del sitio es `img/aura-72.png` (72 px, unos 3 KB); `aura.png` queda para los iconos. |
| Guía de estilo | Nuevo capítulo 00 «Fuentes y desviaciones» (jerarquía v2 › prototipos › v1, tabla de desviaciones de la v1 y de excepciones); §14 reescrito para la galería por color; tablas de la escena con auraPods y los tamaños reales de `m/`. |

**Qué deben hacer las páginas** (y cualquier página nueva): enlazar las fotos de producto solo a través de `AURA.catalog.image()` / `views()`; no escribir `font-size`, `line-height` ni `letter-spacing` propios (usar `.aura-body`, `.aura-caption` o los roles de §2); separar bloques con `--space-block` (nunca `mt-5`); en un bloque texto + imagen, titular `.aura-h1` y antetítulo `--mono`; en una cabecera de sección, `.aura-h2`; escena con `data-length` ≤ 340 y ≤ 3 textos; la barra local con `.has-menu` y su chevrón en el HTML; enlaces sueltos con `aura-link aura-link--control`.

## Cambios de la v1.7 (11 de octubre de 2026): familia auraPods

Una cuarta familia, **auraPods** (auriculares: auraPods Max 2, auraPods Pro 3 y auraPods 5), con su página `html/aurapods.html` (+ `css/pages/aurapods.css`, `js/pages/aurapods.js`) y la misma arquitectura que las otras tres. **El aspecto y el comportamiento de lo anterior no cambian.** Qué hay nuevo en la base:

| Área | Cambio |
| --- | --- |
| Catálogo | `families[]` admite `plural: true` («los auraPods»). Nuevo `AURA.catalog.grammar(producto \| familia)` → `{ plural, el, del, al, un, tu, nuevo }`: los textos generados concuerdan («Los auraPods 5, desde…», «de tus nuevos auraPods», «unos auraPods», «por tus auraPods 4») en ventajas de compra, bolsa, checkout, cuenta, comprar, comparar, Trade In y soporte ([§14.3](#143-auracatalog)). Un producto puede no tener `options` (`[]`): se configura solo por acabado y AuraCare+. `care.prices.aurapods` y seis dispositivos auraPods en `tradeIn.devices`. |
| Navegación | `<aura-header>`: siete enlaces (auraPods tras auraBook; caben de 992 a 1440 px), clave `active="aurapods"`, «Ver auraPods» en la bolsa vacía y el escalonado del menú móvil sigue al número de enlaces. `<aura-footer>`: auraPods en «Productos». Buscador: icono `bi-earbuds` y el texto «Prueba con…» sale de las familias del catálogo ([§12.1](#121-aura-header), [§12.2](#122-aura-footer)). |
| Formato | `fmt.units` cambia el guion de «USB-C» por uno que no parte (U+2011): nunca «USB- / C» en tablas y comparador ([§14.2](#142-aurafmt)). |
| Páginas | Comparador: `?familia=aurapods` y grupos «Sonido» (`cancelacion`, `audio`) y «Salud» (`salud`); `estuche`, `resistencia` y `controles` se suman a sus grupos. Inicio: cuarta familia en «Toda la gama» (doce tarjetas) y una tesela a lo ancho en Novedades. Trade In, bolsa vacía y soporte: rejilla `--4` para las tarjetas de familia. |

## Cambios de la v1.6 (10 de octubre de 2026)

Piezas nuevas para que las páginas de familia cuenten el producto como una presentación: una escena que avanza con el scroll y componentes pequeños que la acompañan. **Nada de lo anterior cambia** de aspecto ni de comportamiento. **Qué hay nuevo** (detalle en cada sección):

| Área | Cambio |
| --- | --- |
| Escena con scroll | `section.aura-scrub[data-aura-scrub]`: secuencia de fotogramas (`img/seq/<nombre>/f-0001.webp…`) pintada en un `<canvas>` que sigue al scroll 1:1, con textos HTML que entran y se van por tramos (`data-from` / `data-to` / `data-pos`). Carga progresiva (uno de cada 8, luego el resto), versión de teléfono (`m/`), y sin escena con «reducir movimiento», «ahorro de datos», al imprimir o sin JS: póster fijo y textos en orden ([§10 bis](#10-bis-escena-que-avanza-con-el-scroll)). `AURA.ui.scrub(el)`. |
| Exhibición de color | `.aura-colorway[data-aura-colorway="idDeProducto"]`: muestras del catálogo que cambian la foto con el fundido cruzado de la galería y anuncian el acabado; si el color no tiene foto propia, lo dice («Plata · Imagen en azul glacial») ([§8](#exhibición-de-color)). `AURA.ui.colorway(el)`, evento `aura:colorway`. |
| Cifra destacada | `.aura-stat--lg` (+ `.aura-stats--lg`, `__pre`, `__unit`) y `data-aura-reveal="stat"`: la cifra aparece y después lo que la explica, solo con opacidad (sin contador) ([§6](#cifra)). |
| Galería de fotos | `.aura-carousel--wide`: una foto grande por vista en el carrusel de siempre; cada foto, un `figure.aura-media--frame` con su pie ([§10](#carrusel)). |
| Movimiento | §13: los fondos en movimiento siguen prohibidos **salvo la escena con scroll**, que nunca se mueve sola (solo avanza mientras el usuario desplaza la página, 1:1) y con «reducir movimiento» es una imagen fija. |
| Guía viva | `componentes.html` pasa a «v1.6» con la sección «09 / Páginas de producto» (escena de prueba de 48 fotogramas en `img/seq/demo/`, exhibición, cifras y galería). |

**Qué deben hacer las páginas** para usarlo: [§10 bis](#10-bis-escena-que-avanza-con-el-scroll) tiene el marcado copiable y la lista de comprobación (póster con su `alt` real, `aria-labelledby`, jerarquía de encabezados, peso de la secuencia). Para las fotos por color, además de guardar `img/<image>-<color>.webp`, declarar el color en `imageVariants` de `data.js` (si no, la base no lo pide).

**Ajustes de la v1.6 tras la revisión** (lo que antes resolvía cada página ahora es de la base):

- Escena: el póster puede ir en un `<picture>` (fotograma 1 para la escena, el último para la versión estática; `display: contents`, el JS lo encuentra igual). Una escena que hace de héroe adelanta su primer texto (el del `h1`) al póster en la versión estática. Su `.aura-display` mide 52 rem, sus acciones van centradas en los textos centrados y el botón secundario lleva material oscuro sobre el fotograma. En tableta vertical o ventana casi cuadrada (desde 768 px y hasta 5:4) con `data-fit="contain"`, `left` / `right` bajan al pie como en el teléfono. Hasta 120 fotogramas ([§10 bis](#10-bis-escena-que-avanza-con-el-scroll)).
- `.aura-cluster.aura-cluster--stack-sm` apila de verdad en el teléfono (antes `.aura-cluster`, que va después, lo devolvía a `flex`).
- `.aura-stat--lg` mide la cifra en `cqi`: dentro de una columna con contenedor se queda en su mínimo en lugar de salirse ([§6](#cifra)).
- `data.js`: `imageColor`, `imageAlt` e `imageVariants` al día con las fotos nuevas (todas las fotos por color declaradas).

## Cambios de la v1.5 (9 de octubre de 2026)

Marcado, metadatos y accesibilidad según el temario de «Desarrollo de Interfaces Web». **El aspecto no cambia** (mismas medidas, tokens y comportamiento). **Qué ha cambiado** (detalle en cada sección):

| Área | Cambio |
| --- | --- |
| Tablas | Las que genera el JS llevan `<caption class="visually-hidden">` además de `<thead>`, `<tbody>` y `th` con `scope`: «Comparativa técnica de los modelos auraPhone» en `[data-aura-compare]` (configurable con `data-aura-compare-caption`) y «Precio: comparativa de auraPhone Duo, … y …» en cada grupo de `comparar.html` (el caption da nombre a la tabla; ya no hay `aria-labelledby`). `caption.visually-hidden` no empuja la tabla (aura.css §2) *(corregido en la v2.0: abajo, su caja de 1 px sobresalía por debajo de la tabla y el contenedor con desplazamiento horizontal se quedaba con la primera muesca de la rueda; ahora va arriba y `.aura-table-wrap` lleva `overflow-y: hidden`, ver §6)*. Un valor que falta es «—» a la vista y «Sin dato» para el lector de pantalla ([§12.5](#125-tabla-de-data-aura-compare)). |
| Navegación | Nombres de `nav` propios: «Principal» (barra y menú móvil), «Migas de pan» (antes «Ruta de navegación») y «Pie de página» (antes «Directorio»). `title` solo donde dice algo que el texto no dice: logotipo «AURA — Volver al inicio» (igual que su `aria-label`, que antes era «AURA, inicio»), «Comparar» y «Trade In» de la barra y del menú, enlace de la cinta, iconos sociales, «Newsroom», «Oportunidades» y «Créditos de imágenes» ([§12.1](#121-aura-header), [§12.2](#122-aura-footer)). |
| Título | `comparar.html` escribe un `document.title` de 40–65 caracteres con el formato «… — AURA» («Comparar modelos de auraPhone: especificaciones y precios — AURA»). |
| Documentación | Nueva [§15](#15-accesibilidad-y-metadatos-temario-diw): la lista que debe cumplir cualquier página nueva, con la plantilla del `<head>`. |
| Tablas de `comparar.html` | **Sin roles ARIA** (`table`, `rowgroup`, `row`, `columnheader`, `rowheader`, `cell`): eran redundantes y el validador del W3C daba 85 errores en el DOM ya pintado. La tabla sigue expuesta igual (comprobado en Edge) y no cambia nada a la vista ([§15.4](#154-tablas)). |
| Disponibilidad | `AURA.catalog.availability(p)` devuelve también `html` y `labelHtml`: el mismo texto con la fecha en `<time datetime>`. Lo usan la tarjeta de modelo, la tabla de `[data-aura-compare]`, el buscador y las páginas que pintan la disponibilidad ([§14.3](#143-auracatalog)). |
| Formularios | Casilla suelta con etiqueta envolvente **y** `for` + `id` (también «Mostrar solo las diferencias» de comparar y «Avisarme también…» de auraphone); los radios de un grupo, con la etiqueta envolvente ([§7](#casilla-y-radio)). Segmentado de radios: `role="radiogroup"` solo si va suelto; dentro de un `<fieldset>`, sin `role` ([§5](#chip-insignia-segmentado)). §15.5 corrige que los atributos HTML5 «validan si falla el JS» (con `novalidate` en el HTML, el navegador nunca valida) y recuerda que `AURA.ui.form` no los lee. |
| Guía viva | `componentes.html` pasa a «v1.5»; el ejemplo de segmentado con enlaces usa `aria-current="true"` (enlaza a otra página, no es la actual). |

## Cambios de la v1.4 (9 de octubre de 2026)

Corrección final tras la verificación de la skill «apple-design» dentro de la guía de estilo AURA (tokens, Kanit + Inter, escala 56 / 42 / 28 y botones de 48 / 999 / 24 sin cambios). **Qué ha cambiado** (detalle en cada sección):

| Área | Cambio |
| --- | --- |
| Gestos táctiles | **Ningún arrastre funcionaba con el dedo** (carrusel, hoja, aviso, segmentado): en táctil el navegador captura antes el descendiente tocado y, al pedir la captura, ese descendiente recibía un `lostpointercapture` que burbujeaba y cancelaba el gesto. `dragGesture` solo atiende ya la pérdida de captura del propio elemento ([§12.8](#128-carrusel)). |
| Muelles | El primer fotograma tras soltar avanza al menos un fotograma real (antes, ~1 ms: la hoja frenaba a la sexta parte de la velocidad del dedo justo en la costura) ([§14.8](#148-auraui-física)). |
| Segmentado | Solo anima `transform` (`translate3d` + `scaleX` del ancho; `width` solo en reposo). Con texto grande se reparte en filas (`.is-wrapped`) en lugar de esconder opciones; la pastilla viaja también en vertical. Sigue a `input.checked = …` hecho desde JS y `AURA.ui.segmented(el)` recoloca la pastilla de un control ya iniciado (devuelve `{ el, sync }`) ([§5](#chip-insignia-segmentado)). |
| Botones | **Sin `.aura-btn--sm`**: todos los botones miden 48 / 999 / 24 (guía §03). La fila de acciones de las tablas usa el botón normal; la acción de la barra local es el enlace contextual `.aura-localnav__action` («Comprar ›», «Contactar ›»). Secundario con el contorno `--accent` de la guía y borde más luminoso al pasar el ratón (`--accent-bright` #1787f7, solo trazo); desactivado sobre `--fill-disabled` (#252528) ([§5](#botón)). |
| Color | La columna destacada de la tabla ya no se tiñe de dorado (solo el nombre, como el prototipo). Sin `.aura-eyebrow--blue`: la etiqueta de tesela `--cover` la pinta `.aura-tile__tag` (blanco con el punto dorado) ([§2](#2-tipografía), [§6](#bento-y-teselas-rejilla-de-novedades)). |
| Fotos | Encuadre con `--photo-focus` y `.aura-photo-top` / `-bottom` / `-left` / `-right`; teselas `.aura-tile__media--blend` (aparato sobre negro, «aclarar» con la tesela) y `--contain` (foto entera). Texto de la tesela `--cover` en `--text-primary` y protección superior para su etiqueta (`--photo-scrim-top`). «Aclarar» se anula al imprimir y con colores forzados. Fotos retocadas sin logotipos ni textos de pantalla en inglés ([§1](#huecos-de-imagen)). |
| Superficies | `.aura-media__overlay--glass`: el panel de cristal de las cifras sobre foto, igual en inicio y acerca. `.aura-glass-bar`: barra flotante de página con el cristal en `::before` y el efecto de borde con desenfoque en `::after` (comparar). `[data-aura-relocate]`: saca de `<main>` una barra fija de página ([§1](#material-de-cristal-propio)). |
| Galería | El fundido cruzado es de la base: `AURA.ui.gallery(el).show(slot, …)`, con `.is-entering` / `.is-leaving`; se retira `.is-swapping` (bache a negro) ([§8](#galería-del-configurador)). |
| Carrusel | Las fotos de las diapositivas que aún no se ven se piden cuando el carrusel se acerca a la pantalla (antes llegaban a mitad del gesto) ([§10](#carrusel)). |
| Barra local | Mantiene el último enlace por el que se ha pasado en los bloques sin enlace; en el teléfono los huecos se estrechan y el título cabe entero también con el texto al 150 % ([§4](#barra-local-páginas-de-familia)). |
| Texto grande | Umbrales de `.aura-grid--2/--3/--4` en `em` (576 / 768 / 992 px con el texto normal; crecen con él). `.aura-family-card__body` y los hijos de `.aura-feature` no se ensanchan con una palabra larga. Pulgadas en un antetítulo: el texto va en un solo `<span>` (sin hueco antes de «″»). |
| Otros | `slotMarker` no copia al marcador las clases de estado (`is-*`). Las transiciones de aparición de las fotos van en `:where()` (especificidad 0). Créditos sin el título original del banco de imágenes. |

**Qué deben hacer las páginas** (ya hecho en todas): nada de `aura-btn--sm`; la acción de la barra local con `class="aura-link aura-localnav__action"`; etiquetas de tesela con `aura-eyebrow aura-eyebrow--mono aura-tile__tag`; el encuadre con `--photo-focus` y no con `object-position` propio; las barras fijas de página fuera de `<main>` o con `data-aura-relocate`; sin temporizadores que esperen a «simular» un proceso en la ruta de un toque.

## Cambios de la v1.3 (9 de octubre de 2026)

La base aplica la skill «apple-design» **dentro de la guía de estilo AURA** (tokens, Kanit + Inter, escala 56 / 42 / 28, botones de 48 / 999 / 24 y campos de 56 px no cambian) e integra las fotos reales. **Qué ha cambiado** (detalle en cada sección):

| Área | Cambio |
| --- | --- |
| Fotos | Los huecos piden directamente `NOMBRE.webp` (reserva: `.png` → `.jpg` → `data-fallback` → marcador). `AURA.html.img`, `slots.set`, tarjetas, bolsa, popover y marcador escriben `.webp`. Solo se pide la foto por color que existe (`imageVariants` en `data.js`); los demás colores usan la base directamente: sin peticiones fallidas ni parpadeo. Aparición: `.is-pending` (oculta) → `.is-loaded` con un fundido de 240 ms (sin animación con «reducir movimiento»; sin fundido si ya estaba en caché; nunca en la imagen con `fetchpriority="high"`). Al llegar la foto, el marco de héroes y bloques texto + imagen desaparece y la foto se funde con el negro por sus bordes. Las fotos de producto se funden con su panel (`mix-blend-mode: lighten`) en tarjeta, familia, bolsa y galería ([§1](#huecos-de-imagen)). |
| Catálogo | `imageColor` (acabado que se ve en la foto), `imageAlt` (alt de la foto real) e `imageVariants` en cada producto. `catalog.image()` → `{ slot, fallback, exact, color, alt }`; `catalog.defaults()` y `catalog.color()` sin color → el de la foto; la tarjeta de modelo lo preselecciona ([§14.3](#143-auracatalog)). |
| Créditos | `legal.html#imagenes` («Créditos de las imágenes»: miniatura, lo que se ve, autor, fuente, licencia y «recortada y ajustada de tono»), con `assets/js/creditos.js` (generado, solo en legal). Enlace «Créditos de imágenes» en los enlaces legales del pie. |
| Movimiento | Muelles: el primer fotograma ya avanza (antes se quedaba quieto justo al soltar) y la velocidad sale de la hora de cada evento. **Carrusel**: un golpe mueve una diapositiva en su sentido, nunca más; proyección ágil (0,99); el muelle no va más de ~1,5 veces más rápido que el dedo; rueda y trackpad con goma y ajuste desde el reposo. **Pulsación**: se cancela en cuanto gana un arrastre. **Hoja**: abrir y cerrar con botón, velo o Esc sin rebote (damping 1); rebote solo al soltar con impulso; con «reducir movimiento» también se arrastra. **Acordeón**: se recoge en el acto (antes el alto se quedaba 240 ms y luego todo saltaba). |
| Gestos nuevos | **Segmentado** con pastilla que se desliza (`.aura-segmented__thumb`) y se arrastra (radios y botones). **Avisos** que se apartan con el dedo; al llegar o irse uno, los demás se deslizan (FLIP). |
| Respuesta | Responden en `pointerdown` también la tarjeta de modelo (foto o nombre: toda la tarjeta escala), el resumen del acordeón y los enlaces de texto (bolsa, prosa, respuestas, pie, migas, marca, notas) ([§1](#estados-comunes)). |
| Materiales | Buscador, avisos y menú se **materializan** (escala + desenfoque), no solo se funden. La hoja inferior y el buscador **empujan la página hacia atrás** (3,5 %). Efecto de borde de las barras: desenfoque progresivo del material, no una línea (la línea vuelve con menos transparencia o más contraste). Popover de la bolsa sólido sobre la barra local (nunca cristal sobre cristal). Barra local: cristal en `::before`; su «Comprar» sin halo. Hojas y barras de compra se sacan de `<main>` al inicializar. |
| Háptica | `AURA.ui.haptic('exito' \| 'error' \| 'ajuste')`. `AURA.ui.form` vibra al rechazar un envío ([§14.9](#149-auraui-componentes)). |
| Texto grande | `.aura-btn` se parte (equilibrado) si no cabe y nunca es más ancho que su contenedor; `.aura-stack` no se ensancha; barra de compra a dos filas; barra global sin la palabra «AURA» si no cabe; título de la barra local con puntos suspensivos; pasos del checkout solo con círculos; opción con el precio debajo; línea de la bolsa con la imagen encima; correos y textos de característica que se parten; titulares que parten una palabra larga antes que salirse (`overflow-wrap: break-word`, `max-width: 100%`) y columnas de héroe, bloque texto + imagen y cabecera de sección que no crecen con su contenido (`grid-template-columns: minmax(0, 1fr)`). Todo con consultas de contenedor en `rem`. |
| Guía de estilo | Iconos de característica neutros (`--fill-2`) y `.aura-feature__icon--gold` para valor premium; marcas de `.aura-checklist` en `--text-secondary`; botón de la tarjeta de modelo a 48 px (sin `--sm`); título de la tarjeta de modelo al escalón H3 (22 → 28 px); `.aura-eyebrow--lg` en Kanit 18 → 22 px; titulillos del pie en Inter 14 / 600; campos sobre la Base con el fondo de la guía (`--field-bg`, `--field-bg-focus`) y foco sin resplandor exterior; desactivados iguales en primario, secundario e inverso; hover del inverso `--inverse-hover` (#e8e8ed); llamada a nota en Inter 11–12 px con tracking propio; `.aura-prose h4`. |

**Qué deben hacer las páginas** (fase de páginas):

- **Todas las que tienen fotos**: revisar los `alt` con la descripción **real** de cada foto (`scratchpad/img/fotos-colocadas.json`, campo `descripcionReal`; la de producto ya está en `imageAlt`). Primer héroe con `fetchpriority="high"` y sin `loading="lazy"` (falta en `acerca.html`, `aurapad.html` y `trade-in.html`); el resto, `loading="lazy" decoding="async"`.
- **auraphone**: `auraphone-plegable` no existe (cae en `auraphone-duo` tras tres peticiones fallidas): usa `data-slot="auraphone-duo"` o una foto real.
- **comprar**: usar `img.exact` / `img.alt` / `img.color` de `catalog.image()`: si el color elegido no tiene foto propia, `alt = img.alt` (no «X en negro») y una nota `.aura-caption` bajo la galería con la `.aura-swatch` del color de la foto: «Imagen en Azul glacial · Tu acabado: Negro». Sustituir `vibrar()` por `AURA.ui.haptic('exito')` y vibrar con `'ajuste'` en el aviso «Hemos ajustado tu configuración». El fundido de la galería ya no se dispara sin cambio real (el hueco es el mismo).
- **comparar**: quitar `aura-btn--sm` de los «Comprar» de las cabeceras de modelo (48 px, como la tarjeta); `.cmp-bar` sin `inset 0 -1px 0 var(--hairline)`: efecto de borde de material (ver `.aura-nav::after`).
- **checkout**: «Volver a…» como enlace contextual (`button.aura-link.aura-link--control` con chevrón), no `.aura-btn--ghost`; el ghost queda para «Cancelar» en una hoja.
- **bolsa**: en la fecha de entrega, pegar solo «14 de octubre» (`AURA.fmt.diaMes`), no el día de la semana.
- **Segmentados con CSS propio** (`.cuenta-tabs`, `.index-families`, `.ti-families`, `.cmp-intro__nav`): nada que hacer; si alguna página fijaba el fondo del ítem elegido, que lo quite (lo pinta la pastilla).
- **assets/img/LEEME.md**: actualizar «Formato» (`.webp` primero) y la tabla de fotos por color (solo `imageVariants`).

## Cambios de la v1.2 (3 de octubre de 2026)

Corrección final a partir de las revisiones de página, las pruebas de extremo a extremo y la crítica de coherencia. **Qué ha cambiado** (detalle en cada sección):

| Área | Cambio |
| --- | --- |
| Fechas y unidades | `fmt.fecha` y `fmt.diaMes` escriben «16 de octubre» con espacios indivisibles (la fecha no se parte entre líneas). Nuevo `fmt.dia(fecha)`: sin el año si es el de hoy, con él si no (la disponibilidad lo usa). Nuevo `fmt.units(texto)`: cifra y unidad juntas en los textos del catálogo («120 Hz», «1 TB», «USB 3»); lo usan la tabla comparativa, el comparador y las cifras de auraBook ([§14.2](#142-aurafmt)). |
| Catálogo | `catalog.entry(familia)`: el modelo de entrada (el del precio «Desde»), destino de todos los «Comprar auraX». `catalog.url()` y `catalog.withHoy()` conservan `?hoy=` entre páginas. Con `?hoy=`, `orders.create()` fecha el pedido ese día. `tradeIn.get()` recalcula el valor guardado (nunca se fía de `localStorage`) ([§14.3](#143-auracatalog)). |
| Letra pequeña | `AURA.legal.text(clave)` y `data-aura-legal="clave"`: un único texto para precios, financiación, Trade In, reservas, envío, cifras y demostración. Notas al pie: `<ol>` con «volver» para las que tienen llamada y `<ul>` debajo para la letra pequeña general; mismo sangrado en las dos; siempre sobre negro ([§6](#notas-al-pie)). |
| Bloques de tienda | `[data-aura-perks="familia"]` (las cuatro ventajas de comprar en AURA, igual en inicio y en las tres familias), `[data-aura-family-cards]` (tarjeta de familia de bolsa vacía y Trade In), `[data-aura-from]` y `[data-aura-buy]` (botones «Comprar auraX» y llamada final de familia) ([§12.9](#129-bloques-de-tienda)). |
| Tarjeta de modelo | El pie (precio y botón) se decide por el ancho de la tarjeta con una consulta de contenedor, igual en todas las de una fila: botón debajo del precio por debajo de 20 rem de contenido, a su derecha con sitio. Sin precio válido no pinta «Desde 0 €». «24 meses» no se parte. `.aura-lineup`: 2 + 1 entre 768 y 991 px (la tercera, a lo ancho) y 3 columnas desde 992 px. |
| Carrusel | `.aura-carousel--bleed` (llega al borde de la pantalla, alineado con el contenedor). Añade `role="region"` si falta. Un ancla dentro de una diapositiva no visible mueve el carrusel. El texto de estado cuenta lo que se ve entero también en el margen. |
| Barra local | En el teléfono (< 768 px) los enlaces se pliegan en un menú bajo la barra que abre un chevrón (lo añade `aura-ui.js`). |
| Objetivos | Con puntero fino, enlaces sueltos, `--control`, migas y enlaces legales del pie miden 24 px como mínimo. Llamadas a nota: área de pulsación invisible de 24 / 44 px. En táctil, el «›» de un enlace suelto sigue a la última palabra aunque el texto se parta. |
| Tipografía | `.aura-display` baja hasta 36 px (≤ 360 px de ancho). En dos columnas (≥ 992 px), los titulares de `.aura-hero--split` y `.aura-split` se miden con su columna (unidades de contenedor). `text-wrap: pretty` en los textos de los componentes; preguntas del acordeón equilibradas. La marca de pulgadas (″) se dibuja siempre con Inter. |
| Formularios | Campos de 56 px (`min-height: 3.5rem`), como la guía y los prototipos. Opción desactivada: se atenúan título y precio; la nota que lo explica se sigue leyendo. |
| Otros CSS | Separadores del pie que nunca cuelgan; `--ribbon-h` (alto real de la cinta); `.aura-hero__actions` y `.aura-cluster--stack-sm` apilan los botones con el mismo ancho en el teléfono; `.aura-empty__actions` igual; `.aura-section-head--split` alinea el enlace en la línea base; `.aura-split--wide-media` a dos columnas desde 1200 px; `.aura-tile--media-fit`; marcador de hueco arriba en `.aura-tile--cover` y sin radio en un `.aura-media--frame`; `.aura-tile--cover` más alta en el teléfono; acordeón que abre al instante (los saltos a un ancla funcionan) y enlaces subrayados en sus respuestas; la barra de compra reserva su hueco dentro del pie; `.aura-bag-line--compact` alineada arriba y `.aura-bag-line__qty`; llamadas a nota que suben una sola vez y no pasan de 12 px. |
| Tabla comparativa | La fila de acciones al pie de la tabla lleva botones secundarios en todas las columnas (como comparar.html); la primaria es la de cada tarjeta o cabecera de modelo. |
| Textos | Glosario de llamadas a la acción y tono (§13): el guiño de marca, solo donde lo pone el prototipo. |

**Qué se ha quitado de las páginas** (v1.2; ya hecho en todas): `keepDates()` de inicio y los arreglos de fecha de bolsa y auraphone; `.index-shelf …__foot`, la estantería a sangre y `.index-perks` de `index.css`; `.auraphone-acciones`, `.auraphone-servicio` y `.auraphone-checklist`; `.aurapad-tiles` y `ul.aura-footnotes__list` de `aurapad.css`; el titular a 10,2 vw y el apilado del ecosistema en `aurabook.css`; los `text-wrap` locales de acerca, soporte, legal y cuenta; los campos de 56 px y `last baseline` de `cuenta.css`; `.bolsa-familia` y `.ti-next` (tarjeta de familia de la base); los textos propios de financiación y Trade In de las notas (`AURA.legal`).

## Cambios de la v1.1 (3 de octubre de 2026)

Revisión de la base a partir de lo que encontraron las páginas. **Qué ha cambiado** (detalle en cada sección):

| Área | Cambio |
| --- | --- |
| Disponibilidad | Nueva `AURA.catalog.availability(p)` → `{ status: 'proximamente' \| 'reserva' \| 'disponible', title, label, text, canBuy, preorder, release }`, calculada cada día con `product.availability.preorder` / `.release` (días locales) y `AURA.catalog.today()` (admite `?hoy=AAAA-MM-DD` para pruebas). `catalog.cta()` → «Configurar» / «Reservar» / «Comprar». `bag.add()` devuelve `null` si `canBuy` es `false`. En `data.js` ya **no** hay `availability.status` ni `availability.label`: salen de las fechas ([§14.3](#143-auracatalog)). |
| Tarjeta de modelo | `AURA.html.productCard(p, { heading, colorId })`, la misma que pinta `[data-aura-lineup]`; con la fila `.aura-product-card__status` si el modelo aún no está disponible ([§12.4](#124-tarjetas-de-data-aura-lineup)). |
| Tabla y buscador | La fila «Precio» sale siempre de `basePrice` (se borró `specs.precio` de `data.js`) y lleva `.aura-table__note` con la disponibilidad. El buscador añade `.aura-search__item-status`. |
| Fechas | `AURA.fmt.fecha('2026-10-16')` trata `AAAA-MM-DD` como día local (antes, al oeste de Greenwich, daba el día anterior). Nuevo `fmt.diaMes()` («23 de octubre»), `AURA.util.parseDate()` y `AURA.util.isoDate()`. |
| Trade In | Tope en `data.js` (`tradeIn.cap: 800`); `AURA.tradeIn.cap` lo lee (ya no es una constante del núcleo). Nuevo `AURA.tradeIn.max(familia?)` («hasta X €»). Cada estado trae `description`. La cinta de la cabecera calcula la cifra (con espacio indivisible) y nombra las tres familias. |
| Catálogo | `shipping: { standard: 0, express: 9.95 }`. auraPhone Duo: `specs.peso` con el grosor cerrado (10,4 mm) y Touch ID en `highlights`; `badge` «Nuevo · Plegable» (ya no «Próximamente»: eso lo dice la disponibilidad). auraBook: `os` y `specs.sistema` pasan de «auraOS Mac 27» a «auraOS 27» (la marca original no se nombra; el prototipo dice «auraOS»). `updated` = 2026-10-03. |
| Objetivos táctiles | 44 px en pantallas táctiles para todo `a.aura-link` suelto (fuera de una frase) y `.aura-link--control`; `.aura-localnav__title` ocupa el alto de la barra; nombres enlazados de `.aura-product-card` y `.aura-bag-line` (sin mover el diseño); los puntos del carrusel ya no encogen y, si no caben, se cambian por el contador `.aura-carousel__counter` («3 de 9»). |
| Componentes nuevos | `.aura-btn--destructive`, `.aura-footnotes` (+ `__list`, `__back`, `.aura-footnote-ref`), `.aura-bag-line__care`, `.aura-stat--md`, `.aura-material` (+ `--thin`, `--thick`), tokens `--vibrant-label`, `--vibrant-secondary`, `--vibrant-tertiary`. |
| Correcciones de CSS | Segmentado con enlaces o botones (cada ítem medía todo el control), `.aura-fieldset > legend` con su separación, `.aura-steps` en móvil, `.aura-buybar--always` en escritorio, `.aura-halo` dentro de su sección, `.aura-stat--xl` circular, `.aura-tile--cover.aura-tile--tall`, nota de `.aura-auth-card` al partirse, sin aspa nativa en `input[type=search]`, separadores de los enlaces legales del pie. |
| JS | `AURA.ui.form` ignora controles desactivados o dentro de `[hidden]` / `[inert]` (campos condicionales). `[data-aura-stepper]` no pierde el foco. `AURA.ui.busy` bloquea el reenvío. `AURA.auth.user()` trae `creado`, `remember` y `desde`. `<aura-footer crumbs>` admite varios niveles (`AURA.footer.setCrumbs`). Texto de estado del carrusel con varias diapositivas por vista. |
| Huecos de imagen | Con `data-fallback`, el marcador muestra la ruta **base** (con una imagen por producto basta) y, en pequeño, la variante opcional por color. |

**Qué deben adaptar las páginas** (y qué parches locales sobran ahora):

- **Todas**: quitar las reglas locales de 44 px para enlaces sueltos (`index.css` §2, `aurabook.css`, `bolsa.css`, `checkout.css`, `comprar.css`, `comparar.css`, `acerca.css`, `soporte.css`, `trade-in.css`): la base ya lo hace. Si un enlace suelto va como único contenido de un `<p>`, añádele `.aura-link--control`. Quitar los recortes locales del halo (`.auraphone-cta { overflow: clip }`, `.acerca-cita { overflow: hidden }`, `.soporte-hero { overflow: hidden }`). Las notas al pie propias (`.index-notes`, `.aurabook-notes`, `.cmp-notes`, `.ti-notes`) pasan a `.aura-footnotes`. No escribir «800 €» ni el estado de reserva a mano.
- **Disponibilidad** (inicio, auraphone, comparar, comprar, bolsa, checkout, soporte): sustituir `p.availability.status === 'reserva'` y `p.availability.label` por `AURA.catalog.availability(p)`; mostrar `a.text` cuando `a.status !== 'disponible'`. **Comprar**: con `canBuy === false` no ofrecer «Añadir a la bolsa» (explicar «Reserva a partir del…») y conservar `?hoy` al reescribir la URL. **Bolsa y checkout**: una línea con `line.availability.canBuy === false` no se puede pedir; fecha de entrega = `availability.release` cuando `status === 'reserva'`; usar `AURA.catalog.today()` en lugar de `new Date()`.
- **Fechas**: quitar los arreglos locales de `T12:00:00` o los parseos propios (`auraphone.js`, `comparar.js`, `soporte.js`, `index.js`): `AURA.fmt.fecha` y `fmt.diaMes` ya tratan `AAAA-MM-DD` como día local.
- **auraphone**: quitar `.auraphone-bento .aura-tile--cover(.aura-tile--tall) { min-height }` y el texto escrito a mano de grosor cerrado y Touch ID (sale de `specs.peso` / `highlights`).
- **aurabook**: `.aurabook-battery` sobra (la cifra `--xl` ya es circular). Cambiar «auraOS Mac» por «auraOS» en `aurabook.html` (tres veces: entradilla, antetítulo y texto del bloque de ecosistema).
- **trade-in**: usar `condition.description` (quitar el mapa `DESCRIPTIONS`), `AURA.tradeIn.cap` / `.max()`, y `.aura-stat--md` en `.ti-result__stat` (quitar su tamaño local).
- **comprar**: quitar `.comprar-paso > legend { margin-bottom }` (la base pone 1 rem) y el arreglo local de `.aura-buybar--always` en escritorio; migas multinivel: `AURA.footer.setCrumbs([{ label: familia.name, href: familia.page }, verbo + ' ' + p.name])`.
- **bolsa**: AuraCare+ con `.aura-bag-line__care` (quitar `.bolsa-care` y las áreas de rejilla locales) y quitar la mitigación del foco del stepper.
- **checkout**: quitar `.checkout-steps …is-current { flex }`, `.checkout-form .aura-fieldset > .aura-legend { margin-bottom }`; leer `AURA.data.shipping.express`; volver a meter en el DOM los bloques condicionales (dirección, tarjeta) con `hidden` en lugar de sacarlos (§14.10).
- **cuenta / legal**: `.aura-btn--destructive` en lugar de `.cuenta-btn-destructivo` / `.legal-btn-destructivo`; quitar `.cuenta-tabs .aura-segmented__item { width: auto }` y la neutralización del `span`; mostrar «Miembro desde…» y «Sesión mantenida en este dispositivo» con `AURA.auth.user().creado` / `.remember`; quitar las banderas propias contra el doble envío (`AURA.ui.busy` ya lo impide).
- **comparar**: quitar `.cmp-intro__nav a.aura-segmented__item { width: auto }`; la fila de precio puede usar la de `AURA.ui.compare` o seguir calculándola desde `basePrice`; usar `.aura-material` y `--vibrant-*` en la cabecera flotante.
- **soporte**: quitar la ocultación local del aspa de `type="search"`.
- **aurapad**: sus notas propias (`<ol class="aura-stack aura-caption">` en una franja) pasan a `.aura-footnotes`, y el máximo de Trade In sale de `AURA.tradeIn.max('aurapad')` (no de un cálculo propio).

## Índice

0. [Cambios recientes](#cambios-de-la-v21-14-de-octubre-de-2026-accesibilidad-según-el-test-taw) (v2.1), [v2.0](#cambios-de-la-v20-13-de-octubre-de-2026-auditoría-de-scroll-fotos-y-coherencia-con-la-guía), [v1.7](#cambios-de-la-v17-11-de-octubre-de-2026-familia-aurapods) y [v1.6](#cambios-de-la-v16-10-de-octubre-de-2026)
1. [Convenciones globales](#1-convenciones-globales)
2. [Tipografía](#2-tipografía)
3. [Layout](#3-layout)
4. [Navegación](#4-navegación)
5. [Acciones](#5-acciones)
6. [Superficies y contenido](#6-superficies-y-contenido)
7. [Formularios](#7-formularios)
8. [Tienda](#8-tienda)
9. [Overlays](#9-overlays)
10. [Carrusel, acordeón, imagen](#10-carrusel-acordeón-imagen)
    - [10 bis. Escena que avanza con el scroll](#10-bis-escena-que-avanza-con-el-scroll)
11. [Movimiento](#11-movimiento)
12. [Marcado generado por JS](#12-marcado-generado-por-js)
13. [Reglas de uso](#13-reglas-de-uso)
14. [API JavaScript](#14-api-javascript)
15. [Accesibilidad y metadatos (temario DIW)](#15-accesibilidad-y-metadatos-temario-diw)

---

## 1. Convenciones globales

### Clases de estado en `<html>` y `<body>`

| Clase | Dónde | Quién la pone | Efecto |
| --- | --- | --- | --- |
| `aura-js` | `<html>` | `aura-core.js`, síncrono en el `<head>` | Activa el estado inicial oculto de `[data-aura-reveal]`. |
| `aura-ui` | `<html>` | `aura-ui.js` al arrancar | Desactiva el «seguro» que muestra el contenido a los 2,5 s si `aura-ui.js` no llega. |
| `aura-lock` | `<html>` | `aura-ui.js` mientras hay hoja, buscador o menú abiertos | Bloquea el scroll de la página. |
| `has-localnav` | `<body>` | La página (en el HTML) | La barra global deja de ser pegajosa; `.aura-localnav` se pega arriba. (También se detecta con `:has()` y `aura-core.js` la añade al cargar si encuentra una `.aura-localnav`, pero ponla siempre: así no hay salto.) |
| `has-buybar` | `<body>` | La página (en el HTML) | Reserva espacio inferior en móvil para `.aura-buybar`. |

### Tokens (`:root`)

Usa siempre el token: no escribas `rgba()` ni `blur()` a mano en las páginas.

| Grupo | Token | Uso |
| --- | --- | --- |
| Fondos | `--bg-main` #000 · `--bg-band` #0a0a0b · `--bg-secondary` #161617 · `--bg-elevated` #1d1d1f · `--bg-footer` #111113 | Lienzo · franja alterna · tarjetas · capas sobre tarjeta · pie. |
| Acento | `--accent` #0071e3 · `--accent-hover` · `--accent-bright` #1787f7 · `--accent-soft` · `--accent-ring` | Relleno de la acción primaria (con texto blanco) y contorno del secundario · hover del relleno (#0074e8: el más luminoso que conserva 4,5:1 con la etiqueta blanca; la v1 aclaraba a #1787f7, 3,59:1) · hover del contorno del secundario (el de la guía §03; **solo trazos**, nunca un relleno con texto; hoy coincide con `--accent-link`) · fondo suave de lo elegido · anillo de foco al 40 % de la guía. |
| | `--accent-link` #1787f7 · `--accent-link-hover` #4aa3ff | Azul para **texto** e iconos (v2.0: el de la v1 y del prototipo de Inicio): 5,85:1 sobre negro, 5,51:1 sobre franja, 5,03:1 sobre tarjeta, 4,68:1 sobre `--bg-elevated` · su hover, más luminoso (7,97:1 sobre negro): etiqueta del secundario en hover y en foco y enlaces sin clase (`.aura-link` se subraya, sin cambiar de color) (#1787f7 sobre el tinte `--accent-soft` de una tarjeta se queda en 4,34:1 y en 4,06:1 sobre `--bg-elevated`; #4aa3ff da 5,92:1 y 5,54:1). Con «más contraste», #6cb8ff y #9dd0ff. |
| Dorado | `--gold` #e5a93c · `--gold-soft` | Valor premium (antetítulos, columna destacada) · fondo de insignias y notas. |
| Texto | `--text-primary` · `--text-secondary` · `--text-tertiary` · `--text-placeholder` · `--text-disabled` | Títulos · cuerpo · notas · `placeholder` de los campos (≥ 4,7:1 también enfocado) · desactivado. Dentro de un material de cristal los tres intermedios se redefinen con vibrancia (§13). |
| Líneas | `--hairline` · `--hairline-strong` · `--edge-light` · `--field-border` · `--field-border-hover` | Separadores · bordes visibles · borde superior de un material (la luz lo toca) · límite de campos, casillas, opciones y cantidad (36 %: 3,14:1 sobre negro, 3,35:1 sobre tarjeta) · el mismo límite con el ratón encima (50 %, 5,32:1; blanco con «más contraste», para que el hover nunca baje el contraste). |
| Rellenos | `--fill-1/2/3` · `--fill-selected` · `--fill-disabled` | Fondos planos de controles (reposo · hover · pulsado) · la pastilla elegida del segmentado · el botón desactivado (#252528, guía §03). |
| Campos | `--field-bg` · `--field-bg-focus` | Fondo de los campos en reposo y en foco (sobre la Base, los de la guía §04; dentro de una superficie elevada bajan a 4 % / 7 %). |
| Botones | `--inverse-hover` | Hover del botón inverso (#e8e8ed, guía §03). |
| Fotos | `--photo-feather-x` · `--photo-feather-y` · `--photo-scrim` · `--photo-scrim-top` · `--photo-focus` | Máscara con la que una foto real se funde con el negro por sus bordes · degradado estático de protección del texto sobre una foto · el mismo arriba, para la etiqueta de una tesela `--cover` · encuadre (`object-position`) de una foto recortada (§1, huecos de imagen). |
| Estado | `--ok` · `--warn` · `--error` | Completado · aviso · error (siempre con icono y texto). |
| Materiales | `--glass-thin-bg/-filter` · `--glass-regular-bg/-filter` · `--glass-thick-bg/-filter` · `--glass-nav-bg` · `--glass-nav-thick-bg` · `--scrim` | Fino (avisos, tarjeta de cristal, botón secundario sobre la escena) · regular (popover, barra global y local) · grueso (hoja, buscador, barra de compra) · negro regular de la barra global (72 %; también la etiqueta `.aura-media__tag` sobre una foto) · negro grueso del menú móvil (86 %, v2.0). Fondo y filtro van siempre del mismo nivel. `--scrim`: velo de las tareas modales. Para una superficie de cristal propia usa la clase `.aura-material` (abajo). |
| Vibrancia | `--vibrant-label` (82 %) · `--vibrant-secondary` (74 %) · `--vibrant-tertiary` (62 %) | Texto sobre cristal: blanco translúcido, nunca gris plano. Controles y texto de apoyo con peso · secundario · terciario y `placeholder`. Con «más contraste» pasan a opacos. |
| Radios | `--radius-2xs` 6 · `--radius-xs` 8 · `--radius-sm` 12 · `--radius-md` 16 · `--radius-lg` 20 · `--radius-xl` 28 · `--radius-pill` | Solo la caja de las casillas (v2.0) · etiquetas, insignia mono · campos, tabla, tarjetas pequeñas y de cifra · opciones, notas, avisos · tarjetas, teselas, imágenes, popover, acceso (como el prototipo) · solo hojas y buscador · botones y chips. Ningún radio escrito a mano. |
| Sombras | `--shadow-1/2/3` · `--glow-accent` | Más profunda cuanto mayor la superficie: `--shadow-1` la pastilla del segmentado · `--shadow-2` popover, tarjeta elevada, tarjeta de acceso y paneles de cristal · `--shadow-3` hojas y buscador. Las tarjetas normales no llevan sombra: solo su borde `--hairline`. `--glow-accent`: halo del botón primario (.55 en reposo, 1 en hover). |
| Fuentes | `--font-display` (Kanit) · `--font-ui` (Inter) · `--font-mono` | |
| Medidas | `--nav-h` · `--localnav-h` · `--ribbon-h` · `--sticky-top` · `--gutter` · `--container` · `--gap` · `--space-block` · `--space-stats` | `--ribbon-h`: alto real de la cinta de `<aura-header>` (una o dos líneas: en el teléfono lleva su texto corto; lo mide `aura-core.js`, 0 sin cinta). Para «pantalla menos cabecera»: `calc(100svh - var(--nav-h) - var(--ribbon-h))`. `--space-block` (`clamp(3.5rem, 8vw, 6.5rem)`, 56 → 104 px): entre dos bloques de una misma sección. `--space-stats` (`clamp(2.5rem, 5vw, 4rem)`, 40 → 64 px): antes de una fila de cifras (v2.0; nunca `mt-5` ni una medida propia de página). |
| Movimiento | `--ease-out` (entrada) · `--ease-in` (salida, la misma curva espejada) · `--dur-press` 100 · `--dur-1` 160 · `--dur-2` 240 · `--dur-3` 560 · `--dur-check` 120 · `--dur-rm` 150 · `--dur-exit` 200 · `--dur-enter` 320 | Pulsación · halo, capa de hover y «›» · foto que llega · (reserva) · marca de casilla y radio · fundidos con «reducir movimiento» · salida de popover, aviso, buscador y menú, y fundido de la galería · desplazamiento de entrada de aviso, buscador y menú. Ninguna duración escrita a mano (v2.0). |
| Capas | `--z-localnav` · `--z-buybar` · `--z-nav` · `--z-overlay` · `--z-sheet` · `--z-toast` | Orden de apilado de lo fijo. |

### Material de cristal propio

```html
<div class="aura-material">…</div>                          <!-- regular -->
<div class="aura-material aura-material--thin">…</div>      <!-- fino; --thick: grueso -->
```

Fondo + desenfoque del nivel elegido y la vibrancia (redefine `--text-secondary`, `--text-tertiary` y `--text-placeholder` con los tokens `--vibrant-*`, como popover, hoja o barra de compra). Para paneles de cristal propios de una página. Bordes, radio y sombra los pone la página. Solo sobre fondos opacos: nunca cristal sobre cristal. Con «menos transparencia» y «más contraste» se vuelve opaco solo (usa los tokens). `.aura-card--glass` también lleva la vibrancia.

**Barra flotante de página (v1.4)** — para una cabecera o barra de herramientas que flota sobre el contenido (la de `comparar.html`):

```html
<div class="cmp-bar aura-glass-bar" data-aura-relocate>…</div>   <!-- posición, relleno y z-index: la página -->
```

`.aura-glass-bar` pone el cristal regular en `::before` (como la barra global), así la barra no es «raíz de fondo» y su efecto de borde (`::after`: 1 rem de desenfoque progresivo bajo la barra, no una línea) desenfoca de verdad lo que pasa por debajo. Con `.aura-material` el filtro va en el propio elemento y un `::after` con desenfoque ya no ve la página. Lleva la vibrancia; con menos transparencia o más contraste el borde vuelve a ser la línea `--hairline`.

**Barras fijas fuera de `<main>`.** Un `position: fixed` dentro de lo que se escala cuando la página retrocede (hoja inferior, buscador) se recolocaría respecto a `<main>`. Hojas y barras de compra las saca `aura-ui.js`; cualquier otra barra fija de página va fuera de `<main>` en el HTML o lleva `data-aura-relocate` (la base la mueve justo detrás de `<main>`, sin cambiar el orden de lectura). No se escala con la página: si debe apartarse mientras hay una tarea modal, la página la funde con `html.aura-recede` (como `comparar.css`).

### Estados comunes

- `.is-pressed` — pulsación. `aura-ui.js` la añade en `pointerdown` y la quita en `pointerup`, `pointercancel`, al perder la ventana el foco o al empezar a arrastrar; si el puntero se aleja más de 10 px del elemento se apaga y vuelve a encenderse al regresar (se puede cancelar arrastrando fuera). Se aplica a: `.aura-btn`, `.aura-icon-btn`, `.aura-nav__action`, `button.aura-chip` / `a.aura-chip`, `.aura-stepper__btn`, `.aura-field__toggle`, `.aura-option`, `.aura-swatch`, `a.aura-card`, `.aura-card--interactive`, `.aura-segmented__item`, `.aura-check`, `.aura-radio`, `.aura-carousel__dot`, `.aura-toast__action`, `.aura-toast__close`, `.aura-link`, `.aura-nav__link`, `a.aura-localnav__title`, `.aura-localnav__link`, `.aura-menu__link`, `.aura-menu__secondary a`, `.aura-popover__links a`, `.aura-search__item`, `.aura-search__submit` (v2.1, la lupa del buscador), `.aura-footer__social-link`, `.aura-localnav__toggle` y (v1.3) `.aura-product-card__media`, `.aura-product-card__name a`, `a.aura-bag-line__media`, `.aura-bag-line__name a`, `.aura-accordion__summary`, `.aura-accordion__panel a`, `.aura-prose a`, `.aura-footer__list a`, `.aura-footer__legal-links a`, `.aura-crumbs a`, `.aura-brand`, `.aura-footnote-ref > a` y `.aura-footnotes__back`. Una etiqueta cuyo control está `disabled` no responde. **En cuanto un arrastre gana** (carrusel, hoja, segmentado, aviso: umbral de 10 px), la pulsación se cancela. (`:active` ya lo cubre con ratón; la clase garantiza la respuesta inmediata en pantallas táctiles.) Cómo responde cada uno: botones, chips, opciones y muestras escalan; la tarjeta de modelo escala entera (`scale(.985)`) al pulsarla en cualquier punto (v2.1: el enlace estirado de su nombre la cubre y la pulsación se mide contra la tarjeta; su botón escala solo); enlaces de texto y de navegación se atenúan (`opacity: .6`); filas de lista (buscador, enlaces del popover) y el icono del acordeón se oscurecen con `--fill-3`.
- `:hover` solo dentro de `@media (hover: hover)`: en pantallas táctiles el «hover» se queda pegado tras el toque.
- `.is-active` / `aria-current` — elemento actual (navegación, chips, segmentado, puntos del carrusel).
- `.is-open` — overlay abierto. `.is-visible` — aviso o elemento revelado.
- `.is-invalid` / `.is-valid` / `.is-focused` — campos (se ponen en `.aura-field`; en un grupo de radios u opciones, en su `.aura-fieldset`; ver §7).
- `.is-dragging` / `.is-animating` — carrusel y hoja mientras se arrastran o hay un muelle en marcha (activan `will-change`).
- `.is-scrolled` (barra global, `.aura-table-wrap`) y `.is-stuck` (`.aura-localnav`) — efecto de borde: solo cuando hay contenido pasando por debajo. `.has-more-start` / `.has-more-end` — enlaces de la barra local que desbordan.

### Huecos de imagen

```html
<img class="aura-img" src="assets/img/NOMBRE.webp" data-slot="NOMBRE" width="1600" height="1200" alt="Lo que se ve en la foto" loading="lazy" decoding="async">

<!-- Solo la imagen del PRIMER héroe de la página: -->
<img class="aura-img" src="assets/img/NOMBRE.webp" data-slot="NOMBRE" width="1600" height="1200" alt="…" loading="eager" fetchpriority="high" decoding="async">
```

Las fotos del sitio son `.webp`: el hueco la pide directamente. Si falta, `aura-core.js` prueba `NOMBRE.png`, `NOMBRE.jpg`, luego `data-fallback="OTRO"` (`.webp`, `.png`, `.jpg`) y, si nada carga, lo sustituye por el marcador `.aura-slot` ([§12.3](#123-marcador-de-hueco-aura-slot)). El logotipo (`assets/img/aura-72.png`, 72 px y unos 3 KB: nítido a 36 px en retina; `aura.png`, de 512 px, queda para los iconos) no es un hueco. Las imágenes se diseñan para fondo negro. El `alt` describe **lo que se ve en la foto real**, no lo que anuncia el texto.

**Galería por color (v2.0).** Cada acabado tiene sus fotos reales, en varias vistas y con el mismo estilo (guía §14): `img/<diseño>-<color>-<vista>.webp`, declaradas en `photos` de `data.js` (§14.12). Las tarjetas, la bolsa, el checkout, el buscador y el comparador sacan el hueco de `AURA.catalog.image(producto, colorId)` (la primera vista, la de tarjeta, con la base `product.image` como `data-fallback`); el configurador enseña todas con `AURA.catalog.views(producto, colorId)` (§8). Si ese acabado no tiene fotos, se enseñan las del acabado por defecto con `exact: false` y la página lo dice («Imagen en plata · Tu acabado: negro»): ninguna petición fallida. Un producto sin `photos` sigue con su foto de siempre (`image`, o la de `imageVariants` si declara ese acabado). El marcador enseña como ruta principal la base y, en pequeño, «Opcional, una por color: …».

**Fotos de producto igualadas** (para que todas parezcan de la misma sesión; detalle y ejemplos en la guía §14):

| Requisito | Valor |
| --- | --- |
| Marco y fondo | 1600 × 1200 (4:3), negro #000 exacto hasta el borde, sin viñeta, reflejo ni halo horneados (el halo lo pone el panel) |
| Encuadre y escala | Producto centrado; su caja ocupa una fracción fija del marco según el tipo: teléfono, plegable y tableta 80 % (manda el alto en los altos: 960 px), portátil 84 % del ancho (1344 px), auriculares de diadema 76 % × 78 %, estuche y auriculares 70 % |
| Luz | Exposición común (las luces del producto al mismo nivel en todas) y el mismo balance |
| Vistas | La misma vista con el mismo ángulo en todos los colores, en este orden: teléfono y tableta `trasera`, `tres-cuartos`, `frontal`, `lateral`; plegable `trasera`, `abierto`, `frontal`, `cerrado`; portátil `tres-cuartos`, `abierto`, `frontal`, `cerrado`, `lateral`; diadema `frontal`, `tres-cuartos`, `trasera`, `lateral`; in-ear `estuche-abierto`, `auriculares`, `estuche-cerrado`. La primera es la de tarjeta y, siempre que se pueda, la misma en todos los modelos de una familia. Un color tiene las que hay en foto real buena |
| Pantalla | En las vistas con pantalla, la misma imagen AURA en todos los aparatos (con su isla o su muesca) |
| Retoque | Logotipos y marcas borrados; sin manos, cables ni soportes; sin textos de pantalla en inglés. Nunca se recolorea una foto para fingir otro acabado |

**Presentación (v1.3)** — lo hace la base, sin marcado extra:

- Una foto que aún no ha llegado lleva `.is-pending` (opacidad 0); al decodificarse pasa a `.is-loaded` con un fundido de opacidad de 240 ms, sin desplazamiento. Con «reducir movimiento» aparece sin fundido. Si ya estaba en caché no se oculta, y si llega casi al instante (`.is-instant`) aparece sin fundido: no parpadea. La imagen con `fetchpriority="high"` nunca se oculta (LCP). Las que tienen `data-aura-reveal` conservan su aparición; la galería, su fundido de cambio.
- En `.aura-hero__media` y `.aura-split__media` sin pie ni cifras encima (`.aura-media__caption`, `.aura-media__overlay`), al llegar la foto el contenedor pierde su borde y su fondo (el halo de `--halo` se queda, sin base) y la foto se funde con el negro por sus cuatro bordes (máscara `--photo-feather-x` / `-y`). Los bloques con pie o con cifras encima conservan su caja.
- Texto sobre una foto: degradado estático de protección `--photo-scrim` (lo llevan `.aura-tile--cover`; `.aura-media__overlay` trae el suyo).
- Las fotos de producto (aparato sobre negro puro) se funden con el fondo y el halo de su panel con `mix-blend-mode: lighten` en `.aura-product-card__media`, `.aura-family-card__media`, `.aura-bag-line__media`, `.aura-gallery` y `.aura-tile__media--blend`: nunca un rectángulo negro dentro de otro. Al imprimir (sin fondos) y con colores forzados, «aclarar» se anula (`mix-blend-mode: normal`): sobre blanco la foto desaparecería.
- Las transiciones de aparición (`.is-pending` → `.is-loaded`, `.is-instant`) van en `:where()`: especificidad 0. Un componente o una página que quiera su propio fundido lo escribe con su clase, sin pelear con la base.
- **Encuadre (v1.4).** Cuando una foto se recorta (`object-fit: cover` en teselas, `--fill`, héroes de página) o se ajusta (`contain`), `--photo-focus` dice qué parte manda (`object-position` de `.aura-img`, por defecto `50% 50%`). Se pone en el `<img>` o en su contenedor (se hereda): `.aura-photo-top`, `.aura-photo-bottom`, `.aura-photo-left`, `.aura-photo-right`, o un punto exacto en línea (`style="--photo-focus: 16% 50%"`). No escribas `object-position` en las páginas.

Tamaños recomendados (`width`/`height`):

| Uso | Tamaño | Proporción |
| --- | --- | --- |
| Producto (galería, tarjeta, exhibición) | 1600 × 1200, con sus variantes de 800 × 600 (`img/800/`) y 400 × 300 (`img/400/`) | 4:3 |
| Producto en un hueco de más de 800 px CSS (exhibición del auraPhone) | 2400 × 1800 cuando el original lo permita (hoy ninguno: se sirve la de 1600, sin `img/2400/`) | 4:3 |
| Miniatura de producto (bolsa, checkout, popover) | 800 × 800, recorte de la primera vista con el producto al 80 % (por hacer: hoy la línea usa la foto 4:3 entera) | 1:1 |
| Héroe dividido, teselas, bloques texto + imagen | 1600 × 1200 | 4:3 |
| Retrato de tarjeta (perfiles) | 1200 × 1500 | 4:5 |
| Héroe centrado, imagen panorámica | 1920 × 1080 | 16:9 |
| Banda a todo el ancho | 2400 × 600 | 4:1 |
| Miniatura (créditos de `legal.html#imagenes`, tira de vistas de comprar) | 240 × 180 (`img/thumbs/`: una por foto y por póster de escena, recortada al centro) | 4:3 |

Nombres en minúsculas con guiones: `inicio-hero-auraphone`, `auraphone-18-pro-max` (base del producto: `product.image`, respaldo), `auraphone-18-pro-negro-trasera` (galería: `<diseño>-<color>-<vista>`; un diseño puede servir a varios modelos, como `aurabook-pro` para el de 14″ y el de 16″). En el JS sácalos siempre de `AURA.catalog.image()` y `AURA.catalog.views()`; no los escribas a mano. Los créditos de cada foto (autor, fuente, licencia) están en `legal.html#imagenes`, generados en `assets/js/creditos.js`.

**`srcset` y `sizes` (v2.0).** `AURA.html.img` y `AURA.slots.set` escriben `srcset="img/400/x.webp 400w, img/800/x.webp 800w, img/x.webp 1600w"` y el `sizes` del hueco (por defecto `100vw`; en las perezosas, `auto` delante: el ancho real del hueco donde el navegador lo entiende). Si una variante no existe, el hueco quita el `srcset` y se queda el original antes de probar `.png` o `.jpg`. En el HTML, el mismo patrón con el `sizes` de su hueco:

| Hueco | `sizes` |
| --- | --- |
| Tarjeta de modelo | `(min-width: 1024px) 380px, 90vw` |
| Tarjeta de familia | `(min-width: 1200px) 280px, (min-width: 576px) 50vw, calc(100vw - 32px)` |
| Galería de comprar | `(min-width: 992px) 600px, calc(100vw - 32px)` |
| Exhibición de color del auraPhone | `(min-width: 1024px) 960px, calc(100vw - 32px)` |
| Exhibición de color de auraPad y auraBook | `(min-width: 1200px) 462px, (min-width: 768px) 35vw, calc(100vw - 72px)` |
| Exhibición de color de los auraPods Max 2 | `(min-width: 1024px) 704px, 80vw` |
| Bloque texto + imagen (`.aura-split`) | `(max-width: 991.98px) 88vw, (max-width: 1199.98px) 42vw, 532px` |
| Foto a todo el contenedor | `(min-width: 1280px) 1180px, 92vw` |
| Teselas del carrusel de una familia (252 px a 390) | `(max-width: 767.98px) 65vw, 375px` |
| Accesorios en dos columnas · en tres | `(max-width: 767.98px) 80vw, (max-width: 1199.98px) 40vw, 522px` · `(max-width: 767.98px) 80vw, (max-width: 991.98px) 41vw, (max-width: 1199.98px) 24vw, 322px` |
| Teselas de 322–358 px | `(max-width: 767.98px) calc(100vw - 32px), 360px` |
| Línea de la bolsa · checkout y popover | `128px` (`88px` en el teléfono) · `56px` |

En una exhibición de color (o cualquier `.aura-gallery` que cambie de foto con `AURA.ui.gallery`), el `sizes` de su hueco va en `data-sizes` del `.aura-gallery` (o en `show(slot, { sizes })`): la base lo pone en cada foto que monta. Sin él, el `srcset` elegiría por el ancho de la pantalla (`100vw`) y en escritorio pediría el original de 1600 para un hueco de 460–600 px.

Dentro de `.aura-product-card__media`, `.aura-tile__media`, `.aura-bag-line__media`, `.aura-gallery` y `.aura-media--fill` la imagen (o su marcador) llena el contenedor; fuera, ocupa el 100 % del ancho con la proporción de `width`/`height`.

---

## 2. Tipografía

| Clase | Uso | Tamaño |
| --- | --- | --- |
| `.aura-display` | Momento héroe (un único por página). Nivel nuevo de la v2 (la v1 llega al «Hero Title» de 56 px, que es `.aura-h1`) | 36–72 px (40 px a 390) |
| `.aura-h1` | Título de página; titular de un bloque texto + imagen (`.aura-split`) | 34–56 px |
| `.aura-h2` | Título de sección (`.aura-section-head`) | 28–42 px |
| `.aura-h3` | Título de tarjeta | 22–28 px |
| `.aura-h4` | Subtítulo | 20 px |
| `.aura-lead` | Entradilla: `max-width: min(44ch, 100%)` ≈ 56 caracteres por línea | 17–21 px |
| `.aura-body` | Cuerpo: `min(53ch, 100%)` ≈ 68 caracteres (`.aura-prose`, 53ch) | 16 px |
| `.aura-caption` (+ `--muted`) | Notas, precios al mes | 13 px |
| `.aura-eyebrow` | Antetítulo dorado con punto | 12 px |
| `.aura-price` (+ `--sm`, `--lg`) | Precios | 16 / 20 / 28–36 px |
| `.aura-mono` | Etiqueta técnica en mono mayúsculas | 12 px |

Roles que la v1 no tenía como clase de texto (v2.0, para no inventar tamaños en las páginas): **texto de componente** Inter 14 / 1,5 / 400 (`.aura-small` para un texto suelto; dentro de un componente, `.aura-feature__text`, `.aura-product-card__text`; la tesela, `.aura-tile__text`, 15); **botón** Inter 15 / 600 (`.aura-btn`; la v1 dibujaba 14 / 400); **nota** Inter 12 / 1,55 / 400 (`.aura-footnotes__list`, `.aura-table__note`, `max-width: min(65ch, 100%)`); **navegación** Inter 13 / 450 (barra global), Inter 12 / 450 (barra local) y Kanit 19 / 500 (título de la barra local); **cifras** Kanit 24 (`.aura-feature__value`), 26–38 (`.aura-stat`), 48–80 (`--lg`), 56–76 (`--md`) y 80–160 (`--xl`). Las hojas de página no escriben `font-size`, `line-height` ni `letter-spacing`: usan estas clases o la del componente.

**Medida en caracteres reales (v2.0).** Un `ch` es el ancho del «0» de Inter (≈ 0,63 em) y un carácter medio de un texto en español ronda 0,48 em: por eso 44ch dan los 56 caracteres de la entradilla y 53ch los 68 del cuerpo (con 56ch y 68ch salían 73 y 88). Notas y características: `min(60ch, 100%)`.

La clase da el aspecto; el nivel semántico lo da la etiqueta (`<h2 class="aura-h3">` es válido). Todas llevan `margin: 0`: el espacio lo ponen los contenedores (`.aura-section-head`, `.aura-stack`, `.aura-hero__copy`).

Tracking e interlineado vienen con cada clase y cambian con el tamaño: negativo en los titulares, ~0 en el cuerpo, positivo en lo pequeño. Por debajo de 768 px los titulares grandes miden casi la mitad y se aprietan menos (`.aura-display` −0,016em, `.aura-h1` −0,012em, `.aura-h2` −0,01em, frente a −0,025 / −0,02 / −0,015em en escritorio).

Inter se carga con su eje óptico para que `font-optical-sizing: auto` adapte el dibujo al tamaño. **Fuentes de reserva (v2.0):** mientras llegan (`display=swap`), el texto se pinta con «AURA Inter reserva Segoe / Arial» y «AURA Kanit reserva Segoe / Arial», caras locales escaladas con `size-adjust`, `ascent-override` y `descent-override` (un tramo de pesos por cara) para ocupar lo mismo que la fuente web; van detrás de Inter y Kanit en `--font-ui` y `--font-display`, así el texto no salta al cambiar (≈ 0,17 de CLS a 390 px en comprar). URL de fuentes del esqueleto de **todas** las páginas:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..700&family=Kanit:wght@500;600&display=swap" rel="stylesheet">
```

Variantes de `.aura-eyebrow`: `--mono` (mono mayúsculas, etiquetas técnicas tipo «NOVEDADES / 2026»), `--ok`, `--muted`, `--plain` (sin punto), `--lg` (nombre de producto sobre un titular héroe: momento de marca en Kanit 500, 18 → 22 px como en el prototipo, sin punto). **No hay variante azul** (v1.4): un antetítulo no se pulsa, y el azul es solo para acciones, foco e interacción (guía §01).

```html
<p class="aura-eyebrow aura-eyebrow--mono">Novedades / 2026</p>
<h2 class="aura-h2">Cuatro formas de entrar en otra dimensión.</h2>
<p class="aura-lead">Diseñadas juntas. Extraordinarias por separado.</p>
```

Texto largo (legal, historia): envuélvelo en `.aura-prose` (ritmo vertical, `h2`/`h3`/`h4` —el `h4` de prosa, 18 px, queda por debajo del `h3`, 20 px—, listas, enlaces subrayados).

**Sin palabras huérfanas.** Los titulares llevan `text-wrap: balance` y los textos de varias líneas de los componentes (`.aura-lead`, `.aura-body`, `.aura-caption`, `__text` de tesela, característica, tarjeta, cronología, nota, estado vacío y aviso, etiquetas de casilla, notas al pie, respuestas del acordeón…), `text-wrap: pretty`: no hace falta ninguna regla de página. En un texto corto de tarjeta donde el navegador no lo evite, pega las dos últimas palabras con `&nbsp;`. Las preguntas del acordeón van equilibradas, como titulares.

**En dos columnas** (`.aura-hero--split` y `.aura-split` desde 992 px) `.aura-display`, `.aura-h1` y `.aura-h2` se miden con el ancho de su columna (unidades de contenedor), no con el de la ventana: entre 992 y 1199 px una columna de ~420 px no recibe un titular de 72 px partido en cuatro líneas.

**Pulgadas.** Escribe `″` (U+2033) en los nombres («auraPad Pro 13″»): `aura-ui.js` lo dibuja siempre con Inter (`.aura-inch`) dentro de textos con Kanit o mono, que lo pintan como comillas. Si el texto está en un contenedor flex o grid (un `.aura-eyebrow`, con su hueco para el punto), lo envuelve entero en un único `<span class="aura-inch-run">`: cada trozo sería si no un elemento distinto y el hueco separaría la cifra de la marca («AURAPAD AIR 13 ″»).

**Antetítulos, siempre igual para lo mismo:**

| Dónde | Variante |
| --- | --- |
| Cabecera de sección, bloque texto + imagen, cabecera de página de tarea («Bolsa / 2 artículos», «AURA Store / auraPhone») | `--mono` con punto |
| Producto sobre un titular héroe | `--lg` |
| Gama sobre el héroe de familia («Gama auraPhone»), etiqueta de una tarjeta o tesela normal | `--mono --plain` |
| Etiqueta de tesela `--cover` (`.aura-tile__tag`) | `--mono` (`.aura-tile__tag` la pinta en blanco con el punto dorado, como el prototipo pero sin su punto azul) |

Utilidades de color: `.aura-text-primary`, `.aura-text-secondary`, `.aura-text-gold`, `.aura-text-blue`.

---

## 3. Layout

### Contenedor y sección

```html
<section class="aura-section aura-section--band" id="novedades" aria-labelledby="novedades-titulo">
  <div class="aura-container">
    <div class="aura-section-head">
      <p class="aura-eyebrow aura-eyebrow--mono">Novedades / 2026</p>
      <h2 class="aura-h2" id="novedades-titulo">Título de sección.</h2>
      <p class="aura-lead">Entradilla opcional.</p>
    </div>
    …
  </div>
</section>
```

- `.aura-container` (+ `--narrow` 800 px, `--wide` 1440 px).
- `.aura-section` (+ `--band` franja casi negra, `--tight` menos aire, `--center` todo centrado, `--flush-top` sin relleno superior). Alterna secciones negras y `--band` como en el prototipo.
- `.aura-section-head` (+ `--center`). Variante `--split` (texto a la izquierda, enlace a la derecha; el enlace se alinea con la línea base del último renglón del texto, `align-items: last baseline`):

```html
<div class="aura-section-head aura-section-head--split">
  <div class="aura-section-head__text">
    <p class="aura-eyebrow aura-eyebrow--mono">Comparativa técnica</p>
    <h2 class="aura-h2">Elige la potencia que encaja contigo.</h2>
  </div>
  <a class="aura-link" href="comparar.html?familia=auraphone">Comparar todos los modelos</a>
</div>
```

### Héroe

```html
<section class="aura-hero aura-hero--split" aria-labelledby="hero-titulo">
  <div class="aura-container aura-hero__inner">
    <div class="aura-hero__copy">
      <p class="aura-eyebrow aura-eyebrow--lg">auraPhone Duo</p>
      <h1 class="aura-display" id="hero-titulo">Titanio. Tan cósmico. Tan ligero. Tan AURA.</h1>
      <p class="aura-lead">…</p>
      <div class="aura-hero__actions">
        <a class="aura-btn aura-btn--secondary" href="auraphone.html">Más información</a>
        <a class="aura-btn aura-btn--primary" href="comprar.html?producto=ID">Comprar</a>
      </div>
    </div>
    <div class="aura-hero__media">
      <img class="aura-img" src="assets/img/inicio-hero-auraphone.webp" data-slot="inicio-hero-auraphone" width="1600" height="1200" alt="…" loading="eager" fetchpriority="high" decoding="async">
    </div>
  </div>
</section>
```

Modificadores: `--split` (texto + imagen), `--reverse` (imagen a la izquierda en escritorio; en móvil el texto va siempre primero), `--center` (todo centrado, imagen debajo), `--band`. La imagen del primer héroe lleva `loading="eager" fetchpriority="high"`; todas las demás, `loading="lazy" decoding="async"`. Cuando llega la foto, el contenedor pierde su marco y la foto se funde con el negro ([§1](#huecos-de-imagen)).

`.aura-hero__actions`: por debajo de 576 px, dos o más botones se apilan y miden lo mismo (el ancho del más largo), en lugar de dos píldoras de anchos distintos. Para cualquier otra fila de botones, `.aura-cluster.aura-cluster--stack-sm` hace lo mismo.

Héroe de familia: primaria «Comprar auraX» con `data-aura-buy="familia"` (modelo de entrada) y secundaria «Ver los modelos» (`#modelos`), igual en las tres.

### Bloque texto + imagen, rejillas y página de tienda

```html
<div class="aura-split aura-split--reverse">
  <div class="aura-split__copy"> … </div>
  <div class="aura-split__media"> … </div>
</div>
```

`.aura-split` (+ `--reverse`, `--wide-media`). Dos columnas desde 992 px; `--wide-media` (texto 0,8 / imagen 1,2) solo desde 1200 px: entre 992 y 1199 px se apila (texto primero), porque su columna de texto quedaría en ~350 px.
`.aura-grid` + `--2`, `--3`, `--4`, `--auto` (columnas iguales, responsive). Ajusta el hueco con `style="--gap:2rem"`. Los umbrales van en `em`: `--2` a dos columnas desde 36 em (576 px con el texto normal); `--3` a tres desde 48 em (768 px; no pasa por dos, dejaría una tarjeta sola); `--4` a dos desde 36 em y a cuatro desde 75 em (1200 px; v2.0: a 1024 px cuatro columnas de 217 px partían los titulares en 3–4 líneas). Si el usuario sube el tamaño de letra, crecen con él y las columnas se reparten antes de que un titular deje de caber en la suya.
**Ritmo vertical (v2.0).** Dentro de una sección, dos bloques seguidos (cabecera y bento, un bloque texto + imagen y el siguiente) se separan con `margin-top: var(--space-block)` y una fila de cifras con `var(--space-stats)` (§1, tokens): igual en las cuatro familias, sin `mt-5` ni medidas propias.
`.aura-layout` + `--aside` (contenido + columna de 320–384 px: bolsa, checkout, cuenta) o `--config` (galería + opciones: comprar). Una sola columna por debajo de 992 px.
`.aura-stack` (apila con hueco `--stack`, por defecto 1 rem; `--stretch` para hijos a todo el ancho) y `.aura-cluster` (fila que envuelve, hueco `--cluster`).

---

## 4. Navegación

`.aura-nav`, `.aura-ribbon`, el buscador, el menú móvil y el popover de la bolsa los genera `<aura-header>` ([§12.1](#121-aura-header)). `.aura-footer` lo genera `<aura-footer>` ([§12.2](#122-aura-footer)). No los escribas a mano.

### Barra local (páginas de familia)

Va dentro de `<main>`, justo después del héroe o como primer hijo. Requiere `<body class="has-localnav">`.

```html
<nav class="aura-localnav has-menu" aria-label="auraPhone" data-aura-localnav>
  <div class="aura-container aura-localnav__inner">
    <!-- v2.1: el título no es un enlace: nombra la página actual. Enlazado a su página repetía el enlace de la
         cabecera (H2 de TAW) y a #contenido daba un H30 nuevo -->
    <a class="aura-localnav__title" href="#top">auraPhone<span class="visually-hidden">: volver arriba</span></a>
    <!-- v2.0: el chevrón y .has-menu vienen en el HTML (sin salto al cargar); aura-ui.js solo engancha los eventos.
         v2.1: su nombre, en texto oculto (no en aria-label) -->
    <button type="button" class="aura-localnav__toggle" aria-expanded="false" aria-controls="localnav-secciones"><span class="bi bi-chevron-down" aria-hidden="true"></span><span class="visually-hidden">Secciones de auraPhone</span></button>
    <div class="aura-localnav__links" id="localnav-secciones">
      <a class="aura-localnav__link" href="#modelos">Modelos</a>
      <a class="aura-localnav__link" href="#detalles">Detalles</a>
      <a class="aura-localnav__link" href="#comparativa">Comparativa</a>
    </div>
    <a class="aura-link aura-localnav__action" href="comprar.html?producto=auraphone-18-pro" data-aura-buy="auraphone" data-aura-buy-short>Comprar<span class="visually-hidden"> auraPhone 18 Pro</span></a>
  </div>
</nav>
```

Estado: `.is-active` / `aria-current="true"` en el enlace de la sección visible (lo pone `aura-ui.js` con `IntersectionObserver` sobre `[data-aura-localnav]`). Si la franja central de la pantalla cae en un bloque sin enlace (ecosistema, ventajas, llamada final), sigue marcado el último enlace por el que se ha pasado: la barra siempre dice «dónde estoy». Antes de la primera sección con enlace (el héroe), ninguno.

`.aura-localnav__title` ocupa todo el alto de la barra (52 px). Es lo único que cede si no cabe todo: se recorta con puntos suspensivos y la acción nunca se sale de la pantalla. En el teléfono (y antes con el texto grande: el umbral, 30 em, crece con la letra) los huecos de la barra se estrechan y el título cabe entero también al 150 %.

**La acción de la barra local es el enlace contextual de la guía** (v1.4), no un botón: `<a class="aura-link aura-localnav__action">`, con su «›», todo el alto de la barra como objetivo y sin partirse. La barra es cromo de cristal: la única primaria azul a la vista es la del héroe (una primaria por contexto), y los botones de la guía miden siempre 48 px (no hay `--sm`). En las familias es «Comprar ›» con `data-aura-buy="familia" data-aura-buy-short`: la base pone el enlace del modelo de entrada (`AURA.catalog.entry`), el verbo según la disponibilidad y el nombre del modelo en texto oculto (`Comprar<span class="visually-hidden"> auraPhone 18 Pro</span>`; v2.1, antes en `aria-label`: TAW no lo cuenta y daba «Comprar» con destinos distintos). Igual en las cuatro familias; no escribas el ID a mano. En soporte, «Contactar ›».

**Título (v2.2).** Sube arriba del todo: `<a class="aura-localnav__title" href="#top">auraPhone<span class="visually-hidden">: volver arriba</span></a>`. `#top` lo entiende el navegador sin JS (arriba del documento); con JS, `aura-ui.js` lo hace con un desplazamiento suave (inmediato con «reducir movimiento») y sin dejar `#top` en la dirección. No enlaza a su propia página (repetiría el destino del enlace de la cabecera: H2 de TAW) y el texto oculto lo distingue del «auraPhone» de la cabecera (H30). Hover y pulsación, los de `a.aura-localnav__title`. El chevrón, si lo crea `aura-ui.js`, ya lleva su texto oculto («Secciones de auraPhone», del `aria-label` del `nav`).

**Mientras los enlaces no caben** junto al título y «Comprar» (por debajo de 992 px, 61,99 em: con texto grande, antes; v2.0, antes solo < 768 px y a 768–920 px se quedaban fuera «Modelos» o «Especificaciones») se pliegan en un menú bajo la barra que abre el chevrón (`button.aura-localnav__toggle`, 17 px en su caja de 44, `aria-expanded`, `aria-controls`; superficie opaca: la barra ya es de cristal). Entra y sale por el mismo camino; lo cierran un enlace, Esc (el foco vuelve al chevrón), un toque fuera o ensanchar la ventana hasta que el chevrón desaparece. **La barra llega plegable del HTML** (`.has-menu` y el botón, como arriba): así se pinta ya plegada y no salta al cargar (CLS de 0,13–0,33 a 390 px). Si el HTML no los trae, `aura-ui.js` los crea. El menú solo existe con `.aura-ui` en `<html>` (la pone `aura-ui.js`, que es quien lo abre): sin JS se ve la tira desplazable de siempre, con todos sus enlaces; con `.aura-js` y hasta que llega `aura-ui.js`, por debajo de 61,99 em la tira no se ve (sin salir del flujo) y, si no llega, vuelve a verse a los 2,5 s (`aura-ready-fallback`).

Lo que añade `aura-ui.js` a toda `.aura-localnav` (sin marcado extra):

- `.is-stuck` mientras está pegada arriba con contenido pasando por debajo: solo entonces aparece su efecto de borde, un desenfoque progresivo del propio material (1 rem que se desvanece), no una línea. Con menos transparencia o más contraste vuelve la línea `--hairline`. Con barra local, la barra global no flota y no pinta borde. El cristal de la barra local va en `::before` (como el de la global), así su borde puede desenfocar lo que pasa por debajo.
- `.has-more-start` / `.has-more-end` en `.aura-localnav__links` cuando los enlaces desbordan en horizontal (móvil): el lado por el que quedan secciones se funde, para que se vea que hay más.

### Migas

```html
<nav aria-label="Migas de pan">
  <ol class="aura-crumbs">
    <li><a href="index.html" title="AURA — Volver al inicio"><img src="assets/img/aura-72.png" width="20" height="20" alt="AURA — Volver al inicio"></a></li>
    <li><a href="auraphone.html">auraPhone</a></li>
    <li aria-current="page">auraPhone 18 Pro Max</li>
  </ol>
</nav>
```

Siempre dentro de un `<nav aria-label="Migas de pan">` (un `nav` por cada navegación, cada uno con su nombre). El último nivel es la página actual: `aria-current="page"` y sin enlace. Con puntero fino cada enlace mide al menos 24 × 24 px (también el logotipo); en pantallas táctiles, 44 px de alto y el del logotipo, además, 44 px de ancho (sin moverse del borde). Las migas del pie las genera `<aura-footer crumbs="…">`, también con varios niveles ([§12.2](#122-aura-footer)).

### Marca

```html
<span class="aura-brand aura-brand--lg">
  <img class="aura-brand__mark" src="assets/img/aura-72.png" width="36" height="36" alt="">
  <span class="aura-brand__word">AURA</span>
</span>
```

---

## 5. Acciones

### Botón

```html
<a class="aura-btn aura-btn--primary" href="comprar.html?producto=ID">Comprar</a>
<button class="aura-btn aura-btn--secondary" type="button">Más información</button>
<button class="aura-btn aura-btn--primary" type="button">Valorar mi dispositivo <span class="bi bi-arrow-right" aria-hidden="true"></span></button>
```

| Modificador | Uso |
| --- | --- |
| `--primary` | Azul con halo. **Una sola por contexto.** |
| `--secondary` | Contorno azul. Acompaña a la primaria. |
| `--inverse` | Claro sobre oscuro (fondos fotográficos). Hover: `--inverse-hover` (#e8e8ed, guía §03). |
| `--ghost` | Sin borde; acciones terciarias («Ver la bolsa» en el popover, «Cancelar» en una hoja). No es un estilo de la guía: para «Volver a…» en un flujo usa el enlace contextual (`.aura-link`). |
| `--destructive` | Texto y borde en `--error` sobre fondo neutro (6,2:1 sobre negro; AA también en hover y sobre una hoja). **Solo** para lo irreversible («Borrar todos los datos», «Eliminar ID de AURA») y siempre tras una confirmación. Combina con `--block`. |
| `--block` | Ancho completo. |

**Un solo tamaño** (v1.4): 48 px de alto, radio 999 y 24 px de relleno, como la guía. No hay variante pequeña: la fila de acciones de una tabla usa el botón normal y la barra local, el enlace contextual (§4).

**Etiqueta y halo (v2.0, desviación de la v1 anotada en la guía §00).** Inter 15 / 600 y, en el primario, el halo `--glow-accent` al .55 en reposo, como el prototipo de Inicio; la v1 dibujaba 14 / 400 con relleno plano.

Estados: `:hover` (capa más luminosa; en el primario, además, el halo pasa de .55 a 1 y el relleno a `--accent-hover` #0074e8 —la v1 aclaraba a #1787f7, pero el blanco sobre ese azul da 3,59:1—; en el secundario, el contorno pasa de `--accent` a `--accent-bright`, el fondo toma el tinte `--accent-soft` y la etiqueta pasa a `--accent-link-hover`, también con `:focus-visible`, como la guía §03), `:active` / `.is-pressed` (`scale(.97)`, 100 ms), `:focus-visible`, `:disabled` / `[aria-disabled="true"]` / `.is-disabled`, `.is-loading`. Solo para la guía: `.is-hover`. **Desactivado** igual en primario, secundario e inverso (relleno `--fill-disabled` #252528, sin borde, etiqueta `--text-disabled` #6e6e73: 3,01:1, legible; la v1 usaba #4d4d51, 1,82:1); el destructivo conserva su contorno. El color de base no se anima: la capa de hover (`::before`) y el halo (`::after`) se funden en 160 ms (`--dur-1`).

**Texto grande.** Los botones cortos siguen en una línea; un botón solo se parte (líneas equilibradas, `text-wrap: balance`) cuando no cabe, y nunca es más ancho que su contenedor (`max-width: 100%`). En una fila no cede ante sus vecinos (`flex-shrink: 0`). Los 48 px son un mínimo: con dos líneas crece en alto, con el mismo radio y relleno. `--block` ocupa todo el ancho.

```html
<!-- Acción destructiva: abre la confirmación (hoja) y, dentro, la misma variante confirma -->
<button class="aura-btn aura-btn--destructive" type="button" data-aura-sheet-open="borrar" aria-haspopup="dialog" aria-expanded="false" aria-controls="borrar"><span class="bi bi-trash3" aria-hidden="true"></span>Borrar todos los datos…</button>
```

Carga (lo pone `AURA.ui.busy`: inserta el indicador, cambia la etiqueta y, al terminar, lo quita). Mientras dura, el botón lleva `aria-busy` y `aria-disabled` pero conserva su aspecto (está trabajando, no desactivado), y ni el botón ni su formulario se pueden volver a enviar:

```html
<button class="aura-btn aura-btn--primary is-loading" type="submit" aria-busy="true" aria-disabled="true"><span class="aura-spinner" aria-hidden="true"></span>Procesando…</button>
```

### Botón de icono (44 px)

```html
<button class="aura-icon-btn" type="button"><span class="bi bi-x-lg" aria-hidden="true"></span><span class="visually-hidden">Cerrar</span></button>
<button class="aura-icon-btn aura-icon-btn--solid" type="button"><span class="bi bi-chevron-right" aria-hidden="true"></span><span class="visually-hidden">Siguiente</span></button>
```

**Nombre en texto oculto (v2.1).** Todo botón o enlace que a la vista es solo un icono (botón de icono, acciones de la barra, chevrón de la barra local, ojo de la contraseña, «−» / «+» de la cantidad, cerrar un aviso, flechas y puntos del carrusel, iconos sociales, «volver» de una nota) lleva su nombre como texto dentro: `<span class="visually-hidden">Cerrar</span>` detrás del icono, **sin** `aria-label` (el texto ya es el nombre; los dos a la vez se repetirían o se contradirían). Un nombre que cambia («Mostrar» ↔ «Ocultar la contraseña», «Bolsa, 2 artículos») se cambia en ese texto. El icono, siempre `<span class="bi …" aria-hidden="true">` (§15.3). `title` solo si quien usa el ratón necesita el texto emergente y el nombre no se ve en ningún otro sitio (iconos sociales, «volver» de las notas).

### Enlace contextual

```html
<a class="aura-link" href="trade-in.html">Valorar mi dispositivo</a>
```

El «›» lo añade el CSS: no lo escribas. `--plain` (sin «›»), `--muted` (gris). También vale en `<button class="aura-link aura-link--plain" type="button">Eliminar</button>`: como botón es un control y mide 44 px de alto. El subrayado y el desplazamiento del «›» son de `:hover` (solo con ratón); al pulsar, se atenúa.

**Objetivo.** Un `a.aura-link` suelto (abajo) y `.aura-link--control` son `inline-block` de al menos 24 px de alto con puntero fino; el «›» sigue siempre a la última palabra, aunque el texto se parta en dos líneas. En pantallas táctiles (`pointer: coarse`) un `a.aura-link` **suelto** —cuyo padre no es un elemento de texto (`p`, `li`, `dd`, `dt`, `td`, `th`, `span`, `label`, `small`, `strong`, `em`, `b`, `i`, `figcaption`, `blockquote`, `h1`–`h6`)— mide 44 px de alto: enlaces de un `.aura-cluster`, de `.aura-section-head--split`, al pie de una tesela o de una `.aura-feature`. Dentro de una frase sigue la línea de texto. Si el enlace es lo único que hay en un `<p>` (p. ej. «¿Has olvidado tu ID de AURA?»), añade `.aura-link--control`. No hace falta ninguna regla de página.

**Mismo texto, mismo destino (v2.1).** Un texto de enlace genérico que en la página lleva a sitios distintos («Comprar», «Configurar», «Reservar», «Más información», «Comparar todos los modelos») se completa con el producto o la familia en un `<span class="visually-hidden">` **dentro** del enlace, no con `aria-label` (TAW, H30, lee el texto del enlace; el `aria-label` taparía además lo que se ve):

```html
<a class="aura-btn aura-btn--secondary" href="aurabook.html">Más información<span class="visually-hidden"> sobre auraBook</span></a>
<a class="aura-btn aura-btn--primary" href="comprar.html?producto=aurabook-air-15">Comprar<span class="visually-hidden"> auraBook Air 15″</span></a>
<a class="aura-link" href="comparar.html?familia=aurapad">Comparar todos los modelos<span class="visually-hidden"> de auraPad</span></a>
```

El texto oculto empieza con un espacio (se lee «Comprar auraBook Air 15″») y el visible no cambia. Los nombres de familia y de modelo ya son específicos: no hace falta completarlos.

### Chip, insignia, segmentado

```html
<span class="aura-chip">Envío gratis</span>
<button class="aura-chip is-active" type="button" aria-pressed="true">Todos</button>

<span class="aura-badge">Nuevo</span>   <!-- --blue --ok --warn --error --neutral -->
<span class="aura-badge aura-badge--mono aura-badge--ok">Entregado</span>   <!-- etiqueta técnica: mono, mayúsculas -->

<!-- Con radios, suelto (sin leyenda visible): el propio segmentado es el <fieldset> y su <legend>, oculta, el primer
     hijo (v2.1: TAW no acepta role="radiogroup" + aria-label). Cada radio con id y su etiqueta con for -->
<fieldset class="aura-segmented">
  <legend class="visually-hidden">Familia</legend>
  <label class="aura-segmented__item" for="familia-auraphone"><input id="familia-auraphone" type="radio" name="familia" value="auraphone" checked><span>auraPhone</span></label>
  <label class="aura-segmented__item" for="familia-aurapad"><input id="familia-aurapad" type="radio" name="familia" value="aurapad"><span>auraPad</span></label>
</fieldset>

<!-- Con radios, dentro de un <fieldset> cuya <legend> es la pregunta: el segmentado es un <div> (un grupo basta) -->
<fieldset class="aura-fieldset">
  <legend class="aura-legend">¿Qué vas a entregar?</legend>
  <div class="aura-segmented">
    <label class="aura-segmented__item" for="entrega-auraphone"><input id="entrega-auraphone" type="radio" name="entrega" value="auraphone" checked><span>auraPhone</span></label>
    …
  </div>
</fieldset>

<!-- Variante con enlaces (p. ej. comparar.html?familia=…): aria-current="page" solo si el enlace lleva a la
     página que se está viendo; en una muestra que enlaza a otra página, aria-current="true" -->
<nav class="aura-segmented" aria-label="Familia">
  <a class="aura-segmented__item is-active" aria-current="page" href="comparar.html?familia=auraphone">auraPhone</a>
  <a class="aura-segmented__item" href="comparar.html?familia=aurapad">auraPad</a>
</nav>

<!-- Variante con botones: pestañas (role="tab" + aria-selected) o conmutadores (aria-pressed) -->
<div class="aura-segmented" role="tablist" aria-label="Secciones de tu cuenta">
  <button class="aura-segmented__item" type="button" role="tab" aria-selected="true" aria-controls="panel-pedidos">Pedidos</button>
  <button class="aura-segmented__item" type="button" role="tab" aria-selected="false" aria-controls="panel-datos" tabindex="-1">Datos<span class="d-none d-sm-inline">&nbsp;personales</span></button>
</div>
```

- `.aura-badge`: tipografía de la guía («Eyebrow / Badge», Inter 12 / 650) en píldora dorada rellena de 24 px, sin borde (la v1 la dibuja contorneada, de 30 px y peso medio, pero escribe 12 / 650: la v2 sigue el texto, guía §00); `--blue`, `--ok`, `--warn`, `--error`, `--neutral` cambian el color. `--mono` la convierte en etiqueta técnica (mono, mayúsculas, 11 px) para estados de pedido o «Demostración».
- Segmentado: 40 px de alto con puntero fino y 44 px en pantallas táctiles; responde a la pulsación con `scale(.96)`. Con radios, la pastilla es el `<span>` que sigue al `<input>` y llena su etiqueta; con enlaces o botones, la pastilla es el propio ítem a su ancho natural (se reparten el sobrante). Cualquier otro `<span>` dentro de un enlace o botón es solo texto (no hereda el estilo de pastilla). Elegido: `:checked`, `.is-active`, `aria-current`, `aria-pressed="true"` o `aria-selected="true"`.
- **Nombre del grupo de radios (v2.1; antes v1.5).** Los radios siempre van en un `<fieldset>` con su `<legend>` (§15.5; H71 de TAW), de una de estas dos formas: dentro de un `<fieldset>` cuya `<legend>` es la pregunta, y entonces el segmentado es un `<div>` (`trade-in.html`, «¿Qué vas a entregar?»); o suelto, y entonces **el propio segmentado es el fieldset**: `<fieldset class="aura-segmented">` con `<legend class="visually-hidden">` de primer hijo (`index.html`, «Ir a una familia»). Si comparte `<fieldset>` con otro grupo de radios, es su propio `<fieldset class="aura-segmented">` anidado, con su leyenda (`comprar.html`: «Familia» dentro del paso «Modelo»). Ya no se usa `role="radiogroup"` + `aria-label`: el lector lo entendía, pero TAW pide `<fieldset>` y `<legend>`. Cada radio lleva `id` y su etiqueta, `for` (H44); si el HTML no los trae, `aura-ui.js` los pone al iniciar el segmentado (`aura-seg-<name>-<valor>`, con `-2`, `-3`… si ya existe; en la exhibición de color, `<grupo>-<valor>`). La base quita al fieldset el marco, el margen y el ancho mínimo del navegador (`:where(fieldset.aura-segmented)`, especificidad 0): se ve igual que el `<div>` de las variantes de enlaces y botones, con su mismo relleno.
- **Pastilla que se desliza (v1.3, v1.4).** `aura-ui.js` añade a cada `.aura-segmented` un único `<span class="aura-segmented__thumb" aria-hidden="true">` (primer hijo; en la variante `<fieldset>`, justo detrás de la `<legend>`, que tiene que ser la primera) y la clase `.has-thumb`: el ítem elegido deja de pintar su fondo y lo pinta la pastilla (mismo `--fill-selected`, blanco al 16 %), que viaja de un ítem a otro con un muelle crítico (response .35), desde donde esté en pantalla e interrumpible; su ancho acompaña al avance. **Solo se anima `transform`**: el avance es `translate3d` y el ancho, un `scaleX` sobre el ancho real de la caja, que se escribe solo en reposo y **en `rem`** (v2.1: el ancho y el alto en línea pasan de px a rem con el tamaño real de la raíz; C28 de TAW), así que el texto grande del navegador no la descuadra. Sigue al estado, lo ponga quien lo ponga: el `change` de los radios, `input.checked = …` desde JS (el setter de cada radio del control está interceptado), o la página cambiando `aria-selected` / `aria-pressed` / `aria-current` / `.is-active` / `hidden`. En radios y botones **se arrastra**: se agarra el ítem elegido, sigue al dedo 1:1 con goma en los extremos y, al soltar, va al ítem más cercano a donde iba (proyección 0,99) heredando la velocidad, y activa ese ítem con `click()` (la página recibe su `change` o su `click` de siempre). Con enlaces no se arrastra (navegaría). Con «reducir movimiento», la pastilla aparece en su sitio con un fundido. `AURA.ui.segmented(el)` lo inicializa a mano o, si ya lo está, recoloca la pastilla; devuelve `{ el, sync(animar?) }` (no hace falta: es automático, también con el HTML que se inserte después).
- **Texto grande (v1.4).** Si las opciones no caben en una fila (texto al 150 % en el teléfono), el control se reparte en varias (`flex-wrap`) y `aura-ui.js` marca `.is-wrapped` (radio `--radius-lg` en lugar de píldora): ninguna opción queda escondida. La pastilla viaja también entre filas, con un muelle propio para la vertical (X e Y independientes), y el control deja de arrastrarse.

---

## 6. Superficies y contenido

### Tarjeta

```html
<div class="aura-card"> … </div>
```

`--elevated` (más clara, con sombra), `--glass` (cristal: **solo** sobre negro, franja o imagen; nunca dentro de otra superficie de cristal, hoja o popover), `--flush` (sin relleno), `--interactive` o `<a class="aura-card">` (se eleva al pasar el ratón y responde a la pulsación).

### Imagen enmarcada

```html
<figure class="aura-media aura-media--frame m-0">
  <span class="aura-media__tag">AURA Creative Suite</span>
  <img class="aura-img" … >
  <figcaption class="aura-media__caption">Un estudio completo que comparte memoria, color y ambición.</figcaption>
</figure>
```

`--halo` (resplandor azul de fondo), `--frame` (borde fino), `--fill` (la imagen llena el contenedor con `object-fit: cover`; dale altura con `style="aspect-ratio:16/10"`). `.aura-media__overlay` pega contenido (p. ej. `.aura-stats`) en la parte inferior con un degradado. **`.aura-media__overlay--glass`** (v1.4) lo convierte en el panel de cristal del prototipo (cifras sobre la foto de Cupertino, igual en inicio y acerca): material regular separado de los bordes de la foto, filo de luz arriba, sombra; sus cifras van tres en fila y escalan con el ancho del panel (contenedor), y con texto grande pasan a una lista. Si la página lo saca de la foto en el teléfono (inicio), quita en esa consulta el borde, el fondo y el filtro. Como `.aura-hero__media` o `.aura-split__media` y **sin** pie ni cifras encima, al llegar la foto el marco (borde y fondo) desaparece y la foto se funde con el negro ([§1](#huecos-de-imagen)); con pie o cifras se conserva la caja.

### Bento y teselas (rejilla de novedades)

```html
<div class="aura-bento">
  <div class="aura-bento__col">
    <article class="aura-tile aura-tile--tall">
      <div class="aura-tile__copy">
        <p class="aura-eyebrow aura-eyebrow--mono aura-eyebrow--plain">auraPhone 18 Pro</p>
        <h3 class="aura-h3">Nueva cámara. Nuevos flechazos.</h3>
        <p class="aura-tile__text">…</p>
        <a class="aura-link" href="auraphone.html">Más información</a>
      </div>
      <div class="aura-tile__media"><img class="aura-img" … ></div>
    </article>
    <article class="aura-tile"> … </article>
  </div>
  <div class="aura-bento__col">
    <article class="aura-tile"> … </article>
    <article class="aura-tile aura-tile--tall"> … </article>
  </div>
</div>
```

- Con `.aura-bento__col` se consigue la mampostería del prototipo (alta + baja / baja + alta), también con teselas `--cover` (`.aura-tile--cover` mide 26–28 rem de alto, y `.aura-tile--cover.aura-tile--tall`, 24–35 rem). Sin columnas, `.aura-bento` es una rejilla de 2 (`--3` para tres); `.aura-tile--wide` ocupa toda la fila.
- `.aura-tile--media-fit`: la imagen guarda su proporción (4:3; otra con `style="aspect-ratio:16/9"` en `__media`) y se apoya abajo. Úsalo en teselas de una misma fila con textos de distinta longitud (bento a dos columnas, carrusel con `h-100`): todas las imágenes miden lo mismo y empiezan a la misma altura.
- En una tesela `--cover`, el marcador de hueco enseña su icono y su ruta arriba (el texto ocupa la parte baja).
- `.aura-tile__media--blend` (v1.4): un aparato recortado sobre negro puro (auraBook o auraPad flotando). Sin la ventana negra de `__media`, el aparato queda sobre la propia tesela (Elevación/01) y «aclarar» convierte el negro de la foto en el gris de la tarjeta, como la tarjeta de modelo. Las fotos con ambiente no lo llevan.
- `.aura-tile__media--contain` (v1.4): la foto entera, ajustada a la caja. Con `.aura-photo-top` queda pegada arriba: para una foto compuesta con el sujeto arriba y negro abajo en una tesela `--cover` estrecha (~300 px), donde el recorte a lo alto subiría el titular hasta la parte clara.
- `.aura-tile--cover`: imagen a sangre y texto abajo sobre degradado (teselas «Ingeniería AURA» de la página de familia). El texto de apoyo va en `--text-primary` (sobre una foto que cambia, nunca un gris; la jerarquía la dan tamaño y peso) y, si la tesela lleva etiqueta, la parte de arriba tiene su propia protección (`--photo-scrim-top`). La etiqueta (`.aura-tile__tag`) va en blanco con el punto dorado. El orden del marcado es media → etiqueta → texto:

```html
<article class="aura-tile aura-tile--cover">
  <div class="aura-tile__media"><img class="aura-img" … ></div>
  <p class="aura-eyebrow aura-eyebrow--mono aura-tile__tag">Ingeniería AURA</p>
  <div class="aura-tile__copy">
    <h3 class="aura-h3">Dynamic Island. En primer plano.</h3>
    <p class="aura-tile__text">…</p>
  </div>
</article>
```

### Tarjeta de modelo

La pinta `[data-aura-lineup]` ([§12.4](#124-tarjetas-de-data-aura-lineup)). En la página basta con:

```html
<div class="aura-lineup" data-aura-lineup="auraphone"></div>
```

Para meterla en otro sitio (un carrusel, una rejilla propia) usa `AURA.html.productCard(producto, { heading: 'h3' })`: devuelve el mismo marcado. No lo copies a mano.

- `.aura-lineup`: una columna; dos entre 768 y 991 px (la tercera tarjeta, a lo ancho, con la imagen a la izquierda); tres desde 992 px.
- Título al escalón H3 de la guía (Kanit 500, 22 → 28 px, las métricas de `.aura-h3`). Botón primario de 48 px (sin `--sm`). Acabado (`__finish`) en azul: refleja la muestra elegida, como el prototipo; es **la única excepción** a «lo que no se pulsa no va en azul» (guía §00 y §01). Por defecto enseña el acabado de la foto (`imageColor`), así la etiqueta dice lo que se ve. Al pulsarla en cualquier punto (foto, nombre, texto), la tarjeta entera responde (`scale(.985)`); el botón responde solo.
- **Un enlace por tarjeta: el enlace estirado (v2.1).** La foto ya no es un enlace (`<div class="aura-product-card__media">`: un enlace con solo una imagen sin `alt` es un enlace vacío, F89 de TAW, y con el del nombre al lado eran dos seguidos al mismo destino, H2). La tarjeta entera sigue llevando al configurador: el enlace del nombre se estira con su `::after` (`position: absolute; inset: 0; z-index: 1`) sobre toda la tarjeta, foto incluida, y el botón queda por encima (`z-index: 2`) como su propio objetivo. Entre la tarjeta y el enlace no puede haber ningún contenedor posicionado (el `::after` se mide contra la tarjeta). `aura-ui.js` mide la pulsación contra la tarjeta, no contra el texto del nombre (un arrastre que sale de la tarjeta la suelta). Con el teclado, el nombre sigue siendo el único punto de tabulación de la tarjeta además del botón. El botón lleva el nombre del modelo en texto oculto: `Comprar<span class="visually-hidden"> auraPhone 18 Pro</span>`.
- **El pie siempre igual en una fila.** Estado, precio y botón se colocan según el ancho de la tarjeta (consulta de contenedor en `__body`), nunca según lo largos que sean «Configurar» o la cuota: por debajo de 20 rem de contenido, precio y cuota arriba y el botón debajo; con sitio, el botón a la derecha del precio, alineado con su última línea (como el prototipo). Las tarjetas de una fila miden lo mismo, así que todas eligen lo mismo. No hace falta ninguna regla de página.

### Característica

```html
<div class="aura-feature aura-feature--card">
  <span class="aura-feature__icon"><span class="bi bi-cpu" aria-hidden="true"></span></span>
  <p class="aura-feature__value">AURA M5</p>            <!-- opcional -->
  <h3 class="aura-feature__title">Rendimiento de estudio</h3>
  <p class="aura-feature__text">…</p>
</div>
```

`--card` (con superficie), `--inline` (icono a la izquierda, texto a la derecha). Ningún hijo es más ancho que su columna (`max-width: 100%`) y el texto parte una palabra larga (un correo con texto grande) antes de salirse de la tarjeta. El icono acompaña, no actúa: pastilla neutra (`--fill-2`, icono en `--text-primary`, filo `--edge-light`); el azul queda para lo que se pulsa. `.aura-feature__icon--gold` (fondo `--gold-soft`, icono `--gold`) solo para valor premium (AuraCare+, Trade In), como el icono de la nota, y nunca en la misma tarjeta que una primaria azul.

### Cifra

```html
<ul class="aura-stats">
  <li class="aura-stat"><p class="aura-stat__value">1976</p><p class="aura-stat__label">Año de fundación</p></li>
  <li class="aura-stat"><p class="aura-stat__value">100%</p><p class="aura-stat__label">Energía renovable</p></li>
</ul>

<div class="aura-stat aura-stat--xl">
  <p class="aura-stat__value">22</p>
  <p class="aura-stat__label">Horas de autonomía</p>
</div>
```

`--card` (caja), `--xl` (la gran cifra con resplandor: caja cuadrada de hasta 30 rem, centrada en su columna, para que el resplandor sea un círculo como en el prototipo), `--md` (la misma cifra destacada para columnas estrechas —resumen, tarjeta—: 56–76 px, sin caja cuadrada; vale sola o junto a `--xl`). Dentro de un `.aura-summary`, `--xl` se comporta como `--md`.

```html
<div class="aura-stat aura-stat--md">
  <p class="aura-stat__value">540 €</p>
  <p class="aura-stat__label">Hasta</p>
</div>
```

**Cifra destacada (v1.6)** — la cifra grande de una página de producto, alineada al inicio, con lo que la explica debajo:

```html
<ul class="aura-stats aura-stats--lg">
  <li class="aura-stat aura-stat--lg" data-aura-reveal="stat" style="--i:0">
    <p class="aura-stat__pre">Hasta</p>                                    <!-- opcional, encima de la cifra -->
    <p class="aura-stat__value">43<span class="aura-stat__unit">&nbsp;h</span></p>
    <p class="aura-stat__label">de reproducción de vídeo</p>
  </li>
  <li class="aura-stat aura-stat--lg" data-aura-reveal="stat" style="--i:1"> … </li>
</ul>
```

- `.aura-stat--lg`: cifra en Kanit 48 → 80 px (entre `--md` y `--xl`), sin caja ni resplandor; el tamaño intermedio se mide en `cqi` (el ancho de su contenedor, p. ej. la columna de texto de `.aura-split` desde 992 px; sin contenedor, la ventana), así en una columna estrecha se queda en 48 px en vez de salirse; `__label` en Inter 16 px `--text-secondary` (hasta 18 rem); `__pre` en Inter 16 / 600. `.aura-stat__unit` dibuja la unidad a la mitad del tamaño («43 h», «3.000 nits»), pegada con `&nbsp;`. `.aura-stats--lg`: columnas de 13 rem como mínimo (tres en escritorio, una en el teléfono).
- El orden del marcado es el de lectura (`__pre` → `__value` → `__label`: «Hasta / 43 h / de reproducción de vídeo»).
- `data-aura-reveal="stat"` (§11): al entrar en pantalla aparecen primero la cifra, después `__pre` y por último `__label` (120 ms entre partes, 80 ms entre cifras con `--i`), **solo con opacidad**. La cifra está escrita en el HTML: nunca un contador que la haga subir ni que haga esperar al lector.
- Las cifras salen del catálogo (`specs`, `highlights`): no inventes otras.

### Tabla comparativa

La pinta `[data-aura-compare]` ([§12.5](#125-tabla-de-data-aura-compare)): `<div data-aura-compare="auraphone"></div>`. Para una tabla escrita a mano usa el mismo marcado. La columna destacada lleva `.is-featured` en su `<th>` y en cada `<td>`: como en el prototipo, solo el nombre del modelo va en dorado; la columna no se tiñe (el dorado nunca rellena una superficie). Una nota bajo un valor (p. ej. la disponibilidad bajo el precio) va en `<span class="aura-table__note">`.

Toda tabla (también las escritas a mano) lleva `<caption>` con lo que compara, `<thead>` / `<tbody>` (y `<tfoot>` si hay totales) y `th` con `scope="col"` en la cabecera y `scope="row"` en la primera celda de cada fila. Si el diseño ya la titula con un encabezado visible, el caption se oculta solo a la vista con `class="visually-hidden"` (nunca `display: none`: lo borraría también para el lector de pantalla); `caption.visually-hidden` va arriba (`caption-side: top`) y no empuja la tabla (aura.css §2). Nunca una tabla para maquetar.

**El scroll vertical es de la página (v2.0).** `.aura-table-wrap` solo se desplaza en horizontal: `overflow-x: auto; overflow-y: hidden; overscroll-behavior-x: auto`. Con `overflow-y` en `auto` (lo que el navegador calcula si solo se escribe `overflow-x`), 1 px de más (el caption abajo o el filo de la última fila de la columna fija) bastaba para que la tabla se quedara con la primera muesca de la rueda y con un arrastre entero del dedo. Cualquier contenedor propio con desplazamiento horizontal hace lo mismo.

### Cronología, cita, nota, lista

```html
<ol class="aura-timeline">
  <li class="aura-timeline__item">
    <p class="aura-timeline__when">1976</p>
    <h3 class="aura-timeline__title">Un garaje y una idea radical</h3>
    <p class="aura-timeline__text">…</p>
  </li>
</ol>

<figure class="aura-quote">
  <blockquote class="aura-quote__text">El legado no es mirar atrás…</blockquote>
  <figcaption class="aura-quote__cite"><strong>Nombre</strong> · Cargo</figcaption>
</figure>

<div class="aura-note">                         <!-- --blue -->
  <span class="aura-note__icon"><span class="bi bi-lightbulb" aria-hidden="true"></span></span>
  <p class="aura-note__title">Nota de uso</p>
  <p class="aura-note__text">…</p>
</div>

<ul class="aura-checklist"><li>Envío gratuito</li><li>Devolución en 14 días</li></ul>
```

Las marcas de `.aura-checklist` son informativas: van en `--text-secondary` (no en azul).

### Notas al pie

La letra pequeña de la página (precios con IVA, financiación, reservas, cifras orientativas, «proyecto de demostración»), como en las páginas de producto de la guía: una sección `--tight` al final del `<main>`, separada por una línea fina, con texto de 12 px en `--text-secondary`.

```html
<!-- En el texto: la llamada -->
<p class="aura-body">Hasta 24 horas de autonomía.<sup class="aura-footnote-ref"><a href="#nota-1" id="ref-1" aria-label="Nota 1">1</a></sup></p>

<!-- Al final del <main>, siempre sobre negro (nunca --band) -->
<section class="aura-section aura-section--tight aura-footnotes" aria-labelledby="notas-titulo">
  <div class="aura-container">
    <h2 class="visually-hidden" id="notas-titulo">Notas</h2>
    <!-- 1. Numeradas: solo las que tienen llamada en el texto, cada una con «volver» -->
    <ol class="aura-footnotes__list">
      <li id="nota-1">La autonomía depende del uso y la configuración. <a class="aura-footnotes__back" href="#ref-1" title="Volver al texto de la nota 1"><span class="bi bi-arrow-return-left" aria-hidden="true"></span><span class="visually-hidden">Volver al texto de la nota 1</span></a></li>
    </ol>
    <!-- 2. Letra pequeña general, sin números: los textos comunes salen de AURA.legal -->
    <ul class="aura-footnotes__list mt-3">
      <li data-aura-legal="precios">Precios de venta recomendados en España, IVA incluido.</li>
      <li data-aura-legal="financiacion">Financiación sin intereses…</li>
      <li data-aura-legal="demo">AURA es un proyecto de demostración.</li>
    </ul>
  </div>
</section>
```

- **Un solo patrón en todas las páginas**: `<ol>` con «volver» para las notas con llamada y, debajo, `<ul>` sin números para la letra pequeña general. Las dos listas tienen el mismo sangrado: el texto de todas las notas empieza en la misma vertical y los números (o los símbolos de `<li data-mark="*">`: `*`, `†`, `‡`) cuelgan a la izquierda.
- **Textos comunes** (`data-aura-legal="clave"` o `AURA.legal.text('clave')` desde JS): `precios`, `financiacion` (meses del catálogo), `tradein` (tope del catálogo), `reservas`, `envio` (importe del catálogo), `cifras` y `demo`. No los redactes en la página: así la misma nota dice lo mismo en todo el sitio. Dentro de una nota propia vale un `<span data-aura-legal="…">` junto al texto de la página.
- `.aura-footnote-ref`: la llamada en superíndice, del color del texto (azul al pasar el ratón), pegada a la palabra (sin espacio en el marcado), sube una sola vez y mide siempre 11–12 px en Inter 600 con tracking +0,01em (no hereda el tracking negativo del titular en el que vaya); un área invisible de 24 px (44 px en táctil) facilita pulsarla. **Va en el texto de apoyo, nunca en la cifra de un precio**: «o 61,21 €/mes durante 24 meses¹», no «1.469 €¹». `.aura-footnotes__back`: volver al texto (24 px con ratón, 44 px en táctil); a la vista es solo la flecha, así que su nombre va como texto oculto dentro del enlace (v2.1: un enlace sin texto es el F89 de TAW) y en `title`, el texto emergente.
- La nota a la que se salta (`:target`) se resalta en `--text-primary`. Los enlaces de las notas van subrayados en gris.
- Para unas notas dentro de otro bloque (bajo un resumen, en una hoja) usa solo la lista `.aura-footnotes__list`.

### Orbe y halo decorativos (estáticos)

```html
<div class="aura-glow aura-glow--lg" aria-hidden="true"></div>   <!-- --sm 128 px · 256 px · --lg 384 px -->
<div class="aura-halo" aria-hidden="true"></div>                 <!-- primer hijo de una sección: resplandor de fondo -->
```

No se animan: nada de bucles lentos ni fondos en movimiento. `.aura-halo` ocupa la caja de su `.aura-section` o `.aura-hero` (ambas `position: relative`) y dibuja el resplandor dentro: nunca tiñe la sección vecina, no hace falta recortar la sección. Es un círculo de hasta 30 rem de radio; en una sección más baja se aplana en elipse y se apaga justo en los bordes.

---

## 7. Formularios

### Campo

```html
<div class="aura-field">
  <label class="aura-field__label" for="email">Correo electrónico <span class="aura-field__hint">Opcional</span></label>
  <div class="aura-field__control">
    <span class="aura-field__icon bi bi-envelope" aria-hidden="true"></span>          <!-- opcional, SIEMPRE antes del control -->
    <input class="aura-input" id="email" name="email" type="email" placeholder="tu@correo.com" autocomplete="email" aria-describedby="email-ayuda email-error">
  </div>
  <p class="aura-field__help" id="email-ayuda">Te enviaremos aquí la confirmación del pedido.</p>   <!-- opcional -->
  <p class="aura-field__error" id="email-error"></p>
</div>
```

- Controles: `.aura-input`, `.aura-select` (`<select>` nativo), `.aura-textarea`. Altura mínima 56 px (como la guía de estilo y los prototipos), texto de 16 px. Fondo `--field-bg` (sobre la Base negra se ve como el #161617 de la guía) y, en foco, `--field-bg-focus` («cristal», ≈ #1f1f24) + borde `--accent-link` + anillo `--accent-ring` pegado, sin resplandor exterior; el cambio es instantáneo y el cristal nunca sustituye al borde azul. Con el ratón encima, el borde en reposo pasa a `--field-border-hover` (50 %). Sobre la v1 (guía §00): el foco sigue su texto («Ring / Blue 40%»: anillo de 4 px) y no su dibujo; la etiqueta pasa a azul (13 / 500); el borde en reposo (36 %, 3,14:1) y el `placeholder` (#98989d) se aclararon desde #45454b y #6e6e73 para llegar a AA. Casillas: borde `--field-border` y radio `--radius-2xs`. Dentro de una superficie ya elevada (`.aura-card`, `.aura-auth-card`, `.aura-summary`, hoja, popover, nota, tesela) los dos tokens bajan a 4 % / 7 %. Un `.aura-input` con `type="search"` no muestra el aspa nativa de borrar (no llega a 44 px ni lleva el estilo del sistema): si hace falta, pon un `.aura-icon-btn` propio.
- La etiqueta es siempre visible (nunca solo `placeholder`). El `placeholder` usa `--text-placeholder` (≥ 4,7:1 también con el fondo de foco).
- **Siempre `<label for>` (v2.1).** Cada `input`, `select` y `textarea` tiene `id` y un `<label for="ese id">` con texto: es lo único que TAW (H44 / H65) acepta como etiqueta, además de `title`. Un campo sin etiqueta a la vista (el buscador) lleva la suya oculta, no un `aria-label`: `<label class="visually-hidden" for="aura-search-input">Buscar productos y páginas</label>`.
- **Icono que envía (v2.1).** Si el icono del campo es el envío de su formulario (la lupa del buscador de soporte), es un botón y no un `span`: `<button class="aura-field__icon soporte-buscador__enviar" type="submit"><span class="bi bi-search" aria-hidden="true"></span><span class="visually-hidden">Buscar</span></button>`, también antes del control (orden de foco = orden visual: lupa, campo, «Borrar la búsqueda»). La página le da 44 × 44 px, `pointer-events: auto` y la pulsación (`css/pages/soporte.css`) sin mover el dibujo; es el mismo patrón que la lupa del buscador global (`.aura-search__submit`, [§12.1](#buscador)).
- `.aura-field__error` está **siempre en el DOM y vacío**; solo se ve con `.is-invalid`.
- Estados (en `.aura-field`): `.is-invalid`, `.is-valid`, `.is-focused` (solo para la guía; el real es `:focus`). `disabled` en el control. Un campo válido muestra el borde verde y la marca; **al enfocarlo manda el foco** (borde azul + anillo) y el verde vuelve al salir.

Lo que hace `AURA.ui.form` al validar un campo (al escribir y al salir, no solo al enviar):

| Resultado | Contenedor del estado | Control | `.aura-field__error` |
| --- | --- | --- | --- |
| Error | `+ is-invalid`, `− is-valid` | `aria-invalid="true"` | `textContent = mensaje` |
| Correcto | `− is-invalid`, `+ is-valid` | quita `aria-invalid` | `textContent = ''` |
| Sin tocar / vacío opcional | quita ambas | quita `aria-invalid` | `textContent = ''` |

Contenedor del estado (en este orden): el `.aura-field` del control; si no hay, su `.aura-fieldset` (grupo de radios, opciones o casillas: el mensaje es un hijo **directo** del fieldset, los de sus `.aura-field` interiores no se tocan); si tampoco, la etiqueta de una casilla suelta (el mensaje se crea **después** del `<label>`, nunca dentro) o el contenedor común de las opciones de un grupo. El mensaje se crea si falta y se enlaza con `aria-describedby`. Con error, el borde de la caja, del radio o de la tarjeta-opción pasa a `--error`, **acompañado siempre del mensaje con icono**.

El campo no se marca como error mientras el usuario escribe por primera vez: el primer error aparece al salir (`blur`) o al enviar; a partir de ahí se revalida en cada `input`. Al enviar con errores, el foco va al primer campo inválido.

### Contraseña con botón de mostrar y requisitos

```html
<div class="aura-field aura-field--toggle">
  <label class="aura-field__label" for="password">Contraseña</label>
  <div class="aura-field__control">
    <input class="aura-input" id="password" name="password" type="password" autocomplete="new-password" aria-describedby="password-reglas password-error">
    <button class="aura-field__toggle" type="button" data-aura-password-toggle aria-pressed="false"><span class="bi bi-eye" aria-hidden="true"></span><span class="visually-hidden">Mostrar la contraseña</span></button>
  </div>
  <ul class="aura-rules" id="password-reglas" aria-label="Requisitos de la contraseña">
    <li class="aura-rules__item" data-rule="length"><span class="visually-hidden">Pendiente: </span>8 caracteres</li>
    <li class="aura-rules__item" data-rule="upper"><span class="visually-hidden">Pendiente: </span>Una mayúscula</li>
    <li class="aura-rules__item" data-rule="number"><span class="visually-hidden">Pendiente: </span>Un número</li>
  </ul>
  <p class="aura-field__error" id="password-error"></p>
</div>
```

- `[data-aura-password-toggle]` (lo gestiona `aura-ui.js`): alterna `type` del input hermano entre `password` y `text`, `aria-pressed`, el icono `bi-eye` ↔ `bi-eye-slash` (el `.bi` del botón) y su nombre «Mostrar la contraseña» ↔ «Ocultar la contraseña», que va en el texto oculto del botón (v2.1; si un botón antiguo no lo trae, en `aria-label`).
- Requisito cumplido: `.aura-rules__item.is-met` y el texto oculto pasa de «Pendiente: » a «Cumplido: ».

### Casilla y radio

```html
<!-- Casilla suelta: la etiqueta envuelve el control y, además, lo nombra con for + id -->
<label class="aura-check" for="login-recordar">
  <input class="aura-check__input" id="login-recordar" type="checkbox" name="recordar">
  <span class="aura-check__box" aria-hidden="true"></span>
  <span class="aura-check__label">Mantener la sesión iniciada en este dispositivo</span>
</label>

<!-- Radio de un grupo (siempre dentro de su <fieldset> con <legend>, ver «Grupo obligatorio»), también con for + id -->
<label class="aura-radio" for="envio-estandar">
  <input class="aura-radio__input" id="envio-estandar" type="radio" name="envio" value="estandar" checked>
  <span class="aura-radio__box" aria-hidden="true"></span>
  <span class="aura-radio__label">Envío estándar gratuito</span>
</label>
```

El orden input → box → label es obligatorio (los estados usan el selector de hermano). Toda la fila es el objetivo (44 px); la caja responde a la pulsación.

**Etiqueta y control (v2.1; antes v1.5).** La etiqueta siempre envuelve el control (así toda la fila es pulsable) **y además** lo nombra con `for` + `id`, sea una casilla suelta, un radio, una tarjeta-opción, una muestra de color o un segmentado: la asociación implícita es válida y accesible, pero TAW (H44) solo cuenta `<label for>`. No cambia nada a la vista. El `id` es el nombre del grupo más el valor (`envio-estandar`, `color-negro`); los controles que pinta el JS lo llevan único en la página (`aura-ui.js`: grupo + valor, con `-2`, `-3`… si ya existe; las muestras escritas a mano sin `id` también se enlazan). Una **casilla suelta** lleva su propio `name` (dos casillas sin `name`, o con el mismo, serían un grupo sin agrupar: H71). Un grupo de radios, o de casillas con el mismo `name`, va siempre en su `<fieldset>` con `<legend>` ([§5](#chip-insignia-segmentado) para el segmentado).

**Casilla obligatoria** («Acepto las condiciones»): envuélvela en un `.aura-field` con su `.aura-field__error` como **hermano** de la etiqueta, nunca dentro del `<label>` (el texto del error pasaría a formar parte del nombre de la casilla y, al pulsarlo, la marcaría):

```html
<div class="aura-field">
  <label class="aura-check" for="acepto">
    <input class="aura-check__input" id="acepto" type="checkbox" name="acepto" aria-describedby="acepto-error">
    <span class="aura-check__box" aria-hidden="true"></span>
    <span class="aura-check__label">Acepto las <a href="legal.html#condiciones">Condiciones de uso</a></span>
  </label>
  <p class="aura-field__error" id="acepto-error"></p>
</div>
```

**Grupo obligatorio** (radios u opciones): el estado va en su `.aura-fieldset` y el mensaje, al final, como hijo directo:

```html
<fieldset class="aura-fieldset">
  <legend class="aura-legend aura-legend--sm">Método de envío</legend>
  <label class="aura-radio"> … </label>
  <label class="aura-radio"> … </label>
  <p class="aura-field__error" id="envio-error"></p>
</fieldset>
```

En error: `.aura-field.is-invalid` (casilla) o `.aura-fieldset.is-invalid` (grupo) muestran el mensaje con icono y ponen en `--error` el borde de las cajas, radios o tarjetas-opción. Si una casilla suelta no tiene `.aura-field`, `AURA.ui.form` marca su etiqueta (`.aura-check.is-invalid`) y crea el mensaje justo después de ella.

### Agrupación

```html
<form class="aura-form" novalidate>
  <div class="aura-form__row">            <!-- dos columnas desde 576 px; --3 para tres -->
    <div class="aura-field"> … Nombre … </div>
    <div class="aura-field"> … Apellidos … </div>
  </div>
  <fieldset class="aura-fieldset">
    <legend class="aura-legend">Dirección de envío</legend>
    …
  </fieldset>
  <button class="aura-btn aura-btn--primary" type="submit">Continuar con el pago</button>   <!-- v2.1: siempre un envío real -->
</form>
```

**Todo `<form>` tiene su botón de envío (v2.1).** Un `<button type="submit">` (o un `<button>` sin `type`, que lo es) dentro del formulario: es el método estándar de envío (H32 de TAW) y el que usa Intro en un campo. Si la acción ya la hacía un botón `type="button"` con su `click`, pasa a `type="submit"` y la página escucha `submit` (o `AURA.ui.form`, que ya lo hace) sin cambiar lo que hace; también el buscador, que no lleva a otra página: su botón de envío es la lupa. Un botón que está fuera del formulario y lo envía con `form="id"` funciona, pero TAW solo cuenta el que está **dentro**: el formulario lleva además el suyo. Así lo resuelven las páginas: en la hoja del aviso del auraPhone Duo, el `<form>` envuelve el cuerpo y el pie de la hoja con `display: contents` (se ve igual) y su botón ya no lleva `form`; en comprar, el `<form id="configurador">` es la columna de pasos y resumen (el botón del resumen es `type="submit"`) y el de la barra de compra, `type="submit" form="configurador"`. Una muestra que solo enseña campos y no se envía (las de la guía viva) no es un `<form>`, sino un `<div>`.

`.aura-fieldset` reparte sus hijos con un hueco de 1 rem, pero el `<legend>` no es un elemento de esa rejilla (el navegador lo saca de la caja de contenido): la separación con el primer control la pone el sistema con un margen (`legend.aura-legend` 1 rem; `legend.aura-legend--sm` .75 rem). No la añadas en la página. Para campos que solo cuentan a veces (dirección solo con envío a domicilio) ver [§14.10](#1410-aurauiform).

### Mensaje de formulario

```html
<div class="aura-alert aura-alert--error" role="alert">
  <span class="bi bi-exclamation-octagon-fill" aria-hidden="true"></span>
  <p class="aura-alert__title">No hemos podido iniciar sesión</p>
  <p class="aura-alert__text">El ID de AURA o la contraseña no coinciden.</p>
</div>
```

`--ok`, `--warn`, `--error` (sin modificador: informativo).

### Tarjeta de acceso (login / registro)

```html
<main id="contenido" class="aura-auth">
  <div class="aura-auth-card">                        <!-- --wide para el registro -->
    <div class="aura-auth-card__head">
      <span class="aura-brand aura-brand--lg"><img class="aura-brand__mark" src="assets/img/aura-72.png" width="36" height="36" alt=""><span class="aura-brand__word">AURA</span></span>
      <h1 class="aura-auth-card__title">Inicia sesión con tu ID de AURA</h1>
      <p class="aura-auth-card__lead">Un solo acceso para tus dispositivos, servicios y experiencias AURA.</p>
    </div>
    <form class="aura-form" novalidate> … campos …
      <p class="aura-auth-card__legal">Al registrarte aceptas las <a href="legal.html#condiciones">Condiciones de servicio</a>…</p>
      <button class="aura-btn aura-btn--primary aura-btn--block" type="submit">Iniciar sesión en AURA</button>
    </form>
    <div class="aura-auth-card__alt">
      <p>¿No tienes ID de AURA?</p>
      <a class="aura-btn aura-btn--secondary" href="registro.html">Crear uno ahora</a>
    </div>
    <p class="aura-auth-card__note"><span class="bi bi-lock" aria-hidden="true"></span> Conexión privada y cifrada de extremo a extremo.</p>
  </div>
</main>
```

Medidas del prototipo: 520 px de ancho (560 px con `--wide`), 44 px de relleno (menos en móvil) y radio de 20 px. `.aura-auth-card__note` es un bloque de texto centrado con el icono en línea: si se parte en dos líneas, el icono sigue pegado a la primera palabra y las líneas se equilibran (`text-wrap: balance`).

---

## 8. Tienda

### Selector de color

```html
<fieldset class="aura-fieldset">
  <legend class="aura-legend">Acabado</legend>
  <p class="aura-legend aura-legend--sm">Color: <strong data-aura-color-name>Negro</strong></p>
  <div class="aura-swatches">
    <label class="aura-swatch" for="color-negro" style="--swatch:#1d1d1f">
      <input class="aura-swatch__input" id="color-negro" type="radio" name="color" value="negro" checked>
      <span class="aura-swatch__dot" aria-hidden="true"></span>
      <span class="visually-hidden">Negro</span>
    </label>
    …
  </div>
</fieldset>
```

El elegido lleva anillo azul (por `:checked`, sin JS). Versión informativa para tarjetas (no interactiva):

```html
<p class="aura-swatch-list" role="img" aria-label="Acabados: negro, plata, azul glacial, burdeos">
  <span class="aura-swatch-list__dot" style="--swatch:#1d1d1f"></span>
  <span class="aura-swatch-list__dot" style="--swatch:#e3e4e5"></span>
  <span class="aura-swatch-list__dot" style="--swatch:#bcd0df"></span>
  <span class="aura-swatch-list__dot" style="--swatch:#5a1a2a"></span>
</p>
```

### Opción de configuración (tarjeta-radio)

```html
<fieldset class="aura-fieldset">
  <legend class="aura-legend">Almacenamiento</legend>
  <div class="aura-option-group">                      <!-- --2: dos columnas desde 576 px -->
    <label class="aura-option" for="almacenamiento-256gb">
      <input class="aura-option__input" id="almacenamiento-256gb" type="radio" name="almacenamiento" value="256gb" checked>
      <span class="aura-option__card">
        <span class="aura-option__body">
          <span class="aura-option__title">256 GB</span>
          <span class="aura-option__note">Texto de apoyo opcional</span>
        </span>
        <span class="aura-option__price">Incluido</span>      <!-- o «+ 250,00 €» -->
      </span>
    </label>
  </div>
</fieldset>
```

Estados por `:checked`, `:disabled` y `:focus-visible` del input (sin JS). Elegida: borde azul y fondo `--accent-soft` (el de lo elegido); con el ratón encima, el borde de una sin elegir pasa a `--field-border-hover`. El orden input → card es obligatorio. Si título y precio no caben en una fila (texto grande, «Próximamente»), el precio baja bajo el título. Desactivada: borde discontinuo, título y precio en `--text-disabled` y la nota que explica por qué («Solo con M5 Max») en `--text-tertiary`, legible.

### Cantidad

```html
<div class="aura-stepper" role="group" aria-label="Cantidad de auraPhone 18 Pro Max">
  <button class="aura-stepper__btn" type="button" data-aura-step="-1"><span class="bi bi-dash" aria-hidden="true"></span><span class="visually-hidden">Quitar una unidad</span></button>
  <output class="aura-stepper__value" aria-live="polite">1</output>
  <button class="aura-stepper__btn" type="button" data-aura-step="1"><span class="bi bi-plus" aria-hidden="true"></span><span class="visually-hidden">Añadir una unidad</span></button>
</div>
```

El botón «−» se desactiva (`disabled`) con cantidad 1. La lógica es de la página (`AURA.bag.setQty`). Los dos botones son solo un icono: su nombre, en texto oculto (v2.1); el grupo sí se nombra con `aria-label` (no es un control).

### Resumen

```html
<aside class="aura-summary" aria-labelledby="resumen-titulo">
  <h2 class="aura-summary__title" id="resumen-titulo">Resumen</h2>
  <dl class="aura-summary__rows">
    <div class="aura-summary__row"><dt>Subtotal</dt><dd>3.518,00 €</dd></div>
    <div class="aura-summary__row aura-summary__row--discount"><dt>AURA Trade In</dt><dd>− 600,00 €</dd></div>
    <div class="aura-summary__row"><dt>Envío</dt><dd>Gratis</dd></div>
    <div class="aura-summary__row aura-summary__row--total"><dt>Total</dt><dd>2.918,00 €</dd></div>
  </dl>
  <p class="aura-summary__note">IVA incluido. O 121,58 €/mes durante 24 meses.</p>
  <a class="aura-btn aura-btn--primary aura-btn--block" href="checkout.html">Tramitar pedido</a>
</aside>
```

Pegajoso desde 992 px (`--static` lo desactiva). Va en la segunda columna de `.aura-layout--aside`.

### Línea de la bolsa

```html
<ul class="aura-bag-list">
  <li class="aura-bag-line" data-line-id="LINE_ID">
    <!-- v2.1: la miniatura no es un enlace (sería uno sin texto, junto al del nombre, que ya lleva al modelo) -->
    <div class="aura-bag-line__media">
      <img class="aura-img" src="assets/img/IMG.webp" data-slot="IMG" width="1600" height="1200" alt="" loading="lazy" decoding="async">   <!-- el hueco de AURA.catalog.image(productId, colorId) -->
    </div>
    <div class="aura-bag-line__info">
      <h2 class="aura-bag-line__name"><a href="comprar.html?producto=ID">auraPhone 18 Pro Max</a></h2>
      <p class="aura-bag-line__meta">Negro · 512 GB · AuraCare+</p>
      <div class="aura-bag-line__actions">
        <div class="aura-stepper" …> … </div>
        <button class="aura-link aura-link--plain" type="button" data-aura-remove>Eliminar</button>
      </div>
    </div>
    <div class="aura-bag-line__price">
      <span class="aura-price">2.098,00 €</span>
      <span class="aura-caption">87,42 €/mes</span>
    </div>
  </li>
</ul>
```

`--compact`: versión pequeña sin acciones (popover de la bolsa, resumen del checkout, pedidos de la cuenta); nombre y precio en Inter 14 / 600. La lista (`.aura-bag-list`) es contenedor de consulta: si una línea normal mide menos de 19 rem (texto al 125 % en el teléfono; v2.0: a 390 px con el texto normal, la lista mide 21,9 rem y la miniatura sigue al lado), la imagen pasa encima y la información y el precio usan todo el ancho. Eliminar una línea no pide confirmación: se elimina y se ofrece «Deshacer» en un aviso (`AURA.bag.restore`). En táctil, el nombre enlazado mide 44 px de objetivo sin mover la línea.

**La miniatura (v2.1)** no es un enlace: `<a class="aura-bag-line__media">` era un enlace sin texto (F89) seguido del nombre al mismo producto (H2). En la bolsa (`<div class="aura-bag-line__media" data-b-media aria-hidden="true">`) y en los pedidos de la cuenta (`data-cuenta-foto`) la página sigue el enlace del nombre al pulsarla (con Ctrl, Cmd o Mayús, en otra pestaña) y le pone `cursor: pointer`. No hay enlace estirado porque la línea tiene botones (cantidad, Eliminar, AuraCare+) y el precio no debe llevar al producto. En el popover, sin botones, el enlace del nombre sí se estira sobre toda la línea ([§12.1](#popover-de-la-bolsa)). La misma solución que en la bolsa sigue la foto de cada columna del comparador (`.cmp-head__media`, `data-cmp-media`).

**AuraCare+ en la línea** (cuarto hijo opcional, después de `__price`): una fila propia, a todo el ancho en móvil y bajo la información y el precio desde 576 px. Sin él, la línea no cambia.

```html
<li class="aura-bag-line" data-line-id="LINE_ID">
  … media · info · price …
  <div class="aura-bag-line__care">                         <!-- + is-on si ya está incluido -->
    <span class="aura-bag-line__care-icon"><span class="bi bi-shield-check" aria-hidden="true"></span></span>
    <p class="aura-bag-line__care-title">Añade AuraCare+ por 229,00 €</p>
    <p class="aura-bag-line__care-text">Dos años de cobertura con reparaciones por daños accidentales…</p>
    <button class="aura-link" type="button" data-care>Añadir AuraCare+<span class="visually-hidden"> a auraPhone 18 Pro</span></button>
  </div>
</li>
```

Con `.is-on` (incluido) el icono pasa al azul de «elegido» (`bi-shield-fill-check`), el título dice «AuraCare+ incluido» y la acción, «Quitar AuraCare+» (`aura-link--plain`). La acción va debajo del texto en móvil y a la derecha desde 768 px. El precio y la descripción salen de `AURA.catalog.carePrice(p)` y `AURA.data.care`; para cambiarlo, vuelve a añadir la línea con `care` contrario (`AURA.bag.remove` + `AURA.bag.add`, o la lógica de la página). No aparece en `--compact`.

### Estado vacío

```html
<div class="aura-empty">
  <span class="aura-empty__icon"><span class="bi bi-bag" aria-hidden="true"></span></span>
  <h2 class="aura-h3 aura-empty__title">Tu bolsa está vacía</h2>
  <p class="aura-empty__text">Cuando añadas un producto aparecerá aquí.</p>
  <div class="aura-empty__actions"><a class="aura-btn aura-btn--primary" href="auraphone.html">Ver auraPhone</a></div>
</div>
```

Con dos botones, al partirse en dos filas miden lo mismo (hasta 20 rem).

### Pasos del checkout

```html
<ol class="aura-steps" aria-label="Pasos del pedido">
  <li class="aura-steps__item is-done"><span class="aura-steps__num" aria-hidden="true">1</span><span class="aura-steps__label">Envío<span class="visually-hidden"> (completado)</span></span></li>
  <li class="aura-steps__item is-current" aria-current="step"><span class="aura-steps__num" aria-hidden="true">2</span><span class="aura-steps__label">Pago</span></li>
  <li class="aura-steps__item"><span class="aura-steps__num" aria-hidden="true">3</span><span class="aura-steps__label">Confirmación</span></li>
</ol>
```

En móvil (menos de 576 px) solo se ve la etiqueta del paso actual, y ese paso mide lo que su etiqueta («Confirmación» nunca se monta sobre el círculo siguiente); los demás se reparten el resto. Si la lista mide menos de 18 rem (texto grande en el teléfono), solo quedan los círculos numerados y sus conectores (las etiquetas siguen ahí para los lectores de pantalla).

### Galería del configurador

```html
<div class="aura-gallery aura-gallery--sticky">
  <img class="aura-img" src="assets/img/IMG.webp" data-slot="IMG" width="1600" height="1200" alt="Dos auraPhone 18 Pro Max de titanio oscuro…" decoding="async">
  <p class="aura-gallery__caption" aria-hidden="true">Negro</p>
</div>
```

Espera fotos de producto sobre negro puro (las de `assets/img`): se funden con el panel y su halo (`mix-blend-mode: lighten`; base `--bg-main` #000). La galería es una sola celda del tamaño de su caja útil (`grid-template: minmax(0, 1fr) / minmax(0, 1fr)`, v2.0): la foto se ajusta entera y centrada (antes quedaba 12 px por debajo del centro y, en la exhibición 16:10 del auraPhone, cortada por abajo). El pie (`.aura-gallery__caption`, el nombre del color) va en Caption: Inter 13 px, no mono.

**Vistas del acabado (v2.0).** El configurador enseña todas las fotos del acabado elegido: `AURA.catalog.views(p, color)` → `[{ slot, vista, label, aria, alt, exact, color, fallback }]`. Bajo la galería, una tira de miniaturas (`comprar.html`: `.comprar-vistas`, `role="toolbar"` con `aria-label` «Vistas del auraPhone 18 Pro»): un `<button>` por vista con su nombre en texto oculto, «Vista trasera», «Vista frontal», «Estuche abierto»… (`aria` de `views()`; v2.1, antes `aria-label`; la miniatura, con `alt=""`), `aria-pressed` en la elegida y un solo punto de tabulación (roving tabindex): ← → (dan la vuelta), Inicio y Fin la eligen al llegar. La miniatura es la de 240 × 180 de `img/thumbs/` (si falta, la foto grande). Cada botón llama a `AURA.ui.gallery(el).show(vista.slot, { fallback, alt })`: el mismo fundido cruzado. Al cambiar de color o de modelo vuelve a la primera vista; si el acabado tiene una sola foto, la tira se oculta sin dejar de ocupar su sitio (las muestras de debajo no se mueven), y si ningún modelo de la familia tiene varias, no se reserva. Con varias vistas la foto también se pasa deslizando el dedo (`touch-action: pan-y`: el gesto vertical sigue siendo de la página). Si `exact` es `false`, la nota de siempre: «Imagen en plata · Tu acabado: negro». Sin nada que decir, la nota guarda invisible la más larga del modelo (en el teléfono, la del Duo ocupa dos líneas): las muestras no se mueven al aparecer.

**Cambio de foto: fundido cruzado (v1.4).** `AURA.ui.gallery(el).show(info.slot, { fallback: info.fallback, alt, priority })` con `info = AURA.catalog.image(p, color)`. Si ese hueco ya está (a la vista o yéndose), solo cambia su `alt` y vuelve: un color sin foto propia **no funde nada** (cambia solo lo que dice la página: con `exact: false`, el `alt` de la foto y la nota «Imagen en azul glacial · Tu acabado: negro» bajo la galería). Si es otra foto, se monta encima invisible (`.is-entering`) y, en cuanto está decodificada, se funde sobre la anterior mientras esta se va a 0 (`.is-leaving`) y se retira: las dos ocupan la misma celda y nunca hay un bache a negro. Sin temporizadores de espera; un cambio nuevo parte de la opacidad en curso y manda sobre los anteriores. Si el hueco no existe, la base prueba sus reservas y promueve el marcador. Sin foto todavía, `show()` monta la primera (`priority: true` para la imagen principal de la página). `.is-swapping` (fundido a negro) se retiró.

### Exhibición de color

Para las páginas de familia (no para el configurador, que tiene su galería y su formulario): la foto del producto flotando sobre su halo, las muestras del catálogo debajo y el nombre del acabado.

```html
<div class="aura-colorway" data-aura-colorway="auraphone-18-pro">
  <div class="aura-gallery">
    <img class="aura-img" src="../img/auraphone-18-pro.webp" data-slot="auraphone-18-pro" width="1600" height="1200" alt="(imageAlt del producto en data.js)" loading="lazy" decoding="async">
  </div>
  <fieldset class="aura-colorway__picker">
    <legend class="visually-hidden">Acabados del auraPhone 18 Pro</legend>
    <div class="aura-swatches"></div>                              <!-- vacío: el JS pinta las muestras de data.js -->
    <p class="aura-colorway__name"><strong>Azul glacial</strong></p> <!-- el acabado de la foto (imageColor) -->
  </fieldset>
</div>
```

| Atributo | Por defecto | Qué hace |
| --- | --- | --- |
| `data-aura-colorway="id"` | — | Id del producto en `data.js`. Si `.aura-swatches` está vacío, se pintan sus colores en orden (`.aura-swatch` con radio, `--swatch: hex` y el nombre en `.visually-hidden`; v2.1: cada radio con `id` único, grupo + color, y su etiqueta con `for`; a las muestras escritas a mano sin `id` también se les pone). Vacío (`data-aura-colorway=""`): las muestras se escriben a mano y cada `input` puede llevar `data-slot`, `data-fallback` y `data-alt`. |
| `data-color="idDeColor"` | el de la foto (`imageColor`) | Acabado elegido al cargar. El JS lo actualiza al cambiar. |

- **La foto**: `AURA.catalog.image(producto, color)`, la primera vista de ese acabado (v2.0: galería por color, `photos` de `data.js`). Si el color tiene fotos, entra con el **fundido cruzado** de la galería (`AURA.ui.gallery`, solo opacidad, también con «reducir movimiento»). Una foto **solo se pide si está declarada** en `photos` (o, en un producto sin galería, en `imageVariants`): guardar el archivo no basta. Sin ella, se queda la del acabado por defecto (no hay fundido ni petición fallida) y el nombre lo dice: «**Plata** · Imagen en azul glacial» (`.aura-colorway__note`).
- **El nombre** (`.aura-colorway__name`) se reescribe al cambiar; el JS le pone `aria-live="polite"` después de pintarlo la primera vez (no se anuncia al cargar la página). El `alt` de la foto pasa a ser el de la foto que se ve.
- Sin caja: «aclarar» funde el negro de la foto con el fondo de la sección (negro o franja); la foto mide como mucho 50 rem de ancho (4:3).
- Evento en la raíz: `aura:colorway` con `detail: { colorId, name, exact, slot }`. API: `AURA.ui.colorway(el)` → `{ el, color(), set(colorId) }`.

### Barra de compra fija (móvil)

```html
<div class="aura-buybar" data-aura-buybar>
  <div class="aura-buybar__info">
    <p class="aura-buybar__name">auraPhone 18 Pro Max</p>
    <p class="aura-buybar__name aura-buybar__color">Negro</p>   <!-- v2.0: el acabado en su línea, nunca tras un «·» -->
    <p class="aura-price">1.619,00 €</p>
  </div>
  <button class="aura-btn aura-btn--primary" type="button">Añadir a la bolsa</button>
</div>
```

Solo visible por debajo de 992 px (`--always` para verla siempre). **En comprar va siempre** (`aura-buybar--always`, excepción documentada en la guía §00): el resumen va debajo de los pasos y, sin la barra, en escritorio no habría ninguna acción a la vista. El acabado va en su propia línea bajo el nombre (`.aura-buybar__color`, en `--vibrant-secondary`): con «Nombre · Color» en una línea se recortaba el color en 17 de 30 acabados a 390 px. Si precio y botón no caben en una fila (texto al 125–150 %), el botón baja a una segunda fila a todo el ancho y nunca tapa el precio; el nombre se recorta con puntos suspensivos, salvo por debajo de 375 px (v2.0), donde parte en dos líneas equilibradas: a 360 «auraPhone 18 Pro …» se confundía con el 18 Pro (la barra pasa de 95 a 115 px solo cuando hace falta). `aura-ui.js` la saca de `<main>` (justo detrás, sin cambiar el orden de lectura) y escribe su alto real en `--buybar-h`. Requiere `<body class="has-buybar">`, que reserva ese alto dentro del pie (su fondo llega hasta abajo: bajo el cristal no queda una franja negra); con `--always`, también en escritorio (`body.has-buybar:has(.aura-buybar--always)`), y su contenido se alinea con `.aura-container`. `.is-hidden` la esconde hacia abajo (por ejemplo, mientras el botón principal de la página está a la vista). Es la **misma** acción primaria que la del resumen de escritorio, no una segunda.

---

## 9. Overlays

Jerarquía de materiales (tokens de §1, fondo y filtro siempre del mismo nivel): aviso (**fino**) < popover, barra global y barra local (**regular**) < hoja, buscador, menú móvil y barra de compra (**grueso**, sombra profunda). **Velo solo en tareas modales** (hoja, buscador, menú); popover y avisos no bloquean. Nunca cristal sobre cristal: mientras hay una tarea modal abierta (`html.aura-lock`) los avisos pasan a ser una capa sólida. Todos entran y salen por el mismo camino, desde su disparador, y **se materializan** (escala + desenfoque + opacidad, no solo un fundido): el popover y el buscador desde su botón, el menú móvil desde el botón de menú (su lista se enfoca al llegar), los avisos desde arriba. **Velar para enfocar**: la hoja inferior y el buscador, además del velo, empujan la página hacia atrás (`scale` del 3,5 % sobre `<main>`, el pie y las barras, alrededor del centro de la pantalla; la hoja lo liga 1:1 a su muelle). Con «reducir movimiento», ni escala ni desenfoque: fundidos. En las páginas con barra local, el popover de la bolsa es sólido (`--bg-elevated`): se abre sobre ella y nunca hay cristal sobre cristal.

### Popover

```html
<div class="aura-anchor">
  <button class="aura-btn aura-btn--secondary" type="button" data-aura-popover-toggle="financiacion" aria-haspopup="dialog" aria-expanded="false" aria-controls="financiacion">Financiación</button>
  <div class="aura-popover" id="financiacion" role="dialog" aria-label="Financiación" tabindex="-1" aria-hidden="true">
    <div class="aura-popover__header"><h2 class="aura-popover__title">Financiación a 24 meses</h2></div>
    <p class="aura-popover__empty">Texto…</p>
  </div>
</div>
```

- Posición: debajo y alineado al inicio del disparador. `--end` (alineado al final; úsalo cuando el disparador está en la mitad derecha), `--top` (encima).
- **Control de colisión**: al abrir (y al cambiar el tamaño de la ventana con él abierto), `aura-ui.js` mide el popover y, si se saldría de la pantalla, lo desplaza en horizontal con la propiedad `translate` (en línea; `transform` es la que anima la materialización) hasta dejar 12 px de aire con el borde. El desplazamiento se conserva al cerrar, así que sale por donde entró. Red de seguridad sin JS: por debajo de 576 px nunca es más ancho que la pantalla menos sus márgenes. No escribas `translate` ni `left`/`right` a mano en un popover.
- Se «materializa» desde su disparador: `transform-origin: var(--aura-origin)`. `aura-ui.js` fija `--aura-origin` en línea con el centro del disparador relativo al popover ya colocado (p. ej. `style="--aura-origin: 212px 0"`).
- Comportamiento (`aura-ui.js`, delegado en `[data-aura-popover-toggle="ID"]`): alterna `.is-open` en `#ID`, `aria-expanded` en el disparador y `aria-hidden` en el popover; al abrir mueve el foco al popover; se cierra con Esc (devuelve el foco al disparador), al pulsar fuera (`pointerdown`) y al abrir otro. No bloquea el scroll ni pone velo.
- Partes: `__header`, `__title`, `__list`, `__footer`, `__total`, `__empty`, `__links`.

### Hoja / cajón

```html
<button class="aura-btn aura-btn--secondary" type="button" data-aura-sheet-open="mi-hoja" aria-haspopup="dialog" aria-expanded="false" aria-controls="mi-hoja">Abrir</button>

<div class="aura-sheet" id="mi-hoja" data-aura-sheet aria-hidden="true">
  <div class="aura-scrim" data-aura-sheet-close></div>
  <section class="aura-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="mi-hoja-titulo" tabindex="-1">
    <div class="aura-sheet__grabber" aria-hidden="true"></div>
    <header class="aura-sheet__header">
      <h2 class="aura-sheet__title" id="mi-hoja-titulo">Título</h2>
      <button class="aura-icon-btn" type="button" data-aura-sheet-close><span class="bi bi-x-lg" aria-hidden="true"></span><span class="visually-hidden">Cerrar</span></button>
    </header>
    <div class="aura-sheet__body"> … </div>
    <footer class="aura-sheet__footer"> … </footer>      <!-- opcional -->
  </section>
</div>
```

Cajón lateral derecho desde 768 px; hoja inferior con tirador por debajo (si la ventana cruza los 768 px con la hoja abierta, se cierra por el lado que le corresponde en ese momento). `--bottom` fuerza la hoja inferior (centrada, 640 px) en cualquier ancho. Coloca la hoja como hija directa de `<main>` o de `<body>` (nunca dentro de un elemento con `transform`, `filter` o `backdrop-filter`); al inicializarla, `aura-ui.js` la saca de `<main>` y la deja justo detrás (la página la encuentra igual por su id). Detalle del comportamiento en [§12.7](#127-hoja-aura-sheet).

### Avisos

No se escriben a mano: `AURA.ui.toast({ title, text, kind, action, duration })`. Marcado en [§12.6](#126-avisos-aura-toast). Se apartan con el dedo y se recolocan deslizándose cuando llega o se va otro.

### Buscador y menú móvil

Los genera `<aura-header>` ([§12.1](#121-aura-header)). Disparadores disponibles en cualquier página: `data-aura-search-open`, `data-aura-menu-open`.

---

## 10. Carrusel, acordeón, imagen

### Carrusel

```html
<div class="aura-carousel aura-carousel--bleed" data-aura-carousel role="region" aria-roledescription="carrusel" aria-label="Novedades de AURA">
  <div class="aura-carousel__viewport">
    <ul class="aura-carousel__track">
      <li class="aura-carousel__slide" aria-roledescription="diapositiva" aria-label="1 de 4"> … </li>
      <li class="aura-carousel__slide" aria-roledescription="diapositiva" aria-label="2 de 4"> … </li>
    </ul>
  </div>
</div>
```

- `role="region"` con `aria-roledescription` (ARIA 1.2 no lo admite en un `<div>` sin rol; si falta, `aura-ui.js` lo pone).
- Ancho de diapositiva: `--aura-slide` (por defecto `min(84%, 26rem)`: se asoma la siguiente). `--full` (una por vista), `--thirds` (tres por vista desde 992 px), `--wide` (v1.6: una foto grande por vista, `min(88%, 54rem)`, asomando la siguiente). Hueco: `--aura-gap`.
- **Galería de fotos de ejemplo** (v1.6, «hechas con auraPhone»): `.aura-carousel--bleed.aura-carousel--wide` con un `figure.aura-media.aura-media--frame` por diapositiva, la foto (`.aura-img`, con su `alt` real) y su `figcaption.aura-media__caption` («Retrato nocturno · Teleobjetivo x4»). Nada nuevo que inicializar: es el carrusel de siempre.

```html
<li class="aura-carousel__slide" aria-roledescription="diapositiva" aria-label="1 de 3">
  <figure class="aura-media aura-media--frame">
    <img class="aura-img" src="../img/NOMBRE.webp" data-slot="NOMBRE" width="1600" height="1200" alt="Lo que se ve en la foto" loading="lazy" decoding="async">
    <figcaption class="aura-media__caption">Atardecer desde el aire · Gran angular</figcaption>
  </figure>
</li>
```
- `--bleed`: la ventana llega hasta los bordes de la pantalla (las diapositivas entran y salen por el borde, como en una tienda) y la pista sigue alineada con el contenedor. La sección que lo contiene se convierte en contenedor y recorta lo que sale por los lados. Úsalo en todas las estanterías de página.
- Un ancla dentro de una diapositiva que no se ve (`#id`, `location.hash`) mueve el carrusel a esa diapositiva.
- Sin JS es una pista con `scroll-snap` nativo. Con JS, ver [§12.8](#128-carrusel).
- **Fotos a tiempo (v1.4).** Cuando el carrusel se acerca a la pantalla (a una pantalla de distancia), `aura-ui.js` pasa a `loading="eager"` las fotos de la pista: la carga diferida del navegador no ve lo que la ventana del carrusel recorta y las pedía al asomar, a mitad del gesto. También las que la página meta después en la pista. No hace falta ningún atributo.
- Puntos: objetivo de 24 × 44 px con puntero fino y de 44 × 44 px en pantallas táctiles (no encogen); el inactivo al 40 % de blanco (3,7:1 sobre negro). Si no caben en la fila (muchas diapositivas en una pantalla estrecha: 9 tarjetas a 390 px), `aura-ui.js` pone `.is-counter` en `.aura-carousel__controls` y en su lugar se ve el contador `.aura-carousel__counter` («3 de 9»); las flechas siguen siendo los controles y el estado se anuncia igual.

### Acordeón (preguntas frecuentes)

`<details>` nativo: funciona sin JS y con teclado. `name` igual en todos para que solo haya uno abierto.

```html
<div class="aura-accordion">
  <details class="aura-accordion__item" name="faq">
    <summary class="aura-accordion__summary"><span>¿Cuándo recibiré mi pedido?</span><span class="aura-accordion__icon" aria-hidden="true"></span></summary>
    <div class="aura-accordion__panel"><p>…</p></div>
  </details>
</div>
```

- Al abrir, el contenido es visible en el acto (solo se anima la opacidad): un salto a un ancla de dentro (`#id`, `scrollIntoView`, la apertura automática del navegador) funciona sin esperas. Al cerrar se recoge también en el acto: el cambio de alto coincide con el toque (no se retiene el alto ni salta después). El giro del icono da la continuidad. El resumen responde en `pointerdown` (icono en `--fill-3`).
- Los enlaces dentro de una respuesta van subrayados (no solo de color, WCAG 1.4.1).
- Maquetación de las preguntas frecuentes, igual en comprar, bolsa, Trade In y soporte: `.aura-container--narrow` con `.aura-section-head` (antetítulo «Preguntas frecuentes», titular), el acordeón y, si hace falta, un enlace debajo.

---

## 10 bis. Escena que avanza con el scroll

La escena de las páginas de producto: un vídeo convertido en fotogramas que avanza **solo mientras el usuario hace scroll** y al mismo ritmo, con textos que entran desde abajo y se van hacia arriba por tramos. La escena se queda pegada a la pantalla (100svh) mientras su sección pasa por debajo; al terminar, la página sigue. Lo hace `aura-ui.js` (§8 quater) con el CSS de `aura.css` §5.7. Guía viva: `componentes.html#producto`.

### Marcado (copiable)

```html
<!-- Escena con scroll: el lienzo es decorativo; el póster lleva el alt y los textos son HTML real, en orden -->
<section class="aura-scrub" data-aura-scrub
         data-seq="../img/seq/auraphone-intro" data-frames="96" data-width="1600" data-height="900"
         data-mobile="true" data-length="300" aria-labelledby="intro-titulo">
  <div class="aura-scrub__stage">
    <picture>  <!-- opcional: sin <picture>, un <img> suelto con poster.webp -->
      <source media="(prefers-reduced-motion: reduce) and (max-width: 767.98px)" srcset="../img/seq/auraphone-intro/m/f-0096.webp" width="750" height="1100">
      <source media="(prefers-reduced-motion: reduce)" srcset="../img/seq/auraphone-intro/f-0096.webp">
      <source media="(max-width: 767.98px)" srcset="../img/seq/auraphone-intro/m/poster.webp" width="750" height="1100">
      <img class="aura-scrub__poster" src="../img/seq/auraphone-intro/poster.webp" width="1600" height="900"
           alt="Lo que se ve en la secuencia" loading="lazy" decoding="async">
    </picture>
    <canvas class="aura-scrub__canvas" aria-hidden="true"></canvas>
    <div class="aura-scrub__text" data-from="0" data-to="0.3">
      <p class="aura-eyebrow aura-eyebrow--lg">auraPhone 18 Pro</p>
      <h2 class="aura-h1" id="intro-titulo">Titular de la escena.</h2>
      <p class="aura-lead">Entradilla.</p>
    </div>
    <div class="aura-scrub__text" data-from="0.32" data-to="0.64" data-pos="left">
      <h3 class="aura-h2">Segundo mensaje.</h3>
      <p class="aura-body">Texto de apoyo.</p>
    </div>
    <div class="aura-scrub__text" data-from="0.66" data-to="1" data-pos="right">
      <h3 class="aura-h2">Tercer mensaje.</h3>
      <p class="aura-body">Se queda hasta que la escena se va.</p>
    </div>
  </div>
</section>
```

- La sección va **a sangre**: hija de `<main>` (o de una sección, fuera de `.aura-container`), nunca dentro de un elemento con `overflow: hidden` (rompería el pegado). Puede ir justo después del héroe o ser el héroe: entonces el primer texto lleva el `h1` (con `data-from="0"`), el póster `loading="eager" fetchpriority="high"` y no hay otro `h1`.
- Dentro del escenario, en este orden: póster (o su `<picture>`), lienzo y los bloques de texto (los textos son los únicos `<div>`). Si falta el `<canvas>`, el JS lo crea.
- **Póster con `<picture>`** (recomendado): en la escena, el fotograma 1 (`poster.webp`), que es lo primero que pinta el lienzo: al aparecer con su fundido no se ven dos imágenes distintas superpuestas. Con «reducir movimiento», el fotograma que mejor resume la secuencia (normalmente el último, el `estaticoRecomendado` de `seq.json`). En el teléfono, los de `m/`. El `<picture>` lleva `display: contents` (lo pone la base) y el `alt` va en el `<img>`: describe la secuencia (lo que se ve al principio y al final).
- **Escena que hace de héroe** (su primer texto lleva el `h1`): en la versión estática ese texto va **antes** del póster, con el aire de un héroe, para que el titular y la acción principal quepan en la primera pantalla. En la escena, su `.aura-display` mide hasta 52 rem (como `.aura-hero--center`) y sus `.aura-hero__actions` van centradas (apiladas y del mismo ancho en el teléfono). El botón secundario de cualquier texto de la escena lleva un material oscuro (`rgba(0,0,0,.78)` + desenfoque; negro sólido con «menos transparencia») para que su etiqueta azul no dependa del fotograma.
- Cada bloque de texto usa las clases de siempre (`.aura-eyebrow`, `.aura-h1` / `.aura-h2`, `.aura-lead`, `.aura-body`, `.aura-link`). Jerarquía sin saltos: el titular de la escena es el nombre de la sección (`aria-labelledby`); los demás bloques, un nivel por debajo. Dentro de la escena el texto de apoyo se pinta en `--text-primary` (sobre una imagen que cambia, nunca un gris).

### Atributos de la sección

| Atributo | Por defecto | Qué hace |
| --- | --- | --- |
| `data-aura-scrub` | — | Activa el componente (también en HTML insertado después). |
| `data-seq` | — | Carpeta de los fotogramas, relativa a la página y sin barra final (`../img/seq/NOMBRE`). Sin ella, la escena funciona igual con el póster quieto y los textos por tramos. |
| `data-frames` | `0` | Número de fotogramas de escritorio (`f-0001.webp` … `f-0096.webp`). |
| `data-pattern` | `f-%04d.webp` | Nombre de cada fotograma: `%04d` es su número (desde 1) con cuatro cifras. |
| `data-width` · `data-height` | `1600` · `900` | Tamaño de los fotogramas de escritorio: el mismo `width` / `height` del póster (el JS dibuja con el tamaño real de cada imagen). |
| `data-mobile` | `false` | `"true"`: por debajo de 768 px usa `<data-seq>/m/` (mismo patrón; p. ej. 750 × 1100, en vertical). Si `m/` no existe (dos fallos sin ninguna carga), vuelve a la de escritorio. Al cruzar los 768 px cambia de carpeta. |
| `data-mobile-frames` | `= data-frames` | Fotogramas de `m/`, si son otros. |
| `data-mobile-width` · `data-mobile-height` | — | Tamaño de los fotogramas de `m/` (v2.0): con él (y con `data-width` / `data-height` en escritorio) los fotogramas se escalan al lienzo antes de que llegue ninguno. Si falta, lo da el primero que se decodifica. |
| `data-length` | `300` (mín. `120`) | Alto de la sección en % del alto de pantalla (`svh`). La escena queda pegada y avanza durante `data-length − 100`: con 300, dos pantallas de scroll. **Máximo 340** (2,4 pantallas; v2.0): más recorrido cuesta bajar y no se lee mejor. Con 48 fotogramas, 250–320. |
| `data-fit` | `cover` | `cover`: llena el escenario y recorta (vídeo con ambiente). `contain`: el fotograma entero con negro alrededor (aparato sobre negro). |
| `data-mobile-fit` | `= data-fit` | Ajuste en el teléfono (`contain` suele ir mejor con fotogramas horizontales). |
| `data-focus` | `"0.5 0.5"` | Punto que manda en el recorte (x y, de 0 a 1), como `--photo-focus`; vale también para el póster. |

### Atributos de cada texto (`.aura-scrub__text`)

| Atributo | Por defecto | Qué hace |
| --- | --- | --- |
| `data-from` | `0` | Progreso de la escena (0–1) en el que el texto **empieza** a entrar. Con `0` ya está a la vista cuando llega la escena. |
| `data-to` | `1` | Progreso en el que **ha terminado** de irse. Con `1` se queda hasta que la escena se va. |
| `data-pos` | `center` | `center` (centrado), `left` / `right` (columna de 30 rem alineada con `.aura-container`, con un degradado de protección desde su lado), `bottom` (centrado abajo, con `--photo-scrim`). En el teléfono, `left` y `right` bajan al pie; con `data-fit="contain"`, también en tableta vertical o ventana casi cuadrada (desde 768 px y hasta 5:4), donde el fotograma apaisado deja negro arriba y abajo. Coloca cada texto en una zona tranquila de sus fotogramas (`zonasTranquilas` de `seq.json`); si la página necesita otra colocación (p. ej. arriba), la fija en su hoja con `align-content`. |

**Entrada y salida se miden en píxeles de scroll (v2.0):** 150 px cada una (`SCRUB_FADE_PX` en `aura-ui.js`: una muesca y media de rueda, medio arrastre en el teléfono), como mucho un tercio del tramo, igual en todas las escenas y en cualquier alto de pantalla (antes era un tercio del tramo: los textos centrales solo se veían enteros 150–260 px). Opacidad 0 → 1 subiendo 40 px y, al irse, 1 → 0 subiendo otros 40 px (en el sentido del scroll). Un texto con `data-from="0"` ya está a la vista y uno con `data-to="1"` se queda hasta que la escena se va. Para que un texto se vaya antes de que llegue el siguiente, que sus tramos no se solapen (`0–0.28`, `0.33–0.67`…). Cada texto lleva su propio degradado de protección (se funde con él), así que el contraste no depende del fotograma.

**Ritmo de una escena (v2.0)**, para que ni cueste bajar ni pase todo de golpe:

| Regla | Valor |
| --- | --- |
| Pegada | (`data-length` − 100) % de la pantalla, como mucho 2,4 pantallas (`data-length` ≤ 340: 2160 px con una pantalla de 900) |
| Mensajes | Como mucho 3 por escena; lo demás, en los bloques de debajo |
| Lectura | Cada texto al 100 % durante al menos 400 px de scroll (cuatro muescas, más de un arrastre), en una zona tranquila de sus fotogramas (`zonasTranquilas` de `seq.json`) |
| Fundido | 150 px por entrada y por salida (lo pone la base; la página solo elige los tramos) |
| Secuencia | Sin destellos: entre dos fotogramas seguidos, la diferencia de luz no pasa de unas tres veces la mediana de la secuencia |

Con una pantalla de alto `H`, un texto de tramo `[a, b]` se ve entero `(b − a) × (data-length − 100) / 100 × H − 300` px (`− 150` si empieza en 0 o acaba en 1, porque no tiene entrada o salida). Compruébalo con `AURA.ui.scrub(el).refresh()` a varios progresos y capturas de la ventana.

### Comportamiento (skill «apple-design»)

- **1:1 con el scroll**: en cada `requestAnimationFrame` se lee la posición (`progreso = −top / (alto − alto del escenario)`) y se pinta el fotograma `round(progreso × (n − 1))`. Sin inercia, sin suavizado, sin temporizadores. **Solo se repinta si cambia el fotograma** (o el tamaño). Solo se calcula mientras la escena está en pantalla (`IntersectionObserver`).
- **Lienzo**: tamaño del escenario × `devicePixelRatio` (como mucho 2), recorte tipo *cover* (o *contain*) con el punto de `data-focus`. Aparece sobre el póster con un fundido de 240 ms al pintar su primer fotograma (`.is-painted`); el póster sigue debajo.
- **Sin decodificar en el hilo principal** (v2.0): por http(s) y con el lienzo en la GPU, cada fotograma se descarga como Blob y los ±6 que rodean al actual se decodifican de antemano fuera del hilo principal (`createImageBitmap` del Blob; unos 75 MB con 1600 × 900), primero en el sentido del scroll; al pintar solo se escalan (en la GPU). Los que salen de la ventana se cierran (`close()`). Sin GPU (WebGL con `failIfMajorPerformanceCaveat` no disponible) y por `file://`, el camino de siempre con `new Image()`: sin GPU, escalar un `ImageBitmap` en el hilo principal costaba más que decodificar. No sirven `createImageBitmap(<img>)` (decodifica en el hilo principal), sus opciones `resizeWidth` / `resizeHeight` (escalan en el hilo principal: 15–20 ms por fotograma) ni escalar en un Worker con `OffscreenCanvas` (con la CPU ocupada, el fotograma exacto llegaba 50–640 ms tarde). Antes cada fotograma nuevo se decodificaba y escalaba en el hilo principal: dentro de la escena se perdían muchos más fotogramas que fuera.
- **Carga progresiva**: empieza cuando la escena está a pantalla y media (`IntersectionObserver`). Por http(s) cada fotograma se descarga como Blob (`fetch`); por `file://` (donde `fetch` no lee archivos locales), o si el navegador no tiene `createImageBitmap`, con `new Image()`, como antes (el lienzo nunca se lee). Primero el fotograma 1, uno de cada 8 y el último (así siempre hay uno cerca: si el exacto no ha llegado, se pinta el más próximo); el resto, **después del evento `load` de la página**, con `fetchPriority = 'low'` y como mucho 4 descargas a la vez: no frena ni el resto de la página ni sus fotos.
- **Textos**: solo `opacity` y `transform` en línea, ligados al progreso; `.is-on` (opacidad > 0,5) deja pulsar sus enlaces (los invisibles no tapan a los visibles). Si el foco de teclado cae en un texto que no se ve, la página se desplaza al centro de su tramo.
- **Sin escena** (versión estática): con `prefers-reduced-motion: reduce`, con «ahorro de datos» (`navigator.connection.saveData`; `.is-static`), al imprimir, sin `aura-core.js` o sin `<canvas>`. El póster se queda en el flujo (fundido con el fondo por arriba y por abajo, hasta el 85 % del alto de pantalla; v2.0: entero y centrado, `object-fit: contain` y `width: min(100%, 85svh × 16 / 9)`, así en una pantalla ancha y baja —1920 × 900— no se amplía ni se recorta) y los textos se leen debajo, uno tras otro, en su orden. **No se descarga ningún fotograma.** Si el usuario cambia «reducir movimiento» con la página abierta, la escena cambia en el acto.
- **Menos transparencia / más contraste**: el degradado de cada texto pasa a un velo casi sólido (72 % / 84 % de negro). Con colores forzados no hay degradado (el modo pone su placa tras el texto).
- **Lectores de pantalla**: el lienzo es `aria-hidden`; el póster (con su `alt`) y los textos están siempre en el HTML y en orden, también los que aún no se ven.

### Lo que pone el JS

| Dónde | Qué | Para qué |
| --- | --- | --- |
| Sección | `.is-ready` · `.is-scene` / `.is-static` · `.is-active` (en pantalla) · `.is-painted` (ya hay fotograma) | Estados (el CSS de la escena cuelga de `.aura-js` y la media `prefers-reduced-motion: no-preference`, sin esperar al JS: no hay salto al cargar). |
| Sección | `data-frame="N"` | Fotograma pintado (desde 1). Útil para probar. |
| Sección | `--aura-scrub-length`, `--aura-scrub-focus`, `--aura-scrub-fit` | Alto, encuadre y ajuste (de los atributos). |
| Texto | `style="opacity; transform"` · `.is-on` | Su estado en el tramo. |

API: `AURA.ui.scrub(el | selector)` → `{ el, progress(), frame(), frames(), loaded(), mode(), refresh() }` (`mode()`: `'scene'` o `'static'`; `refresh()` vuelve a medir y repinta).

### La secuencia

```text
img/seq/NOMBRE/
  poster.webp          ← copia del primer fotograma (el póster de la escena; sin <picture>, también el de la versión estática)
  f-0001.webp … f-0120.webp
  seq.json             ← tamaño, número de fotogramas, qué se ve en cada tramo, zonas tranquilas y fotograma estático recomendado
  m/                   ← opcional (data-mobile="true"): los mismos fotogramas para el teléfono, mejor en vertical (750 × 1100)
    poster.webp · f-0001.webp …
```

- Un tramo **continuo** del vídeo (sin cortes de plano), de 3 a 8 s. Escritorio: 1600 × 900 (o 1280 × 720), WebP calidad 60–70, **≤ 120 fotogramas y ≤ 4 MB**; teléfono: hasta 750 px de ancho, en vertical (≈ 750 × 1100) siempre que el sujeto quepa, ≤ 2 MB. Con 96 basta para 3–5 s de movimiento y 120 para recorridos de 6–8 s, siempre con `data-length` ≤ 340 y dentro de los 4 MB: más fotogramas hacen el avance más fino, no el recorrido más largo.
- Lo que hay hoy (v2.0):

| Escena | Escritorio | Teléfono (`m/`) |
| --- | --- | --- |
| auraPhone | 120 · 1600 × 900 · 3,34 MB | 120 · 640 × 1136 · 1,01 MB |
| auraPad | 120 · 1600 × 900 · 1,23 MB | 120 · 750 × 1100 · 0,46 MB |
| auraBook | 120 · 1600 × 900 · 1,66 MB | 120 · 760 × 900 · 1,08 MB |
| auraPods | 96 · 1600 × 900 · 1,78 MB | 56 · 750 × 1100 · 0,82 MB |
| Prueba (`demo`, guía viva) | 48 · 1280 × 720 · 0,51 MB | 48 · 600 × 900 · 0,26 MB |
- Con ffmpeg: `ffmpeg -ss 2 -to 8 -i clip.mp4 -vf "fps=16,scale=1600:900:force_original_aspect_ratio=increase,crop=1600:900" -frames:v 96 -c:v libwebp -quality 70 img/seq/NOMBRE/f-%04d.webp` y `poster.webp` = `f-0001.webp`.
- Vídeos con licencia libre (Pexels, Unsplash…), sin logotipos ni marcas reconocibles y con su crédito en `legal.html#imagenes`. El `alt` del póster describe lo que se ve de verdad.
- Para probarla, emula la preferencia de forma explícita (el navegador sin ventana no siempre hereda la del sistema): `prefers-reduced-motion: no-preference` para la escena y `reduce` para la versión estática. Las capturas de página completa estiran la ventana y la escena con ella: compruébala con capturas de la ventana a varios progresos.

**Lista de comprobación de una página con escena**: sección con `aria-labelledby` a su titular · un solo `h1` en la página · jerarquía sin saltos dentro de la escena · póster con `width`, `height` y `alt` real · `<canvas aria-hidden="true">` · tramos sin solapar · `data-length` ≤ 340, ≤ 3 textos y cada uno ≥ 400 px al 100 % · póster de la escena = fotograma 1 (o `<picture>` con el estático aparte) · versión estática revisada (con «reducir movimiento» emulado) · sin desborde a 390 px · peso de la secuencia dentro de lo indicado · su crédito en `img/creditos/seq-NOMBRE.json` si sale de un vídeo o una foto de terceros.

---

## 11. Movimiento

### Aparición al entrar en pantalla

```html
<div data-aura-reveal>…</div>
<div data-aura-reveal style="--i:1">…</div>      <!-- escalonado en una fila: 60 ms por unidad de --i, como mucho 2 -->
<div data-aura-reveal="fade">…</div>             <!-- solo opacidad -->
<div data-aura-reveal="scale">…</div>            <!-- escala .96 → 1 (imágenes) -->
<li class="aura-stat aura-stat--lg" data-aura-reveal="stat">…</li>   <!-- v1.6: la cifra y luego su texto, solo opacidad (§6) -->
```

- `aura-ui.js` observa con `IntersectionObserver` (v2.0: `threshold: [0]` y `rootMargin: '0px 0px 5% 0px'`: se dispara en cuanto el elemento asoma, un 5 % antes del borde inferior), añade `.is-visible` **una sola vez** y deja de observar. Sin `IntersectionObserver`: `.is-visible` a todos de inmediato.
- **Acompaña al scroll** (v2.0): opacidad en 400 ms y desplazamiento en 600 ms (`--ease-out`); el escalonado (`--i`) es de 60 ms por unidad y llega como mucho a 2 × 60 ms, y en el teléfono (< 768 px, tarjetas apiladas) no hay retraso. Con el umbral de 0,15, 560/760 ms y 80 ms × `--i`, a 1000 px/s se veían hasta 539 px de tarjetas vacías. `="stat"` conserva su ritmo por partes (560 ms, 120 ms entre partes, 80 ms entre cifras).
- Seguro: si `aura-ui.js` no llega, el CSS muestra todo a los 2,5 s; si llega más tarde, lo que ya se mostró se queda visible (no vuelve a fundirse). Al imprimir, todo está visible.
- No lo pongas en el contenido principal del primer pantallazo (el titular del héroe debe estar ahí al instante) ni en contenedores enteros de sección: úsalo en tarjetas, teselas e imágenes.
- Con «reducir movimiento» el CSS lo convierte en un fundido de 200 ms sin desplazamiento.

### Qué anima el CSS y qué anima el JS

| Elemento | Quién | Cómo |
| --- | --- | --- |
| Pulsación de botones, tarjetas, opciones, casillas, puntos | CSS | `transform: scale()` en 100 ms; enlaces de texto y filas, `opacity` / `--fill-3` al instante. Con «reducir movimiento»: sin escala, se atenúan (`opacity` .7–.8) |
| Popover, aviso, buscador, menú | CSS | transición de `opacity` + `transform` + `filter` (se materializan) al alternar `.is-open` / `.is-visible`; curvas espejadas; el popover, el buscador y el menú crecen desde su disparador |
| Aviso arrastrado | JS | muelle sobre `transform` y `opacity` mientras se aparta con el dedo (`.is-dragging` quita la transición CSS); los demás avisos, FLIP con `translate` (320 ms) |
| Segmentado | JS | muelles (damping 1, response .35; X e Y independientes) sobre `transform` de `.aura-segmented__thumb`: `translate3d` + `scaleX` del ancho; `width` y `height` solo en reposo |
| Galería | CSS | `opacity` de `.is-entering` / `.is-leaving` (200 ms, fundido cruzado; lo dirige `AURA.ui.gallery`) |
| Retroceso de la página | JS | `scale` en línea de `<main>`, el pie y las barras: ligado al muelle de la hoja inferior; transición de 320 / 200 ms con el buscador |
| Foto que llega | CSS | `opacity` de `.is-pending` a `.is-loaded` (240 ms) |
| Carrusel | JS | muelle sobre `transform` de `.aura-carousel__track`; **el CSS no define transición** |
| Hoja | JS | muelle sobre `transform` de `.aura-sheet__panel` y `opacity` del velo: damping 1 / response 0.3 al abrir o cerrar con un botón, el velo o Esc; damping 0.8 solo al soltar un arrastre con impulso |
| Reveal | CSS | transición al añadir `.is-visible`: opacidad 400 ms y `transform` 600 ms, escalonado ≤ 2 × 60 ms (`"stat"`: solo la opacidad de sus hijos, escalonada) |
| Escena con scroll | JS | en cada `requestAnimationFrame` con scroll: el fotograma del progreso en el `<canvas>` (solo si cambia) y `opacity` + `transform` en línea de cada texto; ninguna transición ni muelle: es 1:1 con el scroll (§10 bis) |
| Exhibición de color | CSS | el fundido cruzado de la galería (`opacity`, 200 ms) |

Con `prefers-reduced-motion: reduce` el JS no anima con muelles: la hoja alterna sus clases y el CSS la funde (si el usuario la arrastra, la mueve 1:1 y al soltar se funde desde ahí), el carrusel se coloca en su posición final con un fundido, la pastilla del segmentado aparece en su sitio, los avisos se apartan fundiéndose y la página no retrocede. La escena con scroll no existe: póster fijo y textos en orden, sin descargar fotogramas.

---

## 12. Marcado generado por JS

HTML **exacto** que deben producir `aura-core.js` y `aura-ui.js`. Reparto sugerido: `aura-core.js` genera el marcado de `<aura-header>` / `<aura-footer>`, lo repinta con los eventos `aura:bag` y `aura:auth`, y gestiona los huecos de imagen; `aura-ui.js` añade el comportamiento por delegación sobre los atributos `data-aura-*`.

### 12.1 `<aura-header>`

Atributos: `active` (`inicio` | `auraphone` | `aurapad` | `aurabook` | `aurapods` | `comparar` | `tradein` | `soporte` | `bolsa` | `cuenta` | `acerca` | `''`), `ribbon="off"` (no genera la cinta). El elemento es `display: contents`: sus hijos se maquetan como hijos de `<body>`.

```html
<aura-header active="auraphone">

  <header class="aura-nav" data-aura-nav>
    <div class="aura-container aura-nav__inner">
      <a class="aura-brand" href="index.html" aria-label="AURA — Volver al inicio" title="AURA — Volver al inicio">
        <img class="aura-brand__mark" src="assets/img/aura-72.png" width="28" height="28" alt="">
        <span class="aura-brand__word">AURA</span>
      </a>
      <nav class="aura-nav__links" aria-label="Principal">
        <a class="aura-nav__link is-active" href="auraphone.html" aria-current="page">auraPhone</a>
        <a class="aura-nav__link" href="aurapad.html">auraPad</a>
        <a class="aura-nav__link" href="aurabook.html">auraBook</a>
        <a class="aura-nav__link" href="aurapods.html">auraPods</a>
        <a class="aura-nav__link" href="comparar.html" title="Compara los modelos de cada familia frente a frente">Comparar</a>
        <a class="aura-nav__link" href="trade-in.html" title="AURA Trade In: entrega tu dispositivo anterior y consigue un descuento">Trade In</a>
        <a class="aura-nav__link" href="soporte.html">Soporte</a>
      </nav>
      <div class="aura-nav__actions">
        <!-- v2.1: el nombre de cada botón de icono, en texto oculto (no en aria-label) -->
        <button class="aura-nav__action" type="button" data-aura-search-open aria-haspopup="dialog" aria-expanded="false" aria-controls="aura-search"><span class="bi bi-search" aria-hidden="true"></span><span class="visually-hidden">Buscar</span></button>
        <a class="aura-nav__action aura-nav__account" href="login.html" data-aura-account><span class="bi bi-person-circle" aria-hidden="true"></span><span class="aura-nav__action-label">Iniciar sesión</span></a>
        <div class="aura-nav__bag-wrap">
          <button class="aura-nav__action aura-nav__bag" type="button" data-aura-popover-toggle="aura-bag-popover" aria-haspopup="dialog" aria-expanded="false" aria-controls="aura-bag-popover"><span class="bi bi-bag" aria-hidden="true"></span><span class="visually-hidden" data-aura-bag-label>Bolsa, 2 artículos</span><span class="aura-nav__count" data-aura-bag-count aria-hidden="true">2</span></button>
          <div class="aura-popover aura-popover--end aura-bag-popover" id="aura-bag-popover" role="dialog" aria-label="Bolsa" tabindex="-1" aria-hidden="true">
            <!-- contenido: ver «Popover de la bolsa» -->
          </div>
        </div>
        <button class="aura-nav__action aura-nav__toggle" type="button" data-aura-menu-open aria-haspopup="dialog" aria-expanded="false" aria-controls="aura-menu"><span class="bi bi-list" aria-hidden="true"></span><span class="visually-hidden">Abrir el menú</span></button>
      </div>
    </div>
  </header>

  <aside class="aura-ribbon" aria-label="Promoción">
    <div class="aura-container">
      <p class="aura-ribbon__text"><span class="aura-ribbon__long">Ahorra con AURA Trade In: entrega tu antiguo dispositivo mundano y llévate hasta 800&nbsp;€ de descuento en tu nuevo auraPhone, auraPad, auraBook o auraPods.</span><span class="aura-ribbon__short">Hasta 800&nbsp;€ por tu dispositivo mundano.</span> <a class="aura-link" href="trade-in.html" title="AURA Trade In: calcula cuánto vale tu dispositivo anterior">Comprobar valor cuántico</a></p>
    </div>
  </aside>

  <!-- buscador y menú móvil: ver más abajo -->

</aura-header>
```

Reglas:

- Nombres y textos emergentes: el `nav` de la barra y el del menú móvil se llaman «Principal» (nunca se ven a la vez: por debajo de 992 px la barra no pinta sus enlaces y, por encima, el menú está oculto con `aria-hidden`). `title` solo donde dice algo que el texto visible no dice (el logotipo, «Comparar», «Trade In» y el enlace de la cinta); nunca repite la etiqueta. En el logotipo, `aria-label` y `title` llevan el mismo texto: el lector de pantalla lo anuncia una sola vez (el enlace tiene además el texto «AURA», así que no está vacío). Los botones de icono se nombran con un texto oculto (`<span class="visually-hidden">Buscar</span>`, v2.1; antes `aria-label`, que TAW no cuenta) y su icono lleva `aria-hidden="true"`; los que abren algo exponen `aria-haspopup`, `aria-controls` y `aria-expanded` (lo actualiza `aura-ui.js`).
- Enlace activo: `.is-active` + `aria-current="page"` en el `.aura-nav__link` cuya clave coincide con `active` (`auraphone`, `aurapad`, `aurabook`, `aurapods`, `comparar`, `tradein`, `soporte`). Con `inicio`, `bolsa`, `cuenta`, `acerca` o vacío no se marca ninguno. Lo mismo en `.aura-menu__link`. Cada enlace lleva además `data-aura-key="CLAVE"` (lo usa el JS para marcarlo). El atributo `active` se puede cambiar después de cargar (`AURA.header.setActive('aurapad')` en `comprar.html`): la cabecera se repinta sola.
- El «›» del enlace de la cinta lo pinta el CSS. El texto de la cinta sale del catálogo: la cifra es `AURA.fmt.eur0(AURA.tradeIn.max())` (con el espacio indivisible de `fmt`: «800 €» nunca se parte) y las familias, `AURA.catalog.families()` («auraPhone, auraPad, auraBook o auraPods»). No lo escribas a mano. **Texto corto en el teléfono (v2.0):** la cinta lleva los dos textos, `.aura-ribbon__long` y `.aura-ribbon__short` («Hasta 800 € por tu dispositivo mundano.», `AURA.header.ribbonShortText()`), con el mismo enlace; el CSS enseña el corto por debajo de 576 px y el largo desde ahí: una o dos líneas, nunca cuatro. Con siete enlaces (v1.7) la barra cabe entera de 992 a 1440 px: por debajo de 992 px los enlaces van al menú.
- Sesión iniciada: `href="cuenta.html"` y la etiqueta es el nombre, con «Tu cuenta, » delante solo para el lector (`<span class="aura-nav__action-label"><span class="visually-hidden">Tu cuenta, </span>Lucía</span>`; v2.1, antes un `aria-label`). Sin sesión: `href="login.html"`, «Iniciar sesión». La etiqueta solo se ve desde 1200 px; por debajo es texto accesible oculto.
- Contador: `.aura-nav__count` con el total de unidades (`aria-hidden`: lo dice el nombre). El nombre del botón va en su texto oculto `[data-aura-bag-label]` (v2.1): «Bolsa, vacía» (el contador, vacío: el CSS lo oculta con `:empty`), «Bolsa, 1 artículo», «Bolsa, 2 artículos»; `aura-core.js` lo reescribe con cada `aura:bag`. Al cambiar la cantidad, añade `.is-bumped` (y la quita en `animationend`).
- `aura-ui.js` añade `.is-scrolled` a `.aura-nav` cuando `window.scrollY > 4` (listener de `scroll` pasivo) y la quita al volver arriba: es el efecto de borde. En páginas con barra local (`body.has-localnav`) la global no flota y el CSS no pinta su borde: lo pinta `.aura-localnav.is-stuck` (§4).
- El cristal de la barra va en `.aura-nav::before`; no añadas `backdrop-filter` ni `filter` a `.aura-nav` (rompería el desenfoque del popover de la bolsa).

#### Popover de la bolsa

Con artículos:

```html
<div class="aura-popover__header">
  <h2 class="aura-popover__title">Bolsa</h2>
  <span class="aura-caption">2 artículos</span>
</div>
<ul class="aura-popover__list">
  <li class="aura-bag-line aura-bag-line--compact">
    <!-- v2.1: la miniatura no es un enlace; el del nombre se estira sobre toda la línea (::after) -->
    <div class="aura-bag-line__media">
      <img class="aura-img" src="assets/img/IMG.webp" data-slot="IMG" width="1600" height="1200" alt="" loading="lazy" decoding="async">   <!-- el hueco de AURA.catalog.image(productId, colorId) -->
    </div>
    <div class="aura-bag-line__info">
      <p class="aura-bag-line__name"><a href="comprar.html?producto=ID">auraPhone 18 Pro Max</a></p>
      <p class="aura-bag-line__meta">Negro · 512 GB</p>
    </div>
    <div class="aura-bag-line__price">
      <span class="aura-price">3.738,00 €</span>
      <span class="aura-bag-line__qty">2 × 1.869,00 €</span>   <!-- solo con más de una unidad, bajo el importe -->
    </div>
  </li>
  <!-- … una por línea … -->
</ul>
<div class="aura-popover__footer">
  <p class="aura-popover__total"><span>Subtotal</span><span class="aura-price">3.518,00 €</span></p>
  <a class="aura-btn aura-btn--primary aura-btn--block" href="checkout.html">Tramitar pedido</a>
  <a class="aura-btn aura-btn--ghost aura-btn--block" href="bolsa.html">Ver la bolsa</a>
</div>
```

`IMG` = el hueco de `AURA.catalog.image(line.productId, line.colorId)`: la vista de tarjeta de ese acabado (con la base de respaldo y `sizes="56px"`) o, si ese acabado no tiene foto, la del acabado por defecto; entonces la línea lo dice debajo con `<p class="aura-bag-line__meta aura-bag-line__photo">Imagen en plata</p>` (v2.0, igual que la bolsa y el checkout). Meta = color · etiquetas de opciones · «AuraCare+» si procede · `× cantidad`. Precio = `unitPrice × qty`.

Vacía:

```html
<div class="aura-popover__header"><h2 class="aura-popover__title">Bolsa</h2></div>
<p class="aura-popover__empty">Tu bolsa está vacía.</p>
<ul class="aura-popover__links">
  <li><a href="auraphone.html"><span class="bi bi-phone" aria-hidden="true"></span>Ver auraPhone</a></li>
  <li><a href="aurapad.html"><span class="bi bi-tablet-landscape" aria-hidden="true"></span>Ver auraPad</a></li>
  <li><a href="aurabook.html"><span class="bi bi-laptop" aria-hidden="true"></span>Ver auraBook</a></li>
  <li><a href="aurapods.html"><span class="bi bi-earbuds" aria-hidden="true"></span>Ver auraPods</a></li>
  <li><a href="login.html"><span class="bi bi-person-circle" aria-hidden="true"></span>Iniciar sesión</a></li>
</ul>
```

(Con sesión, el último enlace es `cuenta.html` · «Tu cuenta».)

#### Buscador

```html
<div class="aura-search" id="aura-search" role="dialog" aria-modal="true" aria-label="Buscar en AURA" aria-hidden="true">
  <div class="aura-scrim" data-aura-search-close></div>
  <div class="aura-search__panel">
    <div class="aura-container aura-container--narrow">
      <form class="aura-search__form" role="search" action="comparar.html">
        <!-- v2.1: la lupa es el botón de envío (H32) y el campo tiene su <label for> oculta (H44), no un aria-label -->
        <button class="aura-search__submit" type="submit"><span class="bi bi-search" aria-hidden="true"></span><span class="visually-hidden">Buscar</span></button>
        <label class="visually-hidden" for="aura-search-input">Buscar productos y páginas</label>
        <input class="aura-search__input" id="aura-search-input" type="search" name="q" placeholder="Buscar en AURA" autocomplete="off" autocapitalize="off" spellcheck="false">
        <button class="aura-icon-btn" type="button" data-aura-search-close><span class="bi bi-x-lg" aria-hidden="true"></span><span class="visually-hidden">Cerrar el buscador</span></button>
      </form>
      <div class="aura-search__results" data-aura-search-results>
        <p class="aura-search__heading">Productos</p>
        <ul class="aura-search__list">
          <li><a class="aura-search__item" href="comprar.html?producto=ID"><span class="bi bi-phone" aria-hidden="true"></span><span class="aura-search__item-title">auraPhone 18 Pro Max</span><span class="aura-search__item-meta">Desde 1.619 €</span></a></li>
          <!-- modelo que aún no está disponible: el estado bajo el nombre -->
          <li><a class="aura-search__item" href="comprar.html?producto=auraphone-duo"><span class="bi bi-phone" aria-hidden="true"></span><span class="aura-search__item-title">auraPhone Duo<span class="aura-search__item-status">Próximamente · Reserva a partir del 16 de octubre</span></span><span class="aura-search__item-meta">Desde 2.339 €</span></a></li>
        </ul>
        <p class="aura-search__heading">Accesos rápidos</p>
        <ul class="aura-search__list">
          <li><a class="aura-search__item" href="comparar.html"><span class="bi bi-arrow-right-short" aria-hidden="true"></span><span class="aura-search__item-title">Comparar modelos</span></a></li>
        </ul>
      </div>
      <p class="visually-hidden" role="status" aria-live="polite" data-aura-search-status></p>
    </div>
  </div>
</div>
```

- Iconos por familia: `bi-phone` (auraphone), `bi-tablet-landscape` (aurapad), `bi-laptop` (aurabook), `bi-earbuds` (aurapods).
- Sin texto: solo «Accesos rápidos» (Comparar modelos, AURA Trade In, Soporte, Bolsa, Tu cuenta / Iniciar sesión). Al escribir: productos que coinciden (nombre, familia, sin distinguir acentos ni mayúsculas) y accesos que coinciden. Los resultados se filtran en cada `input`, sin espera artificial.
- Sin resultados: `<p class="aura-search__empty">No hay resultados para «texto». Prueba con auraPhone, auraPad, auraBook o auraPods.</p>` (las familias salen del catálogo).
- `[data-aura-search-status]` anuncia «3 resultados» / «Sin resultados».
- Teclado: ↓/↑ mueven `.is-active` entre los `.aura-search__item`; Intro (submit) abre el activo o el primero; Esc cierra.
- **Envío (v2.1).** La lupa (`.aura-search__submit`) es el botón de envío del formulario: misma caja, tamaño (20 px) y color que el icono suelto de antes, con un área invisible de 44 px y `scale(.92)` al pulsar. Al enviar (Intro en el campo o un clic en la lupa), `aura-ui.js` cancela el envío y abre el resultado marcado o, si no hay, el primero, como Intro; sin resultados, no hace nada. Si `aura-ui.js` no llega, el formulario va a `comparar.html?q=…` y `comparar.js` deduce la familia del texto: nunca un envío roto.
- Abrir: `.is-open`, `aria-hidden="false"`, `aria-expanded="true"` en el disparador, `html.aura-lock`, foco en el input, foco atrapado. Cerrar (Esc, velo, botón): lo inverso y devuelve el foco al disparador.

#### Menú móvil

```html
<div class="aura-menu" id="aura-menu" role="dialog" aria-modal="true" aria-label="Menú" aria-hidden="true">
  <div class="aura-container aura-menu__bar">
    <a class="aura-brand" href="index.html" aria-label="AURA — Volver al inicio" title="AURA — Volver al inicio">
      <img class="aura-brand__mark" src="assets/img/aura-72.png" width="28" height="28" alt="">
      <span class="aura-brand__word">AURA</span>
    </a>
    <button class="aura-icon-btn" type="button" data-aura-menu-close><span class="bi bi-x-lg" aria-hidden="true"></span><span class="visually-hidden">Cerrar el menú</span></button>
  </div>
  <nav class="aura-container aura-menu__nav" aria-label="Principal">
    <ul class="aura-menu__list">
      <li style="--i:0"><a class="aura-menu__link is-active" href="auraphone.html" aria-current="page">auraPhone<span class="bi bi-chevron-right" aria-hidden="true"></span></a></li>
      <li style="--i:1"><a class="aura-menu__link" href="aurapad.html">auraPad<span class="bi bi-chevron-right" aria-hidden="true"></span></a></li>
      <li style="--i:2"><a class="aura-menu__link" href="aurabook.html">auraBook<span class="bi bi-chevron-right" aria-hidden="true"></span></a></li>
      <li style="--i:3"><a class="aura-menu__link" href="aurapods.html">auraPods<span class="bi bi-chevron-right" aria-hidden="true"></span></a></li>
      <li style="--i:4"><a class="aura-menu__link" href="comparar.html" title="Compara los modelos de cada familia frente a frente">Comparar<span class="bi bi-chevron-right" aria-hidden="true"></span></a></li>
      <li style="--i:5"><a class="aura-menu__link" href="trade-in.html" title="AURA Trade In: entrega tu dispositivo anterior y consigue un descuento">Trade In<span class="bi bi-chevron-right" aria-hidden="true"></span></a></li>
      <li style="--i:6"><a class="aura-menu__link" href="soporte.html">Soporte<span class="bi bi-chevron-right" aria-hidden="true"></span></a></li>
    </ul>
    <ul class="aura-menu__secondary">
      <li style="--i:7"><a href="login.html"><span class="bi bi-person-circle" aria-hidden="true"></span>Iniciar sesión</a></li>
      <li style="--i:8"><a href="bolsa.html"><span class="bi bi-bag" aria-hidden="true"></span>Bolsa (2)</a></li>
      <li style="--i:9"><a href="acerca.html"><span class="bi bi-info-circle" aria-hidden="true"></span>Acerca de AURA</a></li>
    </ul>
  </nav>
</div>
```

Abrir/cerrar igual que el buscador (`.is-open`, `aria-hidden`, `aria-expanded` en `[data-aura-menu-open]`, `html.aura-lock`, foco atrapado, Esc). Si la ventana pasa a ≥ 992 px con el menú abierto, ciérralo. Con sesión: «Tu cuenta, Lucía» → `cuenta.html`; bolsa vacía: «Bolsa».

### 12.2 `<aura-footer>`

Atributo opcional `crumbs` (pinta las migas; sin él, no se genera `.aura-footer__crumbs`). El logotipo de inicio va siempre primero; después, los niveles separados por `;`, cada uno `texto|enlace` o solo `texto`. El último es la página actual (`aria-current="page"`, nunca enlazado). Los enlaces solo pueden ser páginas del sitio (`pagina.html`, con `?` o `#` opcionales).

| Valor | Migas |
| --- | --- |
| `crumbs="auraPhone"` | AURA › auraPhone |
| `crumbs="auraPhone\|auraphone.html;Comprar auraPhone 18 Pro"` | AURA › [auraPhone](auraphone.html) › Comprar auraPhone 18 Pro |
| `crumbs="Tu cuenta\|cuenta.html;Pedidos\|cuenta.html#pedidos;AU-2026-000123"` | AURA › Tu cuenta › Pedidos › AU-2026-000123 |

Desde JS (repinta el pie): `AURA.footer.setCrumbs([{ label: 'auraPhone', href: 'auraphone.html' }, 'Comprar auraPhone 18 Pro'])`. Los textos no pueden llevar `;` ni `|` (`setCrumbs` los sustituye por comas).

```html
<aura-footer crumbs="auraPhone">
  <footer class="aura-footer">
    <div class="aura-container">

      <nav class="aura-footer__crumbs" aria-label="Migas de pan">
        <ol class="aura-crumbs">
          <li><a href="index.html" title="AURA — Volver al inicio"><img src="assets/img/aura-72.png" width="20" height="20" alt="AURA — Volver al inicio"></a></li>
          <li aria-current="page">auraPhone</li>
        </ol>
      </nav>

      <div class="aura-footer__main">
        <div class="aura-footer__brand">
          <a class="aura-brand" href="index.html" aria-label="AURA — Volver al inicio" title="AURA — Volver al inicio">
            <img class="aura-brand__mark" src="assets/img/aura-72.png" width="28" height="28" alt="">
            <span class="aura-brand__word">AURA</span>
          </a>
          <p class="aura-footer__tagline">Tecnología inmersiva diseñada para ampliar lo que imaginas. Precisión, profundidad y energía AURA.</p>
          <ul class="aura-footer__social">
            <!-- v2.1: cada red, a una sección distinta de Acerca (H2) y con su nombre en texto oculto (F89) -->
            <li><a class="aura-footer__social-link" href="acerca.html#newsroom" title="AURA en Instagram: novedades"><span class="bi bi-instagram" aria-hidden="true"></span><span class="visually-hidden">AURA en Instagram: novedades</span></a></li>
            <li><a class="aura-footer__social-link" href="acerca.html#historia" title="AURA en YouTube: nuestra historia"><span class="bi bi-youtube" aria-hidden="true"></span><span class="visually-hidden">AURA en YouTube: nuestra historia</span></a></li>
            <li><a class="aura-footer__social-link" href="acerca.html#oportunidades" title="AURA en LinkedIn: empleo"><span class="bi bi-linkedin" aria-hidden="true"></span><span class="visually-hidden">AURA en LinkedIn: empleo</span></a></li>
          </ul>
        </div>

        <nav class="aura-footer__directory" aria-label="Pie de página">
          <div class="aura-footer__col">
            <h2 class="aura-footer__heading">Productos</h2>
            <ul class="aura-footer__list">
              <li><a href="auraphone.html">auraPhone</a></li>
              <li><a href="aurapad.html">auraPad</a></li>
              <li><a href="aurabook.html">auraBook</a></li>
              <li><a href="aurapods.html">auraPods</a></li>
              <li><a href="comparar.html">Comparar modelos</a></li>
            </ul>
          </div>
          <div class="aura-footer__col">
            <h2 class="aura-footer__heading">Cuenta</h2>
            <ul class="aura-footer__list">
              <li><a href="cuenta.html">Gestionar ID de AURA</a></li>
              <li><a href="bolsa.html">Bolsa</a></li>
              <li><a href="trade-in.html">AURA Trade In</a></li>
              <li><a href="soporte.html">Soporte</a></li>
            </ul>
          </div>
          <div class="aura-footer__col">
            <h2 class="aura-footer__heading">Valores</h2>
            <ul class="aura-footer__list">
              <li><a href="legal.html#privacidad">Privacidad</a></li>
              <li><a href="acerca.html#accesibilidad">Accesibilidad</a></li>
              <li><a href="acerca.html#medio-ambiente">Medio ambiente</a></li>
              <li><a href="acerca.html#proveedores">Proveedores</a></li>
            </ul>
          </div>
          <div class="aura-footer__col">
            <h2 class="aura-footer__heading">Empresa</h2>
            <ul class="aura-footer__list">
              <li><a href="acerca.html">Acerca de AURA</a></li>
              <li><a href="acerca.html#newsroom" title="Sala de prensa: las últimas noticias de AURA">Newsroom</a></li>
              <li><a href="acerca.html#oportunidades" title="Empleo en AURA">Oportunidades</a></li>
              <li><a href="soporte.html#contacto">Contacto</a></li>
            </ul>
          </div>
        </nav>
      </div>

      <div class="aura-footer__legal">
        <p class="aura-footer__copy">Copyright © 2026 AURA Inc. Todos los derechos reservados.</p>
        <ul class="aura-footer__legal-links">
          <li><a href="legal.html#privacidad">Política de privacidad</a></li>
          <li><a href="legal.html#cookies">Uso de cookies</a></li>
          <li><a href="legal.html#condiciones">Condiciones de uso</a></li>
          <li><a href="legal.html#imagenes" title="Autor, fuente y licencia de cada fotografía del sitio">Créditos de imágenes</a></li>
          <li>España</li>
        </ul>
      </div>

      <p class="aura-footer__demo">AURA es un proyecto de demostración. Los pedidos, pagos y cuentas son simulados y solo se guardan en este navegador.</p>

    </div>
  </footer>
</aura-footer>
```

Los separadores «·» de los enlaces legales los pinta el CSS **delante** de cada elemento (`::before`, en una caja de 1,25 rem), y la lista se desplaza ese tramo a la izquierda con él recortado: el separador del primer elemento de cada línea no se ve. Al partirse la fila en móvil no queda ninguno colgando, ni al final ni al principio. Todo (también «España», que no es un enlace) se centra en vertical; los enlaces miden 24 px con ratón y 44 px en táctil.

Nombres: «Migas de pan» y «Pie de página» en los dos `nav` (el `<footer>` ya es la región de pie). Los iconos sociales, que a la vista no tienen texto, llevan su nombre en texto oculto dentro del enlace (v2.1; antes `aria-label`) y lo repiten en `title` (el lector lo anuncia una vez; con el ratón aparece el texto emergente). AURA no tiene perfiles reales: cada icono lleva a la sección de `acerca.html` que contaría esa red, **una distinta para cada uno** (novedades → `#newsroom`, historia → `#historia`, empleo → `#oportunidades`), porque tres enlaces seguidos al mismo destino son el H2 de TAW. `title` también en «Newsroom», «Oportunidades» y «Créditos de imágenes», donde aclara el destino; en el resto, el texto del enlace ya lo dice.

### 12.3 Marcador de hueco `.aura-slot`

Cuando un `<img class="aura-img" data-slot="NOMBRE">` (que pide `NOMBRE.webp`) falla (listener global de `error` en fase de captura), `aura-core.js` prueba en orden `NOMBRE.png`, `NOMBRE.jpg` y —si hay `data-fallback="OTRO"`— `OTRO.webp`, `OTRO.png`, `OTRO.jpg`. Si nada carga, **reemplaza el `<img>`** por:

```html
<div class="aura-slot" role="img" aria-label="ALT" data-slot="NOMBRE" style="--w:1600;--h:1200">
  <div class="aura-slot__inner">
    <span class="aura-slot__icon bi bi-image" aria-hidden="true"></span>
    <span class="aura-slot__path">assets/img/NOMBRE.webp</span>
    <span class="aura-slot__size">1600 × 1200 px</span>
  </div>
</div>

<!-- Con data-fallback="OTRO": la ruta principal es la BASE (la última que se prueba) -->
<div class="aura-slot" role="img" aria-label="ALT" data-slot="auraphone-18-pro-negro" style="--w:1600;--h:1200">
  <div class="aura-slot__inner">
    <span class="aura-slot__icon bi bi-image" aria-hidden="true"></span>
    <span class="aura-slot__path">assets/img/auraphone-18-pro.webp</span>
    <span class="aura-slot__optional">Opcional, una por color: …-negro.webp</span>
    <span class="aura-slot__size">1600 × 1200 px</span>
  </div>
</div>
```

- `--w` / `--h` = atributos `width` / `height` del `<img>` (fijan la proporción). `ALT` = su `alt`.
- Si `alt` está vacío: sin `role` ni `aria-label`, con `aria-hidden="true"`.
- Conserva las clases extra del `<img>` (todas menos `aura-img` y las de estado `is-*`: `.is-pending`, `.is-entering`, `.is-leaving`… describen al `<img>` que se va y el marcador heredaría su opacidad 0) y sus atributos `data-aura-reveal` y `style` (añadiendo `--w`/`--h`). `data-slot` sigue siendo el original (`NOMBRE`).
- Sin `data-fallback`, la ruta mostrada es la `.webp` del hueco (`NOMBRE`). Con `data-fallback`, la ruta principal es la del hueco **base** (`OTRO.webp`: con esa imagen basta) y debajo, en pequeño (`.aura-slot__optional`), la variante opcional: «Opcional, una por color: …-COLOR.webp» si `NOMBRE` es `OTRO-COLOR`, o «Opcional, solo para este hueco: NOMBRE.webp» si es otro nombre.
- El marcador se adapta solo (consulta de contenedor): por debajo de ~272 px de ancho oculta la línea opcional por color, y por debajo de ~208 px todos los textos y deja solo el icono. Dentro de una tesela `--cover` se coloca arriba; dentro de un `.aura-media--frame` no lleva borde ni radio propios.

### 12.4 Tarjetas de `[data-aura-lineup]`

`aura-ui.js` **reemplaza el contenido** (`innerHTML`) de cada `[data-aura-lineup="FAMILIA"]` por los tres productos de `AURA.catalog.products(FAMILIA)` (ordenados por `rank`). Si el contenedor no tiene la clase `.aura-lineup`, se la añade. Cada tarjeta es `AURA.html.productCard(producto, { heading })`: la misma función que puede usar cualquier página (el carrusel «Toda la gama» de inicio la usa). Opciones: `heading` (`'h3'` por defecto) y `colorId` (el acabado que se enseña; por defecto, el de la foto: `catalog.defaults(p).colorId`).

```html
<div class="aura-lineup" data-aura-lineup="auraphone">

  <article class="aura-product-card" data-product="ID" data-status="disponible">
    <!-- v2.1: la foto no es un enlace; la tarjeta entera lleva al configurador por el enlace estirado del nombre -->
    <div class="aura-product-card__media">
      <img class="aura-img" src="assets/img/IMG.webp" data-slot="IMG" width="1600" height="1200" alt="" loading="lazy" decoding="async">
    </div>
    <div class="aura-product-card__body">
      <p class="aura-eyebrow aura-eyebrow--mono aura-eyebrow--plain">El más Pro</p>
      <h3 class="aura-product-card__name"><a href="comprar.html?producto=ID">auraPhone 18 Pro Max</a></h3>
      <p class="aura-product-card__finish">Negro</p>
      <p class="aura-swatch-list" role="img" aria-label="Acabados: negro, plata, azul glacial, burdeos">
        <span class="aura-swatch-list__dot" style="--swatch:#1d1d1f"></span>
        <span class="aura-swatch-list__dot" style="--swatch:#e3e4e5"></span>
        <span class="aura-swatch-list__dot" style="--swatch:#bcd0df"></span>
        <span class="aura-swatch-list__dot" style="--swatch:#5a1a2a"></span>
      </p>
      <p class="aura-product-card__text">El Pro más grande. La luz, a tus órdenes.</p>
      <div class="aura-product-card__foot">
        <p class="aura-product-card__price">
          <span class="aura-price">Desde 1.619 €</span>
          <span class="aura-caption">o 67,46 €/mes durante 24 meses</span>
        </p>
        <a class="aura-btn aura-btn--primary" href="comprar.html?producto=ID">Comprar<span class="visually-hidden"> auraPhone 18 Pro Max</span></a>
      </div>
    </div>
  </article>

  <!-- Modelo anunciado que aún no está disponible: fila de estado sobre el precio -->
  <article class="aura-product-card" data-product="auraphone-duo" data-status="proximamente">
    …
      <div class="aura-product-card__foot">
        <p class="aura-product-card__status"><span class="bi bi-calendar-event" aria-hidden="true"></span><span>Próximamente · Reserva a partir del 16 de octubre</span></p>
        <p class="aura-product-card__price">…</p>
        <a class="aura-btn aura-btn--primary" href="comprar.html?producto=auraphone-duo">Configurar<span class="visually-hidden"> auraPhone Duo</span></a>
      </div>
    …
  </article>

  <!-- … -->
</div>
```

| Dato | Origen |
| --- | --- |
| `ID` | `product.id` |
| `IMG` | `AURA.catalog.image(product, colorId)`: la primera vista de ese acabado (`photos`, con la base en `data-fallback`; v2.0) o, sin galería, `product.image` / `product.image + '-' + colorId` si ese color está en `imageVariants`. Con `srcset` y `sizes="(min-width: 1024px) 380px, 90vw"` |
| Antetítulo | `product.badge` (si está vacío, no se genera el `<p>`) |
| Nombre | `product.name` |
| Acabado | el color de `colorId` o, por defecto, el de la foto (`imageColor`; si no hay, el primero) |
| Puntos | un `<span>` por color con `--swatch: color.hex`; `aria-label` = «Acabados: » + nombres en minúsculas separados por comas |
| Texto | `product.tagline` |
| Precio | `'Desde ' + AURA.fmt.eur0(product.basePrice)` (si `basePrice` no es un número mayor que 0, no se pinta ni el precio ni la cuota) |
| Al mes | `'o ' + AURA.fmt.mes(product.basePrice) + ' durante ' + AURA.data.financing.months + ' meses'` («24 meses» con espacio indivisible) |
| Estado | `AURA.catalog.availability(product).html` (el `text`, con la fecha en `<time datetime>`), solo si `status !== 'disponible'` |
| Botón | `AURA.catalog.cta(product)` + el nombre en texto oculto: `VERBO<span class="visually-hidden"> NOMBRE</span>` (v2.1; antes `aria-label`) |

La imagen lleva `alt=""` porque la tarjeta ya se nombra con su título: la foto no es un enlace (v2.1), y la tarjeta entera lleva al configurador por el enlace estirado del nombre (§6; en táctil el nombre mide 44 px de objetivo sin mover el diseño). El nivel de encabezado (`h3`) se puede cambiar con `data-aura-heading="h2"` en el contenedor. `data-status` permite a una página filtrar o destacar sin recalcular.

Botón según la disponibilidad ([§14.3](#143-auracatalog)): «Configurar» si aún no se puede reservar (`proximamente`: se configura, pero no se añade a la bolsa), «Reservar» en reserva y «Comprar» si está disponible; el enlace es siempre el mismo. Lo mismo en la fila de acciones de la tabla comparativa.

### 12.5 Tabla de `[data-aura-compare]`

`aura-ui.js` reemplaza el contenido de cada `[data-aura-compare="FAMILIA"]`. Columnas: los tres productos por `rank`; la primera (rank 1) es la destacada.

```html
<div data-aura-compare="auraphone">

  <div class="aura-table-card">
    <div class="aura-table-card__head">
      <h3 class="aura-table-card__title" id="aura-cmp-auraphone-titulo">Especificaciones técnicas</h3>
      <p class="aura-eyebrow aura-eyebrow--mono aura-eyebrow--plain aura-eyebrow--muted">Comparativa / AURA Labs</p>
    </div>
    <p class="aura-table-card__hint">Desliza la tabla para ver todos los modelos.</p>
    <div class="aura-table-wrap" role="region" aria-labelledby="aura-cmp-auraphone-titulo" tabindex="0">
      <table class="aura-table">
        <caption class="visually-hidden">Comparativa técnica de los modelos auraPhone</caption>
        <thead>
          <tr>
            <th scope="col">Característica</th>
            <th scope="col" class="is-featured">auraPhone Duo</th>
            <th scope="col">auraPhone 18 Pro Max</th>
            <th scope="col">auraPhone 18 Pro</th>
          </tr>
        </thead>
        <tbody>
          <tr><th scope="row">Chip</th><td class="is-featured">AURA A20 Pro (2 nm) · …</td><td>AURA A20 Pro (2 nm) · …</td><td>AURA A20 Pro (2 nm) · …</td></tr>
          <!-- … una fila por cada family.compareRows: label + product.specs[key] (o «—») … -->
          <!-- fila «precio»: siempre desde basePrice, con la disponibilidad debajo si no está a la venta -->
          <tr class="aura-table__row--price"><th scope="row">Precio</th><td class="is-featured">Desde 2.339 €<span class="aura-table__note">Próximamente · Reserva a partir del 16 de octubre</span></td><td>Desde 1.619 €</td><td>Desde 1.469 €</td></tr>
          <tr class="aura-table__row--actions">
            <th scope="row"><span class="visually-hidden">Comprar</span></th>
            <td class="is-featured"><a class="aura-btn aura-btn--secondary" href="comprar.html?producto=ID1">Configurar<span class="visually-hidden"> auraPhone Duo</span></a></td>
            <td><a class="aura-btn aura-btn--secondary" href="comprar.html?producto=ID2">Comprar<span class="visually-hidden"> auraPhone 18 Pro Max</span></a></td>
            <td><a class="aura-btn aura-btn--secondary" href="comprar.html?producto=ID3">Comprar<span class="visually-hidden"> auraPhone 18 Pro</span></a></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

</div>
```

- La fila de acciones al pie de la tabla repite la compra: botón secundario de 48 px (el de la guía; no hay variante pequeña) en todas las columnas (la destacada ya la marca el nombre en dorado), igual que la fila final de `comparar.html`. La acción primaria de cada modelo es la de su tarjeta o su cabecera.
- Los valores pasan por `AURA.fmt.units`: cifra y unidad no se separan al cambiar de línea («120 Hz», «1 TB»).
- La fila con `key: 'precio'` se calcula siempre con `'Desde ' + AURA.fmt.eur0(product.basePrice)` (en `data.js` no hay `specs.precio`): al cambiar `basePrice`, la tabla se actualiza sola. Debajo, `.aura-table__note` con `AURA.catalog.availability(p).html` (el `text`, con la fecha en `<time datetime>`) si el modelo aún no está disponible.
- Título configurable con `data-aura-compare-title="Especificaciones auraPad"`; por defecto «Especificaciones técnicas».
- `<caption class="visually-hidden">` (temario DIW: toda tabla tiene título): «Comparativa técnica de los modelos FAMILIA» o el texto de `data-aura-compare-caption`. A la vista ya la titula la cabecera de la tarjeta; el caption no empuja la tabla (`caption.visually-hidden`, arriba, aura.css §2) y da nombre a la tabla en el lector de pantalla. `th` con `scope="col"` en la cabecera y `scope="row"` en cada fila.
- Un valor que falta se pinta `<span aria-hidden="true">—</span><span class="visually-hidden">Sin dato</span>`: raya a la vista, «Sin dato» al oído.
- `.aura-table-wrap` es enfocable (`tabindex="0"`, `role="region"`) para poder desplazarla con el teclado en móvil. La primera columna es pegajosa.
- Por debajo de 576 px la tabla se compacta (mín. 544 px, texto de 13 px) y la columna fija mide 104 px: a 360 px se ve siempre un modelo entero junto a su etiqueta.
- Efecto de borde de la columna fija: `aura-ui.js` añade `.is-scrolled` a `.aura-table-wrap` en cuanto se desplaza (escucha `scroll` en captura, sin marcado extra) y solo entonces aparecen la línea y el degradado donde las columnas pasan por debajo.

### 12.6 Avisos `.aura-toast`

Región única, creada por `aura-ui.js` la primera vez y añadida al final de `<body>`:

```html
<div class="aura-toasts" id="aura-toasts" role="region" aria-label="Avisos"></div>
```

Cada aviso (los nuevos se insertan **arriba**, con `prepend`):

```html
<div class="aura-toast aura-toast--ok" role="status" aria-live="polite" aria-atomic="true">
  <span class="aura-toast__icon bi bi-check-circle-fill" aria-hidden="true"></span>
  <div class="aura-toast__body">
    <p class="aura-toast__title">Añadido a la bolsa</p>
    <p class="aura-toast__text">auraPhone 18 Pro Max · Negro</p>
  </div>
  <button class="aura-toast__action" type="button">Ver bolsa</button>
  <button class="aura-toast__close" type="button"><span class="bi bi-x" aria-hidden="true"></span><span class="visually-hidden">Cerrar el aviso</span></button>
</div>
```

| `kind` | Clase (color del icono) | Icono | `role` / `aria-live` |
| --- | --- | --- | --- |
| `status` | `aura-toast--status` (azul) | `bi-info-circle-fill` | `status` / `polite` |
| `ok` | `aura-toast--ok` | `bi-check-circle-fill` | `status` / `polite` |
| `warn` | `aura-toast--warn` | `bi-exclamation-triangle-fill` | `alert` / `assertive` |
| `error` | `aura-toast--error` | `bi-x-octagon-fill` | `alert` / `assertive` |

- `__text` y `__action` solo si se pasan `text` / `action`. El botón de cerrar va siempre.
- Entrada: insertar sin `.is-visible`, forzar un reflujo (`el.offsetWidth`) y añadir `.is-visible`: se materializa (opacidad, escala y desenfoque de 6 px). Salida: quitar `.is-visible` y eliminar el nodo en `transitionend` (con un temporizador de 260 ms como respaldo). Misma trayectoria de ida y vuelta.
- **Apilados sin saltos**: al insertar uno nuevo arriba o retirar otro, los demás se deslizan a su nuevo sitio (FLIP con la propiedad `translate`, 320 ms, `--ease-out`). Con «reducir movimiento», sin desplazamiento.
- **Se apartan con el dedo** (`dragGesture` en cada aviso): por debajo de 576 px hacia **arriba** (salen por arriba), desde 576 px hacia la **derecha** (donde se apilan). 1:1 con el dedo, goma en el sentido contrario, el temporizador se pausa mientras se arrastra (`.is-dragging`, sin transición CSS). Al soltar: con más de ~220 px/s hacia fuera, o si su proyección pasa de la mitad del recorrido, sale con un muelle que hereda la velocidad (la opacidad baja con el camino) y se retira; si no, vuelve con amortiguación crítica. `touch-action: none` en el teléfono, `pan-y` desde 576 px.
- Duración por defecto: 5 s; 8 s si hay `action`; los `error` no se cierran solos. El temporizador se pausa con el puntero encima o el foco dentro.
- Pulsar `action` ejecuta `onClick` y cierra el aviso. Máximo 3 avisos visibles: al llegar el cuarto se cierra el más antiguo.
- Material fino (`--glass-thin-*`). Con una tarea modal abierta (`html.aura-lock`: hoja, buscador o menú) el aviso es una capa sólida, para no apilar cristal sobre cristal.

### 12.7 Hoja `.aura-sheet`

El autor escribe el marcado de [§9](#hoja--cajón). Al inicializar `[data-aura-sheet]`, `aura-ui.js` **añade lo que falte**: `<div class="aura-scrim" data-aura-sheet-close></div>` como primer hijo de `.aura-sheet`, y `<div class="aura-sheet__grabber" aria-hidden="true"></div>` como primer hijo de `.aura-sheet__panel`.

Contrato con el CSS:

- El CSS define los dos estados de reposo: cerrado = `visibility: hidden` y panel en `transform: var(--aura-sheet-closed)`; abierto (`.aura-sheet.is-open`) = visible, panel en `transform: none`, velo con `opacity: 1`. **No hay transiciones CSS**: el movimiento es del muelle.
- El eje lo dicta el CSS: `getComputedStyle(panel).getPropertyValue('--aura-sheet-axis').trim()` → `'y'` (hoja inferior: se cierra arrastrando hacia abajo) o `'x'` (cajón derecho: se cierra arrastrando hacia la derecha). Léelo al abrir y al empezar cada arrastre (cambia con el ancho de la ventana).
- **Abrir**: añade `.is-open` y `.is-animating`, `aria-hidden="false"`, `aria-expanded="true"` en el disparador, `html.aura-lock`; escribe en línea `panel.style.transform = translate3d(…)` desde el tamaño del panel (fuera de pantalla) hasta 0 con `AURA.ui.spring({ damping: 1, response: 0.3 })` (sin rebote: un botón no da impulso), y `scrim.style.opacity` proporcional al avance (0 → 1). El foco pasa al panel (o a `[autofocus]`) **en el mismo instante de abrir**, sin esperar al muelle (el teclado no debe sufrir la latencia de la animación). En `onRest`: borra los estilos en línea y quita `.is-animating`.
- **Arrastrar** (desde `.aura-sheet__grabber`, `.aura-sheet__header` o, con el dedo, desde `.aura-sheet__body` cuando su `scrollTop` es 0 y el gesto va en el sentido del cierre): umbral de 10 px, `setPointerCapture` al reconocer el arrastre, seguimiento 1:1 respetando el punto de agarre, efecto goma (`AURA.ui.rubberband`) en sentido contrario al cierre, `.is-dragging` mientras dura. El velo se atenúa con el avance. Con ratón solo se arrastra desde el tirador o la cabecera. Marca con `data-aura-no-drag` cualquier zona interior que no deba iniciar el arrastre.
- **Soltar**: si el gesto lleva impulso (más de ~220 px/s) decide el **signo de la velocidad** (hacia el cierre → cierra; en contra → vuelve a abrirse), esté donde esté. Si se suelta parado, decide la proyección (`posición + AURA.ui.project(velocidad)`) respecto a la mitad del panel. En ambos casos el muelle hereda la velocidad del gesto; con impulso usa damping 0.8 / response 0.3 (los valores de la skill para cajones y hojas); sin él, damping 1.
- **La página retrocede** (solo la hoja inferior, eje y): mientras se abre, `aura-ui.js` escala `<main>`, el pie y las barras hasta un 96,5 % ligado 1:1 al avance del panel (cada uno con su `transform-origin` en el centro de la pantalla), y lo devuelve al cerrar. Al inicializarla, la hoja sale de `<main>` (justo detrás) para no escalarse con él.
- **Cerrar** (Esc, velo, `[data-aura-sheet-close]`, arrastre): al pedir el cierre, `aria-expanded="false"`, el foco vuelve al disparador y la página deja de estar inerte (no se espera a la animación); si la hoja estaba en reposo se vuelven a leer el eje y el tamaño (la ventana pudo cruzar los 768 px con ella abierta); el muelle lleva el panel fuera de pantalla y, al llegar, quita `.is-open` y `.is-animating`, borra los estilos en línea, pone `aria-hidden="true"` y quita `html.aura-lock`. Mientras sale, la hoja no intercepta clics (`pointer-events`), pero el panel se puede volver a coger.
- Si la página quita del DOM una hoja (o un carrusel) —por ejemplo, al repintar con `innerHTML`—, `aura-ui.js` lo detecta, para su muelle, desconecta sus observadores y, si la hoja estaba abierta, devuelve la página a su estado (sin bloqueo de scroll ni `inert`).
- **Interrumpible**: abrir o cerrar durante una animación cambia el objetivo del mismo muelle (`setTarget`) conservando la velocidad; un `pointerdown` durante la animación la detiene y pasa a arrastre desde la posición actual. Nunca se bloquea la entrada.
- Foco atrapado dentro del panel mientras está abierta; el resto de la página queda `inert` si el navegador lo admite.
- Con `prefers-reduced-motion: reduce`: al abrir o cerrar con un botón no se escribe nada en línea; solo se alternan `.is-open` y los atributos, y el CSS hace un fundido de 200 ms. **El arrastre sigue funcionando** (el tirador lo promete; lo mueve el usuario 1:1, no es movimiento vestibular): al soltar no hay muelle; si se cierra, la hoja se funde desde donde la dejó el dedo (`.is-releasing` conserva el `transform` en línea durante el fundido); si se queda, vuelve a su sitio con un fundido corto. La página no retrocede.

Eventos (en el elemento `.aura-sheet`, con burbujeo): `aura:sheet-open` (al empezar a abrirse) y `aura:sheet-close` (cuando ya está cerrada del todo).

### 12.8 Carrusel

El autor escribe raíz, ventana, pista y diapositivas ([§10](#carrusel)). `aura-ui.js`, al inicializar `[data-aura-carousel]`:

1. Añade `.is-ready` a la raíz (el CSS pasa de `scroll-snap` nativo a `overflow: hidden` + `touch-action: pan-y`) y pone `scrollLeft = 0` en la ventana.
2. Si no existe `.aura-carousel__controls`, añade al final de la raíz:

```html
<div class="aura-carousel__controls">
  <div class="aura-carousel__dots">
    <!-- v2.1: el nombre de cada punto y de cada flecha, en texto oculto (el punto lo dibuja ::before) -->
    <button class="aura-carousel__dot is-active" type="button" aria-current="true"><span class="visually-hidden">Ir a la diapositiva 1 de 4</span></button>
    <button class="aura-carousel__dot" type="button"><span class="visually-hidden">Ir a la diapositiva 2 de 4</span></button>
    <button class="aura-carousel__dot" type="button"><span class="visually-hidden">Ir a la diapositiva 3 de 4</span></button>
    <button class="aura-carousel__dot" type="button"><span class="visually-hidden">Ir a la diapositiva 4 de 4</span></button>
  </div>
  <p class="aura-carousel__counter" aria-hidden="true">1 de 4</p>   <!-- solo se ve con .is-counter -->
  <button class="aura-icon-btn aura-icon-btn--solid" type="button" data-aura-carousel-prev disabled><span class="bi bi-chevron-left" aria-hidden="true"></span><span class="visually-hidden">Anterior</span></button>
  <button class="aura-icon-btn aura-icon-btn--solid" type="button" data-aura-carousel-next><span class="bi bi-chevron-right" aria-hidden="true"></span><span class="visually-hidden">Siguiente</span></button>
</div>
<p class="visually-hidden" aria-live="polite" data-aura-carousel-status>Diapositiva 1 de 4</p>
```

(Si escribes tú `.aura-carousel__controls`, el JS le añade el contador detrás de los puntos si falta.)

3. Hace la ventana enfocable (`tabindex="0"`) para las flechas ← → (y Inicio / Fin).

Estado que mantiene el JS:

- `track.style.transform = 'translate3d(' + x + 'px, 0, 0)'` (único estilo en línea).
- Raíz: `.is-dragging` durante el arrastre; `.is-animating` mientras el muelle está en marcha.
- Punto activo: `.is-active` + `aria-current="true"`. «Anterior» / «Siguiente»: `disabled` en los extremos (si el botón tenía el foco, pasa al otro o a la ventana). Contador: «N de P».
- `[data-aura-carousel-status]` (región `aria-live="polite"`, oculta) anuncia la posición al cambiarla con flechas, puntos, teclado o gesto:
  - una posición por diapositiva: «Diapositiva 2 de 5»;
  - varias diapositivas por vista (`--thirds`, o tarjetas estrechas): «Posición 2 de 3: diapositivas 4 a 6 de 9» (las que se ven enteras en esa posición; con `--bleed` cuentan también las que se ven enteras en el margen hasta el borde de la pantalla), igual que los puntos dicen «Ir a la posición 2 de 3».
  - Al inicializar, o si la página llena la pista después y llama a `refresh()`, el texto se pone al día **sin anunciarse** (no es un cambio del usuario).
- Puntos de ajuste: el `offsetLeft` de cada diapositiva, limitado al desplazamiento máximo (`track.scrollWidth − viewport.clientWidth`). Recalcular en `resize`. Puntos o contador: si los puntos no caben, `.is-counter` en los controles.

Gesto (skill «apple-design»): `pointerdown` detiene el muelle si estaba en marcha (se agarra en pleno vuelo, y entonces el puntero se captura en el acto); umbral de 10 px para decidir horizontal frente a vertical (si es vertical, se suelta el gesto y la página hace scroll); al reconocer el arrastre se captura el puntero (`setPointerCapture`) —no antes, para que un toque normal siga llegando a los enlaces de las diapositivas—. En táctil el navegador ya había capturado, de forma implícita, el descendiente tocado: al pasar la captura a la ventana del carrusel, ese descendiente recibe un `lostpointercapture` que burbujea; el gesto solo termina por la pérdida de captura **del propio elemento** (v1.4: antes ningún arrastre táctil pasaba del primer movimiento, igual en hoja, aviso y segmentado); seguimiento 1:1 desde el punto de agarre; historial de posición y tiempo de los últimos ~100 ms para la velocidad; efecto goma en los extremos (`AURA.ui.rubberband(exceso, anchoDeLaVentana)`); al soltar: **con impulso** (más de ~200 px/s) decide el signo de la velocidad y el destino es el siguiente punto de ajuste en ese sentido (una diapositiva, nunca más); **sin impulso**, el punto más cercano a `x + AURA.ui.project(velocidad, 0.99)` (la deceleración «ágil» de la skill), como mucho uno más allá del que hay bajo el dedo. Muelle hacia el destino con la velocidad del gesto (damping 0.8 si hubo impulso, 1.0 sin él y en flechas, puntos y teclado; response 0.4, que se alarga hasta 0.6 si con 0.4 el muelle tuviera que ir más de ~1,5 veces más rápido que el dedo: nunca acelera tras soltar). En cuanto se reconoce el arrastre, la pulsación del botón o la tarjeta donde empezó se cancela. Tras un arrastre real se cancela el `click` siguiente para no abrir enlaces por accidente (los clics de teclado nunca se cancelan).

Además: la rueda o el trackpad en horizontal desplazan la pista directamente (con goma en los extremos, como el dedo) y, a los 140 ms de parar, se ajusta con un muelle crítico que arranca del reposo (nunca reutiliza la velocidad de un muelle interrumpido); el foco de teclado en una diapositiva que no se ve entera la trae a la vista; si caben varias diapositivas por vista (`--thirds`) hay un punto por posición de ajuste, no por diapositiva («Ir a la posición 2 de 3»); si todo cabe, los controles se ocultan (`hidden`). Marca con `data-aura-no-drag` lo que no deba iniciar el arrastre. Evento en la raíz: `aura:carousel-change` con `detail: { index, count }`.

Con `prefers-reduced-motion: reduce`: sin muelle; se coloca directamente en el destino con un fundido corto de la pista (200 ms).

### 12.9 Bloques de tienda

Lo que se repite en inicio y en las cuatro familias sale de la base, con las cifras del catálogo (los textos concuerdan con `catalog.grammar`: «Los auraPods 5, desde…», «de tus nuevos auraPods»). Basta con el contenedor:

```html
<!-- «Por qué comprar en AURA»: cuatro ventajas, siempre en el mismo orden -->
<section class="aura-section" id="ventajas" aria-labelledby="ventajas-titulo">
  <div class="aura-container">
    <div class="aura-section-head aura-section-head--split">
      <div class="aura-section-head__text">
        <p class="aura-eyebrow aura-eyebrow--mono">AURA Store</p>
        <h2 class="aura-h2" id="ventajas-titulo">Por qué comprar tu auraPhone en AURA.</h2>
      </div>
      <a class="aura-link" href="soporte.html#contacto">Hablar con un especialista</a>
    </div>
    <div class="aura-perks" data-aura-perks="auraphone"></div>      <!-- sin familia (inicio): data-aura-perks="" -->
  </div>
</section>

<!-- Llamada final de la página de familia -->
<section class="aura-section aura-section--band aura-section--center" id="comprar" aria-labelledby="comprar-titulo">
  <div class="aura-halo" aria-hidden="true"></div>
  <div class="aura-container">
    <div class="aura-section-head aura-section-head--center mb-0">
      <p class="aura-eyebrow aura-eyebrow--mono">auraPhone</p>
      <h2 class="aura-h1" id="comprar-titulo">¿Cuál será tu auraPhone?</h2>
      <p class="aura-lead" data-aura-from="auraphone" hidden></p>   <!-- «Desde 1.469 € o 61,21 €/mes durante 24 meses.» -->
      <div class="aura-cluster aura-cluster--stack-sm justify-content-center mt-2">
        <a class="aura-btn aura-btn--primary" href="comprar.html?producto=auraphone-18-pro" data-aura-buy="auraphone">Comprar auraPhone</a>
        <a class="aura-btn aura-btn--secondary" href="comparar.html?familia=auraphone">Comparar todos los modelos</a>
      </div>
    </div>
  </div>
</section>

<!-- Una tarjeta por familia (bolsa vacía, «¿Qué vas a estrenar?» de Trade In): --4 con cuatro familias, sin huérfanas -->
<div class="aura-grid aura-grid--4" data-aura-family-cards></div>
```

| Atributo | Pinta |
| --- | --- |
| `data-aura-perks="familia"` | `AURA.html.storePerks(familia)` y la clase `.aura-perks`: Envío y devolución · Paga en 24 meses (con la cuota del modelo de entrada) · AURA Trade In («Hasta X €» = `tradeIn.max(familia)`) · AuraCare+ (`carePrice(familia)`), cada una con su enlace (llamadas del glosario de §13). Una columna → 2 × 2 desde 576 px → 4 en fila desde 1200 px; el enlace, siempre abajo. |
| `data-aura-family-cards` | `AURA.html.familyCard(id)` por familia: imagen del modelo de entrada, nombre, lema, «Desde X €» y «Ver auraX» (`.aura-family-card`). |
| `data-aura-from="familia"` | «Desde X € o Y €/mes durante 24 meses.» con el precio base más bajo de la familia (se oculta si no hay). |
| `data-aura-buy="familia"` | El enlace del modelo de entrada (`AURA.catalog.entry`). Con `data-aura-buy-short` (barra local), además el verbo (`catalog.cta`) y el nombre del modelo en texto oculto: `Comprar<span class="visually-hidden"> auraPhone 18 Pro</span>` (v2.1; antes `aria-label`). |

---

## 13. Reglas de uso

Derivadas de las notas de uso de la guía de estilo AURA y de la skill «apple-design».

### Color

- El azul comunica **interacción** (botones, enlaces, foco, selección). El dorado aporta **valor premium** (antetítulos, metadatos, columna destacada, hitos, el icono de AuraCare+ y Trade In). Nunca como superficies extensas ni compitiendo por la misma jerarquía en un mismo bloque. Lo que no se pulsa no va en azul: iconos de característica neutros, marcas de lista en gris. **Excepciones documentadas** (guía §00): el acabado de la tarjeta de modelo y el halo de los paneles de foto de producto (sobre base #000).
- Para texto azul usa siempre `--accent-link` (#1787f7, el de la v1: 5,85:1 sobre negro y 5,03:1 sobre tarjeta), nunca `--accent` (#0071e3 no llega a AA como texto sobre negro). `--accent` es para rellenos con texto blanco. `--accent-link-hover` (#4aa3ff) es el de la etiqueta del secundario en hover y en foco y el de los enlaces sin clase (`--bs-link-hover-color`); `.aura-link` no cambia de color: se subraya.
- **Qué fuente manda** (v2.0): la guía v2 (y este documento), después los prototipos de página y después la v1. Cada desviación de la v1 está escrita en la guía §00 con su motivo; una nueva se escribe ahí antes de llegar a una página.
- El estado nunca se comunica solo con color: los errores llevan icono y texto; el paso completado, una marca; el elegido, un anillo o un borde.
- Alterna fondos negro (`.aura-section`) y franja (`.aura-section--band`) para dar ritmo; las tarjetas viven sobre cualquiera de los dos.

### Tipografía

- Kanit para titulares, cifras y momentos de marca. Inter para todo lo que se lee o se pulsa. Mono solo para etiquetas técnicas cortas en mayúsculas.
- Un solo `.aura-display` por página. Un `h1` por página.
- No fijes `letter-spacing` ni `line-height` a mano: cada clase ya trae el tracking y el interlineado de su tamaño.
- Mantén la longitud de línea cómoda (`.aura-lead` y `.aura-body` ya la limitan); no los estires con anchos al 100 % en pantallas grandes.

### Acciones

- **Una sola acción primaria (`--primary`) por contexto** (héroe, tarjeta, formulario, resumen). La acompañan como mucho una secundaria y enlaces contextuales.
- Etiquetas directas y específicas, en infinitivo: «Comprar auraPhone», «Añadir a la bolsa», «Valorar mi dispositivo»; no «Aceptar», «Enviar» ni «Haz clic aquí». **La misma acción se llama igual en todo el sitio** (glosario):

| Acción | Texto |
| --- | --- |
| Ir al configurador | `AURA.catalog.cta(p)` («Configurar», «Reservar» o «Comprar») + nombre: «Comprar auraBook Pro 16″»; en un héroe o una llamada final de familia, «Comprar auraPhone» (modelo de entrada, `data-aura-buy`) |
| Valorar con Trade In | «Valorar mi dispositivo» (la cinta del prototipo conserva «Comprobar valor cuántico») |
| Ir al comparador | «Comparar todos los modelos» (el pie y el buscador nombran el destino: «Comparar modelos») |
| Ir a una página de familia | «Ver auraPhone», «Ver auraPad», «Ver auraBook» |
| Ver las tarjetas de modelo de la página | «Ver los modelos» |
| Contacto | «Hablar con un especialista» |
| Abrir el detalle de una tesela | «Ver cómo» |
- Desactivado = menos contraste, pero la etiqueta se sigue leyendo. Explica junto al botón por qué está desactivado si no es evidente.
- Nada destructivo pide confirmación si se puede deshacer: elimina y ofrece «Deshacer» en un aviso. Reserva la confirmación para lo irreversible (vaciar la cuenta, cerrar sesión con un pedido a medias).
- Objetivos táctiles de 44 px como mínimo en pantallas táctiles (`pointer: coarse`): botones, segmentado, puntos del carrusel (si no caben, contador + flechas), migas, enlaces del pie, `button.aura-link`, `a.aura-link` suelto o con `--control`, título de la barra local, nombres enlazados de tarjetas y líneas de bolsa, «volver» de las notas al pie, llamadas a nota (área invisible de 44 px), chevrón de la barra local. Con puntero fino, nunca menos de 24 px (enlaces sueltos y `--control`, migas, enlaces legales del pie, llamadas a nota). Todo lo hace la base: no añadas reglas de 44 px en las páginas.
- Lo destructivo e irreversible usa `.aura-btn--destructive`, tras una confirmación; lo que se puede deshacer no pide confirmación (aviso con «Deshacer»).
- Todo lo que se pulsa responde en `pointerdown` (§1); el `:hover` es un extra solo para ratón.
- Botones siempre de 48 / 999 / 24 (guía §03): no hay variante pequeña. Donde un botón no cabe o compite con la primaria (la barra local), la acción es el enlace contextual con «›».
- Lo simulado (el pago) no se «hace esperar»: ningún temporizador entre el toque y la confirmación.
- Todo lo que se pulsa tiene texto (v2.1): un botón o enlace de solo icono lleva su nombre en `.visually-hidden`; una foto no es un enlace si al lado ya lo es su nombre (la tarjeta entera se pulsa con el enlace estirado). Dos enlaces seguidos no van al mismo sitio, y un «Comprar» o «Más información» repetido dice de qué en texto oculto.

### Formularios

- La etiqueta permanece siempre visible; el `placeholder` es un ejemplo, no la etiqueta.
- El icono de apoyo dice qué se espera en el campo; nunca es decorativo.
- El cristal aparece al enfocar y **no sustituye** al borde azul ni al anillo.
- Valida en línea (al salir del campo y, tras el primer error, mientras se escribe), con el mensaje junto al campo y en lenguaje llano: qué pasa y cómo arreglarlo.
- Pide solo lo necesario, en el momento en que hace falta. Nunca se guardan datos de tarjeta; dilo junto al formulario de pago.
- Cada control con su `<label for>`, aunque la etiqueta ya lo envuelva; cada grupo de radios en su `<fieldset>` con `<legend>`; cada `<form>` con su botón `type="submit"` (v2.1, [§15.9](#159-test-taw-wcag-2x-aa)).

### Materiales y profundidad

- Tres niveles: base (negro), elevación (`.aura-card`), cristal (`--glass`, barra, popover, hoja).
- El cristal solo sobre fondos opacos. **Nunca cristal claro sobre cristal**: dentro de una hoja, popover o tarjeta de cristal usa superficies planas (`--fill-1`, `--fill-2`).
- Cuanto mayor la superficie, más gruesa: más desenfoque y sombra más profunda. Tres niveles de token, con fondo y filtro del mismo nivel: aviso (fino) < popover y barras (regular) < hoja, buscador, menú y barra de compra (grueso). Igual que en §9.
- Sobre cristal, el texto secundario no es gris plano: cada material redefine `--text-secondary`, `--text-tertiary` y `--text-placeholder` con blanco translúcido (vibrancia, tokens `--vibrant-label`, `--vibrant-secondary`, `--vibrant-tertiary`) y todo lo que contiene los hereda. No fuerces colores grises dentro de un popover, aviso, hoja, buscador, menú o barra de compra. Para una superficie de cristal propia de una página usa `.aura-material` (§1), que trae fondo, filtro y vibrancia; nunca `rgba()` ni `opacity` a mano.
- Velo solo en tareas modales (hoja, buscador, menú). Los paneles paralelos (popover, avisos, barra de compra) no atenúan la página. Un aviso que aparece sobre una tarea modal es sólido (nunca cristal sobre cristal).
- Una barra flotante propia de una página es `.aura-glass-bar` (cristal en `::before`, efecto de borde con desenfoque en `::after`) y, si es fija, vive fuera de `<main>` o lleva `data-aura-relocate` (§1).
- Lo mismo se ve igual: las cifras sobre una foto van en el mismo panel (`.aura-media__overlay--glass`) en todas las páginas.
- Bajo lo que flota no hay una línea fija: el borde aparece solo cuando el contenido pasa por debajo (barra global al hacer scroll, barra local al quedarse pegada, columna fija de la tabla al desplazarla), y en las barras es el propio material que se desvanece (desenfoque progresivo), no una línea.
- Una tarea modal vela **y** empuja hacia atrás la página (hoja inferior, buscador); un panel paralelo (popover, aviso, barra de compra) ni vela ni empuja.
- Las fotos se funden con el negro: sin marcos alrededor de una foto real en héroes y bloques texto + imagen; las de producto, sobre el halo de su panel (base `--bg-main` #000; el halo azul es una excepción documentada).
- Superficies solo de la paleta: la tabla comparativa y su columna fija en `--bg-secondary`, la tesela `--cover` en `--bg-main`, la tarjeta de acceso en `--bg-elevated` con `--shadow-2`. Nada de `#0d0d0e`, `#050506` ni `#030304`.

### Movimiento

- La respuesta empieza en la pulsación (`pointerdown`), no al soltar. Sin retardos artificiales ni «debounce» en el camino de la entrada.
- Solo se animan `transform` y `opacity` (y `filter` al materializar cristal). El color de base no se anima: el hover de los botones funde una capa (`::before`) y el halo en 160 ms.
- **El scroll es del usuario** (v2.0): ninguna pieza se queda con el gesto vertical (tablas con `overflow-y: hidden`, carruseles con `overscroll-behavior: auto` una vez iniciados), los saltos a un ancla son inmediatos (`html { scroll-behavior: auto }`; quien quiera un desplazamiento suave lo pide en la llamada) y lo que aparece al bajar llega a tiempo (§11).
- Todo lo que se arrastra sigue al dedo 1:1, hereda su velocidad al soltar, se proyecta a donde iba y se puede volver a coger en pleno vuelo. Por eso carrusel y hoja usan muelles, no transiciones CSS.
- Rebote (damping 0.8) solo cuando el gesto llevaba impulso; lo demás, amortiguación crítica (1.0). Abrir una hoja con un botón no rebota.
- Un golpe de carrusel mueve una diapositiva; un muelle nunca va mucho más deprisa que el dedo que lo soltó.
- En cuanto un arrastre gana, el toque pierde: nada se queda «pulsado» mientras se arrastra.
- La háptica (`AURA.ui.haptic`) acompaña a lo que la merece (éxito, error, ajuste), en el mismo instante que lo visual; nunca en carrusel, hoja ni navegación, y nunca sustituye al mensaje.
- Entra y sale por el mismo camino, y desde el elemento que lo abrió.
- Sin bucles lentos, sin fondos en movimiento a pantalla completa, sin parallax. Los orbes y halos son estáticos. **La única excepción es la escena con scroll** (§10 bis): nunca se mueve sola ni en bucle, solo avanza mientras el usuario desplaza la página y a su mismo ritmo (se para cuando él se para), y con «reducir movimiento» o «ahorro de datos» es una imagen fija. Como mucho una o dos por página, nunca dos seguidas.
- Respeta `prefers-reduced-motion` (fundidos cortos), `prefers-reduced-transparency` (superficies opacas) y `prefers-contrast: more` (fondos sólidos, bordes definidos): el CSS ya lo hace; el JS no debe saltárselo.

### Orientación

- Cada página responde: ¿dónde estoy? (enlace activo, título, migas del pie, con todos sus niveles: «AURA › auraPhone › Comprar auraPhone 18 Pro»), ¿adónde puedo ir?, ¿cómo salgo? Ningún overlay atrapa: Esc, velo y botón de cerrar siempre.
- La letra pequeña (IVA, financiación, reservas, cifras orientativas) va en `.aura-footnotes` al final de la página, no repartida en cada bloque, con los textos comunes de `AURA.legal` (§6).
- **Tono.** El guiño de marca («mundano», «valor cuántico», «frecuencia vibracional») va solo donde lo pone el prototipo (la cinta y el héroe de inicio) y, como mucho, una vez en la historia de Acerca y en un puesto de empleo. En el flujo de compra, la cuenta, el soporte, lo legal y la información de empresa, texto llano: «¿Cuánto vale tu dispositivo actual?», «¿No te convence? Devuélvelo gratis…». Si algo es simulado, se dice (nada de «cifrado de extremo a extremo» ni «te respondemos en 24 horas»).
- Fechas, precios, topes y estados de disponibilidad salen siempre del catálogo (`AURA.catalog`, `AURA.tradeIn`, `AURA.fmt`): nada escrito a mano en el HTML.
- Ningún enlace muerto. Si algo es simulado (pagos, cuentas), se dice.
- Lo que parece igual se comporta igual y está en el mismo sitio en todas las páginas.

---

## 14. API JavaScript

Dos scripts clásicos (sin módulos; ningún `fetch` del que dependa la página: la escena lo usa solo por http(s) y por `file://` vuelve a `new Image()`), un único global: `window.AURA`.

| Archivo | Dónde | Qué aporta |
| --- | --- | --- |
| `assets/js/data.js` | `<head>` | `window.AURA_DATA` (catálogo). |
| `assets/js/aura-core.js` | `<head>`, síncrono, después de `data.js` | `AURA.data`, `AURA.util`, `AURA.fmt`, `AURA.catalog`, `AURA.bag`, `AURA.auth`, `AURA.orders`, `AURA.tradeIn`, `AURA.slots`, `AURA.search`, `AURA.html`, `AURA.header`, `AURA.footer`, `<aura-header>`, `<aura-footer>`, huecos de imagen. |
| `assets/js/aura-ui.js` | final del `<body>` | `AURA.ui.*` y la inicialización por atributos `data-aura-*`. |
| `assets/js/pages/PAGINA.js` | después de `aura-ui.js` | Lógica propia de la página. Ya puede usar todo lo anterior. |

Reglas generales:

- Ninguna función lanza excepciones: con datos que faltan devuelven `null`, `0`, `[]` o `{ ok: false }`.
- Todo tolera que `localStorage` esté bloqueado (modo privado): se trabaja en memoria durante la página. `AURA.storage.persistent` es `false` en ese caso; avisa al usuario con un `toast` de tipo `warn` si la página depende de guardar algo. Si el almacén se llena **a mitad de sesión**, lo último escrito se sigue leyendo de memoria (nada se pierde mientras la página esté abierta), `AURA.storage.persistent` pasa a `false`, se emite `aura:storage` y `aura-ui.js` muestra él solo un aviso `warn` (una vez).
- El HTML que insertes después con JS se inicializa solo (un `MutationObserver` busca `data-aura-reveal`, `-carousel`, `-sheet`, `-lineup`, `-compare`, `-relocate`, `-scrub`, `-colorway`, `.aura-buybar` y `.aura-segmented`; otro, en `aura-core.js`, marca la aparición de cada `img[data-slot]`). También puedes llamar a `AURA.ui.init(contenedor)`.
- Al insertar texto de usuario o del catálogo con `innerHTML`, pásalo por `AURA.html.esc()`.

### 14.1 Eventos

Todos en `document` salvo que se indique. Escúchalos para repintar; no hace falta consultar `localStorage`.

| Evento | Cuándo | `event.detail` |
| --- | --- | --- |
| `aura:bag` | La bolsa cambia (también desde otra pestaña) | `{ reason: 'add' \| 'qty' \| 'remove' \| 'restore' \| 'clear' \| 'sync', line, items, count, subtotal }` |
| `aura:auth` | Registro, inicio o cierre de sesión, cambio de datos | `{ user \| null, reason }` |
| `aura:tradein` | Cambia el crédito de Trade In | `{ tradeIn \| null }` |
| `aura:orders` | Se crea un pedido | `{ order }` |
| `aura:storage` | `localStorage` deja de admitir escrituras a mitad de sesión (una vez por clave) | `{ key, reason: 'quota' }` |
| `aura:slot` | Una imagen se sustituye por su marcador | `{ el, slot }` |
| `aura:sheet-open` / `aura:sheet-close` | En la `.aura-sheet` (burbujean) | — |
| `aura:carousel-change` | En la raíz del carrusel (burbujea) | `{ index, count }` |
| `aura:popover-open` / `aura:popover-close` | En el `.aura-popover` (burbujean) | — |
| `aura:search-open` / `-close`, `aura:menu-open` / `-close` | En `#aura-search` / `#aura-menu` | — |
| `aura:step` | En un `.aura-stepper[data-aura-stepper]` (burbujea) | `{ value, delta }` |
| `aura:colorway` | En un `[data-aura-colorway]` al elegir acabado (burbujea; también al iniciar) | `{ colorId, name, exact, slot }` |

```js
document.addEventListener('aura:bag', function (e) {
  pintarResumen(e.detail.items, e.detail.subtotal);
});
```

### 14.2 `AURA.fmt`

| Función | Ejemplo |
| --- | --- |
| `fmt.eur(n)` | `1469` → `1.469,00 €` |
| `fmt.eur0(n)` | `1469` → `1.469 €` · `61.5` → `61,50 €` (sin decimales solo si es entero) |
| `fmt.mes(n)` | `1469` → `61,21 €/mes` (`n / AURA.data.financing.months`) |
| `fmt.num(n, decimales)` | `1234.5, 1` → `1.234,5` |
| `fmt.articulos(n)` | `1` → `1 artículo` · `2` → `2 artículos` |
| `fmt.fecha(valor)` | `'2026-10-16'` → `16 de octubre de 2026` · `'2026-10-03T08:00:00Z'` o un `Date` → `3 de octubre de 2026` |
| `fmt.diaMes(valor)` | `'2026-10-23'` → `23 de octubre` (sin el año) |
| `fmt.dia(valor, ref?)` | Sin el año si es el de hoy (o el de `ref`), con él si no: `23 de octubre` / `16 de enero de 2027`. La disponibilidad lo usa. |
| `fmt.units(texto)` | Cifra y unidad juntas: `'50 % en 15 min'`, `'SSD de 1 TB a 8 TB'`, `'USB-C (USB 3)'` → con espacio indivisible entre número y unidad (y tras `USB`, `Wi-Fi`, `AURA`, `M5`…), y «USB-C» → «USB-⁠C» (guion normal + WORD JOINER, U+2060: no se parte y el guion es de Inter; el U+2011 salía de Segoe UI). En el HTML, `USB-&#8288;C`. Úsalo al pintar `specs` y `highlights`. |

Las fechas llevan espacios indivisibles en «16 de octubre» (como mucho se parten antes de «de 2026»): no hace falta ningún arreglo en la página. **Si recortas o analizas una de estas cadenas con una expresión regular, usa `\s` (o `[\s\u00a0]`), nunca un espacio normal**: `/ de (\d{4})$/` no encuentra «9 de octubre de 2026» y falla sin dar error (le pasó a «Miembro desde…» en `cuenta.js`). El espacio antes de `€` es indivisible (` `) y los negativos llevan el signo menos tipográfico (`−`). En el resumen se escribe `'− ' + AURA.fmt.eur(descuento)` con el descuento en positivo.

**Fechas sin hora.** `'AAAA-MM-DD'` (las fechas de `data.js`: `updated`, `availability.preorder`, `availability.release`) es un **día local**: `fmt.fecha('2026-10-16')` da «16 de octubre de 2026» en cualquier zona horaria (`new Date('2026-10-16')` sería medianoche UTC y, al oeste de Greenwich, el día 15). Una fecha inválida (`'2026-02-31'`, `''`) da `''`. No añadas `T12:00:00` ni parsees a mano. Utilidades: `AURA.util.parseDate(valor)` → `Date` local o `null` (mismas reglas) y `AURA.util.isoDate(fecha)` → `'AAAA-MM-DD'` del día local.

### 14.3 `AURA.catalog`

Lee de `AURA.data` (= `window.AURA_DATA`). Donde se pide un producto vale su `id` o el propio objeto.

| Función | Devuelve |
| --- | --- |
| `families()` · `family(id)` | Las familias · una (o `null`). |
| `products(familyId)` | Los productos de la familia ordenados por `rank` (sin argumento: todos). |
| `product(id)` | El producto o `null`. |
| `defaults(producto)` | `{ colorId, selections }`: el acabado de la foto (`imageColor`; si no hay, el primer color) + primera opción válida de cada grupo. |
| `resolve(producto, selections)` | Selecciones completas y coherentes: rellena lo que falte y, si una opción deja de ser válida por `requires`, salta a la primera válida de su grupo. **Llámalo tras cada cambio en el configurador.** |
| `choices(producto, groupId, selections)` | `[{ id, label, delta, note, available, selected }]` para pintar un grupo (`available: false` → `disabled`). |
| `price(producto, selections)` | `basePrice` + deltas. Acepta `{ grupo: opción }` o lo que devuelve `defaults()`. Pasa antes por `resolve()`: con selecciones incompletas o imposibles da **el mismo precio que la línea de la bolsa**. |
| `optionLabels(producto, selections)` | `['512 GB', 'Wi-Fi + 5G']`, también sobre las selecciones resueltas. |
| `color(producto, colorId)` | `{ id, name, hex }` (si no existe o no se indica, el acabado por defecto: el de la foto). |
| `carePrice(producto \| familyId)` | Precio de AuraCare+ por unidad. |
| `grammar(producto \| familyId)` | Concordancia del nombre (v1.7, `family.plural` de `data.js`): `{ plural, el, del, al, un, tu, nuevo }` → en singular `el`, `del`, `al`, `un`, `tu`, `nuevo`; en plural `los`, `de los`, `a los`, `unos`, `tus`, `nuevos`. Úsalo en todo texto que pegue un artículo o un posesivo al nombre de un producto o una familia: «Comprar los auraPods Max 2», «Protege tus nuevos auraPods». |
| `views(producto, colorId)` | v2.0, galería por color: `[{ slot, vista, label, aria, alt, exact, color, fallback }]`, las vistas de ese acabado en su orden (la primera es la de tarjeta). `vista`: `'trasera'`, `'frontal'`, `'tres-cuartos'`, `'lateral'`, `'abierto'`, `'cerrado'`, `'estuche-abierto'`, `'estuche-cerrado'` o `'auriculares'`; `label`: «Trasera», «Frente», «Tres cuartos», «Perfil», «Abierto», «Cerrado», «Estuche abierto», «Estuche cerrado», «Auriculares»; `aria`: el nombre del botón de su miniatura («Vista trasera», «Vista frontal»…). Si ese acabado no tiene fotos, las del acabado por defecto con `exact: false` y `color` = el acabado que **sí** se ve. Sin `colorId`, las del acabado por defecto (`exact: true`). Un producto sin `photos`: una sola entrada con la foto de siempre (`vista: ''`). `fallback`: la foto base (`product.image`). `[]` si el producto no existe. |
| `image(producto, colorId, vista?)` | `{ slot, fallback, exact, color, alt, vista, label, aria }`: la primera de `views()` (la de tarjeta: tarjetas, bolsa, checkout, buscador, comparar) o, con `vista`, esa si el acabado la tiene. `color`: el acabado que se **ve** en la foto (`null` si no se aprecia). `exact`: `false` si la foto enseña otro acabado que el pedido (díselo al usuario). `alt`: descripción de la foto real. |
| `today()` | Hoy, como `Date` a medianoche local. Si la URL con la que se abrió la página lleva `?hoy=AAAA-MM-DD`, ese día (ver abajo). |
| `availability(producto, día?)` | `{ status, title, label, text, labelHtml, html, canBuy, preorder, release }` (ver abajo). `día` opcional (`'AAAA-MM-DD'` o `Date`); por defecto, `today()`. |
| `cta(producto)` | `'Configurar'` si aún no se puede reservar (`proximamente`), `'Reservar'` en reserva y `'Comprar'` si está disponible. |
| `url(producto)` | `comprar.html?producto=ID` (con `&hoy=…` si la página se abrió con `?hoy=`). |
| `withHoy(href)` | El enlace interno con `?hoy=AAAA-MM-DD` si la página se abrió con él; si no, igual. |
| `entry(familia)` | El modelo de entrada: el más asequible que ya se puede comprar (si no hay, el más asequible que se pueda reservar; si tampoco, el más asequible). Es el del precio «Desde» y el destino de todos los «Comprar auraX» (`data-aura-buy`). |
| `line(producto, { colorId, selections, care, qty })` | Línea de bolsa completa (ver 14.4), con su `availability`. |

**Disponibilidad por fechas.** En `data.js`, un producto anunciado lleva `availability: { preorder: '2026-10-16', release: '2026-10-23' }` (días locales; sin `status` ni `label`). `catalog.availability(p)` compara con `catalog.today()`:

| Hoy | `status` | `title` | `label` | `canBuy` | `cta()` |
| --- | --- | --- | --- | --- | --- |
| antes de `preorder` | `'proximamente'` | Próximamente | «Reserva a partir del 16 de octubre» | `false` | Configurar |
| de `preorder` a la víspera de `release` | `'reserva'` | Reserva | «Entregas a partir del 23 de octubre» | `true` | Reservar |
| desde `release`, o sin `availability` | `'disponible'` | Disponible | `''` | `true` | Comprar |

`text` = `title + ' · ' + label` («Próximamente · Reserva a partir del 16 de octubre»), o `''` si está disponible: es lo que enseñan la tarjeta de modelo, la tabla comparativa y el buscador. `html` y `labelHtml` son `text` y `label` ya escapados, con la fecha dentro de `<time datetime="AAAA-MM-DD">` (se ven igual): úsalos al pintar con `innerHTML` (la tarjeta, la tabla, el buscador, inicio, auraPad, auraBook, comparar, comprar y la bolsa lo hacen) y `text` para `textContent`, `aria-label` o avisos. `preorder` / `release` vuelven como `'AAAA-MM-DD'` (o `''`); dales formato con `fmt.diaMes` o `fmt.fecha`. El 3 de octubre de 2026 el auraPhone Duo está en `proximamente`; pasa solo a `reserva` el 16 y a `disponible` el 23.

Cómo usarlo en las páginas:

```js
var a = AURA.catalog.availability(producto);
if (a.status !== 'disponible') { aviso.textContent = a.text; }       // «Próximamente · Reserva a partir del 16 de octubre»
botonAnadir.hidden = !a.canBuy;                                        // proximamente: se configura, no se añade
if (a.status === 'reserva') { entrega.textContent = 'Entrega a partir del ' + AURA.fmt.diaMes(a.release); }
```

**`?hoy=AAAA-MM-DD`** (solo para pruebas y demostraciones): `comprar.html?producto=auraphone-duo&hoy=2026-10-20` simula ese día en esa página (reserva abierta). Se lee al cargar el núcleo, así que sobrevive a un `history.replaceState` de la página, y no se guarda; los enlaces de producto (`catalog.url`) y los que pasen por `catalog.withHoy` lo conservan, así que una prueba hecha en inicio, auraphone o comparar sigue en comprar, bolsa y checkout. Con `?hoy=`, `orders.create()` fecha el pedido ese día (a la hora actual). Usa siempre `catalog.today()` (no `new Date()`) en lo que dependa del día (fechas de entrega, avisos), para que la simulación sea coherente.

```js
// comprar.html — esqueleto del configurador
var id = new URLSearchParams(window.location.search).get('producto');
var producto = AURA.catalog.product(id) || AURA.catalog.products('auraphone')[0];
AURA.header.setActive(producto.family);

var estado = AURA.catalog.defaults(producto);        // { colorId, selections }
estado.care = false;

function alCambiar(grupo, opcion) {
  estado.selections[grupo] = opcion;
  estado.selections = AURA.catalog.resolve(producto, estado.selections);   // respeta `requires`
  var unidad = AURA.catalog.price(producto, estado.selections) + (estado.care ? AURA.catalog.carePrice(producto) : 0);
  precio.textContent = AURA.fmt.eur(unidad);
  cuota.textContent = 'o ' + AURA.fmt.mes(unidad) + ' durante ' + AURA.data.financing.months + ' meses';
}

var vistas = [], actual = 0;

function alCambiarColor(colorId) {
  estado.colorId = colorId;
  vistas = AURA.catalog.views(producto, colorId);                         // [{ slot, vista, label, aria, alt, exact, color, fallback }]
  actual = 0;                                                             // otro acabado: desde la primera vista
  pintarMiniaturas(vistas);                                               // un <button aria-pressed> por vista, con {aria} en texto oculto
  mostrar(0);
  var color = AURA.catalog.color(producto, colorId);
  var v = vistas[0];
  nota.hidden = !v || v.exact || !v.color;                                // «Imagen en azul glacial · Tu acabado: negro»
  if (!nota.hidden) { nota.textContent = 'Imagen en ' + v.color.name + ' · Tu acabado: ' + color.name; }
}

function mostrar(i) {
  var v = vistas[i];
  if (!v) { return; }
  actual = i;
  AURA.ui.gallery(galeria).show(v.slot, { fallback: v.fallback, alt: v.alt });   // mismo hueco → solo cambia el alt
}
```

### 14.4 `AURA.bag`

Línea: `{ lineId, productId, name, colorId, colorName, selections, optionLabels: […], care, unitPrice, qty, image, availability }` (`availability` = `catalog.availability(producto)`, recalculada cada vez que se lee la bolsa).

| Función | Notas |
| --- | --- |
| `items()` | Copia de las líneas. |
| `count()` · `subtotal()` | Suma de cantidades · suma de `unitPrice × qty`. |
| `add(linea)` | Basta con `{ productId, colorId, selections, care, qty }`: el resto se rellena desde el catálogo. Si ya hay una línea idéntica (mismo producto, color, opciones y AuraCare+) se suma la cantidad. Devuelve la línea resultante, o **`null`** si el producto no existe o **aún no se puede comprar ni reservar** (`availability.canBuy === false`): no añade nada. |
| `setQty(lineId, qty)` | Entre 1 y `bag.maxQty` (99). Para quitar, usa `remove`. |
| `remove(lineId)` | Devuelve la línea eliminada (para «Deshacer»). |
| `restore(linea, index)` | La devuelve a su sitio. `index` es opcional: se recuerda la posición que tenía. |
| `clear()` | Vacía la bolsa. |

**Reservas.** Una línea con `availability.status === 'reserva'` es una reserva: se paga igual, pero se entrega en `availability.release` (la bolsa y el checkout lo dicen y fijan esa fecha). Una línea con `canBuy === false` (solo puede existir si se añadió simulando otro día con `?hoy=`) no se puede pedir: la página la marca y no deja tramitar hasta quitarla. `restore()` (deshacer) la devuelve aunque no se pueda comprar.

**El nombre, las etiquetas y `unitPrice` salen siempre del catálogo** (precio de la configuración + AuraCare+ si `care`): no hace falta calcularlos, y no se pueden falsear desde la página. Un producto que no está en el catálogo no entra (`add` devuelve `null`) y, al leer la bolsa, se descartan las líneas de modelos que ya no existen (p. ej. al renovar «los tres mejores» en `data.js`): nunca cuentan en el total. Sin catálogo (si `data.js` no cargara) la bolsa se lee vacía, pero lo guardado no se borra mientras nadie la modifique.

```js
// Añadir desde el configurador (respuesta de «completado» con acción)
var linea = AURA.bag.add({ productId: producto.id, colorId: estado.colorId, selections: estado.selections, care: estado.care, qty: 1 });
AURA.ui.toast({
  kind: 'ok', title: 'Añadido a la bolsa', text: linea.name + ' · ' + linea.colorName,
  action: { label: 'Ver bolsa', onClick: function () { window.location.href = 'bolsa.html'; } }
});

// Eliminar sin confirmación, con «Deshacer»
var quitada = AURA.bag.remove(lineId);
AURA.ui.toast({
  kind: 'warn', title: 'Artículo eliminado', text: quitada.name + ' ya no está en tu bolsa.',
  action: { label: 'Deshacer', onClick: function () { AURA.bag.restore(quitada); } }
});
```

### 14.5 `AURA.auth`

Simulado en este navegador. La contraseña nunca se guarda: solo `SHA-256(sal + ':' + contraseña)` con una sal aleatoria por usuario (`crypto.subtle`, o una implementación propia idéntica si no existe).

| Función | Devuelve |
| --- | --- |
| `user()` | `{ nombre, apellidos, email, creado, remember, desde }` o `null`. `creado`: fecha de alta (ISO) → «Miembro desde octubre de 2026». `remember`: `true` si la sesión se mantiene en este dispositivo, `false` si dura lo que la pestaña. `desde`: inicio de la sesión (ISO). Nunca la contraseña, la sal ni la huella. Los eventos `aura:auth` llevan el mismo objeto. |
| `register({ nombre, apellidos, email, password, remember })` | `Promise<{ ok, error, field, code, user }>`. Inicia sesión al terminar. `code`: `required`, `email`, `password`, `exists`. |
| `login(email, password, { remember })` | `Promise<{ ok, error, user }>`. `remember: false` → la sesión dura lo que la pestaña. El error no dice cuál de los dos datos falla. |
| `logout()` | Cierra la sesión. |
| `update({ nombre, apellidos })` | `Promise<{ ok, error, field, user }>`. |
| `remove()` | Borra el ID actual y sus pedidos. Irreversible: pide confirmación antes. |

```js
// registro.html
var f = AURA.ui.form('#registro', {
  nombre: { required: 'Escribe tu nombre.' },
  apellidos: { required: 'Escribe tus apellidos.' },
  email: { required: 'Escribe tu correo.', email: true },
  password: { required: true, minLength: 8, custom: function (v) {
    var r = AURA.ui.passwordRules(v);
    return r.upper && r.number ? true : 'Añade una mayúscula y un número.';
  } },
  password2: { required: true, match: { field: 'password', message: 'Las contraseñas no coinciden.' } }
}, {
  onSubmit: function (v, e, form) {
    var listo = AURA.ui.busy(form.form.querySelector('[type="submit"]'), 'Creando tu ID…');
    AURA.auth.register(v).then(function (r) {
      listo();
      if (!r.ok) { if (r.field) { form.setError(r.field, r.error); } else { AURA.ui.toast({ kind: 'error', title: r.error }); } return; }
      window.location.href = 'cuenta.html';
    });
  }
});
```

### 14.6 `AURA.orders` y `AURA.tradeIn`

| Función | Notas |
| --- | --- |
| `orders.create(pedido)` | Guarda el pedido y lo devuelve con `id` (`AU-2026-000123`), `fecha` (ISO; con `?hoy=`, ese día), `estado` y `owner`. **Los datos de tarjeta se descartan antes de guardar**: (1) toda clave que contenga `tarjeta`, `card`, `cvv`, `cvc`, `csc`, `caducidad`, `expir`, `vencim`, `iban` o acabe en `pan` (salvo `metodo`, `marca`, `ultimos4`/`last4`): no uses esas palabras en claves que no sean de pago (p. ej. un código regalo va en `regalo`, no en `tarjetaRegalo`); (2) toda **cadena** de 13–19 cifras (admite espacios y guiones) que pase el dígito de control de Luhn. Los **números** de JS (importes, marcas de tiempo en ms como `Date.now()`) y las cadenas que no pasan Luhn se conservan. Guarda como mucho `pago: { metodo: 'tarjeta', ultimos4: '4242' }`. |
| `orders.list()` | Pedidos del usuario actual (o los hechos como invitado si no hay sesión), del más reciente al más antiguo. |
| `orders.get(id)` | El pedido, si es del usuario actual o se hizo como invitado. |
| `tradeIn.estimate(deviceId, conditionId)` | Euros: `max × factor`, como mucho `tradeIn.cap`. |
| `tradeIn.cap` | Tope por dispositivo: `data.tradeIn.cap` (800). Propiedad de solo lectura, siempre al día con `data.js`. |
| `tradeIn.max(familia?)` | El mejor valor posible (el dispositivo que más vale, en el mejor estado, con el tope): la cifra de «hasta X €» (800). Con un id de familia, solo entre sus dispositivos (`max('aurapad')` → 640). |
| `tradeIn.set({ deviceId, conditionId, value })` | Guarda el crédito (si el dispositivo está en el catálogo, el valor se recalcula). Devuelve `{ deviceId, conditionId, value, deviceName, conditionLabel }`. |
| `tradeIn.get()` · `tradeIn.clear()` | El crédito guardado o `null`. El valor nunca sale tal cual de `localStorage`: si el dispositivo y el estado están en el catálogo se recalcula con `estimate()`; si no, se le aplica el tope. |
| `tradeIn.discount(subtotal)` | Descuento aplicable (nunca mayor que el subtotal). |

```js
// checkout.html
var subtotal = AURA.bag.subtotal();
var descuento = AURA.tradeIn.discount(subtotal);
var pedido = AURA.orders.create({
  items: AURA.bag.items(), subtotal: subtotal, descuento: descuento, total: subtotal - descuento,
  envio: { nombre: v.nombre, direccion: v.direccion, cp: v.cp, ciudad: v.ciudad },
  pago: { metodo: 'tarjeta', ultimos4: v.tarjeta.replace(/\D/g, '').slice(-4) }
});
AURA.bag.clear();
AURA.tradeIn.clear();
```

### 14.7 `AURA.slots`, `AURA.html`, `AURA.header`, `AURA.search`

| Función | Notas |
| --- | --- |
| `AURA.html.img(nombre, { alt, fallback, width, height, eager, priority, className, sizes, srcset })` | Cadena con el `<img class="aura-img" src="assets/img/NOMBRE.webp" …>` exacto del sistema (1600 × 1200, `loading="lazy"` y `decoding="async"` por defecto). `eager`: sin carga diferida; `priority`: la del primer héroe (`loading="eager" fetchpriority="high"`). v2.0: con `srcset` de 400, 800 y 1600 px (`img/400/`, `img/800/`) y `sizes` (el ancho del hueco; por defecto `100vw`, con `auto` delante si es perezosa); `srcset: false`, solo el original (§1). |
| `AURA.html.productCard(producto, { heading, colorId, eager })` | Cadena con la tarjeta de modelo de [§12.4](#124-tarjetas-de-data-aura-lineup) (la de `[data-aura-lineup]`), con estado y botón según la disponibilidad y la vista de tarjeta de ese acabado. `heading`: `'h3'` por defecto. `eager: true` en las tarjetas de la primera pantalla (la imagen LCP no va diferida: bolsa y checkout vacíos). `''` si el producto no existe. Para carruseles o rejillas propias: `pista.innerHTML = productos.map(function (p) { return '<li class="aura-carousel__slide">' + AURA.html.productCard(p) + '</li>'; }).join('')`. |
| `AURA.html.esc(texto)` | Escapa para `innerHTML` o atributos. |
| `AURA.html.storePerks(familia?, { heading })` · `AURA.html.familyCard(familia, { heading, href })` | Los bloques de tienda de [§12.9](#129-bloques-de-tienda) (los pintan `data-aura-perks` y `data-aura-family-cards`). |
| `AURA.legal.text(clave)` · `AURA.legal.fill(raíz)` | Textos comunes de las notas al pie (§6): `precios`, `financiacion`, `tradein`, `reservas`, `envio`, `cifras`, `demo`. `fill` rellena los `[data-aura-legal]` (se hace solo al cargar y con el HTML que se inserte después). |
| `AURA.footer.setCrumbs([{ label, href }, …, 'Actual'])` | Escribe el atributo `crumbs` de `<aura-footer>` (y lo repinta). Devuelve la cadena. `AURA.footer.parse(cadena)` → `[{ label, href }]`. |
| `AURA.util.parseDate(valor)` · `AURA.util.isoDate(fecha)` | Fecha local (ver 14.2). |
| `AURA.slots.set(el, nombre, { fallback, alt })` | Cambia la imagen de un hueco (pide `nombre.webp`; si es la misma ruta, no la vuelve a pedir). `el` puede ser el `<img>` o el marcador `.aura-slot` que lo sustituyó; devuelve el `<img>`. No guardes la referencia: vuelve a buscar `'.aura-img, .aura-slot'` cada vez. |
| `AURA.slots.scan(raíz)` | Revisa imágenes que ya hubieran fallado y marca su estado de aparición (`.is-pending` / `.is-loaded`); se hace solo al cargar y con el HTML nuevo. |
| `AURA.header.setActive(clave)` · `AURA.header.refresh()` | Cambia el enlace activo · repinta cuenta y bolsa. |
| `AURA.header.ribbonText()` | El texto de la cinta de Trade In, calculado desde el catálogo (cifra y familias). |
| `AURA.search.query(texto)` · `.html(texto)` · `.status(texto)` | Lógica del buscador (sin acentos ni mayúsculas). |

### 14.8 `AURA.ui`: física

```js
var muelle = AURA.ui.spring({
  from: 0, to: 100,            // valor inicial y objetivo
  velocity: 0,                 // unidades por segundo
  damping: 1, response: 0.35,  // por defecto: crítico, sin rebote
  precision: 0.01,             // umbral de reposo (usa ~0.2 si animas píxeles)
  onUpdate: function (valor, m) { el.style.transform = 'translate3d(' + valor + 'px, 0, 0)'; },
  onRest: function (valor, m) {}
});
muelle.setTarget(250);                                              // nuevo objetivo; CONSERVA la velocidad
muelle.setTarget(0, { velocity: 1800, damping: 0.8, response: 0.3 }); // cesión de la velocidad de un gesto
muelle.stop();     // se queda donde está (value y velocity intactos): para agarrar en pleno vuelo
muelle.jump(40);   // coloca sin animar (reducir movimiento, redimensionado)
muelle.value; muelle.velocity; muelle.target; muelle.running;
```

- `damping` = razón de amortiguamiento (1 = sin rebote; 0.8 = rebote leve, **solo si el gesto llevaba impulso**). `response` en segundos (no es una duración). Internamente: rigidez `(2π/response)²`, amortiguación `4π·damping/response`, masa 1. En cada fotograma de `requestAnimationFrame` avanza exactamente el tiempo transcurrido con la **solución analítica** del oscilador amortiguado (casos ζ < 1, ζ = 1 y ζ > 1), así que no hay error de integración: con 0.8 / 0.3 el rebote es el 1,52 % exacto.
- Con `to === from` y sin velocidad no arranca solo; `autoStart: false` lo deja siempre parado hasta el primer `setTarget`.
- Mientras está parado puedes escribir `muelle.value` (p. ej. la posición del dedo) antes de `setTarget`.
- `AURA.ui.project(velocidad, decelerationRate = 0.998)` → px que seguiría avanzando un gesto soltado a esa velocidad (px/s). Destino = punto de ajuste más cercano a `posición + project(velocidad)`. Para lo que encaja por puntos (carrusel, segmentado) usa la deceleración ágil `0.99`.
- El reloj del muelle es el de `requestAnimationFrame` entre fotogramas y, en el primero tras `setTarget`, el tiempo real transcurrido desde que se soltó, **pero nunca menos de un fotograma** (la media móvil del intervalo entre fotogramas: 60 Hz, 120 Hz…). El navegador entrega `pointerup` al principio del fotograma y el primer tick corre ~1 ms después: con solo ese milisegundo la hoja avanzaba la sexta parte de lo que llevaba el dedo y se veía un frenazo en la costura (v1.4). Antes aún, el dt salía negativo y se recortaba a 0. La velocidad de un gesto sale de la hora de cada `pointermove` (`event.timeStamp`), no de cuándo corre el manejador.
- `AURA.ui.rubberband(exceso, dimension, constante = 0.55)` → desplazamiento visible para un exceso más allá del límite.
- `AURA.ui.reducedMotion()` → `true` si el usuario pide menos movimiento: usa `muelle.jump(destino)` en lugar de `setTarget`.

En `componentes.html` (§08, «Muelle interrumpible») hay un ejemplo completo de arrastre con cesión de velocidad.

### 14.9 `AURA.ui`: componentes

| Función | Notas |
| --- | --- |
| `ui.toast({ title, text, kind, action: { label, onClick }, duration })` | `kind`: `status` (por defecto), `ok`, `warn`, `error`. Devuelve `{ el, close }`. 5 s (8 s con acción); los `error` no se cierran solos; `duration: 0` = fijo. También `ui.toast('Texto')`. |
| `ui.form(form, reglas, { onSubmit })` | Ver 14.10. |
| `ui.busy(boton, 'Procesando…')` | Pone el botón en carga (`.is-loading`, spinner, `aria-busy` y `aria-disabled`) y devuelve la función que lo restaura. Mientras dura, **ni el botón ni su formulario se pueden volver a activar**: un guardia en captura cancela el `submit` de ese formulario (Intro en un campo, `requestSubmit()`) y los `click` del botón, antes que cualquier listener de la página. No hacen falta banderas propias. |
| `ui.sheet(id \| el)` | `{ open(disparador), close(), toggle(), isOpen(), el }`. |
| `ui.segmented(el)` | Inicializa a mano la pastilla deslizante de un `.aura-segmented` (es automático) o, si ya lo está, la recoloca en el ítem elegido. Devuelve `{ el, sync(animar = true) }`. No hace falta tras `input.checked = …`: la pastilla ya lo sigue. |
| `ui.gallery(el)` | `{ show(slot, { fallback, alt, priority }), el }`: fundido cruzado de la galería del configurador (§8). |
| `ui.scrub(el)` | `{ progress(), frame(), frames(), loaded(), mode(), refresh(), el }`: escena con scroll (§10 bis). Automática con `data-aura-scrub`. |
| `ui.colorway(el)` | `{ color(), set(colorId), el }`: exhibición de color (§8). Automática con `data-aura-colorway`. |
| `ui.haptic('exito' \| 'error' \| 'ajuste')` | Vibración corta (12 ms · 10-60-10 ms · 8 ms) solo en pantallas táctiles con la API (`navigator.vibrate`); devuelve `true` si vibró. Llámalo en el mismo tick que el cambio visual (el aviso, el error pintado). `ui.form` ya la usa al rechazar un envío. No en carrusel, hoja ni navegación. |
| `ui.carousel(el \| selector)` | `{ goTo(i, { immediate }), next(), prev(), refresh(), index(), count(), el }`. |
| `ui.popover.open(id \| el, disparador)` · `.close()` · `.isOpen(id)` | Uno abierto a la vez. |
| `ui.search.open()` / `.close()` · `ui.menu.open()` / `.close()` | El menú solo se abre por debajo de 992 px. |
| `ui.lineup(el, familia)` · `ui.compare(el, familia)` | Repintan las tarjetas o la tabla (p. ej. al cambiar de familia en `comparar.html`). |
| `ui.reveal(raíz)` · `ui.init(raíz)` | Observan / inicializan contenido nuevo (normalmente no hace falta: es automático). |
| `ui.passwordRules(valor, min = 8)` | `{ length, upper, lower, number, symbol }`. |
| `ui.fixInches(raíz)` | Envuelve cada `″` de los textos con Kanit o mono en `.aura-inch` (Inter). Automático al cargar y con el contenido nuevo. |

Atributos que `aura-ui.js` atiende por delegación (no hay que inicializar nada):

| Atributo | En | Efecto |
| --- | --- | --- |
| `data-aura-carousel` | raíz del carrusel | §12.8. |
| `data-aura-sheet` | `.aura-sheet` | §12.7. |
| `data-aura-sheet-open="ID"` · `data-aura-sheet-close` | botones | Abre / cierra la hoja. |
| `data-aura-popover-toggle="ID"` | botón | Alterna el popover. |
| `data-aura-search-open` · `data-aura-search-close` | botones | Buscador. |
| `data-aura-menu-open` · `data-aura-menu-close` | botones | Menú móvil. |
| `data-aura-reveal` (`""`, `fade`, `scale`, `stat`) | cualquier elemento (`stat`: un `.aura-stat`) | Aparición al entrar en pantalla. |
| `data-aura-scrub` (+ `data-seq`, `data-frames`, `data-pattern`, `data-width`, `data-height`, `data-mobile`, `data-mobile-frames`, `data-length`, `data-fit`, `data-mobile-fit`, `data-focus`) | `section.aura-scrub` | Escena con scroll; sus textos llevan `data-from`, `data-to`, `data-pos` (§10 bis). |
| `data-aura-colorway="idDeProducto"` (+ `data-color`) | `.aura-colorway` | Exhibición de color (§8). |
| `data-aura-lineup="familia"` (+ `data-aura-heading="h2"`) | contenedor | Tres tarjetas de modelo. |
| `data-aura-compare="familia"` (+ `data-aura-compare-title`, `data-aura-heading`) | contenedor | Tabla comparativa. |
| `data-aura-localnav` | `.aura-localnav` | Marca el enlace de la sección visible y, mientras los enlaces no caben (por debajo de 992 px), los pliega en el menú del chevrón (que viene en el HTML con `.has-menu`, §4). |
| `data-aura-perks="familia"` · `data-aura-family-cards` · `data-aura-from="familia"` · `data-aura-buy="familia"` (+ `data-aura-buy-short`) | contenedor / texto / enlace | Bloques de tienda (§12.9). |
| `data-aura-legal="clave"` | `<li>` o `<span>` de una nota | Texto común de `AURA.legal`. |
| `data-aura-buybar="#selector"` | `.aura-buybar` | La esconde (`.is-hidden`) mientras ese elemento está a la vista. Sin valor, no hace nada. |
| `data-aura-password-toggle` | `.aura-field__toggle` | Mostrar / ocultar la contraseña. |
| `data-rule="length\|upper\|lower\|number\|symbol"` (+ `data-min`) | `.aura-rules__item` | Se marca `.is-met` mientras se escribe en el campo de su `.aura-field`. |
| `data-aura-stepper` (+ `data-min`, `data-max`) | `.aura-stepper` | Opcional: gestiona el valor y los `disabled`, y emite `aura:step`. Si el botón que se desactiva (el «−» al llegar al mínimo) tenía el foco, el foco pasa al otro antes: nunca cae a `<body>`. Sin el atributo, la lógica es de la página. |
| `data-aura-no-drag` | dentro de un carrusel o de una hoja | Esa zona no inicia el arrastre. |
| `data-aura-relocate` | barra fija propia de una página | La saca de `<main>` (justo detrás) al iniciar: no se recoloca cuando la página retrocede (§1). |

```js
// bolsa.html — cantidad con el stepper opcional
lista.addEventListener('aura:step', function (e) {
  var li = e.target.closest('[data-line-id]');
  AURA.bag.setQty(li.getAttribute('data-line-id'), e.detail.value);
});
```

### 14.10 `AURA.ui.form`

```js
var f = AURA.ui.form(formulario /* elemento, id o selector */, {
  email: { required: 'Escribe tu correo.', email: true },
  cp: { required: true, pattern: { value: /^\d{5}$/, message: 'El código postal tiene 5 cifras.' } },
  password: { required: true, minLength: 8 },
  password2: { match: 'password' },
  acepto: { required: 'Acepta las condiciones para continuar.' },
  telefono: { custom: function (valor, valores, form) { return /^\+?\d{9,}$/.test(valor) || 'Escribe un teléfono con 9 cifras.'; } }
}, {
  onSubmit: function (valores, evento, f) { /* solo se llama con el formulario válido */ }
});
```

- **No lee el marcado**: `required`, `pattern`, `minlength` o `type="email"` del HTML no se aplican solos. Declara la misma regla en los dos sitios (§15.5): el marcado la documenta y la anuncia el lector; `ui.form` la aplica con su mensaje. Si cambias una, cambia la otra.
- Las claves son los `name` de los campos. Cada regla admite el valor directo (`true`, `8`, `/re/`, `'campo'`) o `{ value, message }`; en `required` y `email` una cadena es el mensaje. `messages: { minLength: '…' }` cambia textos sueltos. `custom` devuelve `true` o el mensaje de error.
- Reglas: `required`, `email`, `minLength`, `maxLength`, `pattern`, `match`, `custom`. Un campo vacío y no obligatorio es siempre válido.
- Cuándo valida: mientras se escribe por primera vez no se señala el error (sí el acierto); al salir del campo (`focusout`) o al enviar aparece el error, y desde entonces se revalida en cada `input`. Casillas, radios y `<select>` se validan al cambiar. Si un campo tiene `match`, se revalida cuando cambia el otro.
- Qué pinta: la tabla de [§7](#campo) (`.is-invalid` / `.is-valid` en el contenedor del estado, `aria-invalid`, texto en `.aura-field__error`, que se crea si falta y se enlaza con `aria-describedby`). Casilla obligatoria como `acepto`: dentro de un `.aura-field` con su mensaje como hermano de la etiqueta; grupo de radios u opciones: dentro de un `.aura-fieldset` (marcado en [§7](#casilla-y-radio)). Sin esos contenedores también funciona (estado en la etiqueta y mensaje después de ella, o en el contenedor común del grupo), pero el marcado documentado es el recomendado.
- Al enviar con errores: `preventDefault()`, el foco va al primer campo inválido y los `submit` que añadas **después** de `ui.form` no se ejecutan. Con `onSubmit`, el envío nativo se cancela siempre (sitio estático).
- Devuelve `{ form, validate(), validateField(name), values(), setError(name, mensaje), clear(name?) }`. `setError` sirve para errores que no salen de las reglas («ese correo ya tiene un ID de AURA»).
- `values()` → `{ name: valor }` (casilla suelta → `true`/`false`; grupo de casillas → array; radios → el valor marcado). Como el envío nativo, no incluye los campos que no cuentan (abajo).
- **Campos que no cuentan**: un control `disabled` (también por estar dentro de un `<fieldset disabled>`) o dentro de un elemento con `hidden` o `inert` no se valida, no sale en `values()` y, al validar, se le quita cualquier error pendiente. Sus reglas se declaran igual, una sola vez.

**Campos condicionales** (dirección solo con envío a domicilio, datos de tarjeta solo con pago con tarjeta): deja el bloque en el DOM y ocúltalo con `hidden` cuando no aplique. No hace falta sacarlo del formulario ni cambiar las reglas.

```html
<fieldset class="aura-fieldset">
  <legend class="aura-legend aura-legend--sm">Entrega</legend>
  <label class="aura-radio"><input class="aura-radio__input" type="radio" name="entrega" value="casa" checked> … A domicilio</label>
  <label class="aura-radio"><input class="aura-radio__input" type="radio" name="entrega" value="tienda"> … Recoger en tienda</label>
</fieldset>
<fieldset class="aura-fieldset" id="bloque-direccion">
  <legend class="aura-legend">Dirección de envío</legend>
  <div class="aura-field"> … name="direccion" … </div>
  <div class="aura-field"> … name="cp" … </div>
</fieldset>
```

```js
var f = AURA.ui.form('#pedido', {
  direccion: { required: 'Escribe la dirección de envío.' },
  cp: { required: true, pattern: { value: /^\d{5}$/, message: 'El código postal tiene 5 cifras.' } }
}, { onSubmit: function (v) { /* v.direccion solo existe si se envía a domicilio */ } });

f.form.addEventListener('change', function (e) {
  if (e.target.name !== 'entrega') { return; }
  document.getElementById('bloque-direccion').hidden = e.target.value !== 'casa';
  // Al ocultarlo, validate() ya no lo comprueba y limpia sus errores. Para limpiarlos en el acto: f.clear('direccion'); f.clear('cp');
});
```

### 14.11 Diferencias respecto al contrato inicial

- `catalog.defaults()` devuelve `{ colorId, selections }` (no un objeto plano); `catalog.price()` acepta ambos.
- `bag.add()` rellena y **recalcula** `name`, `optionLabels` y `unitPrice` desde el catálogo; un producto que no está en el catálogo no entra y las líneas de modelos retirados se descartan al leer.
- `catalog.price()` y `catalog.optionLabels()` resuelven antes las dependencias (`requires`).
- Evento nuevo `aura:storage` (almacén lleno a mitad de sesión).
- `bag.setQty()` no baja de 1 (no elimina); `bag.restore()` admite omitir el índice.
- Carrusel y hoja capturan el puntero al reconocer el arrastre (10 px), no en `pointerdown`, salvo cuando se agarran en pleno vuelo.
- Hoja: el foco entra al abrir y vuelve al disparador al pedir el cierre, sin esperar al muelle.
- Añadidos: `catalog.resolve/choices/optionLabels/color/carePrice/image/cta/url/line`, `auth.update/remove`, `tradeIn.estimate/discount`, `fmt.num/articulos/fecha`, `AURA.slots`, `AURA.html`, `AURA.header`, `AURA.search`, `ui.busy`, `ui.passwordRules`, `ui.popover`, `ui.search`, `ui.menu`, `ui.init`, `ui.lineup`, `ui.compare`, `data-aura-stepper`, `data-aura-buybar="#selector"`, `data-aura-no-drag`.
- v2.0: `catalog.views()` y `catalog.image(p, color, vista)` (galería por color, `photos` en `data.js`); `html.img({ sizes, srcset })` con variantes de 400 y 800 px; `html.productCard({ eager })` y `html.familyCard({ eager })`; `header.ribbonShortText()`; `html.aura-has-session` antes del primer pintado; la escena decodifica sus fotogramas fuera del hilo principal por http(s); `SCRUB_FADE_PX` (fundido de 150 px).
- v1.6: `ui.scrub` y `[data-aura-scrub]` (escena con scroll), `ui.colorway` y `[data-aura-colorway]` con el evento `aura:colorway`, `data-aura-reveal="stat"`.
- v1.3: `catalog.image()` con `exact`, `color` y `alt`; `catalog.defaults()` / `catalog.color()` con el acabado de la foto; `html.img({ priority })`; huecos en `.webp`; `ui.haptic`; `ui.segmented`; avisos que se apartan con el dedo; hojas y barras de compra fuera de `<main>`; `--buybar-h`.
- v1.2: `fmt.dia`, `fmt.units` y fechas con espacios indivisibles; `catalog.entry` y `catalog.withHoy` (`url` conserva `?hoy`); `orders.create` con el día simulado; `tradeIn.get` validado; `AURA.legal`; `html.storePerks` y `html.familyCard` con sus atributos; `ui.fixInches`; menú plegable de la barra local; ancla dentro de un carrusel; `role="region"` automático.
- v1.1: `catalog.today/availability`; `catalog.cta()` con «Configurar»; `bag.add()` rechaza lo que aún no se puede comprar; `line.availability`; `fmt.diaMes` y fechas `AAAA-MM-DD` locales; `util.parseDate/isoDate`; `tradeIn.max()` y `tradeIn.cap` desde `data.js`; `auth.user()` con `creado`, `remember` y `desde`; `html.productCard`; `AURA.footer.setCrumbs/parse` y `crumbs` multinivel; `ui.form` con campos condicionales; `ui.busy` que bloquea el reenvío; el stepper conserva el foco; contador del carrusel.

### 14.12 Datos del catálogo (`data.js`) que usa el sistema

| Campo | Uso |
| --- | --- |
| `updated` | Fecha de la revisión (`'AAAA-MM-DD'`, día local): `AURA.fmt.fecha(AURA.data.updated)`. |
| `financing.months` | Meses de financiación de `fmt.mes`. |
| `shipping: { standard, express }` | Envío en euros: estándar `0` (gratis) y exprés `9.95`. El checkout lo lee de `AURA.data.shipping`; no escribas el importe en la página. |
| `families[]` | `id`, `name`, `page`, `os`, `tagline`, `description`, `compareRows` (la fila `precio` la calcula el sistema) y `plural` (opcional, v1.7: `true` en auraPods). Ids: `auraphone`, `aurapad`, `aurabook`, `aurapods`. |
| `products[]` | `id`, `family`, `rank`, `name`, `badge`, `tagline`, `description`, `basePrice`, `availability: { preorder, release }` (opcional), `colors`, `options`, `specs` (sin `precio`), `highlights`, `image`, `imageColor` (id del acabado por defecto, el que se ve en la foto de tarjeta; `''` si no se aprecia), `imageAlt` (alt de la foto real), `photos` (v2.0, galería por color: `{ idDeColor: [{ slot, vista, alt }, …] }`, en el orden de su tipo; la primera es la de tarjeta) e `imageVariants` (opcional, solo en productos sin `photos`: `{ idDeColor: alt }`). `image`, `imageColor` e `imageAlt` se quedan como respaldo. |
| Bloque `FOTOS` | Al final de `data.js`, entre `/* FOTOS:INICIO */` y `/* FOTOS:FIN */`: rellena `photos` (y el `imageColor` que tenga foto) a partir de los manifiestos de las fotos igualadas. Es **generado**: no se edita a mano; se vuelve a generar cuando cambian las fotos. |
| `care` | `name`, `description`, `prices` por familia. |
| `tradeIn.cap` | Tope por dispositivo (800). |
| `tradeIn.conditions[]` | `id`, `label`, `factor` y `description` (texto para el radio de cada estado). |
| `tradeIn.devices[]` | `id`, `family`, `name`, `max`. |

---

## 15. Accesibilidad y metadatos (temario DIW)

Lo que pide el temario de «Desarrollo de Interfaces Web» (HTML temas 1, 3, 4, 5, 6, 8 y 9; Elementos de una web; Accesibilidad temas 1 y 2; Tailwind tema 10), aplicado a AURA. Es la **lista que debe cumplir cualquier página nueva** antes de publicarse. Lo que pintan `aura-core.js` y `aura-ui.js` (cabecera, menú, pie, migas, tablas de `[data-aura-compare]`, avisos, hojas) ya cumple: la página responde de su propio marcado.

### 15.1 `<head>` completo y comentado

Plantilla para una página de `html/` (en `index.html`, las rutas sin `../`). Cada bloque con un comentario breve que diga para qué sirve; el orden es técnica → SEO → redes sociales → identidad → estilos → scripts.

```html
<!doctype html>
<html lang="es" data-bs-theme="dark">
<head>
  <!-- Técnica: codificación y ventana adaptable al móvil -->
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">

  <!-- SEO: título (40–65 caracteres, «… — AURA»), descripción (120–160), autoría, palabras clave, indexación y URL canónica -->
  <title>auraPhone: modelos, precios y especificaciones — AURA</title>
  <meta name="description" content="Una o dos frases propias de esta página, entre 120 y 160 caracteres: qué se encuentra en ella y qué se puede hacer (comparar, configurar, comprar).">
  <meta name="author" content="AURA">
  <meta name="keywords" content="auraPhone, auraPhone 18 Pro, móvil plegable, comprar auraPhone">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://aura-lyart-beta.vercel.app/html/auraphone.html">

  <!-- Redes sociales: Open Graph (Facebook, LinkedIn, WhatsApp) y tarjeta de Twitter / X -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="AURA">
  <meta property="og:locale" content="es_ES">
  <meta property="og:title" content="auraPhone: modelos, precios y especificaciones — AURA">
  <meta property="og:description" content="La misma descripción o una versión más corta.">
  <meta property="og:url" content="https://aura-lyart-beta.vercel.app/html/auraphone.html">
  <meta property="og:image" content="https://aura-lyart-beta.vercel.app/img/og/og-auraphone.jpg">
  <meta property="og:image:alt" content="Qué se ve en la imagen, como un alt.">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="auraPhone: modelos, precios y especificaciones — AURA">
  <meta name="twitter:description" content="La misma descripción o una versión más corta.">
  <meta name="twitter:image" content="https://aura-lyart-beta.vercel.app/img/og/og-auraphone.jpg">

  <!-- Identidad: color de la interfaz del navegador, favicon e icono de acceso directo -->
  <meta name="theme-color" content="#000000">
  <link rel="icon" href="../favicon.ico" sizes="any">
  <link rel="icon" type="image/png" href="../img/aura.png">
  <link rel="apple-touch-icon" href="../img/apple-touch-icon.png">

  <!-- Estilos: fuentes, Bootstrap 5.3 y sus iconos, sistema AURA y la hoja de la página (en este orden) -->
  <!-- … -->

  <!-- Catálogo y núcleo, síncronos: pintan <aura-header> y <aura-footer> sin parpadeo -->
  <script src="../js/data.js"></script>
  <script src="../js/aura-core.js"></script>
</head>
```

- [ ] `lang="es"` en `<html>`; `<meta charset>` y `viewport` los primeros.
- [ ] `<title>` único, de **40 a 65 caracteres**, que diga qué es la página y termine en « — AURA» (nunca «Inicio» ni solo el nombre). Si el JS cambia lo que muestra la página (`comparar.html?familia=`, `comprar.html?producto=`, los pasos del checkout), actualiza `document.title` con las mismas reglas.
- [ ] `description` única, de **120 a 160 caracteres**, escrita como frase (no una lista de palabras clave). `author` y `keywords` presentes.
- [ ] `robots`: `index, follow` en las páginas públicas; `noindex, follow` en las que no deben salir en un buscador (bolsa, tramitar pedido, cuenta, inicio de sesión, registro y la guía de componentes).
- [ ] `canonical` y `og:url`: la URL **absoluta** de producción de esa página, sin parámetros de prueba (`?hoy=`, `?familia=`).
- [ ] Open Graph completo (`og:type`, `og:site_name`, `og:locale`, `og:title`, `og:description`, `og:url`, `og:image` absoluta con `og:image:alt`) y `twitter:card` con su título, descripción e imagen. Las imágenes para redes, en `img/og/` (1200 × 630 px).
- [ ] Favicon y `apple-touch-icon` (nombre técnico del estándar; no aparece en ningún texto). `theme-color` negro.
- [ ] Ni en el título ni en los metadatos aparecen la marca original ni sus productos: auraPhone, auraPad, auraBook, auraOS.

### 15.2 Estructura y semántica

- [ ] `<!doctype html>`, etiquetas en minúscula, cerradas y bien indentadas; comentarios que separen los bloques grandes del `<main>`.
- [ ] Orden del `<body>`: `<a class="aura-skip" href="#contenido">Saltar al contenido</a>` → `<aura-header>` (pinta `header` y `nav`) → **un solo** `<main id="contenido">` → `<aura-footer>` (pinta `footer`, migas y directorio).
- [ ] Cada bloque temático es un `<section aria-labelledby="ID-del-h2">`; el contenido que se entiende solo (tarjeta de modelo, noticia, puesto de empleo) es `<article>`; lo complementario, `<aside>`. `<div>` solo para maquetar.
- [ ] **Un único `h1`** y jerarquía sin saltos (h1 → h2 → h3…). El nivel lo da la estructura y el tamaño la clase (un `h3` puede llevar `.aura-h4`); `data-aura-heading="h4"` en `[data-aura-lineup]` / `[data-aura-compare]` para encajar las piezas generadas.
- [ ] Listas con su significado: `ul` (enlaces, ventajas), `ol` (pasos, notas, migas), `dl` (pares término / valor, como especificaciones o datos de un pedido).
- [ ] Cada `nav` tiene un nombre propio con `aria-label` («Principal», «Migas de pan», «Pie de página», el de la barra local con el nombre de la familia…).

### 15.3 Enlaces e imágenes

- [ ] El texto del enlace dice adónde lleva («Ver auraPhone», «Comparar todos los modelos»); nunca «aquí», «más» ni «haz clic». Si el texto visible se repite con destinos distintos («Comprar», «Más información»), se completa con un `<span class="visually-hidden">` dentro del enlace (`Comprar<span class="visually-hidden"> auraPhone 18 Pro</span>`), no con `aria-label` (v2.1: TAW, H30, solo lee el texto).
- [ ] **Ningún enlace ni botón sin texto** (v2.1, F89): el de solo icono lleva su nombre en `.visually-hidden`, y una imagen enlazada, un `alt` con el destino. Una foto junto al nombre que ya enlaza no es otro enlace: la tarjeta entera se pulsa con el enlace estirado del nombre (§6). Dos enlaces seguidos nunca van al mismo destino (H2).
- [ ] `title` solo cuando añade información que el texto no da (un icono sin texto a la vista, una palabra técnica o en inglés, el destino del logotipo); nunca repite el texto visible. En un control de solo icono, `title` es el texto emergente que ve quien usa el ratón y puede coincidir con su texto oculto: el nombre accesible sale del texto y el `title` queda como descripción, que NVDA y JAWS no repiten si es igual al nombre.
- [ ] Rutas relativas dentro del sitio y absolutas hacia fuera; ningún `href="#"` ni enlace roto. Un enlace externo que abre pestaña nueva lleva `target="_blank" rel="noopener noreferrer"`; un archivo para guardar, `download`.
- [ ] Toda `<img>` con `alt`: la descripción **real** de lo que se ve (nunca «imagen de…» ni el nombre del archivo); `alt=""` si es decorativa o si el texto de al lado ya lo dice. Siempre `width` y `height` (sin saltos al cargar); `loading="lazy" decoding="async"` salvo la primera del héroe (`fetchpriority="high"`).
- [ ] Imagen con leyenda: `<figure>` + `<figcaption>` (`.aura-media__caption`, `.aura-quote__cite` o `.aura-media__overlay`).
- [ ] Un `<canvas>` que solo dibuja (la escena con scroll, §10 bis) lleva `aria-hidden="true"`; lo que muestra lo cuenta el `alt` de su póster y los textos HTML de la escena.
- [ ] Los iconos de Bootstrap Icons son decorativos: `<span class="bi …" aria-hidden="true"></span>` (v2.1: con `<span>`, nunca `<i>`, que es una etiqueta de presentación, G140; igual en las plantillas de JS). Tampoco `<b>` ni `<i>` para dar estilo: `<strong>` o `<em>` si es énfasis, `<span>` con su clase si es aspecto.

### 15.4 Tablas

- [ ] Solo para datos (comparativas, especificaciones), nunca para maquetar.
- [ ] `<caption>` con lo que compara la tabla. Si el diseño ya la titula con un encabezado visible, `class="visually-hidden"` (nunca `display: none`); `caption.visually-hidden` no empuja la tabla (aura.css §2). Su contenedor desplazable, solo en horizontal (`overflow-y: hidden`, §6).
- [ ] `<thead>` y `<tbody>` (y `<tfoot>` si hay totales u observaciones); `th scope="col"` en la cabecera y `th scope="row"` en la primera celda de cada fila; `colspan` / `rowspan` solo cuando agrupan de verdad.
- [ ] Una celda sin dato no queda muda: raya visual con `aria-hidden="true"` y «Sin dato» en `.visually-hidden`.
- [ ] Sin roles ARIA en la tabla ni en sus partes (`table`, `rowgroup`, `row`, `columnheader`, `rowheader`, `cell`), aunque el CSS cambie su `display` (rejilla o bloque, como `comparar.html`): son redundantes y el validador del W3C los da como error en `<tr>`, `<th>` y `<td>`. Comprobado en Edge: con y sin roles, el árbol de accesibilidad de `comparar.html` tiene las mismas tablas, filas, cabeceras y celdas.

### 15.5 Formularios

- [ ] Cada control con su `<label for="id">` **visible**; el `placeholder` es un ejemplo, no la etiqueta. Un control sin etiqueta visible (el buscador) lleva una `<label class="visually-hidden" for>`, no `aria-label` (v2.1). Casillas, radios, tarjetas-opción, muestras y segmentados: etiqueta envolvente **y** `for` + `id` ([§7](#casilla-y-radio)), porque TAW (H44) solo cuenta `label for` (o `title`).
- [ ] Los grupos van en `<fieldset>` con `<legend>`: radios, casillas de una misma pregunta (mismo `name`) y bloques largos (datos personales, dirección, pago). Un segmentado de radios suelto **es** el fieldset: `<fieldset class="aura-segmented">` con `<legend class="visually-hidden">` (v2.1; ya no `role="radiogroup"`, que TAW, H71, no acepta); dentro de un `<fieldset>`, un `<div>` ([§5](#chip-insignia-segmentado)). Cada casilla suelta, con su propio `name`.
- [ ] Todo `<form>` lleva un botón de envío real (`type="submit"`), también el buscador (H32, v2.1; [§7](#agrupación)).
- [ ] Bloque con un título visible que ya lo explica (registro, contacto): `<legend class="visually-hidden">` («Datos personales», «Datos de acceso», «Tu consulta»). El `<legend>` no es un elemento de la rejilla del fieldset; si el bloque tiene varios campos seguidos, van en un contenedor interior `.aura-stack.aura-stack--stretch` con `style="--stack:1.125rem"` para conservar el mismo hueco que el resto del formulario (así lo hacen `registro.html` y `soporte.html`).
- [ ] El tipo correcto (`email`, `tel`, `password`, `number`, `search`…), `name` y `autocomplete` en los datos personales (`given-name`, `family-name`, `email`, `tel`, `street-address`, `postal-code`, `address-level2`, `new-password`, `current-password`…).
- [ ] **Validación HTML5 en el marcado**: `required`, `pattern` (con un `title` que explique el formato), `minlength` / `maxlength`, `min` / `max` / `step`, `inputmode`. El formulario lleva `novalidate` en el propio HTML (lo valida `AURA.ui.form`, §14.10, con mensajes propios junto al campo), así que el navegador **no** valida por su cuenta; los atributos se quedan porque documentan la regla, el lector anuncia «obligatorio» y `maxlength` impide escribir de más.
- [ ] Las reglas se escriben dos veces, en el marcado y en `AURA.ui.form` (que **no** lee los atributos): las dos dicen lo mismo y, si cambia una, cambia la otra. El correo lleva `pattern="[^\s@]+@[^\s@]+\.[^\s@]{2,}"`, la misma regla que `email: true` (`EMAIL_RE`); sin él, `type="email"` daría por bueno «a@b».
- [ ] Mensajes junto al campo en `.aura-field__error`, enlazados con `aria-describedby`, con `aria-invalid` en el control y texto + icono (nunca solo color); el resumen de un envío fallido, en `.aura-alert` con `role="alert"`. `readonly` y `disabled` con su sentido; cada `<button>` con su `type`.

### 15.6 ARIA y atributos globales

- [ ] Primero HTML nativo (`button`, `a href`, `nav`, `fieldset`); ARIA solo donde el HTML no llega. Sin roles redundantes (`<nav role="navigation">`, `<button role="button">`, `<table role="table">`), sin excepciones.
- [ ] **Propiedades**: el nombre de los botones de icono, en texto oculto (`.visually-hidden`; v2.1, antes `aria-label`, que queda para lo que no es un enlace, un botón ni un control: una región, un `nav`, una lista de puntos de color); `aria-labelledby` de cada `section` o región a su encabezado; `aria-describedby` de los campos a su ayuda y su error; `aria-controls` del disparador a lo que abre.
- [ ] **Estados**, actualizados por el JS en el mismo instante que lo visual: `aria-expanded` (menú, bolsa, buscador, acordeón, barra local), `aria-current="page"` (navegación, migas, familia activa), `aria-pressed` / `aria-checked`, `aria-invalid`, `aria-busy` (envío en curso, `AURA.ui.busy`), `aria-hidden` en lo decorativo y en los overlays cerrados.
- [ ] **Cambios dinámicos** anunciados: `role="status"` o `aria-live="polite"` para resultados y recuentos (buscador, comparador, bolsa, avisos) y `role="alert"` para errores.
- [ ] Atributos globales con criterio: `id` único (anclas, `label for`, `aria-*`); `class` con el prefijo `aura-` o el de la página; `data-*` para datos y comportamiento (`data-aura-*`, `data-slot`, `data-family`); `hidden` para lo que no aplica (campos condicionales); `style` solo para variables (`style="--i:3"`), nunca un `width`, `height` ni `font-size` en px (C28 de TAW; lo que escribe el JS, en rem); `title` como en §15.3; `lang` en un fragmento en otro idioma.
- [ ] Teclado: todo lo que se pulsa es `<button>` o `<a href>` (nunca un `div` con `onclick`); `tabindex="0"` solo en zonas desplazables (`.aura-table-wrap`) y `-1` para el foco por JS; **nunca mayor que 0**. El orden del foco sigue el visual; los overlays atrapan el foco, se cierran con Esc y lo devuelven a su disparador.

### 15.7 Foco, contraste y preferencias

- [ ] Foco siempre visible: `:focus-visible` con 2 px de `--accent-link` (3 px con «más contraste»). Nunca `outline: none` sin un sustituto igual de visible.
- [ ] Contraste AA: texto ≥ 4,5:1 (≥ 3:1 si es grande) y controles ≥ 3:1. Usa los tokens (`--text-primary`, `--text-secondary`, `--text-tertiary`; texto azul siempre `--accent-link`, nunca `--accent`).
- [ ] Estados visibles y distintos: `:hover`, `:focus-visible`, `:active`, `disabled` (menos contraste pero legible) y error (icono + texto).
- [ ] Objetivos de 44 px en táctil y 24 px con ratón (lo hace la base). Se respetan «reducir movimiento», «reducir transparencia», «más contraste» y los colores forzados (aura.css §8): ninguna página los anula.

### 15.8 Cómo se comprueba

- Auditoría de Lighthouse (Accesibilidad, Buenas prácticas y SEO) en Edge o Chrome, y el panel **Accesibilidad** de DevTools para ver el nombre accesible de cada control.
- Teclado: recorrer la página con Tab y Mayús + Tab, abrir y cerrar con Intro, Espacio y Esc, sin quedarse atrapado.
- Lector de pantalla (NVDA en Windows): lista de encabezados, regiones, enlaces y tablas; cada una con su nombre.
- Contraste: el comprobador de DevTools (o el de WebAIM) sobre texto, iconos y bordes de campos.
- Validador del W3C (HTML) y una vista previa del enlace compartido para revisar Open Graph.
- **Test TAW** (tawdis.net, WCAG 2.x nivel AA): cero «Falla» en la página publicada, y lo de «Revisar» mirado uno a uno ([§15.9](#159-test-taw-wcag-2x-aa)).

### 15.9 Test TAW (WCAG 2.x AA)

TAW analiza el HTML ya pintado y es más estricto que el lector de pantalla: lo que NVDA entiende por `aria-label` o por la etiqueta que envuelve un control, TAW lo da por **falla**. Estas son sus técnicas que AURA cumple (v2.1) y cómo:

| Técnica | Qué comprueba | Cómo se cumple en AURA |
| --- | --- | --- |
| **H44 / H65** (falla) | Cada `input`, `select` y `textarea` (salvo `hidden`, `submit`, `button`, `reset`, `image`) tiene un `<label for>` con texto o un `title`. | `id` + `<label for>` siempre, también en los controles envueltos por su etiqueta (radios, casillas, muestras de color, tarjetas-opción, segmentado). Sin etiqueta a la vista, `<label class="visually-hidden" for>` (el buscador). Los ids que genera el JS, únicos: componente + nombre + valor ([§7](#casilla-y-radio)). |
| **H71** (falla) | Los radios, y las casillas que comparten `name`, están en un `<fieldset>` con su `<legend>` de hijo directo. | `<fieldset>` + `<legend>` (`.visually-hidden` si no se ve). El segmentado de radios es `<fieldset class="aura-segmented">` ([§5](#chip-insignia-segmentado)). Las casillas sueltas, cada una con su `name`. |
| **F89** (falla) | Ningún enlace sin texto ni imagen con `alt`. | La foto de la tarjeta de modelo y la miniatura de la bolsa no son enlaces (enlace estirado del nombre, [§6](#tarjeta-de-modelo)). Los enlaces y botones de icono llevan su nombre en `.visually-hidden` ([§5](#botón-de-icono-44-px)). |
| **H2** (falla) | Dos enlaces seguidos (sin texto entre ellos) no llevan al mismo destino. | Iconos sociales a `#newsroom`, `#historia` y `#oportunidades` ([§12.2](#122-aura-footer)); el título de la barra local va a `#top` con «: volver arriba» oculto ([§4](#barra-local-páginas-de-familia)); foto y nombre, un solo enlace. |
| **H32** (falla) | Todo `<form>` tiene un botón de envío (`button` sin `type` o `type="submit"`, `input type="submit"` o `image`). | `type="submit"` en el botón principal; en el buscador, la lupa ([§12.1](#buscador)). Una muestra que no se envía no es un `<form>`. |
| **G140** (revisar) | Etiquetas de presentación: `<i>`, `<b>`, `<u>`, `<font>`, `<center>`, `<big>`… | Iconos con `<span class="bi …" aria-hidden="true">`; énfasis con `<strong>` / `<em>`; aspecto con clases. El CSS apunta a `.bi`, nunca a `i`. |
| **C28** (revisar) | Medidas absolutas (`px`) en `width`, `height` o `font-size` de un `style` en línea. | En el HTML, `style` solo para variables; lo que escribe el JS (la pastilla del segmentado), en `rem` ([§5](#chip-insignia-segmentado)). Los `px` van en la hoja. |
| **H30** (revisar) | El mismo texto de enlace no lleva a destinos distintos. | El producto o la familia, en `.visually-hidden` dentro del enlace: `Comprar<span class="visually-hidden"> auraPhone 18 Pro</span>` ([§5](#enlace-contextual)). |

Antes de publicar una página, además de §15.8: ningún `aria-label` como único nombre de un enlace, un botón o un control (solo en regiones, `nav` y grupos); `grep '<i \|<b>'` sin resultados en el HTML y en las plantillas de JS; y en el navegador, Tab por toda la página, flechas en cada segmentado y grupo de radios, e Intro en el buscador. Lo que generan `aura-core.js` y `aura-ui.js` ya cumple; una página nueva solo tiene que cumplirlo en su propio marcado.
