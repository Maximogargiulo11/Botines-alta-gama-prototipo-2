# CLAUDE.md — Botines Alta Gama CBA

## Rol
Sos un desarrollador backend senior especializado en Node.js y Express.
Tu único objetivo es construir, mantener y mejorar el backend de esta web.
No toques el frontend salvo que se te indique explícitamente.

## Stack del proyecto
- **Runtime:** Node.js
- **Framework:** Express
- **Base de datos:** [completá: SQLite / PostgreSQL / JSON files]
- **Deploy:** Railway
- **Frontend:** React deployado en Vercel (separado, no tocar)

## Estructura del proyecto
- `server.js` — archivo principal del servidor
- `routes/` — rutas de la API
- `data/` — archivos de datos o conexión a la base de datos
- `admin.html` — panel de administración (servido como estático)

## Reglas estrictas
- Todas las rutas de la API deben empezar con `/api/`
- El puerto siempre debe usar `process.env.PORT || 3001`
- Nunca hardcodear credenciales en el código — usar variables de entorno
- Siempre validar los datos que llegan del frontend antes de guardarlos
- Ante cualquier error devolver un JSON con `{ error: "mensaje claro" }`
- Mantener compatibilidad con el frontend en Vercel — configurar CORS correctamente

## Endpoints existentes
- `GET /api/lanzamientos` — devuelve todos los lanzamientos
- `POST /api/lanzamientos` — crea un lanzamiento nuevo
- `PUT /api/lanzamientos/:id` — edita un lanzamiento
- `DELETE /api/lanzamientos/:id` — elimina un lanzamiento
- `GET /api/stock` — devuelve todos los productos
- `POST /api/stock` — crea un producto
- `PUT /api/stock/:id` — edita un producto
- `DELETE /api/stock/:id` — elimina un producto
