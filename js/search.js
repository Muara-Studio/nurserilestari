/* Toko Lestari — js/search.js (A). Product search overlay over TL.products: a native <dialog> with a GET form, so
   Enter opens produk.html?q= without JavaScript. searchProducts() is pure and tested in tests/search.test.mjs. */
import { fmtPrice, esc, icon, waLink } from './util.js';

const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const STATUS = { ready: 'Ready', preorder: 'Pre-order', habis: 'Stok habis' };

/** Every query word must hit name, title, tags or category; name hits rank first, then sold count; sold-out last. */
export function searchProducts(products, q, limit = 8, categories = []) {
  const tokens = fold(q).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const cats = Object.fromEntries(categories.map((c) => [c.id, fold(c.name + ' ' + (c.short || ''))]));
  const hits = [];
  for (const p of products) {
    const name = fold(p.name), title = fold(p.title), tags = fold((p.tags || []).join(' ')), cat = (cats[p.category] || '') + ' ' + fold(p.category);
    let score = 0;
    for (const t of tokens) {
      if (name.startsWith(t)) score += 6;
      else if (name.includes(t)) score += 4;
      else if (title.includes(t)) score += 2;
      else if (tags.includes(t) || cat.includes(t)) score += 1;
      else { score = 0; break; }
    }
    if (score) hits.push({ p, score });
  }
  hits.sort((a, b) => (a.p.status === 'habis') - (b.p.status === 'habis') || b.score - a.score || (b.p.sold || 0) - (a.p.sold || 0) || a.p.name.localeCompare(b.p.name));
  return hits.slice(0, limit).map((h) => h.p);
}

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const highlight = (name, q) => {
  const tokens = q.trim().split(/\s+/).filter(Boolean).map(escRe);
  return tokens.length ? esc(name).replace(new RegExp(tokens.join('|'), 'gi'), '<mark>$&</mark>') : esc(name);
};

export function initSearch({ onOpen, onClose } = {}) {
  const btn = document.querySelector('.hdr-search');
  if (!btn || document.querySelector('.search-overlay') || !('HTMLDialogElement' in window)) return;
  const products = (window.TL && TL.products) || [];
  const categories = (window.TL && TL.categories) || [];
  const catName = (id) => (categories.find((c) => c.id === id) || {}).name || '';

  const dlg = document.createElement('dialog');
  dlg.className = 'search-overlay';
  dlg.setAttribute('aria-label', 'Cari produk');
  dlg.setAttribute('data-lenis-prevent', '');
  dlg.innerHTML = `
    <form class="search-form" role="search" action="produk.html" method="get">${icon('search')}
      <input class="search-input" type="search" name="q" placeholder="Cari apa? monstera, aroid mix, pupuk…" autocomplete="off" aria-label="Cari produk" aria-controls="search-results" enterkeyhint="search">
      <button class="search-close" type="button" aria-label="Tutup pencarian">Tutup</button>
    </form>
    <p class="search-hint" id="search-hint" aria-live="polite"></p>
    <ul class="search-results" id="search-results" aria-labelledby="search-hint"></ul>
    <p class="search-foot"><span class="search-count"></span><a class="search-all" href="produk.html">Semua produk ${icon('arrow-right')}</a></p>`;
  document.body.append(dlg);
  const input = dlg.querySelector('.search-input'), hint = dlg.querySelector('.search-hint'), list = dlg.querySelector('.search-results');
  const count = dlg.querySelector('.search-count'), all = dlg.querySelector('.search-all');

  const hit = (p, q) => `<li><a class="search-hit" href="produk-detail.html?id=${esc(p.id)}">
    <img src="${esc(p.image)}" alt="" width="52" height="52" loading="lazy" decoding="async" onerror="this.hidden=true">
    <span class="search-hit-body"><span class="search-hit-name">${highlight(p.name, q)}</span>
    <span class="meta">${esc(catName(p.category))}${p.status && p.status !== 'ready' ? ` <span class="badge badge-${esc(p.status)}">${STATUS[p.status] || esc(p.status)}</span>` : ''}</span></span>
    <span class="price">${fmtPrice(p.price)}</span></a></li>`;

  function render() {
    const q = input.value.trim();
    const rows = q ? searchProducts(products, q, 8, categories) : products.filter((p) => p.featured).slice(0, 8);
    hint.textContent = q ? (rows.length ? `Hasil untuk “${q}”` : '') : 'Dari rak kami';
    list.innerHTML = rows.length ? rows.map((p) => hit(p, q)).join('')
      : `<li class="search-empty"><strong>Tidak ada yang cocok di rak ini.</strong><span>Coba kata lain, atau tanya langsung: kami cek stoknya untukmu.</span>
         <a class="btn btn-sm" href="${waLink(((TL.site || {}).waGreeting || '') + q + '.')}" target="_blank" rel="noopener">${icon('brand-whatsapp')}Tanya via WhatsApp</a></li>`;
    count.textContent = q && rows.length ? `${rows.length === 8 ? '8 teratas' : rows.length + ' produk'}` : '';
    all.href = q ? `produk.html?q=${encodeURIComponent(q)}` : 'produk.html';
    all.firstChild.textContent = q ? 'Lihat semua hasil ' : 'Semua produk ';
  }
  const open = () => { if (dlg.open) return; dlg.showModal(); onOpen?.(); render(); input.focus(); input.select(); };
  btn.addEventListener('click', open);
  input.addEventListener('input', render);
  dlg.querySelector('.search-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => onClose?.());
  dlg.addEventListener('click', (e) => { // a click on the backdrop lands on the dialog itself, outside its box
    if (e.target !== dlg) return;
    const r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
  });
  dlg.addEventListener('keydown', (e) => { // arrows walk the results, like a native combobox
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const stops = [input, ...dlg.querySelectorAll('.search-hit, .search-empty a, .search-all')];
    const i = stops.indexOf(document.activeElement);
    const next = stops[Math.min(stops.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)))];
    if (next) { e.preventDefault(); next.focus(); }
  });
  document.addEventListener('keydown', (e) => { // "/" opens the search anywhere outside a field
    if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.target.closest('input, textarea, select, [contenteditable]')) { e.preventDefault(); open(); }
  });
}
