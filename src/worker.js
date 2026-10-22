// Asesora Virtual — Cloudflare Worker
// Sirve la landing, las tiendas de demo y una API chica para la IA (preguntas por rubro y chat).
import { withHeaders, json, readJson, HttpError, sameOrigin, allowed, maskPersonal, clean } from "./security.js";
import { generateQuestions, chat } from "./ai.js";

const TIENDAS = ["general"]; // cada tienda de demo es un public/data/tienda-<id>.json

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      if (url.pathname.startsWith("/api/")) {
        if (req.method !== "GET" && !sameOrigin(req)) throw new HttpError(403, "Origen no permitido");
        return withHeaders(await api(req, env, url));
      }
      return withHeaders(await env.ASSETS.fetch(req));
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) console.error(e);
      return withHeaders(json({ error: status === 500 ? "Error interno" : e.message }, status));
    }
  },
};

async function catalog(env, req, id) {
  const res = await env.ASSETS.fetch(new Request(new URL(`/data/tienda-${id}.json`, req.url)));
  return res.json();
}

async function api(req, env, url) {
  const p = url.pathname, m = req.method;

  if (p === "/api/estado" && m === "GET") return json({ ia: !!env.AI });

  // Preguntas del asesor generadas por IA a partir del rubro de la tienda
  if (p === "/api/preguntas" && m === "POST") {
    if (!env.AI) throw new HttpError(503, "IA no disponible");
    if (!(await allowed(env, req, "preg"))) throw new HttpError(429, "Probaste muchas veces seguidas. Esperá un minuto 🙏");
    const b = await readJson(req, 1000);
    const rubro = maskPersonal(clean(b.rubro, 160));
    if (rubro.length < 3) throw new HttpError(400, "Contanos el rubro de la tienda");
    const r = await generateQuestions(env, rubro).catch((e) => { console.error("IA preguntas", e.message); return null; });
    if (!r) throw new HttpError(502, "La IA no pudo armar las preguntas");
    return json(r);
  }

  // Chat de la vendedora: responde solo con la info de la tienda
  if (p === "/api/chat" && m === "POST") {
    if (!(await allowed(env, req, "chat"))) throw new HttpError(429, "Muchas preguntas seguidas. Esperá un minuto 🙏");
    const b = await readJson(req, 6000);
    const q = maskPersonal(clean(b.q, 300));
    if (q.length < 2) throw new HttpError(400, "Pregunta vacía");
    const id = TIENDAS.includes(b.tienda) ? b.tienda : null;
    if (!id) throw new HttpError(400, "Tienda inválida");
    const ctx = b.ctx && typeof b.ctx === "object" ? { talle: clean(b.ctx.talle, 5), producto: clean(b.ctx.producto, 80) } : null;
    const hist = (Array.isArray(b.hist) ? b.hist : []).slice(-6)
      .map((h) => ({ r: h && h.r === "a" ? "a" : "u", t: maskPersonal(clean(h && h.t, 300)) })).filter((h) => h.t);
    if (env.AI) {
      try {
        const a = await chat(env, q, await catalog(env, req, id), ctx, hist, clean(b.prod, 80));
        if (a) return json({ a, capa: "ia" });
      } catch (e) { console.error("IA chat", e.message); }
    }
    return json({ a: null, capa: "whatsapp" });
  }

  throw new HttpError(404, "No encontrado");
}
