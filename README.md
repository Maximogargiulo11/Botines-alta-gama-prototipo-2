# Botines Alta Gama CBA

Sitio web interactivo para **Botines Alta Gama Córdoba** — e-commerce de botines de fútbol de alta gama (Adidas, Nike, Puma, New Balance).

Estilo editorial premium inspirado en [SoccerBible](https://www.soccerbible.com/). Paleta B&N, tipografía serif Playfair Display, contenido editorial y catálogo de productos.

## Estructura del sitio

| Ruta | Pantalla |
|------|---------|
| `/` | Home — Lanzamientos + preview catálogo |
| `/lanzamientos/[slug]` | Artículo completo de un lanzamiento |
| `/marcas` | Las 4 marcas |
| `/marcas/[marca]` | Modelos por marca |
| `/marcas/[marca]/[modelo]` | Productos de un modelo |
| `/marcas/[marca]/[modelo]/[id]` | Detalle de producto |
| `/politica-cambios` | Política de cambios y devoluciones |
| `/faq` | Preguntas frecuentes |

## Tecnologías

- React 18 (via CDN, sin build step)
- Babel standalone (JSX en el browser)
- CSS puro con tokens de diseño custom
- Router hash-based (`#/ruta`)
- Persistencia del carrito en `localStorage`

## Cómo abrir

Simplemente abre `index.html` en un servidor local (no funciona via `file://` por las importaciones de módulos JSX).

```bash
npx serve .
# o
python3 -m http.server 8080
```

## Contacto

- **Instagram:** [@botinesaltagamacba](https://instagram.com/botinesaltagamacba)
- **WhatsApp:** +54 9 3516 83-6569
- **Ciudad:** Córdoba, Argentina

© 2026 Botines Alta Gama CBA · Córdoba, Argentina