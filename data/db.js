const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './data/database.db';
fs.mkdirSync(path.dirname(path.resolve(DB_PATH)), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* ── JSON / boolean helpers for rows ── */
function parseArticle(row) {
  if (!row) return null;
  const r = { ...row };
  try { r.body = typeof r.body === 'string' ? JSON.parse(r.body) : (r.body || []); } catch { r.body = []; }
  if (r.related_product && typeof r.related_product === 'string') {
    try { r.related_product = JSON.parse(r.related_product); } catch { r.related_product = null; }
  }
  r.featured    = Boolean(r.featured);
  r.show_on_home = Boolean(r.show_on_home);
  return r;
}

function parseProduct(row) {
  if (!row) return null;
  const r = { ...row };
  for (const k of ['sizes', 'available_sizes', 'images', 'spec']) {
    if (typeof r[k] === 'string') {
      try { r[k] = JSON.parse(r[k]); } catch { r[k] = k === 'sizes' ? {} : []; }
    }
  }
  return r;
}

/* ── Schema ── */
function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      slug          TEXT    UNIQUE NOT NULL,
      brand         TEXT,
      category      TEXT    DEFAULT 'LANZAMIENTO',
      title         TEXT    NOT NULL,
      subtitle      TEXT,
      excerpt       TEXT,
      date          TEXT,
      cover         TEXT,
      featured      INTEGER DEFAULT 0,
      body          TEXT    DEFAULT '[]',
      related_product TEXT,
      show_on_home  INTEGER DEFAULT 1,
      home_position INTEGER DEFAULT 0,
      created_at    TEXT    DEFAULT CURRENT_TIMESTAMP,
      updated_at    TEXT    DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS brands (
      slug    TEXT PRIMARY KEY,
      name    TEXT NOT NULL,
      tagline TEXT,
      cover   TEXT,
      logo    TEXT
    );

    CREATE TABLE IF NOT EXISTS models (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      brand_slug TEXT REFERENCES brands(slug) ON DELETE CASCADE,
      slug       TEXT NOT NULL,
      name       TEXT NOT NULL,
      tagline    TEXT,
      image      TEXT,
      UNIQUE(brand_slug, slug)
    );

    CREATE TABLE IF NOT EXISTS products (
      id              TEXT PRIMARY KEY,
      brand_slug      TEXT NOT NULL,
      model_slug      TEXT NOT NULL,
      name            TEXT NOT NULL,
      colorway        TEXT,
      color           TEXT,
      price           INTEGER,
      sizes           TEXT DEFAULT '{}',
      available_sizes TEXT DEFAULT '[]',
      images          TEXT DEFAULT '[]',
      spec            TEXT DEFAULT '{}',
      created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at      TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES ('home_articles_count', '6');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('home_catalog_count',  '4');
  `);

  seedIfEmpty();
  console.log('✅ Base de datos inicializada');
}

function seedIfEmpty() {
  const hasBrands = db.prepare('SELECT 1 FROM brands LIMIT 1').get();
  if (hasBrands) return;

  console.log('🌱 Cargando datos iniciales...');

  const insertBrand = db.prepare('INSERT OR IGNORE INTO brands (slug, name, tagline, cover) VALUES (?,?,?,?)');
  const insertModel = db.prepare('INSERT OR IGNORE INTO models (brand_slug, slug, name, tagline, image) VALUES (?,?,?,?,?)');
  const insertArticle = db.prepare(`
    INSERT OR IGNORE INTO articles
      (slug, brand, category, title, excerpt, date, cover, featured, body, related_product, show_on_home, home_position)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products
      (id, brand_slug, model_slug, name, colorway, color, price, sizes, available_sizes, images, spec)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `);

  const seedAll = db.transaction(() => {
    for (const b of [
      ['nike',        'Nike',        'El padre del speed boot moderno.',             ''],
      ['adidas',      'Adidas',      'Tres rayas, tres siluetas icónicas.',          ''],
      ['puma',        'Puma',        'El felino vuelve a la cancha.',                ''],
      ['new-balance', 'New Balance', 'Hecho en Inglaterra. Pensado para la cancha.', ''],
    ]) insertBrand.run(...b);

    for (const m of [
      ['nike',        'mercurial', 'Mercurial', 'Speed',   ''],
      ['nike',        'phantom',   'Phantom',   'Control', ''],
      ['nike',        'tiempo',    'Tiempo',    'Heritage',''],
      ['adidas',      'f50',       'F50',       'Speed',   ''],
      ['adidas',      'predator',  'Predator',  'Power',   ''],
      ['adidas',      'copa',      'Copa',      'Touch',   ''],
      ['puma',        'future',    'Future',    'Adapt',   ''],
      ['puma',        'ultra',     'Ultra',     'Speed',   ''],
      ['new-balance', 'furon',     'Furon',     'Speed',   ''],
      ['new-balance', 'tekela',    'Tekela',    'Creator', ''],
    ]) insertModel.run(...m);

    for (const a of [
      {
        slug: 'puma-showtime-pack-future-ultra', brand: 'Puma', category: 'LANZAMIENTO', featured: 1,
        title: "Puma lanza el 'Showtime Pack': Future y Ultra bajo una sola dirección",
        excerpt: 'La línea de fútbol de Puma se reordena. Future y Ultra adoptan una identidad cromática compartida.',
        date: '24 MAY 2026', cover: '',
        body: JSON.stringify([
          { type: 'paragraph', text: 'Puma Football presenta el Showtime Pack, un drop unificado que pone a las dos siluetas estrella de la marca bajo la misma identidad visual.' },
          { type: 'paragraph', text: 'El colorway combina magenta eléctrico, naranja solar y violeta metálico en degradés cromados que cambian según el ángulo de luz.' },
          { type: 'paragraph', text: 'En Argentina llega con cupos limitados a través de tiendas seleccionadas. Botines Alta Gama recibe el pack completo en talles del 39 al 44.' },
        ]),
        related_product: JSON.stringify({ brand: 'Puma', model: 'future', id: 'fut-001' }),
        show_on_home: 1, home_position: 0,
      },
      {
        slug: 'nike-mercurial-vapor-16-mad-bullet', brand: 'Nike', category: 'LANZAMIENTO', featured: 0,
        title: "Nike presenta el Mercurial Vapor 16 'Mad Bullet'",
        excerpt: 'La nueva silueta del speed boot de Nike vuelve a apostar por la velocidad pura.',
        date: '22 MAY 2026', cover: '',
        body: JSON.stringify([
          { type: 'paragraph', text: 'Nike Football vuelve a poner el pie en el acelerador con el Mercurial Vapor 16 Mad Bullet.' },
          { type: 'paragraph', text: 'El upper Vaporposite+ se rediseña con un patrón de microtacos más profundo.' },
        ]),
        related_product: JSON.stringify({ brand: 'Nike', model: 'mercurial', id: 'merc-001' }),
        show_on_home: 1, home_position: 1,
      },
      {
        slug: 'adidas-predator-elite-citrus-energy', brand: 'Adidas', category: 'CAMPAÑA', featured: 0,
        title: "Adidas Predator Elite FG 'Citrus Energy'",
        excerpt: 'El control vuelve a la cancha. Adidas relanza la línea Predator con amarillo solar y coral eléctrico.',
        date: '20 MAY 2026', cover: '',
        body: JSON.stringify([{ type: 'paragraph', text: 'Adidas continúa apostando por el dominio técnico con la nueva edición del Predator Elite en colorway Citrus Energy.' }]),
        related_product: null, show_on_home: 1, home_position: 2,
      },
      {
        slug: 'puma-future-7-ultra-pack', brand: 'Puma', category: 'CAMPAÑA', featured: 0,
        title: 'Detalle: el upper FUZIONFIT360 del Future 8',
        excerpt: 'Una mirada técnica al sistema de ajuste adaptable que define a la línea Future de Puma.',
        date: '18 MAY 2026', cover: '',
        body: JSON.stringify([{ type: 'paragraph', text: 'El FUZIONFIT360 es el sistema de ajuste más avanzado de Puma.' }]),
        related_product: null, show_on_home: 1, home_position: 3,
      },
      {
        slug: 'new-balance-furon-v8-revealed', brand: 'New Balance', category: 'NOVEDAD', featured: 0,
        title: 'New Balance Furon v8: el speed boot del año',
        excerpt: 'NB sigue afilando su división de fútbol con una iteración más liviana del Furon.',
        date: '15 MAY 2026', cover: '',
        body: JSON.stringify([{ type: 'paragraph', text: 'New Balance presenta el Furon v8.' }]),
        related_product: null, show_on_home: 1, home_position: 4,
      },
      {
        slug: 'nike-phantom-gx-ii-elite', brand: 'Nike', category: 'LANZAMIENTO', featured: 0,
        title: 'Nike Phantom GX II Elite: pegada y precisión',
        excerpt: 'El silo de control de Nike recibe una actualización completa.',
        date: '12 MAY 2026', cover: '',
        body: JSON.stringify([{ type: 'paragraph', text: 'El Phantom GX II llega con mejoras sustanciales.' }]),
        related_product: null, show_on_home: 1, home_position: 5,
      },
      {
        slug: 'adidas-copa-pure-iii', brand: 'Adidas', category: 'CAMPAÑA', featured: 0,
        title: 'Adidas Copa Pure III: el cuero canguro vuelve',
        excerpt: 'El clásico del touch se reinventa con materiales premium.',
        date: '10 MAY 2026', cover: '',
        body: JSON.stringify([{ type: 'paragraph', text: 'La Copa Pure III trae de vuelta el cuero canguro.' }]),
        related_product: null, show_on_home: 0, home_position: 6,
      },
    ]) {
      insertArticle.run(
        a.slug, a.brand, a.category, a.title, a.excerpt, a.date, a.cover,
        a.featured, a.body, a.related_product, a.show_on_home, a.home_position
      );
    }

    for (const p of [
      {
        id: 'merc-001', brand_slug: 'nike', model_slug: 'mercurial',
        name: 'Mercurial Vapor 16 Elite FG', colorway: 'Mad Bullet', color: '#d4ff00', price: 529990,
        sizes: { eu: ['40','40.5','41','42','42.5','43','44'], us: ['7','7.5','8','9','9.5','10','10.5'], uk: ['6','6.5','7','8','8.5','9','9.5'] },
        available_sizes: ['40','41','42','42.5','43'],
        images: [], spec: { suela: 'FG', terreno: 'Césped natural firme', peso: '186 g', coleccion: 'Mad Bullet Pack' },
      },
      {
        id: 'fut-001', brand_slug: 'puma', model_slug: 'future',
        name: 'Future 8 Ultimate FG', colorway: 'Showtime Magenta', color: '#e63946', price: 469990,
        sizes: { eu: ['40','41','42','43','44'], us: ['7','8','9','10','11'], uk: ['6','7','8','9','10'] },
        available_sizes: ['40','41','42','43'],
        images: [], spec: { suela: 'FG', terreno: 'Césped firme', peso: '195 g', coleccion: 'Showtime Pack' },
      },
      {
        id: 'pred-001', brand_slug: 'adidas', model_slug: 'predator',
        name: 'Predator Elite FG', colorway: 'Citrus Energy', color: '#ff6b00', price: 559990,
        sizes: { eu: ['40','41','42','43','44'], us: ['7','8','9','10','11'], uk: ['6','7','8','9','10'] },
        available_sizes: ['41','42','42.5','43'],
        images: [], spec: { suela: 'FG', terreno: 'Césped firme', peso: '202 g', coleccion: 'Citrus Energy' },
      },
      {
        id: 'fur-001', brand_slug: 'new-balance', model_slug: 'furon',
        name: 'Furon v8 Pro FG', colorway: 'Eclipse', color: '#ffffff', price: 419990,
        sizes: { eu: ['40','41','42','43'], us: ['7','8','9','10'], uk: ['6','7','8','9'] },
        available_sizes: ['41','42'],
        images: [], spec: { suela: 'FG', terreno: 'Césped firme', peso: '188 g', coleccion: 'Eclipse Pack' },
      },
    ]) {
      insertProduct.run(
        p.id, p.brand_slug, p.model_slug, p.name, p.colorway, p.color, p.price,
        JSON.stringify(p.sizes), JSON.stringify(p.available_sizes),
        JSON.stringify(p.images), JSON.stringify(p.spec)
      );
    }
  });

  seedAll();
  console.log('✅ Datos iniciales cargados');
}

module.exports = { db, initDB, parseArticle, parseProduct };
