const express = require('express');
const router = express.Router();
const { pool } = require('../data/db');
const { requireAuth } = require('../middleware/auth');

/* GET /api/settings — returns { home_articles_count: '6', home_catalog_count: '4', ... } */
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT key, value FROM settings');
    const obj = {};
    rows.forEach(r => { obj[r.key] = r.value; });
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo configuración' });
  }
});

/* PUT /api/settings — requires auth — body: { key: value, ... } */
router.put('/', requireAuth, async (req, res) => {
  const updates = req.body;
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'Body inválido' });
  }
  try {
    for (const [key, value] of Object.entries(updates)) {
      await pool.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
        [key, String(value)]
      );
    }
    const { rows } = await pool.query('SELECT key, value FROM settings');
    const obj = {};
    rows.forEach(r => { obj[r.key] = r.value; });
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: 'Error guardando configuración' });
  }
});

module.exports = router;
