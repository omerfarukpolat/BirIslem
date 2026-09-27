import { applyOp } from './rules';
import type { FinishReason, Op, Puzzle, RoundOutcome, SimpleStep, Step, Tile } from './types';

/**
 * Bir turun saf durumu. Sayılar 6 sabit yuvada durur:
 * iki sayı birleştirildiğinde sonuç ikinci sayının yuvasına yazılır,
 * birinci sayının yuvası boşalır. Böylece kullanılan sayı tekrar seçilemez
 * ve sonuç yeni bir sayı olarak kullanılabilir.
 */
export interface RoundState {
  readonly puzzle: Puzzle;
  /** 0 = sınırsız */
  readonly opLimit: number;
  readonly slots: readonly (Tile | null)[];
  readonly steps: readonly Step[];
  readonly nextId: number;
  readonly best: Best | null;
}

/** Tur boyunca ulaşılan en yakın sonuç. Geri al / baştan al bunu silmez. */
export interface Best {
  value: number;
  diff: number;
  atMs: number;
  steps: SimpleStep[];
}

export type CheckFail = 'same' | 'empty' | 'negative' | 'fraction' | 'limit';
export type CheckResult = { ok: true; value: number } | { ok: false; reason: CheckFail };

export function createRound(puzzle: Puzzle, opLimit = 0): RoundState {
  return {
    puzzle,
    opLimit,
    slots: puzzle.numbers.map((value, id) => ({ id, value, base: true })),
    steps: [],
    nextId: puzzle.numbers.length,
    best: null,
  };
}

export function opsLeft(state: RoundState): number {
  return state.opLimit > 0 ? Math.max(0, state.opLimit - state.steps.length) : Infinity;
}

export function activeCount(state: RoundState): number {
  return state.slots.reduce((n, t) => (t ? n + 1 : n), 0);
}

/** Oyuncunun yapabileceği başka işlem kaldı mı? */
export function canContinue(state: RoundState): boolean {
  return opsLeft(state) > 0 && activeCount(state) >= 2;
}

export function check(state: RoundState, aSlot: number, op: Op, bSlot: number): CheckResult {
  if (aSlot === bSlot) return { ok: false, reason: 'same' };
  const a = state.slots[aSlot];
  const b = state.slots[bSlot];
  if (!a || !b) return { ok: false, reason: 'empty' };
  if (opsLeft(state) <= 0) return { ok: false, reason: 'limit' };
  const value = applyOp(a.value, op, b.value);
  if (value === null) return { ok: false, reason: op === '-' ? 'negative' : 'fraction' };
  return { ok: true, value };
}

/** İki sayıyı birleştirir. Geçersiz işlemde durumu aynen döndürür. */
export function combine(state: RoundState, aSlot: number, op: Op, bSlot: number, atMs: number): RoundState {
  const res = check(state, aSlot, op, bSlot);
  if (!res.ok) return state;
  const a = state.slots[aSlot]!;
  const b = state.slots[bSlot]!;
  const result: Tile = { id: state.nextId, value: res.value, base: false };
  const step: Step = { op, a, b, result, aSlot, bSlot };
  const slots = state.slots.slice();
  slots[aSlot] = null;
  slots[bSlot] = result;
  const steps = [...state.steps, step];

  const diff = Math.abs(state.puzzle.target - res.value);
  const best =
    state.best === null || diff < state.best.diff
      ? { value: res.value, diff, atMs, steps: traceSteps(steps, result.id) }
      : state.best;

  return { ...state, slots, steps, nextId: state.nextId + 1, best };
}

export function undo(state: RoundState): RoundState {
  const last = state.steps[state.steps.length - 1];
  if (!last) return state;
  const slots = state.slots.slice();
  slots[last.aSlot] = last.a;
  slots[last.bSlot] = last.b;
  return { ...state, slots, steps: state.steps.slice(0, -1) };
}

/** Tüm işlemleri geri alır; en yakın sonuç korunur. */
export function reset(state: RoundState): RoundState {
  if (state.steps.length === 0) return state;
  return {
    ...state,
    slots: state.puzzle.numbers.map((value, id) => ({ id, value, base: true })),
    steps: [],
  };
}

/** Bir sonuca katkıda bulunan adımları (sırasıyla) çıkarır. */
export function traceSteps(steps: readonly Step[], tileId: number): SimpleStep[] {
  const byResult = new Map<number, Step>();
  for (const s of steps) byResult.set(s.result.id, s);
  const out: Step[] = [];
  const visit = (id: number) => {
    const s = byResult.get(id);
    if (!s || out.includes(s)) return;
    visit(s.a.id);
    visit(s.b.id);
    out.push(s);
  };
  visit(tileId);
  out.sort((x, y) => x.result.id - y.result.id);
  return out.map(toSimple);
}

export function toSimple(s: Step): SimpleStep {
  return { a: s.a.value, op: s.op, b: s.b.value, result: s.result.value };
}

export function outcomeOf(state: RoundState, endedAtMs: number, reason: FinishReason): RoundOutcome {
  const best = state.best;
  return {
    value: best ? best.value : null,
    diff: best ? best.diff : null,
    reachedAtMs: best ? best.atMs : null,
    endedAtMs,
    steps: best ? best.steps : [],
    reason,
  };
}
