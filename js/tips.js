/* Nurseri Lestari — js/tips.js (D2): the tips index and the article page (?id=), rendered from TL.tips.
   v2: a tip with one of the shop's Instagram images is a photo card with a glass caption, the rest are flat text cards;
   the article opens on a dark band and reads on paper; related products reuse the catalog's tile. */
import { esc, icon, param } from './util.js';
import { tileHTML } from './catalog.js';

const T = window.TL || {};
const tips = T.tips || [], cats = T.categories || [], products = T.products || [];

const href = (t) => `tips-detail.html?id=${encodeURIComponent(t.id)}`;
const metaText = (t) => `${esc(t.topic)} · ${t.readTime} menit baca`;
const arrow = (label, dir = 'right') => dir === 'left'
  ? `<span class="link-arrow">${icon('arrow-left')}<span>${label}</span></span>`
  : `<span class="link-arrow"><span>${label}</span>${icon('arrow-right')}</span>`;

/* the Instagram graphic already carries the title, so the image is decorative and the caption does the talking */
const photoCard = (t, i, wide) => `<a class="photo photo-dim photo-hover tip-photo${wide ? ' is-wide' : ''}" href="${href(t)}" data-reveal data-delay="${i % 3}">
  <img src="${esc(t.image)}" alt="" width="640" height="${wide ? 360 : 640}" ${i < 3 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
  <div class="glass-dark tip-cap on-dark"><h2>${esc(t.title)}</h2><span class="tip-meta">${metaText(t)}</span>${arrow('Baca tips')}</div>
</a>`;
const textCard = (t, i) => `<a class="card-flat tip-text" href="${href(t)}" data-reveal data-delay="${i % 3}">
  <h2>${esc(t.title)}</h2><p class="tip-meta">${metaText(t)}</p><p class="tip-excerpt">${esc(t.excerpt)}</p>${arrow('Baca')}
</a>`;

function index(root) {
  let photos = 0;
  root.querySelector('[data-tips-grid]').innerHTML = tips.map((t, i) => (t.image ? photoCard(t, i, photos++ === 0) : textCard(t, i))).join('');
}

function related(t) {
  const sec = document.querySelector('[data-related]');
  if (!sec) return;
  const cat = cats.find((c) => c.id === t.relatedCategory);
  const list = products.filter((p) => p.category === t.relatedCategory && p.status !== 'habis')
    .sort((a, b) => (b.featured === true) - (a.featured === true) || (b.sold || 0) - (a.sold || 0)).slice(0, 4);
  if (!cat || !list.length) { sec.remove(); return; }
  const name = cat.name.toLowerCase();
  sec.querySelector('[data-related-title]').textContent = `Produk terkait: ${name}.`;
  const more = sec.querySelector('[data-related-link]');
  more.href = `produk.html?kategori=${encodeURIComponent(cat.id)}`;
  more.querySelector('span').textContent = `Semua ${name}`;
  sec.querySelector('[data-related-rail]').innerHTML = list.map((p, i) => tileHTML(p, { cats, reveal: true, delay: i % 4 })).join('');
}

function article(root) {
  const id = param('id');
  const i = tips.findIndex((t) => t.id === id), t = tips[i];
  const head = root.querySelector('[data-article-head]');
  const back = `<a class="article-back" href="tips.html">${icon('arrow-left')}Semua tips</a>`;
  if (!t) {
    document.title = 'Tips nggak ketemu — Nurseri Lestari';
    head.innerHTML = `${back}<h1>Tips ini nggak ketemu.</h1><p class="lead">Mungkin tautannya salah ketik. Daftar lengkapnya ada di halaman tips.</p>`;
    root.querySelector('[data-article-body]').closest('.article-body').remove();
    document.querySelector('[data-related]')?.remove();
    return;
  }
  document.title = `${t.title} — Nurseri Lestari`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', t.excerpt);
  head.innerHTML = `${back}<h1>${esc(t.title)}</h1><p class="meta-line">${metaText(t)}</p><p class="lead">${esc(t.excerpt)}</p>`;
  root.querySelector('[data-article-figure]').innerHTML = t.image
    ? `<div class="photo"><img src="${esc(t.image)}" alt="Unggahan Instagram Nurseri Lestari: ${esc(t.title)}" width="640" height="360" fetchpriority="high" decoding="async"></div>` : '';
  root.querySelector('[data-article-body]').innerHTML = t.body;
  const link = (n, rel) => n ? `<a class="card-flat article-nav__link" rel="${rel}" href="${href(n)}"><span class="h4">${esc(n.title)}</span>${rel === 'prev' ? arrow('Sebelumnya', 'left') : arrow('Berikutnya')}</a>` : '';
  root.querySelector('[data-article-nav]').innerHTML = link(tips[i - 1], 'prev') + link(tips[i + 1], 'next');
  related(t);
}

const idx = document.querySelector('[data-tips-index]');
if (idx) index(idx);
else { const art = document.querySelector('[data-tips-article]'); if (art) article(art); }
// shortcut: articles render client-side from TL.tips (no build step); upgrade to pre-rendered HTML if search indexing matters
// shortcut: only the tips with an Instagram image in data/tips.js get a photo card; map the other posts there and the grid upgrades itself
