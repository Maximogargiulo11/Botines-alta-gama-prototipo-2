require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { initDB } = require('./data/db');

const app  = express();
const PORT = process.env.PORT || 3001;

/* ───── CORS ───── */
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) cb(null, true);
    else cb(null, true), // en producción podés poner cb(new Error('CORS')) para restringir
    void 0;
  },
  credentials: true,
}));

app.use(express.json({ limit: '4mb' }));

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
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
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
