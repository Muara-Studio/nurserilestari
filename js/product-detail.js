/* Nurseri Lestari — js/product-detail.js (C3, v2). One product by ?id=: the glass panel in the dark band, the light section
   (notes, tag links, care, facts), four related tiles, the phone buy bar. The photo, name, category and price are already set by
   the inline LCP kick in produk-detail.html; this module fills the rest and never waits for the CDN (no gsap here). */
import { fmtPrice, esc, icon, waLink, param } from './util.js';
import { tileHTML, settle, catName, STATUS, STORE, sortProducts, fmtSold } from './catalog.js';
import { mountShopToggle, storeToShop, shopById, shopLabel, waShop, waOrderText } from './shop-choice.js';

const $ = (s, r = document) => r.querySelector(s);
const site = (window.TL || {}).site || {};
const all = (window.TL || {}).products || [];
const product = all.find((x) => x.id === param('id'));

if (product) show(product); else missing();

function missing() {
  const h1 = $('[data-title]');
  $('[data-pd]').hidden = true;
  $('[data-body]').hidden = true;
  const box = $('[data-missing]');
  box.hidden = false;
  h1.textContent = 'Yang ini nggak ada di rak.'; // keep the page's one h1 in the visible section
  box.prepend(h1);
  $('[data-missing-wa]').href = waLink();
  document.title = 'Produk tidak ditemukan — Nurseri Lestari';
}

function show(p) {
  const cat = catName(p.category);
  document.title = `${p.name} — Nurseri Lestari`;
  $('meta[name="description"]')?.setAttribute('content', p.desc || `${p.name} dari Nurseri Lestari, ${fmtPrice(p.price)}. Harga mengikuti etalase Tokopedia.`);
  $('[data-crumbs]').insertAdjacentHTML('beforeend', `<li><a href="produk.html?kategori=${encodeURIComponent(p.category)}">${esc(cat)}</a></li><li aria-current="page">${esc(p.name)}</li>`);
  const photo = $('[data-photo]');
  photo.src = p.image; photo.alt = `${p.name}, foto dari etalase Tokopedia`;
  $('[data-title]').textContent = p.name;
  $('[data-cat]').textContent = cat;
  $('[data-price]').innerHTML = `${fmtPrice(p.price)}${p.priceBefore ? `<s class="price-before">${fmtPrice(p.priceBefore)}</s>` : ''}`;
  // the status badge only when the product is not ready (159 of 160 are)
  const badge = $('[data-badge]');
  if (p.status && p.status !== 'ready') { badge.textContent = STATUS[p.status] || p.status; badge.classList.add(`badge-${p.status}`); badge.hidden = false; }
  // the buy buttons (panel and phone bar) follow the chosen shop: applyShop(), through the "Beli dari" pair below
  // 32 products have no notes yet: say so and point to the shop, never invent one
  $('[data-desc]').textContent = p.desc || 'Catatan untuk produk ini belum kami tulis. Tanya lewat WhatsApp, kami jelaskan langsung.';
  const tags = p.tags || [];
  if (tags.length) { $('[data-tags]').innerHTML = tags.map((t) => `<a class="tag" href="produk.html?q=${encodeURIComponent(t)}">${esc(t)}</a>`).join(''); $('[data-tags-wrap]').hidden = false; }
  const loc = (site.locations || []).find((l) => l.id === (p.store === 'bsd' ? 'bsd' : 'cipete'));
  const specs = [
    ['Kategori', `<a href="produk.html?kategori=${encodeURIComponent(p.category)}">${esc(cat)}</a>`],
    ['Etalase Tokopedia', esc((loc && loc.shortName) || STORE[p.store] || '')],   // where the listing lives; the chosen shop is the pair above (B2)
    ['Status', esc(STATUS[p.status] || p.status)],
    ...Object.entries(p.specs || {}).map(([k, v]) => [esc(k), esc(v)]),
  ];
  // Tokopedia's own number, so it says so (P2, 1 Nov 2026); Indonesian thousands, and the "30+" cap kept as Tokopedia shows it
  if (p.sold) specs.push(['Terjual di Tokopedia', `${fmtSold(p.sold)}${p.rating ? ` · ${icon('star-filled')} ${p.rating.toFixed(1)}` : ''}`]);
  $('[data-specs]').innerHTML = specs.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  if (p.care) { $('[data-care]').hidden = false; $('[data-care-text]').textContent = p.care; }
  $('[data-bar-name]').textContent = p.name; $('[data-bar-price]').textContent = fmtPrice(p.price);
  // "Beli dari" (B2, 1 Nov 2026, client): the saved choice, else this product's own shop; every buy button follows it
  mountShopToggle($('[data-shop-choice]'), { product: p, onChange: (shop) => applyShop(p, shop) });
  related(p, cat);
  buyBar();
}

/* the three ways to buy, for the chosen shop. Tokopedia: the product's own listing when it belongs to that shop, else the
   shop's Tokopedia front with a note (a listing exists in one shop only; the other shop's stock is the admin's to answer).
   Shopee: the shop's front, there is no per-product Shopee link in the data, so the button says "Cari". WhatsApp: that shop's
   admin with the product and price in the message. The phone bar mirrors the panel. */
function applyShop(p, shop) {
  if (!shop) return;
  const home = shopById(storeToShop(p.store)), own = !home || home.id === shop.id;
  const tokopedia = own ? p.tokopedia : shop.tokopedia || p.tokopedia;
  const shopee = shop.shopee || '';
  const wa = waShop(shop.id, waOrderText(p, shop));
  for (const sel of ['[data-tokopedia]', '[data-bar-tokopedia]']) { const a = $(sel); if (a) a.href = tokopedia; }
  for (const sel of ['[data-shopee]', '[data-bar-shopee]']) { const a = $(sel); if (a) { a.href = shopee; a.hidden = !shopee; } }
  for (const sel of ['[data-wa-product]', '[data-bar-wa]']) { const a = $(sel); if (a) a.href = wa; }
  const note = $('[data-stock-note]');
  if (note) { note.textContent = own ? '' : `Etalase Tokopedia-nya ada di ${shopLabel(home)}; stok di ${shopLabel(shop)}: tanya admin.`; note.hidden = own; }
  document.querySelectorAll('[data-shop-name]').forEach((el) => { el.textContent = shopLabel(shop); });
}

// one row of the same tiles: four on desktop, three on tablets (CSS hides the fourth), two by two on phones
function related(p, cat) {
  let list = sortProducts(all.filter((x) => x.id !== p.id && x.category === p.category), 'unggulan');
  const fromShelf = list.length >= 3;
  if (!fromShelf) list = list.concat(sortProducts(all.filter((x) => x.id !== p.id && x.category !== p.category && x.featured), 'unggulan'));
  list = list.slice(0, 4);
  if (!list.length) return;
  const rail = $('[data-rail]');
  rail.innerHTML = list.map((x) => tileHTML(x)).join('');
  $('[data-related-hint]').textContent = fromShelf ? `Dari rak ${cat}` : 'Dari rak kami';
  $('[data-related]').hidden = false;
  settle([...rail.children]);
}

// the bar appears once the panel's buttons scroll away, and hides again over the footer
function buyBar() {
  const bar = $('[data-buy-bar]'), cta = $('[data-cta]');
  if (!bar || !cta || !('IntersectionObserver' in window)) return;
  let ctaGone = false, footerIn = false;
  const apply = () => { const on = ctaGone && !footerIn; bar.classList.toggle('is-on', on); document.documentElement.classList.toggle('buy-bar-on', on); };
  new IntersectionObserver(([e]) => { ctaGone = !e.isIntersecting && e.boundingClientRect.top < 0; apply(); }).observe(cta);
  const footer = document.querySelector('.site-footer, footer');
  if (footer) new IntersectionObserver(([e]) => { footerIn = e.isIntersecting; apply(); }).observe(footer);
}
