const express = require('express');
const router = express.Router();
const { pool } = require('../data/db');
const { requireAuth } = require('../middleware/auth');

/* GET /api/marcas — returns brands with nested models + product counts */
router.get('/', async (req, res) => {
  try {
    const { rows: brands } = await pool.query('SELECT * FROM brands ORDER BY slug');
    const { rows: models } = await pool.query('SELECT * FROM models ORDER BY brand_slug, name');
    const { rows: counts } = await pool.query(
      'SELECT brand_slug, model_slug, COUNT(*) as count FROM products GROUP BY brand_slug, model_slug'
    );

    const countMap = {};
    counts.forEach(c => { countMap[`${c.brand_slug}/${c.model_slug}`] = parseInt(c.count); });

    const result = brands.map(b => ({
      ...b,
      models: models
        .filter(m => m.brand_slug === b.slug)
        .map(m => ({ ...m, stock: countMap[`${b.slug}/${m.slug}`] || 0 })),
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo marcas' });
  }
});

/* GET /api/marcas/:slug */
router.get('/:slug', async (req, res) => {
  try {
    const { rows: b } = await pool.query('SELECT * FROM brands WHERE slug = $1', [req.params.slug]);
    if (!b.length) return res.status(404).json({ error: 'Marca no encontrada' });
    const { rows: models } = await pool.query('SELECT * FROM models WHERE brand_slug = $1 ORDER BY name', [req.params.slug]);
    res.json({ ...b[0], models });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo marca' });
  }
});

/* PUT /api/marcas/:slug — update brand cover/logo — requires auth */
router.put('/:slug', requireAuth, async (req, res) => {
  const { name, tagline, cover, logo } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE brands SET
        name = COALESCE($1, name),
        tagline = COALESCE($2, tagline),
        cover = COALESCE($3, cover),
        logo = COALESCE($4, logo)
       WHERE slug = $5 RETURNING *`,
      [name, tagline, cover, logo, req.params.slug]
    );
    if (!rows.length) return res.status(404).json({ error: 'Marca no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando marca' });
  }
});

/* PUT /api/marcas/:brandSlug/modelos/:modelSlug — update model image/tagline — requires auth */
router.put('/:brandSlug/modelos/:modelSlug', requireAuth, async (req, res) => {
  const { name, tagline, image } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE models SET
        name = COALESCE($1, name),
        tagline = COALESCE($2, tagline),
        image = COALESCE($3, image)
       WHERE brand_slug = $4 AND slug = $5 RETURNING *`,
      [name, tagline, image, req.params.brandSlug, req.params.modelSlug]
    );
    if (!rows.length) return res.status(404).json({ error: 'Modelo no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando modelo' });
  }
});

/* POST /api/marcas/:brandSlug/modelos — add new model — requires auth */
router.post('/:brandSlug/modelos', requireAuth, async (req, res) => {
  const { slug, name, tagline, image } = req.body;
  if (!slug || !name) return res.status(400).json({ error: 'slug y name son obligatorios' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO models (brand_slug, slug, name, tagline, image) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.params.brandSlug, slug, name, tagline, image]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe ese modelo' });
    res.status(500).json({ error: 'Error creando modelo' });
  }
});

/* DELETE /api/marcas/:brandSlug/modelos/:modelSlug — requires auth */
router.delete('/:brandSlug/modelos/:modelSlug', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM models WHERE brand_slug = $1 AND slug = $2', [req.params.brandSlug, req.params.modelSlug]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando modelo' });
  }
});

module.exports = router;
