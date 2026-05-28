const express = require('express');
const router  = express.Router();
const { db } = require('../data/db');
const { requireAuth } = require('../middleware/auth');

/* GET /api/marcas — brands with nested models + product counts */
router.get('/', (req, res) => {
  try {
    const brands = db.prepare('SELECT * FROM brands ORDER BY slug').all();
    const models = db.prepare('SELECT * FROM models ORDER BY brand_slug, name').all();
    const counts = db.prepare(
      'SELECT brand_slug, model_slug, COUNT(*) as count FROM products GROUP BY brand_slug, model_slug'
    ).all();

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
router.get('/:slug', (req, res) => {
  try {
    const brand = db.prepare('SELECT * FROM brands WHERE slug = ?').get(req.params.slug);
    if (!brand) return res.status(404).json({ error: 'Marca no encontrada' });
    const models = db.prepare('SELECT * FROM models WHERE brand_slug = ? ORDER BY name').all(req.params.slug);
    res.json({ ...brand, models });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo marca' });
  }
});

/* PUT /api/marcas/:slug — update brand cover/logo — requires auth */
router.put('/:slug', requireAuth, (req, res) => {
  const { name, tagline, cover, logo } = req.body;
  try {
    const info = db.prepare(`
      UPDATE brands SET
        name    = COALESCE(?, name),
        tagline = COALESCE(?, tagline),
        cover   = COALESCE(?, cover),
        logo    = COALESCE(?, logo)
      WHERE slug = ?
    `).run(name || null, tagline || null, cover || null, logo || null, req.params.slug);
    if (!info.changes) return res.status(404).json({ error: 'Marca no encontrada' });
    const brand = db.prepare('SELECT * FROM brands WHERE slug = ?').get(req.params.slug);
    res.json(brand);
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando marca' });
  }
});

/* PUT /api/marcas/:brandSlug/modelos/:modelSlug — requires auth */
router.put('/:brandSlug/modelos/:modelSlug', requireAuth, (req, res) => {
  const { name, tagline, image } = req.body;
  try {
    const info = db.prepare(`
      UPDATE models SET
        name    = COALESCE(?, name),
        tagline = COALESCE(?, tagline),
        image   = COALESCE(?, image)
      WHERE brand_slug = ? AND slug = ?
    `).run(name || null, tagline || null, image || null, req.params.brandSlug, req.params.modelSlug);
    if (!info.changes) return res.status(404).json({ error: 'Modelo no encontrado' });
    const model = db.prepare('SELECT * FROM models WHERE brand_slug = ? AND slug = ?')
      .get(req.params.brandSlug, req.params.modelSlug);
    res.json(model);
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando modelo' });
  }
});

/* POST /api/marcas/:brandSlug/modelos — add new model — requires auth */
router.post('/:brandSlug/modelos', requireAuth, (req, res) => {
  const { slug, name, tagline, image } = req.body;
  if (!slug || !name) return res.status(400).json({ error: 'slug y name son obligatorios' });
  try {
    const info = db.prepare(
      'INSERT INTO models (brand_slug, slug, name, tagline, image) VALUES (?,?,?,?,?)'
    ).run(req.params.brandSlug, slug, name, tagline || null, image || null);
    const model = db.prepare('SELECT * FROM models WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(model);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Ya existe ese modelo' });
    }
    res.status(500).json({ error: 'Error creando modelo' });
  }
});

/* DELETE /api/marcas/:brandSlug/modelos/:modelSlug — requires auth */
router.delete('/:brandSlug/modelos/:modelSlug', requireAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM models WHERE brand_slug = ? AND slug = ?')
      .run(req.params.brandSlug, req.params.modelSlug);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando modelo' });
  }
});

module.exports = router;
