/* Toko Lestari — js/layout.js (A). Classic script, runs before the modules: renders the shell (skip link, banner,
   header, drawer, footer, WhatsApp FAB) from TL.site into [data-layout], marks the current page, and opens the
   drawer with a native <dialog> so navigation works even if the CDN modules never arrive. */
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

  /* one big monstera leaf, flat vector: the temporary stand-in for B's assets/illus/footer-leaf.svg */
  const leaf = (cls = '') => `<svg class="${cls}" viewBox="0 0 800 800" aria-hidden="true" focusable="false"><g transform="rotate(-38 400 400)">
<path d="M400 70C300 70 150 150 130 320 110 500 260 700 400 740 540 700 690 500 670 320 650 150 500 70 400 70Z" fill="#7FB069"/>
<path d="M400 70C500 70 650 150 670 320 690 500 540 700 400 740Z" fill="#3E7D4B"/>
<path d="M400 85V735" stroke="#CFE3C3" stroke-width="9" stroke-linecap="round"/>
<path d="M400 230 290 300M400 360 270 450M400 490 290 580M400 230 510 300M400 360 530 450M400 490 510 580" stroke="#CFE3C3" stroke-width="4" stroke-linecap="round" opacity=".7"/>
<ellipse cx="305" cy="330" rx="20" ry="58" transform="rotate(-32 305 330)" fill="#0F4C46"/><ellipse cx="285" cy="470" rx="18" ry="52" transform="rotate(-38 285 470)" fill="#0F4C46"/>
<ellipse cx="495" cy="330" rx="20" ry="58" transform="rotate(32 495 330)" fill="#0F4C46"/><ellipse cx="515" cy="470" rx="18" ry="52" transform="rotate(38 515 470)" fill="#0F4C46"/>
<path d="M131 360 245 395 142 430ZM669 360 555 395 658 430ZM180 560 275 560 215 620Z" fill="#0F4C46"/>
<path d="M400 735v70" stroke="#3E7D4B" stroke-width="16" stroke-linecap="round"/>
<path d="M330 185q30-45 75-55" stroke="#F7F3EA" stroke-width="8" stroke-linecap="round" opacity=".35"/></g></svg>`;

  const header = `
<a class="skip-link" href="#main">Langsung ke konten</a>
<div class="site-banner"><p><span>Toko Lestari sekarang ada di Tokopedia &amp; Shopee. Sekitar Cipete gratis ongkir. <a href="produk.html">Belanja ${icon('arrow-right')}</a></span></p></div>
<header class="site-header" data-layout="header">
  <div class="container hdr-row">
    <div class="hdr-left">
      <button class="hdr-btn hdr-menu" type="button" aria-label="Buka menu" aria-haspopup="dialog" aria-controls="nav-drawer"><span class="hdr-bars" aria-hidden="true"><i></i><i></i></span></button>
      <nav class="nav-primary" aria-label="Navigasi utama"><ul>${navList()}</ul></nav>
    </div>
    <a class="site-logo wordmark" href="index.html"${cur('index.html')}>${icon('leaf', 'site-logo-leaf')}<span>Toko Lestari</span></a>
    <div class="hdr-right">
      <button class="hdr-btn hdr-search" type="button" aria-label="Cari produk" aria-haspopup="dialog">${icon('search')}</button>
      <a class="btn btn-fill btn-sm hdr-wa" href="${wa()}" ${ext} data-wa aria-label="Chat WhatsApp">${icon('brand-whatsapp')}<span class="hdr-wa-label">Chat WhatsApp</span></a>
    </div>
  </div>
</header>
<dialog class="nav-drawer on-dark" id="nav-drawer" aria-label="Menu" data-lenis-prevent>
  <div class="drawer-scroll">
    <div class="drawer-top"><span class="wordmark drawer-brand">Toko Lestari</span><button class="hdr-btn drawer-close" type="button" aria-label="Tutup menu">${icon('x', 'icon-lg')}</button></div>
    <nav class="drawer-nav" aria-label="Navigasi utama"><ul>${navList()}</ul></nav>
    <div class="drawer-actions">
      <a class="btn btn-fill" href="${wa()}" ${ext} data-wa>${icon('brand-whatsapp')}Chat WhatsApp</a>
      <a class="btn" href="${esc(loc.tokopedia)}" ${ext}>${icon('shopping-bag')}Belanja di Tokopedia</a>
    </div>
    <div class="drawer-info">
      <p>${icon('map-pin')}<span>${esc(loc.address)}</span></p>
      <p>${icon('clock')}<span>${esc(loc.hours)}</span></p>
    </div>
  </div>
  <div class="drawer-leaf sway sway-2" aria-hidden="true">${leaf()}</div>
</dialog>`;

  const ikuti = [
    [social.instagram && social.instagram.url, 'brand-instagram', 'Instagram'],
    [social.tiktok && social.tiktok.url, 'brand-tiktok', 'TikTok'],
    [loc.tokopedia, 'shopping-bag', 'Tokopedia Jakarta'],
    [bsd.tokopedia, 'shopping-bag', 'Tokopedia BSD'],
    [loc.shopee, 'brand-shopee', 'Shopee'],
  ].filter((r) => r[0]).map((r) => `<li><a href="${esc(r[0])}" ${ext}>${icon(r[1])}<span>${r[2]}</span></a></li>`).join('');

  const hubungi = [
    site.email ? `<li><a href="mailto:${esc(site.email)}">${icon('mail')}<span>${esc(site.email)}</span></a></li>` : '',
    ...phones.map((p, i) => `<li><a href="${wa(i)}" ${ext} data-wa data-wa-line="${i}">${icon('brand-whatsapp')}<span>${esc(p.display)}</span></a></li>`),
    loc.address ? `<li><a href="${esc(loc.maps || '#')}" ${ext}>${icon('map-pin')}<span>${esc(loc.address)}</span></a></li>` : '',
    loc.hours ? `<li><span class="footer-static">${icon('clock')}<span>${esc(loc.hours)}</span></span></li>` : '',
  ].join('');

  /* F1 (client note): the footer ground is a paper-cut of flat leaf silhouettes (assets/illus/footer-leaves.svg sprite,
     tinted with tokens in css/shell.css); the big monstera at the bottom-right is the one gesture that keeps a slow sway. */
  const sil = (name, cls, vb) => `<svg class="fl fl-${name} ${cls}" viewBox="0 0 ${vb}" aria-hidden="true" focusable="false"><use href="assets/illus/footer-leaves.svg#${name}"/></svg>`;
  const leaves = `<div class="footer-leaves" aria-hidden="true">${sil('palm', '', '1148 608')}${sil('adansonii', '', '497 858')}${sil('philo', '', '631 631')}${sil('monstera', 'sway', '873 873')}</div>`;

  const footer = `
<footer class="site-footer band-pine on-dark" data-layout="footer">
  ${leaves}
  <div class="container footer-grid">
    <div class="footer-lead">
      <h2 class="footer-title">Ngobrol sama kami</h2>
      <p class="footer-text">Mau tanya stok atau bingung pilih tanaman? Kirim WhatsApp saja, kami balas kalau toko lagi buka.</p>
      <a class="btn btn-fill" href="${wa()}" ${ext} data-wa>${icon('brand-whatsapp')}Chat WhatsApp</a>
    </div>
    <div class="footer-col"><h3 class="footer-h">Ikuti</h3><ul>${ikuti}</ul></div>
    <div class="footer-col footer-col-wide"><h3 class="footer-h">Hubungi</h3><ul>${hubungi}</ul></div>
    <p class="footer-legal">© ${year} Toko &amp; Nursery Lestari. Harga mengikuti etalase Tokopedia. Cetakan berbingkai di rak: litografi botani abad ke-19, domain publik.</p>
  </div>
</footer>
<a class="wa-fab" href="${wa()}" ${ext} data-wa aria-label="Chat WhatsApp">${icon('brand-whatsapp', 'icon-xl')}</a>`;

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
