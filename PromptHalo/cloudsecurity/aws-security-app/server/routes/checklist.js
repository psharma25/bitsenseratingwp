const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../middleware');

// GET /api/checklist -> everyone (even logged-out) can view state, read-only
router.get('/', (req, res) => {
  const state = db.prepare('SELECT control_id, done, notes FROM checklist_state').all();
  const content = db.prepare('SELECT field_key, html FROM content_edits').all();
  const stateMap = {};
  state.forEach((r) => { stateMap[r.control_id] = { done: !!r.done, notes: r.notes }; });
  const contentMap = {};
  content.forEach((r) => { contentMap[r.field_key] = r.html; });
  res.json({ state: stateMap, content: contentMap });
});

// POST /api/checklist/:id  { done, notes }  -> admin only (editing is an admin action)
router.post('/:id', requireAdmin, (req, res) => {
  const controlId = req.params.id;
  const done = req.body && req.body.done ? 1 : 0;
  const notes = String((req.body && req.body.notes) || '');
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO checklist_state (control_id, done, notes, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(control_id) DO UPDATE SET
      done = excluded.done, notes = excluded.notes,
      updated_by = excluded.updated_by, updated_at = excluded.updated_at
  `).run(controlId, done, notes, req.user.email, now);
  res.json({ ok: true });
});

// POST /api/content/:key  { html }  -> admin only
router.post('/content/:key', requireAdmin, (req, res) => {
  const fieldKey = req.params.key;
  const html = String((req.body && req.body.html) || '');
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO content_edits (field_key, html, updated_by, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(field_key) DO UPDATE SET
      html = excluded.html, updated_by = excluded.updated_by, updated_at = excluded.updated_at
  `).run(fieldKey, html, req.user.email, now);
  res.json({ ok: true });
});

module.exports = router;
