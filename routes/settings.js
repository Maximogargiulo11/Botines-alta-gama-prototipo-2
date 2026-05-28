const express = require('express');
const router  = express.Router();
const { db } = require('../data/db');
const { requireAuth } = require('../middleware/auth');

/* GET /api/settings */
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const obj = {};
    rows.forEach(r => { obj[r.key] = r.value; });
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo configuración' });
  }
});

/* PUT /api/settings — requires auth — body: { key: value, ... } */
router.put('/', requireAuth, (req, res) => {
  const updates = req.body;
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'Body inválido' });
  }
  try {
    const upsert = db.prepare(
      'INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    );
    const upsertAll = db.transaction((entries) => {
      for (const [key, value] of entries) upsert.run(key, String(value));
    });
    upsertAll(Object.entries(updates));

    const rows = db.prepare('SELECT key, value FROM settings').all();
    const obj = {};
    rows.forEach(r => { obj[r.key] = r.value; });
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: 'Error guardando configuración' });
  }
});

module.exports = router;
