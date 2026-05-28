const express = require('express');
const router = express.Router();
const { pool } = require('../data/db');
const { requireAuth } = require('../middleware/auth');

/* GET /api/lanzamientos
   Parámetros opcionales:
   - home=true  → solo los que tienen show_on_home=true, ordenados por home_position
   - limit=N    → limitar resultados
*/
router.get('/', async (req, res) => {
  try {
    const { home, limit } = req.query;
    let query = 'SELECT * FROM articles';
    const params = [];
    if (home === 'true') {
      query += ' WHERE show_on_home = TRUE ORDER BY home_position ASC';
    } else {
      query += ' ORDER BY home_position ASC, created_at DESC';
    }
    if (limit) {
      params.push(parseInt(limit));
      query += ` LIMIT $${params.length}`;
    }
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo lanzamientos' });
  }
});

/* GET /api/lanzamientos/:slug */
router.get('/:slug', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM articles WHERE slug = $1', [req.params.slug]);
    if (!rows.length) return res.status(404).json({ error: 'Artículo no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo artículo' });
  }
});

/* POST /api/lanzamientos — requires auth */
router.post('/', requireAuth, async (req, res) => {
  const {
    slug, brand, category, title, subtitle, excerpt, date, cover,
    featured, body, related_product, show_on_home, home_position,
  } = req.body;

  if (!slug || !title) return res.status(400).json({ error: 'slug y title son obligatorios' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO articles
        (slug, brand, category, title, subtitle, excerpt, date, cover,
         featured, body, related_product, show_on_home, home_position)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        slug, brand, category || 'LANZAMIENTO', title, subtitle, excerpt,
        date, cover, featured || false,
        JSON.stringify(body || []),
        related_product ? JSON.stringify(related_product) : null,
        show_on_home !== false, home_position || 0,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un artículo con ese slug' });
    console.error(err);
    res.status(500).json({ error: 'Error creando artículo' });
  }
});

/* PUT /api/lanzamientos/:id — requires auth */
router.put('/:id', requireAuth, async (req, res) => {
  const {
    slug, brand, category, title, subtitle, excerpt, date, cover,
    featured, body, related_product, show_on_home, home_position,
  } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE articles SET
        slug = COALESCE($1, slug),
        brand = COALESCE($2, brand),
        category = COALESCE($3, category),
        title = COALESCE($4, title),
        subtitle = $5,
        excerpt = $6,
        date = COALESCE($7, date),
        cover = $8,
        featured = COALESCE($9, featured),
        body = COALESCE($10, body),
        related_product = $11,
        show_on_home = COALESCE($12, show_on_home),
        home_position = COALESCE($13, home_position),
        updated_at = NOW()
       WHERE id = $14
       RETURNING *`,
      [
        slug, brand, category, title, subtitle, excerpt, date, cover,
        featured,
        body ? JSON.stringify(body) : null,
        related_product ? JSON.stringify(related_product) : null,
        show_on_home, home_position,
        req.params.id,
      ]
    );
    if (!rows.length) return res.status(404).json({ error: 'Artículo no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error actualizando artículo' });
  }
});

/* DELETE /api/lanzamientos/:id — requires auth */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM articles WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Artículo no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando artículo' });
  }
});

module.exports = router;
