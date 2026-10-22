/* Toko Lestari — js/tips.js (D): the tips index (the notebook behind the counter) and the article page (?id=). */
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger.js';
import { esc, icon, fmtPrice, param, waLink, reduced } from './util.js';

gsap.registerPlugin(ScrollTrigger);
const T = window.TL || {};
const tips = T.tips || [], cats = T.categories || [], products = T.products || [];
const STATUS = { ready: 'Ready', preorder: 'Pre-order', habis: 'Stok habis' };

const href = (t) => `tips-detail.html?id=${encodeURIComponent(t.id)}`;
const figure = (t, { eager = false, alt = '' } = {}) => {
  const src = t.image || t.illus;
  return `<div class="tip-fig${t.image ? '' : ' is-illus'}" data-topic="${esc(t.topic)}">${src ? `<img src="${esc(src)}" alt="${esc(alt)}" width="640" height="640" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" onerror="this.parentNode.classList.remove('is-illus');this.remove()">` : ''}</div>`;
};
const meta = (t) => `<div class="tip-meta"><span class="tag">${esc(t.topic)}</span><span class="meta">${t.readTime} menit baca</span></div>`;
const body = (t, more) => `<div class="tip-body">${meta(t)}<h2>${esc(t.title)}</h2><p class="tip-excerpt">${esc(t.excerpt)}</p><span class="tip-more">${more} ${icon('arrow-right')}</span></div>`;
const card = (t) => `<a class="card tip-card pg-lift" href="${href(t)}">${figure(t)}${body(t, 'Baca')}</a>`;
const featured = (t) => `<a class="card tip-featured pg-lift" href="${href(t)}">${figure(t, { eager: true })}${body(t, 'Baca tips')}</a>`;
const cta = () => `<div class="card tip-cta on-dark"><h2>Belum ketemu jawabannya?</h2><p>Foto saja tanamanmu atau tempat tanamnya, kirim ke WhatsApp. Kami bantu lihat media, pupuk, dan potnya.</p><a class="btn" data-wa href="${waLink()}" target="_blank" rel="noopener">${icon('brand-whatsapp')} Chat WhatsApp</a><img class="tip-cta__leaf" src="assets/illus/leaf-sticker.svg" alt="" width="400" height="400" loading="lazy" decoding="async" onerror="this.remove()"></div>`;
const mini = (p) => `<a class="card mini pg-lift" href="produk-detail.html?id=${encodeURIComponent(p.id)}"><div class="mini__fig"><img src="${esc(p.image)}" alt="" width="300" height="300" loading="lazy" decoding="async" onerror="this.remove()"></div><span class="badge badge-${esc(p.status)}">${STATUS[p.status] || ''}</span><h3>${esc(p.name)}</h3><span class="price">${fmtPrice(p.price)}</span></a>`;

/* stickers settle onto the page as they enter (the motion verb); reduced motion shows them at rest */
function settleIn(items) {
  if (reduced() || !items.length) return;
  gsap.set(items, { y: 28, autoAlpha: 0 });
  ScrollTrigger.batch(items, { start: 'top 92%', once: true, onEnter: (els) => gsap.to(els, { y: 0, autoAlpha: 1, duration: .64, ease: 'back.out(1.6)', stagger: .07, overwrite: true, onComplete: () => gsap.set(els, { clearProps: 'transform,opacity,visibility' }) }) });
}

/* signature: one scroll driver. The ruled paper (and its bookmark) covers less distance than the stickers on it. */
function notebookDriver(root) {
  const lines = root.querySelector('.notebook__lines'), ribbon = root.querySelector('.notebook__ribbon');
  const k = 0.3;
  let shift = 0, travel = 0;
  const apply = (p) => { lines.style.translate = `0 ${(p * shift).toFixed(1)}px`; ribbon.style.translate = `0 ${(p * travel).toFixed(1)}px`; };
  const measure = (st) => { shift = (st.end - st.start) * k; travel = root.offsetHeight - ribbon.offsetHeight; lines.style.setProperty('--shift', `${shift}px`); apply(st.progress); };
  const st = ScrollTrigger.create({ trigger: root, start: 'top bottom', end: 'bottom top', onRefresh: measure, onUpdate: (self) => apply(self.progress) });
  measure(st);
}

function index(root) {
  const [first, ...rest] = tips;
  root.querySelector('[data-tips-featured]').innerHTML = first ? featured(first) : '';
  const grid = root.querySelector('[data-tips-grid]');
  grid.innerHTML = rest.map(card).join('') + cta();
  settleIn([root.querySelector('.tip-featured'), ...grid.children].filter(Boolean));
  if (!reduced()) notebookDriver(root);
}

function related(t) {
  const sec = document.querySelector('[data-related]');
  const cat = cats.find((c) => c.id === t.relatedCategory);
  const list = products.filter((p) => p.category === t.relatedCategory && p.status !== 'habis')
    .sort((a, b) => (b.featured === true) - (a.featured === true) || (b.sold || 0) - (a.sold || 0)).slice(0, 5);
  if (!sec) return;
  if (!cat || !list.length) { sec.remove(); return; }
  sec.querySelector('[data-related-title]').textContent = `Produk terkait: ${cat.name}`;
  const more = sec.querySelector('[data-related-link]');
  more.href = `produk.html?kategori=${encodeURIComponent(cat.id)}`;
  more.firstChild.textContent = `Semua ${cat.name.toLowerCase()} `;
  sec.querySelector('[data-related-rail]').innerHTML = list.map(mini).join('');
}

function article(root) {
  const id = param('id');
  const i = tips.findIndex((t) => t.id === id), t = tips[i];
  const head = root.querySelector('[data-article-head]');
  const back = `<a class="article-back" href="tips.html">${icon('chevron-left')} Semua tips</a>`;
  if (!t) {
    document.title = 'Tips tidak ditemukan — Toko Lestari';
    head.innerHTML = `${back}<h1>Tips ini tidak ditemukan.</h1><p class="lead">Mungkin tautannya salah ketik. Daftar lengkapnya ada di halaman tips.</p>`;
    document.querySelector('[data-related]')?.remove();
    return;
  }
  document.title = `${t.title} — Toko Lestari`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', t.excerpt);
  head.innerHTML = `${back}${meta(t)}<h1>${esc(t.title)}</h1><p class="lead">${esc(t.excerpt)}</p>`;
  root.querySelector('[data-article-figure]').innerHTML = figure(t, { eager: true, alt: t.image ? `Unggahan Instagram Nurseri Lestari: ${t.title}` : '' });
  root.querySelector('[data-article-body]').innerHTML = t.body;
  const link = (n, rel) => n ? `<a class="card pg-lift" rel="${rel}" href="${href(n)}"><span class="eyebrow">${rel === 'prev' ? 'Sebelumnya' : 'Berikutnya'}</span><h2>${esc(n.title)}</h2></a>` : '';
  root.querySelector('[data-article-nav]').innerHTML = link(tips[i - 1], 'prev') + link(tips[i + 1], 'next');
  related(t);
}

const idx = document.querySelector('[data-tips-index]');
if (idx) index(idx);
else { const art = document.querySelector('[data-tips-article]'); if (art) article(art); }
// shortcut: articles render client-side from TL.tips (no build step); upgrade to pre-rendered HTML if search indexing matters
