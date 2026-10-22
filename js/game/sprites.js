/* Tunas & Hutan Lestari — sprites.js. SVG sheets and PNG cutouts → cached canvases at the stage resolution, plus the cut-paper scenery
   (sky bands, forest silhouettes, light strips, fog, hill): every scenery canvas is drawn once per size, never per frame. */
import { loadImage, clamp } from '../util.js';
import { CUT, CUT_H, CUT_CLIP } from './cut.js';

export const DPR = Math.min(2, window.devicePixelRatio || 1);
export let SS = 2;                         // raster supersample (logical px → canvas px), fixed at boot
export const CELL = 60;                    // one sheet cell in logical px (SVG cells are 120)
export const SPR = { BRANCH: 0, MOVING: 1, FRAGILE: 2, TEMP: 3, SPRING: 4, SEED: 5, CLUSTER: 6, WASP: 7, WASP2: 8, BEETLE: 9, BEETLE2: 10, FLY: 11, FLY2: 12 };
export const CIL = { idle: 0, jump: 1, fall: 2, stun: 3 };
export const TREE_INDEX = { mangga: 0, rambutan: 1, jambu: 2, kelapa: 3, beringin: 4, mahoni: 5, cemara: 6, trembesi: 7 };
export const sheets = { sprites: null, trees: null, stall: null, foliage: null, cil: [], cut: {} };
export const PAL = { paper: '#F7F3EA', paper2: '#FFFDF7', ink: '#1F2A22', olive: '#A6A43A', olive2: '#D8D68A', leaf: '#3E7D4B', leaf2: '#7FB069', leaf3: '#CFE3C3', pine: '#0F4C46', pine2: '#176B62', dark: '#0B3D38', mid: '#2E8C84', mist: '#6FB3A8', terra: '#D4674A', terra2: '#F2C4B4', sun: '#F2C14E', sky: '#CFE8E6', tan: '#D4A061', tanD: '#A8702F' };

const raster = (img, w, h) => { const c = document.createElement('canvas'); c.width = Math.ceil(w * SS); c.height = Math.ceil(h * SS); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c; };
/* a cutout sized by height (the lowest `clip` fraction dropped), with its own paper drop shadow baked in (ink silhouette offset 2,3) */
function rasterCut(img, h, clip = 0) {
  const iw = img.naturalWidth, ih = img.naturalHeight * (1 - clip), w = h * iw / ih, pad = 4;
  const c = document.createElement('canvas'); c.width = Math.ceil((w + pad) * SS); c.height = Math.ceil((h + pad) * SS);
  const g = c.getContext('2d'); g.scale(SS, SS);
  const sil = document.createElement('canvas'); sil.width = c.width; sil.height = c.height;
  const sg = sil.getContext('2d'); sg.scale(SS, SS); sg.drawImage(img, 0, 0, iw, ih, 0, 0, w, h); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = PAL.ink; sg.fillRect(0, 0, w + pad, h + pad);
  g.globalAlpha = 0.22; g.drawImage(sil, 2 * SS, 3 * SS, c.width, c.height, 2, 3, w + pad, h + pad); g.globalAlpha = 1;
  g.drawImage(img, 0, 0, iw, ih, 0, 0, w, h);
  c.lw = w + pad; c.lh = h + pad; c.cw = w; c.ch = h;   // logical sizes (lw/lh include the shadow pad)
  return c;
}
/* the stun state: the same cutout flushed pale terracotta (a tint, no second pose needed) */
function tintCut(c) {
  const t = document.createElement('canvas'); t.width = c.width; t.height = c.height; const g = t.getContext('2d');
  g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.6; g.fillStyle = PAL.terra2; g.fillRect(0, 0, t.width, t.height);
  t.lw = c.lw; t.lh = c.lh; t.cw = c.cw; t.ch = c.ch; return t;
}

/* load every sheet and cutout; sizes are the logical pixel sizes the game draws them at */
export async function loadAll(scale, onProgress) {
  SS = clamp(scale * DPR, 1.5, 3);
  const jobs = [
    ['sprites', 'assets/illus/game-sprites.svg', 13 * CELL, CELL],
    ['trees', 'assets/illus/game-trees.svg', 8 * 72, 96],
    ['stall', 'assets/illus/game-stall.svg', 256, 160],
    ['foliage', 'assets/illus/game-foliage.svg', 320, 1200],
    ['idle', 'assets/illus/tunas-idle.svg', 64, 80], ['jump', 'assets/illus/tunas-jump.svg', 64, 80],
    ['fall', 'assets/illus/tunas-fall.svg', 64, 80], ['stun', 'assets/illus/tunas-stun.svg', 64, 80]
  ];
  const cuts = [];
  for (const key in CUT) { const v = CUT[key]; (Array.isArray(v) ? v : [v]).forEach((src, i) => { if (src) cuts.push([key, i, src]); }); }
  let done = 0; const total = jobs.length + cuts.length;
  await Promise.all([
    ...jobs.map(async ([key, src, w, h]) => {
      let c = null;
      try { c = raster(await loadImage(src), w, h); } catch { /* a missing sheet draws nothing rather than blocking play */ }
      if (key in CIL) sheets.cil[CIL[key]] = c; else sheets[key] = c;
      onProgress && onProgress(++done / total);
    }),
    ...cuts.map(async ([key, i, src]) => {
      try { const c = rasterCut(await loadImage(src), CUT_H[key] || 40, CUT_CLIP[key] || 0); (sheets.cut[key] = sheets.cut[key] || [])[i] = c; if (key === 'player' && i === 0) sheets.cutStun = tintCut(c); } catch { /* fallback: the SVG sheet */ }
      onProgress && onProgress(++done / total);
    })
  ]);
}
export const cutImg = (key, i = 0) => (sheets.cut[key] && sheets.cut[key][i]) || null;
export const cutStun = () => sheets.cutStun || null;
/* draw a cutout: anchor 'feet' (bottom-centre) or centre; flip mirrors around the anchor; sx/sy squash-stretch */
export function drawCut(ctx, c, x, y, flip = 0, rot = 0, sx = 1, sy = 1, anchor = 'c') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sx * (flip ? -1 : 1), sy);
  ctx.drawImage(c, -c.cw / 2, anchor === 'feet' ? -c.ch : anchor === 'top' ? 0 : -c.ch / 2, c.lw, c.lh); ctx.restore();
}

/* draw cell i of a sheet (cells are CELL×CELL logical, drawn at w×h with its top-left at x,y) */
export function cell(ctx, i, x, y, w, h, flip = 0) {
  const s = sheets.sprites; if (!s) return;
  const px = CELL * SS;
  if (flip) { ctx.save(); ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(s, i * px, 0, px, px, 0, 0, w, h); ctx.restore(); }
  else ctx.drawImage(s, i * px, 0, px, px, x, y, w, h);
}
export function tree(ctx, id, x, y, w, h) { const s = sheets.trees, i = TREE_INDEX[id] || 0; if (s) ctx.drawImage(s, i * 72 * SS, 0, 72 * SS, 96 * SS, x, y, w, h); }

/* ---- cut-paper scenery (drawn once per size) ---- */
function noiseRng(seed) { let a = seed; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }
function paperCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w * SS); c.height = Math.ceil(h * SS); const g = c.getContext('2d'); g.scale(SS, SS); return [c, g]; }
let grainPat = null;
/* paper grain: a device-pixel speckle pattern, laid over a finished canvas at low alpha */
function grain(g, c, alpha = 0.16) {
  if (!grainPat) {
    const p = document.createElement('canvas'); p.width = p.height = 128; const pg = p.getContext('2d'), r = noiseRng(99);
    for (let i = 0; i < 2600; i++) { pg.fillStyle = i & 1 ? PAL.paper2 : PAL.ink; pg.globalAlpha = 0.35 + r() * 0.5; pg.fillRect(r() * 128, r() * 128, 1, 1); }
    grainPat = pg.createPattern(p, 'repeat');
  }
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = alpha; g.fillStyle = grainPat; g.fillRect(0, 0, c.width, c.height); g.restore();
}
/* a torn horizontal edge from (x0,y) to (x1,y): the path continues from the current point */
function tornTo(g, x0, x1, y, rnd, amp, step = 14) { const n = Math.max(2, Math.round(Math.abs(x1 - x0) / step)); for (let i = 1; i <= n; i++) g.lineTo(x0 + (x1 - x0) * i / n, y + (i === n ? 0 : (rnd() - 0.5) * amp * 2)); }
/* a torn strip: top edge at yTop(x), bottom edge at yBot(x) */
function strip(g, w, yTop, yBot, rnd, amp, col, alpha = 1, shadow = 0.14) {
  const path = () => { g.beginPath(); g.moveTo(-6, yTop(-6)); for (let x = 0; x <= w + 6; x += 14) g.lineTo(x, yTop(x) + (rnd() - 0.5) * amp); g.lineTo(w + 6, yBot(w + 6)); for (let x = w; x >= -6; x -= 14) g.lineTo(x, yBot(x) + (rnd() - 0.5) * amp); g.closePath(); };
  if (shadow) { g.save(); g.translate(0, 4); g.globalAlpha = shadow; g.fillStyle = PAL.ink; path(); g.fill(); g.restore(); }
  g.globalAlpha = alpha; g.fillStyle = col; path(); g.fill(); g.globalAlpha = 1;
}
/* a canopy lump: a bumpy paper blob built from arcs (cheap to fill, torn-looking edge) */
function lump(g, x, y, r, rnd, n = 9) {
  g.beginPath();
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, rr = r * (0.78 + rnd() * 0.3); g.moveTo(x + Math.cos(a) * rr * 0.6 + rr * 0.55, y + Math.sin(a) * rr * 0.5); g.arc(x + Math.cos(a) * rr * 0.6, y + Math.sin(a) * rr * 0.5, rr * 0.55, 0, 7); }
}
function paperShape(g, draw, col, alpha, dx = 0, dy = 5, sh = 0.18) {
  g.save(); g.translate(dx, dy); g.globalAlpha = sh * alpha; g.fillStyle = PAL.ink; draw(); g.fill(); g.restore();
  g.globalAlpha = alpha; g.fillStyle = col; draw(); g.fill(); g.globalAlpha = 1;
}

/* sky: five torn paper bands, pine at the top to sky at the bottom (the only "gradient" in the game is this stack) */
export function makeSky(w, h) {
  const [c, g] = paperCanvas(w, h), rnd = noiseRng(5), cols = [PAL.pine, PAL.pine2, PAL.mid, PAL.mist, PAL.sky];
  g.fillStyle = PAL.pine; g.fillRect(0, 0, w, h);
  cols.forEach((col, i) => { if (!i) return; const y = h * (0.1 + (i - 1) * 0.22); strip(g, w, (x) => y + Math.sin(x * 0.02 + i) * 6, () => h + 10, rnd, 5, col, 1, 0.12); });
  grain(g, c, 0.14);
  return c;
}

/* a vertically tileable forest layer: far = mist-lit canopies and trunks across the whole width, near = dark silhouettes hugging
   the playable column's edges (ox .. ox+cw). Every shape is drawn at y, y-h and y+h, so the tile repeats seamlessly. */
export function makeForest(kind, w, h, ox = 0, cw = w) {
  const [c, g] = paperCanvas(w, h), rnd = noiseRng(kind === 'far' ? 11 : 23);
  const items = [], k = Math.max(1, w / 360);   // keep the density of the 360-wide phone tile on wide screens
  if (kind === 'far') {
    for (let i = 0; i < Math.round(7 * k); i++) items.push({ x: rnd() * w, y: rnd() * h, r: 70 + rnd() * 60, col: i % 2 ? PAL.sky : PAL.mist, a: i % 2 ? 0.26 : 0.38, trunk: 10 + rnd() * 6, tl: 200 + rnd() * 240 });
    for (let i = 0; i < Math.round(6 * k); i++) items.push({ x: rnd() * w, y: rnd() * h, r: 46 + rnd() * 40, col: PAL.pine2, a: 0.5, trunk: 7 + rnd() * 5, tl: 160 + rnd() * 200 });
  } else {
    for (let i = 0; i < 12; i++) items.push({ x: i % 2 ? ox + cw + 10 - rnd() * 50 : ox - 10 + rnd() * 50, y: rnd() * h, r: 44 + rnd() * 44, col: i % 3 ? PAL.dark : PAL.pine, a: 0.96, trunk: 9 + rnd() * 6, tl: 140 + rnd() * 160 });
  }
  for (const it of items) {
    const draw = (oy) => {
      paperShape(g, () => { g.beginPath(); g.rect(it.x - it.trunk / 2, it.y + oy, it.trunk, it.tl); }, it.col, it.a, 0, 0, 0.12);
      paperShape(g, () => lump(g, it.x, it.y + oy, it.r, noiseRng(it.r * 100 | 0)), it.col, it.a, 0, 5, 0.16);
    };
    draw(-h); draw(0); draw(h);
  }
  grain(g, c, kind === 'far' ? 0.1 : 0.08);
  return c;
}

/* the foliage that frames the column on wide screens: an opaque dark wall from each viewport edge to just past the column edge
   (it hides the wrap seam), canopy lumps and paper leaves along that edge, and the game-foliage sheet laid over the side area
   (leaves toward the column). Tileable in y with period p; null when the sides are too thin to matter. */
export function makeEdges(w, ox, p) {
  if (ox < 24) return null;
  const [c, g] = paperCanvas(w, p), rnd = noiseRng(41), fol = sheets.foliage;
  const side = () => {
    const edge = ox + 10;
    g.fillStyle = PAL.dark; g.beginPath(); g.moveTo(-6, -6); g.lineTo(edge, -6);
    for (let y = 0; y <= p; y += 16) g.lineTo(edge + (y === 0 || y === p ? 0 : (rnd() - 0.5) * 10), y);
    g.lineTo(edge, p + 6); g.lineTo(-6, p + 6); g.closePath(); g.fill();
    if (fol) { const fw = ox + 8, fh = fw * 3.75; for (let y = -fh; y < p + fh; y += fh) g.drawImage(fol, 0, y, fw, fh); }
    const items = [];
    for (let i = 0; i < 9; i++) items.push({ x: ox - 6 - rnd() * 34, y: rnd() * p, r: 34 + rnd() * 30, col: i % 3 ? PAL.pine : PAL.dark, a: 0.98 });
    for (let i = 0; i < 5; i++) items.push({ x: ox - 46 - rnd() * 40, y: rnd() * p, r: 28 + rnd() * 24, col: PAL.pine2, a: 0.5 });
    for (const it of items) for (const oy of [-p, 0, p]) paperShape(g, () => lump(g, it.x, it.y + oy, it.r, noiseRng(it.r * 100 | 0)), it.col, it.a, 0, 5, 0.18);
    for (let i = 0; i < 16; i++) {
      const x = ox - 64 + rnd() * 88, y = rnd() * p, rx = 20 + rnd() * 16, ry = rx * 0.42, a = (rnd() - 0.5) * 1.6, col = i % 2 ? PAL.leaf : PAL.pine2;
      for (const oy of [-p, 0, p]) {
        g.save(); g.translate(x, y + oy); g.rotate(a); g.globalAlpha = 0.55; g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 7); g.fill();
        g.globalAlpha = 0.4; g.strokeStyle = PAL.leaf3; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-rx * 0.8, 0); g.lineTo(rx * 0.8, 0); g.stroke(); g.restore();
      }
    }
  };
  side();
  g.save(); g.translate(w, 0); g.scale(-1, 1); side(); g.restore();   // the right side is the mirror image
  grain(g, c, 0.08);
  return c;
}

/* light shafts: translucent paper strips, static, drawn once per view size */
export function makeShafts(w, h) {
  const [c, g] = paperCanvas(w, h);
  g.fillStyle = PAL.paper;
  for (let i = 0; i < 4; i++) { const x = w * (0.12 + i * 0.24), sw = 26 + (i % 2) * 22; g.globalAlpha = 0.06 + (i % 2) * 0.03; g.beginPath(); g.moveTo(x, -20); g.lineTo(x + sw, -20); g.lineTo(x + sw + 120 + i * 16, h + 20); g.lineTo(x + 120 + i * 16, h + 20); g.closePath(); g.fill(); }
  g.globalAlpha = 1;
  return c;
}
/* ground fog: two torn sky-coloured strips over the bottom of the view */
export function makeFog(w, h) {
  const [c, g] = paperCanvas(w, h), rnd = noiseRng(31);
  strip(g, w, (x) => h * 0.84 + Math.sin(x * 0.03) * 6, () => h + 10, rnd, 6, PAL.sky, 0.3, 0);
  strip(g, w, (x) => h * 0.92 + Math.sin(x * 0.04 + 2) * 5, () => h + 10, rnd, 5, PAL.sky, 0.35, 0);
  return c;
}

/* the home hill: three torn paper strips, a path and grain; trees and the stall are drawn by the caller on the slots below */
export const HILL_SLOTS = [[0.08, 0.735, 0.62], [0.2, 0.69, 0.56], [0.33, 0.66, 0.5], [0.46, 0.65, 0.48], [0.6, 0.66, 0.52], [0.74, 0.7, 0.58], [0.88, 0.75, 0.66], [0.97, 0.8, 0.72]];
export function hillTop(w, h, x) { const t = x / w; return h * (0.80 - 0.10 * Math.sin(t * Math.PI) - 0.04 * Math.sin(t * Math.PI * 2 + 1)); }
export function makeHill(w, h) {
  const [c, g] = paperCanvas(w, h), rnd = noiseRng(17), top = (x) => hillTop(w, h, x), bot = () => h + 10;
  strip(g, w, top, bot, rnd, 3, PAL.leaf, 1, 0.2);
  strip(g, w, (x) => top(x) + 16 + Math.sin(x * 0.05) * 3, bot, rnd, 4, PAL.leaf2, 1, 0.14);
  strip(g, w, (x) => top(x) + 72 + Math.sin(x * 0.03) * 6, bot, rnd, 4, PAL.leaf, 1, 0.14);
  g.strokeStyle = PAL.olive2; g.lineWidth = 10; g.globalAlpha = 0.55; g.lineCap = 'round'; g.beginPath(); g.moveTo(w * 0.52, h + 4); g.quadraticCurveTo(w * 0.48, top(w * 0.46) + 40, w * 0.34, top(w * 0.3) + 30); g.stroke(); g.globalAlpha = 1;
  grain(g, c, 0.12);
  return c;
}
export function drawStall(ctx, x, y, w) {
  const s = sheets.stall; if (!s) return; const h = w * (160 / 256);
  ctx.drawImage(s, x, y - h, w, h);
  // the sign board is 36..284 × 18..60 of the 320×200 SVG; the display face is a page font, so the text is drawn here
  ctx.save(); ctx.font = `800 ${w * 0.078}px 'Bricolage Grotesque', 'DM Sans', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = PAL.paper;
  ctx.letterSpacing = `${w * 0.01}px`; ctx.fillText('TOKO LESTARI', x + w * 0.5, y - h + h * 0.195); ctx.restore();
}
