// Seguridad: cabeceras, límites de uso y validación.

export const SEC_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' https://fonts.googleapis.com",
    "style-src-attr 'unsafe-inline'",
    "font-src https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; "),
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};

export function withHeaders(res, extra = {}) {
  const r = new Response(res.body, res);
  for (const [k, v] of Object.entries({ ...SEC_HEADERS, ...extra })) r.headers.set(k, v);
  return r;
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}

// Límite por visitante: 12 consultas por minuto. Usa el binding de Rate Limiting si existe (Workers);
// en Pages no hay binding, así que cuenta en memoria del servidor (aproximado, pero frena el abuso).
const HITS = new Map();
export async function allowed(env, req, scope, max = 12, windowMs = 60000) {
  const ip = req.headers.get("CF-Connecting-IP") || "local", key = `${scope}:${ip}`;
  if (env.RL) return (await env.RL.limit({ key })).success;
  const now = Date.now(), h = HITS.get(key);
  if (!h || h.reset < now) { HITS.set(key, { n: 1, reset: now + windowMs }); if (HITS.size > 5000) HITS.clear(); return true; }
  return ++h.n <= max;
}

// Las peticiones que modifican datos tienen que venir de la misma página (anti-CSRF)
export function sameOrigin(req) {
  const origin = req.headers.get("Origin");
  if (!origin) return req.headers.get("X-Requested-With") === "asesora";
  return origin === new URL(req.url).origin;
}

// Oculta teléfonos y mails antes de mandar texto a la IA
export function maskPersonal(t) {
  return String(t)
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[mail oculto]")
    .replace(/(\+?\d[\d\s-]{6,}\d)/g, "[teléfono oculto]")
    .replace(/\b\d{7,8}\b/g, "[número oculto]");
}

export function clean(str, max) {
  return String(str ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}

export async function readJson(req, maxBytes = 20000) {
  const len = Number(req.headers.get("Content-Length") || 0);
  if (len > maxBytes) throw new HttpError(413, "Demasiado grande");
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, "Demasiado grande");
  try { return JSON.parse(text || "{}"); } catch { throw new HttpError(400, "JSON inválido"); }
}

export class HttpError extends Error {
  constructor(status, msg) { super(msg); this.status = status; }
}
