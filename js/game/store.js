/* Tunas & Hutan Lestari — store.js (pure). Game catalogue and localStorage['tl.game'] persistence; storage is injected. No DOM. */
export const KEY = 'tl.game';
export const BOARD_MAX = 10;
export const MAX_TREES = 8;
export const WITHER_MS = 3 * 864e5;

export const BONUSES = [
  { id: 'parasut', name: 'Parasut Daun', price: 30, desc: 'Saat jatuh pertama kali, si Tunas melayang 3 detik ke dahan berikutnya.' },
  { id: 'roket', name: 'Roket Pot', price: 60, desc: 'Tekan ↑ sekali: meluncur 40 m ke atas.' },
  { id: 'magnet', name: 'Magnet Benih', price: 45, desc: 'Tekan ↑: benih di sekitar tertarik selama 15 detik.' },
  { id: 'nyawa', name: 'Nyawa Ekstra', price: 80, desc: 'Selamat dari satu kali jatuh.' },
  { id: 'ganda', name: 'Pengganda ×2', price: 50, desc: 'Benih dua kali lipat sepanjang permainan ini.' }
];
export const TREES = [
  { id: 'mangga', name: 'Mangga', price: 40 },
  { id: 'rambutan', name: 'Rambutan', price: 60 },
  { id: 'jambu', name: 'Jambu Air', price: 45, risky: true },
  { id: 'kelapa', name: 'Kelapa', price: 90 },
  { id: 'beringin', name: 'Beringin', price: 160 },
  { id: 'mahoni', name: 'Mahoni', price: 80, risky: true },
  { id: 'cemara', name: 'Cemara', price: 110 },
  { id: 'trembesi', name: 'Trembesi', price: 100, risky: true }
];
export const BADGES = [
  { id: 'pendaki50', name: 'Pendaki 50 m', desc: 'Mencapai 50 m dalam satu permainan.' },
  { id: 'pendaki200', name: 'Pendaki 200 m', desc: 'Mencapai 200 m dalam satu permainan.' },
  { id: 'pemetik100', name: 'Pemetik 100 benih', desc: 'Mengumpulkan 100 benih seluruhnya.' },
  { id: 'tanpaluka', name: 'Tanpa Luka', desc: 'Satu permainan minimal 20 m tanpa tersentuh serangga.' },
  { id: 'penanam', name: 'Penanam', desc: 'Menanam pohon pertama di Hutanku.' }
];

export const defaults = () => ({ record: 0, seeds: 0, seedsTotal: 0, bonuses: {}, trees: [], board: [], badges: [], tutorialSeen: false, muted: false, name: '', lastPlayed: 0, runs: 0 });

export function load(storage) {
  try { const raw = storage && storage.getItem(KEY); const s = raw ? JSON.parse(raw) : null; return s && typeof s === 'object' ? { ...defaults(), ...s } : defaults(); }
  catch { return defaults(); }
}
export function save(storage, s) { try { storage && storage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode: play without persistence */ } return s; }

/* a run ended: record, seeds, badges. Board entries are added separately once a name is known. */
export function finishRun(s, { m, seeds, hits }, now = Date.now()) {
  const badges = [...s.badges], newBadges = [];
  const award = (id) => { if (!badges.includes(id)) { badges.push(id); newBadges.push(id); } };
  const seedsTotal = s.seedsTotal + seeds;
  if (m >= 50) award('pendaki50');
  if (m >= 200) award('pendaki200');
  if (seedsTotal >= 100) award('pemetik100');
  if (hits === 0 && m >= 20) award('tanpaluka');
  const state = { ...s, record: Math.max(s.record, m), seeds: s.seeds + seeds, seedsTotal, badges, lastPlayed: now, runs: (s.runs || 0) + 1 };
  return { state, newBadges, qualifies: qualifies(s, m) };
}
export const qualifies = (s, m) => m > 0 && (s.board.length < BOARD_MAX || m > s.board[s.board.length - 1].m);
export function addToBoard(s, name, m, now = Date.now()) {
  const board = [...s.board, { name: String(name || 'Tunas').slice(0, 24), m, at: now }].sort((a, b) => b.m - a.m || a.at - b.at).slice(0, BOARD_MAX);
  return { ...s, board, name: String(name || '').slice(0, 24) };
}
export function buyBonus(s, id) {
  const b = BONUSES.find((x) => x.id === id);
  if (!b || s.bonuses[id] || s.seeds < b.price) return null;
  return { ...s, seeds: s.seeds - b.price, bonuses: { ...s.bonuses, [id]: true } };
}
export function useBonus(s, id) { const bonuses = { ...s.bonuses }; delete bonuses[id]; return { ...s, bonuses }; }
export function buyTree(s, id, now = Date.now()) {
  const t = TREES.find((x) => x.id === id);
  if (!t || s.seeds < t.price || s.trees.length >= MAX_TREES) return null;
  const state = { ...s, seeds: s.seeds - t.price, trees: [...s.trees, { id, at: now, risky: !!t.risky, withered: false }] };
  const newBadges = [];
  if (!state.badges.includes('penanam')) { state.badges = [...state.badges, 'penanam']; newBadges.push('penanam'); }
  return { state, newBadges };
}
/* risky trees wither when the player stays away for more than three days */
export function wither(s, now = Date.now()) {
  if (!s.lastPlayed || now - s.lastPlayed <= WITHER_MS) return { state: s, withered: [] };
  const withered = s.trees.filter((t) => t.risky && !t.withered);
  if (!withered.length) return { state: s, withered };
  return { state: { ...s, trees: s.trees.map((t) => (t.risky ? { ...t, withered: true } : t)) }, withered };
}
