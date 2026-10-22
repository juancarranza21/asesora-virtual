// Asesora Virtual — widget estándar para cualquier tienda.
// Se configura solo con el JSON de la tienda (public/data/tienda-<id>.json): preguntas, tablas de talles, productos y FAQ.
// Uso: Asesora.mount(catalogo, { demo })  ·  Asesora.open()  ·  Asesora.open({ producto: "id" })
"use strict";
const Asesora = (() => {
  let CAT = null, DEMO = true, root = null;
  let ans = {}, qi = 0, mode = "guia", last = null, pending = null;
  let perfil = store.get("av_perfil");

  const SZ = ["XS", "S", "M", "L", "XL", "XXL"];
  const PARA = [{ v: "mujer", e: "👩", l: "Ropa de mujer" }, { v: "hombre", e: "👨", l: "Ropa de hombre" }];
  const FORMAS = {
    mujer: [["pareja", "Pareja"], ["cadera", "Más ancha de cadera"], ["arriba", "Más ancha arriba"], ["medio", "Más ancha en el medio"]],
    hombre: [["pareja", "Pareja"], ["espalda", "Espalda ancha"], ["medio", "Más ancho en el medio"]],
  };
  const CALCE = [["ajustado", "📐", "Al cuerpo"], ["normal", "👌", "Normal"], ["holgado", "🌬️", "Holgado"]];
  const CALCE_PRENDA = { slim: "al cuerpo", regular: "regular", oversize: "oversize" };
  const MEDIDA = { pecho: "pecho", cintura: "cintura", cadera: "cadera" };

  /* ---------------- Motor de talles (sin centímetro) ----------------
     1) Estima pecho, cintura y cadera con altura, peso y forma del cuerpo (promedios por IMC).
     2) Ubica esa medida en la tabla de la prenda.
     3) La cruza con el talle que la persona usa habitualmente (si lo sabe).
     4) Ajusta por calce: cómo le gusta que le quede vs. cómo viene cortada la prenda. */
  const REF = {
    mujer: { h: 162, imc: 22.9, m: { pecho: 90, cintura: 72, cadera: 98 }, k: { pecho: 2.3, cintura: 2.6, cadera: 2.4 } },
    hombre: { h: 175, imc: 24.5, m: { pecho: 98, cintura: 86, cadera: 99 }, k: { pecho: 2.4, cintura: 2.9, cadera: 2.0 } },
  };
  const AJUSTE_FORMA = {
    mujer: { cadera: { cadera: 4, pecho: -2 }, arriba: { pecho: 4, cadera: -2 }, medio: { cintura: 5 } },
    hombre: { espalda: { pecho: 4, cintura: -2 }, medio: { cintura: 5 } },
  };
  function medidas(pf, para) {
    const r = REF[para], imc = pf.peso / (pf.altura / 100) ** 2, adj = (AJUSTE_FORMA[para] || {})[pf.forma] || {}, out = {};
    for (const k of Object.keys(r.m)) out[k] = r.m[k] + r.k[k] * (imc - r.imc) + 0.18 * (pf.altura - r.h) + (adj[k] || 0);
    return out;
  }
  function ubicar(chart, m) {
    const n = chart.length;
    for (let i = 0; i < n; i++) {
      const [, a, b] = chart[i];
      if (m < b || i === n - 1) {
        const out = m < chart[0][1] - 3 ? "chica" : m > chart[n - 1][2] + 3 ? "grande" : null;
        return { x: i + Math.min(0.999, Math.max(0, (m - a) / (b - a))), out };
      }
    }
  }
  const lbl = (p, i) => (p.lbl ? p.lbl[i] : CAT.tablas.mujer.pecho[i][0]);
  function talle(p, pf) {
    const para = p.para.includes(pf.para) ? pf.para : p.para[0];
    const chart = CAT.tablas[para][p.medida], n = chart.length;
    const med = medidas(pf, para)[p.medida];
    const { x, out } = ubicar(chart, med);
    const h = SZ.indexOf(pf.habitual);
    const comb = h >= 0 ? 0.65 * x + 0.35 * (h + 0.5) : x;
    let i = Math.floor(comb), between = null;
    if (comb - i >= 0.8 && i < n - 1) { between = [lbl(p, i), lbl(p, i + 1)]; if (pf.calce !== "ajustado") i++; }
    const pref = { ajustado: -1, normal: 0, holgado: 1 }[pf.calce || "normal"], g = { slim: -1, regular: 0, oversize: 1 }[p.calce];
    let why = "";
    if (pref === 1 && g <= 0) { if (p.comp || g === -1) why = "alCuerpo"; else { why = "subo"; i++; } }
    else if (pref === -1 && g === 1) { why = "bajo"; i--; }
    else if (pref === 0 && g === 1) why = "yaHolgada";
    else if (pref === -1 && g === 0) why = "podesBajar";
    i = Math.max(0, Math.min(n - 1, i));
    const conf = out ? "baja" : h >= 0 && Math.abs(x - (h + 0.5)) <= 1 ? "alta" : "media";
    return { t: lbl(p, i), med: Math.round(med), between, why, conf, out, otraTabla: para !== pf.para };
  }
  function explicar(p, z) {
    const pf = perfil, forma = (FORMAS[pf.para].find((f) => f[0] === pf.forma) || [])[1];
    let t = `Con <b>${(pf.altura / 100).toFixed(2).replace(".", ",")} m</b> y <b>${pf.peso} kg</b>${forma && pf.forma !== "pareja" ? ` (${forma.toLowerCase()})` : ""}, calculo unos <b>${z.med} cm de ${MEDIDA[p.medida]}</b>, que es la medida que manda en ${esc(p.n.toLowerCase())}.`;
    if (pf.habitual && pf.habitual !== "nose") t += ` Lo crucé con tu talle habitual (<b>${pf.habitual}</b>).`;
    if (z.between) t += ` Estás entre el ${z.between[0]} y el ${z.between[1]}: ${pf.calce === "ajustado" ? "como te gusta al cuerpo, me quedo con el más chico" : "te sugiero el más grande, que siempre es más cómodo"}.`;
    t += {
      subo: ` Como te gusta holgada y esta prenda es de calce ${CALCE_PRENDA[p.calce]}, te subo un talle.`,
      bajo: " Esta prenda ya viene oversize: con un talle menos te queda más al cuerpo, como te gusta.",
      yaHolgada: " Ojo: ya viene holgada de diseño, así que no hace falta subir de talle.",
      podesBajar: " Si la querés bien al cuerpo, podés probar un talle menos.",
      alCuerpo: " Es una prenda que va al cuerpo: no conviene subirle el talle aunque te guste suelta.",
    }[z.why] || "";
    if (z.otraTabla) t += " (Usé la tabla de " + (perfil.para === "mujer" ? "hombre" : "mujer") + ", que es para la que está cortada esta prenda.)";
    if (z.out) t += ` Tu medida queda ${z.out === "chica" ? "por debajo" : "por arriba"} de la tabla de esta prenda: te conviene consultarnos antes de comprar.`;
    return t;
  }

  /* ---------------- Recomendación ---------------- */
  const preguntas = () => [{ id: "para", t: "¿Para quién es la ropa?", o: PARA.map((x) => ({ ...x, s: "" })) }, ...CAT.preguntas];
  function rank() {
    const calce = ans.calce || (perfil && perfil.calce) || "normal", tope = Number(ans.presupuesto || 0);
    const delPara = CAT.productos.filter((p) => p.para.includes(ans.para || (perfil && perfil.para) || "mujer"));
    const enPresupuesto = delPara.filter((p) => !tope || p.p <= tope);
    const R = (enPresupuesto.length >= 3 ? enPresupuesto : delPara).map((p) => {
      let sc = 0;
      for (const q of CAT.preguntas) {
        const v = ans[q.id]; if (!v) continue;
        if (q.id === "cat") sc += v === "todo" ? 0 : p.cat === v ? 5 : -3;
        else if (q.id === "calce") sc += { ajustado: "slim", normal: "regular", holgado: "oversize" }[v] === p.calce ? 2 : 0;
        else if (q.id === "presupuesto") sc += tope && p.p > tope ? -6 : 0;
        else if (p.tags.includes(v)) sc += 3;
      }
      return { ...p, sc, z: perfil ? talle(p, { ...perfil, calce }) : null };
    }).sort((a, b) => b.sc - a.sc);
    if (ans.cat !== "todo") return R;
    const vistos = new Set(), look = []; // look completo: la mejor de cada tipo de prenda primero
    for (const p of R) if (!vistos.has(p.cat)) { vistos.add(p.cat); look.push(p); }
    return [...look, ...R.filter((p) => !look.includes(p))];
  }
  function motivo(p) {
    const ok = CAT.preguntas.filter((q) => ans[q.id] && p.tags.includes(ans[q.id])).map((q) => q.o.find((o) => o.v === ans[q.id]).l.toLowerCase());
    return (ok.length ? `Va con lo que buscás (${ok.slice(0, 2).join(" · ")}): ` : "") + p.why + ".";
  }

  /* ---------------- Vistas ---------------- */
  const body = () => $id("avBody");
  function swap(html, after) {
    const el = body(); el.classList.remove("av-in"); el.classList.add("av-out");
    setTimeout(() => { el.innerHTML = html; el.scrollTop = 0; el.classList.remove("av-out"); void el.offsetWidth; el.classList.add("av-in"); after && after(); }, reduced() ? 0 : 200);
  }
  const prog = (i, n) => `<div class="av-prog">${Array.from({ length: n }, (_, k) => `<span class="${k <= i ? "on" : ""}"></span>`).join("")}</div>`;
  const totalPasos = () => preguntas().length + 1;
  const thumb = (p, big) => `<div class="av-thumb${big ? " big" : ""}">${typeof Prenda !== "undefined" ? Prenda.svg(p) : p.e}</div>`;

  function vInicio() {
    const t = CAT.tienda;
    swap(`<div class="av-bub">¡Hola! Soy <b>${esc(t.asesora)}</b>, la vendedora virtual de ${esc(t.nombre)} 👋<br>Te ayudo a encontrar ropa que vaya con vos y a elegir el talle justo, <b>sin centímetro</b>.</div>
      <div class="av-opts">
        <button class="av-opt" data-act="start"><span class="av-ico">🛍️</span><span>Ayudame a elegir ropa<small>5 preguntas rápidas y te muestro lo ideal</small></span></button>
        <button class="av-opt" data-act="soloTalle"><span class="av-ico">📏</span><span>Solo quiero saber mi talle<small>Con tu altura, peso y talle habitual</small></span></button>
        <button class="av-opt" data-act="tab" data-arg="chat"><span class="av-ico">💬</span><span>Tengo una pregunta<small>Envíos, cambios, pagos, prendas</small></span></button>
      </div>
      ${perfil ? `<p class="av-note">✓ Ya tengo tu perfil de talle guardado en este dispositivo. <button class="av-link" data-act="borrarPerfil">Borrarlo</button></p>` : ""}`);
  }

  function vPregunta() {
    const qs = preguntas(), q = qs[qi];
    swap(`${prog(qi, totalPasos())}<div class="av-top"><button class="av-back" data-act="back" data-arg="q">← Volver</button><span class="av-ai">✨ Preguntas creadas con IA para esta tienda</span></div>
      <div class="av-step">Paso ${qi + 1} de ${totalPasos()}</div><h2>${esc(q.t)}</h2>
      <div class="av-opts">${q.o.map((o, i) => `<button class="av-opt${ans[q.id] === o.v ? " sel" : ""}" style="animation-delay:${0.05 * i + 0.05}s" data-act="pick" data-arg="${esc(q.id)}:${esc(o.v)}"><span class="av-ico">${o.e}</span><span>${esc(o.l)}${o.s ? `<small>${esc(o.s)}</small>` : ""}</span></button>`).join("")}</div>`);
  }

  function vPerfil(fromQuiz) {
    const pf = { altura: 165, peso: 62, forma: "pareja", habitual: "", ...(perfil || {}) };
    pf.para = ans.para || pf.para || "mujer";
    pf.calce = ans.calce || pf.calce || "normal";
    const chips = (name, list, val) => `<div class="av-chips" data-name="${name}">${list.map(([v, l]) => `<button type="button" class="av-chip${v === val ? " on" : ""}" data-act="chip" data-arg="${name}:${v}">${l}</button>`).join("")}</div>`;
    swap(`${fromQuiz ? prog(totalPasos() - 1, totalPasos()) : ""}<button class="av-back" data-act="back" data-arg="${fromQuiz ? "perfilQuiz" : "home"}">← Volver</button>
      ${fromQuiz ? `<div class="av-step">Paso ${totalPasos()} de ${totalPasos()}</div>` : ""}<h2>Tu talle, sin centímetro</h2>
      <p class="av-sub">Respondé como le contarías a una vendedora en el local. Se guarda solo en este dispositivo.</p>
      <form id="avPerfil" class="av-form">
        ${fromQuiz ? "" : `<label>¿Qué ropa buscás?</label>${chips("para", PARA.map((x) => [x.v, x.l]), pf.para)}`}
        <label for="avAlt">Altura <output id="avAltO">${(pf.altura / 100).toFixed(2).replace(".", ",")} m</output></label>
        <input type="range" id="avAlt" name="altura" min="140" max="205" value="${pf.altura}">
        <label for="avPes">Peso aproximado <output id="avPesO">${pf.peso} kg</output></label>
        <input type="range" id="avPes" name="peso" min="38" max="150" value="${pf.peso}">
        <label>Tu forma de cuerpo</label><div id="avFormas">${chips("forma", FORMAS[pf.para], pf.forma)}</div>
        <label>¿Qué talle usás normalmente en remeras?</label>${chips("habitual", [...SZ.map((x) => [x, x]), ["nose", "No sé"]], pf.habitual)}
        ${ans.calce ? "" : `<label>¿Cómo te gusta que te quede?</label>${chips("calce", CALCE.map(([v, e, l]) => [v, `${e} ${l}`]), pf.calce)}`}
        <button class="av-btn" type="submit">${fromQuiz ? "Ver mi selección ✨" : "Calcular mi talle ✨"}</button>
      </form>`, () => {
      const f = $id("avPerfil"); f._pf = pf;
      f.addEventListener("input", (e) => {
        if (e.target.id === "avAlt") { pf.altura = +e.target.value; $id("avAltO").textContent = (pf.altura / 100).toFixed(2).replace(".", ",") + " m"; }
        if (e.target.id === "avPes") { pf.peso = +e.target.value; $id("avPesO").textContent = pf.peso + " kg"; }
      });
      f.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!pf.habitual) return shake(f.querySelector('[data-name="habitual"]')), toast("Elegí tu talle habitual (o “No sé”)");
        perfil = { para: pf.para, altura: pf.altura, peso: pf.peso, forma: pf.forma, habitual: pf.habitual, calce: pf.calce };
        store.set("av_perfil", perfil);
        document.dispatchEvent(new CustomEvent("av:perfil"));
        if (fromQuiz) analizar();
        else if (pending) { const id = pending; pending = null; vTalle(id); }
        else vTodosLosTalles();
      });
    });
  }
  function chip(arg, el) {
    const [name, v] = arg.split(":"), f = $id("avPerfil"), pf = f._pf;
    pf[name] = v;
    el.parentNode.querySelectorAll(".av-chip").forEach((c) => c.classList.toggle("on", c === el));
    if (name === "para") { pf.forma = "pareja"; $id("avFormas").innerHTML = `<div class="av-chips" data-name="forma">${FORMAS[v].map(([fv, l]) => `<button type="button" class="av-chip${fv === "pareja" ? " on" : ""}" data-act="chip" data-arg="forma:${fv}">${l}</button>`).join("")}</div>`; }
  }

  function analizar() {
    const msgs = ["Leyendo lo que me contaste…", "Calculando tu talle en cada prenda…", "Eligiendo lo que mejor te va…"];
    swap(`<div class="av-analyzing"><div class="av-orb"></div><div class="av-an" id="avAn">${msgs[0]}</div></div>`, () => {
      let i = 0;
      const iv = setInterval(() => { const a = $id("avAn"); if (!a || ++i >= msgs.length) return clearInterval(iv); a.textContent = msgs[i]; }, 750);
      setTimeout(vResultados, reduced() ? 300 : 2300);
    });
  }

  function cardProd(p, main, i) {
    return `<article class="av-prod${main ? " main" : ""}" style="animation-delay:${0.15 + i * 0.08}s">${thumb(p)}<div class="av-pi">${main ? '<span class="av-tag">⭐ Mi recomendación</span>' : ""}<b>${esc(p.n)}</b>
      <span class="av-price">${money(p.p)} <small>· ${CAT.tienda.cuotas} cuotas sin interés</small></span>
      ${p.z ? `<span class="av-sz">Tu talle: <b>${esc(p.z.t)}</b></span>` : ""}${main ? "" : `<small class="av-why">${esc(motivo(p))}</small>`}</div>
      <button class="av-add" data-act="cart" data-arg="${esc(p.id)}" aria-label="Agregar ${esc(p.n)} al carrito">＋</button></article>`;
  }
  function vResultados() {
    const R = rank(), top = R.slice(0, 4), p = top[0];
    last = { producto: p.n, talle: p.z ? p.z.t : "" };
    logEvt("quiz", { ans: { ...ans }, producto: p.id, talle: last.talle });
    const resumen = preguntas().filter((q) => ans[q.id]).map((q) => q.o.find((o) => o.v === ans[q.id])).map((o) => `<span>${o.e} ${esc(o.l)}</span>`).join("");
    const ia = `<b>${esc(p.n)}</b> ${esc(motivo(p).charAt(0).toLowerCase() + motivo(p).slice(1))} ${p.z ? `<br><br>📏 Te recomiendo el <b>talle ${esc(p.z.t)}</b>. ${explicar(p, p.z)}` : ""}`;
    swap(`<div class="av-res-h"><span class="av-tag">✨ Elegido para vos</span><h2>Esto va con lo que buscás</h2><div class="av-sum">${resumen}</div></div>
      ${cardProd(p, true, 0)}
      <div class="av-ia"><div class="av-ia-h"><span class="av-face sm">${CAT.tienda.avatar}</span> Por qué te lo recomiendo ${p.z ? `<span class="av-conf ${p.z.conf}">Confianza ${p.z.conf}</span>` : ""}</div><div id="avWhy"></div></div>
      <button class="av-btn" data-act="cart" data-arg="${esc(p.id)}">Agregar al carrito${p.z ? " · talle " + esc(p.z.t) : ""} 🛍️</button>
      <h3 class="av-h3">También te puede gustar</h3>${top.slice(1).map((x, i) => cardProd(x, false, i + 1)).join("")}
      <div class="av-row"><button class="av-btn ghost" data-act="restart">Empezar de nuevo</button><button class="av-btn ghost" data-act="tab" data-arg="chat">Hacer una pregunta</button></div>`, () => {
      const r = body().querySelector(".av-sz"); if (r) { const b = r.getBoundingClientRect(); sparkle(b.left + b.width / 2, b.top, 8); }
      setTimeout(() => typeHTML($id("avWhy"), ia), 350);
    });
  }

  function vTalle(id) {
    const p = CAT.productos.find((x) => x.id === id); if (!p) return vInicio();
    const z = talle(p, perfil);
    last = { producto: p.n, talle: z.t };
    logEvt("talle", { producto: p.id, talle: z.t, calce: perfil.calce });
    swap(`<button class="av-back" data-act="home">← Inicio</button>
      <div class="av-talle-top">${thumb(p, true)}<div><b>${esc(p.n)}</b><span class="av-price">${money(p.p)}</span><span class="av-calce">Calce ${CALCE_PRENDA[p.calce]}</span></div></div>
      <div class="av-res-top"><div class="av-lbl">Tu talle ideal es</div><div class="av-big">${esc(z.t)}</div><span class="av-conf ${z.conf}">Confianza ${z.conf}</span></div>
      <div class="av-ia"><div class="av-ia-h"><span class="av-face sm">${CAT.tienda.avatar}</span> Cómo lo calculé</div><div id="avWhy"></div></div>
      <button class="av-btn" data-act="cart" data-arg="${esc(p.id)}">Agregar al carrito · talle ${esc(z.t)} 🛍️</button>
      <div class="av-row"><button class="av-btn ghost" data-act="soloTalle">Cambiar mis datos</button><button class="av-btn ghost" data-act="todos">Mi talle en todo</button></div>`, () => {
      const b = body().querySelector(".av-big").getBoundingClientRect(); sparkle(b.left + b.width / 2, b.top + b.height / 2, 10);
      setTimeout(() => typeHTML($id("avWhy"), explicar(p, z)), 300);
    });
  }

  function vTodosLosTalles() {
    const L = CAT.productos.filter((p) => p.para.includes(perfil.para));
    swap(`<button class="av-back" data-act="home">← Inicio</button><h2>Tu talle en cada prenda</h2>
      <p class="av-sub">Calculado con tu perfil y el calce de cada prenda. Tocá una para ver el detalle.</p>
      <div class="av-list">${L.map((p, i) => { const z = talle(p, perfil); return `<button class="av-li" style="animation-delay:${i * 0.03}s" data-act="verTalle" data-arg="${esc(p.id)}">${thumb(p)}<span><b>${esc(p.n)}</b><small>Calce ${CALCE_PRENDA[p.calce]}</small></span><em>${esc(z.t)}</em></button>`; }).join("")}</div>
      <button class="av-btn ghost" data-act="soloTalle">Cambiar mis datos</button>`);
  }

  /* ---------------- Chat: "cerebro" local ----------------
     Entiende la intención de la pregunta (talle, precio, tela, colores, calce, combinar, comparar, buscar prendas,
     envíos, cambios…) y responde con el catálogo y las preguntas frecuentes, sin servidor ni costo.
     Recuerda de qué prenda se viene hablando ("¿y viene en negro?").
     Lo que no sabe lo pasa a la IA del servidor (si está publicada) y, si tampoco, a WhatsApp. */
  const STOP = new Set("que como cual cuales cuanto cuanta cuantos de la el los las un una unos unas y o a en mi me te se lo le por para con es son hay tienen tenes tiene puedo pueden si no mas muy del al yo vos su sus esta este eso esa hacen hago hola buenas buen dia quiero queria saber algo alguna alguno che porfa favor".split(" "));
  const SYN = { demora: "tarda", tardan: "tarda", llega: "envio", llegan: "envio", mandan: "envio", envian: "envio", envios: "envio", abonar: "pago", pagar: "pago", pagos: "pago", tarjetas: "tarjeta", devuelvo: "devolucion", devolver: "devolucion", cambiar: "cambio", cambios: "cambio", talla: "talle", tallas: "talle", talles: "talle", lavo: "lavar", lavarla: "lavar", lavarlo: "lavar", regalar: "regalo", regalos: "regalo", promo: "descuento", promos: "descuento", oferta: "descuento", ofertas: "descuento", descuentos: "descuento", mayorista: "mayor", retirar: "retiro", encogen: "encoge", achica: "encoge" };
  const stem = (w) => (w.length > 5 ? w.slice(0, 5) : w);
  const toks = (t) => norm(t).split(" ").filter((w) => w && !STOP.has(w)).map((w) => stem(SYN[w] || w));
  function lev(a, b) { // distancia de edición (tolera errores de tipeo)
    if (Math.abs(a.length - b.length) > 2) return 9;
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  const near = (w, list) => list.some((k) => k === w || (w.length >= 4 && k.length >= 4 && lev(w, k) <= 1));
  function localMatch(q, prods) {
    const skip = new Set((prods || []).flatMap((p) => toks(p.n))); // "¿cómo lavo la camisa de lino?" → busca solo "lavar"
    const qt = toks(q).filter((w) => !skip.has(w)); if (!qt.length) return null;
    let best = null, bs = 0;
    for (const e of CAT.faq) {
      const kt = e._t || (e._t = [...new Set(toks(e.q + " " + (e.k || "")))]);
      let sc = 0;
      for (const w of qt) { if (kt.includes(w)) sc += 1; else if (near(w, kt)) sc += 0.7; }
      sc /= Math.max(2, qt.length);
      if (sc > bs) { bs = sc; best = e; }
    }
    return best && bs >= 0.45 ? best : null;
  }

  // Tipos de prenda y cómo los nombra la gente
  const TIPOS = {
    remera: ["remera", "remeras", "remerita", "camiseta", "camisetas", "remeron"], camisa: ["camisa", "camisas", "camisita"],
    sweater: ["sweater", "sweaters", "sueter", "pullover", "tejido", "saco tejido"], top: ["top", "tops", "corset", "corse", "corpino"],
    buzo: ["buzo", "buzos", "hoodie", "canguro", "sudadera"], campera: ["campera", "camperas", "camperon", "puffer", "inflable", "abrigo", "abrigos"],
    blazer: ["blazer", "blazers", "saco"], jean: ["jean", "jeans", "vaquero", "vaqueros", "denim"],
    pantalon: ["pantalon", "pantalones", "chino", "chinos", "palazzo", "wide leg", "oxford"], cargo: ["cargo", "cargos", "parachute"],
    vestido: ["vestido", "vestidos", "vestidito"],
  };
  const tipoDe = (p) => norm(p.n).split(" ")[0];
  const GENERIC = new Set(["regular", "basica", "basico", "corta", "largo", "tiro", "alto", "fit", "oversize", "algodon", "peinado", "pantalon", "remera", "camisa", "buzo", "campera", "jean", "vestido", "top", "sweater", "blazer", "cargo", "tejido", "frisa"]);
  // Prendas mencionadas: primero por nombre propio ("mom", "lino", "puffer"), si no por tipo ("jeans")
  function findProducts(q) {
    const n = " " + norm(q) + " ", w = n.trim().split(" ");
    const exact = CAT.productos.map((p) => {
      const pw = norm(p.n).split(" ").filter((x) => x.length >= 3 && !STOP.has(x) && !GENERIC.has(x));
      return { p, hit: pw.filter((x) => w.some((y) => y === x || (x.length >= 5 && lev(x, y) <= 1))).length };
    }).filter((x) => x.hit).sort((a, b) => b.hit - a.hit).map((x) => x.p);
    const tipos = Object.entries(TIPOS).filter(([, al]) => al.some((a) => n.includes(" " + a + " "))).map(([t]) => t);
    const porTipo = CAT.productos.filter((p) => tipos.includes(tipoDe(p)) || (tipos.includes("pantalon") && p.cat === "abajo"));
    // "el jean mom" → exacto gana; "jeans" → todos los jeans
    // nombre propio ("mom", "puffer") gana; si no, todas las del tipo nombrado ("jeans")
    // dentro del tipo, primero la que más palabras comparte con la pregunta ("la remera oversize")
    const cuantas = (p) => norm(p.n).split(" ").filter((x) => x.length >= 3 && w.includes(x)).length;
    porTipo.sort((a, b) => cuantas(b) - cuantas(a));
    const una = porTipo.length > 1 && cuantas(porTipo[0]) > 1 && cuantas(porTipo[0]) > cuantas(porTipo[1]);
    const list = exact.length ? exact : una ? porTipo.slice(0, 1) : porTipo;
    return { list, tipos };
  }

  const RX = {
    saludo: /^(hola|holi|holaa+|buenas|buen dia|buenos dias|buenas tardes|buenas noches|hey|que tal|como va)\b/,
    gracias: /\b(gracias|muchas gracias|genial|perfecto|buenisimo|joya|barbaro|excelente|re bien)\b/,
    talle: /\b(talle|talles|talla|medida|medidas|que numero|me queda|me va|me iria|soy|calzo|uso un)\b/,
    precio: /\b(precio|precios|cuesta|cuestan|sale|salen|vale|valen|valor|cuanto esta|cuanto)\b/,
    tela: /\b(tela|telas|material|materiales|algodon|lino|composicion|de que es|de que esta|abriga|abrigad\w*|fresc\w*|caluros\w*|transpira\w*|elastic\w*|estira\w*|elastano|grueso|finit\w*|liviano|pesad\w*|calidad)\b/,
    color: /\b(color|colores|negro|negra|blanco|blanca|azul|beige|gris|verde|rojo|roja|crudo|marron|chocolate|celeste|arena|camel|terracota|tonos|otro color)\b/,
    calce: /holgad|ajustad|oversize|amplio|amplia|suelt|entallad|ceñid|calce|al cuerpo|chupin|recto|corte|aprieta|grande|chico/,
    para: /\b(unisex|hombre|hombres|mujer|mujeres|varon|chica|chico)\b/,
    combinar: /combin|con que (lo |la |los |las )?(uso|pongo|queda)|que le va|armar (un )?look|outfit|que me pongo con/,
    comparar: /diferencia|compar|cual (es )?mejor|me conviene|\bvs\b|versus|\b(o|u) (el|la|los|las)\b/,
    stock: /\b(stock|disponible|agotad\w*|quedan?|hay en)\b/,
    browse: /\b(algo|busco|buscando|quiero|queria|necesito|recomend\w*|mostrame|tenes|tienen|hay|ideas?|sugeri\w*|sugerencia|que me pongo|que uso|para ir)\b/,
    politica: /envio|envia|mandan|llega|tarda|demora|cambi|devol|pago|pagar|tarjeta|cuota|transfer|factura|local|retir|lavar|lavo|lavado|plancha|encoge|gift|mayor|descuento|promo|oferta|newsletter/,
    persona: /persona|humano|asesor|vendedor|whatsapp|atencion|hablar con/,
  };
  const FILTROS = {
    cat: [["arriba", /parte de arriba|algo de arriba|\barriba\b/], ["abajo", /parte de abajo|algo de abajo|\babajo\b|pantal/], ["abrigo", /abrig|invierno|frio/], ["vestido", /vestid/]],
    calce: [["oversize", /holgad|oversize|amplio|amplia|suelt|comod/], ["slim", /ajustad|entallad|al cuerpo|ceñid|pegad|que marque/]],
    tag: [["trabajo", /trabajo|oficina|laburo|reunion|entrevista|formal/], ["salida", /salida|salir|fiesta|noche|boliche|cumple|casamiento|evento|cena|cita|after/], ["diario", /diario|dia a dia|todos los dias|facu|facultad|clase/], ["finde", /finde|fin de semana|relajad|descanso|domingo/],
      ["elegante", /elegant|arreglad|chic|fino|fina/], ["urbano", /urban|street|canchero|cancher/], ["basico", /basic|minimal|neutro|sencill|clasic/], ["tendencia", /tendencia|de moda|moderno|lo ultimo|onda/]],
    para: [["hombre", /\b(hombre|varon|novio|marido|papa|mi viejo|hermano|chico)\b/], ["mujer", /\b(mujer|novia|esposa|mama|mi vieja|hermana|chica)\b/]],
  };
  const LBL = { trabajo: "el trabajo", salida: "una salida", diario: "el día a día", finde: "el finde", elegante: "elegante", urbano: "urbano", basico: "básico", tendencia: "en tendencia", oversize: "holgado", slim: "al cuerpo", arriba: "de arriba", abajo: "de abajo", abrigo: "abrigo", vestido: "vestido" };
  function topeDe(n) {
    const m = n.match(/(?:hasta|menos de|maximo|no mas de|por debajo de|tope)\s*\$?\s*(\d+(?:[.,]\d+)?)\s*(mil|k|lucas)?/);
    if (!m) return 0;
    let v = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
    if (m[2] || v < 1000) v *= 1000;
    return v;
  }
  const sz = (p) => (perfil ? talle(p, perfil).t : null);
  const card = (p, extra) => `<div class="av-mc">${thumb(p)}<span><b>${esc(p.n)}</b><small>${money(p.p)}${sz(p) ? ` · tu talle <em>${esc(sz(p))}</em>` : ""}${extra ? " · " + extra : ""}</small></span><button class="av-mc-b" data-act="${perfil ? "cart" : "verTalle"}" data-arg="${esc(p.id)}" aria-label="${perfil ? "Agregar al carrito" : "Ver mi talle"}">${perfil ? "＋" : "📏"}</button></div>`;
  const chips = (list) => `<div class="av-qr">${list.map((x) => `<button class="av-sug" data-act="ask" data-arg="${esc(x)}">${esc(x)}</button>`).join("")}</div>`;
  const lista = (arr) => (arr.length > 1 ? arr.slice(0, -1).join(", ") + " y " + arr[arr.length - 1] : arr[0] || "");
  const CALCE_TXT = { slim: "tiene calce **al cuerpo**", regular: "tiene calce **regular**: ni ajustado ni suelto", oversize: "tiene calce **holgado / oversize** de diseño" };
  let ctxProd = null;

  function recomendar(n, base) {
    const f = { tags: [] };
    for (const [v, re] of FILTROS.cat) if (re.test(n)) f.cat = v;
    for (const [v, re] of FILTROS.calce) if (re.test(n)) f.calce = v;
    for (const [v, re] of FILTROS.tag) if (re.test(n)) f.tags.push(v);
    for (const [v, re] of FILTROS.para) if (re.test(n)) f.para = v;
    f.tope = topeDe(n); f.barato = /barat|economic|accesible|no tan car/.test(n); f.regalo = /regal/.test(n);
    f.calor = /verano|calor|fresc/.test(n);
    const hay = f.cat || f.calce || f.tags.length || f.para || f.tope || f.barato || f.regalo || f.calor || base;
    if (!hay) return null;
    const para = f.para || (perfil && perfil.para);
    let L = (base || CAT.productos).filter((p) => (!para || p.para.includes(para)) && (!f.tope || p.p <= f.tope));
    if (!L.length) return { html: `No tengo prendas ${f.tope ? "por debajo de " + money(f.tope) : "con esa combinación"} 🙈 ¿Probamos con otra?` + chips(["Recomendame algo", "Lo más barato que tengas"]) };
    // Pidió un calce que ese tipo de prenda no tiene: lo decimos y mostramos lo más parecido
    if (base && f.calce && !L.some((p) => p.calce === f.calce)) {
      const alt = CAT.productos.filter((p) => p.cat === base[0].cat && p.calce === f.calce && (!para || p.para.includes(para))).slice(0, 3);
      if (alt.length) { ctxProd = alt[0]; return { html: `En ${esc(norm(base[0].n).split(" ")[0])} no tengo calce ${LBL[f.calce]} 🙈 Lo más parecido:${alt.map((p) => card(p)).join("")}`, src: "Elegido del catálogo según lo que me contaste" }; }
    }
    L = L.map((p) => {
      let s = 0;
      if (f.cat) s += p.cat === f.cat ? 4 : -3;
      if (f.calce) s += p.calce === f.calce ? 3 : -2;
      for (const t of f.tags) if (p.tags.includes(t)) s += 3;
      if (f.calor && /fresc|lino|liviana|algodon/.test(norm(p.tela))) s += 3;
      if (f.calor && p.cat === "abrigo") s -= 4;
      return { p, s };
    }).sort((a, b) => b.s - a.s || (f.barato ? a.p.p - b.p.p : 0)).map((x) => x.p);
    if (f.barato) L = L.slice(0, 6).sort((a, b) => a.p - b.p);
    const top = L.slice(0, 3);
    ctxProd = top[0];
    const que = [f.cat && LBL[f.cat], f.calce && LBL[f.calce], ...f.tags.map((t) => (["trabajo", "salida", "diario", "finde"].includes(t) ? "para " + LBL[t] : LBL[t])), f.calor && "para el calor", f.tope && "hasta " + money(f.tope), f.barato && "accesible", f.regalo && "para regalar", para && f.para && "de " + para].filter(Boolean);
    let html = `${que.length ? `Para algo <b>${esc(lista(que))}</b>, te recomiendo:` : "Te recomiendo:"}${top.map((p) => card(p)).join("")}`;
    if (f.regalo) html += `Si no sabés el talle, la <b>gift card</b> nunca falla 🎁 (desde $20.000).`;
    if (!perfil) html += `<br><small>📏 Tocá la regla para ver tu talle en cada una.</small>`;
    return { html, src: "Elegido del catálogo según lo que me contaste" };
  }

  function sobreProducto(n, L) {
    const p = L[0], v = CALCE_TXT[p.calce];
    // "¿tienen jeans holgados?" → es una búsqueda entre varios, no una pregunta sobre uno
    if (L.length > 1 && RX.browse.test(n) && !RX.comparar.test(n) && !RX.talle.test(n) && !RX.precio.test(n)) return null;
    ctxProd = p;
    if (RX.comparar.test(n) && L.length >= 2) {
      const [a, b] = L;
      return `<b>${esc(a.n)}</b> vs <b>${esc(b.n)}</b>:<br>• ${esc(a.n)}: ${money(a.p)}, ${md(CALCE_TXT[a.calce])}, ${esc(a.tela)}.<br>• ${esc(b.n)}: ${money(b.p)}, ${md(CALCE_TXT[b.calce])}, ${esc(b.tela)}.<br>${a.p < b.p ? `El ${esc(a.n.toLowerCase())} es más económico` : `El ${esc(b.n.toLowerCase())} es más económico`}. Si querés, te digo tu talle en los dos 📏`;
    }
    if (RX.talle.test(n)) {
      if (!perfil) { pending = p.id; return `Para calcular tu talle en <b>${esc(p.n)}</b> necesito tu altura, peso y talle habitual. <button class="av-link" data-act="soloTalle">Cargalos acá</button> (30 segundos) 📏`; }
      const Lp = L.filter((x) => x.para.includes(perfil.para)); if (Lp.length) L = Lp;
      if (L.length > 1 && !RX.comparar.test(n)) return `Con tu perfil te corresponde:<br>${L.slice(0, 5).map((x) => `• ${esc(x.n)}: <b>talle ${esc(talle(x, perfil).t)}</b>`).join("<br>")}`;
      const z = talle(p, perfil); last = { producto: p.n, talle: z.t };
      return `En <b>${esc(p.n)}</b> te va el <b>talle ${esc(z.t)}</b>${z.why === "yaHolgada" ? " (ya viene holgada de diseño)" : ""}. <button class="av-link" data-act="verTalle" data-arg="${esc(p.id)}">Ver cómo lo calculé</button>`;
    }
    if (RX.precio.test(n) && !/tarda|demora|cuota|envio/.test(n)) return L.length > 1 ? L.slice(0, 5).map((x) => `• ${esc(x.n)}: <b>${money(x.p)}</b>`).join("<br>") + `<br>Todo en hasta ${CAT.tienda.cuotas} cuotas sin interés.` : `<b>${esc(p.n)}</b> cuesta <b>${money(p.p)}</b>, en hasta ${CAT.tienda.cuotas} cuotas sin interés.`;
    if (RX.combinar.test(n)) {
      const comp = CAT.productos.filter((x) => x.cat !== p.cat && x.id !== p.id && x.para.some((g) => p.para.includes(g)))
        .map((x) => ({ x, s: x.tags.filter((t) => p.tags.includes(t)).length })).sort((a, b) => b.s - a.s).slice(0, 2).map((o) => o.x);
      return `Con <b>${esc(p.n)}</b> queda genial:${comp.map((x) => card(x)).join("")}`;
    }
    if (RX.color.test(n)) {
      const pedido = (p.colores || []).find((c) => n.includes(norm(c).split(" ")[0]));
      const otros = /\b(negro|negra|blanco|blanca|azul|beige|gris|verde|rojo|roja|crudo|marron|chocolate|celeste|arena|camel|terracota)\b/.exec(n);
      if (pedido) return `¡Sí! <b>${esc(p.n)}</b> viene en <b>${esc(pedido)}</b> 🙌 También en ${esc(lista(p.colores.filter((c) => c !== pedido)))}.`;
      if (otros) return `En ${esc(otros[1])} no la tenemos 🙈 <b>${esc(p.n)}</b> viene en ${esc(lista(p.colores))}.`;
      return `<b>${esc(p.n)}</b> viene en ${esc(lista(p.colores))}.`;
    }
    if (RX.tela.test(n) && L.length > 1) return L.slice(0, 4).map((x) => `• <b>${esc(x.n)}</b>: ${esc(x.tela)}`).join("<br>");
    if (RX.tela.test(n)) return `<b>${esc(p.n)}</b> es de ${esc(p.tela)}. ${esc(p.why.charAt(0).toUpperCase() + p.why.slice(1))}.`;
    if (RX.calce.test(n)) {
      let t = `<b>${esc(p.n)}</b> ${md(v)}.`;
      if (p.calce === "oversize") t += " No hace falta subir de talle: el corte ya es amplio.";
      if (p.calce === "slim") t += " Si te gusta más suelta, mejor mirá otra prenda en vez de subir el talle.";
      if (perfil) t += ` Con tu perfil te va el <b>${esc(talle(p, perfil).t)}</b>.`;
      return t;
    }
    if (RX.para.test(n)) return p.para.length > 1 ? `<b>${esc(p.n)}</b> es <b>unisex</b> 👌` : `<b>${esc(p.n)}</b> está pensada para <b>${p.para[0]}</b>, con su tabla de talles.`;
    if (RX.stock.test(n)) return `Sí, <b>${esc(p.n)}</b> tiene stock en ${p.lbl ? `talles ${p.lbl[0]} al ${p.lbl[p.lbl.length - 1]}` : "talles XS al XXL"} y en ${esc(lista(p.colores))}.`;
    if (L.length > 1 && !RX.browse.test(n)) return `Tenemos ${L.length} opciones:${L.slice(0, 4).map((x) => card(x)).join("")}`;
    if (L.length > 1) return null; // "busco jeans holgados" → lo resuelve recomendar()
    return `<b>${esc(p.n)}</b>: ${money(p.p)}. Es de ${esc(p.tela)} y ${md(v)}. ${esc(p.why.charAt(0).toUpperCase() + p.why.slice(1))}.${card(p)}`;
  }

  function brain(q) {
    const n = norm(q), palabras = n.split(" ").length;
    if (RX.saludo.test(n) && palabras <= 4) return { html: `¡Hola! 👋 Contame qué estás buscando o preguntame lo que quieras de una prenda: talle, tela, colores, con qué combinarla…` + chips(["Recomendame algo para una salida", "¿Qué talle soy?", "¿Hacen envíos?"]) };
    if (RX.gracias.test(n) && palabras <= 5) return { html: `¡De nada! 💛 ¿Seguimos buscando? Contame si tenés algo más en mente.` + chips(["Recomendame algo", "¿Tienen gift card?"]) };
    if (RX.persona.test(n)) return { html: `¡Claro! En la tienda real te paso con una persona del equipo por <b>WhatsApp</b> con un toque. Mientras, si querés, sigo ayudándote yo 😊` };
    if (/\bcuota/.test(n)) return { html: `Tenés <b>${CAT.tienda.cuotas} cuotas sin interés</b> en toda la tienda 💳`, src: "Dato de " + esc(CAT.tienda.nombre) };

    let { list: L } = findProducts(q);
    const sobre = RX.talle.test(n) || RX.precio.test(n) || RX.tela.test(n) || RX.color.test(n) || RX.calce.test(n) || RX.combinar.test(n) || RX.stock.test(n) || RX.para.test(n);
    const referencia = /\b(ese|esa|eso|este|esta|esos|esas|lo|la|y en|y el|y la|tambien|de ese|de esa)\b/.test(n) || (palabras <= 4 && !RX.talle.test(n));
    const fuera = n.match(/\b(zapatill\w*|zapato\w*|calzado|botas?|botineta\w*|sandalia\w*|ojota\w*|medias?|cartera\w*|mochila\w*|bolso\w*|gorra\w*|gorro\w*|anteojo\w*|lente\w*|reloj\w*|malla\w*|bikini\w*|pijama\w*|ropa interior|corpiño\w*|bombacha\w*|perfume\w*|accesorio\w*)\b/);
    if (fuera) return { html: `Por ahora no vendemos ${esc(fuera[1])} 🙈 En ${esc(CAT.tienda.nombre)} tenemos ropa: remeras, camisas, buzos, camperas, jeans, pantalones y vestidos. ¿Te ayudo a encontrar algo de eso?` + chips(["Recomendame algo", "Algo para una salida"]) };
    const faq = localMatch(q, L);
    if (faq && RX.politica.test(n) && !(L.length && sobre && !/cambi|envio|lavar|lavo/.test(n))) return { html: md(faq.a), src: "Respuesta de " + esc(CAT.tienda.nombre) };
    const conFiltros = [...FILTROS.cat, ...FILTROS.tag, ...FILTROS.para].some(([, re]) => re.test(n)) || topeDe(n) > 0;
    if (!L.length && ctxProd && sobre && referencia && !(conFiltros && !/\b(ese|esa|eso|este|esta|lo|la)\b/.test(n))) L = [ctxProd];

    if (L.length) {
      const r = sobreProducto(n, L);
      if (r) return { html: r, src: "Dato del catálogo de " + esc(CAT.tienda.nombre) };
      return recomendar(n, L);
    }
    if (RX.browse.test(n) || /regal|barat|para (el|la|un|una)/.test(n)) {
      const r = recomendar(n);
      if (r) return r;
      return { html: `¡Te ayudo! Contame un poco más: ¿para qué ocasión es y cómo te gusta que te quede? O hacé el test de 1 minuto y te armo la selección ✨` + chips(["Algo para el trabajo", "Algo holgado y cómodo", "Para una salida", "Hasta $30.000"]) + `<button class="av-link" data-act="start">Hacer el test →</button>` };
    }
    const miTalle = /\b(soy|mi talle|me va|me queda|me iria|uso)\b/.test(n);
    if (faq && !(RX.talle.test(n) && miTalle)) return { html: md(faq.a), src: "Respuesta de " + esc(CAT.tienda.nombre) };
    if (RX.talle.test(n)) {
      if (!perfil) return { html: `Te lo calculo sin centímetro: necesito tu altura, peso y el talle que usás siempre. <button class="av-link" data-act="soloTalle">Cargalos acá</button> 📏` };
      const tipos = ["remera", "camisa", "buzo", "campera", "jean", "pantalon", "vestido"].filter((t) => CAT.productos.some((x) => tipoDe(x) === t && x.para.includes(perfil.para)));
      return { html: `Con tu perfil:<br>${tipos.map((t) => { const p = CAT.productos.find((x) => tipoDe(x) === t && x.para.includes(perfil.para)); return `• ${esc(p.n)}: <b>${esc(talle(p, perfil).t)}</b>`; }).join("<br>")}<br><button class="av-link" data-act="todos">Ver todas las prendas</button>`, src: "Calculado con la tabla de talles de cada prenda" };
    }
    const r = recomendar(n);
    if (r) return r;
    return null;
  }

  const HIST = [];
  function chatInit() {
    addMsg(`¡Hola! Soy ${esc(CAT.tienda.asesora)} ${CAT.tienda.avatar} Preguntame lo que quieras, como en el local: talles, telas, colores, qué combinar, envíos o cambios.`, "bot");
    const sug = ["Recomendame algo para una salida", "¿De qué tela es el buzo?", "¿El jean mom viene en negro?", "¿Con qué combino el blazer?", "¿Qué talle soy en el jean mom?", "Algo holgado hasta 30 mil", "¿Tienen gift card?"];
    $id("avSugs").innerHTML = sug.map((x) => `<button class="av-sug" data-act="ask" data-arg="${esc(x)}">${esc(x)}</button>`).join("");
    $id("avForm").addEventListener("submit", (e) => { e.preventDefault(); ask($id("avIn").value); });
  }
  function addMsg(html, who) { const m = document.createElement("div"); m.className = "av-m " + who; m.innerHTML = html; const box = $id("avMsgs"); box.appendChild(m); box.scrollTop = box.scrollHeight; return m; }
  function reply(el, html, src) {
    el.innerHTML = html + (src ? `<span class="av-src">${src}</span>` : ""); $id("avMsgs").scrollTop = 1e6;
    HIST.push({ r: "a", t: el.textContent.slice(0, 300) }); HIST.splice(0, HIST.length - 6);
  }
  async function ask(text) {
    const q = String(text || "").trim().slice(0, 300); if (!q) return;
    if (mode !== "chat") tab("chat");
    $id("avIn").value = "";
    addMsg(esc(q), "me");
    const hist = HIST.slice(-6);
    HIST.push({ r: "u", t: q });
    const t = addMsg('<span class="av-dots"><i></i><i></i><i></i></span>', "bot");
    const b = brain(q);
    if (b) { logEvt("chat", { q, ok: true }); await wait(500 + Math.min(700, b.html.length)); return reply(t, b.html, b.src); }
    if (!DEMO) {
      try {
        const r = await api("/api/chat", { method: "POST", body: { q, tienda: CAT.tienda.id, ctx: last, prod: ctxProd ? ctxProd.n : "", hist } });
        if (r.a) { logEvt("chat", { q, ok: true, ia: true }); return reply(t, md(r.a), "✦ Respondido por IA con la info de la tienda"); }
      } catch (e) { if (e.status === 429) return reply(t, esc(e.message)); }
    } else await wait(650);
    logEvt("chat", { q, ok: false });
    reply(t, `Mmm, ese dato no lo tengo cargado 🙈 ${DEMO ? "En la tienda real, la IA lo intenta con toda la info de la tienda y, si no sabe, te paso con una persona por <b>WhatsApp</b>." : "Te paso con una persona del equipo por <b>WhatsApp</b> y la pregunta queda guardada para sumarla."} Mientras, puedo ayudarte con:` + chips(["Recomendame algo", "¿Qué talle soy?", "¿Hacen envíos?", "¿Cómo son los cambios?"]), DEMO ? "Modo demo: la IA del servidor está apagada" : "");
  }

  /* ---------------- Montaje ---------------- */
  function tab(t) {
    mode = t;
    root.querySelectorAll(".av-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.arg === t));
    body().classList.toggle("hidden", t !== "guia");
    $id("avChat").classList.toggle("hidden", t !== "chat");
    if (t === "chat") setTimeout(() => $id("avIn").focus(), 250);
  }
  function open(opts = {}) {
    document.body.classList.add("av-open");
    root.classList.add("show");
    $id("avFab").classList.add("gone");
    tab("guia");
    if (opts.producto) { if (perfil) vTalle(opts.producto); else { pending = opts.producto; vPerfil(false); } }
    else if (!body().innerHTML) vInicio();
    setTimeout(() => root.querySelector(".av-x").focus(), 300);
  }
  function close() { document.body.classList.remove("av-open"); root.classList.remove("show"); $id("avFab").classList.remove("gone"); }

  function mount(cat, { demo }) {
    CAT = cat; DEMO = demo;
    CAT.faq = [...CAT.faq, ...(store.get("av_faq_extra") || [])]; // respuestas que el dueño cargó desde el panel
    const t = CAT.tienda;
    document.body.insertAdjacentHTML("beforeend", `
      <button class="av-fab" id="avFab" aria-label="Abrir la asesora virtual"><span class="av-face">${t.avatar}</span><span class="av-fab-t">¿Te ayudo a elegir?<small>${esc(t.asesora)} · vendedora con <b>IA</b></small></span></button>
      <div class="av-root" id="avRoot">
        <div class="av-scrim" data-act="close"></div>
        <aside class="av-drawer" role="dialog" aria-modal="true" aria-label="Asesora virtual de ${esc(t.nombre)}">
          <header class="av-head"><span class="av-face">${t.avatar}</span><div><b>${esc(t.asesora)}<span class="av-badge">✦ IA</span></b><small><i></i> Vendedora virtual · responde al instante</small></div><button class="av-x" data-act="close" aria-label="Cerrar">✕</button></header>
          <nav class="av-tabs"><button class="on" data-act="tab" data-arg="guia">Te ayudo a elegir</button><button data-act="tab" data-arg="chat">Preguntas</button></nav>
          <div class="av-body" id="avBody"></div>
          <div class="av-chat hidden" id="avChat"><div class="av-msgs" id="avMsgs" aria-live="polite"></div><div class="av-sugs" id="avSugs"></div>
            <form class="av-input" id="avForm"><input id="avIn" maxlength="300" autocomplete="off" placeholder="Escribí tu pregunta…" aria-label="Tu pregunta"><button type="submit" aria-label="Enviar">➤</button></form></div>
          <p class="av-foot">🔒 No pedimos nombre, teléfono ni mail. Tus datos de talle quedan en tu dispositivo.</p>
        </aside>
      </div>`);
    root = $id("avRoot");
    $id("avFab").addEventListener("click", () => open());
    addEventListener("keydown", (e) => { if (e.key === "Escape" && root.classList.contains("show")) close(); });
    const actions = {
      close, tab, chip, ask: (a) => ask(a),
      start: () => { tab("guia"); ans = {}; qi = 0; vPregunta(); },
      soloTalle: () => { tab("guia"); vPerfil(false); },
      home: vInicio, todos: () => (perfil ? vTodosLosTalles() : vPerfil(false)),
      verTalle: (id) => { tab("guia"); if (perfil) vTalle(id); else { pending = id; vPerfil(false); } },
      restart: () => { ans = {}; qi = 0; vInicio(); },
      borrarPerfil: () => { perfil = null; store.del("av_perfil"); document.dispatchEvent(new CustomEvent("av:perfil")); toast("Listo, borré tu perfil de talle"); vInicio(); },
      back: (a) => (a === "q" ? (qi > 0 ? (qi--, vPregunta()) : vInicio()) : a === "perfilQuiz" ? vPregunta() : vInicio()),
      pick: (arg, el, e) => {
        const [k, v] = arg.split(":"); ans[k] = v; el.classList.add("sel"); sparkle(e.clientX, e.clientY, 4);
        setTimeout(() => { if (qi < preguntas().length - 1) { qi++; vPregunta(); } else vPerfil(true); }, 170);
      },
      cart: (id, el, e) => {
        const p = CAT.productos.find((x) => x.id === id), z = perfil ? talle(p, perfil) : null;
        sparkle(e.clientX, e.clientY, 8, ["🛍️", "✨"]);
        document.dispatchEvent(new CustomEvent("av:cart", { detail: { id, talle: z ? z.t : "" } }));
        toast(`Agregado: ${p.n}${z ? " · talle " + z.t : ""}`);
      },
    };
    bindActions(root, actions);
    chatInit();
  }

  return { mount, open, close, talle: (id) => { const p = CAT.productos.find((x) => x.id === id); return perfil && p ? talle(p, perfil).t : null; } };
})();
