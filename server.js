require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const path       = require('path');
const rateLimit  = require('express-rate-limit');
const { initDB } = require('./data/db');

const app  = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

/* ───── Seguridad HTTP headers ───── */
app.use(helmet({ contentSecurityPolicy: false }));

/* ───── CORS ───── */
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    if (!isProd) return cb(null, true);
    return cb(new Error('Origen no permitido'));
  },
  credentials: true,
}));

/* ───── Rate limiting global ───── */
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intenta más tarde' },
}));

/* ───── Rate limiting estricto para login ───── */
app.use('/api/admin/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de login, intenta en 15 minutos' },
}));

app.use(express.json({ limit: '1mb' }));

/* ───── Archivos estáticos (frontend) ───── */
app.use(express.static(path.join(__dirname)));

/* ───── Panel de admin ───── */
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

/* ───── API ───── */
app.use('/api/admin',        require('./routes/admin'));
app.use('/api/lanzamientos', require('./routes/lanzamientos'));
app.use('/api/stock',        require('./routes/stock'));
app.use('/api/marcas',       require('./routes/marcas'));
app.use('/api/settings',     require('./routes/settings'));
app.use('/api/orders',       require('./routes/orders'));

/* Health check */
app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

/* 404 de API */
app.use('/api/*', (_, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

/* SPA fallback — para rutas del frontend React */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* ───── Error handler ───── */
app.use((err, req, res, _next) => {
  console.error(err);
  const message = isProd ? 'Error interno del servidor' : (err.message || 'Error interno del servidor');
  res.status(err.status || 500).json({ error: message });
});

/* ───── Arrancar ───── */
initDB()
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
  })
  .catch(err => {
    console.error('❌ No se pudo inicializar la DB:', err.message);
    process.exit(1);
  });
