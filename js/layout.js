/* Nurseri Lestari — js/layout.js (A2, v2 shell). Classic script, runs before the modules: renders the shell (skip link,
   the floating glass header, the drawer sheet, footer, WhatsApp FAB) from TL.site into [data-layout], marks the current
   page, and opens the drawer with a native <dialog> so navigation works even if the CDN modules never arrive.
   Pages pick the header glass with data-shell="dark|light" on <body> (or <html>); the default is dark. */
(function () {
  'use strict';
  const site = (window.TL && TL.site) || {};
  const html = document.documentElement;
  if (!html.classList.contains('reduced')) html.classList.add('motion'); // pre-hides [data-split] until main.js reveals it
  // shortcut: if main.js has not booted in 3 s (CDN down), show everything the engine would have revealed.
  setTimeout(function () { if (!html.classList.contains('booted')) { html.classList.remove('motion'); html.classList.add('no-js'); } }, 3000);

  /* local copies of util.js helpers (this is a classic script, it cannot import) */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="assets/icons/sprite.svg#i-${name}"/></svg>`;
  const wa = (line = 0, text = '') => {
    const w = (site.whatsapp || [])[line] || { number: '' };
    return `https://wa.me/${w.number}?text=${encodeURIComponent(text || (site.waGreeting || '') + 'produk dan ketersediaannya.')}`;
  };
  const ext = 'target="_blank" rel="noopener"';
  const file = (location.pathname.split('/').pop() || 'index.html').replace('-detail', '');
  const cur = (href) => (href === file ? ' aria-current="page"' : '');
  const nav = site.nav || [];
  const navList = () => nav.map((n, i) => `<li style="--i:${i}"><a href="${esc(n.href)}"${cur(n.href)}>${esc(n.label)}</a></li>`).join('');
  const loc = (site.locations || [])[0] || {};
  const social = site.social || {};
  const phones = site.whatsapp || [];
  const year = new Date().getFullYear();
  /* the header's glass follows the ground it floats over: dark glass on dark heroes (default), light glass on light pages */
  const tone = ((document.body && document.body.dataset.shell) || html.dataset.shell || 'dark') === 'light' ? 'light' : 'dark';
  const glass = tone === 'light' ? 'glass-light' : 'glass-dark on-dark';
  /* the brand is the client's logo in the header lockup (971×169, the wordmark reads at ~20px when 3rem tall): colour emblem +
     dark-green wordmark on light bars, white emblem + sage wordmark on dark bars (the client wants the logogram white on
     green/dark grounds); phones (≤ 639px) get the emblem alone, a 2.5rem square (shell.css). Both tones are in the DOM from the
     start and the header's data-tone shows one of them (shell.css): swapping src at a tone flip aborted the image still in
     flight (ERR_ABORTED on kontak, jury of 1 Nov). The off-tone picture is lazy, so it is only fetched once it is shown, and a
     picture with display none is out of the accessibility tree, so the link is named by the one showing */
  const logoSrc = (t) => (t === 'light' ? 'assets/brand/logo-header.webp' : 'assets/brand/logo-header-white.webp');
  const markSrc = (t) => (t === 'light' ? 'assets/brand/logo-mark.webp' : 'assets/brand/logo-mark-white.webp');
  const logoPic = (t, shown) => `<picture class="site-logo-pic logo-${t}"><source media="(max-width: 639px)" srcset="${markSrc(t)}"><img class="site-logo-img" src="${logoSrc(t)}" alt="Nurseri Lestari" width="971" height="169" decoding="async"${shown ? '' : ' loading="lazy"'}></picture>`;
  const logo = (t) => logoPic('dark', t === 'dark') + logoPic('light', t === 'light');

  const header = `
<a class="skip-link" href="#main">Langsung ke konten</a>
<header class="site-header" data-layout="header" data-tone="${tone}">
  <div class="container hdr-wrap">
    <div class="hdr-bar ${glass}">
      <a class="site-logo" href="index.html"${cur('index.html')}>${logo(tone)}</a>
      <nav class="nav-primary" aria-label="Navigasi utama"><ul>${navList()}</ul></nav>
      <div class="hdr-right">
        <button class="hdr-btn hdr-search" type="button" aria-label="Cari produk" aria-haspopup="dialog">${icon('search')}</button>
        <a class="btn btn-fill btn-sm hdr-wa" href="${wa()}" ${ext} data-wa aria-label="Chat WhatsApp">${icon('brand-whatsapp')}<span class="hdr-wa-label">Chat WhatsApp</span></a>
        <button class="hdr-btn hdr-menu" type="button" aria-label="Buka menu" aria-haspopup="dialog" aria-controls="nav-drawer">${icon('menu-2')}</button>
      </div>
    </div>
  </div>
</header>
<dialog class="nav-drawer glass-dark on-dark" id="nav-drawer" aria-label="Menu" data-lenis-prevent>
  <div class="drawer-scroll">
    <div class="drawer-top"><span class="drawer-brand"><img class="site-logo-img" src="assets/brand/logo-full-white.webp" alt="Nurseri Lestari" width="1171" height="357" decoding="async" loading="lazy"></span><button class="hdr-btn drawer-close" type="button" aria-label="Tutup menu">${icon('x', 'icon-lg')}</button></div>
    <nav class="drawer-nav" aria-label="Navigasi menu"><ul>${navList()}</ul></nav>
    <div class="drawer-actions">
      <a class="btn btn-fill" href="${wa()}" ${ext} data-wa>${icon('brand-whatsapp')}Chat WhatsApp</a>
      <a class="btn" href="${esc(loc.tokopedia)}" ${ext}>Belanja di Tokopedia${icon('arrow-up-right')}</a>
    </div>
    <div class="drawer-info">${(site.locations || []).map((l) => `<p>${esc(String(l.name || '').replace(/^Nurseri Lestari\s*/i, '') || l.shortName)} · Buka ${esc(l.hours)}</p>`).join('')}</div>
  </div>
</dialog>`;

  /* footer (S2): one admin pill per shop, the two shops as quiet rows (hours + Google Maps, never the long address),
     the marketplaces and socials as one row of pills, one legal line. Every label comes from TL.site. */
  const locs = site.locations || [];
  const waPills = phones.map((p, i) => `<a class="btn btn-fill" href="${wa(i)}" ${ext} data-wa data-wa-line="${i}">${icon('brand-whatsapp')}${esc(p.label || 'WhatsApp ' + p.display)}</a>`).join('');
  const shops = locs.map((l) => `<li class="footer-shop">
        <div class="footer-shop-text"><h3 class="footer-shop-name">${esc(l.name)}</h3>${l.hours ? `<p class="footer-shop-hours">Buka ${esc(l.hours)}</p>` : ''}</div>
        ${l.maps ? `<a class="btn btn-sm" href="${esc(l.maps)}" ${ext}>${icon('map-pin')}Cek di Google Maps</a>` : ''}
      </li>`).join('');
  const links = [
    ...(site.marketplaces || []).map((m) => [m.url, m.name]),
    [social.instagram && social.instagram.url, 'Instagram'],
    [social.tiktok && social.tiktok.url, 'TikTok'],
  ].filter((r) => r[0]).map((r) => `<li><a class="tag" href="${esc(r[0])}" ${ext}>${esc(r[1])}</a></li>`).join('');

  const footer = `
<footer class="site-footer band-moss on-dark" data-layout="footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-lead">
        <h2 class="footer-title">Mau tanya tanaman apa? <span class="alt">Kirim WhatsApp ke admin toko terdekat, kami balas kalau toko buka.</span></h2>
        <div class="footer-wa">${waPills}</div>
      </div>
      <ul class="footer-shops" aria-label="Dua toko kami">${shops}</ul>
    </div>
    <ul class="footer-links" aria-label="Etalase dan media sosial">${links}</ul>
    <p class="footer-legal"><span>© ${year} Nurseri Lestari</span><span class="footer-sep" aria-hidden="true">·</span><span>Harga mengikuti etalase Tokopedia dan Shopee</span><span class="footer-sep" aria-hidden="true">·</span><a class="link-u" href="NOTICES.md">Kredit foto</a></p>
  </div>
</footer>
<a class="wa-fab glass-dark" href="${wa()}" ${ext} data-wa aria-label="Chat WhatsApp">${icon('brand-whatsapp', 'icon-xl')}</a>`;

  const slotH = document.querySelector('[data-layout="header"]');
  const slotF = document.querySelector('[data-layout="footer"]');
  if (slotH) slotH.outerHTML = header;
  if (slotF) slotF.outerHTML = footer;

  /* the bar's tone follows the band under it (dark glass over moss, light glass over paper), so both tints can stay light
     enough to show the blur: the probe reads the band at the bar's resting mid-line on every scrolled frame (S2) */
  const hdr = document.querySelector('.site-header');
  const bar = hdr && hdr.querySelector('.hdr-bar');
  const bands = Array.from(document.querySelectorAll('main > section, main > div, main > article'))
    .map((el) => ({ el, tone: el.matches('.band-paper, .band-paper-3, .on-light') ? 'light' : el.matches('.band-moss, .on-dark') ? 'dark' : '' }))
    .filter((b) => b.tone);
  let shown = tone;
  const setTone = (t) => {
    if (t === shown) return;
    shown = t;
    hdr.dataset.tone = t;
    bar.classList.toggle('glass-light', t === 'light');
    bar.classList.toggle('glass-dark', t === 'dark');
    bar.classList.toggle('on-dark', t === 'dark');   /* the logo follows data-tone in shell.css: nothing is re-requested */
  };
  const probe = () => {
    const y = parseFloat(getComputedStyle(hdr).top) + bar.offsetHeight / 2;   /* the resting mid-line, whatever the step-aside translate is doing */
    let t = tone;
    for (const b of bands) { const r = b.el.getBoundingClientRect(); if (r.top <= y && r.bottom > y) { t = b.tone; break; } }
    setTone(t);
  };
  if (bar && bands.length) {
    let queued = false;
    const onScroll = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; probe(); }); };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
    probe();
    setTimeout(() => { const o = tone === 'light' ? 'dark' : 'light'; new Image().src = matchMedia('(max-width: 639px)').matches ? markSrc(o) : logoSrc(o); }, 2500);   /* warm the other tone's picture (lazy until shown) so the first flip does not flash */
  }

  /* drawer: native <dialog> (focus trap, Esc, inert page); main.js listens to tl:drawer to pause Lenis */
  const drawer = document.getElementById('nav-drawer');
  const menuBtn = document.querySelector('.hdr-menu');
  const say = (open) => { html.classList.toggle('menu-open', open); document.dispatchEvent(new CustomEvent('tl:drawer', { detail: { open } })); };
  if (drawer && menuBtn && typeof drawer.showModal === 'function') {
    menuBtn.addEventListener('click', () => { drawer.showModal(); say(true); });
    drawer.querySelector('.drawer-close').addEventListener('click', () => drawer.close());
    drawer.addEventListener('click', (e) => { if (e.target.closest('a[href]')) drawer.close(); });
    drawer.addEventListener('close', () => say(false));
  }
})();
