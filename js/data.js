/* ==========================================================================
   AURA — Catálogo (assets/js/data.js)
   Datos comprobados el 2 de octubre de 2026 (precios de España, IVA incluido).

   Todo el sitio lee de este archivo: inicio, páginas de familia, comparador,
   configurador, bolsa, buscador y Trade In. Para actualizar la gama basta con
   editar aquí; no hay que tocar ningún HTML.

   CÓMO ACTUALIZAR «LOS TRES MEJORES MODELOS»
   1. Cada familia (auraphone, aurapad, aurabook) debe tener EXACTAMENTE tres
      productos, con rank 1, 2 y 3 (1 = el mejor). El orden en pantalla sale
      de rank, no del orden en este archivo.
   2. Para sustituir un modelo: cambia su bloque en `products` (id, name,
      basePrice, colors, options, specs, highlights, image) o añade uno nuevo
      y borra el que sale de la gama. Reajusta los rank para que sigan siendo
      1, 2 y 3 sin repetir.
   3. `id` va en minúsculas con guiones y no debería cambiar una vez publicado
      (lo usan los enlaces comprar.html?producto=ID y las bolsas guardadas).
   4. `basePrice` es el precio en euros de la configuración base: la PRIMERA
      opción de cada grupo de `options` (su delta es siempre 0). El precio de
      cualquier otra configuración es basePrice + la suma de los delta.
   5. `specs` necesita una entrada por cada `key` de `compareRows` de su
      familia (valores concisos, unas 70 letras como mucho), salvo `precio`:
      esa fila la calcula el sistema desde basePrice («Desde 1.469 €»), así
      que el precio solo se escribe una vez, en basePrice.
   6. `image` es el nombre del hueco de imagen: assets/img/<image>.webp
      (también valen .png y .jpg, que se prueban después). Con esa imagen
      basta para todos los colores. Junto a ella:
      - `imageColor`: el id del acabado que se VE en esa foto ('' si no se
        aprecia ninguno, p. ej. una tableta de frente). Es el color que
        preseleccionan la tarjeta de modelo y el configurador, para que la
        etiqueta del acabado coincida con la foto.
      - `imageAlt`: el texto alternativo de la foto real (lo que se ve, no lo
        que se anuncia).
      - `imageVariants` (opcional): { idDeColor: alt } con las fotos por color
        que EXISTEN en assets/img como <image>-<color.id>.webp. Solo esas se
        piden; los demás colores usan la foto base directamente (sin probar
        archivos que no están ni parpadear al cambiar de color). Al añadir una
        foto por color, añade aquí su id.
   7. Cambia `updated` por la fecha de la revisión.

   CAMPOS OPCIONALES (el sitio funciona igual si faltan)
   - choice.requires = { idGrupo: [idOpción, …] }: la opción solo existe si en
     ese otro grupo está elegida una de las opciones indicadas (por ejemplo,
     128 GB de memoria solo con el chip AURA M5 Max de 40 núcleos de GPU).
     Al cambiar una selección, el configurador debe saltar a la primera opción
     válida de los grupos que dependan de ella.
   - choice.note: aclaración corta que acompaña a la opción.
   - product.availability = { preorder: 'AAAA-MM-DD', release: 'AAAA-MM-DD' }:
     el producto está anunciado pero todavía no se entrega. Las fechas son
     días LOCALES (sin hora). El estado se calcula solo cada día con
     AURA.catalog.availability(producto):
       antes de `preorder`              → «Próximamente» (aún no se puede reservar)
       desde `preorder` hasta `release` → «Reserva» (se reserva; se entrega en `release`)
       desde `release` (o sin el campo) → disponible
     No escribas el estado ni las frases («Reserva a partir del…»): salen de
     las fechas. Para probar otro día, añade ?hoy=AAAA-MM-DD a la URL.
   - family.description: frase de apoyo para tarjetas y cabeceras.

   Los colores `hex` son aproximaciones para pintar las muestras.
   ========================================================================== */

window.AURA_DATA = {
  updated: '2026-10-03',

  financing: { months: 24 },

  /* Envío (euros, IVA incluido). El estándar es gratuito. */
  shipping: { standard: 0, express: 9.95 },

  /* ------------------------------------------------------------------ */
  /* Familias                                                           */
  /* ------------------------------------------------------------------ */
  families: [
    {
      id: 'auraphone',
      name: 'auraPhone',
      page: 'auraphone.html',
      os: 'auraOS 27',
      tagline: 'Ahora se pliega. Y sigue siendo Pro.',
      description: 'Tres auraPhone con el chip AURA A20 Pro: el primero que se pliega y los dos Pro con cámara de apertura variable.',
      compareRows: [
        { key: 'chip', label: 'Chip' },
        { key: 'pantalla', label: 'Pantalla' },
        { key: 'camaras', label: 'Cámaras' },
        { key: 'bateria', label: 'Batería' },
        { key: 'almacenamiento', label: 'Almacenamiento' },
        { key: 'materiales', label: 'Materiales' },
        { key: 'conectividad', label: 'Conectividad' },
        { key: 'peso', label: 'Peso y grosor' },
        { key: 'sistema', label: 'Sistema operativo' },
        { key: 'precio', label: 'Precio' }
      ]
    },
    {
      id: 'aurapad',
      name: 'auraPad',
      page: 'aurapad.html',
      os: 'auraPadOS 27',
      tagline: 'Un lienzo para cada forma de crear.',
      description: 'La potencia Pro del chip AURA M5 en dos tamaños y el equilibrio del Air con una gran pantalla de 13 pulgadas.',
      compareRows: [
        { key: 'chip', label: 'Chip' },
        { key: 'pantalla', label: 'Pantalla' },
        { key: 'camaras', label: 'Cámaras' },
        { key: 'bateria', label: 'Batería' },
        { key: 'almacenamiento', label: 'Almacenamiento' },
        { key: 'accesorios', label: 'Accesorios' },
        { key: 'conectividad', label: 'Conectividad' },
        { key: 'peso', label: 'Peso y grosor' },
        { key: 'sistema', label: 'Sistema operativo' },
        { key: 'precio', label: 'Precio' }
      ]
    },
    {
      id: 'aurabook',
      name: 'auraBook',
      page: 'aurabook.html',
      os: 'auraOS 27',
      tagline: 'Increíblemente fino. Asombrosamente AURA.',
      description: 'Portátiles con AURA Silicon: dos Pro con pantalla Liquid Retina XDR y el Air más grande, fino y silencioso.',
      compareRows: [
        { key: 'chip', label: 'Chip' },
        { key: 'pantalla', label: 'Pantalla' },
        { key: 'memoria', label: 'Memoria' },
        { key: 'almacenamiento', label: 'Almacenamiento' },
        { key: 'bateria', label: 'Batería' },
        { key: 'puertos', label: 'Puertos' },
        { key: 'camara', label: 'Cámara' },
        { key: 'peso', label: 'Peso y grosor' },
        { key: 'sistema', label: 'Sistema operativo' },
        { key: 'precio', label: 'Precio' }
      ]
    }
  ],

  /* ------------------------------------------------------------------ */
  /* Productos: exactamente tres por familia, rank 1 = el mejor         */
  /* ------------------------------------------------------------------ */
  products: [

    /* ======================= auraPhone ======================= */
    {
      id: 'auraphone-duo',
      family: 'auraphone',
      rank: 1,
      name: 'auraPhone Duo',
      badge: 'Nuevo · Plegable',
      tagline: 'Dos pantallas. Un solo gesto.',
      description: 'El primer auraPhone plegable: una pantalla de 7,6 pulgadas que cabe en el bolsillo, estructura de titanio, Touch ID en el botón lateral y el chip AURA A20 Pro.',
      basePrice: 2339,
      availability: {
        preorder: '2026-10-16',
        release: '2026-10-23'
      },
      colors: [
        { id: 'cielo-nocturno', name: 'Cielo nocturno', hex: '#1f2530' },
        { id: 'blanco-estelar', name: 'Blanco estelar', hex: '#f1eee7' }
      ],
      options: [
        {
          id: 'almacenamiento',
          label: 'Almacenamiento',
          choices: [
            { id: '256gb', label: '256 GB', delta: 0 },
            { id: '512gb', label: '512 GB', delta: 250 },
            { id: '1tb', label: '1 TB', delta: 750 },
            { id: '2tb', label: '2 TB', delta: 1500 }
          ]
        }
      ],
      specs: {
        chip: 'AURA A20 Pro (2 nm) · CPU 6 núcleos · GPU 7 núcleos',
        pantalla: 'Plegable Super Retina XDR de 7,6″ + exterior de 5,4″ · 120 Hz',
        camaras: 'Dual Fusion 48 Mpx · teleobjetivo x2 · ultra gran angular 48 Mpx',
        bateria: 'Hasta 44 h de vídeo · 50 % en 20 min · MagSafe 25 W',
        almacenamiento: '256 GB · 512 GB · 1 TB · 2 TB',
        materiales: 'Titanio de grado 5 · Ceramic Shield 2 · IP68',
        conectividad: '5G · Wi-Fi 7 · Bluetooth 6 · USB-C (USB 3) · solo eSIM',
        peso: '254 g · 5,2 mm abierto · 10,4 mm cerrado',
        sistema: 'auraOS 27 con Split View y AURA Intelligence'
      },
      highlights: [
        'Se abre hasta 7,6 pulgadas: la pantalla más grande en un auraPhone',
        'Solo 5,2 mm de grosor abierto y 10,4 mm cerrado, con bisagra de titanio',
        'Dos pantallas Super Retina XDR con ProMotion a 120 Hz y 3.000 nits',
        'Chip AURA A20 Pro de 2 nm y Touch ID en el botón lateral',
        'auraOS 27 con Split View: dos apps a la vez, lado a lado',
        'Cámara dual Fusion de 48 Mpx y hasta 44 horas de vídeo'
      ],
      image: 'auraphone-duo',
      imageColor: 'blanco-estelar',
      imageAlt: 'auraPhone Duo plateado, entreabierto en vertical y con su triple cámara, sobre fondo negro'
    },
    {
      id: 'auraphone-18-pro-max',
      family: 'auraphone',
      rank: 2,
      name: 'auraPhone 18 Pro Max',
      badge: 'El más Pro',
      tagline: 'El Pro más grande. La luz, a tus órdenes.',
      description: 'Pantalla de 6,9 pulgadas, la primera cámara de auraPhone con apertura variable y hasta 43 horas de vídeo. Todo el AURA A20 Pro, sin concesiones.',
      basePrice: 1619,
      colors: [
        { id: 'negro', name: 'Negro', hex: '#1d1d1f' },
        { id: 'plata', name: 'Plata', hex: '#e3e4e5' },
        { id: 'azul-glacial', name: 'Azul glacial', hex: '#bcd0df' },
        { id: 'burdeos', name: 'Burdeos', hex: '#5a1a2a' }
      ],
      options: [
        {
          id: 'almacenamiento',
          label: 'Almacenamiento',
          choices: [
            { id: '256gb', label: '256 GB', delta: 0 },
            { id: '512gb', label: '512 GB', delta: 250 },
            { id: '1tb', label: '1 TB', delta: 750 },
            { id: '2tb', label: '2 TB', delta: 1500 }
          ]
        }
      ],
      specs: {
        chip: 'AURA A20 Pro (2 nm) · CPU 6 núcleos · GPU 7 núcleos',
        pantalla: 'Super Retina XDR de 6,9″ · ProMotion 120 Hz · 3.000 nits',
        camaras: 'Pro Fusion 48 Mpx · apertura variable f/1,48–f/4 · zoom x8',
        bateria: 'Hasta 43 h de vídeo · 50 % en 15 min · MagSafe 25 W',
        almacenamiento: '256 GB · 512 GB · 1 TB · 2 TB',
        materiales: 'Unibody de aluminio · Ceramic Shield 2 · IP68',
        conectividad: '5G · Wi-Fi 7 · Bluetooth 6 · USB-C (USB 3) · nano-SIM y eSIM',
        peso: '249 g · 8,8 mm',
        sistema: 'auraOS 27 con AURA Intelligence'
      },
      highlights: [
        'Primera cámara de auraPhone con apertura variable: de f/1,48 a f/4',
        'Chip AURA A20 Pro de 2 nm con una cámara de vapor el triple de grande',
        'Hasta 43 horas de reproducción de vídeo',
        'Super Retina XDR de 6,9 pulgadas con ProMotion y 3.000 nits',
        'Zoom de calidad óptica hasta x8 y teleobjetivo de 48 Mpx',
        'Hasta 2 TB de almacenamiento'
      ],
      image: 'auraphone-18-pro-max',
      imageColor: 'negro',
      imageAlt: 'Dos auraPhone 18 Pro Max de titanio oscuro, de frente y de espaldas, sobre fondo negro'
    },
    {
      id: 'auraphone-18-pro',
      family: 'auraphone',
      rank: 3,
      name: 'auraPhone 18 Pro',
      badge: 'Nuevo',
      tagline: 'Todo lo Pro. En la medida justa.',
      description: 'La misma cámara de apertura variable y el mismo chip AURA A20 Pro, en 6,3 pulgadas y 211 gramos.',
      basePrice: 1469,
      colors: [
        { id: 'negro', name: 'Negro', hex: '#1d1d1f' },
        { id: 'plata', name: 'Plata', hex: '#e3e4e5' },
        { id: 'azul-glacial', name: 'Azul glacial', hex: '#bcd0df' },
        { id: 'burdeos', name: 'Burdeos', hex: '#5a1a2a' }
      ],
      options: [
        {
          id: 'almacenamiento',
          label: 'Almacenamiento',
          choices: [
            { id: '256gb', label: '256 GB', delta: 0 },
            { id: '512gb', label: '512 GB', delta: 250 },
            { id: '1tb', label: '1 TB', delta: 750 },
            { id: '2tb', label: '2 TB', delta: 1500 }
          ]
        }
      ],
      specs: {
        chip: 'AURA A20 Pro (2 nm) · CPU 6 núcleos · GPU 7 núcleos',
        pantalla: 'Super Retina XDR de 6,3″ · ProMotion 120 Hz · 3.000 nits',
        camaras: 'Pro Fusion 48 Mpx · apertura variable f/1,48–f/4 · zoom x8',
        bateria: 'Hasta 34 h de vídeo · 50 % en 15 min · MagSafe 25 W',
        almacenamiento: '256 GB · 512 GB · 1 TB · 2 TB',
        materiales: 'Unibody de aluminio · Ceramic Shield 2 · IP68',
        conectividad: '5G · Wi-Fi 7 · Bluetooth 6 · USB-C (USB 3) · nano-SIM y eSIM',
        peso: '211 g · 8,8 mm',
        sistema: 'auraOS 27 con AURA Intelligence'
      },
      highlights: [
        'Toda la potencia Pro en 6,3 pulgadas y 211 gramos',
        'Cámara Fusion de 48 Mpx con apertura variable de f/1,48 a f/4',
        'Chip AURA A20 Pro con un 40 % más de rendimiento sostenido',
        'Hasta 34 horas de vídeo y el 50 % de carga en unos 15 minutos',
        'Dynamic Island con hasta tres actividades en directo a la vez',
        'Unibody de aluminio con Ceramic Shield 2 en cuatro acabados'
      ],
      image: 'auraphone-18-pro',
      imageColor: 'azul-glacial',
      imageAlt: 'auraPhone 18 Pro azul, tumbado de espaldas y con su triple cámara, sobre fondo negro'
    },

    /* ======================== auraPad ======================== */
    {
      id: 'aurapad-pro-13',
      family: 'aurapad',
      rank: 1,
      name: 'auraPad Pro 13″',
      badge: 'Máximo rendimiento',
      tagline: 'Un estudio entero en 5,1 mm de luz.',
      description: 'El auraPad más potente y también el más fino: chip AURA M5, pantalla Ultra Retina XDR con OLED en tándem y solo 579 gramos.',
      basePrice: 1649,
      colors: [
        { id: 'negro-espacial', name: 'Negro espacial', hex: '#2e2e30' },
        { id: 'plata', name: 'Plata', hex: '#e3e4e5' }
      ],
      options: [
        {
          id: 'almacenamiento',
          label: 'Almacenamiento',
          choices: [
            { id: '256gb', label: '256 GB', delta: 0, note: '12 GB de memoria' },
            { id: '512gb', label: '512 GB', delta: 250, note: '12 GB de memoria' },
            { id: '1tb', label: '1 TB', delta: 730, note: '16 GB de memoria' },
            { id: '2tb', label: '2 TB', delta: 1350, note: '16 GB de memoria' }
          ]
        },
        {
          id: 'conectividad',
          label: 'Conectividad',
          choices: [
            { id: 'wifi', label: 'Wi-Fi', delta: 0 },
            { id: 'wifi-5g', label: 'Wi-Fi + 5G', delta: 250, note: 'Solo eSIM' }
          ]
        },
        {
          id: 'vidrio',
          label: 'Vidrio de la pantalla',
          choices: [
            { id: 'estandar', label: 'Vidrio estándar', delta: 0 },
            {
              id: 'nanotexturizado',
              label: 'Vidrio nanotexturizado',
              delta: 130,
              note: 'Disponible con 1 TB o 2 TB',
              requires: { almacenamiento: ['1tb', '2tb'] }
            }
          ]
        }
      ],
      specs: {
        chip: 'AURA M5 · CPU hasta 10 núcleos · GPU 10 núcleos · hasta 16 GB',
        pantalla: 'Ultra Retina XDR de 13″ · OLED en tándem · ProMotion 120 Hz',
        camaras: 'Gran angular 12 Mpx + LiDAR · frontal Center Stage 12 Mpx',
        bateria: 'Hasta 10 h · 50 % en unos 30 min',
        almacenamiento: '256 GB · 512 GB · 1 TB · 2 TB',
        accesorios: 'AURA Pencil Pro · Magic Keyboard con trackpad háptico',
        conectividad: 'Thunderbolt / USB 4 · Wi-Fi 7 · Bluetooth 6 · 5G opcional',
        peso: '579 g · 5,1 mm',
        sistema: 'auraPadOS 27 con AURA Intelligence'
      },
      highlights: [
        'Chip AURA M5 con hasta 16 GB de memoria: el auraPad más potente',
        'Ultra Retina XDR con OLED en tándem y ProMotion a 120 Hz',
        'Solo 5,1 mm de grosor y 579 g: el más fino de la gama',
        'Hasta 1.600 nits de pico en HDR y contraste de 2.000.000:1',
        'Wi-Fi 7, Bluetooth 6 y 5G opcional con eSIM',
        'Compatible con AURA Pencil Pro y Magic Keyboard'
      ],
      image: 'aurapad-pro-13',
      imageColor: '',
      imageAlt: 'auraPad Pro 13″ de frente, con una pantalla de curvas naranjas, rojas, azules y violetas, sobre fondo negro'
    },
    {
      id: 'aurapad-pro-11',
      family: 'aurapad',
      rank: 2,
      name: 'auraPad Pro 11″',
      badge: 'Pro compacto',
      tagline: 'Potencia de estudio. Peso de cuaderno.',
      description: 'Todo el chip AURA M5 y la pantalla Ultra Retina XDR en 11 pulgadas y 444 gramos. Pro, para llevarlo siempre contigo.',
      basePrice: 1299,
      colors: [
        { id: 'negro-espacial', name: 'Negro espacial', hex: '#2e2e30' },
        { id: 'plata', name: 'Plata', hex: '#e3e4e5' }
      ],
      options: [
        {
          id: 'almacenamiento',
          label: 'Almacenamiento',
          choices: [
            { id: '256gb', label: '256 GB', delta: 0, note: '12 GB de memoria' },
            { id: '512gb', label: '512 GB', delta: 250, note: '12 GB de memoria' },
            { id: '1tb', label: '1 TB', delta: 730, note: '16 GB de memoria' },
            { id: '2tb', label: '2 TB', delta: 1350, note: '16 GB de memoria' }
          ]
        },
        {
          id: 'conectividad',
          label: 'Conectividad',
          choices: [
            { id: 'wifi', label: 'Wi-Fi', delta: 0 },
            { id: 'wifi-5g', label: 'Wi-Fi + 5G', delta: 250, note: 'Solo eSIM' }
          ]
        },
        {
          id: 'vidrio',
          label: 'Vidrio de la pantalla',
          choices: [
            { id: 'estandar', label: 'Vidrio estándar', delta: 0 },
            {
              id: 'nanotexturizado',
              label: 'Vidrio nanotexturizado',
              delta: 130,
              note: 'Disponible con 1 TB o 2 TB',
              requires: { almacenamiento: ['1tb', '2tb'] }
            }
          ]
        }
      ],
      specs: {
        chip: 'AURA M5 · CPU hasta 10 núcleos · GPU 10 núcleos · hasta 16 GB',
        pantalla: 'Ultra Retina XDR de 11″ · OLED en tándem · ProMotion 120 Hz',
        camaras: 'Gran angular 12 Mpx + LiDAR · frontal Center Stage 12 Mpx',
        bateria: 'Hasta 10 h · 50 % en unos 30 min',
        almacenamiento: '256 GB · 512 GB · 1 TB · 2 TB',
        accesorios: 'AURA Pencil Pro · Magic Keyboard con trackpad háptico',
        conectividad: 'Thunderbolt / USB 4 · Wi-Fi 7 · Bluetooth 6 · 5G opcional',
        peso: '444 g · 5,3 mm',
        sistema: 'auraPadOS 27 con AURA Intelligence'
      },
      highlights: [
        'Toda la potencia del chip AURA M5 en 444 gramos',
        'Ultra Retina XDR de 11 pulgadas con OLED en tándem',
        'ProMotion adaptativo de 10 a 120 Hz',
        'Thunderbolt / USB 4 para monitores y discos a 40 Gb/s',
        'Face ID y cámara frontal Center Stage en horizontal',
        'Carga rápida: hasta el 50 % en unos 30 minutos'
      ],
      image: 'aurapad-pro-11',
      imageColor: 'negro-espacial',
      imageAlt: 'auraPad Pro 11″ en negro espacial, de espaldas e inclinado, con su módulo de cámaras, sobre fondo negro'
    },
    {
      id: 'aurapad-air-13',
      family: 'aurapad',
      rank: 3,
      name: 'auraPad Air 13″',
      badge: 'Más versátil',
      tagline: 'Ligero de llevar. Enorme al crear.',
      description: 'Chip AURA M4, 12 GB de memoria y una gran pantalla Liquid Retina de 13 pulgadas, en cuatro colores.',
      basePrice: 999,
      colors: [
        { id: 'gris-espacial', name: 'Gris espacial', hex: '#7d7e80' },
        { id: 'azul', name: 'Azul', hex: '#c9d6e2' },
        { id: 'purpura', name: 'Púrpura', hex: '#dad3e3' },
        { id: 'blanco-estrella', name: 'Blanco estrella', hex: '#f0e9de' }
      ],
      options: [
        {
          id: 'almacenamiento',
          label: 'Almacenamiento',
          choices: [
            { id: '128gb', label: '128 GB', delta: 0 },
            { id: '256gb', label: '256 GB', delta: 140 },
            { id: '512gb', label: '512 GB', delta: 380 },
            { id: '1tb', label: '1 TB', delta: 770 }
          ]
        },
        {
          id: 'conectividad',
          label: 'Conectividad',
          choices: [
            { id: 'wifi', label: 'Wi-Fi', delta: 0 },
            { id: 'wifi-5g', label: 'Wi-Fi + 5G', delta: 170, note: 'Solo eSIM' }
          ]
        }
      ],
      specs: {
        chip: 'AURA M4 · CPU 8 núcleos · GPU 9 núcleos · 12 GB',
        pantalla: 'Liquid Retina de 13″ · 600 nits · gama P3',
        camaras: 'Gran angular 12 Mpx · frontal Center Stage 12 Mpx',
        bateria: 'Hasta 10 h de navegación o vídeo',
        almacenamiento: '128 GB · 256 GB · 512 GB · 1 TB',
        accesorios: 'AURA Pencil Pro · Magic Keyboard',
        conectividad: 'USB-C (USB 3) · Wi-Fi 7 · Bluetooth 6 · 5G opcional',
        peso: '616 g · 6,1 mm',
        sistema: 'auraPadOS 27 con AURA Intelligence'
      },
      highlights: [
        'Chip AURA M4 con 12 GB de memoria: hasta un 30 % más rápido que el Air anterior',
        'Gran pantalla Liquid Retina de 13 pulgadas con 600 nits',
        'Cuatro acabados: gris espacial, azul, púrpura y blanco estrella',
        'Wi-Fi 7 y Bluetooth 6; 5G opcional con eSIM',
        'Fino y ligero: 6,1 mm y 616 g',
        'Compatible con AURA Pencil Pro y Magic Keyboard'
      ],
      image: 'aurapad-air-13',
      imageColor: 'azul',
      imageAlt: 'auraPad Air 13″ azul, de espaldas y en vertical, con la cámara en la esquina, sobre fondo negro',
      imageVariants: {
        'gris-espacial': 'auraPad Air 13″ en gris espacial, de espaldas, inclinado y flotando sobre fondo negro'
      }
    },

    /* ======================= auraBook ======================== */
    {
      id: 'aurabook-pro-16',
      family: 'aurabook',
      rank: 1,
      name: 'auraBook Pro 16″',
      badge: 'El más potente',
      tagline: 'Potencia sin techo. Batería sin prisa.',
      description: 'El auraBook más capaz: chip AURA M5 Pro o M5 Max, pantalla Liquid Retina XDR de 16,2 pulgadas y hasta 24 horas de autonomía.',
      basePrice: 3449,
      colors: [
        { id: 'negro-espacial', name: 'Negro espacial', hex: '#2e2c2e' },
        { id: 'plata', name: 'Plata', hex: '#e3e4e5' }
      ],
      options: [
        {
          id: 'chip',
          label: 'Chip',
          choices: [
            { id: 'm5-pro-18-20', label: 'AURA M5 Pro · CPU 18 núcleos · GPU 20 núcleos', delta: 0 },
            { id: 'm5-max-18-32', label: 'AURA M5 Max · CPU 18 núcleos · GPU 32 núcleos', delta: 820, note: 'Con 36 GB y a partir de 2 TB' },
            { id: 'm5-max-18-40', label: 'AURA M5 Max · CPU 18 núcleos · GPU 40 núcleos', delta: 1090, note: 'Con 48 GB o más y a partir de 2 TB' }
          ]
        },
        {
          id: 'memoria',
          label: 'Memoria unificada',
          choices: [
            { id: '24gb', label: '24 GB', delta: 0, requires: { chip: ['m5-pro-18-20'] } },
            { id: '36gb', label: '36 GB', delta: 330, requires: { chip: ['m5-max-18-32'] } },
            { id: '48gb', label: '48 GB', delta: 660, requires: { chip: ['m5-pro-18-20', 'm5-max-18-40'] } },
            { id: '64gb', label: '64 GB', delta: 1100, requires: { chip: ['m5-pro-18-20', 'm5-max-18-40'] } },
            { id: '128gb', label: '128 GB', delta: 2860, note: 'Solo con M5 Max de 40 núcleos de GPU', requires: { chip: ['m5-max-18-40'] } }
          ]
        },
        {
          id: 'almacenamiento',
          label: 'Almacenamiento SSD',
          choices: [
            { id: '1tb', label: '1 TB', delta: 0, requires: { chip: ['m5-pro-18-20'] } },
            { id: '2tb', label: '2 TB', delta: 550 },
            { id: '4tb', label: '4 TB', delta: 1650 },
            { id: '8tb', label: '8 TB', delta: 3850, note: 'Solo con M5 Max', requires: { chip: ['m5-max-18-32', 'm5-max-18-40'] } }
          ]
        },
        {
          id: 'pantalla',
          label: 'Pantalla',
          choices: [
            { id: 'estandar', label: 'Pantalla estándar', delta: 0 },
            { id: 'nanotexturizada', label: 'Pantalla nanotexturizada', delta: 165 }
          ]
        }
      ],
      specs: {
        chip: 'AURA M5 Pro o M5 Max · CPU 18 núcleos · GPU hasta 40 núcleos',
        pantalla: 'Liquid Retina XDR de 16,2″ · ProMotion 120 Hz · 1.600 nits',
        memoria: 'De 24 GB a 128 GB de memoria unificada',
        almacenamiento: 'SSD de 1 TB a 8 TB',
        bateria: 'Hasta 24 h de streaming de vídeo',
        puertos: '3 × Thunderbolt 5 · HDMI · SDXC · MagSafe 3 · auriculares',
        camara: 'Center Stage de 12 Mpx · vídeo 1080p',
        peso: '2,14 kg · 1,68 cm',
        sistema: 'auraOS 27 con AURA Intelligence'
      },
      highlights: [
        'Chip AURA M5 Pro o M5 Max: IA hasta 8 veces más rápida que con el AURA M1 Max',
        'Liquid Retina XDR de 16,2 pulgadas con 1.600 nits de pico y ProMotion a 120 Hz',
        'Hasta 24 horas de autonomía, la mayor en un auraBook',
        'Thunderbolt 5, HDMI, lector SDXC y MagSafe 3, sin adaptadores',
        'Hasta 128 GB de memoria unificada y 8 TB de SSD',
        'Cámara Center Stage de 12 Mpx y seis altavoces con audio espacial'
      ],
      image: 'aurabook-pro-16',
      imageColor: '',
      imageAlt: 'auraBook Pro 16″ entreabierto de frente, con el teclado bañado en la luz violeta y azul de la pantalla, sobre negro'
    },
    {
      id: 'aurabook-pro-14',
      family: 'aurabook',
      rank: 2,
      name: 'auraBook Pro 14″',
      badge: 'El favorito Pro',
      tagline: 'Pro de verdad. Portátil de verdad.',
      description: 'Potencia profesional en 1,55 kg: elige AURA M5, M5 Pro o M5 Max tras una pantalla Liquid Retina XDR de 14,2 pulgadas.',
      basePrice: 2229,
      colors: [
        { id: 'negro-espacial', name: 'Negro espacial', hex: '#2e2c2e' },
        { id: 'plata', name: 'Plata', hex: '#e3e4e5' }
      ],
      options: [
        {
          id: 'chip',
          label: 'Chip',
          choices: [
            { id: 'm5-10-10', label: 'AURA M5 · CPU 10 núcleos · GPU 10 núcleos', delta: 0 },
            { id: 'm5-pro-15-16', label: 'AURA M5 Pro · CPU 15 núcleos · GPU 16 núcleos', delta: 500, note: 'Con 24 GB o más' },
            { id: 'm5-pro-18-20', label: 'AURA M5 Pro · CPU 18 núcleos · GPU 20 núcleos', delta: 750, note: 'Con 24 GB o más' },
            { id: 'm5-max-18-32', label: 'AURA M5 Max · CPU 18 núcleos · GPU 32 núcleos', delta: 1520, note: 'Con 36 GB y a partir de 2 TB' },
            { id: 'm5-max-18-40', label: 'AURA M5 Max · CPU 18 núcleos · GPU 40 núcleos', delta: 1850, note: 'Con 48 GB o más y a partir de 2 TB' }
          ]
        },
        {
          id: 'memoria',
          label: 'Memoria unificada',
          choices: [
            { id: '16gb', label: '16 GB', delta: 0, requires: { chip: ['m5-10-10'] } },
            { id: '24gb', label: '24 GB', delta: 220, requires: { chip: ['m5-10-10', 'm5-pro-15-16', 'm5-pro-18-20'] } },
            { id: '32gb', label: '32 GB', delta: 440, requires: { chip: ['m5-10-10'] } },
            { id: '36gb', label: '36 GB', delta: 550, requires: { chip: ['m5-max-18-32'] } },
            { id: '48gb', label: '48 GB', delta: 880, requires: { chip: ['m5-pro-15-16', 'm5-pro-18-20', 'm5-max-18-40'] } },
            { id: '64gb', label: '64 GB', delta: 1320, requires: { chip: ['m5-pro-18-20', 'm5-max-18-40'] } },
            { id: '128gb', label: '128 GB', delta: 3080, note: 'Solo con M5 Max de 40 núcleos de GPU', requires: { chip: ['m5-max-18-40'] } }
          ]
        },
        {
          id: 'almacenamiento',
          label: 'Almacenamiento SSD',
          choices: [
            { id: '1tb', label: '1 TB', delta: 0, requires: { chip: ['m5-10-10', 'm5-pro-15-16', 'm5-pro-18-20'] } },
            { id: '2tb', label: '2 TB', delta: 550 },
            { id: '4tb', label: '4 TB', delta: 1650 },
            { id: '8tb', label: '8 TB', delta: 3850, note: 'Solo con M5 Max', requires: { chip: ['m5-max-18-32', 'm5-max-18-40'] } }
          ]
        },
        {
          id: 'pantalla',
          label: 'Pantalla',
          choices: [
            { id: 'estandar', label: 'Pantalla estándar', delta: 0 },
            { id: 'nanotexturizada', label: 'Pantalla nanotexturizada', delta: 165 }
          ]
        }
      ],
      specs: {
        chip: 'AURA M5, M5 Pro o M5 Max · CPU de 10 a 18 núcleos',
        pantalla: 'Liquid Retina XDR de 14,2″ · ProMotion 120 Hz · 1.600 nits',
        memoria: 'De 16 GB a 128 GB de memoria unificada',
        almacenamiento: 'SSD de 1 TB a 8 TB',
        bateria: 'Hasta 24 h de streaming de vídeo',
        puertos: '3 × Thunderbolt 4 o 5 · HDMI · SDXC · MagSafe 3 · auriculares',
        camara: 'Center Stage de 12 Mpx · vídeo 1080p',
        peso: '1,55 kg · 1,55 cm',
        sistema: 'auraOS 27 con AURA Intelligence'
      },
      highlights: [
        'Potencia profesional en 1,55 kg y 14,2 pulgadas',
        'Chip AURA M5, ampliable a M5 Pro o M5 Max',
        'Liquid Retina XDR con 1.600 nits de pico y ProMotion a 120 Hz',
        'Hasta 24 horas de autonomía',
        'HDMI, lector SDXC, MagSafe 3 y tres puertos Thunderbolt',
        '1 TB de SSD de serie'
      ],
      image: 'aurabook-pro-14',
      imageColor: '',
      imageAlt: 'auraBook Pro 14″ entreabierto en tres cuartos, con un atardecer en la pantalla y un halo cian sobre la mesa'
    },
    {
      id: 'aurabook-air-15',
      family: 'aurabook',
      rank: 3,
      name: 'auraBook Air 15″',
      badge: 'El más ligero',
      tagline: 'Increíblemente fino. Silencio absoluto.',
      description: 'Una pantalla de 15,3 pulgadas en 1,15 cm de grosor, sin ventilador y con hasta 18 horas de batería.',
      basePrice: 1729,
      colors: [
        { id: 'azul-cielo', name: 'Azul cielo', hex: '#c8d8e6' },
        { id: 'plata', name: 'Plata', hex: '#e3e4e5' },
        { id: 'blanco-estrella', name: 'Blanco estrella', hex: '#f0e5d3' },
        { id: 'medianoche', name: 'Medianoche', hex: '#2e3641' }
      ],
      options: [
        {
          id: 'memoria',
          label: 'Memoria unificada',
          choices: [
            { id: '16gb', label: '16 GB', delta: 0 },
            { id: '24gb', label: '24 GB', delta: 220 },
            { id: '32gb', label: '32 GB', delta: 440 }
          ]
        },
        {
          id: 'almacenamiento',
          label: 'Almacenamiento SSD',
          choices: [
            { id: '512gb', label: '512 GB', delta: 0 },
            { id: '1tb', label: '1 TB', delta: 330 },
            { id: '2tb', label: '2 TB', delta: 880 },
            { id: '4tb', label: '4 TB', delta: 1980 }
          ]
        }
      ],
      specs: {
        chip: 'AURA M5 · CPU 10 núcleos · GPU 10 núcleos',
        pantalla: 'Liquid Retina de 15,3″ · 500 nits · gama P3',
        memoria: '16 GB, 24 GB o 32 GB de memoria unificada',
        almacenamiento: 'SSD de 512 GB a 4 TB',
        bateria: 'Hasta 18 h de streaming de vídeo',
        puertos: '2 × Thunderbolt 4 · MagSafe 3 · auriculares',
        camara: 'Center Stage de 12 Mpx · vídeo 1080p',
        peso: '1,51 kg · 1,15 cm',
        sistema: 'auraOS 27 con AURA Intelligence'
      },
      highlights: [
        'Liquid Retina de 15,3 pulgadas en solo 1,15 cm y 1,51 kg',
        'Chip AURA M5 con GPU de 10 núcleos, pensado para la IA',
        'Hasta 18 horas de autonomía',
        'Sin ventilador: silencio total',
        '16 GB de memoria y 512 GB de SSD de serie',
        'Cuatro acabados: azul cielo, plata, blanco estrella y medianoche'
      ],
      image: 'aurabook-air-15',
      imageColor: '',
      imageAlt: 'auraBook Air 15″ entreabierto, con la pantalla rosa, naranja y azul iluminando el teclado en la oscuridad'
    }
  ],

  /* ------------------------------------------------------------------ */
  /* AuraCare+ (precio por familia, se añade por unidad)                */
  /* ------------------------------------------------------------------ */
  care: {
    name: 'AuraCare+',
    description: 'Dos años de cobertura con reparaciones por daños accidentales y asistencia prioritaria de especialistas AURA.',
    prices: { auraphone: 229, aurapad: 149, aurabook: 399 }
  },

  /* ------------------------------------------------------------------ */
  /* AURA Trade In: valor = max × factor del estado, como mucho `cap`.   */
  /* La cinta de la cabecera y las páginas calculan «hasta X €» desde    */
  /* aquí (AURA.tradeIn.max()): no escribas la cifra en ningún HTML.     */
  /* ------------------------------------------------------------------ */
  tradeIn: {
    cap: 800,
    conditions: [
      { id: 'perfecto', label: 'Como nuevo', factor: 1, description: 'Sin arañazos ni golpes. Pantalla, batería y botones, impecables.' },
      { id: 'bueno', label: 'Buen estado', factor: 0.75, description: 'Marcas leves de uso. La pantalla está intacta y todo funciona.' },
      { id: 'danado', label: 'Con daños', factor: 0.35, description: 'Pantalla o carcasa rotas, o algo que no funciona. Aun así, vale algo.' }
    ],
    devices: [
      /* auraPhone */
      { id: 'auraphone-17-pro-max', family: 'auraphone', name: 'auraPhone 17 Pro Max', max: 800 },
      { id: 'auraphone-17-pro', family: 'auraphone', name: 'auraPhone 17 Pro', max: 720 },
      { id: 'auraphone-16-pro-max', family: 'auraphone', name: 'auraPhone 16 Pro Max', max: 620 },
      { id: 'auraphone-air', family: 'auraphone', name: 'auraPhone Air', max: 600 },
      { id: 'auraphone-16-pro', family: 'auraphone', name: 'auraPhone 16 Pro', max: 540 },
      { id: 'auraphone-17', family: 'auraphone', name: 'auraPhone 17', max: 510 },
      { id: 'auraphone-15-pro-max', family: 'auraphone', name: 'auraPhone 15 Pro Max', max: 430 },
      { id: 'auraphone-15-pro', family: 'auraphone', name: 'auraPhone 15 Pro', max: 380 },

      /* auraPad */
      { id: 'aurapad-pro-13-m4', family: 'aurapad', name: 'auraPad Pro 13″ (AURA M4)', max: 640 },
      { id: 'aurapad-pro-11-m4', family: 'aurapad', name: 'auraPad Pro 11″ (AURA M4)', max: 520 },
      { id: 'aurapad-pro-12-9-m2', family: 'aurapad', name: 'auraPad Pro 12,9″ (AURA M2)', max: 420 },
      { id: 'aurapad-air-13-m3', family: 'aurapad', name: 'auraPad Air 13″ (AURA M3)', max: 400 },
      { id: 'aurapad-pro-11-m2', family: 'aurapad', name: 'auraPad Pro 11″ (AURA M2)', max: 330 },
      { id: 'aurapad-air-11-m3', family: 'aurapad', name: 'auraPad Air 11″ (AURA M3)', max: 310 },
      { id: 'aurapad-mini-a17-pro', family: 'aurapad', name: 'auraPad mini (AURA A17 Pro)', max: 250 },
      { id: 'aurapad-10-gen', family: 'aurapad', name: 'auraPad 10.ª generación', max: 180 },

      /* auraBook */
      { id: 'aurabook-pro-16-m4-pro', family: 'aurabook', name: 'auraBook Pro 16″ (AURA M4 Pro)', max: 800 },
      { id: 'aurabook-pro-14-m4-pro', family: 'aurabook', name: 'auraBook Pro 14″ (AURA M4 Pro)', max: 720 },
      { id: 'aurabook-pro-16-m3-pro', family: 'aurabook', name: 'auraBook Pro 16″ (AURA M3 Pro)', max: 640 },
      { id: 'aurabook-pro-14-m4', family: 'aurabook', name: 'auraBook Pro 14″ (AURA M4)', max: 620 },
      { id: 'aurabook-air-15-m4', family: 'aurabook', name: 'auraBook Air 15″ (AURA M4)', max: 520 },
      { id: 'aurabook-air-13-m4', family: 'aurabook', name: 'auraBook Air 13″ (AURA M4)', max: 450 },
      { id: 'aurabook-air-15-m3', family: 'aurabook', name: 'auraBook Air 15″ (AURA M3)', max: 400 },
      { id: 'aurabook-air-13-m2', family: 'aurabook', name: 'auraBook Air 13″ (AURA M2)', max: 280 }
    ]
  }
};
