import { describe, expect, it } from 'vitest';
import { aggregate, dailyEntries, SCORE_VERSION, userStats, type ScoreRow } from './leaderboard';

const row = (userId: string, score: number, extra: Partial<ScoreRow> = {}): ScoreRow => ({
  v: SCORE_VERSION,
  userId,
  userName: userId.toUpperCase(),
  score,
  diff: score >= 100 ? 0 : 3,
  createdAtMs: 1000,
  ...extra,
});

describe('leaderboard math', () => {
  it('summarises each player for the period and ignores old-format scores', () => {
    const rows = [row('a', 120), row('a', 80), row('b', 125), row('a', 300, { v: undefined }), row('b', 90, { createdAtMs: 10 })];
    const [a, b] = aggregate(rows, 500).sort((x, y) => x.userId.localeCompare(y.userId));
    expect(a).toMatchObject({ userId: 'a', gamesPlayed: 2, totalScore: 200, bestOfScore: 200, averageScore: 100, bestScore: 120, exact: 1 });
    expect(b).toMatchObject({ userId: 'b', gamesPlayed: 1, totalScore: 125 });
  });

  it('ranks the daily puzzle by score, then distance, then time', () => {
    const rows = [
      row('a', 100, { puzzleId: 'd1', diff: 0, timeUsedMs: 9000 }),
      row('b', 100, { puzzleId: 'd1', diff: 0, timeUsedMs: 4000 }),
      row('c', 125, { puzzleId: 'd1' }),
      row('d', 125, { puzzleId: 'd2' }),
    ];
    expect(dailyEntries(rows, 'd1').map((e) => e.userId)).toEqual(['c', 'b', 'a']);
  });

  it('computes a single player’s stats', () => {
    expect(userStats([row('a', 125), row('a', 60)])).toEqual({ games: 2, total: 185, best: 125, average: 93, exact: 1 });
    expect(userStats([])).toEqual({ games: 0, total: 0, best: 0, average: 0, exact: 0 });
  });
});
