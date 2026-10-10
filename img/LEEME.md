# Imágenes del sitio AURA

Todas las imágenes ya están colocadas: fotos reales con licencia libre (Wikimedia Commons, Unsplash y Pexels), recortadas y ajustadas de tono, en WebP. Las secuencias de las escenas con scroll están en `img/seq/`. Los créditos están en `html/legal.html#imagenes`. Para sustituir una, guarda la nueva con **exactamente** el mismo nombre; si falta alguna, la web muestra en su lugar un marcador con la ruta y el tamaño recomendado.

- **Formato:** `.webp` (es lo que pide la web; también valen `.png` y `.jpg` con el mismo nombre, que se prueban después).
- **Fondo:** todo el sitio es negro (#000); diseña o recorta las imágenes para fondo oscuro.
- **Tamaño:** el indicado o mayor con la misma proporción (la proporción importa más que los píxeles exactos).
- Listado generado automáticamente el 2026-10-03 (fotos colocadas el 2026-10-09) recorriendo todas las páginas. Si cambias la gama en `js/data.js`, vuelve a mirar la tabla de productos.

## 1. Productos (imprescindibles: 9 imágenes)

Una imagen por producto basta: se usa en las tarjetas, el comparador, el configurador, la bolsa y el buscador. **1600 × 1200 px (4:3)**, el dispositivo centrado y con aire alrededor.

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

### Opcional: una imagen por color

Si quieres que el configurador y las exhibiciones de color cambien de imagen al elegir acabado, añade también estas (mismo tamaño) **y declara cada una en `imageVariants` de `js/data.js`, con su `alt`**: solo se piden las declaradas. Sin ellas se usa la del producto, y el color de esa foto va en `imageColor`. No hace falta la del color que ya enseña la foto base.

| Producto | Archivos opcionales |
|---|---|
| auraPhone Duo | `auraphone-duo-cielo-nocturno.webp` (Cielo nocturno) · `auraphone-duo-blanco-estelar.webp` (Blanco estelar) |
| auraPhone 18 Pro Max | `auraphone-18-pro-max-negro.webp` (Negro) · `auraphone-18-pro-max-plata.webp` (Plata) · `auraphone-18-pro-max-azul-glacial.webp` (Azul glacial) · `auraphone-18-pro-max-burdeos.webp` (Burdeos) |
| auraPhone 18 Pro | `auraphone-18-pro-negro.webp` (Negro) · `auraphone-18-pro-plata.webp` (Plata) · `auraphone-18-pro-azul-glacial.webp` (Azul glacial) · `auraphone-18-pro-burdeos.webp` (Burdeos) |
| auraPad Pro 13″ | `aurapad-pro-13-negro-espacial.webp` (Negro espacial) · `aurapad-pro-13-plata.webp` (Plata) |
| auraPad Pro 11″ | `aurapad-pro-11-negro-espacial.webp` (Negro espacial) · `aurapad-pro-11-plata.webp` (Plata) |
| auraPad Air 13″ | `aurapad-air-13-gris-espacial.webp` (Gris espacial) · `aurapad-air-13-azul.webp` (Azul) · `aurapad-air-13-purpura.webp` (Púrpura) · `aurapad-air-13-blanco-estrella.webp` (Blanco estrella) |
| auraBook Pro 16″ | `aurabook-pro-16-negro-espacial.webp` (Negro espacial) · `aurabook-pro-16-plata.webp` (Plata) |
| auraBook Pro 14″ | `aurabook-pro-14-negro-espacial.webp` (Negro espacial) · `aurabook-pro-14-plata.webp` (Plata) |
| auraBook Air 15″ | `aurabook-air-15-azul-cielo.webp` (Azul cielo) · `aurabook-air-15-plata.webp` (Plata) · `aurabook-air-15-blanco-estrella.webp` (Blanco estrella) · `aurabook-air-15-medianoche.webp` (Medianoche) |

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
| `inicio-acerca.webp` | 1600 × 1200 | #acerca-de-aura Acerca de AURA / Cupertino | La sede de AURA en Cupertino de noche, con su fachada de cristal atravesada por anillos de luz azul |
| `inicio-trade-in.webp` | 1600 × 1200 | #trade-in AURA Trade In | Un auraPhone nuevo se eleva sobre varios teléfonos antiguos que se deshacen en partículas de luz azul |

### auraphone.html

| Archivo | Tamaño | Dónde | Qué debe mostrar |
|---|---|---|---|
| `auraphone-hero.webp` | 1600 × 1200 | #descripcion Gama auraPhone | El auraPhone Duo abierto entre un auraPhone 18 Pro Max y un auraPhone 18 Pro, sobre fondo negro con un halo azul |
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
| `aurapad-pro.webp` | 1600 × 1200 | #pro auraPad Pro / AURA M5 | auraPad Pro inclinado de perfil, con AURA Pencil Pro apoyado sobre una pantalla que muestra una galaxia |
| `aurapad-accesorios-pencil.webp` | 1600 × 1200 | AURA Pencil Pro | AURA Pencil Pro dibujando un trazo dorado sobre la pantalla de un auraPad |
| `aurapad-accesorios-teclado.webp` | 1600 × 1200 | Magic Keyboard | auraPad Pro acoplado a Magic Keyboard en negro, abierto como un portátil |
| `aurapad-crear-ilustrar.webp` | 1600 × 1200 | Ilustrar | Ilustración de un paisaje nocturno a medio pintar en un auraPad Pro, con AURA Pencil Pro al lado |
| `aurapad-crear-video.webp` | 1600 × 1200 | Editar vídeo | Línea de tiempo de edición de vídeo con varias pistas en la pantalla de un auraPad Pro |
| `aurapad-crear-estudiar.webp` | 1600 × 1200 | Estudiar | Apuntes manuscritos de biología con esquemas en un auraPad Air azul sobre un escritorio |
| `aurapad-crear-trabajar.webp` | 1600 × 1200 | Trabajar | auraPad Pro con Magic Keyboard conectado a un monitor externo, con varias ventanas de auraPadOS 27 abiertas |
| `aurapad-crear-medir.webp` | 1600 × 1200 | Medir el mundo | auraPad Pro escaneando un salón, con una malla 3D azul superpuesta sobre los muebles |

### aurabook.html

| Archivo | Tamaño | Dónde | Qué debe mostrar |
|---|---|---|---|
| `aurabook-hero.webp` | 1920 × 1080 | #descripcion Gama auraBook | auraBook Pro entreabierto, visto de tres cuartos, con una galaxia azul en la pantalla sobre fondo negro |
| `aurabook-ecosistema.webp` | 1600 × 1200 | #ecosistema AURA Silicon / Ecosistema | Un auraBook Pro conectado a una gran pantalla en un estudio a media luz, junto a un auraPad, con teclado y ratón sobre una mesa de madera |
| `aurabook-perfil-desarrollo.webp` | 1600 × 1200 | Desarrollo | Una desarrolladora con un auraBook Pro lleno de código, junto a un monitor con la terminal abierta |
| `aurabook-perfil-fotografia.webp` | 1600 × 1200 | Fotografía | Un fotógrafo revela una foto de paisaje nocturno en un auraBook Pro, con la tarjeta SD en el lateral |
| `aurabook-perfil-video.webp` | 1600 × 1200 | Vídeo 8K | Una línea de tiempo de vídeo 8K con varias pistas en un auraBook Pro 16″, en una sala de montaje a oscuras |
| `aurabook-perfil-estudios.webp` | 1600 × 1200 | Estudios | Un estudiante toma apuntes con un auraBook Air en la mesa de una biblioteca |
| `aurabook-perfil-musica.webp` | 1600 × 1200 | Música | Una productora musical con un auraBook Pro, un teclado MIDI y unos auriculares en un estudio doméstico |

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

**Total:** 9 imágenes de producto + 47 de páginas = **56** imágenes (más las opcionales por color).

El logotipo (`aura.png`) ya está colocado.
