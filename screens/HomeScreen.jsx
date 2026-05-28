/* global React, BAG_DATA, HeroArticle, ArticleCard, SplitArticle, SmallArticleCard, ProductPreviewCard, SectionRule */

function HomeScreen({ navigate }) {
  const articles = BAG_DATA.articles || [];
  const settings = BAG_DATA.settings || {};
  const articleCount  = parseInt(settings.home_articles_count  || 6);
  const catalogCount  = parseInt(settings.home_catalog_count   || 4);

  // Artículos visibles en home, ya ordenados por home_position
  const homeArticles = articles.filter(a => a.show_on_home !== false).slice(0, articleCount);
  const hero      = homeArticles[0];
  const secondary = homeArticles.slice(1, 5);
  const wide      = homeArticles[5] || homeArticles[4];
  const small     = homeArticles.slice(1, 5);

  // Catalog preview
  const catalogPreview = [];
  Object.entries(BAG_DATA.products || {}).forEach(([key, list]) => {
    if (catalogPreview.length < catalogCount && list.length) {
      const [brand, model] = key.split('/');
      catalogPreview.push({ product: list[0], brand, model });
    }
  });

  if (!hero) {
    return (
      <main style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--bag-fg-muted)' }}>
        No hay lanzamientos publicados todavía.
      </main>
    );
  }

  return (
    <main className="bag-home">
      {/* BLOQUE 1 — Hero */}
      <HeroArticle article={hero} onClick={() => navigate("/lanzamientos/" + hero.slug)} />

      {/* BLOQUE 2 — Grid 4 secundarios */}
      {secondary.length > 0 && (
        <section className="bag-grid-4">
          {secondary.map(a => (
            <ArticleCard key={a.id} article={a} onClick={() => navigate("/lanzamientos/" + a.slug)} />
          ))}
        </section>
      )}

      {/* BLOQUE 3 — Split article */}
      {wide && wide.id !== hero.id && <SplitArticle article={wide} onClick={() => navigate("/lanzamientos/" + wide.slug)} />}

      {/* BLOQUE 4 — Grid 4 small cards */}
      {small.length > 0 && (
        <section className="bag-grid-4 bag-grid-4--small">
          {small.map(a => (
            <SmallArticleCard key={a.id} article={a} onClick={() => navigate("/lanzamientos/" + a.slug)} />
          ))}
        </section>
      )}

      {/* BLOQUE 5 — Section rule */}
      <SectionRule label="CATÁLOGO" />

      {/* BLOQUE 6 — Catalog preview */}
      <section className="bag-catalog-preview">
        <div className="bag-grid-4">
          {catalogPreview.map(({ product, brand, model }) => (
            <ProductPreviewCard
              key={product.id}
              product={product}
              brand={brand.toUpperCase()}
              model={model}
              onClick={() => navigate("/marcas/" + brand + "/" + model + "/" + product.id)}
            />
          ))}
        </div>
        <div className="bag-catalog-preview__cta">
          <button className="bag-btn bag-btn--ghost" onClick={() => navigate('/marcas')}>
            VER CATÁLOGO COMPLETO
            <svg viewBox="0 0 16 16" width="14" height="14" style={{ marginLeft: 8 }} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8 L13 8 M9 4 L13 8 L9 12"/></svg>
          </button>
        </div>
      </section>
    </main>
  );
}

Object.assign(window, { HomeScreen });
