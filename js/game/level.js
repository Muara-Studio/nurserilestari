/* Tunas & Hutan Lestari — level.js (pure). Seeded platform / seed / enemy generator with a reachability guarantee. No DOM. */
import { STAGE_W, JUMP_V, GRAVITY, MOVE_V, JUMP_H, M_PX, T, E, wrapX, dxWrap } from './physics.js';

export const difficulty = (m) => 1 - Math.exp(-Math.max(0, m) / 420);
export const MAX_GAP = Math.floor(JUMP_H * 0.8);
export const MIN_DX = 36;

export function mulberry32(a) {
  return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* horizontal distance the tupai can cover while still landing dy above the bounce point (with margin) */
export function reach(dy) {
  const v2 = JUMP_V * JUMP_V - 2 * GRAVITY * dy;
  if (v2 <= 0) return 0;
  return MOVE_V * ((JUMP_V + Math.sqrt(v2)) / GRAVITY) * 0.85;
}

const platform = (x, y, w, type, chain) => ({ x: wrapX(x), x0: wrapX(x), y, w, type, chain, alive: true, gone: false, amp: 0, om: 0, ph: 0, t: 0, cracked: false, seen: false, alpha: 1, fallY: 0, rider: null });
const seed = (x, y, v) => ({ x: wrapX(x), y, v, alive: true, vx: 0, vy: 0, ph: Math.random() * 6.28 });
const enemy = (type, x, y, amp, om, ph) => ({ type, x: wrapX(x), x0: wrapX(x), y, y0: y, amp, om, ph, alive: true, face: 1, r: type === E.WASP ? 22 : type === E.BEETLE ? 24 : 15 });

export function createLevel(seedValue = 1) {
  const L = { seed: seedValue >>> 0, rng: mulberry32(seedValue >>> 0), y: 0, x: STAGE_W / 2, amp: 0, n: 0, platforms: [], seeds: [], enemies: [] };
  L.platforms.push(platform(STAGE_W / 2, 0, 150, T.BRANCH, true));
  return L;
}

/* extend the world up to `untilY` (px); generation only depends on the rng, so a seed replays identically */
export function fill(L, untilY) { while (L.y < untilY) next(L); }

function next(L) {
  const rng = L.rng, d = difficulty(L.y / M_PX);
  const gapMin = 60 + 30 * d, gapMax = MAX_GAP * (0.62 + 0.38 * d);
  const gap = gapMin + rng() * (gapMax - gapMin);
  const y = L.y + gap;
  const r = rng();
  let type = T.BRANCH;
  if (r < 0.06) type = T.SPRING;
  else if (r < 0.14 + 0.22 * d) type = T.MOVING;
  else if (r < 0.19 + 0.42 * d) type = T.FRAGILE;
  const w = Math.round(112 - 44 * d + (rng() - 0.5) * 20);
  let amp = type === T.MOVING ? 40 + rng() * 50 : 0;
  const avail = reach(gap) - L.amp;                       // the previous platform may be swinging too
  if (avail - amp < MIN_DX + 10) { amp = 0; type = type === T.MOVING ? T.BRANCH : type; }
  const maxDx = Math.min(avail - amp, STAGE_W * 0.5);
  const dx = (rng() * 2 - 1) * maxDx;
  const x = wrapX(L.x + dx);
  const pl = platform(x, y, w, type, true);
  if (type === T.MOVING) { pl.amp = amp; pl.om = 1 + rng() * 1.1; pl.ph = rng() * 6.28; }
  L.platforms.push(pl);

  // extras: never part of the guaranteed chain, so they can be temp or carry a beetle
  if (rng() < 0.5 - 0.25 * d) {
    const ex = rng() * STAGE_W, ey = L.y + gap * (0.35 + rng() * 0.4);
    if (Math.abs(dxWrap(ex, x)) > w * 0.5 + 60 && Math.abs(dxWrap(ex, L.x)) > 70) {
      const temp = rng() < 0.45;
      const e = platform(ex, ey, Math.round(80 - 20 * d), temp ? T.TEMP : T.BRANCH, false);
      if (temp) e.t = 1.5;
      L.platforms.push(e);
      if (!temp && rng() < 0.12 + 0.35 * d) { const b = enemy(E.BEETLE, ex, ey + 18, 0, 0, 0); b.rider = e; L.enemies.push(b); }
    }
  }
  // seeds: an arc between the two chain platforms, or a short line above the new one
  const sr = rng();
  if (sr < 0.34) { const n = 4; for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; L.seeds.push(seed(L.x + dx * t, L.y + gap * t + 46 + Math.sin(t * Math.PI) * 44, 1)); } }
  else if (sr < 0.62) { const n = 3 + Math.floor(rng() * 3), sx = x - ((n - 1) * 30) / 2; for (let i = 0; i < n; i++) L.seeds.push(seed(sx + i * 30, y + 48, 1)); }
  else if (sr < 0.7 + 0.04 * d) L.seeds.push(seed(x + (rng() - 0.5) * 120, y + 84, 5));
  // enemies in the air
  if (d > 0.08 && rng() < 0.04 + 0.3 * d) { const wy = L.y + gap * 0.55; L.enemies.push(enemy(E.WASP, rng() * STAGE_W, wy, 50 + rng() * 60, 0.9 + rng() * 0.8, rng() * 6.28)); }
  if (d > 0.2 && rng() < 0.02 + 0.2 * d) L.enemies.push(enemy(E.FLY, rng() * STAGE_W, y + 110 + rng() * 40, 30 + rng() * 40, 0.8 + rng() * 0.6, rng() * 6.28));

  L.x = x; L.y = y; L.amp = amp; L.n++;
}
