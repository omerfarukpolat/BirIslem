import { describe, expect, it } from 'vitest';
import { BANDS, MAX_SCORE, PLACE_BONUS, closenessPoints, compareRankable, placeBonus, rankBy, scoreRound, sumOfBest } from './scoring';

describe('scoring', () => {
  it('maps distance to closeness bands', () => {
    expect(closenessPoints(0)).toBe(100);
    expect(closenessPoints(1)).toBe(80);
    expect(closenessPoints(2)).toBe(70);
    expect(closenessPoints(5)).toBe(60);
    expect(closenessPoints(6)).toBe(45);
    expect(closenessPoints(20)).toBe(30);
    expect(closenessPoints(50)).toBe(15);
    expect(closenessPoints(51)).toBe(0);
    expect(MAX_SCORE).toBe(125);
  });

  it('gives no points without a result', () => {
    expect(scoreRound({ diff: null, reachedAtMs: null }).total).toBe(0);
  });

  it('adds a speed bonus of up to 25% that depends only on the seconds taken', () => {
    // İlk 10 saniyede tam bonus, 2. dakikanın sonunda sıfır; süre ayarı işe karışmaz
    expect(scoreRound({ diff: 0, reachedAtMs: 0 })).toMatchObject({ closeness: 100, bonus: 25, total: 125 });
    expect(scoreRound({ diff: 0, reachedAtMs: 10_000 }).total).toBe(125);
    expect(scoreRound({ diff: 0, reachedAtMs: 65_000 }).total).toBe(113);
    expect(scoreRound({ diff: 0, reachedAtMs: 120_000 }).total).toBe(100);
    expect(scoreRound({ diff: 0, reachedAtMs: 290_000 }).total).toBe(100);
    expect(scoreRound({ diff: 3, reachedAtMs: 30_000 })).toMatchObject({ closeness: 60, bonus: 12, total: 72 });
  });

  it('never lets a non-exact result outscore an exact one', () => {
    const slowExact = scoreRound({ diff: 0, reachedAtMs: 119_999 }).total;
    const fastNear = scoreRound({ diff: 1, reachedAtMs: 1 }).total;
    expect(slowExact).toBeGreaterThanOrEqual(fastNear);
    // Bantlar bu garantiyi korumalı: her bandın en yüksek puanı bir üst bandın en düşüğünü geçmez.
    expect(BANDS[1].points * (1 + 0.25)).toBeLessThanOrEqual(BANDS[0].points);
  });

  it('scores against the best possible result when the exact target is unreachable', () => {
    const s = scoreRound({ diff: 1, reachedAtMs: 0, bestPossibleDiff: 1 });
    expect(s).toMatchObject({ closeness: 100, effectiveDiff: 0 });
    const t = scoreRound({ diff: 3, reachedAtMs: 0, bestPossibleDiff: 1 });
    expect(t).toMatchObject({ closeness: 70, effectiveDiff: 2 });
  });

  it('gives versus place bonuses that never exceed the solo maximum', () => {
    expect([1, 2, 3, 4, 9].map(placeBonus)).toEqual([25, 15, 10, 5, 5]);
    expect(BANDS[0].points + PLACE_BONUS[0]).toBe(MAX_SCORE);
  });

  it('sums the best games for the leaderboard', () => {
    const scores = [40, 125, 90, 110];
    expect(sumOfBest(scores, 2)).toBe(235);
    expect(sumOfBest(scores, 20)).toBe(365);
    expect(sumOfBest([], 20)).toBe(0);
    expect(scores).toEqual([40, 125, 90, 110]);
  });

  it('ranks by points, then distance, then time; exact ties share a rank', () => {
    const rows = [
      { id: 'a', total: 90, diff: 2, reachedAtMs: 1000 },
      { id: 'b', total: 110, diff: 0, reachedAtMs: 5000 },
      { id: 'c', total: 90, diff: 2, reachedAtMs: 1000 },
      { id: 'd', total: 90, diff: 2, reachedAtMs: 800 },
      { id: 'e', total: 0, diff: null, reachedAtMs: null },
    ];
    const ranked = rankBy(rows, compareRankable).map((r) => `${r.item.id}${r.rank}`);
    expect(ranked).toEqual(['b1', 'd2', 'a3', 'c3', 'e5']);
  });
});
