import { describe, expect, it } from 'vitest';
import { bestOnBoard, canContinue, check, combine, createRound, opsLeft, outcomeOf, reset, traceSteps, undo } from './round';
import type { Puzzle } from './types';

const puzzle: Puzzle = { numbers: [2, 5, 6, 8, 9, 45], target: 354 };
// slot indeksleri: 0→2, 1→5, 2→6, 3→8, 4→9, 5→45

describe('round engine', () => {
  it('puts the result into the second slot and frees the first', () => {
    let s = createRound(puzzle);
    s = combine(s, 5, '*', 3, 1000); // 45 × 8
    expect(s.slots.map((t) => t?.value ?? null)).toEqual([2, 5, 6, 360, 9, null]);
    expect(s.steps).toHaveLength(1);
    expect(s.slots[3]?.base).toBe(false);
  });

  it('enforces the original rules: no negative subtraction, exact division only', () => {
    const s = createRound(puzzle);
    expect(check(s, 0, '-', 1)).toEqual({ ok: false, reason: 'negative' }); // 2 − 5
    expect(check(s, 1, '-', 1)).toEqual({ ok: false, reason: 'same' });
    expect(check(s, 5, '/', 3)).toEqual({ ok: false, reason: 'fraction' }); // 45 ÷ 8
    expect(check(s, 5, '/', 4)).toEqual({ ok: true, value: 5 }); // 45 ÷ 9
    expect(check(s, 1, '-', 1)).toEqual({ ok: false, reason: 'same' });
    expect(check(s, 3, '-', 3)).toEqual({ ok: false, reason: 'same' });
    // a − b with a == b is allowed (gives 0), like the original game
    const eq = createRound({ numbers: [1, 2, 3, 4, 5, 5], target: 100 });
    expect(check(eq, 4, '-', 5)).toEqual({ ok: true, value: 0 });
  });

  it('does not change state on invalid combine', () => {
    const s = createRound(puzzle);
    expect(combine(s, 0, '-', 1, 0)).toBe(s);
  });

  it('keeps the closest result even after undo and reset', () => {
    let s = createRound(puzzle);
    s = combine(s, 5, '*', 3, 1000); // 360 (fark 6)
    s = combine(s, 3, '-', 2, 2000); // 354 (tam)
    expect(s.best).toMatchObject({ value: 354, diff: 0, atMs: 2000 });
    s = undo(s);
    expect(s.slots.map((t) => t?.value ?? null)).toEqual([2, 5, 6, 360, 9, null]);
    expect(s.best?.value).toBe(354);
    s = reset(s);
    expect(s.slots.map((t) => t?.value ?? null)).toEqual(puzzle.numbers);
    expect(s.steps).toHaveLength(0);
    expect(s.best?.value).toBe(354);
  });

  it('only replaces best when strictly closer (earliest wins ties)', () => {
    let s = createRound({ numbers: [1, 2, 3, 4, 5, 50], target: 100 });
    s = combine(s, 5, '+', 4, 100); // 55 → fark 45
    const first = s.best;
    s = undo(s);
    s = combine(s, 4, '+', 5, 500); // 55 again
    expect(s.best).toBe(first);
  });

  it('respects the operation limit', () => {
    let s = createRound(puzzle, 1);
    expect(opsLeft(s)).toBe(1);
    s = combine(s, 0, '+', 1, 0);
    expect(opsLeft(s)).toBe(0);
    expect(check(s, 2, '+', 3)).toEqual({ ok: false, reason: 'limit' });
    expect(canContinue(s)).toBe(false);
    s = undo(s);
    expect(opsLeft(s)).toBe(1);
  });

  it('traces only the steps that contribute to a result', () => {
    let s = createRound(puzzle);
    s = combine(s, 0, '+', 1, 0); // 2 + 5 = 7 (alakasız)
    s = combine(s, 5, '*', 3, 0); // 45 × 8 = 360
    s = combine(s, 3, '-', 2, 0); // 360 − 6 = 354
    const target = s.slots[2]!;
    expect(traceSteps(s.steps, target.id)).toEqual([
      { a: 45, op: '*', b: 8, result: 360 },
      { a: 360, op: '-', b: 6, result: 354 },
    ]);
    expect(s.best?.steps).toHaveLength(2);
  });

  it('tells whether the closest result is still on the board', () => {
    let s = createRound(puzzle);
    expect(bestOnBoard(s)).toBe(false);
    s = combine(s, 5, '*', 3, 0); // 45 × 8 = 360 (en yakın)
    s = combine(s, 0, '+', 1, 0); // 2 + 5 = 7 (alakasız)
    expect(bestOnBoard(s)).toBe(true);
    s = undo(s);
    expect(bestOnBoard(s)).toBe(true);
    s = undo(s);
    expect(bestOnBoard(s)).toBe(false);
    expect(s.best?.value).toBe(360);
    s = combine(s, 5, '*', 3, 0); // aynı işlem yeniden yapılınca yine tahtada
    expect(bestOnBoard(s)).toBe(true);
    expect(bestOnBoard(reset(s))).toBe(false);
  });

  it('builds an outcome from the best result', () => {
    let s = createRound(puzzle);
    expect(outcomeOf(s, 5000, 'timeout')).toEqual({
      value: null,
      diff: null,
      reachedAtMs: null,
      endedAtMs: 5000,
      steps: [],
      reason: 'timeout',
    });
    s = combine(s, 5, '*', 3, 1200);
    expect(outcomeOf(s, 3000, 'submit')).toMatchObject({ value: 360, diff: 6, reachedAtMs: 1200, endedAtMs: 3000 });
  });

  it('can combine a zero result like any other number', () => {
    let s = createRound({ numbers: [1, 2, 3, 4, 5, 5], target: 100 });
    s = combine(s, 4, '-', 5, 0); // 5 − 5 = 0 → slot 5
    expect(s.slots[5]?.value).toBe(0);
    expect(check(s, 5, '+', 0)).toEqual({ ok: true, value: 1 });
  });
});

describe('puzzle codes', () => {
  it('round-trips and rejects invalid puzzles', async () => {
    const { encodePuzzle, decodePuzzle } = await import('./rules');
    expect(encodePuzzle(puzzle)).toBe('2-5-6-8-9-45-354');
    expect(decodePuzzle('9-5-6-8-2-45-354')).toEqual(puzzle);
    expect(decodePuzzle('2-2-6-8-9-45-354')).toBeNull(); // tekrar eden rakam
    expect(decodePuzzle('2-5-6-8-9-450-354')).toBeNull(); // büyük sayı aralık dışı
    expect(decodePuzzle('2-5-6-8-9-45-99')).toBeNull(); // hedef aralık dışı
    expect(decodePuzzle('abc')).toBeNull();
    expect(decodePuzzle(null)).toBeNull();
  });
});
