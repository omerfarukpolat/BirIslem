import { describe, expect, it } from 'vitest';
import { applyOp, generatePuzzle, mulberry32, OPS } from './rules';
import { solve } from './solver';
import type { SimpleStep } from './types';

/** Budamasız, sıra gözetmeyen bağımsız çözücü: yalnızca en küçük farkı bulur. */
function oracleBestDiff(numbers: number[], target: number, maxOps: number): number {
  let best = Infinity;
  const seen = new Set<string>();
  const go = (nums: number[], depth: number) => {
    if (depth >= maxOps) return;
    const key = nums.slice().sort((a, b) => a - b).join(',');
    if (seen.has(key)) return;
    seen.add(key);
    for (let i = 0; i < nums.length; i++) {
      for (let j = 0; j < nums.length; j++) {
        if (i === j) continue;
        for (const op of OPS) {
          const v = applyOp(nums[i], op, nums[j]);
          if (v === null) continue;
          best = Math.min(best, Math.abs(target - v));
          go([...nums.filter((_, k) => k !== i && k !== j), v], depth + 1);
        }
      }
    }
  };
  go(numbers, 0);
  return best;
}

/** Çözüm adımlarının kurallara uyduğunu ve eldeki sayılarla yapılabildiğini doğrular. */
function replay(numbers: number[], steps: SimpleStep[]): number {
  const pool = numbers.slice();
  let last = NaN;
  for (const s of steps) {
    for (const v of [s.a, s.b]) {
      const at = pool.lastIndexOf(v);
      expect(at, `${v} havuzda yok`).toBeGreaterThanOrEqual(0);
      pool.splice(at, 1);
    }
    const r = applyOp(s.a, s.op, s.b);
    expect(r).toBe(s.result);
    pool.push(s.result);
    last = s.result;
  }
  return last;
}

describe('solver', () => {
  it('finds a known exact solution with the fewest operations', () => {
    const s = solve([2, 5, 6, 8, 9, 45], 360);
    expect(s).toMatchObject({ value: 360, diff: 0 });
    expect(s!.steps).toEqual([{ a: 45, op: '*', b: 8, result: 360 }]);
  });

  it('returns replayable, rule-abiding steps', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 150; i++) {
      const p = generatePuzzle(rng);
      const s = solve(p.numbers, p.target)!;
      expect(replay(p.numbers, s.steps)).toBe(s.value);
      expect(Math.abs(p.target - s.value)).toBe(s.diff);
    }
  });

  it('matches an unpruned brute-force search on the best distance', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 60; i++) {
      const p = generatePuzzle(rng);
      const nums = p.numbers.slice(0, 4).concat(p.numbers[5]); // 5 sayı: oracle hızlı kalsın
      for (const maxOps of [1, 2, 4]) {
        const s = solve(nums, p.target, maxOps)!;
        expect(s.diff, `${nums} → ${p.target} (≤${maxOps})`).toBe(oracleBestDiff(nums, p.target, maxOps));
        expect(s.steps.length).toBeLessThanOrEqual(maxOps);
      }
    }
  });

  it('matches brute force on full six-number puzzles', () => {
    const rng = mulberry32(2026);
    for (let i = 0; i < 4; i++) {
      const p = generatePuzzle(rng);
      expect(solve(p.numbers, p.target)!.diff).toBe(oracleBestDiff(p.numbers, p.target, 5));
    }
  });

  it('respects the operation limit', () => {
    const s = solve([1, 2, 3, 4, 5, 10], 997, 2)!;
    expect(s.steps.length).toBeLessThanOrEqual(2);
    expect(replay([1, 2, 3, 4, 5, 10], s.steps)).toBe(s.value);
  });
});
