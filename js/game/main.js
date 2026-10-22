/* Tunas & Hutan Lestari — main.js (E). Boot, screens, the fixed-step loop, Canvas 2D rendering, input, HUD, persistence, audio.
   Pure rules live in physics.js / level.js / store.js; this file only wires them to the stage. */
import { icon, param, reduced, clamp, loadImage } from '../util.js';
import * as P from './physics.js';
import { createLevel, fill } from './level.js';
import * as ST from './store.js';
import * as SP from './sprites.js';
import { CUT_FACE } from './cut.js';
import * as AU from './audio.js';
import * as UI from './ui.js';

const { M_PX, STEP, T, E, S } = P;
const W = 480;                                        // logical column width at every size; the world wraps here (the reference keeps its column fixed in world units too)
P.setStageW(W);
const FOREST_P = 1200, EDGE_P = 720;                  // tile periods (logical px) of the forest and edge-foliage layers
const RM = reduced();
const AUTOPLAY = param('autoplay') != null;           // dev flag: plays itself (REA captures); ?autoplay=fall also falls at 20 m and continues home
const AUTO_FALL = param('autoplay') === 'fall';
const SEED_PARAM = param('seed');                     // dev flag: deterministic level
const storage = (() => { try { return window.localStorage; } catch { return null; } })();
const $ = UI.$;

const stage = $('#stage'), canvas = $('#game'), ctx = canvas.getContext('2d', { alpha: false });
const layers = { far: null, near: null, edges: null, shafts: null, sky: null, fog: null, hill: null };
let LW = W, VIEW_H = 900, OX = 0, scale = 1;          // the logical viewport is LW × VIEW_H; the column starts at OX
let store = ST.load(storage);
/* the home-scene hero: the idle SVG rastered again at 80×100 logical (the 64×80 play raster would be upscaled 1.6× here, soft on flat vector) */
const HOME_W = 80, HOME_H = 100;
let homeHero = null;
function rasterHero(img) { if (!img) return null; const c = document.createElement('canvas'); c.width = Math.ceil(HOME_W * SP.SS); c.height = Math.ceil(HOME_H * SP.SS); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c; }

/* ---- run state (one object, mutated in place: no per-frame allocation) ---- */
const G = {
  mode: 'boot', paused: false, waiting: false, askName: false,
  L: null, p: null, camY: 0, time: 0, acc: 0, last: 0, ticks: 0,
  seeds: 0, m: 0, prevRecord: 0, armed: {}, magnetT: 0, shakeT: 0, stunT: 0, invT: 0, flashT: 0, lineT: 0, fallT: 0, homeT: 0, leafT: 0,
  keyL: false, keyR: false, touchDir: 0, autoDir: 0, seedValue: 1
};

/* ---- particles: a fixed pool with a ring cursor ---- */
const K = { DUST: 0, SPARK: 1, LINE: 2, LEAF: 3, CRACK: 4 };
const PARTS = Array.from({ length: 160 }, () => ({ alive: false, kind: 0, x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 1, s: 1, ph: 0 }));
let pcur = 0;
function spawn(kind, x, y, n) {
  for (let i = 0; i < n; i++) {
    const q = PARTS[pcur = (pcur + 1) % PARTS.length], a = Math.random() * 6.283, v = 0.4 + Math.random() * 0.6;
    q.alive = true; q.kind = kind; q.x = x; q.y = y; q.t = 0; q.ph = Math.random() * 6.283;
    if (kind === K.DUST) { q.vx = Math.cos(a) * 110 * v; q.vy = Math.abs(Math.sin(a)) * 80 * v; q.life = 0.45; q.s = 3 + Math.random() * 3; }
    else if (kind === K.SPARK) { q.vx = Math.cos(a) * 150 * v; q.vy = Math.sin(a) * 150 * v + 60; q.life = 0.5; q.s = 2 + Math.random() * 2.5; }
    else if (kind === K.LINE) { q.x = x + (Math.random() - 0.5) * 90; q.vx = 0; q.vy = -1100 - Math.random() * 500; q.life = 0.3; q.s = 20 + Math.random() * 30; }
    else if (kind === K.LEAF) { q.vx = (Math.random() - 0.5) * 24; q.vy = -(28 + Math.random() * 40); q.life = 7; q.s = 5 + Math.random() * 6; }
    else { q.vx = Math.cos(a) * 70 * v; q.vy = -30 - Math.random() * 90; q.life = 0.6; q.s = 3 + Math.random() * 4; }
  }
}
function stepParticles(dt) {
  for (let i = 0; i < PARTS.length; i++) {
    const q = PARTS[i]; if (!q.alive) continue;
    q.t += dt; if (q.t >= q.life) { q.alive = false; continue; }
    if (q.kind === K.LEAF) q.x += Math.sin(q.t * 1.7 + q.ph) * 30 * dt;
    else if (q.kind !== K.LINE) q.vy -= 520 * dt;
    q.x += q.vx * dt; q.y += q.vy * dt;
  }
}
const leafX = () => Math.random() * (W + 2 * OX) - OX;   // a leaf anywhere across the viewport, in column coordinates

/* ---- sizing: the canvas is the viewport. Portrait: the column is the full width (scale = w / W). Landscape: the column is 92 % of the
   height (52–69 % of the width at common sizes) and the forest fills the rest. Only the visible height changes between sizes, never the world.
   Backing store at SP.SS per logical px (fixed at boot, ≤ DPR 2). ---- */
let layerT = 0;
function resize(now = false) {
  const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;   // a collapsed stage: keep the old layers, try again on the next real resize
  scale = (w < h ? w : Math.min(w, 0.92 * h)) / W;
  LW = Math.ceil(w / scale); VIEW_H = Math.round(h / scale); OX = Math.round((LW - W) / 2);
  canvas.width = Math.round(LW * SP.SS); canvas.height = Math.round(VIEW_H * SP.SS);
  ctx.setTransform(SP.SS, 0, 0, SP.SS, 0, 0);
  const sx = OX + W * 0.86;                           // the record signpost stands on the hill right of the tupai (landscape only, see game.css)
  stage.style.setProperty('--sign-x', (sx * scale).toFixed(1) + 'px'); stage.style.setProperty('--sign-y', (SP.hillTop(LW, VIEW_H, sx) * scale).toFixed(1) + 'px');
  clearTimeout(layerT);
  if (now || !layers.sky) makeLayers(); else layerT = setTimeout(makeLayers, 120);   // a window drag resizes every frame; the scenery is rebuilt once it settles
}
function makeLayers() {
  layers.shafts = SP.makeShafts(LW, VIEW_H); layers.fog = SP.makeFog(LW, VIEW_H);
  layers.sky = SP.makeSky(LW, VIEW_H); layers.hill = SP.makeHill(LW, VIEW_H);
  layers.far = SP.makeForest('far', LW, FOREST_P); layers.near = SP.makeForest('near', LW, FOREST_P, OX, W);
  layers.edges = SP.makeEdges(LW, OX, EDGE_P);
}

/* ---- toasts wait while a dialog covers the stage ---- */
const toastQ = [];
const dialogOpen = () => !!document.querySelector('dialog[open]');
function say(text) { dialogOpen() ? toastQ.push(text) : UI.toast(text); }
function flushToasts() { let i = 0; while (toastQ.length) { const t = toastQ.shift(); setTimeout(() => UI.toast(t), i++ * 2800); } }

/* ---- audio: context after the first gesture, mute persisted ---- */
function gesture() { const first = !AU.ready(); AU.init(); if (first && AU.ready()) { AU.setMuted(store.muted); if (G.mode === 'play') AU.ambient(true); } }
// pointerdown is not an activating gesture for touch, so pointerup/click resume a context that was created suspended
['pointerdown', 'pointerup', 'keydown', 'click'].forEach((ev) => addEventListener(ev, gesture, { capture: true }));
function syncAudioBtns() {
  UI.home(store);
  const b = $('#btnAudio2'); b.setAttribute('aria-pressed', String(!store.muted));
  $('#btnAudio2Icon').innerHTML = icon(store.muted ? 'volume-off' : 'volume');
}
function toggleAudio() { store = ST.save(storage, { ...store, muted: !store.muted }); AU.init(); AU.setMuted(store.muted); AU.click(); syncAudioBtns(); }

/* ---- runs ---- */
function initRun() {
  G.seedValue = SEED_PARAM != null ? ((+SEED_PARAM >>> 0) || 1) : ((Date.now() ^ (Math.random() * 1e9)) >>> 0);
  G.L = createLevel(G.seedValue);
  G.L.platforms[0].w = W + 60;                       // the first branch is the garden floor: no way to miss it
  G.p = P.createPlayer(W / 2, 0);
  G.camY = -VIEW_H * 0.28; G.time = 0; G.acc = 0; G.ticks = 0; G.last = 0;
  G.seeds = 0; G.m = 0; G.magnetT = G.shakeT = G.stunT = G.invT = G.flashT = G.lineT = 0;
  G.armed = { ...store.bonuses };
  // shortcut: every armed bonus is spent when the run starts (not when it triggers); keep unused ones if players ask for it
  let s = store; for (const id in G.armed) s = ST.useBonus(s, id);
  store = ST.save(storage, s);
  for (let i = 0; i < PARTS.length; i++) PARTS[i].alive = false;
  UI.resetHud(); UI.hud(0, 0); updateUseBtn();
  G.waiting = !store.tutorialSeen && !AUTOPLAY; $('#tutorial').hidden = !G.waiting;
  G.mode = 'play'; G.paused = false;
  if (AU.ready()) AU.ambient(true);
}
function beginPlay() { if (!G.waiting) return; G.waiting = false; G.last = 0; $('#tutorial').hidden = true; store = ST.save(storage, { ...store, tutorialSeen: true }); }
function startRun() { AU.click(); UI.veil(() => { UI.screen('play'); resize(true); initRun(); }); }
function goHome() { UI.veil(() => { G.mode = 'home'; G.homeT = 0; $('#resultCard').classList.remove('is-in'); UI.home(store); UI.screen('home'); resize(true); for (let i = 0; i < PARTS.length; i++) PARTS[i].alive = false; }); }

function fatal() {
  const m = G.m, seeds = G.seeds, prev = store.record;
  G.mode = 'fall'; G.fallT = 0; G.keyL = G.keyR = false; G.touchDir = 0;
  AU.fall(); AU.ambient(false);
  const res = ST.finishRun(store, { m, seeds, hits: G.p.hits });
  store = ST.save(storage, res.state);
  G.prevRecord = prev; G.askName = res.qualifies;   // shortcut: the name field shows (prefilled) on every run that enters the top ten; ask once if it gets noisy
  UI.result(m, prev, seeds, res.qualifies, store.name);
  if (m === 0) { $('#resRecord').hidden = true; $('#resRecordOld').hidden = false; $('#resRecordOld').textContent = `Rekor kamu ${prev} m`; }
  UI.screen('fall');
  setTimeout(() => { $('#resultCard').classList.add('is-in'); $('#btnContinue').focus({ preventScroll: true }); }, RM ? 0 : 1500);
  res.newBadges.forEach((id, i) => setTimeout(() => { say('Lencana baru: ' + UI.badgeName(id)); AU.badge(); }, 2200 + i * 2800));
}
function respawn() {
  const pls = G.L.platforms; let best = null;
  for (let i = 0; i < pls.length; i++) { const pl = pls[i]; if (pl.alive && pl.chain && !pl.gone && pl.y <= G.camY + VIEW_H * 0.6 && (!best || pl.y > best.y)) best = pl; }
  if (best) { G.p.x = best.x; G.p.y = best.y + 1; } else G.p.y = G.camY + VIEW_H * 0.3;
  G.p.state = S.AIR; G.p.vy = P.JUMP_V; G.p.vx = 0; G.flashT = 0.5;
  spawn(K.SPARK, G.p.x, G.p.y + 30, 18);
}
function useArmed() {
  if (G.mode !== 'play' || G.waiting || G.paused) return;
  const p = G.p;
  // shortcut: with both armed, the first ↑ fires Roket Pot and the next one Magnet Benih; add a picker if that confuses players
  if (G.armed.roket && p.state !== S.ROCKET) { G.armed.roket = false; p.state = S.ROCKET; p.t = P.ROCKET_T; G.lineT = P.ROCKET_T + 0.3; AU.rocket(); }
  else if (G.armed.magnet) { G.armed.magnet = false; G.magnetT = P.MAGNET_T; AU.magnet(); }
  else return;
  updateUseBtn();
}
function updateUseBtn() {
  const b = $('#btnUse'), has = G.armed.roket || G.armed.magnet;
  b.hidden = !has;
  if (has) b.innerHTML = icon(G.armed.roket ? 'chevron-up' : 'sparkles') + (G.armed.roket ? 'Roket Pot' : 'Magnet Benih');
}
function compact(arr) { let k = 0; for (let i = 0; i < arr.length; i++) if (arr[i].alive) arr[k++] = arr[i]; arr.length = k; }

/* ---- one physics tick (120 Hz) ---- */
function tick(dt) {
  const p = G.p, L = G.L;
  G.time += dt; G.ticks++;
  fill(L, G.camY + VIEW_H + 600);
  const dir = AUTOPLAY ? G.autoDir : ((G.keyL ? -1 : 0) + (G.keyR ? 1 : 0)) || G.touchDir;
  P.stepPlayer(p, dir, dt);
  const lo = G.camY - 220, hi = G.camY + VIEW_H + 240, loP = G.camY - 720;   // branches live longer: a Parasut Daun glide needs them
  const pls = L.platforms;
  for (let i = 0; i < pls.length; i++) {
    const pl = pls[i]; if (!pl.alive) continue;
    if (pl.y < loP || pl.gone) { pl.alive = false; continue; }
    if (pl.y > hi) continue;
    if (pl.type === T.TEMP && !pl.seen && pl.y < G.camY + VIEW_H) pl.seen = true;
    P.stepPlatform(pl, dt, G.time);
  }
  const land = P.landing(p, pls, pls.length);
  if (land) {
    P.bounce(p, land);
    if (land.type === T.FRAGILE && !land.cracked) { land.cracked = true; land.t = 0.25; spawn(K.CRACK, land.x, land.y, 7); }
    land.type === T.SPRING ? AU.spring() : AU.bounce();
    spawn(K.DUST, p.x, p.y, land.type === T.SPRING ? 10 : 6);
  }
  const seeds = L.seeds;
  for (let i = 0; i < seeds.length; i++) {
    const s = seeds[i]; if (!s.alive) continue;
    if (s.y < lo) { s.alive = false; continue; }
    if (s.y > hi) continue;
    let dx = P.dxWrap(p.x, s.x), dy = p.y + 30 - s.y;
    if (G.magnetT > 0) { const d = Math.hypot(dx, dy); if (d < P.MAGNET_R) { const k = Math.min(1, (560 * dt) / Math.max(1, d)); s.x = P.wrapX(s.x + dx * k); s.y += dy * k; dx = P.dxWrap(p.x, s.x); dy = p.y + 30 - s.y; } }
    if (dx * dx + dy * dy < 34 * 34) { s.alive = false; G.seeds += s.v * (G.armed.ganda ? 2 : 1); s.v > 1 ? AU.cluster() : AU.seed(); spawn(K.SPARK, s.x, s.y, s.v > 1 ? 14 : 6); }
  }
  const ens = L.enemies;
  for (let i = 0; i < ens.length; i++) {
    const e = ens[i]; if (!e.alive) continue;
    if (e.y < lo || (e.rider && e.rider.gone)) { e.alive = false; continue; }
    if (e.y > hi) continue;
    P.stepEnemy(e, dt, G.time);
    if (p.state === S.AIR && G.invT <= 0 && P.touches(p, e.x, e.y, e.r)) { P.hit(p, e.x); AU.stun(); G.shakeT = 0.12; G.stunT = 0.9; G.invT = 1.3; }
  }
  if (G.magnetT > 0) G.magnetT -= dt;
  if (G.shakeT > 0) G.shakeT -= dt;
  if (G.stunT > 0) G.stunT -= dt;
  if (G.invT > 0) G.invT -= dt;
  if (G.flashT > 0) G.flashT -= dt;
  if (G.lineT > 0) { G.lineT -= dt; if (p.state === S.ROCKET && (G.ticks & 3) === 0) spawn(K.LINE, p.x, p.y - 10, 1); }
  stepParticles(dt);
  // camera: follows upward only, except while a Parasut Daun carries the tupai down
  if (p.state === S.PARA) G.camY += (p.y - VIEW_H * 0.42 - G.camY) * Math.min(1, dt * 6);
  else { const target = p.y - VIEW_H * 0.45; if (target > G.camY) G.camY += (target - G.camY) * Math.min(1, dt * 12); }
  if (p.maxY / M_PX > G.m) G.m = Math.floor(p.maxY / M_PX);
  if (p.y < G.camY - P.KILL_MARGIN && p.state !== S.PARA) {
    if (G.armed.parasut) { G.armed.parasut = false; p.state = S.PARA; p.t = P.PARA_T; p.vy = P.PARA_V; say('Parasut Daun terbuka'); }
    else if (G.armed.nyawa) { G.armed.nyawa = false; respawn(); say('Nyawa Ekstra terpakai'); }
    else fatal();
  }
  if ((G.ticks % 240) === 0) { compact(pls); compact(seeds); compact(ens); }
}

/* dev autopilot: steer to the next safe branch (rising) or back to the one below (falling). shortcut: it ignores insects, so captures show stuns */
function autopilot() {
  const p = G.p, pls = G.L.platforms, rising = p.vy > 0; let best = null;
  for (let i = 0; i < pls.length; i++) {
    const pl = pls[i]; if (!pl.alive || !pl.chain || pl.gone) continue;
    if (rising ? (pl.y > p.y + 4 && pl.y < p.y + P.JUMP_H && (!best || pl.y < best.y)) : (pl.y <= p.y + 2 && (!best || pl.y > best.y))) best = pl;
  }
  if (!best) { G.autoDir = 0; return; }
  const dx = P.dxWrap(best.x, p.x); G.autoDir = Math.abs(dx) < 6 ? 0 : dx > 0 ? 1 : -1;
  if (AUTO_FALL && G.m >= 20) G.autoDir = 1;   // keep drifting right past every branch: a scripted fall
}

/* ---- frame ---- */
function frame(now) {
  requestAnimationFrame(frame);
  if (!G.last) G.last = now;
  const dt = Math.min(0.1, (now - G.last) / 1000); G.last = now;
  if (G.mode === 'play') {
    if (!G.paused && !G.waiting) {
      G.acc += dt;
      while (G.acc >= STEP && G.mode === 'play') { tick(STEP); G.acc -= STEP; }
      if (AUTOPLAY && G.mode === 'play') autopilot();
    }
    UI.hud(G.m, G.seeds);
  } else if (G.mode === 'fall') {
    G.fallT += dt; G.camY = Math.max(G.camY - (RM ? 60 : 150) * dt, 0); stepParticles(dt);   // drifts down until the garden floor peeks in at the bottom edge, no further
    if (AUTO_FALL && G.fallT > 4.5 && G.fallT - dt <= 4.5) $('#btnContinue').click();
    G.leafT += dt; if (G.leafT > 0.35 && !RM) { G.leafT = 0; spawn(K.LEAF, leafX(), G.camY + VIEW_H + 20, 1); }
  } else if (G.mode === 'home') {
    G.homeT += dt; stepParticles(dt);
    G.leafT += dt; if (G.leafT > 1.4 && !RM) { G.leafT = 0; spawn(K.LEAF, leafX(), VIEW_H + 20, 1); }
  }
  render();
}

/* ---- rendering ---- */
const sy = (y) => VIEW_H - (y - G.camY);
function cellW(i, cx, top, s, flip = 0) {       // a sheet cell centred on cx, repeated across the wrap edge
  SP.cell(ctx, i, cx - s / 2, top, s, s, flip);
  if (cx < s / 2) SP.cell(ctx, i, cx + W - s / 2, top, s, s, flip);
  else if (cx > W - s / 2) SP.cell(ctx, i, cx - W - s / 2, top, s, s, flip);
}
function cutW(c, cx, cy, flip = 0, rot = 0, anchor = 'c') {   // a cutout centred on cx, repeated across the wrap edge
  for (let k = -1; k <= 1; k++) { const x = cx + k * W; if (x < -c.lw || x > W + c.lw) continue; SP.drawCut(ctx, c, x, cy, flip, rot, 1, 1, anchor); }
}
function drawLayer(tile, scroll, period) {      // a vertically tiled full-width layer
  if (!tile) return;
  const y0 = VIEW_H + scroll;                     // screen y of layer-y 0
  for (let top = ((y0 % period) + period) % period - period; top < VIEW_H; top += period) ctx.drawImage(tile, 0, top, LW, period);
}
/* world drawing happens in column coordinates; on wide screens the column is clipped so the wrap seam hides under the edge foliage */
function column(fn, clip = OX > 0) { ctx.save(); ctx.translate(OX, 0); if (clip) { ctx.beginPath(); ctx.rect(0, -8, W, VIEW_H + 16); ctx.clip(); } fn(); ctx.restore(); }
function drawScenery(cam) {
  drawLayer(layers.far, RM ? 0 : cam * 0.25, FOREST_P);
  ctx.drawImage(layers.shafts, 0, 0, LW, VIEW_H);
  drawLayer(layers.near, RM ? 0 : cam * 0.55, FOREST_P);
  ctx.drawImage(layers.fog, 0, 0, LW, VIEW_H);
}
function drawEdges(scroll) { if (layers.edges) drawLayer(layers.edges, RM ? 0 : scroll, EDGE_P); }
function drawParticles(cam) {
  for (let i = 0; i < PARTS.length; i++) {
    const q = PARTS[i]; if (!q.alive) continue;
    const a = 1 - q.t / q.life, x = q.x, y = VIEW_H - (q.y - cam);
    ctx.globalAlpha = a;
    if (q.kind === K.DUST) { ctx.fillStyle = SP.PAL.paper; ctx.beginPath(); ctx.arc(x, y, q.s, 0, 6.283); ctx.fill(); }
    else if (q.kind === K.SPARK) { ctx.fillStyle = SP.PAL.sun; ctx.beginPath(); ctx.arc(x, y, q.s, 0, 6.283); ctx.fill(); }
    else if (q.kind === K.LINE) { ctx.strokeStyle = SP.PAL.paper; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + q.s); ctx.stroke(); }
    else if (q.kind === K.LEAF) { ctx.fillStyle = (i & 1) ? SP.PAL.leaf2 : SP.PAL.olive2; ctx.save(); ctx.translate(x, y); ctx.rotate(q.t * 1.5 + q.ph); ctx.beginPath(); ctx.ellipse(0, 0, q.s, q.s * 0.45, 0, 0, 6.283); ctx.fill(); ctx.restore(); }
    else { ctx.fillStyle = SP.PAL.tanD; ctx.fillRect(x - q.s / 2, y - q.s / 2, q.s, q.s); }
  }
  ctx.globalAlpha = 1;
}
/* the hero: the Tunas SVG sheets (idle / jump / fall / stun); a cutout listed in cut.js would take over (stun = the tinted copy) */
function drawCil(idx, cx, feet, sx, syy, face, rot, pose = 0) {
  const cut = pose === 'stun' ? (SP.cutStun() || SP.cutImg('player')) : SP.cutImg('player');
  if (cut) { for (let k = -1; k <= 1; k++) { const x = cx + k * W; if (x < -cut.lw || x > W + cut.lw) continue; SP.drawCut(ctx, cut, x, feet, face * CUT_FACE < 0, rot, sx, syy, 'feet'); } return; }
  const img = SP.sheets.cil[idx]; if (!img) return;
  const Wd = 64, H = 80;                       // the sheet's raster size (1:1 on a 1× desktop); the figure fills 55–75 % of its box, so the body reads ≈ half a branch
  for (let k = -1; k <= 1; k++) {
    const x = cx + k * W; if (x < -Wd || x > W + Wd) continue;
    ctx.save(); ctx.translate(x, feet); ctx.rotate(rot); ctx.scale(sx * (face < 0 ? -1 : 1), syy); ctx.drawImage(img, -Wd / 2, -H, Wd, H); ctx.restore();
  }
}
function drawPlayer() {
  const p = G.p, feet = sy(p.y), sq = p.squash;
  let idx = SP.CIL.jump, sx = 1, syy = 1, rot = 0, pose = 0;
  if (p.state === S.STUN) { idx = SP.CIL.stun; rot = Math.sin(G.time * 18) * 0.22; }
  else if (p.state === S.PARA || p.vy < 0) idx = SP.CIL.fall;
  if (SP.cutImg('player')) {                   // transforms only: tilt into the move, lean back while rising, the tinted copy when stunned
    if (p.state !== S.STUN) rot = (p.vx / P.MOVE_V) * 0.16 - p.face * clamp(p.vy / P.JUMP_V, -1, 1) * 0.08;
    pose = p.state === S.STUN ? 'stun' : 0;
  }
  if (sq > 0) { sx = 1 + 0.26 * sq; syy = 1 - 0.3 * sq; }
  else if (p.state === S.AIR) { const st = Math.min(0.14, Math.abs(p.vy) / 9000); sx = 1 - st * 0.5; syy = 1 + st; }
  if (p.state === S.ROCKET) {                  // Roket Pot: a terracotta pot under his feet, leaves for flames
    ctx.fillStyle = SP.PAL.olive2; ctx.beginPath(); ctx.ellipse(p.x, feet + 30 + Math.sin(G.time * 40) * 3, 10, 16, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = SP.PAL.terra; ctx.strokeStyle = SP.PAL.ink; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(p.x - 16, feet); ctx.lineTo(p.x + 16, feet); ctx.lineTo(p.x + 12, feet + 22); ctx.lineTo(p.x - 12, feet + 22); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillRect(p.x - 18, feet - 5, 36, 6); ctx.strokeRect(p.x - 18, feet - 5, 36, 6);
  }
  if (G.magnetT > 0) { ctx.strokeStyle = SP.PAL.sun; ctx.lineWidth = 2; ctx.globalAlpha = 0.25 + 0.15 * Math.sin(G.time * 6); ctx.beginPath(); ctx.arc(p.x, feet - 30, P.MAGNET_R * 0.55, 0, 6.283); ctx.stroke(); ctx.globalAlpha = 1; }
  if (G.invT > 0 && ((G.ticks >> 3) & 1)) ctx.globalAlpha = 0.55;
  drawCil(idx, p.x, feet, sx, syy, p.face, rot, pose);
  ctx.globalAlpha = 1;
  if (p.state === S.PARA) {                    // Parasut Daun: a big leaf canopy with two strings
    const top = feet - 70 - 26;
    ctx.strokeStyle = SP.PAL.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(p.x - 14, feet - 52); ctx.lineTo(p.x - 30, top + 8); ctx.moveTo(p.x + 14, feet - 52); ctx.lineTo(p.x + 30, top + 8); ctx.stroke();
    ctx.fillStyle = SP.PAL.leaf; ctx.beginPath(); ctx.moveTo(p.x - 44, top + 10); ctx.quadraticCurveTo(p.x, top - 34, p.x + 44, top + 10); ctx.quadraticCurveTo(p.x, top + 22, p.x - 44, top + 10); ctx.fill();
    ctx.fillStyle = SP.PAL.leaf2; ctx.beginPath(); ctx.moveTo(p.x - 44, top + 10); ctx.quadraticCurveTo(p.x - 10, top - 20, p.x + 20, top - 4); ctx.quadraticCurveTo(p.x - 10, top + 8, p.x - 44, top + 10); ctx.fill();
    ctx.strokeStyle = SP.PAL.leaf3; ctx.beginPath(); ctx.moveTo(p.x - 40, top + 10); ctx.quadraticCurveTo(p.x, top - 8, p.x + 40, top + 10); ctx.stroke();
  }
  if (G.stunT > 0) {
    ctx.save(); ctx.font = "800 20px 'Bricolage Grotesque', 'DM Sans', sans-serif"; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    ctx.globalAlpha = Math.min(1, G.stunT * 3); ctx.lineWidth = 4; ctx.strokeStyle = SP.PAL.ink; ctx.fillStyle = SP.PAL.paper;
    const y = feet - 84 - (0.9 - G.stunT) * 22; ctx.strokeText('Aduh!', p.x, y); ctx.fillText('Aduh!', p.x, y); ctx.restore();
  }
}
/* platforms, seeds and insects, in column coordinates (call inside column()) */
function drawWorld() {
  const L = G.L, gy = sy(0);
  if (gy < VIEW_H + 20) {                      // the garden floor under the first branch: a low mound with a lighter crest
    ctx.fillStyle = SP.PAL.leaf; ctx.beginPath(); ctx.moveTo(-4, VIEW_H + 8); ctx.lineTo(-4, gy + 14);
    for (let x = 0; x <= W; x += 12) ctx.lineTo(x, gy + 10 - Math.sin((x / W) * Math.PI) * 12 + Math.sin(x * 0.11) * 2);
    ctx.lineTo(W + 4, gy + 14); ctx.lineTo(W + 4, VIEW_H + 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = SP.PAL.leaf2; ctx.beginPath(); ctx.moveTo(-4, gy + 30); for (let x = 0; x <= W; x += 12) ctx.lineTo(x, gy + 24 - Math.sin((x / W) * Math.PI) * 12 + Math.sin(x * 0.11 + 1) * 2); ctx.lineTo(W + 4, gy + 30); ctx.lineTo(W + 4, gy + 44); ctx.lineTo(-4, gy + 44); ctx.closePath(); ctx.fill();
    SP.cell(ctx, SP.SPR.BRANCH, W / 2 - 80, gy - 56, 160, 160);
  }
  const pls = L.platforms, cutSpring = SP.cutImg('spring'), cutSeed = SP.cutImg('seed'), cutCluster = SP.cutImg('cluster'), cutWasp = SP.cutImg('wasp'), cutBeetle = SP.cutImg('beetle'), cutFly = SP.cutImg('fly');
  for (let i = 1; i < pls.length; i++) {
    const pl = pls[i]; if (!pl.alive) continue;
    const y = sy(pl.y); if (y < -90 || y > VIEW_H + 90) continue;
    const spring = pl.type === T.SPRING, s = spring ? pl.w / 0.77 : pl.w, top = y - s * (spring ? 0.283 : 0.35) + pl.fallY;
    if (pl.type === T.TEMP) ctx.globalAlpha = pl.alpha;
    if (spring && cutSpring) cutW(cutSpring, pl.x, y, 0, 0, 'top'); else cellW(pl.type, pl.x, top, s);
    ctx.globalAlpha = 1;
  }
  const seeds = L.seeds;
  for (let i = 0; i < seeds.length; i++) {
    const s = seeds[i]; if (!s.alive) continue;
    const y = sy(s.y) + Math.sin(G.time * 3 + s.ph) * 3; if (y < -40 || y > VIEW_H + 40) continue;
    const c = s.v > 1 ? cutCluster : cutSeed;
    if (c) cutW(c, s.x, y, 0, Math.sin(G.time * 2 + s.ph) * 0.12);
    else { const z = s.v > 1 ? 46 : 28; cellW(s.v > 1 ? SP.SPR.CLUSTER : SP.SPR.SEED, s.x, y - z * 0.53, z); }
  }
  const ens = L.enemies, f2 = Math.floor(G.time * 16) & 1;
  for (let i = 0; i < ens.length; i++) {
    const e = ens[i]; if (!e.alive) continue;
    const y = sy(e.y); if (y < -50 || y > VIEW_H + 50) continue;
    if (e.type === E.WASP) { if (cutWasp) cutW(cutWasp, e.x, y, e.face * CUT_FACE < 0, f2 ? 0.06 : -0.06); else cellW(f2 ? SP.SPR.WASP2 : SP.SPR.WASP, e.x, y - 50 * 0.55, 50, e.face > 0); }
    else if (e.type === E.BEETLE) { if (cutBeetle) cutW(cutBeetle, e.x, y + 18, 0, Math.sin(G.time * 6) * 0.05, 'feet'); else cellW((Math.floor(G.time * 4) & 1) ? SP.SPR.BEETLE2 : SP.SPR.BEETLE, e.x, y + 18 - 44 * 0.83, 44, 0); }   // feet on the branch
    else { if (cutFly) cutW(cutFly, e.x, y, (e.x0 > W / 2) === (CUT_FACE > 0), f2 ? 0.1 : -0.1); else cellW(f2 ? SP.SPR.FLY2 : SP.SPR.FLY, e.x, y - 34 * 0.53, 34, e.x0 > W / 2); }
  }
}
function renderPlay() {
  const cam = G.camY;
  drawScenery(cam);
  column(() => { drawWorld(); drawPlayer(); });
  column(() => drawParticles(cam), false);
  drawEdges(cam * 0.7);
  if (G.flashT > 0) { ctx.globalAlpha = G.flashT; ctx.fillStyle = SP.PAL.paper; ctx.fillRect(0, 0, LW, VIEW_H); ctx.globalAlpha = 1; }
}
function renderFall() {                        // the tumbling tupai is a DOM image (it stays sharp while the canvas goes soft)
  const cam = G.camY;
  drawScenery(cam);
  column(drawWorld);
  column(() => drawParticles(cam), false);
  drawEdges(cam * 0.7);
}
function renderHome() {                        // the clearing: the stall left of centre, the tupai waving at it, the beetle on patrol
  const w = LW, h = VIEW_H, t = G.homeT, top = (x) => SP.hillTop(w, h, OX + x);
  drawLayer(layers.far, RM ? 0 : Math.sin(t * 0.25) * 8, FOREST_P);
  ctx.drawImage(layers.shafts, 0, 0, w, h);
  drawLayer(layers.near, RM ? 0 : Math.sin(t * 0.25 + 1) * 12, FOREST_P);
  ctx.drawImage(layers.hill, 0, 0, w, h);
  column(() => {
    for (let i = 0; i < store.trees.length && i < SP.HILL_SLOTS.length; i++) {
      const tr = store.trees[i], [fx, , sc] = SP.HILL_SLOTS[i], tw = 72 * sc, th = 96 * sc, x = W * fx;
      ctx.globalAlpha = tr.withered ? 0.4 : 1; SP.tree(ctx, tr.id, x - tw / 2, top(x) + 4 - th, tw, th); ctx.globalAlpha = 1;
    }
    const sx = W * 0.3; SP.drawStall(ctx, sx - 100, top(sx) + 4, 200);
    [0.08, 0.5, 0.95].forEach((f) => { const x = W * f; cellW(SP.SPR.SEED, x, top(x) + 2 - 16, 22); });
    const bx = ((t * 26) % (W + 80)) - 40;      // the beetle walks the hill, left to right, forever
    const cb = SP.cutImg('beetle');
    if (cb) cutW(cb, bx, top(bx) + 6, 0, Math.sin(t * 8) * 0.05, 'feet'); else cellW((Math.floor(t * 5) & 1) ? SP.SPR.BEETLE2 : SP.SPR.BEETLE, bx, top(bx) + 6 - 40 * 0.83, 40, 1);
    const cx = W * 0.62, feet = top(cx) + 8 + (RM ? 0 : Math.sin(t * 2.2) * 2), k = 1.35;   // k sizes a cutout only; the SVG hero is 80×100 (head at the awning, the stall stays the bigger shape)
    const wave = RM ? 0 : (t % 4.5 < 1.1 ? Math.sin(t * 14) * 0.06 : 0);
    const bird = SP.cutImg('player');
    if (bird) SP.drawCut(ctx, bird, cx, feet, CUT_FACE > 0, wave, k, k * (1 + (RM ? 0 : Math.sin(t * 2.2) * 0.02)), 'feet');   // faces the stall
    else { const img = homeHero || SP.sheets.cil[SP.CIL.idle]; if (img) { ctx.save(); ctx.translate(cx, feet); ctx.rotate(wave); ctx.scale(-1, 1); ctx.drawImage(img, -HOME_W / 2, -HOME_H, HOME_W, HOME_H); ctx.restore(); } }   // mirrored: the raised shovel hand faces the stall
  }, false);
  column(() => drawParticles(0), false);
  drawEdges(RM ? 0 : Math.sin(t * 0.25 + 2) * 10);
}
function render() {
  if (!layers.sky) { resize(true); if (!layers.sky) return; }   // nothing to draw with until the stage has a size
  ctx.setTransform(SP.SS, 0, 0, SP.SS, 0, 0);
  if (G.shakeT > 0 && !RM) ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
  ctx.fillStyle = SP.PAL.pine; ctx.fillRect(-4, -4, LW + 8, VIEW_H + 8); ctx.drawImage(layers.sky, 0, 0, LW, VIEW_H);
  if (G.mode === 'play') renderPlay();
  else if (G.mode === 'fall') renderFall();
  else renderHome();
}

/* ---- input ---- */
function onKey(e, down) {
  if (e.target.closest && e.target.closest('input, textarea, select')) return;
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') G.keyL = down;
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') G.keyR = down;
  else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ') { if (down && !e.repeat) useArmed(); }
  else if (k === 'Escape') { if (down && G.mode === 'play' && !G.waiting && !G.paused) { e.preventDefault(); pause(); } return; }
  else return;
  if (G.mode === 'play') { e.preventDefault(); if (down && G.waiting) beginPlay(); }
}
document.addEventListener('keydown', (e) => onKey(e, true));
document.addEventListener('keyup', (e) => onKey(e, false));
addEventListener('blur', () => { G.keyL = G.keyR = false; G.touchDir = 0; });
let pid = -1, downX = 0;
stage.addEventListener('pointerdown', (e) => {                 // touch zones: the left and right halves of the screen, or a drag
  if (G.mode !== 'play' || G.paused || e.target.closest('button, a, input')) return;
  pid = e.pointerId; downX = e.clientX;
  const r = stage.getBoundingClientRect(); G.touchDir = e.clientX < r.left + r.width / 2 ? -1 : 1;
  try { stage.setPointerCapture(pid); } catch { /* a synthetic pointer */ }
  if (G.waiting) beginPlay();
});
stage.addEventListener('pointermove', (e) => { if (e.pointerId !== pid) return; const dx = e.clientX - downX; if (Math.abs(dx) > 14) G.touchDir = dx < 0 ? -1 : 1; });
const pointerUp = (e) => { if (e.pointerId !== pid) return; pid = -1; G.touchDir = 0; };
stage.addEventListener('pointerup', pointerUp); stage.addEventListener('pointercancel', pointerUp);

/* ---- pause ---- */
function pause() { if (G.mode !== 'play' || G.waiting || G.paused) return; G.paused = true; G.keyL = G.keyR = false; G.touchDir = 0; AU.click(); UI.openDialog('#dlgPause'); }
$('#dlgPause').addEventListener('close', () => { G.paused = false; G.last = 0; });
$('#btnPause').addEventListener('click', pause);
$('#btnMenuPlay').addEventListener('click', pause);
$('#btnResume').addEventListener('click', () => { AU.click(); UI.closeDialog('#dlgPause'); });
document.addEventListener('visibilitychange', () => { if (document.hidden && !AUTOPLAY) pause(); });   // capture tabs go hidden between shots
const landscape = matchMedia('(hover: none) and (orientation: landscape) and (max-height: 540px)');
landscape.addEventListener('change', (e) => { if (e.matches) pause(); });

/* ---- buttons, dialogs ---- */
$('#btnStart').addEventListener('click', startRun);
$('#btnUse').addEventListener('click', useArmed);
$('#btnAudio').addEventListener('click', toggleAudio);
$('#btnAudio2').addEventListener('click', toggleAudio);
$('#btnContinue').addEventListener('click', () => {
  AU.click();
  if (G.askName) { const name = $('#resNameInput').value.trim(); store = ST.save(storage, ST.addToBoard(store, name || store.name, G.m)); }
  goHome();
});
$('#resNameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#btnContinue').click(); } });
function buyBonus(id) { const s = ST.buyBonus(store, id); if (!s) return; store = ST.save(storage, s); AU.buy(); UI.renderShop(store, buyBonus); UI.home(store); }
function buyTree(id) {
  const r = ST.buyTree(store, id); if (!r) return;
  store = ST.save(storage, r.state); AU.buy(); UI.renderForest(store, buyTree); UI.home(store);
  r.newBadges.forEach((b) => { say('Lencana baru: ' + UI.badgeName(b)); AU.badge(); });
}
/* every panel opens from the home buttons or from the menu; the menu steps aside first so focus returns to its button afterwards */
const open = (id, before) => () => { AU.click(); UI.closeDialog('#dlgMenu'); before && before(); UI.openDialog(id); };
$('#btnMenu').addEventListener('click', () => { AU.click(); UI.openDialog('#dlgMenu'); });
$('#btnShop').addEventListener('click', open('#dlgShop', () => UI.renderShop(store, buyBonus)));
$('#btnShop2').addEventListener('click', open('#dlgShop', () => UI.renderShop(store, buyBonus)));
$('#btnForest').addEventListener('click', open('#dlgForest', () => UI.renderForest(store, buyTree)));
$('#btnForest2').addEventListener('click', open('#dlgForest', () => UI.renderForest(store, buyTree)));
$('#btnBoard').addEventListener('click', open('#dlgBoard', () => UI.renderBoard(store)));
$('#btnBadges').addEventListener('click', open('#dlgBadges', () => UI.renderBadges(store)));
document.querySelectorAll('dialog').forEach((d) => {
  d.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => { AU.click(); UI.closeDialog('#' + d.id); }));
  d.addEventListener('click', (e) => { if (e.target === d) { AU.click(); UI.closeDialog('#' + d.id); } });   // a tap on the scrim closes the panel
  d.addEventListener('close', flushToasts);
});

/* ---- boot: preloader counter → sheets → fonts → veil → home (or straight into a run with ?autoplay) ---- */
async function boot() {
  resize(true);
  const count = $('#preCount'); let target = 0, shown = 0;
  const ticker = setInterval(() => { shown += (target - shown) * 0.25; count.textContent = Math.round(shown) + '%'; }, 40);
  const minWait = new Promise((r) => setTimeout(r, RM || AUTOPLAY ? 0 : 1100));
  const heroImg = loadImage('assets/illus/tunas-idle.svg').catch(() => null);   // alongside the sheets; SP.SS is final once loadAll resolves
  await SP.loadAll(scale, (f) => { target = Math.round(f * 92); });
  homeHero = rasterHero(await heroImg);
  resize(true);                                      // SP.SS is final now: the canvas and every layer at the real sampling
  try { await document.fonts.load("800 20px 'Bricolage Grotesque'"); } catch { /* system fallback */ }
  target = 100; await minWait;
  clearInterval(ticker); count.textContent = '100%';
  const wit = ST.wither(store);
  if (wit.withered.length) { store = ST.save(storage, wit.state); setTimeout(() => say(`${wit.withered.length} pohon berisiko layu: tiga hari tanpa dirawat.`), 1800); }
  AU.setMuted(store.muted); syncAudioBtns();
  new ResizeObserver(() => resize()).observe(stage);   // window resizes and phone rotations re-lay out without a reload
  requestAnimationFrame(frame);                      // the home scene is already painted when the veil lifts
  if (AUTOPLAY) { UI.screen('play'); resize(true); initRun(); }
  else UI.veil(() => { G.mode = 'home'; UI.screen('home'); resize(true); });
}
if (AUTOPLAY || SEED_PARAM != null) { window.TL = window.TL || {}; TL.game = { G, fatal, startRun, goHome }; }   // dev flags only: lets a capture script drive the flow
boot();
