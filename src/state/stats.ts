import { signal } from '@preact/signals';
import { previousKey } from '../game/daily';
import type { SimpleStep } from '../game/types';
import { readJSON, writeJSON } from '../lib/storage';

/** Cihazda tutulan kişisel istatistikler (giriş gerektirmez). */
export interface DailyRecord {
  key: string;
  value: number | null;
  diff: number | null;
  reachedAtMs: number | null;
  score: number;
  steps: SimpleStep[];
}

export interface Stats {
  played: number;
  exact: number;
  best: number;
  total: number;
  daily: Record<string, DailyRecord>;
  streak: number;
  lastDaily: string | null;
}

const KEY = 'birislem:stats';
const EMPTY: Stats = { played: 0, exact: 0, best: 0, total: 0, daily: {}, streak: 0, lastDaily: null };

export const stats = signal<Stats>({ ...EMPTY, ...readJSON<Partial<Stats>>(KEY, {}) });

function save(next: Stats) {
  stats.value = next;
  writeJSON(KEY, next);
}

export function recordGame(score: number, diff: number | null) {
  const s = stats.value;
  save({
    ...s,
    played: s.played + 1,
    exact: s.exact + (diff === 0 ? 1 : 0),
    best: Math.max(s.best, score),
    total: s.total + score,
  });
}

export function recordDaily(rec: DailyRecord) {
  const s = stats.value;
  if (s.daily[rec.key]) return;
  const streak = s.lastDaily === previousKey(rec.key) ? s.streak + 1 : 1;
  // Son 60 günü tut
  const keys = Object.keys(s.daily).sort().slice(-59);
  const daily: Record<string, DailyRecord> = {};
  for (const k of keys) daily[k] = s.daily[k];
  daily[rec.key] = rec;
  save({ ...s, daily, streak, lastDaily: rec.key });
}

/** Seri dün ya da bugün oynandıysa devam ediyor sayılır. */
export function currentStreak(todayKey: string): number {
  const s = stats.value;
  if (!s.lastDaily) return 0;
  return s.lastDaily === todayKey || s.lastDaily === previousKey(todayKey) ? s.streak : 0;
}
