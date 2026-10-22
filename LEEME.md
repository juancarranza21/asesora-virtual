# Asesora Virtual · Vendedora con IA para tiendas de ropa
### Proyecto de portafolio (propuesta comercial + demo funcionando)

> Nombre provisorio. Para cambiarlo, buscá "Asesora Virtual" en `public/index.html`.

Una vendedora virtual que se instala en una tienda online (pensada para Tiendanube) y hace lo que hace una buena vendedora en el local:

1. **Talle sin centímetro:** estima las medidas con altura, peso, forma del cuerpo y talle habitual, y las cruza con la tabla de **cada prenda**.
2. **Entiende el calce:** si al cliente le gusta holgado y la prenda ya es oversize, no le sube el talle. Explica siempre por qué.
3. **Preguntas según el rubro:** la IA arma el cuestionario (ocasión, estilo, calce, presupuesto) para cada tipo de tienda.
4. **Recomienda del catálogo:** muestra prendas reales con su talle calculado y botón al carrito.
5. **Chat:** responde envíos, cambios, pagos y dudas de prendas. Si no sabe, no inventa: deriva a WhatsApp.

Se diferencia de Tallín (tallin.com.ar), que pide medidas en centímetros y solo resuelve el talle.

---

## 0. Qué hay en esta carpeta

| Carpeta / archivo | Para qué sirve |
|---|---|
| `public/index.html` | **Landing de venta**: problema, solución, comparativa, generador de preguntas con IA, panel de ejemplo, planes y preguntas frecuentes |
| `public/tienda.html` | **Tienda de demostración** (*Alma Urbana*, ficticia) con la asesora instalada |
| `public/panel.html` + `js/panel.js` | **Panel del negocio (demo):** consultas, ventas asistidas, talles, calces, ocasiones, prendas que más convierten, insights y preguntas sin responder. Mezcla datos de ejemplo con la actividad real del visitante en la tienda demo (se actualiza en vivo). Lo que se responde ahí, la asesora lo aprende al instante |
| `public/js/asesora.js` | **El widget estándar.** Funciona con cualquier tienda: solo lee el JSON de la tienda |
| `public/js/prendas.js` | Ilustraciones SVG de cada prenda, con selector de color (sin fotos ni derechos de autor) |
| `public/data/tienda-general.json` | Datos de la tienda demo: preguntas, tablas de talles, productos, preguntas frecuentes y colores |
| `public/js/landing.js` | Animación del celular y generador de preguntas por rubro |
| `src/` | Servidor (Cloudflare Worker): seguridad e IA (`/api/preguntas` y `/api/chat`) |
| `wrangler.toml` | Configuración de Cloudflare |

### Cómo responde el chat (de lo más barato a lo más caro)
1. **Cerebro local (en el navegador, gratis):** entiende la intención aunque la pregunta esté escrita a su manera. Resuelve talle, precio, tela, colores, calce, para quién es, con qué combinar, comparar dos prendas y búsquedas del tipo "algo urbano y holgado hasta 30 mil" o "un regalo para mi novio". Recuerda de qué prenda se venía hablando ("¿y en negro?") y avisa qué cosas no vende la tienda (zapatillas, carteras…).
2. **Preguntas frecuentes:** envíos, cambios, pagos, descuentos, factura, gift card, lavado… Tolera errores de tipeo.
3. **IA de Cloudflare (requiere publicar):** recibe el catálogo completo (tela, colores, calce, ocasiones), las preguntas frecuentes y los últimos mensajes de la charla. Recomienda y razona solo con esa información; si no sabe, no inventa.
4. **WhatsApp:** si nada de lo anterior sirve, con atajos para seguir la charla.

Cada producto del JSON lleva `tela` y `colores`: cuanto más completo el catálogo, más preguntas responde sin IA.

---

## Demo publicada
- Landing: https://asesora-virtual.pages.dev
- Tienda: https://asesora-virtual.pages.dev/tienda
- Panel: https://asesora-virtual.pages.dev/panel

Para publicar cambios: `npm run deploy` (Cloudflare Pages, cuenta personal). Se usa Pages y no Workers porque en Workers el link incluye el subdominio de la cuenta (`candyfajas-asesora`), que no se puede cambiar sin romper el link de Candy Fajas.

## 1. Verla en la compu (sin instalar nada)

La página funciona sola en **modo demo**: el talle, las recomendaciones y el chat de preguntas frecuentes andan sin servidor. Solo quedan apagadas la IA del chat y la generación de preguntas en vivo, que usan plantillas locales.

```powershell
python -m http.server 8787 --directory public
```
- Landing: http://localhost:8787
- Tienda demo: http://localhost:8787/tienda.html

## 2. Probar con la IA (en la compu)

```powershell
npm install
npm run dev
```
`npm run dev` (wrangler pages dev) usa la IA real de Cloudflare: pide iniciar sesión y consume del cupo gratis.

## 3. Publicar en Cloudflare (plan gratuito)

```powershell
npx wrangler login
npx wrangler pages project create asesora-virtual --production-branch main   # solo la primera vez
npm run deploy
```
Queda en `https://asesora-virtual.pages.dev`. No necesita base de datos. `public/_worker.js` es la puerta de entrada: Pages lo empaqueta con `src/` y nunca lo sirve como archivo.

---

## 4. Sumar otra tienda de demo

1. Copiá `public/data/tienda-general.json` como `tienda-<id>.json` y cambiá los datos.
2. Agregá el `<id>` a `TIENDAS` en `src/worker.js` (para el chat con IA).
3. Abrila en `/tienda.html?t=<id>`.

Campos de cada producto: `n` nombre, `p` precio, `cat` (arriba, abajo, abrigo o vestido), `para` (mujer u hombre), `calce` (slim, regular u oversize), `medida` (pecho, cintura o cadera, según la que manda en esa prenda), `lbl` (talles numéricos opcionales, como 36 a 46), `tags` (valores de las preguntas con los que combina), `e` y `c` (emoji y colores de la foto de ejemplo), y `why` (por qué recomendarla).

---

## 5. Seguridad y privacidad
- Cabeceras estrictas (CSP, HSTS, anti-clickjacking), igual que en Candy Fajas.
- No pide nombre, teléfono, mail ni medidas. El perfil de talle se guarda solo en el navegador del cliente (`localStorage`).
- Si alguien escribe un teléfono o un mail en el chat, se oculta antes de mandarlo a la IA.
- La IA tiene reglas fijas: responde solo con la información de la tienda, no adivina talles y no pide datos personales.
- Límite anti-abuso: 12 consultas por minuto por visitante (contador en memoria del servidor; en Workers usaría el binding de Rate Limiting).

## 6. Próximos pasos (para el producto real)
- App de Tiendanube: leer el catálogo con su API e inyectar el botón en la tienda.
- Panel del negocio real: con base D1, como en Candy Fajas.
- Carga de tablas de talles desde una foto, con IA.
- Lógica de talles para calzado (largo del pie) y corsetería (contorno y copa).
