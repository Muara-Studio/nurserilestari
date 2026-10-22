/* Toko Lestari — js/contact.js (D): the contact form composes a WhatsApp message and opens it. No backend, nothing stored. */
import { waLink } from './util.js';

export const TOKO = { cipete: 'Cipete', bsd: 'Tangerang BSD', luar: 'Luar Jabodetabek' };
export const LINE = { cipete: 0, bsd: 1, luar: 0 }; // which WhatsApp number answers (util.js: line 0 Cipete, 1 Tangerang BSD)
export const composeMessage = ({ nama, toko, kebutuhan, pesan }) =>
  [`Halo Toko Lestari, saya ${String(nama).trim()}.`, `Toko terdekat: ${TOKO[toko] || toko}`, `Kebutuhan: ${kebutuhan}`, '', String(pesan).trim()].join('\n');
export const validate = {
  nama: (v) => v.trim().length >= 2 || 'Tulis nama panggilanmu.',
  pesan: (v) => v.trim().length >= 10 || 'Ceritakan sedikit lebih detail, minimal 10 karakter.',
};

function boot() {
  const site = window.TL && TL.site;
  document.querySelectorAll('[data-wa-line]').forEach((a) => { a.href = waLink('', +a.dataset.waLine); });
  const map = document.querySelector('[data-map]');
  if (map && site) map.src = site.locations[0].mapsEmbed;
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;
  const status = form.querySelector('[data-form-status]'), submit = form.querySelector('button[type="submit"]'), label = submit.innerHTML;
  const check = (name) => {
    const el = form.elements[name], res = validate[name](el.value), ok = res === true, field = el.closest('.field'), msg = field.querySelector('.error-msg');
    field.classList.toggle('is-invalid', !ok); el.setAttribute('aria-invalid', String(!ok));
    msg.hidden = ok; msg.textContent = ok ? '' : res;
    return ok;
  };
  Object.keys(validate).forEach((name) => {
    const el = form.elements[name];
    el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true') check(name); });
    el.addEventListener('blur', () => { if (el.value.trim()) check(name); });
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const bad = Object.keys(validate).filter((name) => !check(name));
    if (bad.length) { form.elements[bad[0]].focus(); return; }
    const f = Object.fromEntries(new FormData(form));
    const url = waLink(composeMessage(f), LINE[f.toko] ?? 0);
    submit.disabled = true; submit.textContent = 'Membuka WhatsApp…'; status.textContent = 'Membuka WhatsApp…';
    const w = window.open(url, '_blank');
    if (w) w.opener = null; else location.href = url; // why: a blocked pop-up still has to reach WhatsApp
    setTimeout(() => { submit.disabled = false; submit.innerHTML = label; status.textContent = 'Pesanmu sudah dibuka di WhatsApp.'; }, 1600);
  });
}
if (typeof document !== 'undefined') boot(); // why: node can import the composer for a check without a DOM
