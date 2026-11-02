/* Nurseri Lestari — js/product-detail.js (C3, v2). One product by ?id=: the glass panel in the dark band, the light section
   (notes, tag links, care, facts), four related tiles, the phone buy bar. The photo, name, category and price are already set by
   the inline LCP kick in produk-detail.html; this module fills the rest and never waits for the CDN (no gsap here). */
import { fmtPrice, hasPrice, priceText, priceHTML, priceInText, esc, icon, waLink, param } from './util.js';
import { tileHTML, settle, catName, STATUS, sortProducts, fmtSold } from './catalog.js';
import { mountShopToggle, storeToShop, shopById, shopLabel, waShop, waOrderText } from './shop-choice.js';

const $ = (s, r = document) => r.querySelector(s);
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
  $('meta[name="description"]')?.setAttribute('content', p.desc || (hasPrice(p) ? `${p.name} dari Nurseri Lestari, ${priceText(p)}. Harga mengikuti etalase Shopee.` : `${p.name} dari Nurseri Lestari. Harganya tanya lewat WhatsApp.`));
  $('[data-crumbs]').insertAdjacentHTML('beforeend', `<li><a href="produk.html?kategori=${encodeURIComponent(p.category)}">${esc(cat)}</a></li><li aria-current="page">${esc(p.name)}</li>`);
  const photo = $('[data-photo]');
  photo.src = p.image; photo.alt = `${p.name}, foto dari etalase Tokopedia`;
  $('[data-title]').textContent = p.name;
  $('[data-cat]').textContent = cat;
  $('[data-price]').innerHTML = `${priceHTML(p, { long: true })}${p.priceBefore ? `<s class="price-before">${fmtPrice(p.priceBefore)}</s>` : ''}`;
  // the note under the price (2 Nov 2026, client: prices follow the Shopee etalase): a plain price, the lowest of several
  // variations ("Mulai"), or no Shopee listing yet, when the price is asked on WhatsApp
  const priceNote = $('[data-price-note]');
  if (priceNote) priceNote.textContent = !hasPrice(p) ? 'Belum ada di etalase Shopee kami. Tanya harganya ke admin lewat WhatsApp, dibalas di jam buka toko.'
    : p.priceFrom ? 'Harga termurah dari pilihan di etalase Shopee kami. Ukuran atau warna lain bisa beda harganya.'
    : 'Harga ngikut etalase Shopee kami, bisa berubah sewaktu-waktu.';
  // the status badge only when the product is not ready (159 of 160 are)
  const badge = $('[data-badge]');
  if (p.status && p.status !== 'ready') { badge.textContent = STATUS[p.status] || p.status; badge.classList.add(`badge-${p.status}`); badge.hidden = false; }
  // the buy buttons (panel and phone bar) follow the chosen shop: applyShop(), through the "Beli dari" pair below
  // D4 (1 Nov 2026, client): 32 products have no notes yet. The left column then carries one honest line and the WhatsApp pill
  // of the chosen shop (applyShop fills its href), never an invented note; the "Rincian." card on the right is the same for all
  $('[data-desc]').textContent = p.desc || 'Belum ada catatan dari toko untuk produk ini. Tanya stok dan detailnya ke admin lewat WhatsApp.';
  $('[data-ask]').hidden = !!p.desc;
  const tags = p.tags || [];
  if (tags.length) { $('[data-tags]').innerHTML = tags.map((t) => `<a class="tag" href="produk.html?q=${encodeURIComponent(t)}">${esc(t)}</a>`).join(''); $('[data-tags-wrap]').hidden = false; }
  $('[data-specs]').innerHTML = factRows(p, cat).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  if (p.care) { $('[data-care]').hidden = false; $('[data-care-text]').textContent = p.care; }
  // the bar's price column is 90-120 px wide on phones, so the price is the short HTML ("Mulai" on its own small line, css/catalog.css)
  $('[data-bar-name]').textContent = p.name; $('[data-bar-price]').innerHTML = priceHTML(p);
  // "Beli dari" (B2, 1 Nov 2026, client): the saved choice, else this product's own shop; every buy button follows it
  mountShopToggle($('[data-shop-choice]'), { product: p, onChange: (shop) => applyShop(p, shop) });
  related(p, cat);
  buyBar();
}

/* the three ways to buy, for the chosen shop. Tokopedia: the product's own listing when it belongs to that shop, else the
   shop's Tokopedia front with a note (a listing exists in one shop only; the other shop's stock is the admin's to answer).
   Shopee (2 Nov 2026, the prices follow the Shopee etalase): the product's own Shopee listing ("Beli di Shopee") when the data
   has one and the chosen shop owns it (p.shopeeShop, Cipete when unsaid), else the shop's Shopee front ("Cari di Shopee").
   WhatsApp: that shop's admin with the product and price in the message, asking for the price when there is none yet. The
   phone bar mirrors the panel. */
function applyShop(p, shop) {
  if (!shop) return;
  const home = shopById(storeToShop(p.store)), own = !home || home.id === shop.id;
  const tokopedia = own ? p.tokopedia : shop.tokopedia || p.tokopedia;
  const direct = !!p.shopee && shop.id === (p.shopeeShop || 'cipete');
  const shopee = direct ? p.shopee : shop.shopee || '';
  const shopeeLabel = direct ? 'Beli di Shopee' : 'Cari di Shopee';
  const wa = waShop(shop.id, waOrderText(p, shop));
  for (const sel of ['[data-tokopedia]', '[data-bar-tokopedia]']) { const a = $(sel); if (a) a.href = tokopedia; }
  for (const sel of ['[data-shopee]', '[data-bar-shopee]']) { const a = $(sel); if (!a) continue; a.href = shopee; a.hidden = !shopee; const t = a.querySelector('[data-shopee-label]'); if (t) t.textContent = shopeeLabel; else { a.setAttribute('aria-label', shopeeLabel); a.title = shopeeLabel; } }
  for (const sel of ['[data-wa-product]', '[data-bar-wa]']) { const a = $(sel); if (a) a.href = wa; }
  // the "Tanya admin" pill under the no-notes line asks, it does not order
  const ask = $('[data-ask-wa]');
  if (ask) ask.href = waShop(shop.id, `${((window.TL || {}).site || {}).waGreeting || ''}${p.name}${priceInText(p)} di ${shopLabel(shop)}, masih ada? Boleh minta detail produknya?${hasPrice(p) ? '' : ' Harganya berapa?'}`);
  const note = $('[data-stock-note]');
  if (note) { note.textContent = own ? '' : `Etalase Tokopedia-nya ada di ${shopLabel(home)}; stok di ${shopLabel(shop)}: tanya admin.`; note.hidden = own; }
  document.querySelectorAll('[data-shop-name]').forEach((el) => { el.textContent = shopLabel(shop); });
}

/* the "Rincian." rows every product has (category, which shop's Tokopedia listing, status, Tokopedia's sold count), then the
   product's own specs when the data has them. The status is a badge only when the product is not ready (159 of 160 are);
   the sold count keeps Tokopedia's "30+" cap and says "belum ada data" at zero rather than inventing a number; the rating is
   Tokopedia's too, so it rides on the same row */
function factRows(p, cat = catName(p.category)) {
  const ready = !p.status || p.status === 'ready', status = STATUS[p.status] || p.status || STATUS.ready;
  const sold = Number(p.sold) > 0 ? `${fmtSold(p.sold)} di Tokopedia${p.rating ? ` · ${icon('star-filled')} ${Number(p.rating).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` : ''}` : 'belum ada data';
  return [
    ['Kategori', `<a href="produk.html?kategori=${encodeURIComponent(p.category)}">${esc(cat)}</a>`],
    ['Etalase', esc(shopLabel(shopById(storeToShop(p.store))))],   // where the Tokopedia listing lives; the shop you buy from is the pair in the panel (B2)
    ['Status', ready ? esc(status) : `<span class="badge badge-${esc(p.status)}">${esc(status)}</span>`],
    ['Terjual', sold],
    ...Object.entries(p.specs || {}).filter(([, v]) => v != null && String(v).trim()).map(([k, v]) => [esc(k), esc(v)]),
  ];
}

/* four of the same tiles ("Yang mirip dari rak kami."): first the products that share a tag with this one (more shared tags
   first, then Tokopedia's sold count), filled from the same rack by sold count when fewer than two share a tag, and from the
   whole shop by sold count when the rack itself is short (the "lainnya" rack has three). Four on desktop, three on tablets
   (CSS hides the fourth), two by two on phones */
function relatedProducts(p, list = all, n = 4) {
  const others = list.filter((x) => x.id !== p.id), tags = new Set(p.tags || []);
  const shared = (x) => (x.tags || []).filter((t) => tags.has(t)).length;
  let picks = sortProducts(others.filter((x) => shared(x) > 0), 'terlaris').sort((a, b) => shared(b) - shared(a));
  if (picks.length < 2) picks = picks.concat(sortProducts(others.filter((x) => x.category === p.category && !picks.includes(x)), 'terlaris'));
  if (picks.length < n) picks = picks.concat(sortProducts(others.filter((x) => !picks.includes(x)), 'terlaris'));
  return picks.slice(0, n);
}

function related(p, cat) {
  const list = relatedProducts(p);
  if (!list.length) return;
  const rail = $('[data-rail]');
  rail.innerHTML = list.map((x) => tileHTML(x)).join('');
  $('[data-related-hint]').textContent = list.every((x) => x.category === p.category) ? `Dari rak ${cat}` : 'Dari rak kami';
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
