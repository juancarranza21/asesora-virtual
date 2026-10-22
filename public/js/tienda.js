// Tienda de demostración: simula una tienda (tipo Tiendanube) con la asesora instalada.
"use strict";
(async function () {
  const id = new URLSearchParams(location.search).get("t") || "general";
  const CAT = await (await fetch(`/data/tienda-${encodeURIComponent(id)}.json`)).json();
  let demo = true;
  try { demo = !(await api("/api/estado")).ia; } catch {}

  const t = CAT.tienda, css = document.documentElement.style;
  for (const [k, v] of Object.entries(t.tema)) css.setProperty("--" + k, v);
  document.title = `${t.nombre} · Tienda demo`;
  $id("brand").textContent = t.nombre;
  $id("lema").textContent = t.lema;
  $id("asesoraN").textContent = t.asesora;
  $id("footN").textContent = t.nombre;
  $id("footC").textContent = t.cuotas;

  const CATS = [["todo", "Todo"], ["arriba", "Arriba"], ["abajo", "Abajo"], ["vestido", "Vestidos"], ["abrigo", "Abrigos"]].filter(([v]) => v === "todo" || CAT.productos.some((p) => p.cat === v));
  let filtro = "todo";
  const colorSel = {}; // color elegido por prenda
  const swatches = (p) => `<div class="sw" role="radiogroup" aria-label="Colores de ${esc(p.n)}">${p.colores.map((c, i) => `<button role="radio" aria-checked="${i === (colorSel[p.id] || 0)}" class="${i === (colorSel[p.id] || 0) ? "on" : ""}" style="--c:${Prenda.hex(c)}" data-act="color" data-arg="${esc(p.id)}:${i}" title="${esc(c)}" aria-label="${esc(c)}"></button>`).join("")}</div>`;
  const para = (p) => (p.para.length > 1 ? "Unisex" : p.para[0] === "mujer" ? "Mujer" : "Hombre");

  function render() {
    $id("filters").innerHTML = CATS.map(([v, l]) => `<button role="tab" aria-selected="${v === filtro}" class="${v === filtro ? "on" : ""}" data-act="filtro" data-arg="${v}">${l}</button>`).join("");
    $id("grid").innerHTML = CAT.productos.filter((p) => filtro === "todo" || p.cat === filtro).map((p, i) => {
      const z = Asesora.talle(p.id);
      return `<article class="pcard" style="animation-delay:${i * 0.04}s">
        <div class="pimg" id="img-${esc(p.id)}">${Prenda.svg(p, colorSel[p.id] || 0)}<em>${para(p)}</em></div>
        <h3>${esc(p.n)}</h3>${swatches(p)}
        <p class="pp">${money(p.p)} <small>${t.cuotas} cuotas de ${money(Math.round(p.p / t.cuotas))}</small></p>
        <div class="pact">
          <button class="psize${z ? " has" : ""}" data-act="talle" data-arg="${esc(p.id)}">${z ? `📏 Tu talle: <b>${esc(z)}</b>` : "📏 ¿Qué talle soy?"}</button>
          <button class="padd" data-act="add" data-arg="${esc(p.id)}" aria-label="Agregar ${esc(p.n)} al carrito">＋</button>
        </div>
      </article>`;
    }).join("");
  }

  let n = 0;
  document.addEventListener("av:cart", (e) => {
    const p = CAT.productos.find((x) => x.id === e.detail.id);
    logEvt("carrito", { producto: e.detail.id, talle: e.detail.talle, precio: p ? p.p : 0 }); $id("cartN").textContent = ++n; $id("cartBtn").animate([{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }], { duration: 350 }); });
  document.addEventListener("av:perfil", render);

  bindActions(document.querySelector("main"), {
    filtro: (v) => { filtro = v; render(); },
    color: (arg, el) => {
      const [pid, i] = arg.split(":"), p = CAT.productos.find((x) => x.id === pid);
      colorSel[pid] = +i;
      const img = $id("img-" + pid); img.querySelector("svg").outerHTML = Prenda.svg(p, +i);
      el.parentNode.querySelectorAll("button").forEach((b) => { const on = b === el; b.classList.toggle("on", on); b.setAttribute("aria-checked", on); });
    },
    talle: (pid) => Asesora.open({ producto: pid }),
    add: (pid, el, e) => {
      const p = CAT.productos.find((x) => x.id === pid), z = Asesora.talle(pid);
      if (!z) { toast("Antes elegí tu talle 😉"); return Asesora.open({ producto: pid }); }
      sparkle(e.clientX, e.clientY, 6, ["🛍️", "✨"]);
      document.dispatchEvent(new CustomEvent("av:cart", { detail: { id: pid, talle: z } }));
      toast(`Agregado: ${p.n} · ${p.colores[colorSel[pid] || 0]} · talle ${z}`);
    },
  });
  $id("heroAsk").addEventListener("click", () => Asesora.open());
  // Arte del encabezado con las mismas ilustraciones del catálogo
  const art = document.querySelectorAll(".hero-art span");
  ["sweater-trenzas", "jean-mom", "remera-oversize"].forEach((pid, i) => { const p = CAT.productos.find((x) => x.id === pid); if (p && art[i]) art[i].innerHTML = Prenda.svg(p, i === 2 ? 3 : 0); });
  $id("cartBtn").addEventListener("click", () => toast(n ? `Tenés ${n} prenda${n > 1 ? "s" : ""} en el carrito (es una demo 😉)` : "Tu carrito está vacío"));

  Asesora.mount(CAT, { demo });
  render();
  // Como una vendedora que se acerca: el botón se presenta a los pocos segundos
  setTimeout(() => $id("avFab").classList.add("hello"), 2500);
})();
