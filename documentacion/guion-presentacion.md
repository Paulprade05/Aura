# Guion para exponer AURA (10 minutos)

Presentación: `AURA-presentacion-diseno.pptx` (10 diapositivas). Léelo en voz alta 2 o 3 veces; no hace falta memorizarlo palabra por palabra, solo las ideas en **negrita**.

## 1. Portada (0:30)
«Buenos días. Os presento **AURA**, la web que he diseñado para la asignatura. Es una tienda ficticia que parodia a Apple. No voy a hablar de lo que vende, sino de **cómo está diseñada**: desde los bocetos y la guía de estilo hasta el color, el layout, los componentes, la usabilidad, la accesibilidad y el SEO.»

## 2. Del boceto a la web (1:00)
«Todo empezó con un **boceto**: a la izquierda lo veis, la portada con tres productos y un vídeo, y la ficha con bloques de texto e imagen alternados. A la derecha, **la web final**, que sigue esa misma estructura. Entre medias hubo cuatro pasos. Primero, un **referente**: apple.com y los principios de movimiento de la skill apple-design. Después hice la **guía de estilo**: la primera versión de 4 capítulos y la segunda de 17, en HTML, PDF y Figma. De la guía salió el **sistema de diseño**: un único CSS con variables y una página de componentes. Y encima, las **16 páginas** en HTML, CSS y JavaScript con Bootstrap.»

## 3. Guía de estilo: color y tipografía (1:00)
«El color tiene un reparto muy claro: **fondo negro**, **azul solo para lo que se pulsa** y **dorado solo para acentos**. Así el usuario aprende que lo azul es interactivo. Uso dos tipografías: **Kanit** en titulares y **Inter** en el texto, con interlineado de 1,6. Los botones miden **48 píxeles** y los campos tienen un anillo azul al enfocar.»

## 4. Color accesible: contraste (1:15)
«En lugar de elegir colores a ojo, **medí el contraste** de cada pareja. El mínimo de WCAG AA es **4,5 a 1**. El azul de texto da **5,85**, el gris secundario **7,03** y el dorado **8,67**. Un caso real: en el avatar de las reseñas puse texto azul sobre azul oscuro y daba **4,34**, por debajo del mínimo. Lo detectó la auditoría y lo cambié a texto casi blanco: **14,31**.»

## 5. Layout y responsive (1:00)
«Uso la **rejilla y las utilidades de Bootstrap 5.3**, pero los componentes y el estilo son propios. Lo diseño **primero para móvil**: el menú se convierte en hamburguesa, las columnas pasan a una y los botones siguen midiendo 48 píxeles para pulsarlos con el pulgar. Aquí se ve la misma web en escritorio y en móvil.»

## 6. Componentes y movimiento (1:15)
«Una tienda se construye con **componentes**: tarjetas, configurador, bolsa, checkout en cuatro pasos y hojas que se abren desde abajo. Siguiendo apple-design, todo **responde al instante**, los carruseles tienen **inercia**, las hojas se **arrastran para cerrar** y en vez de pedir confirmación hay un **Deshacer**. La escena de cada familia avanza con el scroll. Y todo se desactiva si el usuario pide **reducir movimiento**.»

## 7. Usabilidad (1:00)
«Cada decisión responde a una ley UX. **Hick**: menos opciones, menú de siete enlaces y checkout en cuatro pasos. **Jakob**: patrones conocidos, logo al inicio, bolsa a la derecha y lupa para buscar. **Fitts**: botones grandes. **Von Restorff**: un solo botón azul relleno por bloque para destacar la acción. Reconozco que **me faltan pruebas con usuarios reales**.»

## 8. Accesibilidad (1:15)
«Pasé **pa11y** sobre las 17 páginas con el estándar WCAG 2 AA. Encontró **337 incidencias** y corregí las reales: un atributo aria no permitido, el contraste del avatar, un ancla inexistente y referencias a diálogos que aún no existen. Ahora pa11y marca 277, pero **axe da cero violaciones**: lo que queda son avisos de revisión manual, sobre todo texto sobre fondos translúcidos que la herramienta no puede calcular. Está explicado en el informe.»

## 9. SEO y reseñas (1:15)
«El SEO también es diseño: **título, descripción y un solo H1** por página, imágenes **WebP con srcset y texto alternativo**, migas de pan y **datos estructurados JSON-LD**. Las reseñas las diseñé como un **componente**: tarjetas con estrellas que llevan texto para lector de pantalla y un formulario que **solo aparece a quien ha comprado el producto**, con la etiqueta «Compra verificada». Las reseñas de demostración están señaladas como tales.»

## 10. Conclusiones y demo (0:30)
«Tres ideas: la web sale de un **sistema de diseño**; las decisiones se **miden** con contrastes y auditorías; y está pensada **para todas las personas**, con sus límites reconocidos. Os la enseño: [abrir `aura-lyart-beta.vercel.app`: inicio, una familia, configurador, móvil, reseñas]. ¿Alguna pregunta?»

---

## Preguntas que pueden hacerte (y qué responder)
- **¿Por qué Bootstrap si tienes tu propio CSS?** Para la rejilla y las utilidades responsive, que son un estándar probado; los componentes y el estilo visual son propios, sobre variables CSS.
- **¿Por qué pa11y sigue marcando 277?** Son avisos de «revisión manual» que pa11y cuenta como error (sobre todo texto sobre fondos translúcidos); axe, que es el motor que decide las violaciones, da 0.
- **¿Son reales las reseñas?** Las de demostración no, y la web lo indica en cada tarjeta. Las de clientes solo las pueden publicar quienes han comprado el producto.
- **¿Qué no has hecho?** Pruebas con usuarios reales, Lighthouse sobre la web publicada y una prueba con lector de pantalla.
- **¿Cómo guardas las cuentas?** En una base de datos Neon con contraseñas cifradas (scrypt); si el servidor falla, la web sigue funcionando en local.
- **¿Por qué ese azul?** Porque `#0073e6` da 4,59:1 sobre negro y por eso lleva siempre texto blanco; para texto uso un azul más claro, `#1787f7`, con 5,85:1.

## Consejos
- Dos o tres frases por diapositiva: 1 minuto por diapositiva da exactamente 10 minutos.
- Si vas corto de tiempo, resume las diapositivas 7 y 9 en una frase cada una.
- Antes de empezar, abre la web en otra pestaña y prueba que carga.
