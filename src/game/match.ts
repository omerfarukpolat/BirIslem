import { compareRankable, rankBy, type Score } from './scoring';
import type { SimpleStep } from './types';

/** Karşılıklı modda bir oyuncunun bir turdaki sonucu */
export interface RoundEntry {
  playerId: string;
  value: number | null;
  diff: number | null;
  reachedAtMs: number | null;
  steps: SimpleStep[];
  score: Score;
}

export interface RankedEntry {
  entry: RoundEntry;
  rank: number;
  winner: boolean;
}

export function rankRound(entries: readonly RoundEntry[]): RankedEntry[] {
  const ranked = rankBy(entries, (x, y) =>
    compareRankable(
      { total: x.score.total, diff: x.diff, reachedAtMs: x.reachedAtMs },
      { total: y.score.total, diff: y.diff, reachedAtMs: y.reachedAtMs },
    ),
  );
  return ranked.map(({ item, rank }) => ({ entry: item, rank, winner: rank === 1 && item.score.total > 0 }));
}

export interface Standing {
  playerId: string;
  total: number;
  wins: number;
  exact: number;
  /** Tur tur puanlar (oynanmayan tur için null) */
  perRound: (number | null)[];
  rank: number;
}

/**
 * Genel sıralama: toplam puan ↓, tur galibiyeti ↓, tam isabet ↓.
 * rounds[i] = i. turun sonuçları (henüz oynanmamışsa boş dizi).
 */
export function standings(playerIds: readonly string[], rounds: readonly (readonly RoundEntry[])[]): Standing[] {
  const rows = playerIds.map<Omit<Standing, 'rank'>>((playerId) => ({
    playerId,
    total: 0,
    wins: 0,
    exact: 0,
    perRound: [],
  }));
  const byId = new Map(rows.map((r) => [r.playerId, r]));
  rounds.forEach((entries, i) => {
    for (const r of rows) r.perRound[i] = null;
    for (const { entry, winner } of rankRound(entries)) {
      const row = byId.get(entry.playerId);
      if (!row) continue;
      row.perRound[i] = entry.score.total;
      row.total += entry.score.total;
      if (winner) row.wins += 1;
      if (entry.diff === 0) row.exact += 1;
    }
  });
  const cmp = (a: Omit<Standing, 'rank'>, b: Omit<Standing, 'rank'>) =>
    b.total - a.total || b.wins - a.wins || b.exact - a.exact;
  return rankBy(rows, cmp).map(({ item, rank }) => ({ ...item, rank }));
}
