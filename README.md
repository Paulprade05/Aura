# AURA — tienda online de tecnología de alta gama

Web de demostración de **AURA**, una marca inventada que parodia a Apple: vende los tres mejores modelos actuales de cada familia (auraPhone, auraPad y auraBook) con el diseño, el tono y la forma de trabajar de apple.com, siguiendo la guía de estilo AURA y la skill [`apple-design`](.agents/skills/apple-design/SKILL.md).

HTML, CSS y JavaScript sin compilación, con Bootstrap 5.3 (rejilla y utilidades), Bootstrap Icons y las fuentes Kanit e Inter.

## Cómo abrirla

- **Doble clic en `index.html`.** Funciona tal cual por `file://`.
- O con un servidor local, desde esta carpeta:

```bash
npx http-server . -p 5577 -c-1
```

y abre http://localhost:5577.

Hace falta conexión a internet la primera vez, para las fuentes, Bootstrap y los iconos.

## Páginas

| Página | Qué es |
|---|---|
| `index.html` | Inicio: héroes por familia, novedades, la gama en un carrusel, por qué AURA, About us y Trade In |
| `auraphone.html` · `aurapad.html` · `aurabook.html` | Páginas de familia con barra local, modelos, destacados, carrusel y comparativa |
| `comprar.html?producto=ID` | Configurador: modelo, acabado, opciones con precio, AuraCare+, Trade In y resumen |
| `bolsa.html` · `checkout.html` | Bolsa (cantidades, deshacer, crédito de Trade In) y pago simulado en 4 pasos |
| `login.html` · `registro.html` · `cuenta.html` | ID de AURA: acceso, registro y cuenta con pedidos, datos y seguridad |
| `comparar.html?familia=ID` | Comparador de los tres modelos de una familia |
| `trade-in.html` | Calculadora de AURA Trade In |
| `acerca.html` · `soporte.html` · `legal.html` | About us (parodia), soporte con buscador y contacto, textos legales |
| `componentes.html` | Guía viva del sistema de diseño |

## La gama: «siempre los tres mejores»

Todo el catálogo vive en **`js/data.js`** (datos reales de España a 3 de octubre de 2026, con nombres AURA). Las tarjetas, comparativas, el configurador, el buscador y los precios se pintan desde ahí. Para cambiar un modelo cuando salga una generación nueva basta con editar ese archivo; las instrucciones están en su cabecera.

| Familia | Rank 1 | Rank 2 | Rank 3 |
|---|---|---|---|
| auraPhone | auraPhone Duo (plegable, desde 2.339 €) | auraPhone 18 Pro Max (1.619 €) | auraPhone 18 Pro (1.469 €) |
| auraPad | auraPad Pro 13″ (1.649 €) | auraPad Pro 11″ (1.299 €) | auraPad Air 13″ (999 €) |
| auraBook | auraBook Pro 16″ (3.449 €) | auraBook Pro 14″ (2.229 €) | auraBook Air 15″ (1.729 €) |

El **auraPhone Duo** cambia de estado solo según la fecha:

| Fechas | Estado | Botón |
|---|---|---|
| Hasta el 15/10/2026 | Próximamente | «Avísame» en lugar de añadir a la bolsa |
| Del 16/10 al 22/10 | Reserva | «Reservar» |
| Desde el 23/10 | Disponible | «Comprar» |

Para probar otro día sin esperar, añade `?hoy=AAAA-MM-DD` a la URL (por ejemplo `comprar.html?producto=auraphone-duo&hoy=2026-10-20`). El parámetro se conserva al navegar.

## Imágenes

Las fotos de `img/` (WebP) son fotos reales con licencia libre (Wikimedia Commons, Unsplash y Pexels) de los modelos actuales, recortadas y ajustadas de tono para el fondo negro; en algunas se han borrado logotipos o textos de la pantalla. Sus autores y licencias aparecen en `html/legal.html#imagenes`. Para cambiar una, sustituye el archivo con el mismo nombre (lista completa en **[`img/LEEME.md`](img/LEEME.md)**); si falta alguna, la web muestra un marcador con su ruta y tamaño. El logotipo (`img/aura.png`) no cambia.

Las páginas de auraPhone, auraPad y auraBook abren con una **escena que avanza con el scroll**: una secuencia de 120 fotogramas por familia en `img/seq/<familia>-intro/` (con versión ligera para móvil en `m/`), pintada en un `<canvas>` al ritmo del scroll y con textos superpuestos. Con «reducir movimiento» o ahorro de datos se muestra una imagen fija con los textos. El componente está documentado en `guia-de-estilo/docs/COMPONENTES.md` (§10 bis).

## Tienda simulada

- La bolsa, las cuentas, los pedidos y el crédito de Trade In se guardan solo en el `localStorage` de tu navegador. No hay servidor.
- Las contraseñas se guardan como hash SHA-256 con sal.
- El pago es simulado. La tarjeta se valida en formato, pero **nunca se guarda ni se envía**: solo quedan los 4 últimos dígitos en el recibo. Para probar, usa `4242 4242 4242 4242`.
- `html/legal.html` tiene un botón para borrar todos los datos de AURA de este navegador.

## Estructura

```
index.html                     página de inicio
html/                          páginas del sitio (auraphone, comprar, bolsa, etc.)
css/aura.css                   sistema de diseño (tokens, componentes, accesibilidad)
css/pages/*.css                ajustes propios de cada página
js/data.js                     catálogo (productos, precios, Trade In, envío)
js/aura-core.js                núcleo: catálogo, bolsa, sesión, pedidos, cabecera y pie, huecos de imagen
js/aura-ui.js                  interfaz: muelles, carrusel con inercia, hojas, avisos, formularios
js/pages/*.js                  lógica de cada página
img/                           logotipo, imágenes y LEEME.md
guia-de-estilo/                guía de estilo oficial en PDF y prototipos
```

## Diseño

- **Guía de estilo AURA:**
  - Fondo `#000` y `#161617`, azul `#0071e3` solo para lo interactivo y dorado `#e5a93c` para los acentos.
  - Kanit en los titulares (56/42/28) e Inter en el texto.
  - Botones de 48 px con radio completo y campos con anillo azul al enfocar.
- **Skill apple-design:**
  - Respuesta inmediata al pulsar.
  - Muelles interrumpibles, y carrusel con proyección de inercia y efecto goma en los bordes.
  - Hojas que se arrastran para cerrar y popovers que nacen de su botón.
  - Barras translúcidas.
  - Tracking según el tamaño del texto.
  - «Deshacer» en lugar de confirmaciones.
  - Validación en línea.
  - Soporte de *reducir movimiento*, *reducir transparencia* y *más contraste*.
