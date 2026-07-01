// Sends the OTP login code by email over SMTP. Works with AWS SES (SMTP
// credentials) or SendGrid (SMTP relay, username "apikey") or any other SMTP
// provider — just fill in SMTP_* in your .env file.
//
// If no SMTP credentials are configured, the code is logged to the server
// console instead of emailed, so the app is fully usable out of the box
// (e.g. right after a fresh Codespaces boot) before you've wired up email.
const nodemailer = require('nodemailer');

function buildTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    // Fail fast on a bad host/network instead of hanging the request for
    // minutes — important since this fires inline during OTP login.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
}

let transport = null;
let transportInitTried = false;

// Call this after SMTP settings change at runtime, so the next email send
// picks up the new credentials instead of a stale (or previously-absent)
// transport.
function resetTransport() {
  transport = null;
  transportInitTried = false;
}

function isConfigured() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

async function sendMail({ to, subject, text, code }) {
  if (!transportInitTried) {
    transport = buildTransport();
    transportInitTried = true;
  }
  const from = process.env.SMTP_FROM || 'security-checklist@localhost';

  if (!transport) {
    console.log('\n================ EMAIL (no SMTP configured — dev mode) ================');
    console.log('To:      ' + to);
    console.log('Subject: ' + subject);
    if (code) console.log('Code:    ' + code);
    console.log(text);
    console.log('Add SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM to .env to send real emails.');
    console.log('==========================================================================\n');
    return { simulated: true };
  }

  await transport.sendMail({ from, to, subject, text });
  return { simulated: false };
}

async function sendOtpEmail(email, code) {
  const subject = 'Your login code — AWS Agentic AI Security Checklist';
  const text = `Your one-time login code is: ${code}\n\nThis code expires in 10 minutes. If you didn't request this, you can safely ignore this email.`;
  return sendMail({ to: email, subject, text, code });
}

async function sendTestEmail(to) {
  const subject = 'Test email — AWS Agentic AI Security Checklist';
  const text = 'This is a test email from the AWS Agentic AI Security Checklist app, confirming your SMTP settings work.';
  return sendMail({ to, subject, text });
}

module.exports = { sendOtpEmail, sendTestEmail, resetTransport, isConfigured };
