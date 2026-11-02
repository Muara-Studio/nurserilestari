/* Nurseri Lestari — js/shop-choice.js (B2, 1 Nov 2026, client round). One choice for the whole site: which shop the visitor
   buys from, Toko Cipete or Toko BSD. It lives in localStorage 'tl.shop' ('cipete' | 'bsd'), is made with a segmented pair of
   pills ("Beli dari"), and can be suggested from the visitor's position ("Pakai lokasiku": the nearest shop by great-circle
   distance to TL.site.locations[*].coords, read at runtime; a shop without coords is skipped). A shop picked by hand wins over
   the automatic suggestion; the button always applies it. The pure half (distance, nearest, wording) is exported for
   tests/shop.test.mjs: nothing here touches the DOM at import time, so Node can import it. */
import { esc, icon, hasPrice, priceInText } from './util.js';

export const KEY = 'tl.shop';      // the chosen shop id
const KEY_BY = 'tl.shop-by';       // how it was chosen: 'manual' (a pill) or 'lokasi' (the position suggestion)
const SKEY = 'tl.shop-geo';        // sessionStorage: the last suggestion, so the GPS is asked once per visit, not once per page

const site = () => (typeof window !== 'undefined' && window.TL && window.TL.site) || {};
export const shops = () => (site().locations || []).filter((l) => l && l.id);
export const shopById = (id) => shops().find((l) => l.id === id) || shops()[0] || null;
// data/products.js says "jakarta" for the Cipete shop
export const storeToShop = (store) => (store === 'bsd' ? 'bsd' : 'cipete');
// "Toko Cipete" / "Toko BSD": the location name without the brand in front of it
export const shopLabel = (l) => {
  const n = String((l && l.name) || ''), b = site().brand || site().name || '';
  return 'Toko ' + ((b && n.startsWith(b) ? n.slice(b.length) : n).trim() || (l && l.id) || '');
};
export const adminFor = (id) => { const w = site().whatsapp || []; return w.find((x) => x.shop === id) || w[0] || null; };
export const waShop = (id, text) => { const a = adminFor(id); return a ? `https://wa.me/${a.number}?text=${encodeURIComponent(text)}` : '#'; };
// the order message names the product, its price (or asks for it: a product not on Shopee yet has none) and the shop
export const waOrderText = (p, l) => `${site().waGreeting || ''}${p.name}${priceInText(p)} di ${shopLabel(l)}, masih ada?${hasPrice(p) ? '' : ' Berapa harganya?'} Kalau ada, saya mau pesan.`;

/* ---- pure: distance, nearest shop, wording ---- */
const R_KM = 6371, rad = (d) => (d * Math.PI) / 180;
export function haversineKm(a, b) {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}
const hasCoords = (l) => !!(l && l.coords && Number.isFinite(l.coords.lat) && Number.isFinite(l.coords.lng));
// { id, km, shop } of the nearest shop that has coords; null when none has (then there is nothing to suggest). Ties: the first.
export function nearestShop(point, list = shops()) {
  let best = null;
  for (const l of list) {
    if (!hasCoords(l)) continue;
    const km = haversineKm(point, l.coords);
    if (!best || km < best.km) best = { id: l.id, km, shop: l };
  }
  return best;
}
export const fmtKm = (km) => (km < 1 ? 'kurang dari 1 km' : `≈ ${Math.round(km).toLocaleString('id-ID')} km`);
export const suggestionText = (l, km) => `Sepertinya kamu lebih dekat ke ${shopLabel(l)} (${fmtKm(km)}).`;

/* ---- state: localStorage behind try/catch (private windows, blocked storage) ---- */
const ls = () => (typeof localStorage !== 'undefined' ? localStorage : null);
const ss = () => (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
const read = (k, s = ls()) => { try { return s ? s.getItem(k) : null; } catch { return null; } };
const write = (k, v, s = ls()) => { try { if (s) v == null ? s.removeItem(k) : s.setItem(k, v); } catch { /* storage blocked: the choice lives for this page only */ } };
const valid = (id) => !!id && shops().some((l) => l.id === id);
export const getChoice = () => { const id = read(KEY); return valid(id) ? id : null; };
export const choiceBy = () => read(KEY_BY);
// the saved choice, else the product's own shop, else the first shop (nothing is saved until the visitor picks)
export const resolveShop = (product) => getChoice() || (product ? storeToShop(product.store) : (shops()[0] || {}).id) || 'cipete';
const emit = (id, by) => { if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('tl:shop', { detail: { id, by } })); };
export function setChoice(id, by = 'manual') {
  if (!valid(id)) return;
  write(KEY, id); write(KEY_BY, by);
  emit(id, by);
}
const readGeo = () => { try { const g = JSON.parse(read(SKEY, ss()) || 'null'); return g && valid(g.id) && Number.isFinite(g.km) ? { id: g.id, km: g.km, shop: shopById(g.id) } : null; } catch { return null; } };

/* ---- the component: "Beli dari" + two pills + "Pakai lokasiku" + the one-line note. Pages ship this markup themselves (no
   layout shift when the module arrives) and mount() hydrates it; a container left empty gets it rendered ---- */
export const toggleHTML = (list = shops(), { hint = '' } = {}) => `
<div class="shop-choice__row">
  <span class="shop-choice__label" aria-hidden="true">Beli dari</span>
  <div class="shop-choice__seg" role="group" aria-label="Beli dari">${list.map((l) => `<button type="button" class="tag" data-shop="${esc(l.id)}" aria-pressed="false">${esc(shopLabel(l))}</button>`).join('')}</div>
  <button type="button" class="shop-locate" data-shop-locate>${icon('map-pin')}Pakai lokasiku</button>
</div>${hint ? `
<p class="shop-choice__hint">${esc(hint)}</p>` : ''}
<p class="shop-choice__note" data-shop-note aria-live="polite" hidden></p>`;

let storageSynced = false;
export function mountShopToggle(root, { product = null, onChange = null, hint = '' } = {}) {
  const list = shops();
  if (!root) return null;
  if (list.length < 2) { root.hidden = true; return null; }   // one shop: nothing to choose
  if (!root.querySelector('[data-shop]')) root.innerHTML = toggleHTML(list, { hint });
  const pills = [...root.querySelectorAll('[data-shop]')];
  pills.forEach((b) => { const l = shopById(b.dataset.shop); if (l && l.id === b.dataset.shop) b.textContent = shopLabel(l); });   // shipped markup: the labels still come from the data
  const locate = root.querySelector('[data-shop-locate]'), note = root.querySelector('[data-shop-note]');
  let current = resolveShop(product);

  const paint = () => pills.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.shop === current)));
  const say = (text) => { if (!note) return; note.textContent = text; note.hidden = !text; };
  const apply = (id, by) => { current = id; paint(); if (onChange) onChange(shopById(id), by); };

  pills.forEach((b, i) => {
    b.addEventListener('click', () => { if (b.dataset.shop !== current) setChoice(b.dataset.shop, 'manual'); });
    // arrows walk the pair like a radio group; Enter / Space are the button's own
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const n = pills[(i + (e.key === 'ArrowRight' ? 1 : pills.length - 1)) % pills.length];
      n.focus(); n.click();
    });
  });
  document.addEventListener('tl:shop', (e) => { if (e.detail && e.detail.id !== current) apply(e.detail.id, e.detail.by); else paint(); });
  // another tab picked a shop: follow it
  if (!storageSynced) { storageSynced = true; addEventListener('storage', (e) => { if (e.key === KEY && valid(e.newValue)) emit(e.newValue, 'storage'); }); }

  /* ---- position → nearest shop ---- */
  const suggest = (best, trigger) => {
    say(suggestionText(best.shop, best.km));
    if (locate) locate.hidden = true;   // the note takes the button's place: the suggestion is in
    // the button always applies; the automatic run only when the visitor has not picked a shop by hand
    if (trigger === 'button' || choiceBy() !== 'manual') { if (best.id !== current) setChoice(best.id, 'lokasi'); else write(KEY_BY, 'lokasi'); }
  };
  const find = (trigger) => {
    const cached = readGeo();
    if (cached) { suggest(cached, trigger); return; }
    if (typeof navigator === 'undefined' || !navigator.geolocation) { say('Browser ini nggak bisa baca lokasi. Pilih tokonya manual saja.'); return; }
    if (locate) locate.setAttribute('aria-busy', 'true');
    navigator.geolocation.getCurrentPosition((pos) => {
      if (locate) locate.removeAttribute('aria-busy');
      const best = nearestShop({ lat: pos.coords.latitude, lng: pos.coords.longitude }, list);
      if (!best) { say(''); if (locate) locate.hidden = true; return; }   // no shop has coords: nothing to suggest
      write(SKEY, JSON.stringify({ id: best.id, km: best.km }), ss());
      suggest(best, trigger);
    }, (err) => {
      if (locate) locate.removeAttribute('aria-busy');
      say(err && err.code === 1 ? 'Akses lokasi ditolak, nggak apa-apa. Pilih tokonya manual saja.' : 'Lokasimu belum terbaca. Pilih tokonya manual saja.');
    }, { maximumAge: 600000, timeout: 8000 });
  };
  if (locate) locate.addEventListener('click', () => find('button'));
  // on load: never a permission prompt. Only when the browser already granted it (Permissions API) or the suggestion is cached
  // for this visit, and only when the visitor has not picked a shop by hand
  const auto = async () => {
    if (choiceBy() === 'manual') return;
    if (readGeo()) { find('auto'); return; }
    try {
      if (typeof navigator === 'undefined' || !navigator.permissions || !navigator.geolocation) return;
      const st = await navigator.permissions.query({ name: 'geolocation' });
      if (st.state === 'granted') find('auto');
    } catch { /* no Permissions API: the button is there */ }
  };

  paint();
  if (onChange) onChange(shopById(current), 'init');
  auto();
  return { get current() { return current; }, set: (id) => setChoice(id) };
}
