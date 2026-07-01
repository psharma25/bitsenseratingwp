const express = require('express');
const router = express.Router();
const db = require('../db');
const { generateOtp, hashOtp, signSession } = require('../auth');
const { sendOtpEmail } = require('../email');

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

function isValidEmail(e) {
  return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

// POST /api/auth/request-otp  { email }
router.post('/request-otp', async (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });

  const now = Date.now();
  const existing = db.prepare('SELECT * FROM otp_codes WHERE email = ?').get(email);
  if (existing && now - new Date(existing.last_sent_at).getTime() < RESEND_COOLDOWN_MS) {
    return res.status(429).json({ error: 'Please wait a bit before requesting another code.' });
  }

  const code = generateOtp();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(now + OTP_TTL_MS).toISOString();
  const lastSentAt = new Date(now).toISOString();

  db.prepare(`
    INSERT INTO otp_codes (email, code_hash, expires_at, attempts, last_sent_at)
    VALUES (?, ?, ?, 0, ?)
    ON CONFLICT(email) DO UPDATE SET
      code_hash = excluded.code_hash,
      expires_at = excluded.expires_at,
      attempts = 0,
      last_sent_at = excluded.last_sent_at
  `).run(email, codeHash, expiresAt, lastSentAt);

  try {
    const result = await sendOtpEmail(email, code);
    res.json({ ok: true, simulated: !!result.simulated });
  } catch (err) {
    console.error('[auth] Failed to send OTP email:', err.message);
    res.status(502).json({ error: 'Could not send the email. Check SMTP settings in .env.' });
  }
});

// POST /api/auth/verify-otp  { email, code }
router.post('/verify-otp', (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  const code = String((req.body && req.body.code) || '').trim();
  if (!isValidEmail(email) || !code) return res.status(400).json({ error: 'Email and code are required.' });

  const row = db.prepare('SELECT * FROM otp_codes WHERE email = ?').get(email);
  if (!row) return res.status(400).json({ error: 'Request a code first.' });
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM otp_codes WHERE email = ?').run(email);
    return res.status(400).json({ error: 'Code expired — request a new one.' });
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    db.prepare('DELETE FROM otp_codes WHERE email = ?').run(email);
    return res.status(429).json({ error: 'Too many incorrect attempts — request a new code.' });
  }
  if (hashOtp(code) !== row.code_hash) {
    db.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE email = ?').run(email);
    return res.status(400).json({ error: 'Incorrect code.' });
  }

  db.prepare('DELETE FROM otp_codes WHERE email = ?').run(email);

  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  const now = new Date().toISOString();
  if (!user) {
    // The very first person to ever log in becomes admin automatically.
    // Everyone after that starts as a viewer; an admin can promote them later.
    const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
    const role = userCount === 0 ? 'admin' : 'viewer';
    db.prepare('INSERT INTO users (email, role, created_at, last_login_at) VALUES (?, ?, ?, ?)')
      .run(email, role, now, now);
    user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  } else {
    db.prepare('UPDATE users SET last_login_at = ? WHERE email = ?').run(now, email);
    user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  }

  const token = signSession(user);
  res.cookie('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ ok: true, user: { email: user.email, role: user.role } });
});

router.post('/logout', (req, res) => {
  res.clearCookie('session');
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (!req.user) return res.json({ user: null });
  res.json({ user: { email: req.user.email, role: req.user.role } });
});

module.exports = router;
