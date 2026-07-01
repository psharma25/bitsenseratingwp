// Zero-dependency SQLite via Node's built-in node:sqlite module (Node >= 22.5).
// No native compilation required — this is why the app can "self start" reliably
// in fresh environments like GitHub Codespaces without a node-gyp build step.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'app.db');

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    created_at TEXT NOT NULL,
    last_login_at TEXT
  );

  CREATE TABLE IF NOT EXISTS otp_codes (
    email TEXT PRIMARY KEY,
    code_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_sent_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS checklist_state (
    control_id TEXT PRIMARY KEY,
    done INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    updated_by TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS content_edits (
    field_key TEXT PRIMARY KEY,
    html TEXT NOT NULL,
    updated_by TEXT,
    updated_at TEXT
  );
`);

module.exports = db;
