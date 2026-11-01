/* Nurseri Lestari — js/catalog.js (C3, v2). The catalog: flat product tiles (the landing's tiles, one shared component) filtered from
   TL.products. Pure parts (filter, sort, URL state) and the tile renderer are exported: landing.js imports tileHTML, product-detail.js the rest. */
import { fmtPrice, esc, icon, waLink, reduced } from './util.js';

// gsap only animates and never holds the shelves back: it loads in the background (no top-level await, so the tiles and the
// detail page's photo do not wait for the CDN); tiles rendered before it arrives simply stand on the shelf
let gsap = null;
import('gsap').then((m) => { gsap = m.gsap; }).catch(() => {});

const TL = () => (typeof window !== 'undefined' && window.TL) || {};
const products = () => TL().products || [];
const categories = () => TL().categories || [];
export const STATUS = { ready: 'Ready', preorder: 'Pre-order', habis: 'Stok habis' };
export const STORE = { jakarta: 'Cipete', bsd: 'Tangerang BSD' };
export const catName = (id, cats = categories()) => (cats.find((c) => c.id === id) || {}).name || 'Lainnya';
// line 1 is the Tangerang BSD number; the message names the product and its price
export const waProduct = (p) => waLink(`${(TL().site || {}).waGreeting || ''}${p.name} (${fmtPrice(p.price)}), apakah masih tersedia?`, p.store === 'bsd' ? 1 : 0);

/* ---- pure: search, filter, sort, URL state ---- */
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const hay = new Map(); // id → searchable text, built once; the product objects stay untouched
const haystack = (p, cats) => {
  let h = hay.get(p.id);
  if (!h) { h = norm([p.name, p.title, p.desc, (p.tags || []).join(' '), catName(p.category, cats)].join(' ')); hay.set(p.id, h); }
  return h;
};
export function filterProducts(list, { q = '', kategori = '', status = '' } = {}, cats = categories()) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  return list.filter((p) => (!kategori || p.category === kategori) && (!status || p.status === status) && words.every((w) => haystack(p, cats).includes(w)));
}
const byName = (a, b) => a.name.localeCompare(b.name, 'id');
export const SORTS = {
  unggulan: (a, b) => (b.featured === true) - (a.featured === true) || (b.sold || 0) - (a.sold || 0) || byName(a, b),
  terlaris: (a, b) => (b.sold || 0) - (a.sold || 0) || (b.rating || 0) - (a.rating || 0) || byName(a, b),
  murah: (a, b) => a.price - b.price || byName(a, b),
  mahal: (a, b) => b.price - a.price || byName(a, b),
  nama: byName,
};
export const sortProducts = (list, key) => [...list].sort(SORTS[key] || SORTS[DEFAULTS.urut]);
// terlaris opens the rack (P2, 1 Nov 2026: the client wants the sold numbers up front); ?urut= still switches to any other order
export const DEFAULTS = { q: '', kategori: '', status: '', urut: 'terlaris' };
export const stateFromParams = (sp) => ({
  q: (sp.get('q') || '').trim(), kategori: sp.get('kategori') || '',
  status: STATUS[sp.get('status')] ? sp.get('status') : '', urut: SORTS[sp.get('urut')] ? sp.get('urut') : DEFAULTS.urut,
});
/* the category chips' icons (Tabler, in the sprite): the rack itself for "Semua produk", one glyph per category; a category
   missing here falls back to the icon named in data/products.js */
export const CHIP_ICONS = { '': 'layout-grid', 'tanaman-hias': 'plant', benih: 'seedling', 'media-tanam': 'shovel', pupuk: 'flask', obat: 'first-aid-kit', pot: 'cylinder', alat: 'tool', perlengkapan: 'box' };
const fmtN = (n) => Number(n || 0).toLocaleString('id-ID');   // 1.234, Indonesian thousands
// Tokopedia caps a listing's count at "30+" and tools/sync-tokopedia.py stores that cap as 30, so 30 is shown the way Tokopedia shows it
export const fmtSold = (n) => (Number(n) === 30 ? '30+' : fmtN(n));
export const paramsFromState = (s) => {
  const sp = new URLSearchParams();
  if (s.kategori) sp.set('kategori', s.kategori);
  if (s.q) sp.set('q', s.q);
  if (s.status) sp.set('status', s.status);
  if (s.urut && s.urut !== DEFAULTS.urut) sp.set('urut', s.urut);
  return sp.toString();
};

/* ---- one shelf tile: the same markup wherever products stand on a shelf (landing, catalog, related; styles: .rak* in
   css/components.css). The whole tile is the link; the square card image fills the top edge to edge (P2, 1 Nov 2026: no mat,
   no crop), then name, category, the price with "N terjual" beside it (Tokopedia's number from data/products.js, shown only when
   it is above zero, as Tokopedia does: the page carries the "angka dari Tokopedia" note once), the badge only when the product is
   not ready. `cta: true` adds a "Lihat produk" pill at the foot (a span: the tile is already the link). `reveal` adds the
   landing's data-reveal hooks (main.js runs that CSS reveal); the catalog settles its tiles with gsap ---- */
export const tileHTML = (p, { cats = categories(), reveal = false, delay = 0, eager = false, first = false, cta = false } = {}) => `
<li class="rak-item" data-id="${esc(p.id)}"${reveal ? ` data-reveal data-delay="${delay}"` : ''}>
  <a class="rak-card photo-hover" href="produk-detail.html?id=${encodeURIComponent(p.id)}" data-cat="${esc(p.category)}">
    <span class="rak-mat"><img src="${esc(p.image)}" alt="${esc(p.name)}" width="1024" height="1024" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${first ? ' fetchpriority="high"' : ''}></span>
    <strong class="rak-name">${esc(p.name)}</strong>
    <span class="rak-cat">${esc(catName(p.category, cats))}</span>
    <span class="rak-foot"><span class="price">${fmtPrice(p.price)}${p.priceBefore ? `<span class="price-before">${fmtPrice(p.priceBefore)}</span>` : ''}</span>${p.sold > 0 ? `<span class="rak-sold">${fmtSold(p.sold)} terjual</span>` : ''}${p.status && p.status !== 'ready' ? `<span class="badge badge-${esc(p.status)}">${esc(STATUS[p.status] || p.status)}</span>` : ''}</span>${cta ? `
    <span class="btn btn-sm btn-fill rak-cta">Lihat produk${icon('arrow-right', 'icon-arrow')}</span>` : ''}
  </a>
</li>`;

/* ---- arrival: the li fades in while the card rises 24 px (the v2 [data-reveal] move, driven by gsap here so the FLIP moves below
   never fight a CSS transition; ease-out, no overshoot), batched as the tiles scroll into view ---- */
let io;
export function settle(items) {
  if (!gsap || reduced() || !items.length || !('IntersectionObserver' in window)) return;
  io ||= new IntersectionObserver((entries) => {
    const batch = entries.filter((e) => e.isIntersecting).map((e) => e.target);
    batch.forEach((el) => io.unobserve(el));
    if (!batch.length) return;
    gsap.to(batch, { opacity: 1, duration: .7, ease: 'power2.out', stagger: .06, overwrite: 'auto' });
    // clearProps at the end: gsap would otherwise leave an inline transform on the card for good
    gsap.to(batch.map((el) => el.firstElementChild), { y: 0, duration: .7, ease: 'power3.out', stagger: .06, overwrite: 'auto', clearProps: 'transform,translate,rotate,scale' });
  }, { rootMargin: '0px 0px -8% 0px' });
  // opacity, never visibility: a tile waiting below the fold must stay focusable, and focusing it scrolls it into view, which reveals it
  items.forEach((el) => { gsap.set(el, { opacity: 0 }); gsap.set(el.firstElementChild, { y: 24 }); io.observe(el); });
}

/* ---- the catalog page ---- */
const tpl = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

function boot() {
  const grid = document.querySelector('[data-grid]');
  if (!grid) return;
  const form = document.querySelector('[data-filters]');
  const q = form.querySelector('#q'), urut = form.querySelector('#urut');
  const cats = form.querySelector('[data-cats]'), count = document.querySelector('[data-count]'), clear = document.querySelector('[data-clear]');   // the counter line sits under the form (v2)
  const empty = document.querySelector('[data-empty]'), emptyWa = document.querySelector('[data-empty-wa]');
  const all = products();
  let state = stateFromParams(new URLSearchParams(location.search));
  if (state.kategori && !categories().some((c) => c.id === state.kategori)) state.kategori = '';

  const counts = all.reduce((m, p) => ((m[p.category] = (m[p.category] || 0) + 1), m), {});
  // chips: "Semua produk" first, each with its Tabler glyph at the left, the count after the name
  cats.innerHTML = [{ id: '', name: 'Semua produk', n: all.length }, ...categories().map((c) => ({ id: c.id, name: c.name, n: counts[c.id] || 0, icon: c.icon }))]
    .map((c) => `<button type="button" class="tag tag-icon" data-cat="${esc(c.id)}" aria-pressed="false">${icon(CHIP_ICONS[c.id] || c.icon || 'tag')}<span>${esc(c.name)}</span> <span class="num">${c.n}</span></button>`).join('');

  const filtered = () => !!(state.q || state.kategori || state.status);
  const syncControls = () => {
    q.value = state.q; urut.value = state.urut;
    cats.querySelectorAll('[data-cat]').forEach((b) => { const on = b.dataset.cat === state.kategori; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('is-active', on); });
    // phones: the chip strip scrolls sideways, so a category chosen by URL is brought into view (left of the strip, behind the gutter)
    const on = cats.querySelector('.is-active'), r = on && on.getBoundingClientRect(), c = cats.getBoundingClientRect();
    if (on && cats.scrollWidth > cats.clientWidth + 1 && (r.right > c.right || r.left < c.left)) cats.scrollTo({ left: r.left - c.left + cats.scrollLeft - (parseFloat(getComputedStyle(cats).paddingLeft) || 0), behavior: 'auto' });
  };
  const syncUrl = () => { const qs = paramsFromState(state); history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '')); };
  // the counter talks like the shopkeeper
  const say = (n) => (!filtered() ? `${all.length} produk di rak ini` : n === 0 ? 'Nggak ada yang cocok' : `Ketemu ${n} dari ${all.length} produk`);

  let first = true;
  function render() {
    const next = sortProducts(filterProducts(all, state), state.urut);
    count.textContent = say(next.length);
    clear.hidden = !filtered();
    empty.hidden = next.length > 0; grid.hidden = next.length === 0;
    emptyWa.href = waLink(state.q ? `${(TL().site || {}).waGreeting || ''}produk "${state.q}", apakah tersedia?` : '');

    const animate = !!gsap && !reduced() && !first;
    const gridRect = animate ? grid.getBoundingClientRect() : null;
    const old = new Map(), before = new Map();
    for (const el of grid.querySelectorAll(':scope > .rak-item:not(.is-leaving)')) { old.set(el.dataset.id, el); if (animate) before.set(el, el.getBoundingClientRect()); }
    const keep = new Set(next.map((p) => p.id));
    // tiles taken off the shelf are pinned where they were and fade, so the others reflow at once (FLIP: first)
    old.forEach((el, id) => {
      if (keep.has(id)) return;
      io?.unobserve(el);
      if (!animate) { el.remove(); return; }
      const r = before.get(el);
      el.classList.add('is-leaving');
      Object.assign(el.style, { position: 'absolute', left: `${r.left - gridRect.left}px`, top: `${r.top - gridRect.top}px`, width: `${r.width}px`, margin: 0 });
      gsap.to(el, { autoAlpha: 0, y: 10, duration: .2, ease: 'power2.in', overwrite: true, onComplete: () => el.remove() });
    });
    const frag = document.createDocumentFragment(), entering = [];
    next.forEach((p, i) => {
      let el = old.get(p.id);
      // only the first row loads eagerly (four tiles; two rows on a phone): the full-square JPEGs now are the LCP on phones, and
      // eight of them at once shared a slow 4G line (jury: 7 s); the rest lazy-load as they near the viewport
      if (!el) { el = tpl(tileHTML(p, { eager: first && i < 4, first: first && i === 0 })); entering.push(el); }
      frag.appendChild(el);
    });
    grid.appendChild(frag);
    if (animate) old.forEach((el, id) => { // FLIP: last, invert, play — staying tiles glide to their new slot
      if (!keep.has(id)) return;
      const a = before.get(el), b = el.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
      if (dx || dy) gsap.fromTo(el, { x: dx, y: dy }, { x: 0, y: 0, duration: .7, ease: 'power3.out', overwrite: 'auto' });
    });
    settle(entering);
    first = false;
  }

  let timer;
  const apply = () => { syncUrl(); render(); };
  q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { state.q = q.value.trim(); apply(); }, 150); });
  form.addEventListener('submit', (e) => { e.preventDefault(); clearTimeout(timer); state.q = q.value.trim(); apply(); });
  urut.addEventListener('change', () => { state.urut = urut.value; apply(); });
  cats.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    state.kategori = b.dataset.cat; syncControls(); apply();
  });
  document.querySelectorAll('[data-reset]').forEach((b) => b.addEventListener('click', () => {
    state = { ...DEFAULTS }; syncControls(); apply(); q.focus({ preventScroll: true });
  }));

  syncControls();
  render();
}

if (typeof document !== 'undefined') boot();
