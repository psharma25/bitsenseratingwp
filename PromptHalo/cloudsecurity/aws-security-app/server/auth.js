const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Auto-generates and holds an in-memory secret if JWT_SECRET isn't set in
// .env, so the app boots and works immediately in a fresh environment.
// Sessions won't survive a server restart until you set JWT_SECRET yourself.
function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (!global.__generatedJwtSecret) {
    global.__generatedJwtSecret = crypto.randomBytes(48).toString('hex');
    console.log('\n[auth] No JWT_SECRET set in .env — generated a temporary one for this run.');
    console.log('[auth] Logins will need to happen again after a server restart. Set JWT_SECRET in .env to persist sessions.\n');
  }
  return global.__generatedJwtSecret;
}

function generateOtp() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function hashOtp(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function signSession(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

function verifySession(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (e) {
    return null;
  }
}

module.exports = { generateOtp, hashOtp, signSession, verifySession };
