'use strict';
const L = require('./_lib');

/* POST /api/login { email, password, remember } */
module.exports = L.route(['POST'], async (req, res) => {
  const b = await L.readJson(req);
  const email = L.normEmail(b.email).slice(0, 254);
  const password = String(b.password == null ? '' : b.password).slice(0, 200);
  const q = L.sql();
  const rows = await q`SELECT email, nombre, apellidos, salt, hash FROM aura_users WHERE email = ${email}`;
  const u = rows[0];
  /* Se calcula el hash aunque el usuario no exista, para no delatar qué correos hay. */
  const ok = u ? L.verifyPassword(password, u.salt, u.hash) : (L.hashPassword(password, 'aura'), false);
  if (!ok) { return L.send(res, 401, { ok: false, error: 'credentials' }); }
  await q`DELETE FROM aura_sessions WHERE expires < now()`;
  await L.createSession(res, u.email, b.remember);
  return L.send(res, 200, { ok: true, user: { nombre: u.nombre, apellidos: u.apellidos, email: u.email } });
});
