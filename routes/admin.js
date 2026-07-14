const express  = require('express');
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const router   = express.Router();

/* POST /api/admin/login */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  const validUser = username === process.env.ADMIN_USERNAME;
  const storedPassword = process.env.ADMIN_PASSWORD || '';

  let validPassword = false;
  if (storedPassword.startsWith('$2')) {
    // Contraseña hasheada con bcrypt
    validPassword = await bcrypt.compare(password, storedPassword);
  } else {
    // Comparación directa (para migración — usar bcrypt en producción)
    validPassword = password === storedPassword;
  }

  if (!validUser || !validPassword) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '24h' });
  res.json({ token });
});

/* GET /api/admin/verify */
router.get('/verify', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    res.json({ ok: true, username: payload.username });
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
});

module.exports = router;
