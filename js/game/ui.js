/* Tunas & Hutan Lestari — ui.js. DOM glue: screens, the veil wipe, dialogs with focus handling, cards and toasts. */
import { esc, icon, reduced } from '../util.js';
import { BONUSES, TREES, BADGES, MAX_TREES } from './store.js';

export const $ = (s, r = document) => r.querySelector(s);
const screens = () => document.querySelectorAll('[data-screen]');
let lastFocus = null;

export function screen(name) {
  screens().forEach((el) => { el.hidden = el.dataset.screen !== name; });
  document.body.classList.toggle('is-playing', name === 'play' || name === 'fall');
  document.body.classList.toggle('is-falling', name === 'fall');   // game.css blurs the canvas and hides the keycaps
}

/* olive curtain wipes up over the stage; `mid` runs while it covers everything */
export function veil(mid) {
  const v = $('#veil');
  if (reduced() || !v) { mid(); return Promise.resolve(); }
  // transitionend and the 700 ms fallback race: `once` makes sure each phase (and mid) runs a single time
  const once = (fn) => { let done = false; const run = () => { if (done) return; done = true; v.removeEventListener('transitionend', run); fn(); }; v.addEventListener('transitionend', run); setTimeout(run, 700); };
  return new Promise((res) => {
    v.classList.add('is-in');
    once(() => { mid(); requestAnimationFrame(() => { v.classList.remove('is-in'); v.classList.add('is-out'); once(() => { v.classList.remove('is-out'); res(); }); }); });
  });
}

export function openDialog(id) {
  const d = $(id); if (!d || d.open) return d;
  lastFocus = document.activeElement; d.showModal();
  const first = d.querySelector('[autofocus], .btn:not([disabled]), button:not([disabled]), input');
  first && first.focus();
  return d;
}
export function closeDialog(id) { const d = $(id); if (d && d.open) d.close(); if (lastFocus && lastFocus.focus) { lastFocus.focus(); lastFocus = null; } }

/* HUD numbers: touch the DOM only when a value changes */
const hudCache = { m: null, seeds: null };
export function hud(m, seeds) {
  if (m !== hudCache.m) { hudCache.m = m; $('#hudM').textContent = m + ' m'; }
  if (seeds !== hudCache.seeds) { const el = $('#hudSeeds'); if (hudCache.seeds !== null && seeds > hudCache.seeds) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } hudCache.seeds = seeds; el.textContent = seeds; }
}
export function resetHud() { hudCache.m = hudCache.seeds = null; }

export function home(store) {
  $('#recordSign').textContent = `Rekor kamu ${store.record} m`;
  $('#homeSeeds').textContent = store.seeds;
  const unlocked = store.runs > 0;
  $('#btnForest').hidden = !unlocked; $('#btnShop').hidden = !unlocked;
  $('#btnForest2').hidden = !unlocked; $('#btnShop2').hidden = !unlocked;   // the same two in the top-right menu
  $('#btnAudio').setAttribute('aria-pressed', String(!store.muted));
  $('#btnAudio').title = store.muted ? 'Suara mati' : 'Suara hidup';
  $('#btnAudioIcon').innerHTML = icon(store.muted ? 'volume-off' : 'volume');
}

export function result(m, record, seeds, askName, name) {
  $('#resM').textContent = `${m} m`;
  $('#resRecord').hidden = m < record; $('#resRecordOld').hidden = m >= record; $('#resRecordOld').textContent = `Rekor kamu ${record} m`;
  $('#resSeeds').textContent = seeds;
  const f = $('#resName'); f.hidden = !askName; if (askName) { $('#resNameInput').value = name || ''; }
}

export function renderShop(store, onBuy) {
  $('#shopSeeds').textContent = store.seeds;
  $('#shopList').innerHTML = BONUSES.map((b) => {
    const owned = !!store.bonuses[b.id], can = store.seeds >= b.price;
    return `<li class="bonus ${owned ? 'is-owned' : ''}"><div class="bonus-ico"><svg aria-hidden="true"><use href="#b-${b.id}"/></svg></div>
      <div class="bonus-body"><h3>${esc(b.name)}</h3><p>${esc(b.desc)}</p></div>
      <div class="bonus-act">${owned ? `<span class="tag tag-leaf">${icon('check')} Siap dipakai</span>` : `<button class="btn btn-sm ${can ? 'btn-fill' : ''}" data-buy="${b.id}" ${can ? '' : 'disabled aria-disabled="true"'}>${icon('leaf')} ${b.price} benih</button>`}</div></li>`;
  }).join('');
  $('#shopList').querySelectorAll('[data-buy]').forEach((btn) => btn.addEventListener('click', () => onBuy(btn.dataset.buy)));
}

export function renderForest(store, onBuy) {
  $('#forestSeeds').textContent = store.seeds;
  const full = store.trees.length >= MAX_TREES;
  $('#forestNote').textContent = full ? `Bukit sudah penuh: ${MAX_TREES} pohon tertanam.` : `${store.trees.length} dari ${MAX_TREES} pohon tertanam di bukit depan toko.`;
  $('#forestList').innerHTML = TREES.map((t) => {
    const can = store.seeds >= t.price && !full, planted = store.trees.filter((x) => x.id === t.id).length;
    return `<li class="treecard"><img src="assets/illus/game-trees.svg#t-${t.id}" alt="" width="72" height="96" loading="lazy" decoding="async">
      <h3>${esc(t.name)}</h3>
      <p class="treecard-meta">${t.risky ? `<span class="tag tag-sun">berisiko</span>` : ''}${planted ? `<span class="badge badge-plain">${planted} tertanam</span>` : ''}</p>
      <button class="btn btn-sm ${can ? 'btn-fill' : ''}" data-tree="${t.id}" ${can ? '' : 'disabled aria-disabled="true"'}>${icon('leaf')} ${t.price} benih</button></li>`;
  }).join('');
  $('#forestList').querySelectorAll('[data-tree]').forEach((btn) => btn.addEventListener('click', () => onBuy(btn.dataset.tree)));
}

export function renderBoard(store) {
  const fmt = (at) => new Date(at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  $('#boardList').innerHTML = store.board.length
    ? store.board.map((e, i) => `<li><span class="board-rank num">${i + 1}</span><span class="board-name">${esc(e.name)}</span><span class="board-m num">${e.m} m</span><span class="board-at">${fmt(e.at)}</span></li>`).join('')
    : `<li class="board-empty">Belum ada rekor. Mainkan satu putaran dulu.</li>`;
}

export function renderBadges(store) {
  const ico = { pendaki50: 'chevron-up', pendaki200: 'trophy', pemetik100: 'leaf', tanpaluka: 'shield-check', penanam: 'tree' };
  $('#badgeList').innerHTML = BADGES.map((b) => { const got = store.badges.includes(b.id); return `<li class="lencana ${got ? 'is-got' : ''}"><span class="lencana-ico">${icon(ico[b.id])}</span><div><h3>${esc(b.name)}</h3><p>${esc(b.desc)}</p></div>${got ? `<span class="tag tag-leaf">${icon('check')} Dapat</span>` : `<span class="tag">Terkunci</span>`}</li>`; }).join('');
}

let toastT = 0;
export function toast(text) {
  const t = $('#toast'); t.textContent = text; t.hidden = false; t.classList.remove('is-in'); void t.offsetWidth; t.classList.add('is-in');
  clearTimeout(toastT); toastT = setTimeout(() => { t.classList.remove('is-in'); t.hidden = true; }, 2600);
}
export const badgeName = (id) => (BADGES.find((b) => b.id === id) || {}).name || id;
