const express    = require('express');
const router     = express.Router();
const { pool }   = require('../data/db');
const { requireAuth } = require('../middleware/auth');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateOrder(body) {
  const { customer_name, customer_email, items } = body;
  if (!customer_name || typeof customer_name !== 'string' || customer_name.trim().length < 2)
    return 'Nombre del cliente inválido';
  if (!customer_email || !EMAIL_RE.test(customer_email))
    return 'Email inválido';
  if (!Array.isArray(items) || items.length === 0)
    return 'El pedido debe tener al menos un producto';
  for (const item of items) {
    if (!item.product_id || !item.size || !item.quantity || item.quantity < 1)
      return 'Cada item debe tener product_id, size y quantity válidos';
    if (item.quantity > 10)
      return 'Cantidad máxima por item: 10';
  }
  if (items.length > 20)
    return 'Máximo 20 items por pedido';
  return null;
}

/* POST /api/orders — público, para que el cliente haga su pedido */
router.post('/', async (req, res) => {
  const error = validateOrder(req.body);
  if (error) return res.status(400).json({ error });

  const { customer_name, customer_email, customer_phone, items, notes } = req.body;

  try {
    // Verificar que los productos existan y calcular total
    const ids = [...new Set(items.map(i => i.product_id))];
    const { rows: products } = await pool.query(
      'SELECT id, name, price FROM products WHERE id = ANY($1)',
      [ids]
    );

    const productMap = Object.fromEntries(products.map(p => [p.id, p]));
    const missingIds = ids.filter(id => !productMap[id]);
    if (missingIds.length > 0) {
      return res.status(400).json({ error: `Productos no encontrados: ${missingIds.join(', ')}` });
    }

    let total = 0;
    const enrichedItems = items.map(item => {
      const product = productMap[item.product_id];
      const subtotal = product.price * item.quantity;
      total += subtotal;
      return {
        product_id: item.product_id,
        product_name: product.name,
        size: item.size,
        quantity: item.quantity,
        unit_price: product.price,
        subtotal,
      };
    });

    const { rows } = await pool.query(
      `INSERT INTO orders
        (customer_name, customer_email, customer_phone, items, total, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, status, customer_name, customer_email, items, total, created_at`,
      [
        customer_name.trim(),
        customer_email.toLowerCase().trim(),
        customer_phone ? customer_phone.trim() : null,
        JSON.stringify(enrichedItems),
        total,
        notes ? notes.trim().slice(0, 500) : null,
      ]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando pedido' });
  }
});

/* GET /api/orders — solo admin */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    const params = [];
    let query = 'SELECT * FROM orders';
    if (status) {
      params.push(status);
      query += ` WHERE status = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC';
    params.push(Math.min(parseInt(limit) || 50, 100));
    query += ` LIMIT $${params.length}`;
    params.push(Math.max(parseInt(offset) || 0, 0));
    query += ` OFFSET $${params.length}`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo pedidos' });
  }
});

/* GET /api/orders/:id — solo admin */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [parseInt(req.params.id)]);
    if (!rows.length) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo pedido' });
  }
});

/* PUT /api/orders/:id/status — solo admin, para actualizar estado */
router.put('/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Estado inválido. Válidos: ${validStatuses.join(', ')}` });
  }
  try {
    const { rows } = await pool.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, parseInt(req.params.id)]
    );
    if (!rows.length) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando pedido' });
  }
});

module.exports = router;
