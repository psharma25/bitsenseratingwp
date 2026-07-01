const { verifySession } = require('./auth');
const db = require('./db');

function attachUser(req, res, next) {
  const token = req.cookies && req.cookies.session;
  const payload = token ? verifySession(token) : null;
  if (!payload) {
    req.user = null;
    return next();
  }
  // Always re-check the live user record rather than trusting the role baked
  // into the JWT at login time — this way role changes (promote/demote) and
  // removals take effect immediately, without requiring the user to log out
  // and back in.
  const row = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(payload.sub);
  req.user = row ? { id: row.id, email: row.email, role: row.role } : null;
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not logged in.' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

module.exports = { attachUser, requireAuth, requireAdmin };
