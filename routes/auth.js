const crypto = require('crypto');
const { getUserByGmail, createUser, getAllUsers } = require('../data');
const { sign } = require('../middleware/auth');
const { sendJson } = require('../lib/http-utils');

const ROLES = ['Student', 'Teacher', 'Librarian', 'Admin'];

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(pw, stored) {
  const [salt, hash] = stored.split(':');
  const hashBuf = Buffer.from(hash, 'hex');
  const suppliedBuf = crypto.scryptSync(pw, salt, 64);
  if (hashBuf.length !== suppliedBuf.length) return false;
  return crypto.timingSafeEqual(hashBuf, suppliedBuf);
}

// Same rule as the original C gmailVerification()
function isValidGmail(gmail) {
  return typeof gmail === 'string' &&
         gmail.length >= 11 &&
         gmail.toLowerCase().endsWith('@gmail.com');
}

// Same rule as the original C passwordVerification()
function isStrongPassword(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return false;
  return /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw);
}

function dbErr(res, err) {
  console.error(err);
  sendJson(res, 500, { error: 'Database error. Is MySQL running and configured correctly in config.js?' });
}

async function register(req, res, body) {
  const { username, gmail, password, role } = body;

  if (!username || !username.trim()) {
    return sendJson(res, 400, { error: 'Username is required.' });
  }
  if (!isValidGmail(gmail)) {
    return sendJson(res, 400, { error: 'Gmail must end with @gmail.com' });
  }
  if (!ROLES.includes(role)) {
    return sendJson(res, 400, { error: 'Select a valid role.' });
  }
  if (!isStrongPassword(password)) {
    return sendJson(res, 400, {
      error: 'Password needs 8+ characters with an uppercase letter, a lowercase letter, a number, and a special character.'
    });
  }

  try {
    const existing = await getUserByGmail(gmail);
    if (existing) {
      return sendJson(res, 409, { error: 'This Gmail is already registered.' });
    }

    await createUser({
      username: username.trim(),
      gmail,
      passwordHash: hashPassword(password),
      role
    });

    sendJson(res, 201, { message: 'Registration successful. You can log in now.' });
  } catch (err) {
    dbErr(res, err);
  }
}

async function login(req, res, body) {
  const { gmail, password } = body;

  try {
    const user = await getUserByGmail(gmail || '');

    if (!user || !verifyPassword(password || '', user.password_hash)) {
      return sendJson(res, 401, { error: 'Invalid Gmail or password.' });
    }

    const token = sign({ username: user.username, gmail: user.gmail, role: user.role });
    sendJson(res, 200, { token, username: user.username, role: user.role });
  } catch (err) {
    dbErr(res, err);
  }
}

// Admin-only: list registered users (mirrors viewRegisteredUsers() from the C version)
async function listUsers(req, res) {
  try {
    const users = await getAllUsers();
    sendJson(res, 200, users);
  } catch (err) {
    dbErr(res, err);
  }
}

module.exports = { register, login, listUsers };
