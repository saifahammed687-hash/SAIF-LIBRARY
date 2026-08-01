const crypto = require('crypto');
const { sendJson } = require('../lib/http-utils');

// In a real deployment, move this to an environment variable.
const SECRET = 'lms-dev-secret-change-me';

function sign(payload, expiresInMs = 4 * 60 * 60 * 1000) {
  const data = { ...payload, exp: Date.now() + expiresInMs };
  const body = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verify(token) {
  if (!token) throw new Error('missing token');
  const [body, sig] = token.split('.');
  if (!body || !sig) throw new Error('malformed token');
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (sig !== expected) throw new Error('bad signature');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (payload.exp && Date.now() > payload.exp) throw new Error('expired');
  return payload;
}

// Reads the Authorization header, verifies the token, and returns the user.
// Sends a 401 and returns null if there's no valid session.
function requireAuth(req, res) {
  const header = req.headers['authorization'];
  const token = header && header.split(' ')[1];
  try {
    return verify(token);
  } catch (err) {
    sendJson(res, 401, { error: 'You are not logged in, or your session expired.' });
    return null;
  }
}

// Sends a 403 and returns false if the user's role isn't in the allowed list.
function requireRole(user, res, ...roles) {
  if (!roles.includes(user.role)) {
    sendJson(res, 403, { error: `${user.role}s cannot do this action.` });
    return false;
  }
  return true;
}

module.exports = { sign, verify, requireAuth, requireRole };
