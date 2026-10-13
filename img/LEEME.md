# Imágenes del sitio AURA

Todas las imágenes ya están colocadas: fotos reales con licencia libre (Wikimedia Commons, Unsplash y Pexels), recortadas y ajustadas de tono, en WebP. Las secuencias de las escenas con scroll están en `img/seq/`. Los créditos están en `html/legal.html#imagenes`. Para sustituir una, guarda la nueva con **exactamente** el mismo nombre; si falta alguna, la web muestra en su lugar un marcador con la ruta y el tamaño recomendado.

- **Formato:** `.webp` (es lo que pide la web; también valen `.png` y `.jpg` con el mismo nombre, que se prueban después).
- **Tamaños (`srcset`):** cada foto de `img/` tiene sus variantes de 400 y 800 px de ancho en `img/400/` e `img/800/` (el original, de 1600, es la grande), y cada foto de los créditos una miniatura de 240 × 180 en `img/thumbs/`. No se hacen a mano: después de añadir o cambiar una foto, ejecuta `node scratchpad/impl/catalogo-imagenes/variantes.mjs` (solo rehace lo que ha cambiado y borra las variantes de fotos que ya no están). Si falta una variante, la web usa el original.
- **Fondo:** todo el sitio es negro (#000); diseña o recorta las imágenes para fondo oscuro.
- **Tamaño:** el indicado o mayor con la misma proporción (la proporción importa más que los píxeles exactos).
- Listado generado automáticamente el 2026-10-03 (fotos colocadas el 2026-10-09) recorriendo todas las páginas. Si cambias la gama en `js/data.js`, vuelve a mirar la tabla de productos.

## 1. Productos

Cada producto tiene una **galería por color**: varias vistas de cada acabado, `img/<diseño>-<color>-<vista>.webp` a **1600 × 1200 px (4:3)** (vistas: `trasera`, `frontal`, `tres-cuartos`, `lateral`, `abierto`, `cerrado`, `estuche-abierto`, `estuche-cerrado` y `auriculares`). Las declaran los manifiestos `scratchpad/fotos-tools/manifiestos/<diseño>.json` y `node scratchpad/fotos-tools/integrar.mjs` las lleva al bloque generado del final de `js/data.js` (`photos` e `imageColor`), a los créditos y a las variantes. La primera vista de cada acabado es la de las tarjetas, la bolsa y el checkout (la misma en los modelos de una familia); el configurador enseña todas. Un acabado sin fotos enseña las del acabado por defecto, con el aviso «Imagen en …».

La foto base de cada producto (la tabla de abajo) se queda de respaldo, por si faltara una foto de la galería.

| Archivo | Producto | Familia |
|---|---|---|
| `aurabook-pro-16.webp` | auraBook Pro 16″ | auraBook |
| `aurabook-pro-14.webp` | auraBook Pro 14″ | auraBook |
| `aurabook-air-15.webp` | auraBook Air 15″ | auraBook |
| `aurapad-pro-13.webp` | auraPad Pro 13″ | auraPad |
| `aurapad-pro-11.webp` | auraPad Pro 11″ | auraPad |
| `aurapad-air-13.webp` | auraPad Air 13″ | auraPad |
| `auraphone-duo.webp` | auraPhone Duo | auraPhone |
| `auraphone-18-pro-max.webp` | auraPhone 18 Pro Max | auraPhone |
| `auraphone-18-pro.webp` | auraPhone 18 Pro | auraPhone |
| `aurapods-max-2.webp` | auraPods Max 2 | auraPods |
| `aurapods-pro-3.webp` | auraPods Pro 3 | auraPods |
| `aurapods-5.webp` | auraPods 5 | auraPods |

### Fotos por diseño

Un diseño da sus fotos a todos sus tamaños: `auraphone-18-pro-*` al 18 Pro y al 18 Pro Max, `aurapad-pro-*` a los Pro de 13″ y 11″ y `aurabook-pro-*` a los Pro de 16″ y 14″; el resto, a su producto. Los acabados que aún no tienen foto propia salen en el comentario del bloque generado de `js/data.js`.

## 2. Imágenes de cada página

La columna «Qué debe mostrar» es el texto alternativo que ya lleva la imagen: úsalo como guía de contenido.

### index.html

| Archivo | Tamaño | Dónde | Qué debe mostrar |
|---|---|---|---|
| `inicio-hero-auraphone.webp` | 1600 × 1200 | #auraphone-duo auraPhone Duo | auraPhone Duo abierto en su pantalla de 7,6 pulgadas junto a otro plegado que deja ver su estructura de titanio |
| `inicio-hero-aurapad.webp` | 1600 × 1200 | #aurapad-pro auraPad Pro | auraPad Pro tumbado sobre un fondo negro, con un paisaje estelar en su pantalla y AURA Pencil Pro a su lado |
| `inicio-hero-aurabook.webp` | 1600 × 1200 | #aurabook-pro auraBook Pro | auraBook Pro entreabierto de perfil, con la pantalla Liquid Retina XDR encendida en azul |
| `inicio-novedad-camara.webp` | 1600 × 1200 | auraPhone 18 Pro | Dos auraPhone 18 Pro en azul glacial, de frente y de espaldas, iluminados desde abajo |
| `inicio-novedad-aurabook-air.webp` | 1600 × 1200 | auraBook Air 15″ | auraBook Air cerrado, flotando de canto sobre una estela de luz azul |
| `inicio-novedad-teleobjetivo.webp` | 1600 × 1200 | auraPhone 18 Pro Max | Primer plano del módulo de cámaras del auraPhone 18 Pro Max, con el teleobjetivo en primer término |
| `inicio-novedad-aurapad-air.webp` | 1600 × 1200 | auraPad Air 13″ | auraPad Air 13″ con Magic Keyboard y AURA Pencil Pro trazando una línea de luz sobre la pantalla |
| `inicio-trade-in.webp` | 1600 × 1200 | #trade-in AURA Trade In | Un auraPhone nuevo se eleva sobre varios teléfonos antiguos que se deshacen en partículas de luz azul |

### auraphone.html

| Archivo | Tamaño | Dónde | Qué debe mostrar |
|---|---|---|---|
| `auraphone-zoom-1.webp` | 1600 × 1200 | Cámara Fusion | Primer plano del módulo de cámaras de un auraPhone 18 Pro con el diafragma de la cámara Fusion entreabierto |
| `auraphone-zoom-2.webp` | 1600 × 1200 | Teleobjetivo | Fotografía tomada con el zoom x8: un faro lejano visto con todo detalle al atardecer |
| `auraphone-zoom-3.webp` | 1600 × 1200 | Pantalla | La Dynamic Island de un auraPhone 18 Pro mostrando a la vez un temporizador, un trayecto y la música |
| `auraphone-zoom-4.webp` | 1600 × 1200 | Diseño térmico | Vista interior de un auraPhone 18 Pro Max con la cámara de vapor de cobre sobre el chip AURA A20 Pro |
| `auraphone-destacado-1.webp` | 1600 × 1200 | AURA Intelligence | Pantalla de un auraPhone con AURA Intelligence resumiendo una conversación larga en tres líneas |
| `auraphone-destacado-2.webp` | 1600 × 1200 | Batería | auraPhone 18 Pro Max cargándose sobre un cargador MagSafe con el anillo de carga iluminado |
| `auraphone-destacado-3.webp` | 1600 × 1200 | auraPhone Duo | auraPhone Duo abierto con un mapa a la izquierda y una conversación a la derecha |
| `auraphone-destacado-4.webp` | 1600 × 1200 | Resistencia | Gotas de agua resbalando por el frontal de un auraPhone 18 Pro |
| `auraphone-destacado-5.webp` | 1600 × 1200 | Conectividad | Puerto USB-C de un auraPhone 18 Pro conectado con un cable trenzado |
| `auraphone-destacado-6.webp` | 1600 × 1200 | Privacidad | Pago con AURA Pay en un auraPhone 18 Pro acercado a un datáfono |

### aurapad.html

| Archivo | Tamaño | Dónde | Qué debe mostrar |
|---|---|---|---|
| `aurapad-hero.webp` | 1920 × 1080 | #descripcion Gama auraPad | Tres auraPad flotando en abanico sobre fondo negro, con un paisaje cósmico azul y dorado en sus pantallas |
| `aurapad-accesorios-pencil.webp` | 1600 × 1200 | AURA Pencil Pro | AURA Pencil Pro dibujando un trazo dorado sobre la pantalla de un auraPad |
| `aurapad-accesorios-teclado.webp` | 1600 × 1200 | Magic Keyboard | auraPad Pro acoplado a Magic Keyboard en negro, abierto como un portátil |
| `aurapad-crear-ilustrar.webp` | 1600 × 1200 | Ilustrar | Ilustración de un paisaje nocturno a medio pintar en un auraPad Pro, con AURA Pencil Pro al lado |
| `aurapad-crear-video.webp` | 1600 × 1200 | Editar vídeo | Línea de tiempo de edición de vídeo con varias pistas en la pantalla de un auraPad Pro |
| `aurapad-crear-estudiar.webp` | 1600 × 1200 | Estudiar | Apuntes manuscritos de biología con esquemas en un auraPad Air azul sobre un escritorio |
| `aurapad-crear-trabajar.webp` | 1600 × 1200 | Trabajar | auraPad Pro con Magic Keyboard conectado a un monitor externo, con varias ventanas de auraPadOS 27 abiertas |

### aurabook.html

| Archivo | Tamaño | Dónde | Qué debe mostrar |
|---|---|---|---|
| `aurabook-ecosistema.webp` | 1600 × 1200 | #ecosistema AURA Silicon / Ecosistema | Un auraBook Pro conectado a una gran pantalla en un estudio a media luz, junto a un auraPad, con teclado y ratón sobre una mesa de madera |
| `aurabook-perfil-desarrollo.webp` | 1600 × 1200 | Desarrollo | Una desarrolladora con un auraBook Pro lleno de código, junto a un monitor con la terminal abierta |
| `aurabook-perfil-fotografia.webp` | 1600 × 1200 | Fotografía | Un fotógrafo revela una foto de paisaje nocturno en un auraBook Pro, con la tarjeta SD en el lateral |
| `aurabook-perfil-video.webp` | 1600 × 1200 | Vídeo 8K | Una línea de tiempo de vídeo 8K con varias pistas en un auraBook Pro 16″, en una sala de montaje a oscuras |
| `aurabook-perfil-estudios.webp` | 1600 × 1200 | Estudios | Un estudiante toma apuntes con un auraBook Air en la mesa de una biblioteca |
| `aurabook-perfil-musica.webp` | 1600 × 1200 | Música | Una productora musical con un auraBook Pro, un teclado MIDI y unos auriculares en un estudio doméstico |

### aurapods.html

| Archivo | Tamaño | Dónde | Qué debe mostrar |
|---|---|---|---|
| `seq/aurapods-intro/` | 96 × 1600 × 900 (+ 56 × 750 × 1100 en `m/`) | #descripcion Escena del héroe | Los auraPods Max 2 aparecen desde el negro, la cámara se acerca y la luz cruza el aluminio (fotogramas compuestos por código desde una foto de estudio) |
| `aurapods-cancelacion.webp` | 1600 × 1200 | #cancelacion Cancelación activa de ruido | Dos auriculares blancos con almohadilla sobre una superficie de cuero negro |
| `aurapods-audio.webp` | 1600 × 1200 | #audio Audio espacial | De cerca, las orejeras de aluminio y las almohadillas de malla de unos auraPods Max 2 en color medianoche |
| `aurapods-max.webp` | 1600 × 1200 | #max auraPods Max 2 | auraPods Max 2 en color medianoche, en tres cuartos sobre una superficie negra brillante |
| `aurapods-ecosistema.webp` | 1600 × 1200 | #ecosistema Con auraPhone y auraBook | Auriculares de diadema negros en penumbra, con un auraPhone detrás que reproduce una canción |

El estuche (#estuche) y los accesorios (#accesorios) usan las fotos de producto `aurapods-5`, `aurapods-max-2-azul` y `aurapods-pro-3`.

### trade-in.html

| Archivo | Tamaño | Dónde | Qué debe mostrar |
|---|---|---|---|
| `trade-in-hero.webp` | 1600 × 1200 | AURA Trade In | Varios teléfonos antiguos se funden en un haz de luz azul del que emerge un auraPhone nuevo |
| `trade-in-reciclaje.webp` | 1600 × 1200 | #planeta Medio ambiente | Componentes de un teléfono desmontado, ordenados por materiales sobre una superficie oscura |

### acerca.html

| Archivo | Tamaño | Dónde | Qué debe mostrar |
|---|---|---|---|
| `acerca-hero.webp` | 1600 × 1200 | Acerca de AURA / Cupertino | La sede de AURA en Cupertino de noche, con un anillo de luz azul que recorre la fachada de cristal |
| `acerca-historia.webp` | 1600 × 1200 | #historia Historia / 1976–2026 | El garaje de Cupertino donde empezó AURA: un banco de trabajo, un soldador y el primer ordenador AURA I con carcasa de madera |
| `acerca-accesibilidad.webp` | 1600 × 1200 | #accesibilidad Accesibilidad | Una persona usa un auraPhone con el lector de pantalla mientras sus dedos recorren la pantalla |
| `acerca-proveedores.webp` | 1600 × 1200 | #proveedores Proveedores | Una técnica revisa con lupa una placa base en una línea de montaje limpia e iluminada |
| `acerca-newsroom-1.webp` | 1600 × 1200 | Nota de prensa | Un campo de paneles solares al atardecer junto a un centro de datos de AURA |
| `acerca-newsroom-2.webp` | 1600 × 1200 | Nota de prensa | El chip AURA M5 sobre una superficie negra, iluminado por un halo azul |
| `acerca-newsroom-3.webp` | 1600 × 1200 | Nota de prensa | El auraPhone Duo medio abierto sobre un escenario oscuro, junto a dos auraPhone 18 Pro |
| `acerca-oportunidades.webp` | 1600 × 1200 | #oportunidades Oportunidades / Empleo | Un equipo de diseño de AURA revisa prototipos de esquinas redondeadas sobre una mesa iluminada |

### soporte.html

| Archivo | Tamaño | Dónde | Qué debe mostrar |
|---|---|---|---|
| `soporte-contacto.webp` | 1600 × 1200 | #contacto Contacto | Interior de la AURA Store de Gran Vía: mesas de madera clara con auraPhone, auraPad y auraBook y un especialista atendiendo |

---

**Total:** las 12 fotos base de producto, las de las páginas de las tablas de arriba y la galería por color de cada producto. `auraphone-hero`, `aurabook-hero`, `aurapad-pro`, `aurapad-crear-medir` e `inicio-acerca` (inicio, acerca, componentes y la guía enseñan ya la misma sede, `acerca-hero`) ya no las usaba ninguna página y se retiraron, igual que las fotos por color antiguas que sustituyó la galería (también `auraphone-18-pro-azul-glacial`, `auraphone-18-pro-max-burdeos` y `aurapad-pro-13-negro-espacial`: las exhibiciones de color y la muestra de componentes parten ya de la primera vista del acabado).

El logotipo (`aura.png`) ya está colocado.
