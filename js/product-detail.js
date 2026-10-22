/* Toko Lestari — js/product-detail.js (C). One product by ?id=, four related tiles on a shelf, the phone buy bar. */
import { fmtPrice, esc, icon, waLink, param } from './util.js';
import { tileHTML, settle, waProduct, catName, STATUS, STORE, sortProducts } from './catalog.js';

// no gsap here: the tile's arrival is a CSS keyframe (catalog.css .pd__tile), so nothing on this page waits for the CDN
const $ = (s, r = document) => r.querySelector(s);
const site = (window.TL || {}).site || {};
const all = (window.TL || {}).products || [];
const product = all.find((x) => x.id === param('id'));

if (product) show(product); else missing();

function missing() {
  const h1 = $('[data-title]');
  $('[data-pd]').hidden = true;
  const box = $('[data-missing]');
  box.hidden = false;
  h1.textContent = 'Yang ini nggak ada di rak.'; // keep the page's one h1 in the visible section
  box.prepend(h1);
  $('[data-missing-wa]').href = waLink();
  document.title = 'Produk tidak ditemukan — Toko Lestari';
}

function show(p) {
  const cat = catName(p.category);
  document.title = `${p.name} — Toko Lestari`;
  $('meta[name="description"]')?.setAttribute('content', p.desc || `${p.name} dari Toko Lestari, ${fmtPrice(p.price)}. Harga mengikuti etalase Tokopedia.`);
  $('[data-crumbs]').insertAdjacentHTML('beforeend', `<li><a href="produk.html?kategori=${encodeURIComponent(p.category)}">${esc(cat)}</a></li><li aria-current="page">${esc(p.name)}</li>`);
  const photo = $('[data-photo]');
  photo.src = p.image; photo.alt = `${p.name}, foto dari etalase Tokopedia`;
  $('[data-title]').textContent = p.name;
  $('[data-cat]').textContent = cat;
  $('[data-tags]').innerHTML = (p.tags || []).map((t) => `<a class="tag" href="produk.html?q=${encodeURIComponent(t)}">${esc(t)}</a>`).join('');
  $('[data-price]').innerHTML = `${fmtPrice(p.price)}${p.priceBefore ? `<s class="price-before">${fmtPrice(p.priceBefore)}</s>` : ''}`;
  const badge = $('[data-badge]');
  badge.textContent = STATUS[p.status] || p.status; badge.classList.add(`badge-${p.status}`);
  $('[data-tokopedia]').href = p.tokopedia; $('[data-wa-product]').href = waProduct(p);
  $('[data-desc]').textContent = p.desc || '';
  const loc = (site.locations || []).find((l) => l.id === (p.store === 'bsd' ? 'bsd' : 'cipete'));
  const specs = [
    ['Kategori', `<a href="produk.html?kategori=${encodeURIComponent(p.category)}">${esc(cat)}</a>`],
    ['Toko', esc((loc && loc.shortName) || STORE[p.store] || '')],
    ['Status', esc(STATUS[p.status] || p.status)],
    ...Object.entries(p.specs || {}).map(([k, v]) => [esc(k), esc(v)]),
  ];
  if (p.sold) specs.push(['Terjual', `${p.sold}${p.rating ? ` · ${icon('star-filled')} ${p.rating.toFixed(1)}` : ''}`]);
  $('[data-specs]').innerHTML = specs.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  if (p.care) { $('[data-care]').hidden = false; $('[data-care-text]').textContent = p.care; }
  $('[data-bar-name]').textContent = p.name; $('[data-bar-price]').textContent = fmtPrice(p.price);
  $('[data-bar-tokopedia]').href = p.tokopedia; $('[data-bar-wa]').href = waProduct(p);
  related(p, cat);
  buyBar();
}

// one shelf of the same tiles: four on desktop, three on tablets (CSS hides the fourth), two by two on phones
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

// the bar appears once the main buttons scroll away, and hides again over the footer
function buyBar() {
  const bar = $('[data-buy-bar]'), cta = $('[data-cta]');
  if (!bar || !cta || !('IntersectionObserver' in window)) return;
  let ctaGone = false, footerIn = false;
  const apply = () => { const on = ctaGone && !footerIn; bar.classList.toggle('is-on', on); document.documentElement.classList.toggle('buy-bar-on', on); };
  new IntersectionObserver(([e]) => { ctaGone = !e.isIntersecting && e.boundingClientRect.top < 0; apply(); }).observe(cta);
  const footer = document.querySelector('.site-footer');
  if (footer) new IntersectionObserver(([e]) => { footerIn = e.isIntersecting; apply(); }).observe(footer);
}
