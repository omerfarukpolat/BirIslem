import { sumOfBest } from '../game/scoring';

/** Yeni puanlama sistemiyle kaydedilen skorlar. Eski kayıtlar (v yok) sıralamaya girmez. */
export const SCORE_VERSION = 2;

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly';

/** Sıralama hesabı için bir skor kaydının gereken alanları */
export interface ScoreRow {
  v?: number;
  userId: string;
  userName: string;
  score: number;
  diff?: number | null;
  userResult?: number | null;
  timeUsedMs?: number | null;
  puzzleId?: string;
  createdAtMs: number;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  /** Dönemin en iyi 20 oyununun toplamı: varsayılan sıralama */
  bestOfScore: number;
  totalScore: number;
  gamesPlayed: number;
  averageScore: number;
  bestScore: number;
  exact: number;
}

export interface DailyEntry {
  userId: string;
  userName: string;
  score: number;
  diff: number | null;
  value: number | null;
  timeUsedMs: number | null;
}

export interface UserStats {
  games: number;
  total: number;
  best: number;
  average: number;
  exact: number;
}

const counted = (r: ScoreRow) => r.v === SCORE_VERSION && typeof r.score === 'number';

export function periodStart(period: LeaderboardPeriod, now = new Date()): Date {
  switch (period) {
    case 'daily':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'weekly': {
      const day = now.getDay();
      const back = day === 0 ? 6 : day - 1;
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
    }
    case 'monthly':
      return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}

/** Oyuncu başına dönem özeti (sıralama sırası ekranda seçilir) */
export function aggregate(rows: readonly ScoreRow[], sinceMs = 0): LeaderboardEntry[] {
  const byUser = new Map<string, LeaderboardEntry>();
  const scoresOf = new Map<string, number[]>();
  for (const s of rows) {
    if (!counted(s) || s.createdAtMs < sinceMs) continue;
    const e = byUser.get(s.userId) ?? {
      userId: s.userId,
      userName: s.userName,
      bestOfScore: 0,
      totalScore: 0,
      gamesPlayed: 0,
      averageScore: 0,
      bestScore: 0,
      exact: 0,
    };
    e.totalScore += s.score;
    e.gamesPlayed += 1;
    e.bestScore = Math.max(e.bestScore, s.score);
    if (s.diff === 0) e.exact += 1;
    e.userName = s.userName || e.userName;
    byUser.set(s.userId, e);
    scoresOf.set(s.userId, [...(scoresOf.get(s.userId) ?? []), s.score]);
  }
  return [...byUser.values()].map((e) => ({
    ...e,
    bestOfScore: sumOfBest(scoresOf.get(e.userId) ?? []),
    averageScore: Math.round(e.totalScore / e.gamesPlayed),
  }));
}

/** Günün sorusu sıralaması: puan ↓, fark ↑, süre ↑ */
export function dailyEntries(rows: readonly ScoreRow[], puzzleId: string): DailyEntry[] {
  return rows
    .filter((s) => counted(s) && s.puzzleId === puzzleId)
    .map((s) => ({
      userId: s.userId,
      userName: s.userName,
      score: s.score,
      diff: s.diff ?? null,
      value: s.userResult ?? null,
      timeUsedMs: s.timeUsedMs ?? null,
    }))
    .sort((a, b) => b.score - a.score || (a.diff ?? 1e9) - (b.diff ?? 1e9) || (a.timeUsedMs ?? 1e9) - (b.timeUsedMs ?? 1e9));
}

export function userStats(rows: readonly ScoreRow[]): UserStats {
  const out: UserStats = { games: 0, total: 0, best: 0, average: 0, exact: 0 };
  for (const s of rows) {
    if (!counted(s)) continue;
    out.games += 1;
    out.total += s.score;
    out.best = Math.max(out.best, s.score);
    if (s.diff === 0) out.exact += 1;
  }
  out.average = out.games ? Math.round(out.total / out.games) : 0;
  return out;
}
