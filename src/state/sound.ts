import { soundOn } from './settings';

/**
 * Kısa, yumuşak sentez sesler. AudioContext ilk kullanıcı etkileşiminde
 * oluşturulur (tarayıcılar öncesine izin vermez).
 */
type Voice = { f: number; at?: number; dur?: number; type?: OscillatorType; gain?: number; to?: number };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function audio(): AudioContext | null {
  if (!soundOn.value) return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function play(voices: Voice[]) {
  const ac = audio();
  if (!ac || !master) return;
  const now = ac.currentTime + 0.005;
  for (const v of voices) {
    const start = now + (v.at ?? 0);
    const dur = v.dur ?? 0.08;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = v.type ?? 'sine';
    osc.frequency.setValueAtTime(v.f, start);
    if (v.to) osc.frequency.exponentialRampToValueAtTime(v.to, start + dur);
    const peak = v.gain ?? 0.18;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g).connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }
}

export const sfx = {
  pick: () => play([{ f: 740, dur: 0.05, gain: 0.12 }]),
  op: () => play([{ f: 520, dur: 0.06, type: 'triangle', gain: 0.16 }]),
  combine: () =>
    play([
      { f: 440, dur: 0.07, type: 'triangle', gain: 0.14 },
      { f: 660, at: 0.06, dur: 0.09, type: 'triangle', gain: 0.14 },
    ]),
  nope: () => play([{ f: 190, dur: 0.12, type: 'triangle', gain: 0.2, to: 150 }]),
  undo: () => play([{ f: 600, dur: 0.08, type: 'triangle', gain: 0.12, to: 420 }]),
  tick: () => play([{ f: 1200, dur: 0.025, type: 'square', gain: 0.04 }]),
  go: () => play([{ f: 880, dur: 0.14, gain: 0.16 }]),
  count: () => play([{ f: 587, dur: 0.1, gain: 0.14 }]),
  exact: () =>
    play([
      { f: 523.25, dur: 0.12 },
      { f: 659.25, at: 0.09, dur: 0.12 },
      { f: 783.99, at: 0.18, dur: 0.12 },
      { f: 1046.5, at: 0.27, dur: 0.3, gain: 0.2 },
    ]),
  end: () =>
    play([
      { f: 659.25, dur: 0.12, type: 'triangle' },
      { f: 523.25, at: 0.1, dur: 0.22, type: 'triangle' },
    ]),
};

export function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* desteklenmiyor */
  }
}
