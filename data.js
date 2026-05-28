/* ====================================================================
   BAG · API configuration
   La URL del backend se autodetecta: si estamos en el mismo servidor
   (Render) usa rutas relativas. Si no, apunta a BAG_API_URL.
   ==================================================================== */

// '' = mismo origen (Render sirve el frontend desde el mismo server)
// Para Vercel apuntar a: 'https://tu-app.onrender.com'
window.BAG_API_URL = '';

window.BAG_DATA = {
  articles: [],
  brands:   [],
  products: {},
  settings: {},
};

window.formatPrice = function(n) {
  return '$ ' + Number(n).toLocaleString('es-AR');
};

window.normalizeProducts = function(raw) {
  if (Array.isArray(raw)) {
    const grouped = {};
    raw.forEach(p => {
      const key = `${p.brand_slug}/${p.model_slug}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    });
    return grouped;
  }
  return raw || {};
};
