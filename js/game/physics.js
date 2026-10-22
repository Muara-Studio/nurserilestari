/* Tunas & Hutan Lestari — physics.js (pure). Fixed-step player simulation in logical stage units. No DOM. */
export let STAGE_W = 480;            // logical column width; the world wraps here (main.js sets it once at boot, see setStageW)
export function setStageW(w) { STAGE_W = Math.round(w); }
export const M_PX = 40;              // 1 m = 40 px
export const STEP = 1 / 120;         // physics tick
export const GRAVITY = 1800;         // px/s²
export const JUMP_V = 805;           // px/s → JUMP_H ≈ 180 px (4.5 m)
export const SPRING_MUL = 1.8;
export const MOVE_V = 300;           // px/s
export const TERMINAL_V = -1500;
export const PLAYER_W = 40;
export const PLAYER_H = 60;
export const PLATFORM_H = 14;
export const JUMP_H = (JUMP_V * JUMP_V) / (2 * GRAVITY);
export const STUN_T = 0.6;
export const PARA_V = -95;
export const PARA_T = 3;
export const ROCKET_M = 40;
export const ROCKET_V = 1400;
export const ROCKET_T = (ROCKET_M * M_PX) / ROCKET_V;
export const MAGNET_R = 160;
export const MAGNET_T = 15;
export const KILL_MARGIN = 90;       // px below the view bottom before a fall is fatal

export const T = { BRANCH: 0, MOVING: 1, FRAGILE: 2, TEMP: 3, SPRING: 4 };
export const E = { WASP: 0, BEETLE: 1, FLY: 2 };
export const S = { AIR: 0, STUN: 1, PARA: 2, ROCKET: 3 };

export const createPlayer = (x = STAGE_W / 2, y = 0) => ({ x, y, px: x, py: y, vx: 0, vy: JUMP_V, state: S.AIR, t: 0, face: 1, squash: 0, airT: 0, hits: 0, maxY: 0 });

export const wrapX = (x) => (x < 0 ? x + STAGE_W : x >= STAGE_W ? x - STAGE_W : x);
/* shortest signed horizontal distance a-b on the wrapped stage */
export const dxWrap = (a, b) => { let d = a - b; if (d > STAGE_W / 2) d -= STAGE_W; else if (d < -STAGE_W / 2) d += STAGE_W; return d; };

/* one tick: dir ∈ {-1, 0, 1}. Stun removes control; parachute and rocket override gravity. */
export function stepPlayer(p, dir, dt) {
  p.px = p.x; p.py = p.y;
  const control = p.state !== S.STUN;
  const target = control ? dir * MOVE_V : p.vx * 0.9;
  p.vx += (target - p.vx) * Math.min(1, dt * 16);
  if (dir && control) p.face = dir;
  if (p.state === S.ROCKET) { p.vy = ROCKET_V; p.t -= dt; if (p.t <= 0) { p.state = S.AIR; p.vy = JUMP_V * 0.5; } }
  else if (p.state === S.PARA) { p.vy = Math.max(p.vy - GRAVITY * dt * 0.5, PARA_V); p.t -= dt; if (p.t <= 0) p.state = S.AIR; }
  else { p.vy = Math.max(TERMINAL_V, p.vy - GRAVITY * dt); if (p.state === S.STUN) { p.t -= dt; if (p.t <= 0) p.state = S.AIR; } }
  p.x = wrapX(p.x + p.vx * dt);
  p.y += p.vy * dt;
  p.airT += dt;
  if (p.y > p.maxY) p.maxY = p.y;
  if (p.squash > 0) p.squash = Math.max(0, p.squash - dt * 5);
}

/* one-way landing: the feet crossed a platform top while moving down this tick. Returns the platform or null. */
export function landing(p, platforms, n) {
  if (p.vy >= 0 || p.state === S.ROCKET) return null;
  const half = PLAYER_W / 2 - 6;
  for (let i = 0; i < n; i++) {
    const pl = platforms[i];
    if (!pl.alive || pl.gone) continue;
    if (p.py >= pl.y && p.y <= pl.y && Math.abs(dxWrap(p.x, pl.x)) < pl.w / 2 + half) return pl;
  }
  return null;
}

export function bounce(p, pl) {
  p.y = pl.y; p.vy = JUMP_V * (pl.type === T.SPRING ? SPRING_MUL : 1);
  if (p.state === S.PARA) p.state = S.AIR;
  p.squash = 1; p.airT = 0;
}

/* enemy contact: stun, start falling, knock away from the enemy */
export function hit(p, ex) {
  p.state = S.STUN; p.t = STUN_T; p.hits++;
  p.vy = Math.min(p.vy, 140);
  p.vx = dxWrap(p.x, ex) < 0 ? -240 : 240;
}

export const touches = (p, cx, cy, r) => { const dx = dxWrap(p.x, cx), dy = p.y + PLAYER_H * 0.5 - cy; return dx * dx + dy * dy < (r + 16) * (r + 16); };

/* platforms: moving branches swing, fragile ones drop after cracking, temp ones fade 1.5 s after first seen */
export function stepPlatform(pl, dt, time) {
  if (pl.type === T.MOVING) pl.x = wrapX(pl.x0 + Math.sin(time * pl.om + pl.ph) * pl.amp);
  else if (pl.type === T.FRAGILE && pl.cracked) { pl.t -= dt; pl.fallY += (0.25 - pl.t) * 900 * dt; if (pl.t <= 0) pl.gone = true; }
  else if (pl.type === T.TEMP && pl.seen) { pl.t -= dt; pl.alpha = Math.max(0, pl.t / 1.5); if (pl.t <= 0) pl.gone = true; }
}

export function stepEnemy(e, dt, time) {
  if (e.type === E.WASP) { const nx = wrapX(e.x0 + Math.sin(time * e.om + e.ph) * e.amp); e.face = nx - e.x > 0 ? 1 : nx - e.x < 0 ? -1 : e.face; e.x = nx; e.y = e.y0 + Math.sin(time * 5 + e.ph) * 4; }
  else if (e.type === E.FLY) { e.x = wrapX(e.x0 + Math.sin(time * e.om + e.ph) * e.amp); e.y = e.y0 + Math.cos(time * e.om * 1.7 + e.ph) * 26; }
}
