/* Toko Lestari — js/util.js (lead-owned). Small shared helpers; import what you need. */
const S = () => (window.TL && TL.site) || {};
export const fmtPrice = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="assets/icons/sprite.svg#i-${name}"/></svg>`;
/* WhatsApp deep link with the greeting; line 0 = Cipete, 1 = Tangerang BSD */
export const waLink = (text = '', line = 0) => {
  const wa = (S().whatsapp || [])[line] || { number: '' };
  const msg = text || (S().waGreeting || '') + 'produk dan ketersediaannya.';
  return `https://wa.me/${wa.number}?text=${encodeURIComponent(msg)}`;
};
export const param = (k) => new URLSearchParams(location.search).get(k);
export const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
export const loadImage = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.decoding = 'async'; i.src = src; });
export const onIdle = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 1));
export const reduced = () => document.documentElement.classList.contains('reduced');
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
