/* Nurseri Lestari — js/landing.js v2 (L2, 31 Oct 2026; L3, 1 Nov 2026). The landing's data and its one control: the moving band
   (items duplicated once so the -50 % loop closes, a pause button), the three rack cards' product counts from TL.products, four
   featured tiles (the most sold first) through tileHTML from js/catalog.js, the three latest tips from TL.tips, the Shopee links
   and admin labels from TL.site, this browser's game record. Reveals are main.js's ([data-reveal] is rescanned after every
   render). No gsap here: the hero has nothing to settle, and the page must read even if the CDN modules never come. */
import { esc, reduced } from './util.js';
import { tileHTML } from './catalog.js';

const data = () => window.TL || {};
const n = (x) => Number(x || 0).toLocaleString('id-ID');

/* ---- band: clone the items once (decorative, hidden from readers); the button toggles .is-paused and says what it does ---- */
function initBand() {
  const band = document.querySelector('[data-band]');
  const track = band?.querySelector('.marquee-track');
  const btn = document.querySelector('[data-band-pause]');
  if (!band || !track) return;
  for (const li of [...track.children]) {
    const c = li.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');
    track.appendChild(c);
  }
  if (!btn) return;
  if (reduced()) { btn.hidden = true; return; }   // base.css already stops the drift; nothing to pause
  const use = btn.querySelector('use');
  btn.addEventListener('click', () => {
    const paused = band.classList.toggle('is-paused');
    btn.setAttribute('aria-pressed', String(paused));
    btn.setAttribute('aria-label', paused ? 'Jalankan lagi' : 'Jeda gerakan');
    use?.setAttribute('href', `assets/icons/sprite.svg#i-player-${paused ? 'play' : 'pause'}`);
  });
}

/* ---- rack counts: data-count="id [id]" from TL.products; a card that spans two categories names both numbers, so the
   figure on the landing matches the count the filtered catalog will show (it can take one kategori at a time) ---- */
function countRacks() {
  const all = data().products || [];
  document.querySelectorAll('[data-count]').forEach((el) => {
    const ids = el.dataset.count.split(/\s+/).filter(Boolean);
    const labels = (el.dataset.labels || '').split(',').map((s) => s.trim());
    const counts = ids.map((id) => all.filter((p) => p.category === id).length);
    el.textContent = ids.length === 1 ? `${n(counts[0])} produk` : counts.map((c, i) => `${n(c)} ${labels[i] || ids[i]}`).join(' · ');
  });
}

/* ---- featured: the shop's picks (`featured` in data/products.js), the most sold first (`sold` is the Tokopedia card count,
   30 meaning "30+"), ties by rating then name; four tiles, each with the tile's CTA pill ---- */
const bySold = (a, b) => (b.sold || 0) - (a.sold || 0) || (b.rating || 0) - (a.rating || 0) || String(a.name).localeCompare(String(b.name), 'id');
function renderFeatured() {
  const ul = document.querySelector('[data-featured]');
  const all = data().products || [];
  const cats = data().categories || [];
  if (!ul || !all.length) return;
  const pick = all.filter((p) => p.featured).sort(bySold).slice(0, 4);
  ul.innerHTML = pick.map((p, i) => tileHTML(p, { cats, reveal: true, delay: i, cta: true })).join('');
}

/* ---- from the data file: the two Shopee storefronts behind the facts card's links, the admin labels on the closing pills ---- */
function fillSite() {
  const site = data().site || {};
  document.querySelectorAll('[data-shopee]').forEach((a) => {
    const loc = (site.locations || []).find((l) => l.id === a.dataset.shopee);
    if (loc && loc.shopee) a.href = loc.shopee;
  });
  document.querySelectorAll('[data-wa-label]').forEach((el) => {
    const w = (site.whatsapp || [])[Number(el.dataset.waLabel)];
    if (w && w.label) el.textContent = w.label;
  });
}

/* ---- the game card: this browser's own record when it has one (js/game/store.js keeps it under localStorage 'tl.game',
   metres climbed and trees planted); nothing is shown otherwise, and private mode just stays quiet ---- */
function playRecord() {
  const el = document.querySelector('[data-play-record]');
  if (!el) return;
  try {
    const s = JSON.parse(localStorage.getItem('tl.game') || 'null');
    const trees = (s && Array.isArray(s.trees)) ? s.trees.length : 0;
    const record = s ? Number(s.record) || 0 : 0;
    if (!record && !trees) return;
    const parts = [];
    if (record) parts.push(`rekor ${n(record)} m`);
    if (trees) parts.push(`${n(trees)} pohon ditanam`);
    el.textContent = `Di browser ini: ${parts.join(' · ')}.`;
    el.hidden = false;
  } catch { /* no storage: no record to show */ }
}

/* ---- tips: the three latest (TL.tips is newest first); the Instagram image, or the drawn illustration on a moss mat ---- */
function renderTips() {
  const ul = document.querySelector('[data-tips]');
  const tips = (data().tips || []).slice(0, 3);
  if (!ul || !tips.length) return;
  ul.innerHTML = tips.map((t, i) => {
    const src = t.image || t.illus;
    return `
<li data-reveal data-delay="${i + 1}">
  <a class="note-card" href="tips-detail.html?id=${encodeURIComponent(t.id)}">
    <span class="photo photo-hover note-photo${t.image ? '' : ' is-illus'}">${src ? `<img src="${esc(src)}" alt="" width="640" height="480" loading="lazy" decoding="async">` : ''}</span>
    <h3>${esc(t.title)}</h3>
    <span class="meta">${esc(t.topic)} · ${n(t.readTime)} menit baca</span>
  </a>
</li>`;
  }).join('');
}

/* ---- the hero slideshow (H3): the six photos stacked in the circle. Every --hero-hold (read from the circle's own custom
   property, so CSS and JS share one number) the next photo is decoded first, then fades in over the one showing (CSS: .is-active
   over .is-leaving, both drifting) and the old one is dropped once that fade is done; the photo after that is warmed during the
   hold. The timer stops while the tab is hidden or the circle is scrolled out of view, and never starts under reduced motion,
   where the CSS leaves only the first photo. The stack is aria-hidden: nothing is announced ---- */
function initHeroSlides() {
  const wrap = document.querySelector('[data-hero-slides]');
  const slides = wrap ? [...wrap.querySelectorAll('.hero-slide')] : [];
  if (!wrap || slides.length < 2 || reduced()) return;
  const ms = (name, fallback) => {   // "5000ms" or "5s"
    const v = getComputedStyle(wrap.parentElement).getPropertyValue(name).trim();
    const x = parseFloat(v);
    return x > 0 ? (v.endsWith('ms') ? x : x * 1000) : fallback;
  };
  const hold = ms('--hero-hold', 5000);
  const fade = ms('--hero-fade', 1200);
  let cur = slides.find((s) => s.classList.contains('is-active')) || slides[0];
  let i = slides.indexOf(cur);
  let timer = 0;
  let inView = true;
  const paused = () => document.hidden || !inView;
  const ready = (img) => new Promise((res) => {   // loaded and decoded before it is ever shown, so the fade never reveals a blank
    const done = () => img.decode().then(() => res(true), () => res(img.naturalWidth > 0));
    if (img.complete && img.naturalWidth) { done(); return; }
    img.loading = 'eager';   // a lazy photo the browser has not asked for yet
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', () => res(false), { once: true });
  });
  const schedule = () => {
    if (timer || paused()) return;
    timer = setTimeout(step, hold);
    ready(slides[(i + 1) % slides.length]);   // warm the next photo during the hold
  };
  const stop = () => { clearTimeout(timer); timer = 0; };
  async function step() {
    timer = 0;
    const ni = (i + 1) % slides.length;
    const next = slides[ni];
    const ok = await ready(next);
    if (paused()) return;   // went hidden or out of view while decoding: sync() restarts the hold
    i = ni;
    if (!ok || next === cur) { schedule(); return; }   // a photo that will not load is skipped on the next tick
    const old = cur;
    cur = next;
    old.classList.replace('is-active', 'is-leaving');
    next.classList.add('is-active');
    setTimeout(() => old.classList.remove('is-leaving'), fade + 80);
    schedule();
  }
  const sync = () => (paused() ? stop() : schedule());
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }).observe(wrap);
  schedule();
}

/* ---- the hero's entrance: its link and chip sit in the bottom 8 % of a 100svh hero, inside the reveal observer's margin,
   so at some viewport heights they never faded in. The first screen is on screen by definition: reveal it after the
   first paint (two frames, so the opacity transition still runs); the CSS delays keep the stagger ---- */
function revealHero() {
  requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll('.hero [data-reveal]').forEach((el) => el.classList.add('is-in'))));
}

initBand();
initHeroSlides();
revealHero();
countRacks();
renderFeatured();
renderTips();
fillSite();
playRecord();

/* if the motion engine never boots (the CDN modules unreachable), the reveals must not keep the page invisible */
setTimeout(() => { if (!data().motion) document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in')); }, 2500);
