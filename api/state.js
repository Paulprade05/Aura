'use strict';
const L = require('./_lib');

/* GET  /api/state → { user, bag, orders, tradein }   (datos del usuario con sesión)
   PUT  /api/state { bag, orders, tradein, nombre, apellidos } → guarda
   DELETE /api/state → borra la cuenta y todos sus datos */
module.exports = L.route(['GET', 'PUT', 'DELETE'], async (req, res) => {
  const user = await L.currentUser(req);
  if (!user) { return L.send(res, 401, { ok: false, error: 'session' }); }
  const q = L.sql();

  if (req.method === 'GET') {
    const rows = await q`SELECT bag, orders, tradein FROM aura_state WHERE email = ${user.email}`;
    const s = rows[0] || { bag: [], orders: [], tradein: null };
    return L.send(res, 200, { ok: true, user: { nombre: user.nombre, apellidos: user.apellidos, email: user.email, creado: user.creado },
      bag: s.bag, orders: s.orders, tradein: s.tradein });
  }

  if (req.method === 'DELETE') {
    await L.readJson(req);
    await q`DELETE FROM aura_users WHERE email = ${user.email}`;   // sesiones y estado caen en cascada
    L.setCookie(res, '', 0);
    return L.send(res, 200, { ok: true });
  }

  const b = await L.readJson(req);
  const bag = Array.isArray(b.bag) ? L.stripCard(b.bag).slice(0, 100) : [];
  const orders = Array.isArray(b.orders)
    ? L.stripCard(b.orders).filter((o) => o && typeof o === 'object').slice(-200)
    : [];
  const tradein = b.tradein && typeof b.tradein === 'object' ? L.stripCard(b.tradein) : null;
  await q`INSERT INTO aura_state (email, bag, orders, tradein, updated)
          VALUES (${user.email}, ${JSON.stringify(bag)}::jsonb, ${JSON.stringify(orders)}::jsonb, ${tradein ? JSON.stringify(tradein) : null}::jsonb, now())
          ON CONFLICT (email) DO UPDATE SET bag = EXCLUDED.bag, orders = EXCLUDED.orders, tradein = EXCLUDED.tradein, updated = now()`;
  if (b.nombre || b.apellidos) {
    const nombre = String(b.nombre || user.nombre).trim().slice(0, 80) || user.nombre;
    const apellidos = String(b.apellidos || user.apellidos).trim().slice(0, 120) || user.apellidos;
    await q`UPDATE aura_users SET nombre = ${nombre}, apellidos = ${apellidos} WHERE email = ${user.email}`;
  }
  return L.send(res, 200, { ok: true });
});
