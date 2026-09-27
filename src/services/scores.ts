import { Timestamp, addDoc, collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import type { SimpleStep } from '../game/types';
import { firestore } from './db';

/** Yeni puanlama sistemiyle kaydedilen skorlar. Eski kayıtlar (v yok) sıralamaya girmez. */
export const SCORE_VERSION = 2;

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly';

export interface SaveScoreInput {
  uid: string;
  name: string;
  mode: 'solo' | 'daily';
  score: number;
  numbers: number[];
  target: number;
  value: number | null;
  diff: number | null;
  reachedAtMs: number | null;
  timeLimit: number;
  operationLimit: number;
  steps: SimpleStep[];
  /** Günün sorusu için "YYYY-MM-DD" */
  puzzleId?: string;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
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

interface ScoreDoc {
  v?: number;
  mode?: string;
  userId: string;
  userName: string;
  score: number;
  diff?: number | null;
  userResult?: number | null;
  timeUsedMs?: number | null;
  puzzleId?: string;
  createdAt: Timestamp;
}

export async function saveScore(s: SaveScoreInput): Promise<void> {
  const data = {
    v: SCORE_VERSION,
    mode: s.mode,
    userId: s.uid,
    userName: s.name,
    score: s.score,
    numbers: s.numbers,
    target: s.target,
    userResult: s.value,
    diff: s.diff,
    timeUsed: s.reachedAtMs === null ? null : Math.round(s.reachedAtMs / 100) / 10,
    timeUsedMs: s.reachedAtMs === null ? null : Math.round(s.reachedAtMs),
    timeLimit: s.timeLimit,
    operationLimit: s.operationLimit,
    // Eski alan adlarıyla uyumlu işlem geçmişi
    calculationHistory: s.steps.map((st) => ({
      firstNumber: st.a,
      secondNumber: st.b,
      operator: st.op,
      result: st.result,
    })),
    ...(s.puzzleId ? { puzzleId: s.puzzleId } : {}),
    createdAt: Timestamp.now(),
  };
  const col = collection(firestore(), 'scores');
  if (s.mode === 'daily' && s.puzzleId) {
    // Günde tek hak: belge kimliği sabit, kurallar yalnızca oluşturmaya izin verir.
    await setDoc(doc(col, `daily_${s.puzzleId}_${s.uid}`), data);
  } else {
    await addDoc(col, data);
  }
}

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

export async function fetchLeaderboard(period: LeaderboardPeriod): Promise<LeaderboardEntry[]> {
  const q = query(collection(firestore(), 'scores'), where('createdAt', '>=', Timestamp.fromDate(periodStart(period))));
  const snap = await getDocs(q);
  const byUser = new Map<string, LeaderboardEntry>();
  snap.forEach((d) => {
    const s = d.data() as ScoreDoc;
    if (s.v !== SCORE_VERSION || typeof s.score !== 'number') return;
    const e = byUser.get(s.userId) ?? {
      userId: s.userId,
      userName: s.userName,
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
  });
  return [...byUser.values()].map((e) => ({ ...e, averageScore: Math.round(e.totalScore / e.gamesPlayed) }));
}

export async function fetchDaily(puzzleId: string): Promise<DailyEntry[]> {
  const q = query(collection(firestore(), 'scores'), where('puzzleId', '==', puzzleId));
  const snap = await getDocs(q);
  const rows: DailyEntry[] = [];
  snap.forEach((d) => {
    const s = d.data() as ScoreDoc;
    if (s.v !== SCORE_VERSION) return;
    rows.push({
      userId: s.userId,
      userName: s.userName,
      score: s.score,
      diff: s.diff ?? null,
      value: s.userResult ?? null,
      timeUsedMs: s.timeUsedMs ?? null,
    });
  });
  return rows.sort(
    (a, b) => b.score - a.score || (a.diff ?? 1e9) - (b.diff ?? 1e9) || (a.timeUsedMs ?? 1e9) - (b.timeUsedMs ?? 1e9),
  );
}

export interface UserStats {
  games: number;
  total: number;
  best: number;
  average: number;
  exact: number;
}

export async function fetchUserStats(uid: string): Promise<UserStats> {
  // Bileşik indeks gerektirmesin diye yalnızca eşitlik filtresi; gerisi istemcide.
  const snap = await getDocs(query(collection(firestore(), 'scores'), where('userId', '==', uid)));
  const out: UserStats = { games: 0, total: 0, best: 0, average: 0, exact: 0 };
  snap.forEach((d) => {
    const s = d.data() as ScoreDoc;
    if (s.v !== SCORE_VERSION) return;
    out.games += 1;
    out.total += s.score;
    out.best = Math.max(out.best, s.score);
    if (s.diff === 0) out.exact += 1;
  });
  out.average = out.games ? Math.round(out.total / out.games) : 0;
  return out;
}
