const express = require('express');
const router = express.Router();
const { pool } = require('../data/db');
const { requireAuth } = require('../middleware/auth');

/* GET /api/stock
   Returns products grouped by brand/model: { 'nike/mercurial': [...], ... }
*/
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products ORDER BY brand_slug, model_slug, name');
    const grouped = {};
    rows.forEach(p => {
      const key = `${p.brand_slug}/${p.model_slug}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    });
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo stock' });
  }
});

/* GET /api/stock/list — flat list for admin panel */
router.get('/list', async (req, res) => {
  try {
    const { brand, model } = req.query;
    let query = 'SELECT * FROM products';
    const params = [];
    if (brand) {
      params.push(brand);
      query += ` WHERE brand_slug = $${params.length}`;
      if (model) {
        params.push(model);
        query += ` AND model_slug = $${params.length}`;
      }
    }
    query += ' ORDER BY brand_slug, model_slug, name';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo productos' });
  }
});

/* GET /api/stock/:id */
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo producto' });
  }
});

/* POST /api/stock — requires auth */
router.post('/', requireAuth, async (req, res) => {
  const {
    id, brand_slug, model_slug, name, colorway, color, price,
    sizes, available_sizes, images, spec,
  } = req.body;

  if (!brand_slug || !model_slug || !name) {
    return res.status(400).json({ error: 'brand_slug, model_slug y name son obligatorios' });
  }

  const productId = id || `${brand_slug.slice(0,3)}-${Date.now()}`;

  try {
    const { rows } = await pool.query(
      `INSERT INTO products
        (id, brand_slug, model_slug, name, colorway, color, price,
         sizes, available_sizes, images, spec)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        productId, brand_slug, model_slug, name, colorway, color || '#ffffff',
        parseInt(price) || 0,
        JSON.stringify(sizes || { eu: [], us: [], uk: [] }),
        JSON.stringify(available_sizes || []),
        JSON.stringify(images || []),
        JSON.stringify(spec || {}),
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un producto con ese ID' });
    console.error(err);
    res.status(500).json({ error: 'Error creando producto' });
  }
});

/* PUT /api/stock/:id — requires auth */
router.put('/:id', requireAuth, async (req, res) => {
  const {
    brand_slug, model_slug, name, colorway, color, price,
    sizes, available_sizes, images, spec,
  } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE products SET
        brand_slug     = COALESCE($1, brand_slug),
        model_slug     = COALESCE($2, model_slug),
        name           = COALESCE($3, name),
        colorway       = COALESCE($4, colorway),
        color          = COALESCE($5, color),
        price          = COALESCE($6, price),
        sizes          = COALESCE($7, sizes),
        available_sizes= COALESCE($8, available_sizes),
        images         = COALESCE($9, images),
        spec           = COALESCE($10, spec),
        updated_at     = NOW()
       WHERE id = $11
       RETURNING *`,
      [
        brand_slug, model_slug, name, colorway, color,
        price ? parseInt(price) : null,
        sizes ? JSON.stringify(sizes) : null,
        available_sizes ? JSON.stringify(available_sizes) : null,
        images ? JSON.stringify(images) : null,
        spec ? JSON.stringify(spec) : null,
        req.params.id,
      ]
    );
    if (!rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error actualizando producto' });
  }
});

/* DELETE /api/stock/:id — requires auth */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando producto' });
  }
});

module.exports = router;
