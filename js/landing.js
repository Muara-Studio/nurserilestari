/* Toko Lestari — js/landing.js (B). The hero's one driver (scroll velocity → leaf tilt), the props settling in on load,
   the featured price tags from TL.products and the Instagram grid. Reveals and splits are A's (main.js rescans). */
import { gsap } from 'gsap';
import { onScroll } from './main.js';
import { esc, icon, reduced, clamp } from './util.js';
import { tileHTML } from './catalog.js';   // the shelf tile shared with the catalog and the detail page (C2, 22 Oct)

const RM = reduced();
const html = document.documentElement;

/* ---- featured: 8 tiles standing on shelves. One product per category first, in the shop's own category order
   (plants first), then the next featured items, so the shelf shows the whole shop (P1, 22 Oct) ---- */
function renderFeatured() {
  const rak = document.querySelector('[data-featured]');
  const all = (window.TL && TL.products) || [];
  if (!rak || !all.length) return;
  const catList = (window.TL && TL.categories) || [];
  const feat = all.filter((p) => p.featured);
  const pick = [];
  for (const c of catList) { const p = feat.find((x) => x.category === c.id); if (p) pick.push(p); }
  for (const p of feat) if (pick.length < 8 && !pick.includes(p)) pick.push(p);
  rak.innerHTML = pick.slice(0, 8).map((p, i) => tileHTML(p, { cats: catList, reveal: true, delay: i % 4 })).join('');
}

/* ---- Instagram: six posts; the section only appears once the first thumbnail actually loads ---- */
function renderInstagram() {
  const sec = document.querySelector('[data-ig]');
  const grid = document.querySelector('[data-ig-grid]');
  const site = (window.TL && TL.site) || {};
  const codes = (site.instagramPosts || []).slice(0, 6);
  if (!sec || !grid || !codes.length) return;
  grid.innerHTML = codes.map((c, i) => `
<li><a class="ig-post" href="https://www.instagram.com/p/${esc(c)}/" target="_blank" rel="noopener" aria-label="Lihat unggahan Instagram @nurseri.lestari">
  <img src="assets/img/ig/${esc(c)}.jpg" alt="" width="640" height="640" loading="lazy" decoding="async">${icon('brand-instagram')}</a></li>`).join('');
  const first = new Image();
  first.onload = () => { sec.hidden = false; TL.motion?.refresh(); };
  first.onerror = () => sec.remove();
  first.src = `assets/img/ig/${codes[0]}.jpg`;
  grid.querySelectorAll('img').forEach((img) => img.addEventListener('error', () => img.closest('li').remove()));
}

/* ---- hero intro: letters rise a touch, props settle onto the planks in reading order ---- */
function heroIntro() {
  const props = gsap.utils.toArray('.hero .prop');
  if (RM || !props.length) { html.classList.add('hero-ready'); return; }
  gsap.set(props, { y: -42, autoAlpha: 0, rotation: (i) => (i % 2 ? 5 : -5) });
  html.classList.add('hero-ready');
  gsap.timeline({ defaults: { ease: 'back.out(1.5)' } })
    .from('.hero .shelf-letters', { y: 22, duration: .9, stagger: .11, ease: 'back.out(1.1)' }, 0)
    .to(props, { y: 0, autoAlpha: 1, rotation: 0, duration: .85, stagger: { each: .055, from: 'start' }, clearProps: 'transform,opacity,visibility' }, .18);
}

/* ---- the single driver: scroll velocity tilts every plant through --tilt (±2°, per-plant --k) ---- */
function heroTilt() {
  const hero = document.querySelector('.hero');
  if (RM || !hero) return;
  let aim = 0, cur = 0;
  onScroll(({ v }) => { aim = clamp(v / 48, -1, 1); });
  const tick = () => {
    const r = gsap.ticker.deltaRatio();
    aim *= Math.pow(.9, r);                       // velocity fades back to rest
    cur += (aim - cur) * (1 - Math.pow(.86, r));
    hero.style.setProperty('--tilt', `${(cur * -2).toFixed(3)}deg`);
  };
  new IntersectionObserver(([en]) => (en.isIntersecting ? gsap.ticker.add(tick) : gsap.ticker.remove(tick))).observe(hero);
}

renderFeatured();
renderInstagram();
heroIntro();
heroTilt();
