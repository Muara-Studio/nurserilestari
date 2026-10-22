/* Toko Lestari — js/main.js (A). The motion engine on one clock: Lenis driven by the GSAP ticker, ScrollTrigger in
   sync, [data-reveal] through IntersectionObserver, [data-split] through SplitText, a header that steps aside,
   [data-wa] links, the WhatsApp FAB, the footer leaf, and the search overlay. Other modules may
   `import { onScroll, refresh } from './main.js'` or read `TL.motion`. */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger.js';
import { SplitText } from 'gsap/SplitText.js';
import Lenis from 'lenis';
import { waLink, reduced } from './util.js';
import { initSearch } from './search.js';

gsap.registerPlugin(ScrollTrigger, SplitText);
const html = document.documentElement;
const RM = reduced();
let lenis = null;

/* ---- scroll feed: { y, v } from Lenis, or native scroll under reduced motion ---- */
const scrollFns = new Set();
const scroll = { y: scrollY, v: 0 };
const feed = (y, v) => { scroll.v = v == null ? y - scroll.y : v; scroll.y = y; scrollFns.forEach((fn) => fn(scroll)); };
export const onScroll = (fn) => { scrollFns.add(fn); return () => scrollFns.delete(fn); };
export const getLenis = () => lenis;
let refreshCall = null;
export const refresh = () => { refreshCall?.kill(); refreshCall = gsap.delayedCall(0.08, () => ScrollTrigger.refresh()); };

function initScroll() {
  if (RM) { addEventListener('scroll', () => feed(scrollY), { passive: true }); return; }
  lenis = new Lenis({ lerp: 0.1, autoRaf: false, anchors: { offset: -88 } });
  lenis.on('scroll', (l) => { ScrollTrigger.update(); feed(l.scroll, l.velocity); });
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---- header steps aside on the way down, comes back on the way up ---- */
function initHeader() {
  let last = scroll.y;
  if (!RM) onScroll(({ y }) => {
    if (Math.abs(y - last) < 4) return;
    html.classList.toggle('hdr-away', y > last && y > 160);
    last = y;
  });
  document.addEventListener('tl:drawer', (e) => (e.detail.open ? lenis?.stop() : lenis?.start()));
}

/* ---- reveals: IntersectionObserver adds .is-in once; base.css owns the transition ---- */
let io = null;
function observeReveals(root = document) {
  const els = root.querySelectorAll('[data-reveal]:not(.is-in):not([data-seen])');
  if (!els.length) return 0;
  if (RM || !('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-in')); return els.length; }
  io ??= new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach((el) => { el.dataset.seen = ''; io.observe(el); });
  return els.length;
}

/* ---- split headlines: lines rise from a clip and settle (back.out mirrors --ease-settle) ---- */
function splitHeadings(root = document) {
  const els = root.querySelectorAll('[data-split]:not([data-split-seen])');
  els.forEach((el) => {
    el.dataset.splitSeen = '';
    if (RM) { el.style.visibility = 'visible'; return; }
    const done = { v: false };
    SplitText.create(el, {
      type: 'lines', mask: 'lines', autoSplit: true, linesClass: 'split-line',
      onSplit(self) {
        gsap.set(el, { visibility: 'visible' });
        if (done.v) return;
        return gsap.from(self.lines, {
          yPercent: 112, duration: 1, stagger: 0.09, ease: 'back.out(1.1)', delay: +(el.dataset.delay || 0) * 0.08,
          onComplete: () => { done.v = true; }, scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        });
      },
    });
  });
  return els.length;
}

/* ---- [data-wa]: a WhatsApp link with the greeting; data-wa="full message", data-wa-line="1" for Tangerang BSD ---- */
function wireWA(root = document) {
  root.querySelectorAll('[data-wa]:not([data-wa-seen])').forEach((el) => {
    el.dataset.waSeen = '';
    const msg = el.getAttribute('data-wa') || '';
    const keep = !msg && /wa\.me/.test(el.getAttribute('href') || ''); // a page already composed its own link
    const url = keep ? el.getAttribute('href') : waLink(msg, +(el.dataset.waLine || 0));
    if (el.tagName === 'A') { el.href = url; el.target = '_blank'; el.rel = 'noopener'; }
    else el.addEventListener('click', () => open(url, '_blank', 'noopener'));
  });
}

/* ---- FAB hides while the footer (which has its own button) is on screen ---- */
function initFab() {
  const fab = document.querySelector('.wa-fab'), footer = document.querySelector('.site-footer');
  if (!fab || !footer || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(([en]) => fab.classList.toggle('is-hidden', en.isIntersecting), { threshold: 0.15 }).observe(footer);
}

/* ---- the big leaf drifts up as the footer arrives ---- */
function initFooter() {
  const leaf = document.querySelector('.footer-leaf');
  if (!leaf || RM) return;
  gsap.fromTo(leaf, { y: 110 }, { y: -40, ease: 'none', scrollTrigger: { trigger: '.site-footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });
}

/* ---- content rendered later (catalog, tips, search) gets the same treatment ---- */
function scan(root = document) { const n = observeReveals(root) + splitHeadings(root); wireWA(root); if (n) refresh(); }
function watch() {
  let pending = false;
  new MutationObserver(() => { if (pending) return; pending = true; gsap.delayedCall(0.05, () => { pending = false; scan(); }); })
    .observe(document.body, { childList: true, subtree: true });
}

initScroll();
initHeader();
scan();
initFab();
initFooter();
initSearch({ onOpen: () => lenis?.stop(), onClose: () => lenis?.start() });
watch();
html.classList.add('booted');
addEventListener('load', refresh);
document.fonts?.ready.then(refresh);
window.TL = window.TL || {};
TL.motion = { gsap, ScrollTrigger, onScroll, refresh, getLenis, scan };
