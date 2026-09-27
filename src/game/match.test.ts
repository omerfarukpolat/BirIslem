import { describe, expect, it } from 'vitest';
import { rankRound, standings, type RoundEntry } from './match';
import { scoreRound, ZERO_SCORE } from './scoring';

const entry = (playerId: string, diff: number | null, reachedAtMs: number | null): RoundEntry => ({
  playerId,
  value: diff === null ? null : 500 + diff,
  diff,
  reachedAtMs,
  steps: [],
  score: diff === null ? ZERO_SCORE : scoreRound({ diff, reachedAtMs, limitMs: 60000 }),
});

describe('match standings', () => {
  it('rewards closer first, then faster', () => {
    const ranked = rankRound([entry('a', 3, 5000), entry('b', 0, 50000), entry('c', 0, 20000), entry('d', null, null)]);
    expect(ranked.map((r) => r.entry.playerId)).toEqual(['c', 'b', 'a', 'd']);
    expect(ranked.filter((r) => r.winner).map((r) => r.entry.playerId)).toEqual(['c']);
  });

  it('sums rounds and breaks ties with round wins', () => {
    const r1 = [entry('a', 0, 60000), entry('b', 1, 0)]; // a: 100, b: 100 (80+20)
    const r2 = [entry('a', null, null), entry('b', null, null)];
    const table = standings(['a', 'b'], [r1, r2]);
    expect(table.map((s) => [s.playerId, s.total, s.wins, s.rank])).toEqual([
      ['a', 100, 1, 1],
      ['b', 100, 0, 2],
    ]);
    expect(table[0].perRound).toEqual([100, 0]);
  });

  it('marks unplayed rounds as null and nobody wins an empty round', () => {
    const table = standings(['a', 'b'], [[entry('a', 2, 1000)], []]);
    expect(table.find((s) => s.playerId === 'b')!.perRound).toEqual([null, null]);
    const empty = rankRound([entry('a', null, null), entry('b', null, null)]);
    expect(empty.every((r) => !r.winner)).toBe(true);
  });
});
