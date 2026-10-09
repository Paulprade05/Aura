/* ==========================================================================
   AURA — registro.html (assets/js/pages/registro.js)
   Alta de un ID de AURA (simulado en este navegador).
   - Validación en línea con AURA.ui.form; los requisitos de la contraseña
     (.aura-rules) los marca aura-ui.js mientras se escribe.
   - Las condiciones se aceptan al registrarse (texto legal sobre el botón,
     como en el prototipo): no hay casilla.
   - Correo ya registrado → error en línea en el propio campo.
   - Éxito → sesión iniciada y vuelta inmediata a ?volver= (solo páginas
     internas del sitio) o a la cuenta, que da la bienvenida.
   - El doble envío lo impide AURA.ui.busy (sin banderas propias).
   ========================================================================== */
(function () {
  'use strict';

  var AURA = window.AURA;
  if (!AURA || !AURA.auth || !AURA.ui) { return; }

  /* ---- Destino seguro (?volver=) ---------------------------------------- */

  var PAGINAS = ['index.html', 'auraphone.html', 'aurapad.html', 'aurabook.html', 'comprar.html',
    'bolsa.html', 'checkout.html', 'cuenta.html', 'comparar.html', 'trade-in.html', 'acerca.html',
    'soporte.html', 'legal.html'];

  function destinoSeguro(valor) {
    if (typeof valor !== 'string') { return ''; }
    valor = valor.trim();
    var m = /^([a-z0-9-]+\.html)(\?[A-Za-z0-9_=&%.-]*)?(#[A-Za-z0-9_-]*)?$/.exec(valor);
    return m && PAGINAS.indexOf(m[1]) !== -1 ? valor : '';
  }

  var volver = '';
  try { volver = destinoSeguro(new window.URLSearchParams(window.location.search).get('volver')); } catch (e) { volver = ''; }
  var destino = volver || 'cuenta.html';

  /* «Iniciar sesión» conserva ?volver. */
  Array.prototype.forEach.call(document.querySelectorAll('[data-registro-login]'), function (a) {
    a.setAttribute('href', 'login.html' + (volver ? '?volver=' + encodeURIComponent(volver) : ''));
  });

  /* ---- Elementos -------------------------------------------------------- */

  var form = document.getElementById('registro-form');
  if (!form) { return; }
  var boton = form.querySelector('[type="submit"]');
  var aviso = document.getElementById('registro-sesion');
  /* Alta correcta: AURA.auth emite aura:auth antes de que la página se vaya;
     sin esto, el aviso «Ya has iniciado sesión» aparecería un instante. */
  var saliendo = false;
  var restaurar = null;

  /* Aviso discreto si ya hay una sesión: registrarse la sustituiría. */
  function pintarSesion() {
    if (!aviso || saliendo) { return; }
    var u = AURA.auth.user();
    aviso.hidden = !u;
    if (u) { aviso.querySelector('[data-registro-quien]').textContent = u.nombre || u.email; }
  }
  document.addEventListener('aura:auth', pintarSesion);

  /* ---- Requisitos de la contraseña -------------------------------------- */

  function faltan(valor) {
    var r = AURA.ui.passwordRules(valor);
    var lista = [];
    if (!r.length) { lista.push('al menos 8 caracteres'); }
    if (!r.upper) { lista.push('una mayúscula'); }
    if (!r.number) { lista.push('un número'); }
    return lista;
  }

  function unir(lista) {
    if (lista.length < 2) { return lista.join(''); }
    return lista.slice(0, -1).join(', ') + ' y ' + lista[lista.length - 1];
  }

  /* ---- Bienvenida en la cuenta ------------------------------------------ */

  /* La cuenta lee esta marca una sola vez y da la bienvenida (cuenta.js).
     Solo si el destino es la cuenta: en otra página la marca quedaría
     pendiente y saludaría más tarde, fuera de contexto. */
  function marcarBienvenida(nombre) {
    if (destino.split(/[?#]/)[0] !== 'cuenta.html') { return; }
    try { window.sessionStorage.setItem('aura.cuenta.bienvenida', String(nombre || '')); } catch (e) { /* nada */ }
  }

  /* ---- Alta ------------------------------------------------------------- */

  AURA.ui.form(form, {
    nombre: { required: 'Escribe tu nombre.' },
    apellidos: { required: 'Escribe tus apellidos.' },
    email: { required: 'Escribe tu correo electrónico.', email: true },
    password: {
      required: 'Crea una contraseña para tu ID de AURA.',
      custom: function (valor) {
        var lista = faltan(valor);
        return lista.length ? 'Tu contraseña necesita ' + unir(lista) + '.' : true;
      }
    }
  }, {
    onSubmit: function (v, e, api) {
      saliendo = true;
      restaurar = AURA.ui.busy(boton, 'Creando tu ID de AURA…');
      AURA.auth.register({
        nombre: v.nombre,
        apellidos: v.apellidos,
        email: v.email,
        password: v.password,
        remember: true
      }).then(function (r) {
        if (r && r.ok) {
          marcarBienvenida((r.user && r.user.nombre) || String(v.nombre || '').trim());
          window.location.replace(destino);
          return;
        }
        saliendo = false;
        if (restaurar) { restaurar(); restaurar = null; }
        if (r && r.field && form.elements[r.field]) {
          api.setError(r.field, r.error);          // p. ej. «Ya existe un ID de AURA con ese correo…»
          try { form.elements[r.field].focus(); } catch (err) { /* nada */ }
        } else {
          AURA.ui.toast({ kind: 'error', title: 'No hemos podido crear tu ID de AURA', text: (r && r.error) || 'Inténtalo de nuevo dentro de un momento.' });
        }
        /* El mismo rechazo que un envío con errores (AURA.ui.form), en el
           instante en que se pinta el error; solo en pantallas táctiles. */
        if (typeof AURA.ui.haptic === 'function') { AURA.ui.haptic('error'); }
      });
    }
  });

  /* ---- Volver con el botón «Atrás» (caché de páginas) ------------------- */

  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) { return; }
    saliendo = false;
    if (restaurar) { restaurar(); restaurar = null; }
    pintarSesion();
  });

  pintarSesion();

  /* Como en el prototipo, el primer campo llega enfocado; solo con ratón o
     trackpad (en el móvil abriría el teclado sin que nadie lo pida). */
  try {
    if (window.matchMedia('(pointer: fine)').matches) { form.elements.nombre.focus({ preventScroll: true }); }
  } catch (e) { /* nada */ }
})();
