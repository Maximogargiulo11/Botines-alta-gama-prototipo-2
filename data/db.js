const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    /* ---- ARTICLES ---- */
    await client.query(`
      CREATE TABLE IF NOT EXISTS articles (
        id        SERIAL PRIMARY KEY,
        slug      TEXT UNIQUE NOT NULL,
        brand     TEXT,
        category  TEXT    DEFAULT 'LANZAMIENTO',
        title     TEXT    NOT NULL,
        subtitle  TEXT,
        excerpt   TEXT,
        date      TEXT,
        cover     TEXT,
        featured  BOOLEAN DEFAULT FALSE,
        body      JSONB   DEFAULT '[]',
        related_product JSONB,
        show_on_home    BOOLEAN DEFAULT TRUE,
        home_position   INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    /* ---- BRANDS ---- */
    await client.query(`
      CREATE TABLE IF NOT EXISTS brands (
        slug    TEXT PRIMARY KEY,
        name    TEXT NOT NULL,
        tagline TEXT,
        cover   TEXT,
        logo    TEXT
      )
    `);

    /* ---- MODELS ---- */
    await client.query(`
      CREATE TABLE IF NOT EXISTS models (
        id         SERIAL PRIMARY KEY,
        brand_slug TEXT REFERENCES brands(slug) ON DELETE CASCADE,
        slug       TEXT NOT NULL,
        name       TEXT NOT NULL,
        tagline    TEXT,
        image      TEXT,
        UNIQUE(brand_slug, slug)
      )
    `);

    /* ---- PRODUCTS ---- */
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id             TEXT PRIMARY KEY,
        brand_slug     TEXT NOT NULL,
        model_slug     TEXT NOT NULL,
        name           TEXT NOT NULL,
        colorway       TEXT,
        color          TEXT,
        price          INTEGER,
        sizes          JSONB DEFAULT '{}',
        available_sizes JSONB DEFAULT '[]',
        images         JSONB DEFAULT '[]',
        spec           JSONB DEFAULT '{}',
        created_at     TIMESTAMP DEFAULT NOW(),
        updated_at     TIMESTAMP DEFAULT NOW()
      )
    `);

    /* ---- ORDERS ---- */
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id           SERIAL PRIMARY KEY,
        status       TEXT    NOT NULL DEFAULT 'pending',
        customer_name  TEXT  NOT NULL,
        customer_email TEXT  NOT NULL,
        customer_phone TEXT,
        items        JSONB   NOT NULL DEFAULT '[]',
        total        INTEGER NOT NULL DEFAULT 0,
        notes        TEXT,
        created_at   TIMESTAMP DEFAULT NOW(),
        updated_at   TIMESTAMP DEFAULT NOW()
      )
    `);

    /* ---- SETTINGS ---- */
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    await client.query(`
      INSERT INTO settings (key, value) VALUES
        ('home_articles_count', '6'),
        ('home_catalog_count', '4')
      ON CONFLICT (key) DO NOTHING
    `);

    await client.query('COMMIT');

    /* Seed only if DB is empty */
    await seedIfEmpty();

    console.log('✅ Base de datos inicializada');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error inicializando DB:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

async function seedIfEmpty() {
  const { rowCount } = await pool.query('SELECT 1 FROM brands LIMIT 1');
  if (rowCount > 0) return;

  console.log('🌱 Cargando datos iniciales...');

  /* Brands */
  const brands = [
    { slug: 'nike',        name: 'Nike',        tagline: 'El padre del speed boot moderno.',               cover: '' },
    { slug: 'adidas',      name: 'Adidas',       tagline: 'Tres rayas, tres siluetas icónicas.',            cover: '' },
    { slug: 'puma',        name: 'Puma',         tagline: 'El felino vuelve a la cancha.',                  cover: '' },
    { slug: 'new-balance', name: 'New Balance',  tagline: 'Hecho en Inglaterra. Pensado para la cancha.',   cover: '' },
  ];
  for (const b of brands) {
    await pool.query(
      'INSERT INTO brands (slug, name, tagline, cover) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
      [b.slug, b.name, b.tagline, b.cover]
    );
  }

  /* Models */
  const models = [
    { brand: 'nike',        slug: 'mercurial', name: 'Mercurial', tagline: 'Speed',   image: '' },
    { brand: 'nike',        slug: 'phantom',   name: 'Phantom',   tagline: 'Control', image: '' },
    { brand: 'nike',        slug: 'tiempo',    name: 'Tiempo',    tagline: 'Heritage',image: '' },
    { brand: 'adidas',      slug: 'f50',       name: 'F50',       tagline: 'Speed',   image: '' },
    { brand: 'adidas',      slug: 'predator',  name: 'Predator',  tagline: 'Power',   image: '' },
    { brand: 'adidas',      slug: 'copa',      name: 'Copa',      tagline: 'Touch',   image: '' },
    { brand: 'puma',        slug: 'future',    name: 'Future',    tagline: 'Adapt',   image: '' },
    { brand: 'puma',        slug: 'ultra',     name: 'Ultra',     tagline: 'Speed',   image: '' },
    { brand: 'new-balance', slug: 'furon',     name: 'Furon',     tagline: 'Speed',   image: '' },
    { brand: 'new-balance', slug: 'tekela',    name: 'Tekela',    tagline: 'Creator', image: '' },
  ];
  for (const m of models) {
    await pool.query(
      'INSERT INTO models (brand_slug, slug, name, tagline, image) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
      [m.brand, m.slug, m.name, m.tagline, m.image]
    );
  }

  /* Articles */
  const articles = [
    {
      slug: 'puma-showtime-pack-future-ultra',
      brand: 'Puma', category: 'LANZAMIENTO', featured: true,
      title: "Puma lanza el 'Showtime Pack': Future y Ultra bajo una sola dirección",
      excerpt: 'La línea de fútbol de Puma se reordena. Future y Ultra adoptan una identidad cromática compartida — magenta eléctrico, naranja solar y violeta metálico — para la temporada 26/27.',
      date: '24 MAY 2026', cover: '',
      body: JSON.stringify([
        { type: 'paragraph', text: 'Puma Football presenta el Showtime Pack, un drop unificado que pone a las dos siluetas estrella de la marca — Future y Ultra — bajo la misma identidad visual. Es la primera vez en cinco temporadas que la división de fútbol del felino consolida sus líneas creativa y de velocidad en un solo lanzamiento.' },
        { type: 'paragraph', text: 'El colorway combina magenta eléctrico, naranja solar y violeta metálico en degradés cromados que cambian según el ángulo de luz. La construcción se mantiene fiel: Future con el upper FUZIONFIT360 adaptable y Ultra con la placa de carbono ULTRAWEAVE.' },
        { type: 'paragraph', text: 'En Argentina llega con cupos limitados a través de tiendas seleccionadas. Botines Alta Gama recibe el pack completo en talles del 39 al 44 — disponibilidad real en catálogo, sin pre-órdenes ni listas de espera.' },
      ]),
      related_product: JSON.stringify({ brand: 'Puma', model: 'future', id: 'fut-001' }),
      show_on_home: true, home_position: 0,
    },
    {
      slug: 'nike-mercurial-vapor-16-mad-bullet',
      brand: 'Nike', category: 'LANZAMIENTO', featured: false,
      title: "Nike presenta el Mercurial Vapor 16 'Mad Bullet'",
      excerpt: 'La nueva silueta del speed boot de Nike vuelve a apostar por la velocidad pura, con una placa de carbono rediseñada y el upper Vaporposite+ mejorado.',
      date: '22 MAY 2026', cover: '',
      body: JSON.stringify([
        { type: 'paragraph', text: 'Nike Football vuelve a poner el pie en el acelerador con el Mercurial Vapor 16 Mad Bullet, una evolución que se construye sobre la herencia de velocidad de la silueta y suma refinamientos técnicos en cada milímetro del botín.' },
        { type: 'paragraph', text: 'El upper Vaporposite+ se rediseña con un patrón de microtacos más profundo, pensado para mejorar el control en superficies húmedas. La placa de carbono, ahora más liviana, redistribuye la presión del antepié para potenciar la aceleración en los primeros tres pasos.' },
      ]),
      related_product: JSON.stringify({ brand: 'Nike', model: 'mercurial', id: 'merc-001' }),
      show_on_home: true, home_position: 1,
    },
    {
      slug: 'adidas-predator-elite-citrus-energy',
      brand: 'Adidas', category: 'CAMPAÑA', featured: false,
      title: "Adidas Predator Elite FG 'Citrus Energy'",
      excerpt: 'El control vuelve a la cancha. Adidas relanza la línea Predator con un colorway que enciende la atención: amarillo solar y coral eléctrico.',
      date: '20 MAY 2026', cover: '',
      body: JSON.stringify([
        { type: 'paragraph', text: 'Adidas continúa apostando por el dominio técnico con la nueva edición del Predator Elite en colorway Citrus Energy.' },
      ]),
      show_on_home: true, home_position: 2,
    },
    {
      slug: 'puma-future-7-ultra-pack',
      brand: 'Puma', category: 'CAMPAÑA', featured: false,
      title: 'Detalle: el upper FUZIONFIT360 del Future 8',
      excerpt: 'Una mirada técnica al sistema de ajuste adaptable que define a la línea Future de Puma.',
      date: '18 MAY 2026', cover: '',
      body: JSON.stringify([{ type: 'paragraph', text: 'El FUZIONFIT360 es el sistema de ajuste más avanzado de Puma.' }]),
      show_on_home: true, home_position: 3,
    },
    {
      slug: 'new-balance-furon-v8-revealed',
      brand: 'New Balance', category: 'NOVEDAD', featured: false,
      title: 'New Balance Furon v8: el speed boot del año',
      excerpt: 'NB sigue afilando su división de fútbol con una iteración más liviana del Furon.',
      date: '15 MAY 2026', cover: '',
      body: JSON.stringify([{ type: 'paragraph', text: 'New Balance presenta el Furon v8.' }]),
      show_on_home: true, home_position: 4,
    },
    {
      slug: 'nike-phantom-gx-ii-elite',
      brand: 'Nike', category: 'LANZAMIENTO', featured: false,
      title: 'Nike Phantom GX II Elite: pegada y precisión',
      excerpt: 'El silo de control de Nike recibe una actualización completa.',
      date: '12 MAY 2026', cover: '',
      body: JSON.stringify([{ type: 'paragraph', text: 'El Phantom GX II llega con mejoras sustanciales.' }]),
      show_on_home: true, home_position: 5,
    },
    {
      slug: 'adidas-copa-pure-iii',
      brand: 'Adidas', category: 'CAMPAÑA', featured: false,
      title: 'Adidas Copa Pure III: el cuero canguro vuelve',
      excerpt: 'El clásico del touch se reinventa con materiales premium y construcción artesanal.',
      date: '10 MAY 2026', cover: '',
      body: JSON.stringify([{ type: 'paragraph', text: 'La Copa Pure III trae de vuelta el cuero canguro.' }]),
      show_on_home: false, home_position: 6,
    },
  ];

  for (const a of articles) {
    await pool.query(
      `INSERT INTO articles
        (slug, brand, category, title, excerpt, date, cover, featured, body, related_product, show_on_home, home_position)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT DO NOTHING`,
      [a.slug, a.brand, a.category, a.title, a.excerpt, a.date, a.cover,
       a.featured, a.body, a.related_product || null, a.show_on_home, a.home_position]
    );
  }

  /* Products */
  const products = [
    {
      id: 'merc-001', brand_slug: 'nike', model_slug: 'mercurial',
      name: 'Mercurial Vapor 16 Elite FG', colorway: 'Mad Bullet', color: '#d4ff00', price: 529990,
      sizes: { eu: ['40','40.5','41','42','42.5','43','44'], us: ['7','7.5','8','9','9.5','10','10.5'], uk: ['6','6.5','7','8','8.5','9','9.5'] },
      available_sizes: ['40','41','42','42.5','43'],
      images: [],
      spec: { suela: 'FG (Firm Ground)', terreno: 'Césped natural firme', peso: '186 g', coleccion: 'Mad Bullet Pack' },
    },
    {
      id: 'fut-001', brand_slug: 'puma', model_slug: 'future',
      name: 'Future 8 Ultimate FG', colorway: 'Showtime Magenta', color: '#e63946', price: 469990,
      sizes: { eu: ['40','41','42','43','44'], us: ['7','8','9','10','11'], uk: ['6','7','8','9','10'] },
      available_sizes: ['40','41','42','43'],
      images: [],
      spec: { suela: 'FG', terreno: 'Césped firme', peso: '195 g', coleccion: 'Showtime Pack' },
    },
    {
      id: 'pred-001', brand_slug: 'adidas', model_slug: 'predator',
      name: 'Predator Elite FG', colorway: 'Citrus Energy', color: '#ff6b00', price: 559990,
      sizes: { eu: ['40','41','42','43','44'], us: ['7','8','9','10','11'], uk: ['6','7','8','9','10'] },
      available_sizes: ['41','42','42.5','43'],
      images: [],
      spec: { suela: 'FG', terreno: 'Césped firme', peso: '202 g', coleccion: 'Citrus Energy' },
    },
    {
      id: 'fur-001', brand_slug: 'new-balance', model_slug: 'furon',
      name: 'Furon v8 Pro FG', colorway: 'Eclipse', color: '#ffffff', price: 419990,
      sizes: { eu: ['40','41','42','43'], us: ['7','8','9','10'], uk: ['6','7','8','9'] },
      available_sizes: ['41','42'],
      images: [],
      spec: { suela: 'FG', terreno: 'Césped firme', peso: '188 g', coleccion: 'Eclipse Pack' },
    },
  ];

  for (const p of products) {
    await pool.query(
      `INSERT INTO products (id, brand_slug, model_slug, name, colorway, color, price, sizes, available_sizes, images, spec)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT DO NOTHING`,
      [p.id, p.brand_slug, p.model_slug, p.name, p.colorway, p.color, p.price,
       JSON.stringify(p.sizes), JSON.stringify(p.available_sizes),
       JSON.stringify(p.images), JSON.stringify(p.spec)]
    );
  }

  console.log('✅ Datos iniciales cargados');
}

module.exports = { pool, initDB };
