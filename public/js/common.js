// Utilidades compartidas (landing, tiendas de demo y asesora)
"use strict";
const $id = (id) => document.getElementById(id);
const esc = (t) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
// Texto con **negrita** → HTML seguro (todo se escapa primero)
const md = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
const norm = (t) => String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ ]/g, " ").replace(/\s+/g, " ").trim();
const money = (n) => "$" + Number(n).toLocaleString("es-AR");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || "GET",
    credentials: "same-origin",
    headers: { "X-Requested-With": "asesora", ...(opts.body ? { "Content-Type": "application/json" } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || "Error de conexión"); e.status = res.status; throw e; }
  return data;
}

function toast(t) {
  const el = $id("toast"); if (!el) return;
  el.textContent = t; el.classList.add("show");
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("show"), 2400);
}

function sparkle(x, y, n, set = ["✨", "⭐", "💫"]) {
  if (reduced()) return;
  for (let i = 0; i < n; i++) {
    const d = document.createElement("span"); d.className = "spark"; d.textContent = set[i % set.length];
    d.style.left = x + "px"; d.style.top = y + "px";
    const a = Math.random() * 6.28, r = 40 + Math.random() * 60;
    d.style.setProperty("--x", Math.cos(a) * r + "px"); d.style.setProperty("--y", Math.sin(a) * r + "px");
    document.body.appendChild(d); setTimeout(() => d.remove(), 1200);
  }
}

function shake(el) {
  if (!el) return;
  el.animate([{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }], { duration: 300 });
}

// Delegación de eventos: <button data-act="nombre" data-arg="x">  (sin JavaScript en línea, compatible con CSP)
function bindActions(root, actions) {
  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el || !root.contains(el)) return;
    const fn = actions[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el.dataset.arg, el, e); }
  });
}

// Efecto de escritura (el HTML que recibe ya está escapado)
function typeHTML(el, html, done) {
  if (!el) return;
  if (reduced()) { el.innerHTML = html; done && done(); return; }
  const parts = html.split(/(<[^>]+>)/); let out = "", i = 0, j = 0;
  (function tick() {
    if (!el.isConnected) return;
    if (i >= parts.length) { el.innerHTML = out; done && done(); return; }
    if (parts[i].startsWith("<")) { out += parts[i]; i++; j = 0; return tick(); }
    if (j < parts[i].length) { out += parts[i].slice(j, j + 2); j += 2; } else { i++; j = 0; }
    el.innerHTML = out + '<span class="caret"></span>'; setTimeout(tick, 12);
  })();
}

// Guardado local (puede fallar en modo privado: nunca es imprescindible)
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

// Actividad de la demo: lo que el visitante hace en la tienda aparece en vivo en el panel (/panel.html).
// Queda solo en este navegador; en el producto real esto viaja anónimo al servidor.
function logEvt(tipo, data = {}) {
  const L = store.get("av_eventos") || [];
  L.push({ t: Date.now(), tipo, ...data });
  store.set("av_eventos", L.slice(-200));
}
