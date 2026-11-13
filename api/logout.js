'use strict';
const L = require('./_lib');

/* POST /api/logout: borra la sesión del servidor y la cookie. */
module.exports = L.route(['POST'], async (req, res) => {
  await L.readJson(req);
  const token = L.parseCookies(req)[L.COOKIE];
  if (token) { await L.sql()`DELETE FROM aura_sessions WHERE token_hash = ${L.sha(token)}`; }
  L.setCookie(res, '', 0);
  return L.send(res, 200, { ok: true });
});
