'use strict';
const L = require('./_lib');

/* POST /api/register { nombre, apellidos, email, password, remember } */
module.exports = L.route(['POST'], async (req, res) => {
  const b = await L.readJson(req);
  const nombre = String(b.nombre || '').trim().slice(0, 80);
  const apellidos = String(b.apellidos || '').trim().slice(0, 120);
  const email = L.normEmail(b.email).slice(0, 254);
  const password = String(b.password == null ? '' : b.password);
  if (!nombre || !apellidos || !L.EMAIL_RE.test(email) || password.length < 8 || password.length > 200) {
    return L.send(res, 400, { ok: false, error: 'datos' });
  }
  const q = L.sql();
  const exists = await q`SELECT 1 FROM aura_users WHERE email = ${email}`;
  if (exists.length) { return L.send(res, 409, { ok: false, error: 'exists' }); }
  const { salt, hash } = L.hashPassword(password);
  await q`INSERT INTO aura_users (email, nombre, apellidos, salt, hash) VALUES (${email}, ${nombre}, ${apellidos}, ${salt}, ${hash})`;
  await q`INSERT INTO aura_state (email) VALUES (${email}) ON CONFLICT DO NOTHING`;
  await L.createSession(res, email, b.remember);
  return L.send(res, 200, { ok: true, user: { nombre, apellidos, email } });
});
