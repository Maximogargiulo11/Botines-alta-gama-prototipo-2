# Cómo hacer deploy en Render

## 1. Crear el servicio en Render

1. Ir a [render.com](https://render.com) → **New → Web Service**
2. Conectar el repositorio de GitHub `Maximogargiulo11/Botines-alta-gama-prototipo-2`
3. Configurar:
   - **Name:** `botines-alta-gama`
   - **Branch:** `main` (o tu rama de producción)
   - **Root Directory:** *(dejar vacío)*
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Node version:** 18

## 2. Crear la base de datos PostgreSQL

1. En Render → **New → PostgreSQL**
2. Crear con el plan gratuito
3. Copiar la **Internal Database URL** (o External si es necesario)

## 3. Variables de entorno

En el Web Service → **Environment** → agregar:

```
DATABASE_URL    = postgresql://... (la URL de tu DB en Render)
ADMIN_USERNAME  = admin              (el usuario que quieras)
ADMIN_PASSWORD  = tu-password-seguro (mínimo 12 caracteres)
JWT_SECRET      = un-string-largo-y-aleatorio-de-al-menos-32-chars
FRONTEND_URL    = https://tu-app.vercel.app  (si usas Vercel para el frontend)
NODE_ENV        = production
```

## 4. Acceder al panel de admin

Una vez desplegado, ir a:
```
https://tu-app.onrender.com/admin
```

Ingresar con el usuario y contraseña configurados en las variables de entorno.

## 5. (Opcional) Deploy del frontend en Vercel

Si querés el frontend en Vercel por separado:

1. Subir el repo a Vercel
2. En `data.js`, cambiar la línea:
   ```js
   window.BAG_API_URL = 'https://tu-app.onrender.com';
   ```
3. Hacer commit y push. Vercel lo detecta automáticamente.

## Notas

- La primera vez que el servidor arranca, crea todas las tablas y carga los datos de ejemplo automáticamente.
- El panel de admin está protegido por JWT — el token dura 7 días.
- Las imágenes se manejan por URL (no hay upload de archivos).
