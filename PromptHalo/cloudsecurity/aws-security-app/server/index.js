// Minimal built-in .env loader (avoids adding a dotenv dependency).
// Reads KEY=VALUE lines from a .env file in the project root, if present,
// and applies them to process.env without overwriting anything already set.
(function loadDotEnv() {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  });
})();

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const { attachUser } = require('./middleware');
const authRoutes = require('./routes/auth');
const checklistRoutes = require('./routes/checklist');
const usersRoutes = require('./routes/users');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(attachUser);

app.use('/api/auth', authRoutes);
app.use('/api/checklist', checklistRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/settings', settingsRoutes);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'aws-ai.html'));
});

app.listen(PORT, () => {
  console.log(`\nAWS Agentic AI Security Checklist server running:`);
  console.log(`  -> http://localhost:${PORT}\n`);
  console.log('First person to log in (via email OTP) becomes the admin automatically.');
  console.log('If SMTP is not configured in .env, OTP codes print to this console instead of emailing.\n');
});
