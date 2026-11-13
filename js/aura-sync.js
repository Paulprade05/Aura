/* ==========================================================================
   AURA — sincronización entre dispositivos (js/aura-sync.js)
   Script clásico, justo después de aura-core.js.

   Añade una cuenta REAL en el servidor (API en /api, Vercel Functions + Neon
   Postgres) sin tocar el resto del sitio: envuelve AURA.auth y sincroniza la
   bolsa, los pedidos y el crédito de Trade In del usuario.

     · register / login: primero hablan con el servidor; si responde, la cuenta
       vale en cualquier dispositivo. Si el servidor no está (file://, sin base
       de datos, sin red) todo sigue funcionando en local, como antes.
     · Una cuenta antigua que solo existía en este navegador se sube al servidor
       la próxima vez que inicia sesión (se conoce entonces su contraseña).
     · Los cambios en bolsa, pedidos y Trade In se envían al servidor (con un
       pequeño retraso) y se vuelven a leer al abrir la página o al volver a
       la pestaña. La sesión del servidor va en una cookie HttpOnly.
     · La contraseña nunca se guarda en claro: el servidor usa scrypt con sal.
       Los datos de tarjeta nunca se envían ni se guardan.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var AURA = window.AURA;
  if (!AURA || !AURA.auth || !AURA.keys || !window.fetch || window.location.protocol === 'file:') { return; }

  var K = AURA.keys;
  var auth = AURA.auth;
  var orig = { register: auth.register, login: auth.login, logout: auth.logout, update: auth.update, remove: auth.remove };

  var serverSession = false;
  var pulling = false;
  var dirty = false;
  var pushTimer = 0;
  var lastPull = 0;

  function lsGet(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function lsSet(key, value) { try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* cuota o modo privado */ } }
  function lsRemove(key) { try { window.localStorage.removeItem(key); } catch (e) { /* nada */ } }
  function norm(v) { return String(v == null ? '' : v).trim().toLowerCase(); }

  /* Petición a la API: nunca rechaza; status 0 = sin red o sin API. */
  function api(method, path, body) {
    var opts = { method: method, credentials: 'same-origin', headers: {} };
    if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    return window.fetch(path, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (json) { return { status: res.status, json: json }; });
    }).catch(function () { return { status: 0, json: {} }; });
  }

  function sessionEmail() {
    var u = auth.user();
    return u ? norm(u.email) : '';
  }

  /* Crea (o rehace) el ID local con los datos del servidor y abre la sesión local. */
  function forceLocal(input) {
    var users = lsGet(K.users, {});
    if (users && users[norm(input.email)]) { delete users[norm(input.email)]; lsSet(K.users, users); }
    return orig.register(input);
  }

  function reemit() {
    pulling = true;
    try { window.dispatchEvent(new window.StorageEvent('storage', { key: null })); } catch (e) { /* nada */ }
    pulling = false;
  }

  /* Lee el estado del servidor y lo mezcla con el local. mode: 'login' | 'refresh'. */
  function pull(mode) {
    if (dirty && mode !== 'login') { return Promise.resolve(); }
    lastPull = Date.now();
    return api('GET', '/api/state').then(function (r) {
      if (r.status === 401) { serverSession = false; return; }
      if (r.status !== 200 || !r.json || !r.json.user) { return; }
      serverSession = true;
      var s = r.json;
      var email = norm(s.user.email);

      var localBag = lsGet(K.bag, []);
      var serverBag = Array.isArray(s.bag) ? s.bag : [];
      lsSet(K.bag, mode === 'login' && !serverBag.length ? localBag : serverBag);

      var all = lsGet(K.orders, []);
      if (!Array.isArray(all)) { all = []; }
      var mine = {};
      var others = [];
      all.forEach(function (o) {
        if (o && o.owner === email) { mine[o.id + '|' + o.fecha] = o; } else { others.push(o); }
      });
      (Array.isArray(s.orders) ? s.orders : []).forEach(function (o) {
        if (o && o.id) { o.owner = email; mine[o.id + '|' + o.fecha] = o; }
      });
      lsSet(K.orders, others.concat(Object.keys(mine).map(function (k) { return mine[k]; })));

      if (s.tradein) { lsSet(K.tradein, s.tradein); } else if (mode !== 'login') { lsRemove(K.tradein); }

      var users = lsGet(K.users, {});
      if (users && users[email]) {
        users[email].nombre = s.user.nombre;
        users[email].apellidos = s.user.apellidos;
        lsSet(K.users, users);
      }
      reemit();
      if (mode === 'login') { schedulePush(0); }
    });
  }

  function push() {
    pushTimer = 0;
    var email = sessionEmail();
    if (!email || !serverSession) { dirty = false; return Promise.resolve(); }
    var orders = lsGet(K.orders, []);
    var u = lsGet(K.users, {})[email] || {};
    return api('PUT', '/api/state', {
      bag: lsGet(K.bag, []),
      orders: (Array.isArray(orders) ? orders : []).filter(function (o) { return o && o.owner === email; }),
      tradein: lsGet(K.tradein, null),
      nombre: u.nombre,
      apellidos: u.apellidos
    }).then(function (r) {
      if (r.status === 401) { serverSession = false; }
      dirty = false;
    });
  }

  function schedulePush(delay) {
    if (!serverSession) { return; }
    dirty = true;
    window.clearTimeout(pushTimer);
    pushTimer = window.setTimeout(push, delay == null ? 600 : delay);
  }

  /* --- Envoltorios de AURA.auth --- */
  auth.register = function (input) {
    input = input || {};
    return api('POST', '/api/register', {
      nombre: input.nombre, apellidos: input.apellidos, email: input.email, password: input.password, remember: input.remember
    }).then(function (r) {
      if (r.status === 409) {
        return { ok: false, error: 'Ya existe un ID de AURA con ese correo. Inicia sesión o usa otro.', field: 'email', code: 'exists' };
      }
      if (r.status === 200) {
        serverSession = true;
        return forceLocal(input).then(function (res) { if (res && res.ok) { schedulePush(0); } return res; });
      }
      return orig.register(input);          // servidor ausente o datos inválidos: el mensaje lo da la validación local
    });
  };

  auth.login = function (email, password, opts) {
    var remember = opts && opts.remember;
    return api('POST', '/api/login', { email: email, password: password, remember: remember }).then(function (r) {
      if (r.status === 200 && r.json && r.json.user) {
        var u = r.json.user;
        serverSession = true;
        return forceLocal({ nombre: u.nombre, apellidos: u.apellidos, email: u.email, password: password, remember: remember })
          .then(function (res) {
            if (!res || !res.ok) { return res; }
            return pull('login').then(function () { return { ok: true, error: '', user: auth.user() }; });
          });
      }
      return orig.login(email, password, opts).then(function (res) {
        if (res && res.ok && r.status === 401) {
          /* Cuenta antigua solo local: se sube al servidor ahora que se conoce la contraseña. */
          var rec = lsGet(K.users, {})[norm(email)];
          if (rec) {
            api('POST', '/api/register', { nombre: rec.nombre, apellidos: rec.apellidos, email: rec.email, password: password, remember: remember })
              .then(function (rr) { if (rr.status === 200) { serverSession = true; schedulePush(0); } });
          }
        }
        return res;
      });
    });
  };

  auth.logout = function () {
    orig.logout();
    if (serverSession) { api('POST', '/api/logout', {}); }
    serverSession = false;
  };

  auth.update = function (fields) {
    return orig.update(fields).then(function (res) { if (res && res.ok) { schedulePush(0); } return res; });
  };

  auth.remove = function () {
    var had = serverSession;
    var ok = orig.remove();
    if (ok && had) { api('DELETE', '/api/state', {}); }
    serverSession = false;
    return ok;
  };

  /* --- Cambios locales → servidor --- */
  ['aura:bag', 'aura:orders', 'aura:tradein'].forEach(function (name) {
    document.addEventListener(name, function (e) {
      if (pulling || (e && e.detail && e.detail.reason === 'sync')) { return; }
      schedulePush();
    });
  });

  /* --- Servidor → este dispositivo: al abrir la página y al volver a la pestaña --- */
  if (sessionEmail()) { pull('refresh'); }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && sessionEmail() && Date.now() - lastPull > 5000) { pull('refresh'); }
  });
  window.addEventListener('pagehide', function () {
    if (dirty && serverSession) {
      try { window.fetch('/api/state', { method: 'PUT', credentials: 'same-origin', keepalive: true, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bag: lsGet(K.bag, []), orders: (lsGet(K.orders, []) || []).filter(function (o) { return o && o.owner === sessionEmail(); }), tradein: lsGet(K.tradein, null) }) }); } catch (e) { /* nada */ }
    }
  });

  AURA.sync = { pull: function () { return pull('refresh'); }, push: push, active: function () { return serverSession; } };
})(window, document);
