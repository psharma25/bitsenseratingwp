const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../middleware');

// GET /api/users -> admin only
router.get('/', requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, email, role, created_at, last_login_at FROM users ORDER BY created_at ASC').all();
  res.json({ users });
});

// POST /api/users/:id/role  { role: 'admin' | 'viewer' } -> admin only
router.post('/:id/role', requireAdmin, (req, res) => {
  const role = req.body && req.body.role;
  if (role !== 'admin' && role !== 'viewer') {
    return res.status(400).json({ error: "Role must be 'admin' or 'viewer'." });
  }
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found.' });

  if (target.email === req.user.email && role !== 'admin') {
    // Prevent an admin from locking themselves out entirely if they're the last admin.
    const adminCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'").get().c;
    if (adminCount <= 1) {
      return res.status(400).json({ error: "You're the only admin — promote someone else before stepping down." });
    }
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ ok: true });
});

// DELETE /api/users/:id -> admin only
router.delete('/:id', requireAdmin, (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found.' });
  if (target.role === 'admin') {
    const adminCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'").get().c;
    if (adminCount <= 1) return res.status(400).json({ error: 'Cannot remove the only remaining admin.' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
