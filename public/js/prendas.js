// Ilustraciones de prendas en SVG (estilo "ficha técnica" de catálogo). Sin fotos ni derechos de autor.
// Prenda.svg(producto, indiceDeColor) → <svg>…</svg>   ·   Prenda.hex("verde oliva") → "#7a7d4f"
"use strict";
const Prenda = (() => {
  const COLORES = {
    "blanco": "#f3f1ec", "negro": "#2a2724", "arena": "#d8c5a3", "verde oliva": "#7a7d4f", "gris melange": "#b4b2ad", "azul marino": "#2d3b57",
    "crudo": "#ebe2cf", "celeste": "#a8c4df", "camel": "#c19a6b", "gris": "#9a9893", "chocolate": "#5b3e2f", "verde salvia": "#9dad93",
    "beige": "#d6c3a3", "azul clásico": "#5a7ea6", "celeste nevado": "#a9bfd5", "gris topo": "#857b72", "azul oscuro": "#2f3e5b",
    "verde militar": "#5b6142", "terracota": "#b5654a", "verde esmeralda": "#1f6b52",
  };
  const hex = (n) => COLORES[n] || "#b9b2a8";
  function shade(h, amt) { // amt: -1 (negro) … +1 (blanco)
    const n = parseInt(h.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt));
    return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
  }
  const luz = (h) => { const n = parseInt(h.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };

  /* ---------- Siluetas (viewBox 0 0 200 250) ---------- */
  const corta = (o) => o
    ? { body: "M76 32 Q100 44 124 32 L168 46 L190 112 L162 120 L152 96 L154 212 Q100 218 46 212 L48 96 L38 120 L10 112 L32 46 Z", neck: "M76 32 Q100 56 124 32", seams: ["M48 96 Q44 70 32 46", "M152 96 Q156 70 168 46", "M50 204 Q100 210 150 204"] }
    : { body: "M74 34 Q100 46 126 34 L160 50 L178 92 L154 102 L146 84 L146 206 Q100 212 54 206 L54 84 L46 102 L22 92 L40 50 Z", neck: "M74 34 Q100 58 126 34", seams: ["M54 84 Q58 64 40 50", "M146 84 Q142 64 160 50", "M56 198 Q100 204 144 198"] };
  const larga = (w, hem = 210) => `M76 30 L124 30 L${100 + w + 10} 42 L${100 + w + 30} 192 L${100 + w + 8} 198 L${100 + w} 112 L${100 + w} ${hem} Q100 ${hem + 6} ${100 - w} ${hem} L${100 - w} 112 L${100 - w - 8} 198 L${100 - w - 30} 192 L${100 - w - 10} 42 Z`;
  const puños = (w) => [`M${100 - w - 29} 184 L${100 - w - 7} 190`, `M${100 + w + 7} 190 L${100 + w + 29} 184`];
  const pantalon = (wh, hip, hemO, hemI, top = 26, crotch = 110, hemY = 228) => ({
    body: `M${100 - wh} ${top} L${100 + wh} ${top} L${100 + wh + hip} 100 L${100 + hemO} ${hemY} L${100 + hemI} ${hemY} L100 ${crotch} L${100 - hemI} ${hemY} L${100 - hemO} ${hemY} L${100 - wh - hip} 100 Z`,
    det: [`M${100 - wh} ${top + 12} L${100 + wh} ${top + 12}`, `M100 ${top + 12} L100 ${top + 58}`, `M108 ${top + 12} L108 ${top + 50} Q108 ${top + 58} 100 ${top + 60}`],
    bolsillos: [`M${100 - wh + 3} ${top + 14} Q${100 - wh + 10} ${top + 34} ${100 - wh + 24} ${top + 14}`, `M${100 + wh - 3} ${top + 14} Q${100 + wh - 10} ${top + 34} ${100 + wh - 24} ${top + 14}`],
    presillas: [100 - wh + 6, 100 - 14, 100 + 14, 100 + wh - 6].map((x) => `M${x} ${top} L${x} ${top + 14}`),
  });
  const ondas = (x, y0, y1) => { let d = `M${x} ${y0}`; for (let y = y0; y < y1; y += 16) d += ` q7 8 0 16`; return d; };

  function forma(p) {
    switch (p.id) {
      case "remera-oversize": return { ...corta(true) };
      case "remera-basica": return { ...corta(false) };
      case "camisa-lino": return { body: larga(48), extra: [{ d: "M76 30 L100 54 L124 30 L119 22 L100 40 L81 22 Z", fill: 1 }], seams: ["M100 54 L100 212", "M112 74 L134 74 L134 98 L112 98 Z", ...puños(48)], dots: [70, 96, 122, 148, 174, 200].map((y) => [100, y]) };
      case "sweater-trenzas": return { body: larga(54), neck: "M78 32 Q100 50 122 32", seams: [ondas(80, 60, 190), ondas(100, 54, 190), ondas(120, 60, 190), "M46 196 Q100 204 154 196", ...puños(54)] };
      case "hoodie-frisa": return { back: "M70 34 Q66 4 100 2 Q134 4 130 34 Z", body: larga(54), neck: "M80 32 Q100 54 120 32", seams: ["M72 148 L128 148 L138 194 L62 194 Z", "M92 44 L90 86", "M108 44 L110 86", "M46 200 Q100 208 154 200", ...puños(54)] };
      case "puffer-corta": return { body: larga(56, 182), extra: [{ d: "M72 20 L128 20 L128 36 Q100 42 72 36 Z", fill: 1 }], seams: ["M100 36 L100 184", ...[66, 96, 126, 156].map((y) => `M44 ${y} Q100 ${y + 8} 156 ${y}`), "M28 92 L42 90", "M158 90 L172 92", "M22 140 L44 136", "M156 136 L178 140"] };
      case "blazer": return { body: larga(50), extra: [{ d: "M84 30 L100 112 L116 30 Z", color: "#f2efe9" }], seams: ["M76 30 L64 62 L82 74 L100 118", "M124 30 L136 62 L118 74 L100 118", "M58 166 L84 166", "M116 166 L142 166", "M114 64 L132 64", ...puños(50)], dots: [[100, 138], [100, 162]] };
      case "top-corset": return { body: "M54 66 Q76 46 100 62 Q124 46 146 66 L138 128 Q130 150 142 184 L58 184 Q70 150 62 128 Z", seams: ["M72 58 Q74 120 70 184", "M86 58 Q88 120 86 184", "M114 58 Q112 120 114 184", "M128 58 Q126 120 130 184", "M100 62 L100 184"] };
      case "vestido-midi": return { body: "M78 56 Q100 66 122 56 L126 100 L158 230 Q100 240 42 230 L74 100 Z", seams: ["M80 18 L82 58", "M120 18 L118 58", "M74 100 Q100 106 126 100", "M92 112 L80 224", "M110 112 L122 224"] };
      case "jean-mom": { const s = pantalon(40, 8, 40, 9); return { body: s.body, seams: [...s.det, ...s.presillas], pespunte: [...s.bolsillos, "M100 40 L100 84"] }; }
      case "jean-slim": { const s = pantalon(38, 5, 31, 10, 34); return { body: s.body, seams: [...s.det, ...s.presillas], pespunte: [...s.bolsillos, "M100 48 L100 92"] }; }
      case "wide-leg": { const s = pantalon(36, 10, 66, 4); return { body: s.body, seams: [...s.det, ...s.bolsillos, "M70 112 L56 226", "M130 112 L144 226"] }; }
      case "chino": { const s = pantalon(38, 6, 38, 9, 30); return { body: s.body, seams: [...s.det, ...s.presillas, `M66 44 L74 70`, `M134 44 L126 70`] }; }
      case "cargo-parachute": { const s = pantalon(42, 10, 52, 6); return { body: s.body, seams: [...s.det, "M48 126 L72 126 L72 162 L50 162 Z", "M128 126 L152 126 L150 162 L128 162 Z", "M48 134 L72 134", "M128 134 L152 134", ...[52, 60, 68, 76, 84, 116, 124, 132, 140, 148].map((x) => `M${x} 222 L${x} 228`)] }; }
      default: return { ...corta(false) };
    }
  }

  let uid = 0;
  function svg(p, ci = 0) {
    const nombre = (p.colores || [])[ci] || (p.colores || [])[0], c = hex(nombre), id = "pg" + ++uid;
    const oscuro = luz(c) < 0.28, linea = oscuro ? shade(c, 0.35) : shade(c, -0.32), f = forma(p);
    const path = (d, extra = "") => `<path d="${d}" ${extra}/>`;
    return `<svg viewBox="0 0 200 250" role="img" aria-label="${p.n}${nombre ? " color " + nombre : ""}" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient></defs>
      <ellipse cx="100" cy="240" rx="64" ry="6" fill="#000" opacity=".08"/>
      <g stroke="${linea}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
        ${f.back ? path(f.back, `fill="${shade(c, -0.12)}"`) : ""}
        ${path(f.body, `fill="${c}"`)}${path(f.body, `fill="url(#${id})" stroke="none"`)}
        ${(f.extra || []).map((e) => path(e.d, `fill="${e.color || shade(c, -0.06)}"`)).join("")}
        <g fill="none" opacity=".75">${f.neck ? path(f.neck) : ""}${(f.seams || []).map((d) => path(d)).join("")}</g>
        <g fill="none" stroke="#d9a441" stroke-dasharray="3 3" opacity=".9">${(f.pespunte || []).map((d) => path(d)).join("")}</g>
        ${(f.dots || []).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${shade(c, oscuro ? 0.5 : -0.4)}" stroke="none"/>`).join("")}
      </g></svg>`;
  }
  return { svg, hex };
})();
