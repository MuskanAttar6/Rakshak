'use strict';

const crypto = require('crypto');

/** Only these Employee IDs can log in */
const VALID_IDS = new Set(['EMP001']);

/** In-memory sessions — Map<token, { employeeId, createdAt }> */
const sessions = new Map();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

// ─── Public API ───────────────────────────────────────────────────────────────

function login(employeeId) {
  const id = (employeeId || '').trim().toUpperCase();
  if (!VALID_IDS.has(id)) return null;
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { employeeId: id, createdAt: Date.now() });
  return token;
}

function validate(token) {
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (Date.now() - s.createdAt > SESSION_TTL_MS) {
    sessions.delete(token);
    return null;
  }
  return s;
}

function destroy(token) {
  sessions.delete(token);
}

/** Returns the session token if the request carries a valid session, else null */
function sessionFromReq(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token   = cookies.session;
  return validate(token) ? token : null;
}

/**
 * Auth middleware helper.
 * Sends a redirect to / and returns false if the request is not authenticated.
 * Returns true if auth is OK.
 */
function requireAuth(req, res) {
  if (!sessionFromReq(req)) {
    res.writeHead(302, { Location: '/' });
    res.end();
    return false;
  }
  return true;
}

function parseCookies(header) {
  const c = {};
  (header || '').split(';').forEach(part => {
    const [k, ...v] = part.trim().split('=');
    if (k) c[k.trim()] = decodeURIComponent(v.join('=')).trim();
  });
  return c;
}

module.exports = { login, validate, destroy, sessionFromReq, requireAuth, parseCookies };
