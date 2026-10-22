// Panel del negocio (demo): datos de ejemplo generados + la actividad real del visitante en la tienda demo.
// Si la tienda está abierta en otra pestaña, el panel se actualiza solo.
"use strict";
(async function () {
  const CAT = await (await fetch("/data/tienda-general.json")).json();
  const SZ = ["XS", "S", "M", "L", "XL", "XXL"];
  const DIA = 864e5, HOY = new Date(); HOY.setHours(0, 0, 0, 0);
  let periodo = 30;
  $id("shopName").textContent = CAT.tienda.nombre;

  /* ---------- Datos de ejemplo (siempre los mismos: generador con semilla) ---------- */
  function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const r = rng(2026);
  const DIAS = Array.from({ length: 180 }, (_, i) => {
    const fecha = new Date(HOY - (179 - i) * DIA), dow = fecha.getDay();
    const base = 34 + i * 0.12, finde = dow === 0 || dow === 6 ? 1.28 : dow === 1 ? 0.86 : 1;
    const consultas = Math.round(base * finde * (0.82 + r() * 0.36));
    const carritos = Math.round(consultas * (0.16 + r() * 0.06));
    return { fecha, consultas, carritos, ventas: Math.round(carritos * 0.58) * (48000 + Math.round(r() * 14000)), resueltas: 0.9 + r() * 0.06 };
  });
  const PESOS = {
    talles: { XS: 5, S: 17, M: 33, L: 27, XL: 12, XXL: 6 },
    calce: { holgado: 41, normal: 39, ajustado: 20 },
    ocasion: { diario: 38, salida: 24, trabajo: 21, finde: 17 },
    prendas: { "jean-mom": 15, "remera-oversize": 14, "hoodie-frisa": 12, "wide-leg": 10, "remera-basica": 9, "cargo-parachute": 8, "camisa-lino": 7, "puffer-corta": 7, "blazer": 5, "vestido-midi": 4, "top-corset": 3, "sweater-trenzas": 3, "jean-slim": 1.5, "chino": 1.5 },
    conv: { "jean-mom": 0.31, "remera-oversize": 0.36, "hoodie-frisa": 0.29, "wide-leg": 0.22, "remera-basica": 0.41, "cargo-parachute": 0.27, "camisa-lino": 0.24, "puffer-corta": 0.18, "blazer": 0.2, "vestido-midi": 0.26, "top-corset": 0.33, "sweater-trenzas": 0.21, "jean-slim": 0.25, "chino": 0.23 },
  };
  const LBL = { holgado: "Holgado", normal: "Normal", ajustado: "Al cuerpo", diario: "Día a día", salida: "Salida", trabajo: "Trabajo", finde: "Fin de semana" };
  const SIN_RESP = [
    { q: "¿El jean mom estira con el uso?", n: 14 }, { q: "¿Tienen talle XXXL?", n: 11 }, { q: "¿Hacen arreglos de ruedo?", n: 7 },
    { q: "¿Puedo pagar en efectivo al retirar?", n: 5 }, { q: "¿Cuándo entra la colección de verano?", n: 4 },
  ];

  /* ---------- Actividad real del visitante ---------- */
  const eventos = () => store.get("av_eventos") || [];
  const respondidas = () => store.get("av_faq_extra") || [];
  const letra = (pid, t) => { if (SZ.includes(t)) return t; const p = CAT.productos.find((x) => x.id === pid); const i = p && p.lbl ? p.lbl.indexOf(t) : -1; return i >= 0 ? SZ[i] : null; };

  function datos() {
    const desde = +HOY - (periodo - 1) * DIA, ev = eventos().filter((e) => e.t >= desde);
    const dias = DIAS.slice(-periodo).map((d) => ({ ...d })), prev = DIAS.slice(-periodo * 2, -periodo);
    const hoy = dias[dias.length - 1];
    const mias = { consultas: 0, carritos: 0, ventas: 0 };
    for (const e of ev) {
      if (["quiz", "talle", "chat"].includes(e.tipo)) mias.consultas++;
      if (e.tipo === "carrito") { mias.carritos++; mias.ventas += e.precio || 0; }
    }
    hoy.consultas += mias.consultas; hoy.carritos += mias.carritos; hoy.ventas += mias.ventas; hoy.mias = mias.consultas;
    const sum = (L, k) => L.reduce((a, d) => a + d[k], 0);
    const total = sum(dias, "consultas"), recs = Math.round(total * 0.8);
    const reparto = (pesos, extra) => {
      const tot = Object.values(pesos).reduce((a, b) => a + b, 0), out = {};
      for (const [k, w] of Object.entries(pesos)) out[k] = Math.round((recs * w) / tot) + (extra[k] || 0);
      return out;
    };
    const cuenta = (fn) => ev.reduce((o, e) => { const k = fn(e); if (k) o[k] = (o[k] || 0) + 1; return o; }, {});
    const chats = ev.filter((e) => e.tipo === "chat"), propias = chats.filter((e) => !e.ok);
    const prendaRec = reparto(PESOS.prendas, cuenta((e) => (e.tipo === "quiz" || e.tipo === "talle") && e.producto));
    const prendaCar = cuenta((e) => e.tipo === "carrito" && e.producto);
    return {
      dias, mias,
      kpi: {
        consultas: [total, sum(prev, "consultas")],
        carritos: [sum(dias, "carritos"), sum(prev, "carritos")],
        ventas: [sum(dias, "ventas"), sum(prev, "ventas")],
        resueltas: [dias.reduce((a, d) => a + d.resueltas, 0) / dias.length, prev.reduce((a, d) => a + d.resueltas, 0) / prev.length],
      },
      talles: reparto(PESOS.talles, cuenta((e) => (e.tipo === "talle" || e.tipo === "quiz") && letra(e.producto, e.talle))),
      calce: reparto(PESOS.calce, cuenta((e) => (e.tipo === "quiz" ? e.ans && e.ans.calce : e.tipo === "talle" && e.calce))),
      ocasion: reparto(PESOS.ocasion, cuenta((e) => e.tipo === "quiz" && e.ans && e.ans.ocasion)),
      prendas: Object.entries(prendaRec).map(([id, n]) => ({ p: CAT.productos.find((x) => x.id === id), n, car: Math.round(n * PESOS.conv[id]) + (prendaCar[id] || 0) })).filter((x) => x.p).sort((a, b) => b.n - a.n),
      sinResp: [
        ...propias.map((e) => ({ q: e.q, n: 1, tuya: true })),
        ...SIN_RESP.map((x) => ({ ...x, n: Math.max(1, Math.round((x.n * periodo) / 30)) })),
      ].filter((x, i, L) => L.findIndex((y) => norm(y.q) === norm(x.q)) === i && !respondidas().some((f) => norm(f.q) === norm(x.q))),
      ev,
    };
  }

  /* ---------- Formato ---------- */
  const nf = (n) => Math.round(n).toLocaleString("es-AR");
  const compacto = (n) => (n >= 1e6 ? "$" + (n / 1e6).toLocaleString("es-AR", { maximumFractionDigits: 1 }) + " M" : money(n));
  const pct = (n) => Math.round(n * 100) + "%";
  const delta = ([a, b], esPct) => {
    if (!b) return "";
    const d = esPct ? (a - b) * 100 : ((a - b) / b) * 100, up = d >= 0;
    return `<i class="${up ? "up" : "down"}">${up ? "▲" : "▼"} ${Math.abs(d).toFixed(esPct ? 1 : 0)}${esPct ? " pts" : "%"}</i> vs. ${periodo} días anteriores`;
  };
  const fechaCorta = (d) => d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
  const fechaLarga = (d) => d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });

  /* ---------- Tooltip ---------- */
  const tip = $id("tip");
  function showTip(x, y, valor, etiqueta) {
    tip.replaceChildren();
    const s = document.createElement("strong"); s.textContent = valor;
    const k = document.createElement("span"); k.className = "k";
    const l = document.createElement("span"); l.textContent = etiqueta;
    tip.append(s, k, l);
    tip.classList.add("show");
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.min(innerWidth - w - 8, Math.max(8, x - w / 2)) + "px";
    tip.style.top = Math.max(8, y - h - 14) + "px";
  }
  const hideTip = () => tip.classList.remove("show");

  /* ---------- Gráficos (una sola serie cada uno: no hace falta leyenda) ---------- */
  const NS = "http://www.w3.org/2000/svg";
  function serie(el, dias) {
    const W = el.clientWidth || 600, H = 220, P = { l: 34, r: 12, t: 12, b: 26 };
    const max = Math.max(...dias.map((d) => d.consultas)), top = Math.ceil(max / 20) * 20;
    const x = (i) => P.l + (i * (W - P.l - P.r)) / (dias.length - 1), y = (v) => H - P.b - (v / top) * (H - P.t - P.b);
    const line = dias.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d.consultas).toFixed(1)}`).join(" ");
    const ticks = [0, top / 2, top];
    const xl = [0, Math.floor((dias.length - 1) / 2), dias.length - 1];
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}" tabindex="0" aria-label="Consultas por día: mínimo ${Math.min(...dias.map((d) => d.consultas))}, máximo ${max}">
      ${ticks.map((t) => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(t)}" y2="${y(t)}" stroke="var(--grid)"/><text class="ax" x="${P.l - 8}" y="${y(t) + 4}" text-anchor="end">${nf(t)}</text>`).join("")}
      ${xl.map((i) => `<text class="ax" x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 ? "start" : i === dias.length - 1 ? "end" : "middle"}">${fechaCorta(dias[i].fecha)}</text>`).join("")}
      <path d="${line} L${x(dias.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z" fill="var(--neon)" opacity=".1"/>
      <path d="${line}" fill="none" stroke="var(--neon)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${x(dias.length - 1)}" cy="${y(dias[dias.length - 1].consultas)}" r="4.5" fill="var(--neon)" stroke="var(--surface)" stroke-width="2"/>
      <line id="cx" y1="${P.t}" y2="${H - P.b}" stroke="rgba(255,255,255,.35)" visibility="hidden"/>
      <circle id="cd" r="4.5" fill="var(--neon)" stroke="var(--surface)" stroke-width="2" visibility="hidden"/>
      <rect x="${P.l}" y="0" width="${W - P.l - P.r}" height="${H}" fill="transparent" id="hit"/></svg>`;
    const svg = el.querySelector("svg"), cx = svg.querySelector("#cx"), cd = svg.querySelector("#cd");
    let idx = dias.length - 1;
    const mostrar = (i) => {
      idx = Math.max(0, Math.min(dias.length - 1, i));
      const d = dias[idx], px = x(idx), py = y(d.consultas), b = svg.getBoundingClientRect(), k = b.width / W;
      for (const n of [cx, cd]) n.setAttribute("visibility", "visible");
      cx.setAttribute("x1", px); cx.setAttribute("x2", px); cd.setAttribute("cx", px); cd.setAttribute("cy", py);
      showTip(b.left + px * k, b.top + py * k, `${nf(d.consultas)} consultas`, fechaLarga(d.fecha) + (d.mias ? ` · ${d.mias} tuyas` : ""));
    };
    const ocultar = () => { for (const n of [cx, cd]) n.setAttribute("visibility", "hidden"); hideTip(); };
    svg.addEventListener("pointermove", (e) => { const b = svg.getBoundingClientRect(); mostrar(Math.round((((e.clientX - b.left) / b.width) * W - P.l) / ((W - P.l - P.r) / (dias.length - 1)))); });
    svg.addEventListener("pointerleave", ocultar);
    svg.addEventListener("focus", () => mostrar(idx));
    svg.addEventListener("blur", ocultar);
    svg.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") mostrar(idx - 1); if (e.key === "ArrowRight") mostrar(idx + 1); });
  }

  function columnas(el, obj) {
    const tot = Object.values(obj).reduce((a, b) => a + b, 0) || 1, L = SZ.map((k) => [k, (obj[k] || 0) / tot]);
    const W = el.clientWidth || 300, H = 200, P = { t: 22, b: 24 }, max = Math.max(...L.map((x) => x[1])), slot = W / L.length, bw = Math.min(24, slot * 0.5);
    const y = (v) => H - P.b - (v / max) * (H - P.t - P.b);
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}">
      <line x1="0" x2="${W}" y1="${H - P.b}" y2="${H - P.b}" stroke="var(--grid)"/>
      ${L.map(([k, v], i) => { const cx = slot * i + slot / 2, top = y(v), h = H - P.b - top;
        return `<g class="col" tabindex="0" data-k="${k}" data-v="${pct(v)}"><rect x="${cx - slot / 2}" y="0" width="${slot}" height="${H}" fill="transparent"/>
          <path d="M${cx - bw / 2} ${H - P.b} V${top + 4} Q${cx - bw / 2} ${top} ${cx - bw / 2 + 4} ${top} H${cx + bw / 2 - 4} Q${cx + bw / 2} ${top} ${cx + bw / 2} ${top + 4} V${H - P.b} Z" fill="var(--neon)" opacity="${h > 0 ? 1 : 0}"/>
          <text class="ax" x="${cx}" y="${top - 6}" text-anchor="middle" style="fill:var(--ink2)">${pct(v)}</text>
          <text class="ax" x="${cx}" y="${H - 7}" text-anchor="middle">${k}</text></g>`; }).join("")}</svg>`;
    el.querySelectorAll(".col").forEach((g) => {
      const on = (e) => { const b = g.querySelector("path").getBoundingClientRect(); g.querySelector("path").setAttribute("opacity", ".8"); showTip(b.left + b.width / 2, b.top, g.dataset.v, `Talle ${g.dataset.k}`); };
      const off = () => { g.querySelector("path").setAttribute("opacity", "1"); hideTip(); };
      g.addEventListener("pointerenter", on); g.addEventListener("focus", on); g.addEventListener("pointerleave", off); g.addEventListener("blur", off);
    });
  }

  function barras(el, obj) {
    const tot = Object.values(obj).reduce((a, b) => a + b, 0) || 1, L = Object.entries(obj).sort((a, b) => b[1] - a[1]), max = L[0][1] / tot;
    el.innerHTML = `<div class="hb">${L.map(([k, n]) => `<div class="hb-r" tabindex="0"><b>${LBL[k] || esc(k)}</b><i style="width:${((n / tot / max) * 100).toFixed(1)}%"></i><span>${pct(n / tot)}</span></div>`).join("")}</div>`;
  }

  /* ---------- Render ---------- */
  function render() {
    const D = datos(), K = D.kpi;
    $id("kpis").innerHTML = `
      <div class="kpi hero"><span>Consultas a la asesora</span><b>${nf(K.consultas[0])}</b><small>${delta(K.consultas)}</small></div>
      <div class="kpi"><span>Ventas con ayuda de la asesora</span><b>${compacto(K.ventas[0])}</b><small>${delta(K.ventas)}</small></div>
      <div class="kpi"><span>Consultas que terminan en el carrito</span><b>${pct(K.carritos[0] / K.consultas[0])}</b><small>${delta([K.carritos[0] / K.consultas[0], K.carritos[1] / K.consultas[1]], true)}</small></div>
      <div class="kpi"><span>Respondidas al instante</span><b>${pct(K.resueltas[0])}</b><small>${delta(K.resueltas, true)}</small></div>`;
    $id("serieSub").textContent = D.mias.consultas ? `incluye ${D.mias.consultas} consulta${D.mias.consultas > 1 ? "s" : ""} tuya${D.mias.consultas > 1 ? "s" : ""} de hoy` : "";
    serie($id("serie"), D.dias);
    columnas($id("talles"), D.talles);
    barras($id("calce"), D.calce);
    barras($id("ocasion"), D.ocasion);

    const maxConv = Math.max(...D.prendas.map((x) => x.car / x.n));
    $id("prendas").innerHTML = `<thead><tr><th>Prenda</th><th class="num">Recomendaciones</th><th class="num">Al carrito</th><th class="num">Conversión</th></tr></thead><tbody>${D.prendas.slice(0, 8).map((x) =>
      `<tr><td><div class="pr"><span class="th">${Prenda.svg(x.p)}</span>${esc(x.p.n)}</div></td><td class="num">${nf(x.n)}</td><td class="num">${nf(x.car)}</td><td class="num"><div class="conv"><i style="--w:${((x.car / x.n / maxConv) * 100).toFixed(0)}%"></i>${pct(x.car / x.n)}</div></td></tr>`).join("")}</tbody>`;

    // Insights: reglas simples sobre los mismos datos (en el producto real los redacta la IA)
    const totC = Object.values(D.calce).reduce((a, b) => a + b, 0), holg = D.calce.holgado / totC;
    const over = CAT.productos.filter((p) => p.calce === "oversize").length;
    const totT = Object.values(D.talles).reduce((a, b) => a + b, 0), topT = Object.entries(D.talles).sort((a, b) => b[1] - a[1])[0];
    const mejor = [...D.prendas].sort((a, b) => b.car / b.n - a.car / a.n)[0], q1 = [...D.sinResp].sort((a, b) => b.n - a.n)[0];
    $id("insights").innerHTML = `<div class="ai-h"><span>✦</span> Lo que detectó la IA este período</div><div class="ins">
      <div class="in"><em>Oportunidad de catálogo</em>El <b>${pct(holg)}</b> de tus clientes pide calce <b>holgado</b>, pero solo <b>${over} de tus ${CAT.productos.length} prendas</b> lo son. Sumar más oversize puede subir la conversión.</div>
      <div class="in"><em>Stock</em>El talle <b>${topT[0]}</b> concentra el <b>${pct(topT[1] / totT)}</b> de las recomendaciones. Priorizá su reposición antes que XS y XXL.</div>
      <div class="in"><em>${q1 ? "Pregunta frecuente" : "Producto estrella"}</em>${q1 ? `“${esc(q1.q)}” se preguntó <b>${q1.n} ${q1.n > 1 ? "veces" : "vez"}</b> y la asesora no supo responder. Cargala abajo y la va a contestar sola.` : `<b>${esc(mejor.p.n)}</b> es la prenda que mejor convierte: ${pct(mejor.car / mejor.n)} de las recomendaciones terminan en el carrito.`}</div></div>`;

    $id("sinResp").innerHTML = D.sinResp.length ? D.sinResp.slice(0, 6).map((x, i) => `<div class="q" data-i="${i}"><div class="q-h"><span>${esc(x.q)}${x.tuya ? '<span class="tag">tuya</span>' : ""}</span><small>${x.n} ${x.n > 1 ? "veces" : "vez"} · <button class="link" data-act="abrir" data-arg="${i}">Responder</button></small></div>
      <form data-q="${esc(x.q)}"><textarea maxlength="400" placeholder="Escribí la respuesta como se la dirías a un cliente…" aria-label="Respuesta"></textarea><button class="btn" type="submit">Guardar</button></form></div>`).join("")
      : `<p class="empty">¡No quedan preguntas sin responder! 🎉</p>`;

    const ICO = { quiz: "🛍️", talle: "📏", chat: "💬", carrito: "🛒" };
    const nombre = (id) => (CAT.productos.find((p) => p.id === id) || { n: id }).n;
    const txt = (e) => ({
      quiz: () => `Hizo el test y le recomendó <b>${esc(nombre(e.producto))}</b>${e.talle ? ` talle ${esc(e.talle)}` : ""}`,
      talle: () => `Consultó su talle en <b>${esc(nombre(e.producto))}</b>: ${esc(e.talle)}`,
      chat: () => `Preguntó “${esc(e.q)}”${e.ok ? "" : " · <b>sin respuesta</b>"}`,
      carrito: () => `Agregó <b>${esc(nombre(e.producto))}</b>${e.talle ? ` talle ${esc(e.talle)}` : ""} al carrito`,
    }[e.tipo] || (() => esc(e.tipo)))();
    const hace = (t) => { const m = Math.round((Date.now() - t) / 6e4); return m < 1 ? "recién" : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`; };
    const ev = eventos().slice(-10).reverse();
    $id("feed").innerHTML = ev.length ? ev.map((e) => `<div class="ev"><i>${ICO[e.tipo] || "•"}</i><span>${txt(e)}<small>${hace(e.t)}</small></span></div>`).join("")
      : `<p class="empty">Todavía no usaste la tienda demo. <a href="/tienda.html" target="_blank" rel="noopener">Abrila en otra pestaña</a>, hacé el test o preguntale algo a ${esc(CAT.tienda.asesora)}, y mirá cómo aparece acá en vivo.</p>`;
  }

  bindActions(document.body, {
    periodo: (v, el) => { periodo = +v; document.querySelectorAll(".filters button").forEach((b) => b.classList.toggle("on", b === el)); render(); },
    abrir: (i) => { const q = document.querySelector(`.q[data-i="${i}"]`); q.classList.toggle("open"); q.querySelector("textarea").focus(); },
    borrar: () => { store.del("av_eventos"); store.del("av_faq_extra"); toast("Borré tu actividad de la demo"); render(); },
  });
  document.body.addEventListener("submit", (e) => {
    const f = e.target.closest(".q form"); if (!f) return;
    e.preventDefault();
    const a = f.querySelector("textarea").value.trim();
    if (a.length < 3) return shake(f.querySelector("textarea"));
    store.set("av_faq_extra", [...respondidas(), { q: f.dataset.q, a, k: f.dataset.q }]);
    toast(`Listo: ${CAT.tienda.asesora} ya sabe responderla. Probala en la tienda ✨`);
    render();
  });
  addEventListener("storage", (e) => { if (["av_eventos", "av_faq_extra"].includes(e.key)) render(); }); // en vivo desde la otra pestaña
  let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(render, 150); });
  render();
})();
