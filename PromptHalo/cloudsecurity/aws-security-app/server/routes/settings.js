const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware');
const { upsertEnv } = require('../envStore');
const { resetTransport, isConfigured, sendTestEmail } = require('../email');

function isValidEmail(e) {
  return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

// GET /api/settings/smtp -> admin only. Never returns the actual password.
router.get('/smtp', requireAdmin, (req, res) => {
  res.json({
    host: process.env.SMTP_HOST || '',
    port: process.env.SMTP_PORT || '587',
    user: process.env.SMTP_USER || '',
    from: process.env.SMTP_FROM || '',
    hasPassword: !!process.env.SMTP_PASS,
    configured: isConfigured(),
  });
});

// POST /api/settings/smtp  { host, port, user, pass, from } -> admin only
// `pass` may be omitted to keep the currently-saved password unchanged.
router.post('/smtp', requireAdmin, (req, res) => {
  const body = req.body || {};
  const host = String(body.host || '').trim();
  const port = String(body.port || '587').trim();
  const user = String(body.user || '').trim();
  const from = String(body.from || '').trim();
  const pass = body.pass === undefined || body.pass === '' ? undefined : String(body.pass);

  if (!host || !user || !from) {
    return res.status(400).json({ error: 'Host, username, and from-address are required.' });
  }
  if (!isValidEmail(from)) {
    return res.status(400).json({ error: 'From-address must be a valid email.' });
  }
  if (!/^\d+$/.test(port)) {
    return res.status(400).json({ error: 'Port must be a number.' });
  }

  upsertEnv({
    SMTP_HOST: host,
    SMTP_PORT: port,
    SMTP_USER: user,
    SMTP_FROM: from,
    SMTP_PASS: pass, // undefined -> leaves existing value in .env untouched
  });
  resetTransport();

  res.json({ ok: true });
});

// POST /api/settings/smtp/test  { to } -> admin only. Sends (or simulates) a test email.
router.post('/smtp/test', requireAdmin, async (req, res) => {
  const to = String((req.body && req.body.to) || '').trim();
  if (!isValidEmail(to)) return res.status(400).json({ error: 'Enter a valid email to send the test to.' });
  try {
    const result = await sendTestEmail(to);
    res.json({ ok: true, simulated: !!result.simulated });
  } catch (err) {
    console.error('[settings] Test email failed:', err.message);
    res.status(502).json({ error: 'Could not send the test email: ' + err.message });
  }
});

module.exports = router;
