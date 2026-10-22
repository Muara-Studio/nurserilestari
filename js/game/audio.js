/* Tunas & Hutan Lestari — audio.js. WebAudio only, everything synthesised; starts after the first gesture. */
let ac = null, master = null, muted = false, amb = null;

export function init() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ac = new AC(); master = ac.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(ac.destination);
}
export const ready = () => !!ac;
export function setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 0.55, ac.currentTime, 0.03); }
export const isMuted = () => muted;

function tone(type, f0, f1, dur, vol = 0.3, delay = 0) {
  if (!ac || muted) return;
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.03);
}
function noiseBuffer(sec) { const b = ac.createBuffer(1, ac.sampleRate * sec, ac.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; l = (l + 0.02 * w) / 1.02; d[i] = l * 3.5; } return b; }

export const bounce = () => tone('sine', 400, 660, 0.12, 0.22);
export const spring = () => { tone('sine', 300, 1000, 0.24, 0.28); tone('triangle', 600, 1400, 0.24, 0.12, 0.02); };
export const seed = () => { tone('sine', 880, 0, 0.09, 0.16); tone('sine', 1318, 0, 0.16, 0.16, 0.07); };
export const cluster = () => [0, 0.07, 0.14, 0.21, 0.28].forEach((d, i) => tone('sine', 784 * Math.pow(1.1892, i), 0, 0.14, 0.15, d));
export const stun = () => { tone('sawtooth', 340, 80, 0.4, 0.14); tone('square', 220, 60, 0.3, 0.06, 0.05); };
export const click = () => tone('square', 1100, 0, 0.035, 0.05);
export const buy = () => { tone('sine', 523, 0, 0.12, 0.18); tone('sine', 659, 0, 0.12, 0.18, 0.1); tone('sine', 784, 0, 0.22, 0.18, 0.2); };
export const badge = () => [0, 0.12, 0.24].forEach((d, i) => tone('triangle', [659, 880, 1318][i], 0, 0.3, 0.16, d));
export const fall = () => tone('sine', 520, 110, 1.1, 0.14);
export function rocket() {
  if (!ac || muted) return;
  const t = ac.currentTime, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuffer(1.4); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(180, t); f.frequency.exponentialRampToValueAtTime(2400, t + 1.1);
  g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
  s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + 1.4);
}
export function magnet() { tone('sine', 220, 440, 0.5, 0.1); tone('sine', 330, 660, 0.5, 0.08, 0.05); }

/* ambient: filtered brown noise (wind through leaves) + a slow detuned pad */
export function ambient(on) {
  if (!ac) return;
  if (on && !amb) {
    const t = ac.currentTime, g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 2); g.connect(master);
    const n = ac.createBufferSource(); n.buffer = noiseBuffer(4); n.loop = true; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; const ng = ac.createGain(); ng.gain.value = 0.16;
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.11; lg.gain.value = 0.07; lfo.connect(lg).connect(ng.gain);
    n.connect(lp).connect(ng).connect(g); n.start(t); lfo.start(t);
    const pad = ac.createGain(); pad.gain.value = 0.045; const plp = ac.createBiquadFilter(); plp.type = 'lowpass'; plp.frequency.value = 360; pad.connect(plp).connect(g);
    const oscs = [110, 164.8, 220.6].map((f, i) => { const o = ac.createOscillator(); o.type = i ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = i * 5; o.connect(pad); o.start(t); return o; });
    amb = { g, stop: () => { n.stop(); lfo.stop(); oscs.forEach((o) => o.stop()); } };
  } else if (!on && amb) {
    const a = amb; amb = null; const t = ac.currentTime; a.g.gain.setTargetAtTime(0.0001, t, 0.3); setTimeout(() => a.stop(), 1200);
  }
}
