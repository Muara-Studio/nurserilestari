/* Toko Lestari — js/layout.js (A2, v2 shell). Classic script, runs before the modules: renders the shell (skip link,
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
  const bsd = (site.locations || [])[1] || {};
  const social = site.social || {};
  const phones = site.whatsapp || [];
  const year = new Date().getFullYear();
  /* the header's glass follows the ground it floats over: dark glass on dark heroes (default), light glass on light pages */
  const tone = ((document.body && document.body.dataset.shell) || html.dataset.shell || 'dark') === 'light' ? 'light' : 'dark';
  const glass = tone === 'light' ? 'glass-light' : 'glass-dark on-dark';

  const header = `
<a class="skip-link" href="#main">Langsung ke konten</a>
<header class="site-header" data-layout="header" data-tone="${tone}">
  <div class="container hdr-wrap">
    <div class="hdr-bar ${glass}">
      <a class="site-logo wordmark" href="index.html"${cur('index.html')}>Toko Lestari</a>
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
    <div class="drawer-top"><span class="wordmark drawer-brand">Toko Lestari</span><button class="hdr-btn drawer-close" type="button" aria-label="Tutup menu">${icon('x', 'icon-lg')}</button></div>
    <nav class="drawer-nav" aria-label="Navigasi menu"><ul>${navList()}</ul></nav>
    <div class="drawer-actions">
      <a class="btn btn-fill" href="${wa()}" ${ext} data-wa>${icon('brand-whatsapp')}Chat WhatsApp</a>
      <a class="btn" href="${esc(loc.tokopedia)}" ${ext}>Belanja di Tokopedia${icon('arrow-up-right')}</a>
    </div>
    <div class="drawer-info">
      <p>${esc(loc.address)}</p>
      <p>${esc(loc.hours)}</p>
    </div>
  </div>
</dialog>`;

  const ikuti = [
    [social.instagram && social.instagram.url, 'Instagram'],
    [social.tiktok && social.tiktok.url, 'TikTok'],
    [loc.tokopedia, 'Tokopedia Jakarta'],
    [bsd.tokopedia, 'Tokopedia BSD'],
    [loc.shopee, 'Shopee'],
  ].filter((r) => r[0]).map((r) => `<li><a href="${esc(r[0])}" ${ext}>${r[1]}</a></li>`).join('');

  const hubungi = [
    site.email ? `<li><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></li>` : '',
    ...phones.map((p, i) => `<li><a href="${wa(i)}" ${ext} data-wa data-wa-line="${i}">WhatsApp ${esc(p.display)}</a></li>`),
    loc.address ? `<li><a href="${esc(loc.maps || '#')}" ${ext}>${esc(loc.address)}</a></li>` : '',
    loc.hours ? `<li><span class="footer-static">${esc(loc.hours)}</span></li>` : '',
  ].join('');

  /* footer (Moss-like, short): the closing sentence and the WhatsApp pill on the left, two plain columns on the right, one legal line */
  const footer = `
<footer class="site-footer band-moss on-dark" data-layout="footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-lead">
        <h2 class="footer-title">Mau tanya tanaman apa? <span class="alt">Kirim WhatsApp, kami balas kalau toko buka.</span></h2>
        <a class="btn btn-fill" href="${wa()}" ${ext} data-wa>${icon('brand-whatsapp')}Chat WhatsApp</a>
      </div>
      <div class="footer-cols">
        <div class="footer-col"><h3 class="footer-h">Ikuti</h3><ul>${ikuti}</ul></div>
        <div class="footer-col"><h3 class="footer-h">Hubungi</h3><ul>${hubungi}</ul></div>
      </div>
    </div>
    <div class="footer-legal">
      <p>© ${year} Toko &amp; Nursery Lestari.</p>
      <p>Harga mengikuti etalase Tokopedia.</p>
      <a class="link-u" href="NOTICES.md">Kredit foto</a>
    </div>
  </div>
</footer>
<a class="wa-fab glass-dark" href="${wa()}" ${ext} data-wa aria-label="Chat WhatsApp">${icon('brand-whatsapp', 'icon-xl')}</a>`;

  const slotH = document.querySelector('[data-layout="header"]');
  const slotF = document.querySelector('[data-layout="footer"]');
  if (slotH) slotH.outerHTML = header;
  if (slotF) slotF.outerHTML = footer;

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
