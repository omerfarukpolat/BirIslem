import { OP_SYMBOL } from './rules';
import type { SimpleStep } from './types';

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** 42.3 sn → "0:42", 3.4 sn → "0:03" (aşağı yuvarlar; geçen süre için) */
export function formatElapsed(ms: number | null): string {
  if (ms === null) return '–';
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** 42.3 sn → "42,3 sn" */
export function formatSeconds(ms: number | null): string {
  if (ms === null) return '–';
  return `${(ms / 1000).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} sn`;
}

export function formatStep(s: SimpleStep): string {
  return `${s.a} ${OP_SYMBOL[s.op]} ${s.b} = ${s.result}`;
}

export function formatTimeLimit(seconds: number): string {
  if (seconds < 60) return `${seconds} sn`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m} dk` : `${m}:${String(s).padStart(2, '0')}`;
}

const dateFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', timeZone: 'UTC' });

/** "2026-09-26" → "26 Eylül" */
export function formatDayKey(key: string): string {
  return dateFmt.format(new Date(`${key}T00:00:00Z`));
}
