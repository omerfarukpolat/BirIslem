import { describe, expect, it } from 'vitest';
import { dailyKey, dailyNumber, msUntilNextDaily, previousKey } from './daily';
import { dailyPuzzle } from './dailyPuzzle';
import { isValidPuzzle } from './rules';
import { solve } from './solver';

describe('daily puzzle', () => {
  it('switches at midnight Turkey time (UTC+3)', () => {
    expect(dailyKey(Date.parse('2026-09-26T20:59:59Z'))).toBe('2026-09-26');
    expect(dailyKey(Date.parse('2026-09-26T21:00:00Z'))).toBe('2026-09-27');
    expect(msUntilNextDaily(Date.parse('2026-09-26T20:59:00Z'))).toBe(60_000);
  });

  it('numbers days from launch', () => {
    expect(dailyNumber('2026-09-26')).toBe(1);
    expect(dailyNumber('2026-10-26')).toBe(31);
    expect(previousKey('2026-10-01')).toBe('2026-09-30');
  });

  it('is deterministic, valid and exactly solvable', () => {
    for (const key of ['2026-09-26', '2026-09-27', '2027-01-01', '2028-02-29']) {
      const p = dailyPuzzle(key);
      expect(dailyPuzzle(key)).toEqual(p);
      expect(isValidPuzzle(p)).toBe(true);
      expect(new Set(p.numbers.slice(0, 5)).size).toBe(5);
      const s = solve(p.numbers, p.target)!;
      expect(s.diff).toBe(0);
      expect(s.steps.length).toBeGreaterThanOrEqual(3);
    }
    expect(dailyPuzzle('2026-09-26')).not.toEqual(dailyPuzzle('2026-09-27'));
  });
});
