# R FRAGANCIAS — Catálogo público

Este repositorio es **solo el catálogo que ven tus clientes**: HTML, CSS y
JavaScript puro (sin Node, sin servidor propio). Obtiene los perfumes del
backend del otro repositorio, `rfragancias-admin`, por internet.

## Conexión con el backend

En `js/catalogo.js`:

```js
const API_BASE_URL = "https://rfragancias.onrender.com";
```

Si algún día cambia la dirección de tu backend, cámbiala ahí (y el link
"Acceso administrador" al final de `index.html`). El número de WhatsApp
está en `index.html` (enlaces `https://wa.me/...`) y en `js/catalogo.js`
(constante `WHATSAPP_NUMERO`).

## Publicarlo (gratis) en Render como "Static Site"

1. Render → **New +** → **Static Site** → elige el repositorio
   `rfragancias-catalogo`.
2. **Branch**: `main` · **Build Command**: vacío (si no te deja, `echo ok`)
   · **Publish Directory**: `.` (un punto).
3. **Create Static Site**. Render te da una dirección como
   `https://rfragancias-catalogo.onrender.com` — ese es el link que
   compartes con tus clientes.

Un sitio estático **no se duerme**. Puede usarse con el repositorio en
privado.

> Alternativa: GitHub Pages también sirve, pero exige repositorio público
> y sus términos de uso indican que no es para sitios que facilitan
> transacciones comerciales; por eso recomendamos Render.

## Probarlo en tu computador

Abrir `index.html` con doble clic no funciona bien (restricciones del
navegador con `fetch`). Con Python instalado:

```
python -m http.server 8080
```

y entra a `http://localhost:8080/`. Pedirá los perfumes al backend ya
publicado, así que ese debe estar en línea.
