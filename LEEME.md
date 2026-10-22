# Asesora Virtual · Guía de uso

Guía práctica para ver, configurar y publicar el proyecto. La documentación técnica completa está en [README.md](README.md).

> Nombre comercial provisorio. Para cambiarlo, buscá "Asesora Virtual" en `public/index.html`.

## Demo publicada

| Página | Dirección |
|---|---|
| Presentación comercial | https://asesora-virtual.pages.dev |
| Tienda de demostración | https://asesora-virtual.pages.dev/tienda |
| Panel del negocio | https://asesora-virtual.pages.dev/panel |

---

## 1. Qué hace

Una vendedora virtual que se instala en una tienda de ropa online y atiende como una vendedora del local:

1. **Talle sin centímetro:** con altura, peso, forma del cuerpo y el talle que la persona usa siempre, calcula el talle de **cada prenda** según su propia tabla.
2. **Entiende el calce:** si al cliente le gusta holgado y la prenda ya es oversize, no le sube el talle. Siempre explica por qué recomienda lo que recomienda.
3. **Preguntas según el rubro:** la IA arma el cuestionario de la vendedora (ocasión, estilo, calce, presupuesto) para cada tipo de tienda.
4. **Recomienda del catálogo:** muestra prendas reales con su talle calculado y botón para agregar al carrito.
5. **Chat:** responde talles, telas, colores, combinaciones, envíos, cambios y pagos. Si no sabe, no inventa: deriva a WhatsApp.
6. **Panel del negocio:** qué buscan los clientes, talles más pedidos, prendas que más convierten y preguntas sin responder, que se cargan desde el panel y la asesora aprende al instante.

---

## 2. Verla en la compu

### Sin instalar nada (modo demo)
Funcionan el talle, las recomendaciones, el chat y el panel. La IA del servidor queda apagada y se usan plantillas locales.

```powershell
python -m http.server 8787 --directory public
```
Abrir http://localhost:8787

### Con la IA real
```powershell
npm install
npm run dev
```
Usa la IA de Cloudflare: pide iniciar sesión y consume del cupo gratuito.

---

## 3. Publicar cambios

La primera vez:
```powershell
npx wrangler login
npx wrangler pages project create asesora-virtual --production-branch main
```

Cada vez que haya cambios:
```powershell
npm run deploy
```

Para guardar los cambios en GitHub:
```powershell
git add -A
git commit -m "Descripción del cambio"
git push
```

`npm run deploy` actualiza la página publicada y `git push` actualiza el código en GitHub: son dos pasos separados.

---

## 4. Configurar una tienda

Todo lo que la asesora sabe de una tienda está en un solo archivo: `public/data/tienda-<id>.json`.

| Qué cambiar | Dónde |
|---|---|
| Nombre, colores, nombre de la asesora, cuotas, envío gratis | `tienda` |
| Preguntas del cuestionario | `preguntas` |
| Tablas de talles (mujer y hombre) | `tablas` |
| Productos, precios, telas y colores | `productos` |
| Respuestas del chat | `faq` |

Para sumar otra tienda:
1. Copiá `tienda-general.json` como `tienda-<id>.json` y cambiá los datos.
2. Agregá el `<id>` a `TIENDAS` en `src/worker.js` (para el chat con IA).
3. Abrila en `/tienda?t=<id>`.

El detalle de cada campo está en el [README](README.md#modelo-de-datos-de-una-tienda).

---

## 5. Privacidad
- No se piden nombre, teléfono, mail ni medidas exactas.
- El perfil de talle y la actividad de la demo quedan solo en el navegador del visitante.
- Si alguien escribe un teléfono o un mail en el chat, se oculta antes de enviarlo a la IA.

## 6. Límites del plan gratuito de Cloudflare
| Servicio | Límite |
|---|---|
| Pages (visitas) | 100.000 pedidos por día (cuenta páginas y API, porque el servidor agrega las cabeceras de seguridad a todo) |
| Workers AI | 10.000 "neuronas" por día |

La IA solo se usa cuando el chat no encuentra la respuesta por su cuenta y al generar preguntas por rubro, así que el cupo alcanza de sobra para una demo.
