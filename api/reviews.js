'use strict';
const L = require('./_lib');

const FAMILIAS = ['auraphone', 'aurapad', 'aurabook', 'aurapods'];
const familiaDe = (id) => FAMILIAS.find((f) => String(id).indexOf(f + '-') === 0) || '';

/* Productos que el usuario ha comprado (según los pedidos guardados en su cuenta). */
async function comprados(email) {
  const rows = await L.sql()`SELECT orders FROM aura_state WHERE email = ${email}`;
  const out = new Set();
  const orders = rows[0] && Array.isArray(rows[0].orders) ? rows[0].orders : [];
  orders.forEach((o) => {
    (o && Array.isArray(o.items) ? o.items : []).forEach((it) => {
      const id = it && (it.productId || it.id);
      if (id && familiaDe(id)) { out.add(String(id)); }
    });
  });
  return Array.from(out);
}

/* GET    /api/reviews?familia=auraphone → reseñas de clientes + lo que puede hacer quien las pide
   POST   /api/reviews { producto, nota, texto } → publica o actualiza (solo si compró el producto)
   DELETE /api/reviews?producto=ID → borra la propia */
module.exports = L.route(['GET', 'POST', 'DELETE'], async (req, res) => {
  const q = L.sql();
  const user = await L.currentUser(req);
  const url = new URL(req.url, 'http://x');

  if (req.method === 'GET') {
    const fam = url.searchParams.get('familia') || '';
    const rows = FAMILIAS.indexOf(fam) >= 0
      ? await q`SELECT id, autor, familia, producto, nota, texto, creado FROM aura_reviews WHERE familia = ${fam} ORDER BY creado DESC LIMIT 50`
      : await q`SELECT id, autor, familia, producto, nota, texto, creado FROM aura_reviews ORDER BY creado DESC LIMIT 50`;
    const body = { ok: true, reviews: rows, user: null, comprados: [], mine: [] };
    if (user) {
      body.user = { email: user.email };
      body.comprados = await comprados(user.email);
      body.mine = await q`SELECT producto, nota, texto FROM aura_reviews WHERE email = ${user.email}`;
    }
    return L.send(res, 200, body);
  }

  if (!user) { return L.send(res, 401, { ok: false, error: 'session' }); }

  if (req.method === 'DELETE') {
    await L.readJson(req);
    await q`DELETE FROM aura_reviews WHERE email = ${user.email} AND producto = ${url.searchParams.get('producto') || ''}`;
    return L.send(res, 200, { ok: true });
  }

  const b = await L.readJson(req);
  const producto = String(b.producto || '');
  const familia = familiaDe(producto);
  const nota = Number(b.nota);
  const texto = String(b.texto || '').trim();
  if (!familia || !Number.isInteger(nota) || nota < 1 || nota > 5 || texto.length < 20 || texto.length > 600) {
    return L.send(res, 400, { ok: false, error: 'datos' });
  }
  if ((await comprados(user.email)).indexOf(producto) < 0) {
    return L.send(res, 403, { ok: false, error: 'no-comprado' });
  }
  const autor = user.nombre.split(' ')[0].slice(0, 40) + ' ' + (user.apellidos.trim().charAt(0) || '').toUpperCase() + '.';
  await q`INSERT INTO aura_reviews (email, autor, familia, producto, nota, texto)
          VALUES (${user.email}, ${autor}, ${familia}, ${producto}, ${nota}, ${texto})
          ON CONFLICT (email, producto) DO UPDATE SET nota = EXCLUDED.nota, texto = EXCLUDED.texto, autor = EXCLUDED.autor, creado = now()`;
  return L.send(res, 200, { ok: true });
});
