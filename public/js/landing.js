// Landing: conversación animada del celular, generador de preguntas con IA y animaciones al hacer scroll.
"use strict";

/* ---------------- Celular: conversación de ejemplo en loop ---------------- */
const GUION = [
  ["bot", "¡Hola! Soy Sofi 👋 ¿Para qué ocasión buscás?"],
  ["chips", ["☀️ Día a día", "💼 Trabajo", "🌙 Una salida"], 2],
  ["bot", "¡Genial! ¿Cómo te gusta que te quede la ropa?"],
  ["chips", ["📐 Al cuerpo", "👌 Normal", "🌬️ Holgado"], 2],
  ["bot", "¿Qué talle usás siempre en remeras? Con eso y tu altura no hace falta el centímetro 😉"],
  ["me", "M, mido 1,65"],
  ["prod"],
  ["bot", "Te sugiero un talle más porque lo querés holgado y este jean es de calce regular ✨"],
];
async function phone() {
  const box = $id("phoneChat"); if (!box) return;
  const add = (html, cls) => { const d = document.createElement("div"); d.className = cls; d.innerHTML = html; box.appendChild(d); while (box.children.length > 7) box.firstChild.remove(); return d; };
  for (;;) {
    box.innerHTML = "";
    for (const [k, a, sel] of GUION) {
      if (k === "bot") { const t = add('<span class="dots">…</span>', "pm bot"); await wait(700); t.textContent = a; }
      if (k === "me") add(esc(a), "pm me");
      if (k === "chips") { const c = add(a.map((x) => `<span>${x}</span>`).join(""), "pchips"); await wait(900); c.children[sel].classList.add("on"); }
      if (k === "prod") add('<span class="t">👖</span><span><b>Jean mom tiro alto</b><span>$52.900 · Tu talle: <i>42</i></span></span>', "pm prod");
      await wait(1100);
    }
    await wait(3500);
  }
}

/* ---------------- Generador de preguntas por rubro ----------------
   Con el servidor publicado usa la IA de Cloudflare (/api/preguntas).
   Sin servidor (o si la IA falla) usa plantillas locales por rubro. */
const EJEMPLOS = ["Ropa deportiva para mujer", "Lencería y corsetería", "Ropa de bebé", "Calzado urbano", "Moda en talles grandes"];
const P = (t, ...o) => ({ t, o: o.map(([e, l]) => ({ e, l })) });
const PRESUPUESTO = P("¿Cuánto querés invertir?", ["💸", "Algo accesible"], ["💳", "Precio medio"], ["✨", "Lo mejor, sin mirar precio"]);
const CALCE = P("¿Cómo te gusta que te quede?", ["📐", "Al cuerpo"], ["👌", "Normal"], ["🌬️", "Holgado"]);
const PLANTILLAS = [
  [/deport|gym|running|fitness|entren|yoga/, "En ropa deportiva deciden la **actividad** y la **intensidad**: de eso dependen la compresión y la tela.", [
    P("¿Qué actividad hacés?", ["🏃", "Running"], ["🏋️", "Gimnasio / funcional"], ["🧘", "Yoga o pilates"], ["⛰️", "Outdoor"]),
    P("¿Con qué intensidad entrenás?", ["🌿", "Suave"], ["💪", "Media"], ["🔥", "Alta / competencia"]),
    P("¿En qué clima la vas a usar?", ["☀️", "Calor"], ["❄️", "Frío"], ["🌤️", "Todo el año"]),
    P("¿Cómo te gusta que te quede?", ["🎯", "Compresión"], ["👌", "Normal"], ["🌬️", "Holgado"]), PRESUPUESTO]],
  [/lencer|corset|ropa interior|bombach|corpi|brasier|bra\b/, "En lencería pesa más la **sensación** que el estilo: el **sostén** y que **no se note** bajo la ropa.", [
    P("¿Para qué momento la buscás?", ["☀️", "Uso diario"], ["💫", "Una ocasión especial"], ["🏃", "Hacer deporte"], ["🌙", "Dormir"]),
    P("¿Cuánto sostén necesitás?", ["🪶", "Suave, sin aro"], ["👌", "Medio"], ["💪", "Firme, con aro"]),
    P("¿Qué estilo te gusta?", ["🤍", "Básico y liso"], ["🌸", "Con encaje"], ["👻", "Sin costuras, invisible"]),
    P("¿Qué es lo más importante para vos?", ["☁️", "Comodidad"], ["✨", "Que realce"], ["👕", "Que no se note bajo la ropa"]), PRESUPUESTO]],
  [/beb|niñ|nin[oa]s|infantil|kids/, "En ropa de bebé muchas veces compra **otra persona**: la **edad** y si es **un regalo** cambian toda la recomendación.", [
    P("¿Para qué edad es?", ["👶", "0 a 12 meses"], ["🧸", "1 a 3 años"], ["🎒", "4 a 8 años"], ["🛹", "9 a 14 años"]),
    P("¿Es para regalar?", ["🎁", "Sí, es un regalo"], ["🏠", "No, es para casa"]),
    P("¿Para qué ocasión?", ["☀️", "Todos los días"], ["🎉", "Un cumple o evento"], ["🏫", "Jardín o escuela"]),
    P("¿Qué priorizás?", ["☁️", "Tela suave"], ["🧼", "Fácil de lavar"], ["📏", "Que le dure más de una temporada"]), PRESUPUESTO]],
  [/calzad|zapat|zapatill|botas|sandal/, "En calzado manda la **comodidad**: el **ancho del pie** y las **horas de uso** evitan la mayoría de los cambios.", [
    P("¿Para qué los vas a usar?", ["🚶", "Caminar todo el día"], ["💼", "Trabajo"], ["🌙", "Salir"], ["🏃", "Hacer deporte"]),
    P("¿Qué estilo buscás?", ["👟", "Urbano / sneakers"], ["👞", "Clásico"], ["🥾", "Botas"], ["🩴", "Sandalias"]),
    P("¿Cómo es tu pie?", ["📏", "Angosto"], ["👌", "Normal"], ["↔️", "Ancho"]),
    P("¿Cuántas horas los usás seguidas?", ["⏱️", "Pocas"], ["🕗", "Media jornada"], ["🌞", "Todo el día"]), PRESUPUESTO]],
  [/talles grandes|curvy|plus|xl/, "En talles grandes la clave es que la persona se sienta cómoda: preguntamos qué le gusta **destacar**, sin juzgar.", [
    P("¿Para qué ocasión buscás?", ["☀️", "El día a día"], ["💼", "Trabajo"], ["🌙", "Una salida"], ["🎉", "Un evento"]),
    P("¿Con qué estilo te sentís más vos?", ["🤍", "Básico"], ["🌸", "Femenino"], ["🧢", "Urbano"], ["✨", "Elegante"]),
    P("¿Qué te gusta destacar?", ["⏳", "La cintura"], ["🦵", "Las piernas"], ["💃", "El escote"], ["🤷", "Nada en especial"]),
    CALCE, PRESUPUESTO]],
  [/./, "En ropa urbana deciden la **ocasión** y el **estilo**. El **calce** que le gusta define el talle final.", [
    P("¿Para qué ocasión buscás?", ["☀️", "El día a día"], ["💼", "Trabajo u oficina"], ["🌙", "Una salida"], ["🛋️", "Fin de semana"]),
    P("¿Con qué estilo te sentís más vos?", ["🤍", "Básico y minimal"], ["🧢", "Urbano"], ["✨", "Elegante"], ["🔥", "En tendencia"]),
    P("¿Qué estás buscando?", ["👕", "Parte de arriba"], ["👖", "Parte de abajo"], ["🧥", "Abrigo"], ["🛍️", "Un look completo"]),
    CALCE, PRESUPUESTO]],
];
let IA = false, G = null, busy = false;

// Pasos visibles del "razonamiento" mientras la IA trabaja
async function pipeline(work) {
  const steps = [...$id("pipe").children];
  steps.forEach((li) => (li.className = ""));
  let result;
  const job = work().then((r) => (result = r));
  for (const li of steps) { li.className = "run"; await wait(reduced() ? 50 : 650); li.className = "ok"; }
  await job;
  return result;
}

// Vista previa interactiva: el dueño de la tienda responde como si fuera su cliente
function preview() {
  const out = $id("genOut"), { list, i, ans } = G;
  if (i >= list.length) {
    out.innerHTML = `<div class="pv-done"><div class="orb"></div><h3>¡Así la vería tu cliente! ✨</h3>
      <p>Con estas respuestas, la asesora elige prendas de tu catálogo y calcula el talle de cada una.</p>
      <div class="pv-ans">${ans.map((o) => `<span>${esc(o.e)} ${esc(o.l)}</span>`).join("")}</div>
      <div class="pv-acts"><button class="btn ghost sm" data-act="otra">Responder de nuevo</button><a class="btn sm" href="/tienda.html">Verla en la tienda demo →</a></div></div>
      <p class="pv-src">${G.src}</p>`;
    return;
  }
  const q = list[i];
  out.innerHTML = `<div class="pv-h"><b><span>✦</span> Vista previa · así lo ve tu cliente</b><span>${i + 1} de ${list.length}</span></div>
    <div class="pv-prog">${list.map((_, k) => `<span class="${k < i ? "on" : ""}"></span>`).join("")}</div>
    <div class="pv-step">Pregunta ${i + 1}</div><div class="pv-q" id="pvQ"></div><div class="pv-opts" id="pvO"></div>
    <p class="pv-src">${G.src}</p>`;
  typeHTML($id("pvQ"), esc(q.t), () => {
    const o = $id("pvO"); if (!o) return;
    o.innerHTML = q.o.map((x, k) => `<button class="pv-opt" style="animation-delay:${k * 0.07}s" data-act="resp" data-arg="${k}"><span>${esc(x.e)}</span>${esc(x.l)}</button>`).join("");
  });
}

async function generar(rubro) {
  rubro = String(rubro || "").trim().slice(0, 160);
  if (rubro.length < 3) return shake($id("genForm"));
  if (busy) return;
  busy = true;
  $id("genIn").value = rubro;
  $id("insight").classList.add("hidden");
  $id("genOut").innerHTML = `<div class="pv-idle"><div class="orb fast"></div><p>Pensando como una vendedora de “${esc(rubro)}”…</p><small>Analizando el rubro</small></div>`;
  const n = norm(rubro), [, foco, base] = PLANTILLAS.find(([re]) => re.test(n));
  const r = await pipeline(async () => {
    if (!IA) return null;
    try { return await api("/api/preguntas", { method: "POST", body: { rubro } }); }
    catch (e) { return e.status === 429 ? { error: e.message } : null; }
  });
  busy = false;
  if (r && r.error) { $id("genOut").innerHTML = `<div class="pv-idle"><div class="orb"></div><p>${esc(r.error)}</p></div>`; return; }
  const live = r && r.preguntas;
  G = {
    list: live ? r.preguntas : base, i: 0, ans: [],
    src: live ? "✦ Generadas en vivo por la IA · en el panel las editás antes de publicarlas"
      : IA ? "La IA no respondió: te muestro la plantilla base de este rubro"
      : "Modo demo: plantilla del rubro · con el servidor publicado las genera la IA en vivo",
  };
  $id("insight").innerHTML = `<b>✦ Qué detectó la IA</b><br>${md(live && r.foco ? r.foco : foco)}<small>${G.list.length} preguntas · tono rioplatense · sin pedir datos personales</small>`;
  $id("insight").classList.remove("hidden");
  preview();
  // En celular la vista previa queda abajo: la acercamos
  if (innerWidth < 960) $id("genOut").scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
}

/* ---------------- Scroll ---------------- */
function reveal() {
  document.querySelectorAll("[data-bars]").forEach((b) => {
    b.innerHTML = b.dataset.bars.split(",").map((x) => { const [l, v] = x.split(":"); return `<div class="r"><b>${esc(l)}</b><i style="--w:${+v * 2.4}%"></i><span>${v}%</span></div>`; }).join("");
    b.classList.add("reveal");
  });
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0, rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
  // Respaldo: si se salta de golpe (ancla o scroll programático), mostrar lo que ya está en pantalla
  addEventListener("scroll", () => document.querySelectorAll(".reveal:not(.in)").forEach((el) => { if (el.getBoundingClientRect().top < innerHeight * 0.92) el.classList.add("in"); }), { passive: true });
}

(async function init() {
  reveal();
  phone();
  $id("genEx").innerHTML = EJEMPLOS.map((x) => `<button type="button" data-act="ej" data-arg="${esc(x)}">${esc(x)}</button>`).join("");
  bindActions($id("genEx"), { ej: generar });
  $id("genForm").addEventListener("submit", (e) => { e.preventDefault(); generar($id("genIn").value); });
  bindActions($id("genOut"), {
    resp: (k, el, e) => {
      el.classList.add("sel"); sparkle(e.clientX, e.clientY, 5, ["✦", "✨", "⚡"]);
      G.ans.push(G.list[G.i].o[+k]); G.i++;
      setTimeout(preview, 260);
    },
    otra: () => { G.i = 0; G.ans = []; preview(); },
  });
  try { IA = (await api("/api/estado")).ia; } catch {}
  // La tarjeta de la demo muestra las mismas ilustraciones que la tienda
  try {
    const cat = await (await fetch("/data/tienda-general.json")).json(), dc = document.querySelectorAll(".dc-grid span");
    ["remera-oversize", "jean-mom", "puffer-corta", "vestido-midi"].forEach((id, i) => { const p = cat.productos.find((x) => x.id === id); if (p && dc[i]) dc[i].innerHTML = Prenda.svg(p); });
  } catch {}
})();
