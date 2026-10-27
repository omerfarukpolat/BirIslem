import { describe, expect, it } from 'vitest';
import { rankRound, scoreVersusRound, standings, type RoundEntry } from './match';
import type { Score } from './scoring';

/** Bir turun sonuçlarını karşılıklı mod kurallarıyla puanlar */
function round(results: [string, number | null, number | null][], bestPossibleDiff = 0): RoundEntry[] {
  const scores = scoreVersusRound(
    results.map(([playerId, diff, reachedAtMs]) => ({ playerId, diff, reachedAtMs })),
    bestPossibleDiff,
  );
  return results.map(([playerId, diff, reachedAtMs]) => ({
    playerId,
    value: diff === null ? null : 500 + diff,
    diff,
    reachedAtMs,
    steps: [],
    score: scores.get(playerId)!,
  }));
}

const totals = (entries: RoundEntry[]) => Object.fromEntries(entries.map((e) => [e.playerId, e.score.total]));

describe('versus scoring', () => {
  it('adds a place bonus: closer first, then faster', () => {
    const r = round([
      ['a', 3, 5000],
      ['b', 0, 50000],
      ['c', 0, 20000],
      ['d', 1, 1000],
      ['e', null, null],
    ]);
    // c: 100+25, b: 100+15, d: 80+10, a: 60+5, e: sonuç yok
    expect(totals(r)).toEqual({ c: 125, b: 115, d: 90, a: 65, e: 0 });
    expect(r.find((x) => x.playerId === 'c')!.score).toMatchObject<Partial<Score>>({ closeness: 100, bonus: 25 });
  });

  it('makes a faster exact result worth more than a slower one', () => {
    // Saniyeler içindeki fark bile turu ve puanı belirler
    expect(totals(round([['a', 0, 1600], ['b', 0, 3200]]))).toEqual({ a: 125, b: 115 });
  });

  it('shares the place on an exact tie and gives no bonus without closeness points', () => {
    expect(totals(round([['a', 2, 4000], ['b', 2, 4000], ['c', 80, 1000]]))).toEqual({ a: 95, b: 95, c: 0 });
  });

  it('measures closeness against the best possible result', () => {
    expect(totals(round([['a', 2, 9000], ['b', 4, 1000]], 2))).toEqual({ a: 125, b: 85 });
  });
});

describe('match standings', () => {
  it('ranks a round by points and picks a winner only when someone scored', () => {
    const ranked = rankRound(round([['a', 3, 5000], ['b', 0, 50000], ['c', 0, 20000], ['d', null, null]]));
    expect(ranked.map((r) => r.entry.playerId)).toEqual(['c', 'b', 'a', 'd']);
    expect(ranked.filter((r) => r.winner).map((r) => r.entry.playerId)).toEqual(['c']);
    const empty = rankRound(round([['a', null, null], ['b', null, null]]));
    expect(empty.every((r) => !r.winner)).toBe(true);
  });

  it('sums rounds and breaks ties with round wins', () => {
    const r1 = round([['a', 0, 1000], ['b', 1, 500]]); // a: 125, b: 80+15 = 95
    const r2 = round([['a', 1, 9000], ['b', 0, 30000]]); // a: 80+15 = 95, b: 125
    const r3 = round([['a', 2, 1000], ['b', 1, 9000]]); // a: 70+15 = 85, b: 80+25 = 105
    const r4 = round([['a', 0, 4000], ['b', null, null]]); // a: 125, b: 0
    const table = standings(['a', 'b'], [r1, r2, r3, r4]);
    expect(table.map((s) => [s.playerId, s.total, s.wins, s.rank])).toEqual([
      ['a', 430, 2, 1],
      ['b', 325, 2, 2],
    ]);
    expect(table[0].perRound).toEqual([125, 95, 85, 125]);

    // Toplam eşitse daha çok tur kazanan öne geçer
    const fixed = (playerId: string, total: number): RoundEntry => ({
      playerId,
      value: 500,
      diff: 0,
      reachedAtMs: 1000,
      steps: [],
      score: { closeness: total, bonus: 0, total, effectiveDiff: 0 },
    });
    const tie = standings(['a', 'b', 'c'], [
      [fixed('a', 100), fixed('b', 90), fixed('c', 0)],
      [fixed('a', 50), fixed('b', 60), fixed('c', 125)],
    ]);
    expect(tie.map((s) => [s.playerId, s.total, s.wins, s.rank])).toEqual([
      ['a', 150, 1, 1],
      ['b', 150, 0, 2],
      ['c', 125, 1, 3],
    ]);
  });

  it('marks unplayed rounds as null', () => {
    const table = standings(['a', 'b'], [round([['a', 2, 1000]]), []]);
    expect(table.find((s) => s.playerId === 'b')!.perRound).toEqual([null, null]);
  });
});
