const express = require('express');
const router  = express.Router();
const { db, parseProduct } = require('../data/db');
const { requireAuth } = require('../middleware/auth');

/* GET /api/stock — returns products grouped by brand/model */
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM products ORDER BY brand_slug, model_slug, name').all();
    const grouped = {};
    rows.forEach(p => {
      const key = `${p.brand_slug}/${p.model_slug}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(parseProduct(p));
    });
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo stock' });
  }
});

/* GET /api/stock/list — flat list for admin panel */
router.get('/list', (req, res) => {
  try {
    const { brand, model } = req.query;
    let sql = 'SELECT * FROM products';
    const params = [];
    if (brand) {
      sql += ' WHERE brand_slug = ?';
      params.push(brand);
      if (model) {
        sql += ' AND model_slug = ?';
        params.push(model);
      }
    }
    sql += ' ORDER BY brand_slug, model_slug, name';
    const rows = db.prepare(sql).all(...params);
    res.json(rows.map(parseProduct));
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo productos' });
  }
});

/* GET /api/stock/:id */
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(parseProduct(row));
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo producto' });
  }
});

/* POST /api/stock — requires auth */
router.post('/', requireAuth, (req, res) => {
  const {
    id, brand_slug, model_slug, name, colorway, color, price,
    sizes, available_sizes, images, spec,
  } = req.body;

  if (!brand_slug || !model_slug || !name) {
    return res.status(400).json({ error: 'brand_slug, model_slug y name son obligatorios' });
  }

  const productId = id || `${brand_slug.slice(0, 3)}-${Date.now()}`;

  try {
    db.prepare(`
      INSERT INTO products
        (id, brand_slug, model_slug, name, colorway, color, price,
         sizes, available_sizes, images, spec)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      productId, brand_slug, model_slug, name,
      colorway || null, color || '#ffffff', parseInt(price) || 0,
      JSON.stringify(sizes           || { eu: [], us: [], uk: [] }),
      JSON.stringify(available_sizes || []),
      JSON.stringify(images          || []),
      JSON.stringify(spec            || {}),
    );
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    res.status(201).json(parseProduct(product));
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Ya existe un producto con ese ID' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error creando producto' });
  }
});

/* PUT /api/stock/:id — requires auth */
router.put('/:id', requireAuth, (req, res) => {
  const {
    brand_slug, model_slug, name, colorway, color, price,
    sizes, available_sizes, images, spec,
  } = req.body;

  try {
    const info = db.prepare(`
      UPDATE products SET
        brand_slug      = COALESCE(?, brand_slug),
        model_slug      = COALESCE(?, model_slug),
        name            = COALESCE(?, name),
        colorway        = COALESCE(?, colorway),
        color           = COALESCE(?, color),
        price           = COALESCE(?, price),
        sizes           = COALESCE(?, sizes),
        available_sizes = COALESCE(?, available_sizes),
        images          = COALESCE(?, images),
        spec            = COALESCE(?, spec),
        updated_at      = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      brand_slug      || null,
      model_slug      || null,
      name            || null,
      colorway        !== undefined ? colorway : null,
      color           || null,
      price           ? parseInt(price) : null,
      sizes           ? JSON.stringify(sizes)           : null,
      available_sizes ? JSON.stringify(available_sizes) : null,
      images          ? JSON.stringify(images)          : null,
      spec            ? JSON.stringify(spec)            : null,
      req.params.id,
    );
    if (!info.changes) return res.status(404).json({ error: 'Producto no encontrado' });
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json(parseProduct(product));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error actualizando producto' });
  }
});

/* DELETE /api/stock/:id — requires auth */
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const info = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    if (!info.changes) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando producto' });
  }
});

module.exports = router;
