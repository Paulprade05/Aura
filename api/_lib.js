/* AURA — utilidades comunes de la API (Vercel Functions + Neon Postgres).
   Los archivos que empiezan por «_» no se publican como ruta. */
'use strict';
const crypto = require('node:crypto');
const { neon } = require('@neondatabase/serverless');

const COOKIE = 'aura_sid';
const DAY = 86400;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CARD_KEY = /(tarjeta|card|cvv|cvc|csc|caducidad|expir|vencim|iban|pan$)/i;
const CARD_SAFE = /^(metodo|método|method|marca|brand|ultimos4|últimos4|last4)$/i;

let sqlClient = null;
let ready = null;

function dbUrl() { return process.env.DATABASE_URL || process.env.POSTGRES_URL || ''; }
function hasDb() { return !!dbUrl(); }

function sql() {
  if (!sqlClient) { sqlClient = neon(dbUrl()); }
  return sqlClient;
}

/* Crea las tablas la primera vez que arranca la función. */
function init() {
  if (!ready) {
    const q = sql();
    ready = (async () => {
      await q`CREATE TABLE IF NOT EXISTS aura_users (
        email text PRIMARY KEY, nombre text NOT NULL, apellidos text NOT NULL,
        salt text NOT NULL, hash text NOT NULL, creado timestamptz NOT NULL DEFAULT now())`;
      await q`CREATE TABLE IF NOT EXISTS aura_sessions (
        token_hash text PRIMARY KEY, email text NOT NULL REFERENCES aura_users(email) ON DELETE CASCADE,
        expires timestamptz NOT NULL)`;
      await q`CREATE TABLE IF NOT EXISTS aura_reviews (
        id bigserial PRIMARY KEY, email text NOT NULL REFERENCES aura_users(email) ON DELETE CASCADE,
        autor text NOT NULL, familia text NOT NULL, producto text NOT NULL,
        nota smallint NOT NULL CHECK (nota BETWEEN 1 AND 5), texto text NOT NULL,
        creado timestamptz NOT NULL DEFAULT now(), UNIQUE (email, producto))`;
      await q`CREATE TABLE IF NOT EXISTS aura_state (
        email text PRIMARY KEY REFERENCES aura_users(email) ON DELETE CASCADE,
        bag jsonb NOT NULL DEFAULT '[]', orders jsonb NOT NULL DEFAULT '[]',
        tradein jsonb, updated timestamptz NOT NULL DEFAULT now())`;
    })().catch((e) => { ready = null; throw e; });
  }
  return ready;
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

/* Lee el cuerpo JSON (máx. 256 KB) y comprueba que la petición viene del propio sitio. */
async function readJson(req) {
  const origin = req.headers.origin;
  if (origin) {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    let o = '';
    try { o = new URL(origin).host; } catch (e) { /* origen inválido */ }
    if (o !== host) { const err = new Error('origin'); err.status = 403; throw err; }
  }
  if (req.body && typeof req.body === 'object') { return req.body; }
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 262144) { const err = new Error('big'); err.status = 413; throw err; }
    chunks.push(c);
  }
  const txt = Buffer.concat(chunks).toString('utf8');
  if (!txt) { return {}; }
  try { return JSON.parse(txt); } catch (e) { const err = new Error('json'); err.status = 400; throw err; }
}

function normEmail(v) { return String(v == null ? '' : v).trim().toLowerCase(); }

function hashPassword(password, saltHex) {
  const salt = saltHex || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const got = Buffer.from(crypto.scryptSync(password, salt, 64).toString('hex'));
  const want = Buffer.from(hash);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

function sha(text) { return crypto.createHash('sha256').update(text).digest('hex'); }

function parseCookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) { out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); }
  });
  return out;
}

function setCookie(res, value, maxAgeSeconds) {
  const parts = [COOKIE + '=' + encodeURIComponent(value), 'Path=/', 'HttpOnly', 'Secure', 'SameSite=Lax'];
  if (maxAgeSeconds != null) { parts.push('Max-Age=' + maxAgeSeconds); }
  res.setHeader('Set-Cookie', parts.join('; '));
}

async function createSession(res, email, remember) {
  const q = sql();
  const token = crypto.randomBytes(32).toString('hex');
  const days = remember === false ? 1 : 30;
  await q`INSERT INTO aura_sessions (token_hash, email, expires)
          VALUES (${sha(token)}, ${email}, now() + make_interval(days => ${days}::int))`;
  setCookie(res, token, remember === false ? null : days * DAY);
}

async function currentUser(req) {
  const token = parseCookies(req)[COOKIE];
  if (!token) { return null; }
  const q = sql();
  const rows = await q`SELECT u.email, u.nombre, u.apellidos, u.creado FROM aura_sessions s
                       JOIN aura_users u ON u.email = s.email
                       WHERE s.token_hash = ${sha(token)} AND s.expires > now()`;
  return rows[0] || null;
}

/* Quita cualquier dato con pinta de tarjeta antes de guardar (igual que el cliente). */
function stripCard(v, depth) {
  depth = depth || 0;
  if (depth > 8) { return null; }
  if (Array.isArray(v)) { return v.map((x) => stripCard(x, depth + 1)); }
  if (v && typeof v === 'object') {
    const out = {};
    Object.keys(v).forEach((k) => {
      if (CARD_KEY.test(k) && !CARD_SAFE.test(k)) { return; }
      out[k] = stripCard(v[k], depth + 1);
    });
    return out;
  }
  return v;
}

/* Envuelve un manejador: método permitido, base de datos configurada y errores. */
function route(methods, fn) {
  return async (req, res) => {
    try {
      if (methods.indexOf(req.method) < 0) {
        res.setHeader('Allow', methods.join(', '));
        return send(res, 405, { ok: false, error: 'method' });
      }
      if (!hasDb()) { return send(res, 503, { ok: false, error: 'sin-base-de-datos' }); }
      await init();
      return await fn(req, res);
    } catch (e) {
      const status = e && e.status ? e.status : 500;
      if (status === 500) { console.error('[aura-api]', e && e.message); }
      return send(res, status, { ok: false, error: status === 500 ? 'error' : e.message });
    }
  };
}

module.exports = { sql, send, readJson, normEmail, hashPassword, verifyPassword, createSession, currentUser,
  parseCookies, setCookie, sha, stripCard, route, EMAIL_RE, COOKIE };
