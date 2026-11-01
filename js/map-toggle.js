/* Nurseri Lestari — js/map-toggle.js (T2, 1 Nov 2026). One lazy Google Maps frame shows either shop: the pills
   ([data-map-pick="<location id>"], aria-pressed) swap the iframe src between TL.site.locations[*].mapsEmbed, the
   "Buka di Google Maps" link ([data-map-link]) follows the active shop, and [data-map-note] explains a search-only
   embed (the BSD shop has no exact pin yet). Used by tentang.html and js/contact.js. */
const hasPin = (src) => /-?\d+\.\d+,\s*-?\d+\.\d+/.test(src || ''); // coordinates = a real pin; a text query = a search result

export function initMapToggle(root = document) {
  const site = window.TL && TL.site, frame = root.querySelector('[data-map]');
  if (!site || !frame || !Array.isArray(site.locations) || !site.locations.length) return null;
  const picks = [...root.querySelectorAll('[data-map-pick]')];
  const link = root.querySelector('[data-map-link]'), note = root.querySelector('[data-map-note]');
  const show = (id) => {
    const l = site.locations.find((x) => x.id === id) || site.locations[0];
    if (frame.getAttribute('src') !== l.mapsEmbed) frame.src = l.mapsEmbed; // why: re-setting the same src would reload the map
    frame.title = `Peta lokasi ${l.name}`;
    if (link) link.href = l.maps || l.mapsEmbed;
    if (note) {
      const text = hasPin(l.mapsEmbed) ? '' : `Titik pastinya belum ada di peta, ini hasil pencarian Google Maps. Alamat lengkap ${l.name}: tanya admin lewat WhatsApp.`;
      note.textContent = text; note.hidden = !text;
    }
    picks.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mapPick === l.id)));
    return l;
  };
  picks.forEach((b) => b.addEventListener('click', () => show(b.dataset.mapPick)));
  const first = picks.find((b) => b.getAttribute('aria-pressed') === 'true');
  return show(first ? first.dataset.mapPick : site.locations[0].id);
}
