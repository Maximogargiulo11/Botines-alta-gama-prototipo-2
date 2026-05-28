/* global React, BAG_DATA, SmallArticleCard, SectionRule */
const { useState: useState_art } = React;

/* ── Helpers ── */
function extractInstagramId(url) {
  if (!url) return null;
  const m = url.match(/instagram\.com\/p\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

function ArticleImage({ block }) {
  const ratio = (block.width && block.height) ? `${block.width} / ${block.height}` : 'auto';
  const wrapStyle = {
    full:    { width: '100%', margin: '8px 0' },
    half:    { width: '50%', margin: '8px auto' },
    breakout:{ width: '100vw', marginLeft: 'calc(50% - 50vw)', margin: '8px 0' },
  }[block.display || 'full'] || { width: '100%', margin: '8px 0' };

  return (
    <figure style={wrapStyle}>
      <img src={block.url} alt={block.caption || ''} style={{ width: '100%', aspectRatio: ratio, objectFit: 'cover', display: 'block' }} />
      {block.caption && (
        <figcaption style={{ fontSize: 11, color: 'var(--bag-fg-muted)', marginTop: 8, textAlign: 'center', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}

function ArticleInstagram({ url, display }) {
  const postId = extractInstagramId(url);
  const maxW = display === 'half' ? 440 : '100%';
  if (!postId) {
    return (
      <div className="bag-instagram-embed">
        <div className="bag-instagram-embed__frame">
          <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor"/></svg>
          <a className="bag-instagram-embed__link" href={url} target="_blank" rel="noreferrer">Ver en Instagram</a>
        </div>
      </div>
    );
  }
  return (
    <div className="bag-instagram-embed" style={{ maxWidth: maxW, margin: '0 auto' }}>
      <iframe
        src={`https://www.instagram.com/p/${postId}/embed`}
        width="100%" height="540" frameBorder="0" scrolling="no"
        allowTransparency="true" loading="lazy"
        style={{ display: 'block', border: '1px solid var(--bag-line)' }}
      />
    </div>
  );
}

function ArticleRow({ block }) {
  const renderSub = (sub) => {
    if (!sub) return null;
    if (sub.type === 'instagram') return <ArticleInstagram url={sub.url} display="full" />;
    if (sub.type === 'image') return (
      <div>
        <img src={sub.url} alt={sub.caption || ''} style={{ width: '100%', objectFit: 'cover', display: 'block' }} />
        {sub.caption && <p style={{ fontSize: 11, color: 'var(--bag-fg-muted)', marginTop: 6, textAlign: 'center', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{sub.caption}</p>}
      </div>
    );
    return null;
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, margin: '8px 0' }}>
      {renderSub(block.left)}{renderSub(block.right)}
    </div>
  );
}

function renderBlock(block, i) {
  if (!block) return null;
  if (typeof block === 'string') return <p key={i}>{block}</p>;
  switch (block.type) {
    case 'paragraph':  return <p key={i}>{block.text}</p>;
    case 'image':      return <ArticleImage key={i} block={block} />;
    case 'instagram':  return <ArticleInstagram key={i} url={block.url} display={block.display} />;
    case 'row':        return <ArticleRow key={i} block={block} />;
    default: return null;
  }
}

function ArticleScreen({ slug, navigate }) {
  const article = BAG_DATA.articles.find(a => a.slug === slug) || BAG_DATA.articles[0];
  const related = BAG_DATA.articles.filter(a => a.id !== article?.id).slice(0, 6);
  const [copied, setCopied] = useState_art(false);
  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (!article) return (
    <main style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--bag-fg-muted)' }}>
      Artículo no encontrado.
    </main>
  );

  let relProductObj = null;
  if (article.related_product) {
    const rp = article.related_product;
    const key = `${(rp.brand || '').toLowerCase()}/${rp.model}`;
    const list = BAG_DATA.products[key] || [];
    relProductObj = list.find(p => p.id === rp.id) || list[0];
  }

  const body = Array.isArray(article.body) ? article.body : [];

  return (
    <main className="bag-article-page">
      <div className="bag-article-hero">
        <div className="bag-article-hero__blur" style={{ backgroundImage: `url(${article.cover})` }} />
        <div className="bag-article-hero__image">
          {article.cover && <img src={article.cover} alt="" />}
        </div>
      </div>

      <div className="bag-article-head">
        <nav className="bag-breadcrumb">
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }}>Inicio</a>
          <span>›</span>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }}>Lanzamientos</a>
          <span>›</span>
          <span className="is-current">{article.title}</span>
        </nav>
        {article.category && <div className="bag-eyebrow">{article.category}{article.brand ? ` · ${article.brand.toUpperCase()}` : ''}</div>}
        <h1 className="bag-article-head__title">{article.title}</h1>
        {article.subtitle && <p style={{ fontSize: 'var(--bag-fs-lg)', color: 'var(--bag-fg-muted)', lineHeight: 1.4 }}>{article.subtitle}</p>}
        <div className="bag-article-head__meta">
          <span className="bag-meta">{article.date}</span>
          <div className="bag-article-head__share">
            <a href="#" aria-label="Facebook" onClick={(e) => e.preventDefault()}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 22V12h3l.5-4H14V5.5c0-1 .3-1.7 1.8-1.7H17V.3C16.7.2 15.6 0 14.4 0c-2.6 0-4.4 1.6-4.4 4.5V8H7v4h3v10h4z"/></svg>
            </a>
            <a href="#" aria-label="X / Twitter" onClick={(e) => e.preventDefault()}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.244 2H21l-6.54 7.47L22 22h-6.94l-4.94-6.5L4.6 22H2l7.03-8.03L2 2h7.1l4.46 5.95L18.24 2zm-1.22 18h1.85L7.06 4H5.1l11.92 16z"/></svg>
            </a>
            <a href={"https://wa.me/?text=" + encodeURIComponent(article.title + " " + window.location.href)} target="_blank" rel="noreferrer" aria-label="WhatsApp">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3.4-7.04L21 4l-.96 3.4A8.96 8.96 0 0 1 21 12z"/><path d="M8.6 9.3c.15-.5.55-.8 1-.85.4 0 .8.04 1 .5.2.45.6 1.55.65 1.65.05.15-.05.3-.2.45-.15.15-.4.4-.55.5-.15.15-.25.3-.1.5.95 1.6 2.2 2.7 3.7 3.45.25.1.4.05.5-.1.1-.15.4-.5.55-.7.15-.2.3-.15.5-.1.2.1 1.3.6 1.5.7.2.1.35.15.4.25.05.1.05.55-.15 1.1-.2.55-1.1 1.05-1.6 1.1z"/></svg>
            </a>
            <button onClick={copyLink} aria-label="Copiar link" style={{ position: 'relative' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>
              {copied && <span className="bag-share-toast">Copiado</span>}
            </button>
          </div>
        </div>
      </div>

      <article className="bag-article-body">
        {body.map((block, i) => {
          const rendered = renderBlock(block, i);
          if (i === 1 && relProductObj) {
            const rp = article.related_product;
            return (
              <React.Fragment key={i}>
                {rendered}
                <aside className="bag-related-product">
                  <div className="bag-related-product__media">
                    <img src={(relProductObj.images || [])[0] || ''} alt="" />
                  </div>
                  <div className="bag-related-product__body">
                    <div className="bag-eyebrow bag-eyebrow--muted">{article.brand?.toUpperCase()}</div>
                    <div className="bag-related-product__name">{relProductObj.name}</div>
                    <div className="bag-related-product__colorway">{relProductObj.colorway}</div>
                    <div className="bag-related-product__price">{window.formatPrice(relProductObj.price)}</div>
                    <button className="bag-btn bag-btn--primary" onClick={() => navigate("/marcas/" + (rp.brand||'').toLowerCase() + "/" + rp.model)}>VER EN CATÁLOGO</button>
                  </div>
                </aside>
              </React.Fragment>
            );
          }
          return rendered;
        })}
      </article>

      {related.length > 0 && (
        <React.Fragment>
          <SectionRule label="MÁS LANZAMIENTOS" />
          <section className="bag-grid-3">
            {related.map(a => (
              <SmallArticleCard key={a.id} article={a} onClick={() => navigate("/lanzamientos/" + a.slug)} />
            ))}
          </section>
        </React.Fragment>
      )}
    </main>
  );
}

Object.assign(window, { ArticleScreen });
