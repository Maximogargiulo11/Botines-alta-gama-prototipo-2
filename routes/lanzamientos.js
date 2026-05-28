const express = require('express');
const router  = express.Router();
const { db, parseArticle } = require('../data/db');
const { requireAuth } = require('../middleware/auth');

/* GET /api/lanzamientos
   ?home=true  → solo show_on_home=1, ordenados por home_position
   ?limit=N    → limitar resultados
*/
router.get('/', (req, res) => {
  try {
    const { home, limit } = req.query;
    let sql = 'SELECT * FROM articles';
    if (home === 'true') {
      sql += ' WHERE show_on_home = 1 ORDER BY home_position ASC';
    } else {
      sql += ' ORDER BY home_position ASC, created_at DESC';
    }
    if (limit) sql += ` LIMIT ${parseInt(limit) || 100}`;
    const rows = db.prepare(sql).all();
    res.json(rows.map(parseArticle));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo lanzamientos' });
  }
});

/* GET /api/lanzamientos/:slug */
router.get('/:slug', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM articles WHERE slug = ?').get(req.params.slug);
    if (!row) return res.status(404).json({ error: 'Artículo no encontrado' });
    res.json(parseArticle(row));
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo artículo' });
  }
});

/* POST /api/lanzamientos — requires auth */
router.post('/', requireAuth, (req, res) => {
  const {
    slug, brand, category, title, subtitle, excerpt, date, cover,
    featured, body, related_product, show_on_home, home_position,
  } = req.body;

  if (!slug || !title) return res.status(400).json({ error: 'slug y title son obligatorios' });

  try {
    const info = db.prepare(`
      INSERT INTO articles
        (slug, brand, category, title, subtitle, excerpt, date, cover,
         featured, body, related_product, show_on_home, home_position)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      slug, brand, category || 'LANZAMIENTO', title, subtitle || null, excerpt || null,
      date || null, cover || null, featured ? 1 : 0,
      JSON.stringify(body || []),
      related_product ? JSON.stringify(related_product) : null,
      show_on_home !== false ? 1 : 0, home_position || 0,
    );
    const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(parseArticle(article));
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Ya existe un artículo con ese slug' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error creando artículo' });
  }
});

/* PUT /api/lanzamientos/:id — requires auth */
router.put('/:id', requireAuth, (req, res) => {
  const {
    slug, brand, category, title, subtitle, excerpt, date, cover,
    featured, body, related_product, show_on_home, home_position,
  } = req.body;

  try {
    const info = db.prepare(`
      UPDATE articles SET
        slug            = COALESCE(?, slug),
        brand           = COALESCE(?, brand),
        category        = COALESCE(?, category),
        title           = COALESCE(?, title),
        subtitle        = ?,
        excerpt         = ?,
        date            = COALESCE(?, date),
        cover           = ?,
        featured        = COALESCE(?, featured),
        body            = COALESCE(?, body),
        related_product = ?,
        show_on_home    = COALESCE(?, show_on_home),
        home_position   = COALESCE(?, home_position),
        updated_at      = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      slug || null, brand || null, category || null, title || null,
      subtitle !== undefined ? subtitle : null,
      excerpt  !== undefined ? excerpt  : null,
      date     || null,
      cover    !== undefined ? cover    : null,
      featured !== undefined ? (featured ? 1 : 0) : null,
      body ? JSON.stringify(body) : null,
      related_product ? JSON.stringify(related_product) : null,
      show_on_home !== undefined ? (show_on_home ? 1 : 0) : null,
      home_position !== undefined ? home_position : null,
      req.params.id,
    );
    if (!info.changes) return res.status(404).json({ error: 'Artículo no encontrado' });
    const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
    res.json(parseArticle(article));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error actualizando artículo' });
  }
});

/* DELETE /api/lanzamientos/:id — requires auth */
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const info = db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
    if (!info.changes) return res.status(404).json({ error: 'Artículo no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando artículo' });
  }
});

module.exports = router;
