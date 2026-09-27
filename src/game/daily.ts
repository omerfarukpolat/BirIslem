/** Günün sorusu Türkiye saatiyle (UTC+3, yaz saati yok) gece yarısı değişir. */
const TR_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const EPOCH_KEY = '2026-09-26';

export const DAILY_TIME_LIMIT = 120;

export function dailyKey(now: number = Date.now()): string {
  return new Date(now + TR_OFFSET_MS).toISOString().slice(0, 10);
}

export function dailyNumber(key: string): number {
  const days = Math.round((Date.parse(key) - Date.parse(EPOCH_KEY)) / DAY_MS);
  return days + 1;
}

/** Bir sonraki sorunun açılmasına kalan süre (ms) */
export function msUntilNextDaily(now: number = Date.now()): number {
  const tr = now + TR_OFFSET_MS;
  return DAY_MS - (tr % DAY_MS);
}

export function previousKey(key: string): string {
  return new Date(Date.parse(key) - DAY_MS).toISOString().slice(0, 10);
}
