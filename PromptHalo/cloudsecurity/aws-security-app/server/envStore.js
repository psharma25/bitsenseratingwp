// Small helper for reading and updating the project's .env file at runtime,
// so admin settings (like SMTP credentials) can be entered through the app
// instead of hand-editing the file. Preserves any lines/comments it doesn't
// touch; only rewrites the specific keys it's asked to set.
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '..', '.env');

function readEnvFile() {
  if (!fs.existsSync(ENV_PATH)) return '';
  return fs.readFileSync(ENV_PATH, 'utf8');
}

// Merge `updates` (an object of KEY -> value) into the .env file on disk.
// A value of `undefined` leaves an existing key untouched (used so re-saving
// settings without re-entering a password doesn't blank it out). A value of
// null/'' removes the key's value (but keeps the key present, set to blank).
function upsertEnv(updates) {
  const existing = readEnvFile();
  const lines = existing.length ? existing.split('\n') : [];
  const seen = new Set();

  const nextLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return line;
    const key = trimmed.slice(0, eq).trim();
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      seen.add(key);
      if (updates[key] === undefined) return line; // leave as-is
      return key + '=' + String(updates[key] ?? '');
    }
    return line;
  });

  Object.keys(updates).forEach((key) => {
    if (seen.has(key)) return;
    if (updates[key] === undefined) return;
    nextLines.push(key + '=' + String(updates[key] ?? ''));
  });

  fs.writeFileSync(ENV_PATH, nextLines.join('\n').replace(/\n{3,}/g, '\n\n'));

  // Apply immediately to the running process too, so a restart isn't needed.
  Object.keys(updates).forEach((key) => {
    if (updates[key] === undefined) return;
    process.env[key] = String(updates[key] ?? '');
  });
}

module.exports = { upsertEnv, readEnvFile, ENV_PATH };
