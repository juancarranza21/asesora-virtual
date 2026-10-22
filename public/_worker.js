// Punto de entrada de Cloudflare Pages ("modo avanzado"): wrangler lo empaqueta junto con src/.
// Pages nunca lo sirve como archivo público.
export { default } from "../src/worker.js";
