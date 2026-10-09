/* ==========================================================================
   AURA — login.html (assets/js/pages/login.js)
   Inicio de sesión con el ID de AURA (simulado en este navegador).
   - Validación en línea con AURA.ui.form; el error de AURA.auth.login se
     muestra como mensaje de formulario (.aura-alert--error) dentro del propio
     formulario, sin decir cuál de los dos datos falla, con la háptica de
     error del sistema (AURA.ui.haptic, solo en táctil).
   - Al entrar: vuelve a ?volver= (solo páginas internas del sitio) o a la cuenta.
   - Con sesión ya iniciada: ofrece continuar o cerrar sesión.
   - Hoja «Recupera tu ID de AURA» con instrucciones simuladas.
   - El doble envío lo impide AURA.ui.busy (sin banderas propias).
   ========================================================================== */
(function () {
  'use strict';

  var AURA = window.AURA;
  if (!AURA || !AURA.auth || !AURA.ui) { return; }

  /* Háptica del sistema (solo táctil), en el mismo instante que lo visual. */
  function haptic(kind) { if (typeof AURA.ui.haptic === 'function') { AURA.ui.haptic(kind); } }

  /* ---- Destino seguro (?volver=) ---------------------------------------- */

  /* Solo páginas del mapa del sitio, como ruta relativa: nada de «//», «:» ni
     rutas absolutas. login.html y registro.html no cuentan (serían un bucle). */
  var PAGINAS = ['index.html', 'auraphone.html', 'aurapad.html', 'aurabook.html', 'comprar.html',
    'bolsa.html', 'checkout.html', 'cuenta.html', 'comparar.html', 'trade-in.html', 'acerca.html',
    'soporte.html', 'legal.html'];

  function destinoSeguro(valor) {
    if (typeof valor !== 'string') { return ''; }
    valor = valor.trim();
    if (valor === 'index.html' || valor === '../index.html') { return '../index.html'; }
    var m = /^([a-z0-9-]+\.html)(\?[A-Za-z0-9_=&%.-]*)?(#[A-Za-z0-9_-]*)?$/.exec(valor);
    return m && PAGINAS.indexOf(m[1]) !== -1 ? valor : '';
  }

  function leerVolver() {
    try { return destinoSeguro(new window.URLSearchParams(window.location.search).get('volver')); }
    catch (e) { return ''; }
  }

  var volver = leerVolver();
  var destino = volver || 'cuenta.html';

  function etiquetaDestino(d) {
    var pagina = d.split(/[?#]/)[0];
    var etiquetas = {
      'cuenta.html': 'Ir a tu cuenta',
      'checkout.html': 'Continuar con el pedido',
      'bolsa.html': 'Volver a la bolsa',
      'comprar.html': 'Volver a la compra',
      'trade-in.html': 'Volver a AURA Trade In',
      '../index.html': 'Volver al inicio',
      'index.html': 'Volver al inicio'
    };
    return etiquetas[pagina] || 'Continuar';
  }

  /* «Crear uno ahora» conserva ?volver. */
  Array.prototype.forEach.call(document.querySelectorAll('[data-login-registro]'), function (a) {
    a.setAttribute('href', 'registro.html' + (volver ? '?volver=' + encodeURIComponent(volver) : ''));
  });

  /* ---- Elementos -------------------------------------------------------- */

  var form = document.getElementById('login-form');
  var titulo = document.getElementById('login-titulo');
  var entradilla = document.getElementById('login-entradilla');
  var vistaSesion = document.getElementById('login-sesion');
  var alt = document.getElementById('login-alt');
  if (!form || !titulo || !entradilla || !vistaSesion) { return; }

  var campoEmail = form.elements.email;
  var campoClave = form.elements.password;
  var botonEntrar = form.querySelector('[type="submit"]');
  var continuar = vistaSesion.querySelector('[data-login-continuar]');
  var salir = vistaSesion.querySelector('[data-login-salir]');
  var extraCuenta = vistaSesion.querySelector('[data-login-cuenta-extra]');

  var TITULO = titulo.textContent;
  var ENTRADILLA = entradilla.textContent;
  /* Login correcto: AURA.auth emite aura:auth antes de que la página se vaya;
     sin esto, la vista «ya has iniciado sesión» parpadearía un instante. */
  var saliendo = false;
  var restaurar = null;        // devuelve el botón a su estado normal

  /* ---- Vista: formulario o sesión ya iniciada --------------------------- */

  function pintar() {
    if (saliendo) { return; }
    var u = AURA.auth.user();
    if (u) {
      titulo.textContent = u.nombre ? 'Hola de nuevo, ' + u.nombre + '.' : 'Ya has iniciado sesión.';
      entradilla.textContent = 'Has iniciado sesión con el ID de AURA ' + u.email + '.';
      form.hidden = true;
      if (alt) { alt.hidden = true; }
      vistaSesion.hidden = false;
      continuar.setAttribute('href', destino);
      continuar.textContent = etiquetaDestino(destino);
      extraCuenta.hidden = destino.split(/[?#]/)[0] === 'cuenta.html';
    } else {
      titulo.textContent = TITULO;
      entradilla.textContent = ENTRADILLA;
      form.hidden = false;
      if (alt) { alt.hidden = false; }
      vistaSesion.hidden = true;
    }
  }

  salir.addEventListener('click', function () {
    var u = AURA.auth.user();
    AURA.auth.logout();                    // emite aura:auth → pintar()
    if (u && u.email) { campoEmail.value = u.email; }
    campoClave.value = '';
    AURA.ui.toast({ kind: 'status', title: 'Has cerrado sesión', text: 'Puedes entrar con este u otro ID de AURA.' });
    (u && u.email ? campoClave : campoEmail).focus();
  });

  document.addEventListener('aura:auth', pintar);

  /* ---- Mensaje de error del formulario ---------------------------------- */

  var alerta = null;

  function quitarAlerta() {
    if (!alerta) { return; }
    if (alerta.parentNode) { alerta.parentNode.removeChild(alerta); }
    alerta = null;
    campoClave.setAttribute('aria-describedby', 'login-password-error');
  }

  function mostrarAlerta(texto) {
    quitarAlerta();
    alerta = document.createElement('div');
    alerta.className = 'aura-alert aura-alert--error';
    alerta.id = 'login-alerta';
    alerta.setAttribute('role', 'alert');
    alerta.innerHTML =
      '<i class="bi bi-exclamation-octagon-fill" aria-hidden="true"></i>' +
      '<p class="aura-alert__title">No hemos podido iniciar sesión</p>' +
      '<p class="aura-alert__text"></p>';
    alerta.querySelector('.aura-alert__text').textContent = texto;
    form.insertBefore(alerta, form.firstChild);
    campoClave.setAttribute('aria-describedby', 'login-password-error login-alerta');
  }

  /* ---- Inicio de sesión ------------------------------------------------- */

  AURA.ui.form(form, {
    email: { required: 'Escribe el correo de tu ID de AURA.', email: true },
    password: { required: 'Escribe tu contraseña.' }
  }, {
    onSubmit: function (v, e, api) {
      quitarAlerta();
      restaurar = AURA.ui.busy(botonEntrar, 'Iniciando sesión…');
      saliendo = true;
      AURA.auth.login(v.email, v.password, { remember: !!v.recordar }).then(function (r) {
        if (r && r.ok) {
          window.location.replace(destino);
          return;
        }
        saliendo = false;
        if (restaurar) { restaurar(); restaurar = null; }
        /* Los campos tenían buen formato, pero el par no coincide: sin marcas
           verdes que contradigan el mensaje. */
        api.clear();
        mostrarAlerta((r && r.error) || 'El ID de AURA o la contraseña no coinciden. Revisa los datos e inténtalo de nuevo.');
        haptic('error');                   // el mismo rechazo que un envío con errores (AURA.ui.form)
        campoClave.focus();
        try { campoClave.select(); } catch (e) { /* nada */ }
      });
    }
  });

  /* ---- Hoja «Recupera tu ID de AURA» ------------------------------------ */

  var hoja = document.getElementById('recuperar');
  if (hoja) {
    var pasoPedir = hoja.querySelector('[data-recuperar-paso="pedir"]');
    var pasoHecho = hoja.querySelector('[data-recuperar-paso="hecho"]');
    var recEmail = document.getElementById('recuperar-email');
    var recCorreo = hoja.querySelector('[data-recuperar-correo]');
    var recEstado = hoja.querySelector('[data-recuperar-estado]');

    var mostrarPaso = function (paso) {
      pasoPedir.hidden = paso !== 'pedir';
      pasoHecho.hidden = paso !== 'hecho';
    };

    var recForm = AURA.ui.form(pasoPedir, {
      email: { required: 'Escribe el correo de tu ID de AURA.', email: true }
    }, {
      onSubmit: function (v) {
        var correo = String(v.email || '').trim();
        recCorreo.textContent = correo;
        mostrarPaso('hecho');
        haptic('exito');
        recEstado.textContent = 'Instrucciones enviadas a ' + correo + '. Es una simulación: no se envía ningún correo.';
        var boton = pasoHecho.querySelector('button');
        if (boton) { boton.focus(); }
      }
    });

    hoja.addEventListener('aura:sheet-open', function () {
      mostrarPaso('pedir');
      recEstado.textContent = '';
      var escrito = String(campoEmail.value || '').trim();
      if (!recEmail.value && AURA.auth.emailPattern && AURA.auth.emailPattern.test(escrito)) { recEmail.value = escrito; }
      recEmail.focus();
    });

    hoja.addEventListener('aura:sheet-close', function () {
      mostrarPaso('pedir');
      recEstado.textContent = '';
      if (recForm) { recForm.clear(); }
    });
  }

  /* ---- Volver con el botón «Atrás» (caché de páginas) ------------------- */

  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) { return; }
    saliendo = false;
    if (restaurar) { restaurar(); restaurar = null; }
    pintar();
  });

  pintar();

  /* Como en el prototipo, el primer campo llega enfocado; solo con ratón o
     trackpad (en el móvil abriría el teclado sin que nadie lo pida). */
  try {
    if (!form.hidden && window.matchMedia('(pointer: fine)').matches) { campoEmail.focus({ preventScroll: true }); }
  } catch (e) { /* nada */ }
})();
